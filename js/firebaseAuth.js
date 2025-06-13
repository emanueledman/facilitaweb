// firebaseAuth.js
// Assumes firebase-app-compat.js, firebase-auth-compat.js, and firebase-firestore-compat.js are loaded BEFORE this script.

// Encapsulate Firebase logic in an IIFE to avoid global variable conflicts
(function () {
  // Global Firebase instances (assumed to be initialized in index.html)
  let auth;
  let db;

  // Function to check authentication state
  function checkAuthState(callback) {
    if (typeof firebase === 'undefined' || !window.auth) {
      console.error("Firebase Auth not loaded or not globally available. Cannot check auth state.");
      return null;
    }
    return window.auth.onAuthStateChanged(user => {
      callback(user);
    });
  }

  // Error messages mapping for user-friendly feedback
  const errorMessages = {
    'auth/email-already-in-use': 'Este email já está registrado. Tente fazer login.',
    'auth/invalid-email': 'Email inválido. Verifique o formato.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 8 caracteres com maiúsculas, números e símbolos.',
    'auth/invalid-phone-number': 'Número de telefone inválido. Use +2449XXXXXXXX.',
    'auth/invalid-verification-code': 'Código OTP inválido. Tente novamente.',
    'auth/code-expired': 'O código OTP expirou. Solicite um novo.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'auth/user-disabled': 'Esta conta foi desativada. Contate o suporte.'
  };

  // Log errors to Firestore for monitoring
  async function logError(error, context) {
    try {
      await window.db.collection('error_logs').add({
        error: error.message,
        code: error.code,
        context: context,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to log error to Firestore:", err);
    }
  }

  // Function for login with email and password
  async function loginWithEmail(email, password) {
    if (typeof firebase === 'undefined' || !window.auth) {
      throw new Error("Firebase Auth não inicializado ou não global.");
    }
    try {
      const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
      if (!userCredential.user.emailVerified) {
        throw new Error("Por favor, verifique seu email antes de fazer login.");
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      logError(error, 'loginWithEmail');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Function for login with Google
  async function loginWithGoogle() {
    if (typeof firebase === 'undefined' || !window.auth || !window.db) {
      throw new Error("Firebase Auth ou Firestore não inicializado ou não global.");
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await window.auth.signInWithPopup(provider);
      const user = result.user;

      // Check if user exists in Firestore, create if not
      const userDoc = await window.db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        await window.db.collection('users').doc(user.uid).set({
          name: user.displayName || 'Usuário Google',
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: true
        });
      }
      return { success: true, user: user };
    } catch (error) {
      console.error('Google login error:', error);
      logError(error, 'loginWithGoogle');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Function to reset password
  async function resetPassword(email) {
    if (typeof firebase === 'undefined' || !window.auth) {
      throw new Error("Firebase Auth não inicializado ou não global.");
    }
    try {
      await window.auth.sendPasswordResetEmail(email);
      return { success: true, message: 'Email de redefinição de senha enviado.' };
    } catch (error) {
      console.error('Reset password error:', error);
      logError(error, 'resetPassword');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Function to check registration attempts to prevent abuse
  async function checkRegistrationAttempts(emailOrPhone) {
    const attemptsDoc = await window.db.collection('registration_attempts').doc(emailOrPhone).get();
    const now = Date.now();
    const maxAttempts = 5;
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    if (attemptsDoc.exists) {
      const data = attemptsDoc.data();
      if (data.attempts >= maxAttempts && now - data.firstAttempt < windowMs) {
        throw new Error("Limite de tentativas excedido. Tente novamente em 24 horas.");
      }
      if (now - data.firstAttempt > windowMs) {
        await window.db.collection('registration_attempts').doc(emailOrPhone).set({
          attempts: 1,
          firstAttempt: now
        });
      } else {
        await window.db.collection('registration_attempts').doc(emailOrPhone).update({
          attempts: firebase.firestore.FieldValue.increment(1)
        });
      }
    } else {
      await window.db.collection('registration_attempts').doc(emailOrPhone).set({
        attempts: 1,
        firstAttempt: now
      });
    }
  }

  // Function for user registration
  async function registerUser(name, emailOrPhone, password, municipio, bairro, firebaseAppInstance) {
    if (typeof firebase === 'undefined' || !firebaseAppInstance) {
      throw new Error("Firebase App não inicializado.");
    }
    const authInstance = firebaseAppInstance.auth();
    const dbInstance = firebaseAppInstance.firestore();
    const isEmail = emailOrPhone.includes('@');

    try {
      // Sanitize inputs to prevent XSS
      const sanitizeInput = (input) => input.replace(/[<>&"'/]/g, '');
      const sanitizedName = sanitizeInput(name);
      const sanitizedBairro = sanitizeInput(bairro);

      // Check for duplicate user
      const userQuery = await dbInstance.collection('users').where('emailOrPhone', '==', emailOrPhone).get();
      if (!userQuery.empty) {
        throw new Error('Este email ou número de telefone já está registrado.');
      }

      // Check registration attempts
      await checkRegistrationAttempts(emailOrPhone);

      let user;
      if (isEmail) {
        const userCredential = await authInstance.createUserWithEmailAndPassword(emailOrPhone, password);
        user = userCredential.user;
        await user.sendEmailVerification();
        await dbInstance.collection('users').doc(user.uid).set({
          name: sanitizedName,
          email: user.email,
          emailOrPhone: emailOrPhone,
          municipio: municipio,
          bairro: sanitizedBairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: false
        });
        return { success: true, user: user, requiresEmailVerification: true };
      } else {
        throw new Error("Phone registration initiation is handled directly by the main script for OTP flow.");
      }
    } catch (error) {
      console.error("Registration error in firebaseAuth.js:", error);
      logError(error, 'registerUser');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Function for logout
  async function logout() {
    if (typeof firebase === 'undefined' || !window.auth) {
      throw new Error("Firebase Auth não inicializado ou não global.");
    }
    try {
      await window.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      logError(error, 'logout');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Export functions for use in other files
  window.firebaseAuth = {
    checkAuthState,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    registerUser,
    logout
  };
})();