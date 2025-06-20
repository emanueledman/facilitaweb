const firebaseAuth = {
  _app: null,
  _auth: null,
  _firestore: null,

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

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  validatePassword(password) {
    if (!password || password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null;
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

  async registerUser({ name, email, password, municipio, bairro, notificationPreferences }) {
    if (!name || !email || !password || !municipio || !bairro || !notificationPreferences) {
      throw new Error("Por favor, preencha todos os campos obrigatórios.");
    }

    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) throw new Error(passwordValidation);

    try {
      const userCredential = await this._getAuth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: name });
      await user.sendEmailVerification();

      const userDocRef = this._getFirestore().collection('usuarios').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        await userDocRef.set({
          name,
          email,
          municipio,
          bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          registrationMethod: 'email',
          notificationPreferences: {
            email: notificationPreferences.email || false,
            whatsapp: notificationPreferences.whatsapp || false,
          },
        });
      } else {
        await userDocRef.update({
          name,
          email,
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
        requiresEmailVerification: true,
        registrationMethod: 'email',
      };
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      let errorMessage = "Erro ao registrar usuário.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Este email já está registrado. Tente fazer login.";
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