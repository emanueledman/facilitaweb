const firebaseAuth = {
  _app: null,
  _auth: null,
  _firestore: null,
  _recaptchaVerifier: null, // Will hold the reCAPTCHA verifier instance

  /**
   * Initializes the Firebase app, authentication, and Firestore instances.
   * @param {object} firebaseConfig - Your Firebase project configuration.
   */
  initializeFirebaseApp(firebaseConfig) {
    console.log("Inicializando Firebase...");
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não carregado. Verifique se os scripts do Firebase estão incluídos.");
    }
    // Check if an app is already initialized to avoid re-initializing
    this._app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    this._auth = firebase.auth();
    this._firestore = firebase.firestore();
    console.log("Firebase inicializado com sucesso.");
  },

  /**
   * Initializes the Invisible reCAPTCHA for Firebase Phone Authentication.
   * Renders it to the specified container.
   * @param {string} containerId - The ID of the HTML element where reCAPTCHA will be rendered.
   * @returns {Promise} A promise that resolves when reCAPTCHA is rendered.
   */
  initializeRecaptcha(containerId) {
    console.log(`Inicializando reCAPTCHA no contêiner: ${containerId}...`);
    if (!this._auth) throw new Error("Firebase Auth não inicializado. Chame initializeFirebaseApp primeiro.");
    if (typeof grecaptcha === 'undefined') throw new Error("reCAPTCHA SDK (api.js) não carregado. Verifique o script.");

    this._recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      size: 'invisible', // Use 'invisible' for seamless user experience
      callback: (response) => {
        // reCAPTCHA solved, enable the registration button
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
          registerBtn.disabled = false;
        }
        console.log("reCAPTCHA resolvido com token:", response);
      },
      'expired-callback': () => {
        // reCAPTCHA expired, disable the registration button and log a warning
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
          registerBtn.disabled = true;
        }
        console.warn("reCAPTCHA expirado. Por favor, tente novamente.");
      },
      'error-callback': (error) => {
        console.error("Erro no reCAPTCHA:", error);
        alert("Erro na verificação de segurança reCAPTCHA. Por favor, recarregue a página.");
      }
    });

    // Render the reCAPTCHA and catch potential errors
    return this._recaptchaVerifier.render().catch((err) => {
      console.error("Erro ao renderizar reCAPTCHA:", err);
      // Re-throw a more user-friendly error
      throw new Error("Erro ao carregar a verificação de segurança. Por favor, tente novamente.");
    });
  },

  /**
   * Normalizes a phone number to the E.164 format (+2449XXXXXXXX).
   * @param {string} phone - The phone number string.
   * @returns {string} The normalized phone number.
   * @throws {Error} If the phone number format is invalid.
   */
  normalizePhoneNumber(phone) {
    console.log("Normalizando telefone:", phone);
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // Add +244 prefix if missing
    if (normalized.startsWith('244') && normalized.length === 12) { // Already has 244 and correct length for +244...
      normalized = '+' + normalized;
    } else if (normalized.startsWith('9') && normalized.length === 9) { // Starts with 9 (Angolan mobile) and is 9 digits
      normalized = '+244' + normalized;
    } else if (!normalized.startsWith('+244')) { // If it doesn't start with +244, assume it needs it
      normalized = '+244' + normalized;
    }

    // Final validation for Angolan mobile numbers (+2449XXXXXXXX)
    if (!/^\+2449\d{8}$/.test(normalized)) {
      throw new Error("Formato de telefone inválido. Use 9XXXXXXXX ou +2449XXXXXXXX.");
    }
    return normalized;
  },

  /**
   * Validates an email address format.
   * @param {string} email - The email string.
   * @returns {string|null} An error message if invalid, otherwise null.
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? null : "Endereço de email inválido.";
  },

  /**
   * Validates a phone number using the normalization logic.
   * @param {string} phone - The phone number string.
   * @returns {string|null} An error message if invalid, otherwise null.
   */
  validatePhone(phone) {
    try {
      this.normalizePhoneNumber(phone);
      return null; // Valid phone number
    } catch (error) {
      return error.message; // Return the error message from normalizePhoneNumber
    }
  },

  /**
   * Validates password strength (minimum 6 characters).
   * @param {string} password - The password string.
   * @returns {string|null} An error message if invalid, otherwise null.
   */
  validatePassword(password) {
    return password.length >= 6 ? null : "A senha deve ter pelo menos 6 caracteres.";
  },

  /**
   * Checks the user's authentication state and redirects if necessary.
   * @param {string} [redirectIfLoggedIn] - URL to redirect to if a user is logged in.
   * @param {string} [redirectIfNotSignedIn] - URL to redirect to if no user is signed in.
   */
  checkAuthState(redirectIfLoggedIn, redirectIfNotSignedIn) {
    console.log("Verificando estado de autenticação...");
    if (!this._auth) {
        console.warn("Firebase Auth não inicializado para checkAuthState.");
        return;
    }
    this._auth.onAuthStateChanged((user) => {
      console.log(user ? `Usuário logado: ${user.uid}` : "Nenhum usuário logado.");

      const currentPath = window.location.pathname;

      if (user && redirectIfLoggedIn && currentPath !== new URL(redirectIfLoggedIn, window.location.origin).pathname) {
        console.log(`Redirecionando para ${redirectIfLoggedIn} (usuário logado).`);
        window.location.href = redirectIfLoggedIn;
      } else if (!user && redirectIfNotSignedIn && currentPath !== new URL(redirectIfNotSignedIn, window.location.origin).pathname) {
        console.log(`Redirecionando para ${redirectIfNotSignedIn} (usuário não logado).`);
        window.location.href = redirectIfNotSignedIn;
      }
    });
  },

  /**
   * Registers a new user with email/password or phone number.
   * Stores additional user data in Firestore.
   * @param {object} userData - User registration data.
   * @param {string} userData.name - User's full name.
   * @param {string} [userData.email] - User's email (if method is 'email').
   * @param {string} [userData.phoneNumber] - User's phone number (if method is 'phone').
   * @param {string} userData.password - User's password.
   * @param {string} userData.municipio - User's municipality.
   * @param {string} userData.bairro - User's neighborhood.
   * @param {'email'|'phone'} userData.method - Registration method.
   * @param {object} userData.notificationPreferences - User's notification preferences.
   * @returns {Promise<object>} An object containing user info and verification status.
   * @throws {Error} If required fields are missing or registration fails.
   */
  async registerUser({ name, email, phoneNumber, password, municipio, bairro, method, notificationPreferences }) {
    console.log("Iniciando registro de usuário:", { name, method });

    // Basic validation for core fields
    if (!name || !method || !municipio || !bairro || !password) {
      throw new Error("Por favor, preencha todos os campos obrigatórios.");
    }
    if (!this._auth) throw new Error("Firebase Auth não inicializado para registro.");
    if (!this._firestore) throw new Error("Firestore não inicializado para registro.");


    let user;
    let finalEmail = email; // This will be the email used for Firebase Auth (can be synthetic for phone)

    try {
      if (method === 'email') {
        const emailError = this.validateEmail(email);
        if (emailError) throw new Error(emailError);

        const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
        user = userCredential.user;

        await user.updateProfile({ displayName: name }); // Set display name
        await user.sendEmailVerification(); // Send verification email
        console.log(`Usuário ${user.uid} registado via email. Email de verificação enviado.`);

      } else if (method === 'phone') {
        const phoneError = this.validatePhone(phoneNumber);
        if (phoneError) throw new Error(phoneError);

        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        // For phone number registrations, Firebase Auth still requires an email/password.
        // A common pattern is to create a "synthetic" email for the user.
        finalEmail = `${normalizedPhone.replace(/\D/g, '')}@fixabairro.com`;

        // Create user with synthetic email/password first
        const userCredential = await this._auth.createUserWithEmailAndPassword(finalEmail, password);
        user = userCredential.user;
        await user.updateProfile({ displayName: name }); // Set display name

        // Then, initiate phone number verification (sends SMS)
        if (!this._recaptchaVerifier) {
            throw new Error("reCAPTCHA não foi inicializado corretamente para autenticação por telefone.");
        }
        const confirmationResult = await this._auth.signInWithPhoneNumber(normalizedPhone, this._recaptchaVerifier);
        console.log(`Usuário ${user.uid} registado via telefone. SMS de verificação enviado para ${normalizedPhone}.`);

        // Return confirmationResult to the client to handle SMS code verification
        return { confirmationResult, user, method: 'phone', requiresPhoneVerification: true };

      } else {
        throw new Error("Método de registro inválido especificado.");
      }

      // Store additional user data in Firestore for both methods
      await this._firestore.collection('users').doc(user.uid).set({
        name,
        email: finalEmail, // Store the final email (real or synthetic)
        phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
        municipio,
        bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp for accuracy
        registrationMethod: method,
        notificationPreferences: {
          email: notificationPreferences.email || false,
          whatsapp: notificationPreferences.whatsapp || false,
        },
      });

      console.log("Dados do usuário guardados no Firestore.");
      return { user, method, requiresEmailVerification: method === 'email' };

    } catch (error) {
      console.error("Erro detalhado no registro:", error);
      // Re-throw the Firebase error to be handled by the caller (register.js)
      throw error; // Re-throwing the original error allows the caller to access error.code
    }
  },
};

// Expose firebaseAuth globally
window.firebaseAuth = firebaseAuth;