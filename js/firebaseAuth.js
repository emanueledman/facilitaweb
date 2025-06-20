const firebaseAuth = {
  _app: null,
  _auth: null,
  _firestore: null,
  _recaptchaVerifier: null,

  initializeFirebaseApp(firebaseConfig) {
    console.log("Inicializando Firebase...");
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não carregado.");
    }
    this._app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    this._auth = firebase.auth();
    this._firestore = firebase.firestore();
    console.log("Firebase inicializado.");
  },

  initializeRecaptcha(containerId) {
    console.log("Inicializando reCAPTCHA...");
    if (!this._auth) throw new Error("Firebase Auth não inicializado.");
    if (typeof grecaptcha === 'undefined') throw new Error("reCAPTCHA não carregado.");
    this._recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      size: 'invisible',
      callback: () => {
        document.getElementById('registerBtn').disabled = false;
        console.log("reCAPTCHA resolvido.");
      },
      'expired-callback': () => {
        document.getElementById('registerBtn').disabled = true;
        console.warn("reCAPTCHA expirou.");
      },
    });
    return this._recaptchaVerifier.render().catch((error) => {
      console.error("Erro ao renderizar reCAPTCHA:", error);
      throw new Error("Erro na verificação de segurança.");
    });
  },

  normalizePhoneNumber(phone) {
    console.log("Normalizando telefone:", phone);
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('244')) normalized = '+' + normalized;
    else if (normalized.startsWith('9')) normalized = '+244' + normalized;
    else if (!normalized.startsWith('+244')) normalized = '+244' + normalized;
    if (!/^\+2449\d{8}$/.test(normalized)) throw new Error("Formato de telefone inválido.");
    return normalized;
  },

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? null : "Email inválido.";
  },

  validatePhone(phone) {
    try {
      const normalized = this.normalizePhoneNumber(phone);
      return null;
    } catch (error) {
      return error.message;
    }
  },

  validatePassword(password) {
    return password.length >= 6 ? null : "Senha deve ter 6+ caracteres.";
  },

  async registerUser({ name, email, phoneNumber, password, municipio, bairro, method, notificationPreferences }) {
    console.log("Registrando usuário:", { name, method });
    if (!name || !method || !municipio || !bairro || !password) throw new Error("Campos obrigatórios ausentes.");

    let user, finalEmail = email;
    try {
      if (method === 'email') {
        const emailError = this.validateEmail(email);
        if (emailError) throw new Error(emailError);
        const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
        user = userCredential.user;
        await user.updateProfile({ displayName: name });
        await user.sendEmailVerification();
      } else if (method === 'phone') {
        const phoneError = this.validatePhone(phoneNumber);
        if (phoneError) throw new Error(phoneError);
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        finalEmail = `${normalizedPhone.replace(/\D/g, '')}@fixabairro.com`;
        const userCredential = await this._auth.createUserWithEmailAndPassword(finalEmail, password);
        user = userCredential.user;
        await user.updateProfile({ displayName: name });
        const confirmationResult = await this._auth.signInWithPhoneNumber(normalizedPhone, this._recaptchaVerifier);
        return { confirmationResult, user, method: 'phone', requiresPhoneVerification: true };
      } else {
        throw new Error("Método inválido.");
      }

      await this._firestore.collection('users').doc(user.uid).set({
        name,
        email: finalEmail,
        phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
        municipio,
        bairro,
        createdAt: Date.now(),
        registrationMethod: method,
        notificationPreferences: {
          email: notificationPreferences.email || false,
          whatsapp: notificationPreferences.whatsapp || false,
        },
      });

      return { user, method, requiresEmailVerification: method === 'email' };
    } catch (error) {
      console.error("Erro ao registrar:", error);
      throw new Error(error.message || "Erro no registro.");
    }
  },
};

window.firebaseAuth = firebaseAuth;