// firebaseAuth.js

// IMPORTANT: Este arquivo assume que as bibliotecas do Firebase SDK (versão 8 ou anterior)
// foram carregadas globalmente na sua página HTML, por exemplo, via CDN scripts:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
//
// Certifique-se também de que 'firebase.initializeApp(firebaseConfig)' seja chamado
// em algum lugar do seu aplicativo (geralmente na sua página HTML principal) antes de usar as funções deste objeto.

// Variáveis globais para o reCAPTCHA e dados temporários de registro (mantendo a estrutura original)
let recaptchaVerifierGlobal = null;
let confirmationResultGlobal = null; // Para armazenar o resultado da confirmação do telefone
let tempRegistrationDataGlobal = null; // Para armazenar dados temporários de registro por telefone

// Exporta um objeto contendo funções relacionadas à autenticação
const firebaseAuth = {

  /**
   * Normaliza o número de telefone removendo espaços.
   * @param {string} phone - O número de telefone.
   * @returns {string} - O número de telefone normalizado.
   */
  normalizePhoneNumber(phone) {
    return phone.replace(/\s/g, '');
  },

  /**
   * Valida o formato do email.
   * @param {string} email - O email a ser validado.
   * @returns {string|null} - Mensagem de erro se inválido, null se válido.
   */
  validateEmail(email) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return "O formato do email é inválido.";
    }
    return null;
  },

  /**
   * Valida o formato do número de telefone (específico para Angola: +2449XXXXXXXX).
   * @param {string} phone - O número de telefone a ser validado.
   * @returns {string|null} - Mensagem de erro se inválido, null se válido.
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
   * Valida a senha (mínimo 6 caracteres).
   * @param {string} password - A senha a ser validada.
   * @returns {string|null} - Mensagem de erro se inválido, null se válido.
   */
  validatePassword(password) {
    if (!password) {
      return "A senha é obrigatória.";
    }
    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null;
  },

  /**
   * Inicializa o reCAPTCHA para autenticação por telefone.
   * Deve ser chamado uma vez na sua página HTML (ex: window.onload) antes de
   * `sendVerificationCode` ou `initiatePhoneRegistration` serem usados.
   * @param {string} recaptchaContainerId - O ID do elemento HTML onde o reCAPTCHA será renderizado.
   * Este elemento pode ser visível ou invisível.
   */
  async initializeRecaptcha(recaptchaContainerId) {
    if (recaptchaVerifierGlobal) {
      console.log("reCAPTCHA já inicializado.");
      return;
    }

    // Verifica se o SDK do Firebase Auth está carregado
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.auth.RecaptchaVerifier === 'undefined') {
        console.error("Firebase Auth SDK não carregado. Certifique-se de que o CDN do Firebase Auth está incluído antes deste script.");
        throw new Error("Firebase Auth SDK não carregado. Verifique os scripts CDN.");
    }

    recaptchaVerifierGlobal = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
      size: 'invisible', // Pode ser 'invisible' ou 'normal'
      callback: (response) => {
        // reCAPTCHA resolvido
        console.log("reCAPTCHA resolvido:", response);
      },
      'expired-callback': () => {
        console.warn("reCAPTCHA expirou. Limpando e recarregando...");
        recaptchaVerifierGlobal.clear(); // Limpa o reCAPTCHA expirado
        recaptchaVerifierGlobal = null; // Zera a referência para forçar uma nova inicialização
      },
      'error-callback': (error) => {
        console.error("Erro no reCAPTCHA:", error);
        // Lidar com erros do reCAPTCHA
      }
    });
    await recaptchaVerifierGlobal.render();
    console.log("reCAPTCHA inicializado com sucesso.");
  },

  /**
   * Realiza o login com email e senha.
   * @param {string} email - Email do usuário.
   * @param {string} password - Senha do usuário.
   * @returns {Promise<object>} - Objeto com o user e status de verificação de email.
   * @throws {Error} - Erro específico do Firebase ou de validação.
   */
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
      let errorMessage = "Erro ao fazer login. Por favor, tente novamente.";
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
              errorMessage = "Erro desconhecido. Por favor, tente novamente.";
      }
      throw new Error(errorMessage); // Re-lança o erro com mensagem amigável
    }
  },

  /**
   * Realiza o login com Google.
   * @returns {Promise<object>} - Objeto com o user e informações adicionais do Google.
   * @throws {Error} - Erro específico do Firebase.
   */
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
      console.error("Erro no login com Google:", error);
      let errorMessage = "Erro ao fazer login com Google. Por favor, tente novamente.";
      if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = "O popup de login foi fechado.";
      } else if (error.code === 'auth/cancelled-popup-request') {
          errorMessage = "Requisição de popup cancelada.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Redefine a senha para o email fornecido.
   * @param {string} email - Email do usuário.
   * @returns {Promise<boolean>} - True se o email for enviado com sucesso.
   * @throws {Error} - Erro específico do Firebase ou de validação.
   */
  async resetPassword(email) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) { throw new Error(emailValidation); }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      return true; // Sucesso
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      let errorMessage = "Erro ao redefinir senha. Por favor, tente novamente.";
      if (error.code === 'auth/user-not-found') {
          errorMessage = "Nenhum usuário encontrado com este email.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Envia o código de verificação OTP para o número de telefone.
   * Requer que `firebaseAuth.initializeRecaptcha()` tenha sido chamado e resolvido.
   * @param {string} phoneNumber - Número de telefone para verificação.
   * @returns {Promise<firebase.auth.ConfirmationResult>} - Objeto de resultado da confirmação.
   * @throws {Error} - Erro específico do Firebase, de validação ou se o reCAPTCHA não estiver inicializado.
   */
  async sendVerificationCode(phoneNumber) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) { throw new Error(phoneValidation); }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    try {
      if (!recaptchaVerifierGlobal) {
        throw new Error("reCAPTCHA não inicializado. Chame firebaseAuth.initializeRecaptcha() primeiro.");
      }
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(normalizedPhone, recaptchaVerifierGlobal);
      confirmationResultGlobal = confirmationResult; // Armazena globalmente para `verifyPhoneNumber`
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      let errorMessage = "Erro ao enviar código de verificação. Por favor, tente novamente.";
      if (error.code === 'auth/too-many-requests') {
          errorMessage = "Muitas requisições. Tente novamente mais tarde ou verifique o número.";
      } else if (error.code === 'auth/invalid-phone-number') {
          errorMessage = "Número de telefone inválido.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Registra um novo usuário com email e senha, e salva dados básicos no Firestore.
   * @param {string} name - Nome completo do usuário.
   * @param {string} email - Email do usuário.
   * @param {string} password - Senha do usuário.
   * @param {string} municipio - Município do usuário.
   * @param {string} bairro - Bairro do usuário.
   * @returns {Promise<object>} - Objeto com o user e status de verificação de email.
   * @throws {Error} - Erro específico do Firebase ou de validação.
   */
  async registerUserWithEmail(name, email, password, municipio, bairro) {
    const emailValidation = this.validateEmail(email);
    if (emailValidation) { throw new Error(emailValidation); }
    const passwordValidation = this.validatePassword(password);
    if (passwordValidation) { throw new Error(passwordValidation); }

    // Validação de campos obrigatórios adicionais
    if (!name || !municipio || !bairro) {
      throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
    }

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      await userCredential.user.sendEmailVerification();

      // Salva dados do usuário no Firestore
      // Certifique-se de que `firebase.firestore()` esteja disponível (SDK do Firestore carregado)
      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        name,
        email,
        municipio,
        bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notificationPreferences: { // Define preferências iniciais
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
      let errorMessage = "Erro ao registrar usuário. Por favor, tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
          errorMessage = "Este email já está registrado. Tente fazer login.";
      } else if (error.code === 'auth/weak-password') {
          errorMessage = "A senha é muito fraca.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Inicia o processo de registro de um usuário com número de telefone.
   * Envia o código de verificação e armazena os dados temporários do usuário.
   * @param {string} name - Nome completo do usuário.
   * @param {string} phoneNumber - Número de telefone para registro.
   * @param {string} municipio - Município do usuário.
   * @param {string} bairro - Bairro do usuário.
   * @returns {Promise<firebase.auth.ConfirmationResult>} - Objeto de resultado da confirmação.
   * @throws {Error} - Erro específico do Firebase, de validação ou se o reCAPTCHA não estiver inicializado.
   */
  async initiatePhoneRegistration(name, phoneNumber, municipio, bairro) {
    const phoneValidation = this.validatePhone(phoneNumber);
    if (phoneValidation) { throw new Error(phoneValidation); }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Validação de campos obrigatórios adicionais
    if (!name || !municipio || !bairro) {
      throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
    }

    try {
      // Requer que initializeRecaptcha tenha sido chamado
      if (!recaptchaVerifierGlobal) {
        throw new Error("reCAPTCHA não inicializado. Chame firebaseAuth.initializeRecaptcha() primeiro.");
      }

      const confirmationResult = await firebase.auth().signInWithPhoneNumber(normalizedPhone, recaptchaVerifierGlobal);
      confirmationResultGlobal = confirmationResult; // Armazena globalmente para `verifyPhoneNumber`

      // Armazena dados temporários do usuário para uso após a verificação OTP
      tempRegistrationDataGlobal = {
        name,
        municipio,
        bairro,
        phoneNumber: normalizedPhone,
      };
      // Opcional: armazenar o número pendente no localStorage para cenários de recarga de página
      localStorage.setItem('pendingVerificationPhoneNumber', normalizedPhone);

      return confirmationResult;
    } catch (error) {
      console.error("Erro ao iniciar registro por telefone:", error);
      let errorMessage = "Erro ao iniciar registro por telefone.";
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Verifica o número de telefone com o código OTP fornecido.
   * Assume que `confirmationResultGlobal` e `tempRegistrationDataGlobal` foram definidos
   * por uma chamada anterior a `initiatePhoneRegistration`.
   * @param {string} code - O código OTP de 6 dígitos.
   * @returns {Promise<object>} - Objeto com o user.
   * @throws {Error} - Erro específico do Firebase ou de validação.
   */
  async verifyPhoneNumber(code) {
    if (!confirmationResultGlobal) {
      throw new Error("Nenhuma verificação de telefone pendente. Inicie o processo de registro novamente.");
    }
    if (!code || code.length !== 6) {
      throw new Error("Por favor, insira um código OTP de 6 dígitos válido.");
    }

    try {
      const userCredential = await confirmationResultGlobal.confirm(code);
      const userData = tempRegistrationDataGlobal;

      if (!userData) {
        throw new Error("Dados de registro temporários não encontrados. Por favor, tente novamente o registro de telefone.");
      }

      // Salva dados no Firestore após a verificação bem-sucedida
      // Certifique-se de que `firebase.firestore()` esteja disponível (SDK do Firestore carregado)
      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        name: userData.name,
        phoneNumber: userCredential.user.phoneNumber, // O número de telefone será preenchido pelo Firebase Auth após a verificação
        municipio: userData.municipio,
        bairro: userData.bairro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        notificationPreferences: {
          email: userCredential.user.email ? true : false,
          phone: true,
        },
      }, { merge: true }); // Usa merge: true para atualizar ou criar o documento

      await userCredential.user.updateProfile({ displayName: userData.name });

      // Limpa dados temporários e referências globais após o sucesso
      confirmationResultGlobal = null;
      tempRegistrationDataGlobal = null;
      localStorage.removeItem('pendingVerificationPhoneNumber');

      return {
        user: userCredential.user,
      };
    } catch (error) {
      console.error("Erro ao verificar telefone:", error);
      let errorMessage = "Erro ao verificar código. Por favor, tente novamente.";
      if (error.code === 'auth/invalid-verification-code') {
          errorMessage = "Código de verificação inválido.";
      } else if (error.code === 'auth/code-expired') {
          errorMessage = "O código expirou. Por favor, reenvie.";
      } else if (error.code === 'auth/missing-verification-code') {
          errorMessage = "Código de verificação ausente.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Realiza o logout do usuário autenticado.
   * @throws {Error} - Erro específico do Firebase.
   */
  async signOutUser() {
    try {
      await firebase.auth().signOut();
      return true;
    } catch (error) {
      console.error("Erro ao sair:", error);
      throw new Error("Erro ao desconectar. Por favor, tente novamente.");
    }
  },

  /**
   * Realiza o login anônimo (como visitante).
   * @returns {Promise<object>} - Objeto com o user.
   * @throws {Error} - Erro específico do Firebase.
   */
  async signInAnonymouslyUser() {
    try {
      const userCredential = await firebase.auth().signInAnonymously();
      return { user: userCredential.user };
    } catch (error) {
      console.error("Erro ao entrar como visitante:", error);
      throw new Error("Erro ao entrar como visitante. Por favor, tente novamente.");
    }
  },

  /**
   * Configura um ouvinte para alterações no estado de autenticação do Firebase.
   * Use isto para manter o status do usuário logado/visitante em sua UI.
   * @param {function(firebase.User|null)} callback - Função a ser chamada quando o estado de autenticação muda.
   * Recebe o objeto `user` (ou `null` se deslogado).
   */
  onAuthStateChangedListener(callback) {
    if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.auth().onAuthStateChanged === 'undefined') {
        console.error("Firebase Auth SDK não carregado. Não é possível registrar o ouvinte. Certifique-se de que o CDN do Firebase Auth está incluído.");
        return; // Não pode registrar o ouvinte sem o SDK
    }
    firebase.auth().onAuthStateChanged(callback);
  }
};

// Torna o objeto firebaseAuth disponível globalmente (como solicitado)
window.firebaseAuth = firebaseAuth;