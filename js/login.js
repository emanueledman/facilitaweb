const firebaseConfig = {
  apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJPB5xFFCbcf4UQw",
  authDomain: "facilita-479b3.firebaseapp.com",
  projectId: "facilita-479b3",
  storageBucket: "facilita-479b3.appspot.com",
  messagingSenderId: "385676676886",
  appId: "1:385676676886:web:6976de7f3abc6c0da94a37"
};

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa o Firebase App
  try {
    window.firebaseAuth.initializeFirebaseApp(firebaseConfig);
    console.log("Firebase App inicializado.");
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    showNotification("Erro: Firebase SDK não carregado.", 'error');
    return;
  }

  // Verifica o estado de autenticação
  window.firebaseAuth.checkAuthState('index.html', null);

  // Inicializa o reCAPTCHA
  try {
    await window.firebaseAuth.initializeRecaptcha('recaptcha-container');
  } catch (error) {
    console.error("Erro ao inicializar reCAPTCHA:", error);
    showNotification("Erro ao carregar verificação de segurança.", 'error');
  }

  // Referências aos elementos da UI
  const loginForm = document.getElementById('loginForm');
  const emailOrPhoneInput = document.getElementById('emailOrPhone');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const loginText = document.getElementById('loginText');
  const loginSpinner = document.getElementById('loginSpinner');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const forgotPasswordLink = document.getElementById('forgotPassword');
  const loginWithOtpLink = document.getElementById('loginWithOtp');
  const emailOrPhoneError = document.getElementById('emailOrPhoneError');
  const passwordError = document.getElementById('passwordError');
  const notificationMessageDiv = document.getElementById('notificationMessage');

  // Funções auxiliares para mostrar/ocultar mensagens
  function showNotification(message, type) {
    notificationMessageDiv.textContent = message;
    notificationMessageDiv.classList.remove('hidden', 'notification-message', 'success', 'error');
    notificationMessageDiv.classList.add('notification-message', type);
  }

  function hideNotification() {
    notificationMessageDiv.classList.add('hidden');
    notificationMessageDiv.textContent = '';
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    element.classList.add('block');
  }

  function hideError(element) {
    element.classList.add('hidden');
  }

  // Máscara de telefone
  IMask(emailOrPhoneInput, {
    mask: '+244 900 000 000',
    lazy: false
  });

  emailOrPhoneInput.addEventListener('focus', () => {
    if (emailOrPhoneInput.value === '') {
      emailOrPhoneInput.value = '+244';
    }
  });

  emailOrPhoneInput.addEventListener('input', () => {
    if (!emailOrPhoneInput.value.startsWith('+244')) {
      emailOrPhoneInput.value = '+244' + emailOrPhoneInput.value.replace(/[^0-9]/g, '').substring(3);
    } else if (emailOrPhoneInput.value.length < 4 && emailOrPhoneInput.value.startsWith('+244'.substring(0, emailOrPhoneInput.value.length))) {
      emailOrPhoneInput.value = '+244';
    }
  });

  emailOrPhoneInput.addEventListener('blur', () => {
    if (emailOrPhoneInput.value === '+244' || emailOrPhoneInput.value === '') {
      emailOrPhoneInput.value = '';
    }
  });

  // Event listener para o formulário de login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(emailOrPhoneError);
    hideError(passwordError);
    hideNotification();
    loginWithOtpLink.classList.add('hidden');

    let isValid = true;
    const emailOrPhoneRaw = emailOrPhoneInput.value.trim();
    const password = passwordInput.value;

    const isEmail = window.firebaseAuth.validateEmail(emailOrPhoneRaw) === null;
    const isPhone = window.firebaseAuth.validatePhone(emailOrPhoneRaw) === null;

    if (!emailOrPhoneRaw) {
      showError(emailOrPhoneError, "Email ou número de telefone é obrigatório.");
      isValid = false;
    } else if (!isEmail && !isPhone) {
      showError(emailOrPhoneError, "Formato inválido. Use um email ou +2449XXXXXXXX.");
      isValid = false;
    }

    const passwordErrorMsg = window.firebaseAuth.validatePassword(password);
    if (passwordErrorMsg) {
      showError(passwordError, passwordErrorMsg);
      isValid = false;
    }

    if (!isValid) return;

    loginBtn.disabled = true;
    loginText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');
    loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A entrar...`;

    try {
      if (isEmail) {
        const result = await window.firebaseAuth.loginWithEmail(emailOrPhoneRaw, password);
        showNotification('Login realizado com sucesso!', 'success');
        window.location.href = 'profile.html';
      } else {
        // Para login com telefone, sugerir OTP após falha de senha
        try {
          const userData = await window.firebaseAuth.checkPhoneNumberExists(emailOrPhoneRaw);
          if (!userData) {
            throw new Error("Nenhuma conta encontrada com este número de telefone.");
          }
          // Tenta login com email vinculado, se disponível
          if (userData.data.email) {
            await window.firebaseAuth.loginWithEmail(userData.data.email, password);
            showNotification('Login realizado com sucesso!', 'success');
            window.location.href = 'profile.html';
          } else {
            throw new Error("Conta vinculada apenas a telefone. Use OTP.");
          }
        } catch (error) {
          if (error.message.includes("Senha incorreta") || error.message.includes("Use OTP")) {
            showError(passwordError, "Senha incorreta. Deseja entrar com um código OTP?");
            loginWithOtpLink.classList.remove('hidden');
          } else {
            showError(emailOrPhoneError, error.message);
          }
        }
      }
    } catch (error) {
      console.error("Erro no login:", error);
      if (!loginWithOtpLink.classList.contains('hidden')) {
        // OTP já sugerido, não mostrar erro adicional
      } else if (error.message.includes("Email inválido") || error.message.includes("telefone inválido")) {
        showError(emailOrPhoneError, error.message);
      } else if (error.message.includes("Senha incorreta")) {
        showError(passwordError, error.message);
      } else {
        showNotification(error.message, 'error');
      }
    } finally {
      loginBtn.disabled = false;
      loginText.classList.remove('hidden');
      loginSpinner.classList.add('hidden');
      loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Entrar`;
    }
  });

  // Event listener para login com OTP
  loginWithOtpLink.addEventListener('click', async (e) => {
    e.preventDefault();
    hideNotification();
    hideError(emailOrPhoneError);
    loginWithOtpLink.classList.add('hidden');

    const phoneNumber = emailOrPhoneInput.value.trim();
    if (!window.firebaseAuth.validatePhone(phoneNumber)) {
      loginBtn.disabled = true;
      loginText.classList.add('hidden');
      loginSpinner.classList.remove('hidden');
      loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A verificar...`;

      try {
        await window.firebaseAuth.sendVerificationCode(phoneNumber);
        showNotification('Código de verificação enviado para o seu telefone.', 'success');
        window.location.href = 'verify-phone.html';
      } catch (error) {
        console.error("Erro ao enviar código OTP:", error);
        showNotification(error.message, 'error');
      } finally {
        loginBtn.disabled = false;
        loginText.classList.remove('hidden');
        loginSpinner.classList.add('hidden');
        loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Entrar`;
      }
    } else {
      showError(emailOrPhoneError, "Por favor, insira um número de telefone válido.");
    }
  });

  // Event listener para o login com Google
  googleLoginBtn.addEventListener('click', async () => {
    hideNotification();
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A entrar...`;

    try {
      await window.firebaseAuth.loginWithGoogle();
      showNotification('Login com Google realizado com sucesso!', 'success');
      window.location.href = 'profile.html';
    } catch (error) {
      console.error("Erro no login com Google:", error);
      showNotification(error.message, 'error');
    } finally {
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = `<img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google Logo" class="w-6 h-6 mr-3"><span>Entrar com Google</span>`;
    }
  });

  // Event listener para "Esqueceu a senha?"
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    hideError(emailOrPhoneError);
    hideNotification();

    const emailInputVal = emailOrPhoneInput.value.trim();
    const emailValidationResult = window.firebaseAuth.validateEmail(emailInputVal);
    if (!emailInputVal || emailValidationResult) {
      showError(emailOrPhoneError, emailValidationResult || 'Digite um email válido.');
      return;
    }

    try {
      await window.firebaseAuth.resetPassword(emailInputVal);
      showNotification('Email para redefinição de senha enviado.', 'success');
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      showNotification(error.message, 'error');
    }
  });
});