// js/firebaseAuth.js
// IMPORTANTE: Este módulo assume que os SDKs do Firebase (firebase-app, firebase-auth, firebase-firestore)
// já foram carregados no seu HTML ANTES deste script.
// Exemplo no HTML:
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
// <script src="js/firebaseAuth.js"></script>

// A configuração e inicialização do Firebase App devem ocorrer uma única vez
// em um script principal antes de usar este módulo.
// Exemplo no seu HTML:
/*
const firebaseConfig = {
  apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJPB5xFFCbcf4UQw",
  authDomain: "facilita-479b3.firebaseapp.com",
  projectId: "facilita-479b3",
  storageBucket: "facilita-479b3.appspot.com",
  messagingSenderId: "385676676886",
  appId: "1:385676676886:web:6976de7f3abc6c0da94a37"
};

let firebaseApp;
if (!firebase.apps.length) {
  firebaseApp = firebase.initializeApp(firebaseConfig);
} else {
  firebaseApp = firebase.app();
}

// As instâncias de auth e db serão obtidas dentro das funções
// para garantir que `firebaseApp` esteja disponível.
*/

const firebaseAuth = {

  /**
   * Inicializa o reCAPTCHA para o fluxo de autenticação por telefone.
   * Geralmente é um reCAPTCHA invisível que é acionado por uma ação do utilizador.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {string} containerId - O ID do elemento DOM onde o reCAPTCHA será anexado (pode ser invisível).
   * @returns {Promise<firebase.auth.RecaptchaVerifier>} Uma promessa que resolve com a instância do RecaptchaVerifier.
   */
  initRecaptcha: async (firebaseApp, containerId) => {
    const auth = firebaseApp.auth();
    // Resetar o reCAPTCHA existente para evitar erros ou duplicações
    if (window.recaptchaVerifier && typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
      grecaptcha.reset(window.recaptchaWidgetId || containerId);
      console.log('reCAPTCHA existente resetado.');
    }

    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      'size': 'invisible', // Torna o reCAPTCHA invisível para o utilizador
      'callback': (response) => {
        // Callback para quando o reCAPTCHA é resolvido.
        console.log("reCAPTCHA resolvido com sucesso!");
      },
      'expired-callback': () => {
        // Callback para quando o reCAPTCHA expira.
        console.warn("reCAPTCHA expirou. Por favor, tente novamente.");
      }
    });

    try {
      // Renderiza o reCAPTCHA e armazena o ID do widget globalmente
      const widgetId = await window.recaptchaVerifier.render();
      window.recaptchaWidgetId = widgetId;
      console.log("reCAPTCHA renderizado com ID do widget:", widgetId);
      return window.recaptchaVerifier;
    } catch (error) {
      console.error("Erro ao renderizar reCAPTCHA:", error);
      throw error;
    }
  },

  /**
   * Envia um código de verificação SMS para o número de telefone fornecido.
   * Requer que o reCAPTCHA seja acionado e resolvido antes ou durante esta chamada.
   * @param {string} phoneNumber - O número de telefone no formato E.164 (ex: +244XXXXXXXXX).
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {string} recaptchaContainerId - O ID do elemento DOM para o reCAPTCHA.
   * @returns {Promise<firebase.auth.ConfirmationResult>} Uma promessa que resolve com o objeto ConfirmationResult
   * necessário para confirmar o código.
   */
  async sendVerificationCode(phoneNumber, firebaseApp, recaptchaContainerId) {
    const auth = firebaseApp.auth();
    try {
      // Inicializa o reCAPTCHA e obtém o verificador. O `await` é crucial aqui.
      const appVerifier = await this.initRecaptcha(firebaseApp, recaptchaContainerId);

      // Força a execução do reCAPTCHA. Para reCAPTCHA invisível, isso é necessário.
      await appVerifier.verify();

      // Envia o código de verificação SMS
      const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
      
      // Armazenamos o resultado da confirmação na janela global para que a página
      // de verificação de telefone possa acessá-lo e confirmar o código.
      window.confirmationResult = confirmationResult;
      console.log(`Código de verificação enviado para ${phoneNumber}`);
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      // Em caso de erro, resetar o reCAPTCHA para permitir uma nova tentativa limpa.
      if (window.recaptchaWidgetId && typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
        grecaptcha.reset(window.recaptchaWidgetId);
      }
      throw error;
    }
  },

  /**
   * Regista um novo utilizador no Firebase Authentication (Email/Senha ou Telefone)
   * e armazena os dados adicionais no Firestore.
   * @param {string} name - Nome completo do utilizador.
   * @param {string} emailOrPhone - Email ou número de telefone no formato E.164.
   * @param {string} password - Senha do utilizador (obrigatória para Email, pode ser opcional para Telefone se gerida separadamente).
   * @param {string} municipio - Município do utilizador.
   * @param {string} bairro - Bairro do utilizador.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {string} [recaptchaContainerId] - ID do container do reCAPTCHA (necessário para autenticação por telefone).
   * @returns {Promise<firebase.User|Object>} Uma promessa que resolve com o objeto User em caso de sucesso (Email),
   * ou um objeto `{ requiresPhoneVerification: true }` (Telefone),
   * ou rejeita com um erro.
   */
  async registerUser(name, emailOrPhone, password, municipio, bairro, firebaseApp, recaptchaContainerId) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();

    const isEmail = emailOrPhone.includes('@');
    const isPhone = /^\+244\d{9}$/.test(emailOrPhone);

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone no formato +244XXXXXXXXX.");
    }

    try {
      let user;

      if (isEmail) {
        const userCredential = await auth.createUserWithEmailAndPassword(emailOrPhone, password);
        user = userCredential.user;

        // Salvar dados no Firestore para utilizadores de email
        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          name: name,
          email: emailOrPhone,
          municipio: municipio,
          bairro: bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: { email: true, phone: false }
        });
        console.log('Utilizador registado com email e dados salvos no Firestore:', user.uid);
        return user; // Retorna o objeto User completo
      } else { // isPhone
        // Para registo por telefone, primeiro enviamos o código. A verificação
        // e salvamento no Firestore ocorrerão na tela 'verify-phone.html'.
        
        // Armazenar temporariamente os dados para a próxima tela
        localStorage.setItem('pendingVerificationPhoneNumber', emailOrPhone);
        localStorage.setItem('userTempName', name);
        localStorage.setItem('userTempMunicipio', municipio);
        localStorage.setItem('userTempBairro', bairro);
        localStorage.setItem('userTempPassword', password); // Opcional, dependendo da sua necessidade

        // Envia o código de verificação. O `confirmationResult` é armazenado globalmente
        // e será usado na `verify-phone.html`.
        await this.sendVerificationCode(emailOrPhone, firebaseApp, recaptchaContainerId);
        
        // Indica que a verificação por telefone é necessária
        return { requiresPhoneVerification: true }; 
      }
    } catch (error) {
      console.error("Erro no registo de utilizador:", error);
      throw error;
    }
  },

  /**
   * Realiza o login de um utilizador (Email/Senha ou Telefone).
   * @param {string} credential - Email ou número de telefone.
   * @param {string} password - Senha (obrigatória para Email/Senha).
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {string} [recaptchaContainerId] - ID do container do reCAPTCHA (necessário para autenticação por telefone).
   * @returns {Promise<firebase.User|Object>} Uma promessa que resolve com o objeto User em caso de sucesso (Email/Senha),
   * ou um objeto `{ requiresPhoneVerification: true }` (Telefone),
   * ou rejeita com um erro.
   */
  async loginUser(credential, password, firebaseApp, recaptchaContainerId) {
    const auth = firebaseApp.auth();

    const isEmail = credential.includes('@');
    const isPhone = /^\+244\d{9}$/.test(credential);

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone no formato +244XXXXXXXXX.");
    }

    try {
      let user;

      if (isEmail) {
        const userCredential = await auth.signInWithEmailAndPassword(credential, password);
        user = userCredential.user;
        console.log('Login com email realizado:', user.uid);
        return user;
      } else { // isPhone
        // Para login por telefone, primeiro enviamos o código.
        // A confirmação e login final ocorrerão na tela 'verify-phone.html'.
        
        // Armazenar temporariamente o número de telefone
        localStorage.setItem('pendingVerificationPhoneNumber', credential);

        // Envia o código de verificação. O `confirmationResult` é armazenado globalmente.
        await this.sendVerificationCode(credential, firebaseApp, recaptchaContainerId);
        
        // Indica que a verificação por telefone é necessária
        return { requiresPhoneVerification: true };
      }
    } catch (error) {
      console.error("Erro ao fazer login de utilizador:", error);
      throw error;
    }
  },

  /**
   * Realiza o login de um utilizador com a conta Google.
   * Solicita município e bairro se for o primeiro login do utilizador.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @returns {Promise<firebase.User>} Uma promessa que resolve com o objeto User do Firebase autenticado.
   */
  async loginWithGoogle(firebaseApp) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    try {
      const userCredential = await auth.signInWithPopup(googleProvider);
      const user = userCredential.user;

      // Verificar se o utilizador já existe no Firestore na coleção 'users' (consistente)
      const userDocRef = db.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        // Se for o primeiro login com Google, pedir município e bairro
        // IMPORTANTE: Em produção, use um modal ou tela de "Completar Perfil"
        // para uma melhor experiência do utilizador em vez de prompts.
        let municipio = prompt("Para personalizar sua experiência, por favor, digite seu município (Ex: Luanda):");
        let bairro = prompt("E agora, digite o nome do seu bairro (Ex: Morro Bento):");

        await userDocRef.set({
          uid: user.uid,
          name: user.displayName || 'Utilizador Google',
          email: user.email,
          municipio: municipio || "Não informado", // Adicione validação na UI
          bairro: bairro || "Não informado",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: {
            email: true, // Habilita email por padrão para logins Google
            phone: false
          }
        });
        console.log('Novo utilizador Google registado e dados salvos no Firestore.');
      } else {
        console.log('Utilizador Google já existente, carregando perfil.');
      }

      console.log('Login com Google realizado:', user.uid);
      return user;
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      throw error;
    }
  },

  /**
   * Envia um email de redefinição de senha.
   * @param {string} email - O email para o qual enviar o link de redefinição.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @returns {Promise<void>} Uma promessa que resolve em sucesso ou rejeita em erro.
   */
  async resetPassword(email, firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      await auth.sendPasswordResetEmail(email);
      console.log('Email de redefinição de senha enviado para:', email);
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      throw error;
    }
  },

  /**
   * Desconecta o utilizador atual.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @returns {Promise<void>} Uma promessa que resolve em sucesso ou rejeita em erro.
   */
  async logout(firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      await auth.signOut();
      console.log('Utilizador desconectado.');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  },

  /**
   * Obtém os dados de perfil de um utilizador do Firestore.
   * @param {string} uid - O User ID (UID) do utilizador.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @returns {Promise<Object|null>} Uma promessa que resolve com os dados do utilizador ou null se não for encontrado.
   */
  async getUserData(uid, firebaseApp) {
    const db = firebaseApp.firestore();
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        return doc.data();
      } else {
        console.log("Nenhum documento de utilizador encontrado para o UID:", uid);
        return null;
      }
    } catch (error) {
      console.error("Erro ao obter dados do utilizador:", error);
      throw error;
    }
  },

  /**
   * Atualiza os dados de perfil de um utilizador no Firestore.
   * @param {string} uid - O User ID (UID) do utilizador.
   * @param {Object} data - Os dados a serem atualizados (parcialmente).
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @returns {Promise<void>} Uma promessa que resolve em sucesso ou rejeita em erro.
   */
  async updateUserData(uid, data, firebaseApp) {
    const db = firebaseApp.firestore();
    try {
      await db.collection('users').doc(uid).update(data);
      console.log('Dados do utilizador atualizados com sucesso para o UID:', uid);
    } catch (error) {
      console.error("Erro ao atualizar dados do utilizador:", error);
      throw error;
    }
  },

  /**
   * Observador de estado de autenticação do Firebase.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {function(firebase.User|null): void} callback - Função a ser chamada quando o estado de autenticação muda.
   * @returns {firebase.Unsubscribe} Uma função para cancelar o observador.
   */
  onAuthStateChanged: (firebaseApp, callback) => {
    const auth = firebaseApp.auth();
    return auth.onAuthStateChanged(callback);
  }
};
