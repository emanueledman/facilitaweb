(function () {
  // --- Validation Functions ---
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
    // Adicionado 90 para cobrir 900 000 000
    const phoneRegex = /^\+244(9[0-6]{1}|99)\d{7}$/; 
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

  // --- Error messages mapping ---
  const errorMessages = {
    'auth/email-already-in-use': 'Este email já está registrado. Tente fazer login.',
    'auth/invalid-email': 'Email inválido. Verifique o formato.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
    'auth/invalid-phone-number': 'Número de telefone inválido. Use +2449XXXXXXXX.',
    'auth/invalid-verification-code': 'Código OTP inválido. Tente novamente.',
    'auth/code-expired': 'O código OTP expirou. Solicite um novo.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'auth/user-disabled': 'Esta conta foi desativada. Contate o suporte.',
    'auth/captcha-check-failed': 'A verificação de segurança (reCAPTCHA) falhou. Tente novamente.'
  };

  // --- Log errors to Firestore ---
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

  // --- Function to check authentication state ---
  function checkAuthState(callback) {
    if (typeof firebase === 'undefined' || !window.auth) {
      console.error("Firebase Auth not loaded or not globally available.");
      return null;
    }
    return window.auth.onAuthStateChanged(user => {
      callback(user);
    });
  }

  // --- Function for login with email and password ---
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

  // --- Function for login with Google ---
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
          emailVerified: true // Google accounts are typically already verified
        });
      }
      return { success: true, user: user };
    } catch (error) {
      console.error('Google login error:', error);
      logError(error, 'loginWithGoogle');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // --- Function to reset password ---
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

  // --- Function to check registration attempts ---
  // This function is moved to firebaseAuth for internal use when registering.
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

  // --- Function for user registration with Email ---
  // This function now only handles email registration.
  async function registerUserWithEmail(name, email, password, municipio, bairro, firebaseAppInstance) {
    if (typeof firebase === 'undefined' || !firebaseAppInstance) {
      throw new Error("Firebase App não inicializado.");
    }
    const authInstance = firebaseAppInstance.auth();
    const dbInstance = firebaseAppInstance.firestore();

    try {
      // Sanitize inputs
      const sanitizeInput = (input) => input.replace(/[<>&"'/]/g, '');
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedBairro = sanitizeInput(bairro.trim());
      const trimmedEmail = email.trim();

      // Validate inputs
      if (!sanitizedName) {
        throw new Error("Nome completo é obrigatório.");
      }
      const emailError = validateEmail(trimmedEmail);
      if (emailError) {
        throw new Error(emailError);
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

      // Check for duplicate user (by email)
      const userQuery = await dbInstance.collection('users').where('email', '==', trimmedEmail).get();
      if (!userQuery.empty) {
        throw new Error('Este email já está registrado.');
      }

      // Check registration attempts
      await checkRegistrationAttempts(trimmedEmail, dbInstance);

      const userCredential = await authInstance.createUserWithEmailAndPassword(trimmedEmail, password.trim());
      const user = userCredential.user;
      await user.sendEmailVerification();

      await dbInstance.collection('users').doc(user.uid).set({
        name: sanitizedName,
        email: user.email,
        municipio: municipio,
        bairro: sanitizedBairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false
      });
      return { success: true, user: user, requiresEmailVerification: true };

    } catch (error) {
      console.error("Registration error in firebaseAuth.js (Email):", error);
      logError(error, 'registerUserWithEmail');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }

  // --- Function for setting user data after Phone Registration/Verification ---
  // This function is called AFTER the phone number is successfully verified by Firebase Auth.
  async function setUserDataForPhoneUser(uid, name, phoneNumber, municipio, bairro, firebaseAppInstance) {
    if (typeof firebase === 'undefined' || !firebaseAppInstance) {
      throw new Error("Firebase App não inicializado.");
    }
    const dbInstance = firebaseAppInstance.firestore();

    try {
      const sanitizeInput = (input) => input.replace(/[<>&"'/]/g, '');
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedBairro = sanitizeInput(bairro.trim());
      const normalizedPhoneNumber = normalizePhone(phoneNumber);

      if (!sanitizedName) {
        throw new Error("Nome completo é obrigatório.");
      }
      if (!municipio) {
        throw new Error("Município é obrigatório.");
      }
      if (!sanitizedBairro) {
        throw new Error("Bairro é obrigatório.");
      }

      // It's good practice to ensure the phone number is not already associated with another user's profile data
      // This check is important here since Firebase Auth might allow a phone number to be linked after creation
      const userQuery = await dbInstance.collection('users').where('phoneNumber', '==', normalizedPhoneNumber).get();
      if (!userQuery.empty && userQuery.docs[0].id !== uid) {
          throw new Error('Este número de telefone já está associado a outra conta.');
      }

      await dbInstance.collection('users').doc(uid).set({
        name: sanitizedName,
        phoneNumber: normalizedPhoneNumber,
        municipio: municipio,
        bairro: sanitizedBairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        phoneVerified: true // Assuming this is called after successful phone verification
      }, { merge: true }); // Use merge to update if the user doc already exists (e.g., from initial auth)

      return { success: true };
    } catch (error) {
      console.error("Error setting user data for phone user:", error);
      logError(error, 'setUserDataForPhoneUser');
      throw new Error(errorMessages[error.code] || `Erro: ${error.message}`);
    }
  }


  // --- Function for logout ---
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

  // --- Export functions ---
  window.firebaseAuth = {
    checkAuthState,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    registerUserWithEmail, // Renamed for clarity
    setUserDataForPhoneUser, // New function for phone user data
    logout,
    validateEmail,
    validatePhone,
    validatePassword,
    normalizePhone // Exporth this if needed elsewhere for masking
  };
})();