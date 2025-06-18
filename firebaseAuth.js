// firebaseAuth.js

/**
 * @fileoverview Este arquivo contém um objeto com funções utilitárias
 * para autenticação de utilizadores usando Firebase Authentication.
 * Inclui métodos para inicialização, validação de campos,
 * registo, login por email/senha e telefone, e login com Google.
 */

// A configuração do seu projeto Firebase.
// Substitua estes valores pelos dados reais do seu projeto.
const firebaseConfig = {
    apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJPB5xFFCbcf4UQw",
    authDomain: "facilita-479b3.firebaseapp.com",
    projectId: "facilita-479b3",
    storageBucket: "facilita-479b3.appspot.com",
    messagingSenderId: "385676676886",
    appId: "1:385676676886:web:6976de7f3abc6c0da94a37"
};

// Variáveis globais para as instâncias do Firebase
let app;
let auth;
let firestore; // Para interagir com o Firestore, se necessário (ex: guardar dados de utilizador após registo)
let recaptchaVerifierInstance; // Para a autenticação por telefone

/**
 * Objeto firebaseAuth que contém todas as funções relacionadas à autenticação.
 * @namespace firebaseAuth
 */
const firebaseAuth = {

    /**
     * Inicializa a aplicação Firebase. Deve ser chamada uma vez no início da aplicação.
     * @param {object} config - O objeto de configuração do Firebase.
     * @returns {firebase.app.App} A instância da aplicação Firebase.
     * @throws {Error} Se o SDK do Firebase não estiver carregado.
     */
    initializeFirebaseApp(config) {
        if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
            console.error("Firebase SDK não carregado. Verifique os scripts CDN.");
            throw new Error("Firebase SDK não carregado. Verifique os scripts CDN.");
        }
        if (!firebase.apps.length) {
            app = firebase.initializeApp(config);
        } else {
            app = firebase.app();
        }
        auth = firebase.auth();
        firestore = firebase.firestore(); // Inicializa o Firestore
        console.log("Firebase App, Auth e Firestore inicializados.");
        return app;
    },

    /**
     * Inicializa o reCAPTCHA Verifier para autenticação por telefone.
     * @param {string} containerId - O ID do elemento DOM onde o reCAPTCHA será renderizado (pode ser invisível).
     * @returns {Promise<void>} Uma promessa que resolve quando o reCAPTCHA é renderizado.
     * @throws {Error} Se o SDK do Firebase Auth não estiver carregado ou se houver erro na renderização.
     */
    async initializeRecaptcha(containerId) {
        if (typeof auth === 'undefined') {
            console.error("Firebase Auth SDK não carregado. Impossível inicializar reCAPTCHA.");
            throw new Error("Firebase Auth SDK não carregado.");
        }

        recaptchaVerifierInstance = new firebase.auth.RecaptchaVerifier(containerId, {
            'size': 'invisible', // Pode ser 'normal' para um widget visível
            'callback': (response) => {
                // reCAPTCHA resolvido, pode-se prosseguir com o signInWithPhoneNumber
                console.log("reCAPTCHA resolvido!");
            },
            'expired-callback': () => {
                // reCAPTCHA expirou, o utilizador pode precisar resolver novamente
                console.warn('Verificação de segurança reCAPTCHA expirada.');
                // Uma boa prática seria notificar o utilizador e possivelmente rearmar o fluxo.
            }
        }, auth);

        await recaptchaVerifierInstance.render().then((widgetId) => {
            console.log('reCAPTCHA renderizado com ID:', widgetId);
        });
    },

    /**
     * Verifica o estado atual de autenticação do utilizador e redireciona.
     * @param {string|null} redirectIfLoggedIn - URL para redirecionar se o utilizador estiver logado.
     * @param {string|null} redirectIfNotLoggedIn - URL para redirecionar se o utilizador não estiver logado.
     */
    checkAuthState(redirectIfLoggedIn, redirectIfNotLoggedIn) {
        if (typeof auth === 'undefined') {
            console.error("Firebase Auth SDK não carregado para checkAuthState.");
            return;
        }
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Utilizador logado:", user.uid);
                if (redirectIfLoggedIn && window.location.pathname !== redirectIfLoggedIn) {
                    window.location.href = redirectIfLoggedIn;
                }
            } else {
                console.log("Nenhum utilizador logado.");
                if (redirectIfNotLoggedIn && window.location.pathname !== redirectIfNotLoggedIn) {
                    window.location.href = redirectIfNotLoggedIn;
                }
            }
        });
    },

    /**
     * Normaliza um número de telefone, removendo espaços.
     * @param {string} phone - O número de telefone a normalizar.
     * @returns {string} O número de telefone normalizado.
     */
    normalizePhoneNumber(phone) {
        return phone.replace(/\s/g, '');
    },

    /**
     * Valida o formato de um endereço de email.
     * @param {string} email - O endereço de email a validar.
     * @returns {string|null} Mensagem de erro se inválido, null se válido.
     */
    validateEmail(email) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!email || !emailRegex.test(email)) {
            return "O formato do email é inválido.";
        }
        return null;
    },

    /**
     * Valida o formato de um número de telefone angolano (+2449XXXXXXXX).
     * @param {string} phone - O número de telefone a validar.
     * @returns {string|null} Mensagem de erro se inválido, null se válido.
     */
    validatePhone(phone) {
        const normalizedPhone = this.normalizePhoneNumber(phone);
        const phoneRegex = /^\+2449[0-9]{8}$/; // Ex: +244912345678
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
            return "O número de telefone fornecido é inválido. Use o formato +2449XXXXXXXX.";
        }
        return null;
    },

    /**
     * Valida a complexidade da senha.
     * @param {string} password - A senha a validar.
     * @returns {string|null} Mensagem de erro se inválida, null se válida.
     */
    validatePassword(password) {
        if (!password) {
            return "A senha é obrigatória.";
        }
        if (password.length < 8) {
            return "A senha deve ter pelo menos 8 caracteres.";
        }
        // Adicione outras regras de complexidade aqui (ex: maiúsculas, minúsculas, números, símbolos)
        return null;
    },

    /**
     * Verifica se um número de telefone já está registado no Firestore.
     * Nota: Esta função apenas verifica na coleção 'users'. Se estiver a usar autenticação por telefone,
     * o Firebase Auth trata de utilizadores existentes automaticamente no signInWithPhoneNumber.
     * @param {string} phoneNumber - O número de telefone a verificar.
     * @returns {Promise<object|null>} Um objeto com uid e dados do utilizador se encontrado, null caso contrário.
     * @throws {Error} Se ocorrer um erro ao verificar o número.
     */
    async checkPhoneNumberExists(phoneNumber) {
        try {
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
            const querySnapshot = await firestore.collection('users')
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
            console.error("Erro ao verificar número de telefone no Firestore:", error);
            throw new Error("Erro ao verificar número de telefone.");
        }
    },

    /**
     * Realiza o login do utilizador com email e senha.
     * @param {string} email - O email do utilizador.
     * @param {string} password - A senha do utilizador.
     * @returns {Promise<object>} Um objeto contendo o utilizador e um flag de verificação de email.
     * @throws {Error} Se ocorrer um erro durante o login ou validação.
     */
    async loginWithEmail(email, password) {
        const emailValidation = this.validateEmail(email);
        if (emailValidation) { throw new Error(emailValidation); }
        const passwordValidation = this.validatePassword(password);
        if (passwordValidation) { throw new Error(passwordValidation); }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
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
                    errorMessage = "Este utilizador foi desabilitado.";
                    break;
                case 'auth/user-not-found':
                    errorMessage = "Utilizador não encontrado. Crie uma conta.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Senha incorreta.";
                    break;
                case 'auth/network-request-failed':
                    errorMessage = "Problema de conexão. Verifique a sua internet.";
                    break;
                default:
                    errorMessage = "Erro desconhecido. Tente novamente.";
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Realiza o login do utilizador com uma conta Google.
     * @returns {Promise<object>} Um objeto contendo o utilizador.
     * @throws {Error} Se ocorrer um erro durante o login com Google.
     */
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider); // Ou signInWithRedirect(provider)
            // Se precisar guardar dados adicionais do utilizador Google no Firestore:
            // const userRef = firestore.collection('users').doc(result.user.uid);
            // await userRef.set({
            //     name: result.user.displayName,
            //     email: result.user.email,
            //     photoURL: result.user.photoURL,
            //     createdAt: firebase.firestore.FieldValue.serverTimestamp()
            // }, { merge: true }); // Use merge: true para não sobrescrever dados existentes

            return { user: result.user };
        } catch (error) {
            console.error("Erro no login com Google:", error);
            let errorMessage = "Erro ao fazer login com Google.";
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                errorMessage = "Login com Google cancelado.";
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = "Já existe uma conta com este email. Faça login com outro método.";
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Envia um email de redefinição de senha para o email fornecido.
     * @param {string} email - O email do utilizador.
     * @returns {Promise<boolean>} True se o email for enviado com sucesso.
     * @throws {Error} Se ocorrer um erro ao redefinir a senha.
     */
    async resetPassword(email) {
        const emailValidation = this.validateEmail(email);
        if (emailValidation) { throw new Error(emailValidation); }

        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            console.error("Erro ao redefinir senha:", error);
            let errorMessage = "Erro ao redefinir senha.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Nenhum utilizador encontrado com este email.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Email inválido para redefinição de senha.";
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Regista um novo utilizador com email e senha, atualiza o perfil e envia email de verificação.
     * Também guarda dados adicionais no Firestore.
     * @param {string} name - Nome do utilizador.
     * @param {string} email - Email do utilizador.
     * @param {string} password - Senha do utilizador.
     * @param {string} municipio - Município do utilizador.
     * @param {string} bairro - Bairro do utilizador.
     * @returns {Promise<object>} Um objeto contendo o utilizador e um flag de verificação de email.
     * @throws {Error} Se ocorrer um erro durante o registo ou validação.
     */
    async registerUserWithEmail(name, email, password, municipio, bairro) {
        const emailValidation = this.validateEmail(email);
        if (emailValidation) { throw new Error(emailValidation); }
        const passwordValidation = this.validatePassword(password);
        if (passwordValidation) { throw new Error(passwordValidation); }
        if (!name || !municipio || !bairro) {
            throw new Error("Por favor, preencha todos os campos: Nome, Município e Bairro.");
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            await userCredential.user.sendEmailVerification();

            await firestore.collection('users').doc(userCredential.user.uid).set({
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
            console.error("Erro ao registar utilizador com email:", error);
            let errorMessage = "Erro ao registar utilizador.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este email já está registado.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "A senha é muito fraca.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "O formato do email é inválido.";
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Inicia o processo de autenticação/registo por telefone enviando um código SMS.
     * Requer que o reCAPTCHA Verifier tenha sido inicializado.
     * @param {string} phoneNumber - O número de telefone completo (ex: +2449XXXXXXXX).
     * @returns {Promise<firebase.auth.ConfirmationResult>} O objeto ConfirmationResult para verificação posterior.
     * @throws {Error} Se ocorrer um erro durante o envio do código ou validação.
     */
    async sendPhoneVerificationCode(phoneNumber) {
        const phoneValidation = this.validatePhone(phoneNumber);
        if (phoneValidation) { throw new Error(phoneValidation); }
        if (!recaptchaVerifierInstance) {
            throw new Error("reCAPTCHA Verifier não inicializado. Chame initializeRecaptcha primeiro.");
        }

        try {
            const confirmation = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifierInstance);
            // Redefine o reCAPTCHA após cada envio para garantir que esteja pronto para a próxima vez
            if (recaptchaVerifierInstance && recaptchaVerifierInstance.reset) {
                recaptchaVerifierInstance.reset();
            }
            return confirmation;
        } catch (error) {
            console.error("Erro ao enviar código de verificação por telefone:", error);
            let errorMessage = "Erro ao enviar código de verificação. Tente novamente.";
            if (error.code === 'auth/invalid-phone-number') {
                errorMessage = 'Número de telefone inválido.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Bloqueado por muitas tentativas. Tente mais tarde.';
            } else if (error.code === 'auth/captcha-check-failed') {
                errorMessage = 'Falha na verificação de segurança. Tente novamente.';
                // Se falhou no reCAPTCHA, rearmar para o utilizador tentar novamente
                if (recaptchaVerifierInstance && recaptchaVerifierInstance.reset) {
                    recaptchaVerifierInstance.reset();
                }
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Verifica o código SMS recebido e completa a autenticação por telefone.
     * @param {firebase.auth.ConfirmationResult} confirmationResult - O objeto de resultado da confirmação retornado por sendPhoneVerificationCode.
     * @param {string} verificationCode - O código de 6 dígitos inserido pelo utilizador.
     * @returns {Promise<firebase.User>} O objeto User do Firebase.
     * @throws {Error} Se o código for inválido ou ocorrer um erro na confirmação.
     */
    async verifyPhoneNumberCode(confirmationResult, verificationCode) {
        if (!confirmationResult) {
            throw new Error('Nenhum resultado de confirmação disponível. Envie o código primeiro.');
        }
        if (!verificationCode || verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
            throw new Error('O código de verificação deve ter 6 dígitos numéricos.');
        }

        try {
            const userCredential = await confirmationResult.confirm(verificationCode);
            return userCredential.user;
        } catch (error) {
            console.error("Erro ao verificar código de telefone:", error);
            let errorMessage = "Erro ao verificar código. Tente novamente.";
            if (error.code === 'auth/invalid-verification-code') {
                errorMessage = 'Código de verificação inválido.';
            } else if (error.code === 'auth/code-expired') {
                errorMessage = 'Código expirado. Reenvie um novo.';
            }
            throw new Error(errorMessage);
        }
    },

    /**
     * Regista um novo utilizador que se autenticou via telefone (se for um novo utilizador Firebase Auth).
     * Esta função é destinada a ser chamada *após* a verificação bem-sucedida do telefone.
     * Ela guarda os dados adicionais do utilizador no Firestore.
     * @param {firebase.User} user - O objeto User retornado após a autenticação por telefone.
     * @param {string} name - Nome do utilizador.
     * @param {string} phoneNumber - Número de telefone do utilizador.
     * @param {string} municipio - Município do utilizador.
     * @param {string} bairro - Bairro do utilizador.
     * @returns {Promise<void>} Uma promessa que resolve quando os dados são guardados.
     * @throws {Error} Se o utilizador não for fornecido ou ocorrer um erro no Firestore.
     */
    async registerUserPhoneNumberData(user, name, phoneNumber, municipio, bairro) {
        if (!user || !user.uid) {
            throw new Error("Utilizador não fornecido para guardar dados.");
        }
        if (!name || !municipio || !bairro || !phoneNumber) {
            throw new Error("Por favor, preencha todos os dados necessários (nome, telefone, município, bairro).");
        }

        try {
            await firestore.collection('users').doc(user.uid).set({
                name,
                phoneNumber: this.normalizePhoneNumber(phoneNumber),
                municipio,
                bairro,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                notificationPreferences: {
                    email: false,
                    phone: true,
                }
            }, { merge: true }); // Usar merge: true é importante para não apagar dados existentes se o utilizador já tiver um doc.
            console.log("Dados do utilizador de telefone guardados no Firestore.");
        } catch (error) {
            console.error("Erro ao guardar dados do utilizador de telefone no Firestore:", error);
            throw new Error("Erro ao guardar dados do utilizador. Tente novamente.");
        }
    },

    /**
     * Desconecta o utilizador atual.
     * @returns {Promise<boolean>} True se o logout for bem-sucedido.
     * @throws {Error} Se ocorrer um erro durante o logout.
     */
    async signOutUser() {
        try {
            await auth.signOut();
            return true;
        } catch (error) {
            console.error("Erro ao sair:", error);
            throw new Error("Erro ao desconectar.");
        }
    },

    /**
     * Adiciona um listener para mudanças no estado de autenticação.
     * @param {function(firebase.User|null): void} callback - A função de callback que recebe o utilizador.
     * @returns {function(): void} Uma função para cancelar o listener.
     */
    onAuthStateChangedListener(callback) {
        if (typeof auth === 'undefined') {
            console.error("Firebase Auth SDK não carregado para onAuthStateChangedListener.");
            return () => {}; // Retorna uma função vazia
        }
        return auth.onAuthStateChanged(callback);
    },

    /**
     * Retorna a instância do Firebase Auth.
     * @returns {firebase.auth.Auth} A instância do Auth.
     */
    getAuthInstance() {
        return auth;
    },

    /**
     * Retorna a instância do Firebase Firestore.
     * @returns {firebase.firestore.Firestore} A instância do Firestore.
     */
    getFirestoreInstance() {
        return firestore;
    },

    /**
     * Retorna a instância do reCAPTCHA Verifier.
     * @returns {firebase.auth.RecaptchaVerifier|null} A instância do reCAPTCHA Verifier.
     */
    getRecaptchaVerifier() {
        return recaptchaVerifierInstance;
    }
};

// Exporta o objeto firebaseAuth para o escopo global ou como módulo.
// Para uso com <script type="module">, pode-se usar `export default firebaseAuth;`
// Para uso com <script src="..."> (e sem type="module"), atribua a window:
if (typeof window !== 'undefined') {
    window.firebaseAuth = firebaseAuth;
    window.firebaseConfig = firebaseConfig; // Exporta também a configuração para acesso em outros scripts
}