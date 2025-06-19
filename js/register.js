document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof window.firebaseAuth !== 'undefined' && typeof firebaseConfig !== 'undefined') {
      window.firebaseAuth.initializeFirebaseApp(firebaseConfig);
      console.log("Firebase inicializado com sucesso.");
    } else {
      console.error("Erro: firebaseAuth ou firebaseConfig não definidos. Verifique os arquivos 'config.js' e 'firebaseAuth.js'.");
      showNotification('error', 'Erro ao carregar o sistema. Verifique a configuração do Firebase.');
      return;
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    showNotification('error', 'Erro ao carregar o sistema. Tente novamente.');
    return;
  }

  const registerForm = document.getElementById('register-form');
  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneNumberInput = document.getElementById('reg-phone');
  const municipioSelect = document.getElementById('reg-municipio');
  const bairroInput = document.getElementById('reg-bairro');
  const bairrosList = document.getElementById('bairrosList');
  const passwordInput = document.getElementById('reg-password');
  const confirmPasswordInput = document.getElementById('reg-confirm-password');
  const notifyEmail = document.getElementById('method-email');
  const notifyWhatsApp = document.getElementById('method-phone');
  const registerBtn = document.getElementById('main-login-button');
  const registerText = document.querySelector('#registerText');
  const registerSpinner = document.querySelector('#registerSpinner');
  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const phoneNumberError = document.getElementById('phoneNumberError');
  const municipioError = document.getElementById('municipioError');
  const bairroError = document.getElementById('bairroError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const notificationError = document.getElementById('notificationError');
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');
  const showTermsLink = document.getElementById('showTermsLink');
  const termsModal = document.getElementById('termsModal');
  const closeTermsModalBtn = document.getElementById('closeTermsModal');
  const acceptTermsModalBtn = document.getElementById('acceptTermsModal');
  const notificationModal = document.getElementById('notificationModal');
  const notificationIcon = document.getElementById('notificationIcon');
  const notificationMessage = document.getElementById('notificationMessage');
  const closeNotificationModal = document.getElementById('closeNotificationModal');
  const emailFields = document.getElementById('email-fields');
  const phoneFields = document.getElementById('phone-fields');

  let isSubmitting = false;
  let termsAccepted = false;

  const municipiosData = {
    "Luanda": ["Maianga", "Rangel", "Samba", "Ingombota", "Neves Bendinha"],
    "Viana": ["Vila Estoril", "Viana Sede", "Zango", "Calumbo"],
    "Cacuaco": ["Cacuaco Sede", "Sequele", "Mulenvos"],
    "Belas": ["Futungo", "Quenguela", "Benfica", "Morro Bento"],
    "Talatona": ["Talatona Cidade", "Camama", "Benfica Sul"],
    "Kilamba Kiaxi": ["Golfe", "Nova Vida", "Palanca"],
    "Cazenga": ["Tala Hady", "Hoji Ya Henda", "Cazenga Popular"]
  };

  function populateMunicipios() {
    if (!municipioSelect) {
      console.error("Elemento #municipio não encontrado.");
      showNotification('error', 'Erro ao carregar o formulário. Recarregue a página.');
      return;
    }
    municipioSelect.innerHTML = '<option value="" class="bg-white text-text-secondary">Selecione</option>';
    const municipios = Object.keys(municipiosData).sort();
    if (!municipios.length) {
      console.error("Nenhum município encontrado em municipiosData.");
      showNotification('error', 'Erro ao carregar municípios. Tente novamente.');
      return;
    }
    municipios.forEach((municipio) => {
      const option = document.createElement('option');
      option.value = municipio;
      option.textContent = municipio;
      municipioSelect.appendChild(option);
    });
  }

  function updateBairrosDatalist() {
    const selectedMunicipio = municipioSelect.value;
    bairrosList.innerHTML = '';
    if (selectedMunicipio && municipiosData[selectedMunicipio]) {
      const bairros = municipiosData[selectedMunicipio].sort();
      bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        bairrosList.appendChild(option);
      });
    }
    bairroInput.value = '';
    hideError(bairroError);
  }

  populateMunicipios();
  municipioSelect.addEventListener('change', updateBairrosDatalist);

  const phoneMask = IMask(phoneNumberInput, {
    mask: '+244 000 000 000',
    lazy: false,
    placeholderChar: '_',
  });

  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
      const inputElement = element.parentElement.querySelector('input, select');
      if (inputElement) {
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.classList.add('border-error');
      }
    }
  }

  function hideError(element) {
    if (element) {
      element.style.display = 'none';
      const inputElement = element.parentElement.querySelector('input, select');
      if (inputElement) {
        inputElement.setAttribute('aria-invalid', 'false');
        inputElement.classList.remove('border-error');
      }
    }
  }

  function showNotification(type, message) {
    if (notificationIcon && notificationModal && notificationMessage) {
      notificationIcon.className = `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
      notificationModal.classList.remove('success', 'error');
      notificationModal.classList.add(type);
      notificationMessage.textContent = message;
      notificationModal.classList.add('show');
    } else {
      console.error("Elementos de notificação não encontrados.");
      alert(`Status: ${type.toUpperCase()}\n${message}`);
    }
  }

  function hideNotification() {
    if (notificationModal) {
      notificationModal.classList.remove('show', 'success', 'error');
    }
  }

  function toggleRegisterButton() {
    const notificationSelected = notifyEmail.checked || notifyWhatsApp.checked;
    const isEmailValid = notifyEmail.checked ? emailInput.value.trim() && /^\S+@gmail\.com$/.test(emailInput.value.trim()) : true;
    const isPhoneValid = notifyWhatsApp.checked ? phoneNumberInput.value.trim() && /^\+2449[0-9]{8}$/.test(phoneNumberInput.value.trim().replace(/\s/g, '')) : true;

    const formFilled = nameInput.value.trim() !== '' &&
      municipioSelect.value !== '' &&
      bairroInput.value.trim() !== '' &&
      passwordInput.value.length >= 8 &&
      passwordInput.value === confirmPasswordInput.value &&
      isEmailValid && isPhoneValid;

    if (registerBtn) {
      registerBtn.disabled = !(termsAccepted && notificationSelected && formFilled);
    }

    if (!termsAccepted) {
      showError(termsError, "Aceite os Termos de Serviço.");
    } else {
      hideError(termsError);
    }
    if (!notificationSelected) {
      showError(notificationError, "Selecione um método de notificação.");
    } else {
      hideError(notificationError);
    }
  }

  nameInput.addEventListener('input', () => { hideError(nameError); toggleRegisterButton(); });
  emailInput.addEventListener('input', () => {
    if (notifyEmail.checked) {
      if (!emailInput.value.trim()) {
        showError(emailError, "Email é obrigatório para notificações por Gmail.");
      } else if (!/^\S+@gmail\.com$/.test(emailInput.value.trim())) {
        showError(emailError, "Use um email do Gmail (ex: seu.email@gmail.com).");
      } else {
        hideError(emailError);
      }
    }
    toggleRegisterButton();
  });
  phoneNumberInput.addEventListener('input', () => {
    if (notifyWhatsApp.checked) {
      if (!phoneNumberInput.value.trim()) {
        showError(phoneNumberError, "Número de telefone é obrigatório para notificações por WhatsApp.");
      } else if (!/^\+2449[0-9]{8}$/.test(phoneNumberInput.value.trim().replace(/\s/g, ''))) {
        showError(phoneNumberError, "Formato inválido. Use +2449XXXXXXXX.");
      } else {
        hideError(phoneNumberError);
      }
    }
    toggleRegisterButton();
  });
  municipioSelect.addEventListener('change', () => { hideError(municipioError); updateBairrosDatalist(); toggleRegisterButton(); });
  bairroInput.addEventListener('input', () => {
    const selectedMunicipio = municipioSelect.value;
    const enteredBairro = bairroInput.value.trim();
    if (!enteredBairro) {
      showError(bairroError, "O nome do bairro é obrigatório.");
    } else if (selectedMunicipio && municipiosData[selectedMunicipio] && !municipiosData[selectedMunicipio].includes(enteredBairro)) {
      showError(bairroError, `Bairro inválido para ${selectedMunicipio}.`);
    } else {
      hideError(bairroError);
    }
    toggleRegisterButton();
  });
  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length < 8) {
      showError(passwordError, "A senha deve ter pelo menos 8 caracteres.");
    } else {
      hideError(passwordError);
    }
    toggleRegisterButton();
  });
  confirmPasswordInput.addEventListener('input', () => {
    if (confirmPasswordInput.value !== passwordInput.value) {
      showError(confirmPasswordError, "As senhas não coincidem.");
    } else {
      hideError(confirmPasswordError);
    }
    toggleRegisterButton();
  });

  termsCheckbox.addEventListener('change', () => {
    termsAccepted = termsCheckbox.checked;
    toggleRegisterButton();
  });
  notifyEmail.addEventListener('change', () => {
    emailFields.classList.remove('hidden');
    phoneFields.classList.add('hidden');
    phoneNumberInput.value = '';
    hideError(phoneNumberError);
    toggleRegisterButton();
  });
  notifyWhatsApp.addEventListener('change', () => {
    phoneFields.classList.remove('hidden');
    emailFields.classList.add('hidden');
    emailInput.value = '';
    hideError(emailError);
    toggleRegisterButton();
  });

  showTermsLink.addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.add('show');
  });

  closeTermsModalBtn.addEventListener('click', () => {
    termsModal.classList.remove('show');
    if (!termsAccepted) {
      toggleRegisterButton();
    }
  });

  acceptTermsModalBtn.addEventListener('click', () => {
    termsAccepted = true;
    termsCheckbox.checked = true;
    termsModal.classList.remove('show');
    toggleRegisterButton();
  });

  termsModal.addEventListener('click', (e) => {
    if (e.target === termsModal) {
      termsModal.classList.remove('show');
      if (!termsAccepted) {
        toggleRegisterButton();
      }
    }
  });

  closeNotificationModal.addEventListener('click', hideNotification);
  notificationModal.addEventListener('click', (e) => {
    if (e.target === notificationModal) {
      hideNotification();
    }
  });

  async function sendWhatsAppVerificationCode(phoneNumber) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const ULTRA_MSG_TOKEN = 'dklefhlqae1key9l'; // MOVER PARA BACKEND EM PRODUÇÃO
    const ULTRA_MSG_INSTANCE_ID = 'instance126366';

    try {
      const response = await fetch(`https://api.ultramsg.com/${ULTRA_MSG_INSTANCE_ID}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ULTRA_MSG_TOKEN,
          to: phoneNumber.replace(/\s/g, ''),
          body: `Seu código de verificação FixABairro é: ${verificationCode}`
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro UltraMsg:', errorData);
        throw new Error(`Falha ao enviar código via WhatsApp: ${errorData.error || 'Erro desconhecido'}`);
      }
      return verificationCode;
    } catch (error) {
      console.error('Erro ao enviar código via UltraMsg:', error);
      throw error;
    }
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    document.querySelectorAll('.error-message').forEach(hideError);

    let isValid = true;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim().replace(/\s/g, '');
    const notificationMethod = notifyEmail.checked ? 'email' : notifyWhatsApp.checked ? 'whatsapp' : '';
    const selectedMunicipio = municipioSelect.value;
    const bairro = bairroInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name) { showError(nameError, "Nome completo é obrigatório."); isValid = false; }
    if (!selectedMunicipio) { showError(municipioError, "Selecione seu município."); isValid = false; }
    if (!bairro) { showError(bairroError, "O nome do bairro é obrigatório."); isValid = false; }
    else if (selectedMunicipio && municipiosData[selectedMunicipio] && !municipiosData[selectedMunicipio].includes(bairro)) {
      showError(bairroError, `Bairro inválido para ${selectedMunicipio}.`); isValid = false;
    }
    if (password.length < 8) { showError(passwordError, "A senha deve ter pelo menos 8 caracteres."); isValid = false; }
    if (password !== confirmPassword) { showError(confirmPasswordError, "As senhas não coincidem."); isValid = false; }
    if (!notificationMethod) { showError(notificationError, "Selecione um método de notificação."); isValid = false; }
    if (!termsAccepted) { showError(termsError, "Aceite os Termos de Serviço."); isValid = false; }

    if (notificationMethod === 'email') {
      if (!email) { showError(emailError, "Email é obrigatório para notificações por Gmail."); isValid = false; }
      else if (!/^\S+@gmail\.com$/.test(email)) { showError(emailError, "Use um email do Gmail (ex: seu.email@gmail.com)."); isValid = false; }
    } else if (notificationMethod === 'whatsapp') {
      if (!phoneNumber) { showError(phoneNumberError, "Número de telefone é obrigatório para notificações por WhatsApp."); isValid = false; }
      else if (!/^\+2449[0-9]{8}$/.test(phoneNumber)) { showError(phoneNumberError, "Formato inválido. Use +2449XXXXXXXX."); isValid = false; }
    }

    if (!isValid) {
      isSubmitting = false;
      return;
    }

    registerBtn.disabled = true;
    registerText.classList.add('hidden');
    registerSpinner.classList.remove('hidden');
    registerBtn.innerHTML = `<span class="spinner-border" role="status" aria-hidden="true"></span> A criar...`;

    try {
      let userAuthData;

      if (notificationMethod === 'email') {
        userAuthData = await window.firebaseAuth.registerUser({
          name,
          email,
          password,
          municipio: selectedMunicipio,
          bairro,
          method: 'email',
          notificationPreference: 'gmail'
        });
        localStorage.setItem('pendingVerificationEmail', email);
        showNotification('success', 'Conta criada! Verifique seu email para o código de confirmação.');
        setTimeout(() => {
          window.location.href = 'verify-email.html';
        }, 2000);
      } else {
        const userExists = await window.firebaseAuth.checkPhoneNumberExists(phoneNumber);
        if (userExists) {
          throw new Error("Este número de telefone já está registrado.");
        }

        userAuthData = await window.firebaseAuth.registerUser({
          name,
          phoneNumber,
          password,
          municipio: selectedMunicipio,
          bairro,
          method: 'phone',
          notificationPreference: 'whatsapp'
        });

        const verificationCode = await sendWhatsAppVerificationCode(phoneNumber);
        await firebase.firestore().collection('phoneVerifications').doc(userAuthData.user.uid).set({
          phoneNumber,
          verificationCode,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          verified: false
        });

        localStorage.setItem('pendingVerificationUserId', userAuthData.user.uid);
        localStorage.setItem('pendingVerificationPhoneNumber', phoneNumber);

        showNotification('success', 'Código de verificação enviado para o seu WhatsApp!');
        setTimeout(() => {
          window.location.href = 'verify-phone.html';
        }, 2000);
      }
    } catch (error) {
      console.error("Erro no registro:", error);
      let userFacingMessage = error.message || 'Erro ao criar conta. Tente novamente.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            userFacingMessage = 'Este email/telefone já está registrado.';
            if (notificationMethod === 'email') showError(emailError, userFacingMessage);
            else showError(phoneNumberError, userFacingMessage);
            break;
          case 'auth/invalid-email':
            userFacingMessage = 'Formato de email inválido.';
            showError(emailError, userFacingMessage);
            break;
          case 'auth/weak-password':
            userFacingMessage = 'A senha é muito fraca.';
            showError(passwordError, userFacingMessage);
            break;
          case 'auth/network-request-failed':
            userFacingMessage = 'Problema de conexão com a internet. Verifique sua conexão e tente novamente.';
            showNotification('error', userFacingMessage);
            break;
          default:
            showNotification('error', userFacingMessage);
        }
      } else {
        if (userFacingMessage.includes("telefone já está registrado")) {
          showError(phoneNumberError, userFacingMessage);
        } else {
          showNotification('error', userFacingMessage);
        }
      }
    } finally {
      registerBtn.disabled = false;
      registerText.classList.remove('hidden');
      registerSpinner.classList.add('hidden');
      registerBtn.innerHTML = `<i class="fas fa-user-plus mr-2"></i> Criar Conta`;
      isSubmitting = false;
    }
  });

  toggleRegisterButton();
});