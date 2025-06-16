// firebaseAuth.js

// IMPORTANT: Este arquivo assume que as bibliotecas do Firebase SDK (versão 8.10.0)
// foram carregadas globalmente na sua página HTML, por exemplo, via CDN scripts:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
//
// Certifique-se também de que 'firebase.initializeApp(firebaseConfig)' seja chamado
// em algum lugar do seu aplicativo (geralmente na sua página HTML principal) antes de usar as funções deste objeto.

// Variáveis globais para o reCAPTCHA e dados temporários de registro
let recaptchaVerifierGlobal = null;
let confirmationResultGlobal = null; // Para armazenar o resultado da confirmação do telefone
let tempRegistrationDataGlobal = null; // Para armazenar dados temporários de registro por telefone

// Exporta um objeto contendo funções relacionadas à autenticação
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
    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null;
  },

  async initializeRecaptcha(recaptchaContainerId, options = { size: 'invisible' }) {
    if (recaptchaVerifierGlobal) {
      console.log("reCAPTCHA já inicializado.");
      return;
    }

    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.auth.RecaptchaVerifier === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      throw new Error("Firebase Auth SDK não carregado.");
    }

    recaptchaVerifierGlobal = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
      size: options.size,
      callback: (response) => {
        console.log("reCAPTCHA resolvido:", response);
      },
      'expired-callback': () => {
        console.warn("reCAPTCHA expirou.");
        recaptchaVerifierGlobal.clear();
        recaptchaVerifierGlobal = null;
      },
      'error-callback': (error) => {
        console.error("Erro no reCAPTCHA:", error);
      }
    });
    await recaptchaVerifierGlobal.render();
    console.log("reCAPTCHA inicializado com sucesso.");
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

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await firebase.auth().signInWithPopup(provider);
      return {
        user: userCredential.user,
        additionalUserInfo: userCredential.additionalUserInfo,
      };
    } catch (error) {
      console.error("Erro no login com Google:", error);
      let errorMessage = "Erro ao fazer login com Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "O popup de login foi fechado.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Requisição de popup cancelada.";
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

  async sendVerificationCode(phoneNumber) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) { throw new Error(phoneValidation); }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Verificar se o número está associado a uma conta
    const userData = await this.checkPhoneNumberExists(normalizedPhone);
    if (!userData) {
      throw new Error("Nenhuma conta encontrada com este número de telefone.");
    }

    try {
      if (!recaptchaVerifierGlobal) {
        throw new Error("reCAPTCHA não inicializado.");
      }
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(normalizedPhone, recaptchaVerifierGlobal);
      confirmationResultGlobal = confirmationResult;
      tempRegistrationDataGlobal = {
        name: userData.data.name,
        municipio: userData.data.municipio,
        bairro: userData.data.bairro,
        phoneNumber: normalizedPhone,
      };
      localStorage.setItem('pendingVerificationPhoneNumber', normalizedPhone);
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      let errorMessage = "Erro ao enviar código de verificação.";
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Muitas requisições. Tente novamente mais tarde.";
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Número de telefone inválido.";
      }
      throw new Error(errorMessage);
    }
  },

  async verifyPhoneNumber(code) {
    if (!confirmationResultGlobal) {
      localStorage.removeItem('pendingVerificationPhoneNumber');
      throw new Error("Nenhuma verificação de telefone pendente.");
    }
    if (!code || code.length !== 6) {
      throw new Error("Por favor, insira um código OTP de 6 dígitos válido.");
    }

    try {
      const userCredential = await confirmationResultGlobal.confirm(code);
      const userData = tempRegistrationDataGlobal;

      if (!userData) {
        throw new Error("Dados de registro temporários não encontrados.");
      }

      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        name: userData.name,
        phoneNumber: userCredential.user.phoneNumber,
        municipio: userData.municipio,
        bairro: userData.bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notificationPreferences: {
          email: userCredential.user.email ? true : false,
          phone: true,
        },
      }, { merge: true });

      await userCredential.user.updateProfile({ displayName: userData.name });

      // Limpar estado global e localStorage
      confirmationResultGlobal = null;
      tempRegistrationDataGlobal = null;
      localStorage.removeItem('pendingVerificationPhoneNumber');

      return {
        user: userCredential.user,
      };
    } catch (error) {
      console.error("Erro ao verificar telefone:", error);
      // Limpar estado em caso de erro crítico
      confirmationResultGlobal = null;
      tempRegistrationDataGlobal = null;
      localStorage.removeItem('pendingVerificationPhoneNumber');
      let errorMessage = "Erro ao verificar código.";
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = "Código de verificação inválido.";
      } else if (error.code === 'auth/code-expired') {
        errorMessage = "O código expirou. Solicite um novo código.";
      } else if (error.code === 'auth/missing-verification-code') {
        errorMessage = "Código de verificação ausente.";
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

  async signInAnonymously() {
    try {
      const userCredential = await firebase.auth().signInAnonymously();
      return { user: userCredential.user };
    } catch (error) {
      console.error("Erro ao entrar como visitante:", error);
      throw new Error("Erro ao entrar como visitante.");
    }
  },

  onAuthStateChanged(callback) {
    if (typeof firebase.auth === 'undefined') {
      console.error("Firebase Auth SDK não carregado.");
      return;
    }
    firebase.auth().onAuthStateChanged(callback);
  }
};

window.firebaseAuth = firebaseAuth;