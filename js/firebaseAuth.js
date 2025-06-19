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
        return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX.";
      }
      return null;
    } catch (error) {
      return error.message;
    }
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

  async loginWithEmail(email, password) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);
    if (!password || password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");

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

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await this._getAuth().signInWithPopup(provider);
      const user = userCredential.user;

      const userDocRef = this._getFirestore().collection('usuarios').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        await userDocRef.set({
          name: user.displayName || 'Usuário Google',
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          registrationMethod: 'google',
          notificationPreferences: {
            email: true,
            phone: false,
          },
          municipio: 'Não informado',
          bairro: 'Não informado',
          phoneVerified: false,
        });
      }
      return { user };
    } catch (error) {
      console.error("Erro no login com Google:", error);
      let errorMessage = "Erro ao fazer login com Google.";
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = "O login foi cancelado.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Problema de conexão com a internet.";
      }
      throw new Error(errorMessage);
    }
  },

  async registerUser({ name, email = null, phoneNumber = null, password, municipio, bairro, method, notificationPreference }) {
    if (!name || !password || !municipio || !bairro || !method || !notificationPreference) {
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
            email: notificationPreference === 'gmail',
            phone: notificationPreference === 'whatsapp',
          },
          phoneVerified: method === 'phone' ? false : true, // Inicializa como false para telefone
        });
      } else {
        await userDocRef.update({
          name,
          email: finalEmail,
          phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
          municipio,
          bairro,
          notificationPreferences: {
            email: notificationPreference === 'gmail',
            phone: notificationPreference === 'whatsapp',
          },
          phoneVerified: method === 'phone' ? false : true,
        });
        console.warn("Documento de usuário já existe no Firestore. Atualizando dados.");
      }

      return {
        user: user,
        requiresEmailVerification: requiresEmailVerification,
        registrationMethod: method
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

  async verifyPhoneCode(userId, verificationCode) {
    try {
      const verificationDocRef = this._getFirestore().collection('phoneVerifications').doc(userId);
      const verificationDoc = await verificationDocRef.get();

      if (!verificationDoc.exists) {
        throw new Error("Dados de verificação não encontrados.");
      }

      const data = verificationDoc.data();
      if (data.verificationCode !== verificationCode) {
        throw new Error("Código de verificação inválido.");
      }

      // Verificar se o código não está expirado (exemplo: 10 minutos)
      const createdAt = data.createdAt.toDate();
      const now = new Date();
      if ((now - createdAt) > 10 * 60 * 1000) {
        throw new Error("Código de verificação expirado. Reenvie um novo código.");
      }

      // Marcar o telefone como verificado no documento do usuário
      const userDocRef = this._getFirestore().collection('usuarios').doc(userId);
      await userDocRef.update({
        phoneVerified: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Remover o documento de verificação
      await verificationDocRef.delete();

      return true;
    } catch (error) {
      console.error("Erro ao verificar código de telefone:", error);
      throw new Error(error.message || "Erro ao verificar código.");
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