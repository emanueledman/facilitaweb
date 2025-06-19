const firebaseAuth = {
  /**
   * Inicializa o aplicativo Firebase.
   * @param {Object} firebaseConfig - Configuração do Firebase.
   * @returns {Object} Instância do aplicativo Firebase.
   */
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

  /**
   * Inicializa o reCAPTCHA invisível.
   * @param {string} containerId - ID do contêiner do reCAPTCHA.
   * @returns {Promise<string>} ID do reCAPTCHA.
   */
  async initializeRecaptcha(containerId) {
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      throw new Error("Firebase Auth SDK não carregado.");
    }
    try {
      return firebase.auth().RecaptchaVerifier(containerId, {
        size: 'invisible',
        callback: () => {
          console.log("reCAPTCHA verificado com sucesso.");
        },
        'expired-callback': () => {
          console.warn("reCAPTCHA expirou. Reinicie o processo.");
        },
      });
    } catch (error) {
      console.error("Erro ao inicializar reCAPTCHA:", error);
      throw new Error("Erro ao inicializar verificação de segurança.");
    }
  },

  /**
   * Verifica o estado de autenticação do usuário.
   * @param {string|null} redirectIfLoggedIn - URL para redirecionar se logado.
   * @param {string|null} redirectIfNotLoggedIn - URL para redirecionar se não logado.
   */
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

  /**
   * Normaliza o número de telefone removendo espaços.
   * @param {string} phone - Número de telefone.
   * @returns {string} Número normalizado.
   */
  normalizePhoneNumber(phone) {
    return phone.replace(/\s/g, '');
  },

  /**
   * Valida o formato do email.
   * @param {string} email - Email a validar.
   * @returns {string|null} Mensagem de erro ou null se válido.
   */
  validateEmail(email) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  /**
   * Valida o formato do número de telefone (+2449XXXXXXXX).
   * @param {string} phone - Número de telefone.
   * @returns {string|null} Mensagem de erro ou null se válido.
   */
  validatePhone(phone) {
    const normalizedPhone = this.normalizePhoneNumber(phone);
    const phoneRegex = /^\+2449[0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX.";
    }
    return null;
  },

  /**
   * Valida a senha (mínimo 8 caracteres).
   * @param {string} password - Senha a validar.
   * @returns {string|null} Mensagem de erro ou null se válida.
   */
  validatePassword(password) {
    if (!password) {
      return "A senha é obrigatória.";
    }
    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    return null;
  },

  /**
   * Verifica se o número de telefone já está registrado.
   * @param {string} phoneNumber - Número de telefone.
   * @returns {Promise<Object|null>} Dados do usuário ou null se não existe.
   */
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
          data: userDoc.data(),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao verificar número de telefone:", error);
      throw new Error("Erro ao verificar número de telefone.");
    }
  },

  /**
   * Realiza login com email e senha.
   * @param {string} email - Email do usuário.
   * @param {string} password - Senha do usuário.
   * @returns {Promise<Object>} Dados do usuário e status de verificação.
   */
  async loginWithEmail(email, password) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) throw new Error(passwordValidation);

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

  /**
   * Realiza login com Google.
   * @returns {Promise<Object>} Dados do usuário.
   */
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await firebase.auth().signInWithPopup(provider);
      const user = userCredential.user;

      const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        await firebase.firestore().collection('users').doc(user.uid).set({
          name: user.displayName || 'Usuário Google',
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: {
            email: true,
            phone: false,
          },
        });
      }
      return { user };
    } catch (error) {
      console.error("Erro no login com Google:", error);
      let errorMessage = "Erro ao fazer login com Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "O login foi cancelado.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Problema de conexão com a internet.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Envia um código de verificação para o telefone.
   * @param {string} phoneNumber - Número de telefone.
   * @returns {Promise<string>} ID de verificação.
   */
  async sendVerificationCode(phoneNumber) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) throw new Error(phoneValidation);

    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const userExists = await this.checkPhoneNumberExists(normalizedPhone);
      if (!userExists) {
        throw new Error("Número de telefone não registrado. Crie uma conta.");
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await firebase.firestore().collection('pendingVerifications').doc(normalizedPhone).set({
        verificationCode,
        phoneNumber: normalizedPhone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const response = await fetch('https://api.ultramsg.com/instance126366/messages/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'dklefhlqae1key9l',
          to: normalizedPhone,
          body: `Seu código de verificação FixABairro é: ${verificationCode}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Falha ao enviar código via WhatsApp: ${errorData.error || 'Erro desconhecido'}`);
      }

      return verificationCode;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      throw new Error(error.message || "Erro ao enviar código de verificação.");
    }
  },

  /**
   * Verifica o código de telefone e faz login.
   * @param {string} phoneNumber - Número de telefone.
   * @param {string} verificationCode - Código de verificação.
   * @returns {Promise<Object>} Dados do usuário.
   */
  async verifyPhoneCode(phoneNumber, verificationCode) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    try {
      const doc = await firebase.firestore().collection('pendingVerifications').doc(normalizedPhone).get();
      if (!doc.exists) {
        throw new Error("Nenhum código de verificação encontrado para este número.");
      }
      const data = doc.data();
      if (data.verificationCode !== verificationCode) {
        throw new Error("Código de verificação inválido.");
      }

      const userDoc = await firebase.firestore().collection('users')
        .where('phoneNumber', '==', normalizedPhone)
        .limit(1)
        .get();
      if (userDoc.empty) {
        throw new Error("Usuário não encontrado.");
      }

      const userData = userDoc.docs[0].data();
      const email = `${normalizedPhone}@fixabairro.co.ao`;
      const password = data.password || 'defaultPassword';
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      await firebase.firestore().collection('pendingVerifications').doc(normalizedPhone).delete();
      return { user: userCredential.user };
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      throw new Error(error.message || "Erro ao verificar código.");
    }
  },

  /**
   * Redefine a senha enviando um email de redefinição.
   * @param {string} email - Email do usuário.
   * @returns {Promise<boolean>} Sucesso da operação.
   */
  async resetPassword(email) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);

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

  /**
   * Registra um usuário com email.
  * @param {string} name - Nome completo.
   * @param {string} email - Email do usuário.
   * @param {string} password - Senha do usuário.
   * @param {string} municipio - Município.
   * @param {string} bairro - Bairro.
   * @returns {Promise<Object>} Dados do usuário e status de verificação.
   */
  async registerUserWithEmail(name, email, password, municipio, bairro) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) throw new Error(emailValidation);
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) throw new Error(passwordValidation);

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
        },
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

  /**
   * Registra um usuário com número de telefone.
   * @param {string} name - Nome completo.
   * @param {string} phoneNumber - Número de telefone.
   * @param {string} password - Senha do usuário.
   * @param {string} municipio - Município.
   * @param {string} bairro - Bairro.
   * @returns {Promise<Object>} Dados do usuário.
   */
  async registerUserWithPhone(name, phoneNumber, password, municipio, bairro) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) throw new Error(phoneValidation);
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) throw new Error(passwordValidation);

    if (!name || !municipio || !bairro) {
      throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
    }

    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(
        `${normalizedPhone}@fixabairro.co.ao`,
        password
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
        },
      });

      return { user: userCredential.user };
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

  /**
   * Desconecta o usuário.
   * @returns {Promise<boolean>} Sucesso da operação.
   */
  async signOutUser() {
    try {
      await firebase.auth().signOut();
      return true;
    } catch (error) {
      console.error("Erro ao sair:", error);
      throw new Error("Erro ao desconectar.");
    }
  },

  /**
   * Adiciona um listener para mudanças no estado de autenticação.
   * @param {Function} callback - Função de callback.
   */
  onAuthStateChangedListener(callback) {
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      return;
    }
    firebase.auth().onAuthStateChanged(callback);
  },
};

window.firebaseAuth = firebaseAuth;