const firebaseAuth = {
  initializeFirebaseApp(firebaseConfig) {
    if (typeof firebase === 'undefined') {
      console.error("Firebase SDK não carregado.");
      throw new Error("Firebase SDK não carregado. Verifique os scripts CDN.");
    }
    if (!firebase.apps.length) {
      return firebase.initializeApp(firebaseConfig);
    }
    return firebase.app();
  },

  checkAuthState(redirectIfLoggedIn, redirectIfNotLoggedIn) {
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      return;
    }
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log("Usuário logado:", user.uid);
        if (redirectIfLoggedIn) {
          window.location.href = redirectIfLoggedIn;
        }
      } else {
        console.log("Nenhum usuário logado.");
        if (redirectIfNotLoggedIn) {
          window.location.href = redirectIfNotLoggedIn;
        }
      }
    });
  },

  normalizePhoneNumber(phone) {
    return phone.replace(/\s/g, '');
  },

  validateEmail(email) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  validatePhone(phone) {
    const normalizedPhone = this.normalizePhoneNumber(phone);
    const phoneRegex = /^\+2449[0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX.";
    }
    return null;
  },

  validatePassword(password) {
    if (!password) {
      return "A senha é obrigatória.";
    }
    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    return null;
  },

  async checkPhoneNumberExists(phoneNumber) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const querySnapshot = await firebase.firestore().collection('users')
        .where('phoneNumber', '==', normalizedPhone)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return {
          uid: userDoc.id,
          data: userDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao verificar número de telefone:", error);
      throw new Error("Erro ao verificar número de telefone.");
    }
  },

  async loginWithEmail(email, password) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) { throw new Error(emailValidation); }
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) { throw new Error(passwordValidation); }

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
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
        default:
          errorMessage = "Erro desconhecido.";
      }
      throw new Error(errorMessage);
    }
  },

  async resetPassword(email) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) { throw new Error(emailValidation); }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      let errorMessage = "Erro ao redefinir senha.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nenhum usuário encontrado com este email.";
      }
      throw new Error(errorMessage);
    }
  },

  async registerUserWithEmail(name, email, password, municipio, bairro) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) { throw new Error(emailValidation); }
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) { throw new Error(passwordValidation); }

    if (!name || !municipio || !bairro) {
      throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
    }

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      await userCredential.user.sendEmailVerification();

      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        name,
        email,
        municipio,
        bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notificationPreferences: {
          email: true,
          phone: false,
        }
      });

      return {
        user: userCredential.user,
        requiresEmailVerification: true,
      };
    } catch (error) {
      console.error("Erro ao registrar usuário com email:", error);
      let errorMessage = "Erro ao registrar usuário.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este email já está registrado.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca.";
      }
      throw new Error(errorMessage);
    }
  },

  async registerUserWithPhone(name, phoneNumber, password, municipio, bairro) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) { throw new Error(phoneValidation); }
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) { throw new Error(passwordValidation); }

    if (!name || !municipio || !bairro) {
      throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
    }

    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(
        `${normalizedPhone}@fixabairro.co.ao`, password
      );
      await userCredential.user.updateProfile({ displayName: name });

      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        name,
        phoneNumber: normalizedPhone,
        municipio,
        bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notificationPreferences: {
          email: false,
          phone: true,
        }
      });

      return {
        user: userCredential.user,
      };
    } catch (error) {
      console.error("Erro ao registrar usuário com telefone:", error);
      let errorMessage = "Erro ao registrar usuário.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este número de telefone já está registrado.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "A senha é muito fraca.";
      }
      throw new Error(errorMessage);
    }
  },

  async signOutUser() {
    try {
      await firebase.auth().signOut();
      return true;
    } catch (error) {
      console.error("Erro ao sair:", error);
      throw new Error("Erro ao desconectar.");
    }
  },

  onAuthStateChangedListener(callback) {
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      return;
    }
    firebase.auth().onAuthStateChanged(callback);
  }
};

window.firebaseAuth = firebaseAuth;