(function () {
  // Validation Functions
  const normalizePhone = (phone) => {
    const normalized = phone.replace(/[\s\-()]/g, '');
    console.log(`Telefone normalizado: ${phone} -> ${normalized}`);
    return normalized;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      console.log(`Email inválido: ${email}`);
      return "Email inválido. Use um formato como nome@dominio.com.";
    }
    console.log(`Email válido: ${email}`);
    return null;
  };

  const validatePhone = (phone) => {
    const normalizedPhone = normalizePhone(phone);
    const phoneRegex = /^\+244(9[1-6]{1}|99)\d{7}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      console.log(`Telefone inválido: ${normalizedPhone}`);
      return "Número inválido. Use +2449 seguido de 8 dígitos (ex.: +244912345678).";
    }
    console.log(`Telefone válido: ${normalizedPhone}`);
    return null;
  };

  const validatePassword = (password) => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      console.log(`Senha inválida: vazia`);
      return "A senha não pode estar vazia.";
    }
    if (trimmedPassword.length < 6) {
      console.log(`Senha inválida: ${trimmedPassword} (menos de 6 caracteres)`);
      return "A senha deve ter 6 ou mais caracteres.";
    }
    console.log(`Senha válida: ${trimmedPassword}`);
    return null;
  };

  // Error messages mapping
  const errorMessages = {
    'auth/email-already-in-use': 'Este email já está registrado. Tente fazer login.',
    'auth/invalid-email': 'Email inválido. Verifique o formato.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
    'auth/invalid-phone-number': 'Número de telefone inválido. Use +2449XXXXXXXX.',
    'auth/invalid-verification-code': 'Código OTP inválido. Tente novamente.',
    'auth/code-expired': 'O código OTP expirou. Solicite um novo.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'auth/user-disabled': 'Esta conta foi desativada. Contate o suporte.'
  };

  // Log errors to Firestore
  async function logError(error, context) {
    try {
      if (!window.db) {
        console.error("Firestore não inicializado para logging de erro.");
        return;
      }
      await window.db.collection('error_logs').add({
        error: error.message,
        code: error.code || 'unknown',
        context: context,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to log error to Firestore:", err);
    }
  }

  // Function to check authentication state
  function checkAuthState(callback) {
    if (typeof firebase === 'undefined' || !window.auth) {
      console.error("Firebase Auth not loaded or not globally available.");
      return null;
    }
    return window.auth.onAuthStateChanged(user => {
      callback(user);
    });
  }

  // Function for login with email and password
  async function loginWithEmail(email, password) {
    if (typeof firebase === 'undefined' || !window.auth) {
      throw new Error("Firebase Auth não inicializado ou não global.");
    }
    const emailError = validateEmail(email);
    if (emailError) {
      throw new Error(emailError);
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new Error(passwordError);
    }
    try {
      const userCredential = await window.auth.signInWithEmailAndPassword(email.trim(), password.trim());
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
    const emailError = validateEmail(email);
    if (emailError) {
      throw new Error(emailError);
    }
    try {
      await window.auth.sendPasswordResetEmail(email.trim());
      return { success: true, message: 'Email de redefinição de senha enviado.' };
    } catch (error) {
      console.error('Reset password error:', error);
      logError(error, 'resetPassword');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // Function to check registration attempts
  async function checkRegistrationAttempts(emailOrPhone, dbInstance) {
    const normalizedEmailOrPhone = normalizePhone(emailOrPhone);
    const attemptsDoc = await dbInstance.collection('registration_attempts').doc(normalizedEmailOrPhone).get();
    const now = Date.now();
    const maxAttempts = 5;
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    if (attemptsDoc.exists) {
      const data = attemptsDoc.data();
      if (data.attempts >= maxAttempts && now - data.firstAttempt < windowMs) {
        throw new Error("Limite de tentativas excedido. Tente novamente em 24 horas.");
      }
      if (now - data.firstAttempt > windowMs) {
        await dbInstance.collection('registration_attempts').doc(normalizedEmailOrPhone).set({
          attempts: 1,
          firstAttempt: now
        });
      } else {
        await dbInstance.collection('registration_attempts').doc(normalizedEmailOrPhone).update({
          attempts: firebase.firestore.FieldValue.increment(1)
        });
      }
    } else {
      await dbInstance.collection('registration_attempts').doc(normalizedEmailOrPhone).set({
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
    const isEmail = validateEmail(emailOrPhone) === null;
    const isPhone = validatePhone(emailOrPhone) === null;

    try {
      // Sanitize inputs
      const sanitizeInput = (input) => input.replace(/[<>&"'/]/g, '');
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedBairro = sanitizeInput(bairro.trim());
      const normalizedEmailOrPhone = normalizePhone(emailOrPhone);

      // Validate inputs
      if (!sanitizedName) {
        throw new Error("Nome completo é obrigatório.");
      }
      if (!isEmail && !isPhone) {
        throw new Error(validateEmail(emailOrPhone) || validatePhone(normalizedEmailOrPhone) || "Formato inválido. Use um email ou +2449XXXXXXXX.");
      }
      if (!municipio) {
        throw new Error("Município é obrigatório.");
      }
      if (!sanitizedBairro) {
        throw new Error("Bairro é obrigatório.");
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Check for duplicate user
      const userQuery = await dbInstance.collection('users').where('emailOrPhone', '==', normalizedEmailOrPhone).get();
      if (!userQuery.empty) {
        throw new Error('Este email ou número de telefone já está registrado.');
      }

      // Check registration attempts
      await checkRegistrationAttempts(normalizedEmailOrPhone, dbInstance);

      let user;
      if (isEmail) {
        const userCredential = await authInstance.createUserWithEmailAndPassword(emailOrPhone.trim(), password.trim());
        user = userCredential.user;
        await user.sendEmailVerification();
        await dbInstance.collection('users').doc(user.uid).set({
          name: sanitizedName,
          email: user.email,
          emailOrPhone: normalizedEmailOrPhone,
          municipio: municipio,
          bairro: sanitizedBairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: false
        });
        return { success: true, user: user, requiresEmailVerification: true };
      } else if (isPhone) {
        throw new Error("Phone registration initiation is handled directly by the main script for OTP flow.");
      } else {
        throw new Error("Formato inválido para email ou telefone.");
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

  // Export functions
  window.firebaseAuth = {
    checkAuthState,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    registerUser,
    logout,
    validateEmail,
    validatePhone,
    validatePassword
  };
})();