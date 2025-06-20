const firebaseAuth = {
  _app: null,
  _auth: null,
  _firestore: null,
  _recaptchaVerifier: null,

  initializeFirebaseApp(firebaseConfig) {
    if (typeof firebase === 'undefined') {
      console.error("Firebase SDK não carregado. Verifique os scripts CDN.");
      throw new Error("Firebase SDK não carregado. Certifique-se de que os scripts CDN do Firebase Auth e Firestore estejam incluídos no seu HTML.");
    }

    if (!firebase.apps.length) {
      this._app = firebase.initializeApp(firebaseConfig);
    } else {
      this._app = firebase.app();
    }

    this._auth = firebase.auth();
    this._firestore = firebase.firestore();

    console.log("Firebase App, Auth e Firestore inicializados.");
  },

  initializeRecaptcha(containerId) {
    if (!this._auth) {
      throw new Error("Firebase Auth não inicializado. Chame initializeFirebaseApp primeiro.");
    }
    this._recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log("reCAPTCHA resolvido!");
      },
      'expired-callback': () => {
        console.warn("reCAPTCHA expirou. Por favor, tente novamente.");
      }
    });

    return this._recaptchaVerifier.render().then(widgetId => {
      console.log("reCAPTCHA renderizado com o widget ID:", widgetId);
    }).catch(error => {
      console.error("Erro ao renderizar reCAPTCHA:", error);
      throw new Error("Erro ao carregar verificação de segurança.");
    });
  },

  _getAuth() {
    if (!this._auth) {
      throw new Error("Firebase Auth não inicializado. Chame initializeFirebaseApp primeiro.");
    }
    return this._auth;
  },

  _getFirestore() {
    if (!this._firestore) {
      throw new Error("Firebase Firestore não inicializado. Chame initializeFirebaseApp primeiro.");
    }
    return this._firestore;
  },

  checkAuthState(redirectIfLoggedIn, redirectIfNotLoggedIn) {
    this._getAuth().onAuthStateChanged((user) => {
      if (user) {
        console.log("Usuário logado:", user.uid);
        if (redirectIfLoggedIn && window.location.href !== redirectIfLoggedIn) {
          window.location.href = redirectIfLoggedIn;
        }
      } else {
        console.log("Nenhum usuário logado.");
        if (redirectIfNotLoggedIn && window.location.href !== redirectIfNotLoggedIn) {
          window.location.href = redirectIfNotLoggedIn;
        }
      }
    });
  },

  normalizePhoneNumber(phone) {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('244')) {
        normalized = '+' + normalized;
      } else if (normalized.startsWith('9')) {
        normalized = '+244' + normalized;
      } else {
        throw new Error("Formato de telefone inválido. Deve começar com '+' ou ser um número angolano.");
      }
    }
    return normalized;
  },

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  validatePhone(phone) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      const phoneRegex = /^\+\d{7,15}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX (Ex: +244923123456).";
      }
      return null;
    } catch (error) {
      return error.message;
    }
  },

  validatePassword(password) {
    if (!password || password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null;
  },

  async checkPhoneNumberExists(phoneNumber) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const querySnapshot = await this._getFirestore().collection('usuarios')
        .where('phoneNumber', '==', normalizedPhone)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return {
          uid: userDoc.id,
          data: userDoc.data(),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao verificar número de telefone no Firestore:", error);
      throw new Error("Erro ao verificar número de telefone.");
    }
  },

  async sendPhoneVerificationCode(phoneNumber) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) throw new Error(phoneValidation);

    if (!this._recaptchaVerifier) {
      throw new Error("reCAPTCHA Verifier não foi inicializado.");
    }

    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const confirmationResult = await this._getAuth().signInWithPhoneNumber(normalizedPhone, this._recaptchaVerifier);
      console.log("Código de verificação enviado para:", normalizedPhone);
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação por telefone:", error);
      let errorMessage = "Erro ao enviar código de verificação.";
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = "Número de telefone inválido.";
          break;
        case 'auth/missing-phone-number':
          errorMessage = "Número de telefone ausente.";
          break;
        case 'auth/quota-exceeded':
          errorMessage = "Cota de SMS excedida. Tente novamente mais tarde.";
          break;
        case 'auth/app-not-authorized':
          errorMessage = "Este aplicativo não está autorizado a usar Autenticação por Telefone. Verifique as configurações do Firebase.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
          break;
        case 'auth/web-storage-unsupported':
          errorMessage = "O navegador não suporta o armazenamento necessário para reCAPTCHA. Tente outro navegador.";
          break;
        case 'auth/captcha-check-failed':
          errorMessage = "A verificação de segurança falhou. Tente novamente.";
          break;
        default:
          errorMessage = error.message || "Erro desconhecido.";
      }
      throw new Error(errorMessage);
    }
  },

  async confirmPhoneVerificationCode(confirmationResult, verificationCode) {
    if (!confirmationResult || !verificationCode) {
      throw new Error("Resultado da confirmação ou código de verificação ausente.");
    }

    try {
      const userCredential = await confirmationResult.confirm(verificationCode);
      const user = userCredential.user;

      const userDocRef = this._getFirestore().collection('usuarios').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.warn("Usuário autenticado por telefone, mas documento Firestore não encontrado. Criando novo documento.");
        await userDocRef.set({
          phoneNumber: user.phoneNumber,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          registrationMethod: 'phone',
          notificationPreferences: {
            email: false,
            whatsapp: true,
          },
          name: 'Usuário Telefone',
          municipio: 'Não informado',
          bairro: 'Não informado',
        });
      }

      return { user };
    } catch (error) {
      console.error("Erro ao verificar código de telefone:", error);
      let errorMessage = "Erro ao verificar código.";
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = "Código de verificação inválido.";
          break;
        case 'auth/code-expired':
          errorMessage = "O código de verificação expirou. Envie um novo.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
          break;
        default:
          errorMessage = error.message || "Erro desconhecido ao verificar código.";
      }
      throw new Error(errorMessage);
    }
  },

  async loginWithEmail(email, password) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) throw new Error(passwordValidation);

    try {
      const userCredential = await this._getAuth().signInWithEmailAndPassword(email, password);
      return {
        user: userCredential.user,
        requiresEmailVerification: !userCredential.user.emailVerified,
      };
    } catch (error) {
      console.error("Erro no login com email:", error);
      let errorMessage = "Erro ao fazer login.";
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Email inválido.";
          break;
        case 'auth/user-disabled':
          errorMessage = "Este usuário foi desabilitado.";
          break;
        case 'auth/user-not-found':
          errorMessage = "Usuário não encontrado. Crie uma conta.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Senha incorreta.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Email ou senha inválidos.";
          break;
        default:
          errorMessage = "Erro desconhecido.";
      }
      throw new Error(errorMessage);
    }
  },

  async registerUser({ name, email, phoneNumber, password, municipio, bairro, method, notificationPreferences }) {
    if (!name || !password || !municipio || !bairro || !method || !notificationPreferences) {
      throw new Error("Por favor, preencha todos os campos obrigatórios.");
    }

    let userCredential;
    let user;
    let requiresEmailVerification = false;
    let finalEmail = email;

    try {
      if (method === 'email') {
        const emailValidation = this.validateEmail(email);
        if (emailValidation) throw new Error(emailValidation);
        userCredential = await this._getAuth().createUserWithEmailAndPassword(email, password);
        user = userCredential.user;
        await user.updateProfile({ displayName: name });
        await user.sendEmailVerification();
        requiresEmailVerification = true;
      } else if (method === 'phone') {
        const phoneValidation = this.validatePhone(phoneNumber);
        if (phoneValidation) throw new Error(phoneValidation);
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        finalEmail = `${normalizedPhone.replace(/\D/g, '')}@fixabairro.co.ao`;

        try {
          await this._getAuth().fetchSignInMethodsForEmail(finalEmail);
          throw new Error("Já existe uma conta com este número de telefone.");
        } catch (fetchError) {
          if (fetchError.code !== 'auth/user-not-found') {
            throw fetchError;
          }
        }

        userCredential = await this._getAuth().createUserWithEmailAndPassword(finalEmail, password);
        user = userCredential.user;
        await user.updateProfile({ displayName: name });

        const confirmationResult = await this.sendPhoneVerificationCode(phoneNumber);
        return {
          confirmationResult,
          user,
          registrationMethod: 'phone',
          requiresPhoneVerification: true,
        };
      } else {
        throw new Error("Método de registro inválido.");
      }

      const userDocRef = this._getFirestore().collection('usuarios').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        await userDocRef.set({
          name,
          email: finalEmail,
          phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
          municipio,
          bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          registrationMethod: method,
          notificationPreferences: {
            email: notificationPreferences.email || false,
            whatsapp: notificationPreferences.whatsapp || false,
          },
        });
      } else {
        await userDocRef.update({
          name,
          email: finalEmail,
          phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
          municipio,
          bairro,
          notificationPreferences: {
            email: notificationPreferences.email || false,
            whatsapp: notificationPreferences.whatsapp || false,
          },
        });
        console.warn("Documento de usuário já existe no Firestore. Atualizando dados.");
      }

      return {
        user,
        requiresEmailVerification,
        registrationMethod: method,
      };
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      let errorMessage = "Erro ao registrar usuário.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Este email/telefone já está registrado. Tente fazer login.";
          break;
        case 'auth/weak-password':
          errorMessage = "A senha é muito fraca. Por favor, use uma senha mais forte.";
          break;
        case 'auth/invalid-email':
          errorMessage = "O formato do email é inválido.";
          break;
        default:
          errorMessage = error.message || "Erro desconhecido.";
      }
      throw new Error(errorMessage);
    }
  },

  async resetPassword(email) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);

    try {
      await this._getAuth().sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      let errorMessage = "Erro ao redefinir senha.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nenhum usuário encontrado com este email.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido.";
      }
      throw new Error(errorMessage);
    }
  },

  async signOutUser() {
    try {
      await this._getAuth().signOut();
      return true;
    } catch (error) {
      console.error("Erro ao sair:", error);
      throw new Error("Erro ao desconectar.");
    }
  },

  onAuthStateChangedListener(callback) {
    return this._getAuth().onAuthStateChanged(callback);
  },
};

window.firebaseAuth = firebaseAuth;