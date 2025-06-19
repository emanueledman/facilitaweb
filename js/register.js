document.addEventListener('DOMContentLoaded', async () => {
    // Inicialize o Firebase App
    firebaseAuth.initializeFirebaseApp(window.firebaseConfig);

    // --- Elementos Comuns ---
    const registerFormCard = document.getElementById('register-form-card');
    const loginFormCard = document.getElementById('login-form-card');
    const resetPasswordCard = document.getElementById('reset-password-card');

    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');

    const registerMessage = document.getElementById('register-message');
    const loginMessage = document.getElementById('login-message');
    const resetPasswordMessage = document.getElementById('reset-password-message');

    let currentPhoneConfirmationResult = null; // Para armazenar o resultado do signInWithPhoneNumber

    // --- Funções para alternar entre formulários ---
    function showCard(cardToShow) {
        registerFormCard.classList.add('hidden');
        loginFormCard.classList.add('hidden');
        resetPasswordCard.classList.add('hidden');
        cardToShow.classList.remove('hidden');
    }

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCard(loginFormCard);
        // Garante que o estado inicial do login seja Email
        document.getElementById('login-email-radio').checked = true;
        document.getElementById('login-email-fields').classList.remove('hidden');
        document.getElementById('login-phone-request-fields').classList.add('hidden');
        document.getElementById('login-phone-verify-fields').classList.add('hidden');
        document.getElementById('main-login-button').style.display = 'block'; // Mostra o botão de login normal
        loginMessage.textContent = ''; // Limpa mensagens anteriores
    });

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCard(registerFormCard);
        registerMessage.textContent = ''; // Limpa mensagens anteriores
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCard(resetPasswordCard);
        resetPasswordMessage.textContent = ''; // Limpa mensagens anteriores
    });

    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCard(loginFormCard);
        loginMessage.textContent = ''; // Limpa mensagens anteriores
    });


    // --- Lógica do Formulário de CADASTRO (Unificado) ---
    const registerForm = document.getElementById('register-form');
    const regNameInput = document.getElementById('reg-name');
    const regPasswordInput = document.getElementById('reg-password');
    const regConfirmPasswordInput = document.getElementById('reg-confirm-password');
    const regMunicipioInput = document.getElementById('reg-municipio');
    const regBairroInput = document.getElementById('reg-bairro');
    const methodEmailRadio = document.getElementById('method-email');
    const methodPhoneRadio = document.getElementById('method-phone');
    const emailFields = document.getElementById('email-fields');
    const phoneFields = document.getElementById('phone-fields');
    const regEmailInput = document.getElementById('reg-email');
    const regPhoneInput = document.getElementById('reg-phone');

    // Lógica para alternar campos de email/telefone no cadastro
    methodEmailRadio.addEventListener('change', () => {
        emailFields.classList.remove('hidden');
        phoneFields.classList.add('hidden');
        regEmailInput.setAttribute('required', 'true');
        regPhoneInput.removeAttribute('required');
        regPhoneInput.value = ''; // Limpa o campo de telefone se mudar para email
    });

    methodPhoneRadio.addEventListener('change', () => {
        phoneFields.classList.remove('hidden');
        emailFields.classList.add('hidden');
        regPhoneInput.setAttribute('required', 'true');
        regEmailInput.removeAttribute('required');
        regEmailInput.value = ''; // Limpa o campo de email se mudar para telefone
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerMessage.textContent = '';
        registerMessage.className = 'message';

        const name = regNameInput.value;
        const password = regPasswordInput.value;
        const confirmPassword = regConfirmPasswordInput.value;
        const municipio = regMunicipioInput.value;
        const bairro = regBairroInput.value;
        const method = document.querySelector('input[name="reg-method"]:checked').value;

        let email = null;
        let phoneNumber = null;

        if (method === 'email') {
            email = regEmailInput.value;
        } else { // method === 'phone'
            phoneNumber = regPhoneInput.value;
        }

        // Preferência de notificação é a mesma do método de cadastro para simplificar
        const notificationPreference = (method === 'email') ? 'gmail' : 'whatsapp';

        if (password !== confirmPassword) {
            registerMessage.textContent = 'As senhas não coincidem.';
            registerMessage.classList.add('error');
            return;
        }

        try {
            const result = await firebaseAuth.registerUser({
                name,
                email,
                phoneNumber,
                password,
                municipio,
                bairro,
                method,
                notificationPreference
            });

            let successMessage = `Cadastro bem-sucedido! Bem-vindo, ${result.user.displayName || 'usuário'}!`;
            if (result.registrationMethod === 'email' && result.requiresEmailVerification) {
                successMessage += ' Por favor, verifique seu email para ativar sua conta.';
            } else if (result.registrationMethod === 'phone') {
                successMessage += ' Agora você pode fazer login usando seu número de telefone e senha.';
            }

            registerMessage.textContent = successMessage;
            registerMessage.classList.add('success');
            registerForm.reset();
            // Opcional: redirecionar para a tela de login após o cadastro
            setTimeout(() => showCard(loginFormCard), 3000);

        } catch (error) {
            console.error("Erro no cadastro:", error);
            registerMessage.textContent = `Erro: ${error.message}`;
            registerMessage.classList.add('error');
        }
    });

    // --- Lógica do Formulário de LOGIN ---
    const loginForm = document.getElementById('login-form');
    const loginEmailRadio = document.getElementById('login-email-radio');
    const loginPhoneRadio = document.getElementById('login-phone-radio');
    const loginEmailFields = document.getElementById('login-email-fields');
    const loginPhoneRequestFields = document.getElementById('login-phone-request-fields');
    const loginPhoneVerifyFields = document.getElementById('login-phone-verify-fields');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginPhoneInput = document.getElementById('login-phone');
    const verificationCodeInput = document.getElementById('verification-code');
    const requestCodeButton = document.getElementById('request-code-button');
    const verifyCodeButton = document.getElementById('verify-code-button');
    const mainLoginButton = document.getElementById('main-login-button');

    // Lógica para alternar campos de login (Email/Telefone)
    function updateLoginFields() {
        if (loginEmailRadio.checked) {
            loginEmailFields.classList.remove('hidden');
            loginPhoneRequestFields.classList.add('hidden');
            loginPhoneVerifyFields.classList.add('hidden');
            loginEmailInput.setAttribute('required', 'true');
            loginPasswordInput.setAttribute('required', 'true');
            loginPhoneInput.removeAttribute('required');
            verificationCodeInput.removeAttribute('required');
            mainLoginButton.style.display = 'block'; // Mostra o botão de login normal
            loginPhoneInput.value = ''; // Limpa campos de telefone
            verificationCodeInput.value = '';
            currentPhoneConfirmationResult = null; // Reseta o resultado da confirmação
        } else { // Telefone
            loginEmailFields.classList.add('hidden');
            loginPhoneRequestFields.classList.remove('hidden');
            loginPhoneVerifyFields.classList.add('hidden'); // Começa oculto
            loginPhoneInput.setAttribute('required', 'true');
            loginEmailInput.removeAttribute('required');
            loginPasswordInput.removeAttribute('required');
            verificationCodeInput.removeAttribute('required');
            mainLoginButton.style.display = 'none'; // Esconde o botão de login normal para login por telefone
            loginEmailInput.value = ''; // Limpa campos de email
            loginPasswordInput.value = '';
        }
        loginMessage.textContent = ''; // Limpa mensagem ao alternar
    }

    loginEmailRadio.addEventListener('change', updateLoginFields);
    loginPhoneRadio.addEventListener('change', updateLoginFields);

    // Inicializa o estado dos campos de login
    updateLoginFields();


    // Login principal (para Email/Senha)
    loginForm.addEventListener('submit', async (e) => {
        // Apenas para login de email/senha ou se o botão principal for clicado
        if (loginEmailRadio.checked) {
            e.preventDefault(); // Impede o submit para o form de telefone
            loginMessage.textContent = '';
            loginMessage.className = 'message';

            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

            try {
                const result = await firebaseAuth.loginWithEmail(email, password);
                if (result.requiresEmailVerification) {
                    loginMessage.textContent = 'Login bem-sucedido, mas seu email não foi verificado. Por favor, verifique sua caixa de entrada.';
                    loginMessage.classList.add('warning');
                } else {
                    loginMessage.textContent = `Login com email bem-sucedido! Bem-vindo, ${result.user.displayName || result.user.email}!`;
                    loginMessage.classList.add('success');
                    // Redirecionar para dashboard ou página de sucesso
                    // window.location.href = '/dashboard.html';
                }
            } catch (error) {
                console.error("Erro no login de email:", error);
                loginMessage.textContent = `Erro: ${error.message}`;
                loginMessage.classList.add('error');
            }
        }
        // Se for login por telefone, o submit será manipulado pelos botões de solicitação/verificação de código
    });


    // Lógica para solicitar código de verificação de telefone
    requestCodeButton.addEventListener('click', async () => {
        loginMessage.textContent = '';
        loginMessage.className = 'message';

        const phoneNumber = loginPhoneInput.value;

        try {
            // Opcional: Checar se o número existe no Firestore antes de enviar o SMS
            // A conta do Firebase Auth deve existir para que o login por telefone funcione
            const userExists = await firebaseAuth.checkPhoneNumberExists(phoneNumber);
            if (!userExists) {
                loginMessage.textContent = 'Número de telefone não encontrado. Por favor, cadastre-se.';
                loginMessage.classList.add('error');
                return;
            }

            currentPhoneConfirmationResult = await firebaseAuth.sendPhoneVerificationCode(phoneNumber);
            loginMessage.textContent = 'Código de verificação enviado para o seu telefone!';
            loginMessage.classList.add('success');
            loginPhoneRequestFields.classList.add('hidden');
            loginPhoneVerifyFields.classList.remove('hidden');
            verificationCodeInput.setAttribute('required', 'true');

        } catch (error) {
            console.error("Erro ao solicitar código de telefone:", error);
            loginMessage.textContent = `Erro: ${error.message}`;
            loginMessage.classList.add('error');
        }
    });

    // Lógica para verificar o código de telefone
    verifyCodeButton.addEventListener('click', async () => {
        loginMessage.textContent = '';
        loginMessage.className = 'message';

        const verificationCode = verificationCodeInput.value;

        if (!currentPhoneConfirmationResult) {
            loginMessage.textContent = 'Nenhum código solicitado. Por favor, solicite um código primeiro.';
            loginMessage.classList.add('error');
            return;
        }

        try {
            const result = await firebaseAuth.confirmPhoneVerificationCode(currentPhoneConfirmationResult, verificationCode);
            loginMessage.textContent = `Login com telefone bem-sucedido! Bem-vindo, ${result.user.displayName || result.user.phoneNumber}!`;
            loginMessage.classList.add('success');
            loginPhoneVerifyFields.classList.add('hidden'); // Esconde o campo de código
            loginPhoneInput.value = ''; // Limpa o número de telefone
            verificationCodeInput.value = ''; // Limpa o código
            currentPhoneConfirmationResult = null; // Reseta
            // Redirecionar para dashboard ou página de sucesso
            // window.location.href = '/dashboard.html';
        } catch (error) {
            console.error("Erro ao verificar código de telefone:", error);
            loginMessage.textContent = `Erro: ${error.message}`;
            loginMessage.classList.add('error');
        }
    });


    // --- Lógica de Login com Google ---
    const googleLoginButton = document.getElementById('google-login-button');
    const googleLoginMessage = document.getElementById('google-login-message'); // Adicionado para mensagens do Google

    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            googleLoginMessage.textContent = '';
            googleLoginMessage.className = 'message';
            try {
                const result = await firebaseAuth.loginWithGoogle();
                googleLoginMessage.textContent = `Login com Google bem-sucedido! Bem-vindo, ${result.user.displayName}!`;
                googleLoginMessage.classList.add('success');
                // Redirecionar para dashboard ou página de sucesso
                // window.location.href = '/dashboard.html';
            } catch (error) {
                console.error("Erro no login com Google:", error);
                googleLoginMessage.textContent = `Erro: ${error.message}`;
                googleLoginMessage.classList.add('error');
            }
        });
    }

    // --- Lógica de Redefinição de Senha ---
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetEmailInput = document.getElementById('reset-email');

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetPasswordMessage.textContent = '';
        resetPasswordMessage.className = 'message';

        const email = resetEmailInput.value;

        try {
            await firebaseAuth.resetPassword(email);
            resetPasswordMessage.textContent = 'Email de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.';
            resetPasswordMessage.classList.add('success');
            resetPasswordForm.reset();
            setTimeout(() => showCard(loginFormCard), 3000); // Volta para login após sucesso
        } catch (error) {
            console.error("Erro ao redefinir senha:", error);
            resetPasswordMessage.textContent = `Erro: ${error.message}`;
            resetPasswordMessage.classList.add('error');
        }
    });

    // --- Lógica de Logout ---
    const logoutButton = document.getElementById('logout-button'); // Assumindo um botão de logout em alguma tela pós-login
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await firebaseAuth.signOutUser();
                alert('Você foi desconectado.');
                window.location.href = '/index.html'; // Redireciona para a página de login/cadastro
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                alert(`Erro ao desconectar: ${error.message}`);
            }
        });
    }

    // Opcional: Monitorar estado de autenticação para auto-redirecionamento
    firebaseAuth.onAuthStateChangedListener(user => {
        if (user) {
            console.log("Usuário logado:", user.uid);
            // Aqui você pode redirecionar para uma página de dashboard se o usuário já estiver logado
            // Ex: if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            //        window.location.href = '/dashboard.html';
            //    }
        } else {
            console.log("Nenhum usuário logado.");
            // Aqui você pode redirecionar para a página de login se o usuário não estiver logado
            // Ex: if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            //        window.location.href = '/index.html';
            //    }
        }
    });
});