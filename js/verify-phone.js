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
    alert("Erro: Firebase SDK não carregado.");
    window.location.href = 'login.html';
    return;
  }

  // Verifica o estado de autenticação
  window.firebaseAuth.checkAuthState('index.html', null);

  // Verifica se há uma verificação pendente
  const storedPhoneNumber = localStorage.getItem('pendingVerificationPhoneNumber');
  if (!storedPhoneNumber) {
    alert('Nenhuma verificação de telefone pendente. Retorne ao login.');
    window.location.href = 'login.html';
    return;
  }

  // Inicializa o reCAPTCHA
  try {
    await window.firebaseAuth.initializeRecaptcha('recaptcha-container');
  } catch (error) {
    console.error("Erro ao inicializar reCAPTCHA:", error);
    alert("Erro ao carregar verificação de segurança.");
  }

  // Elementos DOM
  const verifyPhoneForm = document.getElementById('verifyPhoneForm');
  const verificationCodeInput = document.getElementById('verificationCode');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyText = document.getElementById('verifyText');
  const verifySpinner = document.getElementById('verifySpinner');
  const resendCodeBtn = document.getElementById('resendCodeBtn');
  const resendText = document.getElementById('resendText');
  const resendSpinner = document.getElementById('resendSpinner');
  const codeError = document.getElementById('codeError');
  const phoneNumberDisplay = document.getElementById('phoneNumberDisplay');

  // Exibe o número de telefone
  phoneNumberDisplay.textContent = storedPhoneNumber;

  // Máscara para o código OTP
  IMask(verificationCodeInput, {
    mask: '000000',
    lazy: false
  });

  // Validação do formulário
  verifyPhoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    codeError.classList.add('hidden');

    const code = verificationCodeInput.value.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      codeError.textContent = "O código deve ter 6 dígitos numéricos.";
      codeError.classList.remove('hidden');
      return;
    }

    verifyBtn.disabled = true;
    verifyText.classList.add('hidden');
    verifySpinner.classList.remove('hidden');
    verifyBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A verificar...`;

    try {
      const result = await window.firebaseAuth.verifyPhoneNumber(code);
      alert('Telefone verificado com sucesso! Bem-vindo(a) ao FixABairro.');
      window.location.href = 'profile.html';
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      codeError.textContent = error.message;
      codeError.classList.remove('hidden');
    } finally {
      verifyBtn.disabled = false;
      verifyText.classList.remove('hidden');
      verifySpinner.classList.add('hidden');
      verifyBtn.innerHTML = `<i class="fas fa-check-circle"></i> Verificar Código`;
    }
  });

  // Reenviar código
  resendCodeBtn.addEventListener('click', async () => {
    resendCodeBtn.disabled = true;
    resendText.classList.add('hidden');
    resendSpinner.classList.remove('hidden');
    resendCodeBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> A reenviar...`;
    codeError.classList.add('hidden');

    try {
      await window.firebaseAuth.sendVerificationCode(storedPhoneNumber);
      alert('Novo código de verificação enviado!');
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      codeError.textContent = error.message;
      codeError.classList.remove('hidden');
    } finally {
      resendCodeBtn.disabled = false;
      resendText.classList.remove('hidden');
      resendSpinner.classList.add('hidden');
      resendCodeBtn.innerHTML = `<i class="fas fa-redo"></i> Reenviar Código`;
    }
  });
});