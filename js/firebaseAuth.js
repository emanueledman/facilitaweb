// firebaseAuth.js

// Export an object containing authentication-related functions
const firebaseAuth = {
  // Normalize phone number by removing spaces
  normalizePhoneNumber(phone) {
    return phone.replace(/\s/g, '');
  },

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  // Validate phone number format (specific to Angola: +2449XXXXXXXX)
  validatePhone(phone) {
    const normalizedPhone = this.normalizePhoneNumber(phone);
    const phoneRegex = /^\+2449[0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX.";
    }
    return null;
  },

  // Validate password (minimum 6 characters, as per Firebase requirements)
  validatePassword(password) {
    if (!password) {
      return "A senha é obrigatória.";
    }
    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null;
  },

  // Login with email and password
  async loginWithEmail(email, password) {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      return {
        user: userCredential.user,
        requiresEmailVerification: !userCredential.user.emailVerified,
      };
    } catch (error) {
      throw error;
    }
  },

  // Login with Google
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const userCredential = await firebase.auth().signInWithPopup(provider);
      return {
        user: userCredential.user,
        additionalUserInfo: userCredential.additionalUserInfo,
      };
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Register user (handles both email and phone registration)
  async registerUser(name, emailOrPhone, password, municipio, bairro, firebaseApp) {
    try {
      const isEmail = this.validateEmail(emailOrPhone) === null;
      let isPhone = this.validatePhone(emailOrPhone) === null;
      let emailOrPhoneProcessed = emailOrPhone;

      if (!isEmail && !isPhone) {
        throw new Error("Formato inválido para email ou número de telefone.");
      }

      if (isPhone) {
        emailOrPhoneProcessed = this.normalizePhoneNumber(emailOrPhone);
      }

      const db = firebaseApp.firestore();
      let userCredential;
      let requiresEmailVerification = false;
      let requiresPhoneVerification = false;
      let confirmationResult = null;

      if (isEmail) {
        // Register with email
        userCredential = await firebase.auth().createUserWithEmailAndPassword(emailOrPhoneProcessed, password);
        await userCredential.user.updateProfile({ displayName: name });
        await userCredential.user.sendEmailVerification();
        requiresEmailVerification = true;

        // Save user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
          name,
          email: emailOrPhoneProcessed,
          municipio,
          bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else if (isPhone) {
        // Register with phone (initiate verification)
        if (!window.recaptchaVerifier) {
          throw new Error("reCAPTCHA não inicializado.");
        }
        confirmationResult = await firebase.auth().signInWithPhoneNumber(emailOrPhoneProcessed, window.recaptchaVerifier);
        requiresPhoneVerification = true;

        // Store temporary registration data for OTP verification
        window.tempRegistrationData = {
          confirmationResult,
          name,
          municipio,
          bairro,
        };
      }

      return {
        user: userCredential ? userCredential.user : null,
        requiresEmailVerification,
        requiresPhoneVerification,
        confirmationResult,
      };
    } catch (error) {
      throw error;
    }
  },

  // Verify phone number with OTP code
  async verifyPhoneNumber(confirmationResult, code, name, municipio, bairro, firebaseApp) {
    try {
      const userCredential = await confirmationResult.confirm(code);
      const db = firebaseApp.firestore();

      // Save user data to Firestore
      await db.collection('users').doc(userCredential.user.uid).set({
        name,
        phoneNumber: userCredential.user.phoneNumber,
        municipio,
        bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await userCredential.user.updateProfile({ displayName: name });

      return {
        user: userCredential.user,
      };
    } catch (error) {
      throw error;
    }
  },
};

// Make firebaseAuth globally available
window.firebaseAuth = firebaseAuth;