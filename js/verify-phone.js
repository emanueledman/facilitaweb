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

  // Verifica se há uma verificação pendente
  const pendingPhone = localStorage.getItem('pendingVerificationPhoneNumber');
  if (!pendingPhone) {
    showNotification("Nenhuma verificação de telefone pendente. Redirecionando para login.", 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
    return;
  }

  // Verifica o estado de autenticação
  window.firebaseAuth.checkAuthState('profile.html', null);

  // Referências aos elementos da UI
  const verifyPhoneForm = document.getElementById('verifyPhoneForm');
  const otpCodeInput = document.getElementById('otpCode');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyText = document.getElementById('verifyText');
  const verifySpinner = document.getElementById('verifySpinner');
  const resendCodeLink = document.getElementById('resendCode');
  const otpError = document.getElementById('otpError');
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

  // Máscara para o campo OTP
  IMask(otpCodeInput, {
    mask: '000000',
    placeholderChar: '_'
  });

  // Event listener para o formulário de verificação
  verifyPhoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(otpError);
    hideNotification();

    const code = otpCodeInput.value.trim();
    if (!code || code.length !== 6) {
      showError(otpError, "Por favor, insira um código OTP de 6 dígitos.");
      return;
    }

    verifyBtn.disabled = true;
    verifyText.classList.add('hidden');
    verifySpinner.classList.remove('hidden');
    verifyBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A verificar...`;

    try {
      const result = await window.firebaseAuth.verifyPhoneNumber(code);
      showNotification('Verificação concluída com sucesso!', 'success');
      window.location.href = 'profile.html';
    } catch (error) {
      console.error("Erro ao verificar OTP:", error);
      showError(otpError, error.message);
      if (error.message.includes("Nenhuma verificação") || error.message.includes("expirou")) {
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      }
    } finally {
      verifyBtn.disabled = false;
      verifyText.classList.remove('hidden');
      verifySpinner.classList.add('hidden');
      verifyBtn.innerHTML = `<i class="fas fa-check-circle"></i> Verificar`;
    }
  });

  // Event listener para reenviar código
  resendCodeLink.addEventListener('click', async (e) => {
    e.preventDefault();
    hideNotification();
    hideError(otpError);

    resendCodeLink.disabled = true;
    resendCodeLink.textContent = 'A reenviar...';

    try {
      await window.firebaseAuth.initializeRecaptcha('recaptcha-container');
      await window.firebaseAuth.sendVerificationCode(pendingPhone);
      showNotification('Código de verificação reenviado com sucesso.', 'success');
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      showNotification(error.message, 'error');
    } finally {
      resendCodeLink.disabled = false;
      resendCodeLink.textContent = 'Reenviar código';
    }
  });
});