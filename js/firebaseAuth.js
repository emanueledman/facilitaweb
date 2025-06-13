// js/firebaseAuth.js

const firebaseAuth = {

  async sendVerificationCode(phoneNumber, firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      // É crucial que window.recaptchaVerifier tenha sido inicializado e renderizado
      // na página HTML (no DOMContentLoaded) para que esta função funcione sem o erro 'n is undefined'.
      if (!window.recaptchaVerifier) {
        // Se, por alguma razão, o recaptchaVerifier não estiver pronto, lançamos um erro claro.
        // Isto ajuda a depurar se a inicialização no HTML falhar.
        throw new Error("RecaptchaVerifier não está inicializado para o Phone Auth. Verifique a configuração na página.");
      }
      
      // O Firebase auth espera um 'applicationVerifier' para o signInWithPhoneNumber.
      // Em cenários de reCAPTCHA invisível, este é o window.recaptchaVerifier que é globalmente acessível.
      const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
      
      // Armazenamos o resultado da confirmação na janela global para que a página
      // de verificação de telefone (verify-phone.html) possa acedê-lo e confirmar o código.
      window.confirmationResult = confirmationResult;
      console.log(`Código de verificação enviado para ${phoneNumber}`);
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      // Se houver um erro durante o envio, é uma boa prática tentar reiniciar o reCAPTCHA
      // para permitir uma nova tentativa limpa.
      if (window.recaptchaWidgetId && typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
        grecaptcha.reset(window.recaptchaWidgetId);
        console.warn("reCAPTCHA resetado após erro no envio do código de verificação.");
      }
      throw error;
    }
  },

  async registerUser(name, emailOrPhone, password, municipio, bairro, firebaseApp) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();

    const isEmail = emailOrPhone.includes('@');
    // Regex para validar número de telefone angolano: +244 seguido de 9 dígitos, começando com 9.
    const isPhone = /^\+244(9[1-6]{1}|99)\d{7}$/.test(emailOrPhone); 

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone angolano válido (+2449XXXXXXXX).");
    }

    try {
      let user;

      if (isEmail) {
        // Se for email, cria o utilizador com email e senha.
        const userCredential = await auth.createUserWithEmailAndPassword(emailOrPhone, password);
        user = userCredential.user;

        // Salva os dados adicionais do utilizador no Firestore.
        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          name: name,
          email: emailOrPhone,
          municipio: municipio,
          bairro: bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Marca a data de criação
          notificationPreferences: { email: true, phone: false } // Preferências de notificação padrão
        });
        console.log('Utilizador registado com email e dados salvos no Firestore:', user.uid);
        return user; // Retorna o objeto User completo do Firebase.
      } else { // Se for telefone
        // Para registo por telefone, o processo envolve duas etapas: enviar código e verificar.
        // Armazenamos temporariamente os dados do utilizador na localStorage.
        // Estes dados serão usados na página de verificação (verify-phone.html) após o SMS ser confirmado.
        localStorage.setItem('pendingVerificationPhoneNumber', emailOrPhone);
        localStorage.setItem('userTempName', name);
        localStorage.setItem('userTempMunicipio', municipio);
        localStorage.setItem('userTempBairro', bairro);
        localStorage.setItem('userTempPassword', password); // Guardar a senha é opcional/depende da sua lógica de negócio para utilizadores de telefone

        // Envia o código de verificação SMS para o número de telefone.
        // A função `sendVerificationCode` lida com o reCAPTCHA.
        await this.sendVerificationCode(emailOrPhone, firebaseApp);
        
        // Retorna um indicador de que a verificação por telefone é necessária.
        return { requiresPhoneVerification: true }; 
      }
    } catch (error) {
      console.error("Erro no registo de utilizador:", error);
      throw error; // Propaga o erro para ser tratado na UI.
    }
  },

  async loginUser(credential, password, firebaseApp) {
    const auth = firebaseApp.auth();

    const isEmail = credential.includes('@');
    const isPhone = /^\+244(9[1-6]{1}|99)\d{7}$/.test(credential);

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone angolano válido (+2449XXXXXXXX).");
    }

    try {
      let user;

      if (isEmail) {
        // Se for email, tenta fazer login com email e senha.
        const userCredential = await auth.signInWithEmailAndPassword(credential, password);
        user = userCredential.user;
        console.log('Login com email realizado:', user.uid);
        return user;
      } else { // Se for telefone
        // Para login por telefone, também precisamos enviar um código de verificação.
        // Armazenamos temporariamente o número de telefone.
        localStorage.setItem('pendingVerificationPhoneNumber', credential);

        // Envia o código de verificação SMS.
        await this.sendVerificationCode(credential, firebaseApp);
        
        // Indica que a verificação por telefone é necessária para completar o login.
        return { requiresPhoneVerification: true };
      }
    } catch (error) {
      console.error("Erro ao fazer login de utilizador:", error);
      throw error; // Propaga o erro para ser tratado na UI.
    }
  },

  /**
   * Realiza o login de um utilizador com a conta Google.
   * Se for o primeiro login do utilizador, solicita município e bairro
   * e guarda no Firestore.
   */
  async loginWithGoogle(firebaseApp) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    try {
      const userCredential = await auth.signInWithPopup(googleProvider);
      const user = userCredential.user;

      // Verifica se o utilizador já tem um documento de perfil no Firestore.
      const userDocRef = db.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        // Se for o primeiro login com Google para este UID, pede dados adicionais.
        // Em um projeto real, isto seria um modal ou uma página de "Completar Perfil".
        let municipio = prompt("Para personalizar sua experiência, por favor, digite seu município (Ex: Luanda):");
        let bairro = prompt("E agora, digite o nome do seu bairro (Ex: Morro Bento):");

        // Guarda os dados no Firestore.
        await userDocRef.set({
          uid: user.uid,
          name: user.displayName || 'Utilizador Google', // Usa o nome do Google ou um padrão
          email: user.email,
          municipio: municipio || "Não informado", // Adicione validação na UI para garantir que não seja "Não informado"
          bairro: bairro || "Não informado",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: {
            email: true, // Por padrão, email ativado para logins Google
            phone: false
          }
        });
        console.log('Novo utilizador Google registado e dados salvos no Firestore.');
      } else {
        console.log('Utilizador Google já existente, carregando perfil.');
      }

      console.log('Login com Google realizado:', user.uid);
      return user; // Retorna o objeto User do Firebase.
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      throw error; // Propaga o erro.
    }
  },

  /**
   * Envia um email de redefinição de senha para o email fornecido.
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
   * Desconecta o utilizador atual do Firebase Authentication.
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
   * Assumimos que o UID do utilizador corresponde ao ID do documento na coleção 'users'.
   */
  async getUserData(uid, firebaseApp) {
    const db = firebaseApp.firestore();
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        return doc.data(); // Retorna os dados do documento.
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
   * Permite atualizar apenas alguns campos do documento (parcialmente).
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
   * Esta função é essencial para a gestão do estado de login na aplicação,
   * pois permite que outros scripts reajam automaticamente quando o utilizador
   * faz login, logout ou muda de estado de autenticação.
   * @param {Object} firebaseApp - A instância do Firebase App.
   * @param {function(firebase.User|null): void} callback - Função a ser chamada quando o estado de autenticação muda.
   * Recebe o objeto User (se logado) ou null (se desconectado).
   * @returns {firebase.Unsubscribe} Uma função para cancelar o observador (para evitar fugas de memória).
   */
  onAuthStateChanged: (firebaseApp, callback) => {
    const auth = firebaseApp.auth();
    return auth.onAuthStateChanged(callback);
  }
};