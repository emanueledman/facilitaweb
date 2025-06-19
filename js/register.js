document.addEventListener('DOMContentLoaded', async () => {
  try {
    window.firebaseAuth.initializeFirebaseApp(firebaseConfig);
    console.log("Firebase inicializado com sucesso.");
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    showNotification('error', 'Erro ao carregar o sistema. Tente novamente.');
    return;
  }

  // Elementos da UI
  const registerForm = document.getElementById('registerForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const municipioSelect = document.getElementById('municipio');
  const bairroInput = document.getElementById('bairro');
  const bairrosList = document.getElementById('bairrosList');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const notifyEmail = document.getElementById('notifyEmail');
  const notifyWhatsApp = document.getElementById('notifyWhatsApp');
  const registerBtn = document.getElementById('registerBtn');
  const registerText = document.getElementById('registerText');
  const registerSpinner = document.getElementById('registerSpinner');
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

  let isSubmitting = false;
  let termsAccepted = false;

  // Dados de municípios e bairros
  const municipiosData = {
    "Luanda": ["Maianga", "Rangel", "Samba", "Ingombota", "Neves Bendinha"],
    "Viana": ["Vila Estoril", "Viana Sede", "Zango", "Calumbo"],
    "Cacuaco": ["Cacuaco Sede", "Sequele", "Mulenvos"],
    "Belas": ["Futungo", "Quenguela", "Benfica", "Morro Bento"],
    "Talatona": ["Talatona Cidade", "Camama", "Benfica Sul"],
    "Kilamba Kiaxi": ["Golfe", "Nova Vida", "Palanca"],
    "Cazenga": ["Tala Hady", "Hoji Ya Henda", "Cazenga Popular"],
  };

  function populateMunicipios() {
    if (!municipioSelect) {
      console.error("Elemento #municipio não encontrado.");
      showNotification('error', 'Erro ao carregar o formulário. Recarregue a página.');
      return;
    }
    municipioSelect.innerHTML = '<option value="" class="bg-white text-text-secondary">Selecione</option>';
    const municipios = Object.keys(municipiosData).sort();
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

  // Máscara para telefone
  const phoneMask = IMask(phoneNumberInput, {
    mask: '+244 000 000 000',
    lazy: false,
    placeholderChar: '_',
  });

  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    const inputElement = element.parentElement.querySelector('input, select');
    if (inputElement) {
      inputElement.setAttribute('aria-invalid', 'true');
      inputElement.classList.add('border-error');
    }
  }

  function hideError(element) {
    element.style.display = 'none';
    const inputElement = element.parentElement.querySelector('input, select');
    if (inputElement) {
      inputElement.setAttribute('aria-invalid', 'false');
      inputElement.classList.remove('border-error');
    }
  }

  function showNotification(type, message) {
    notificationIcon.className = `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
    notificationModal.classList.remove('success', 'error');
    notificationModal.classList.add(type);
    notificationMessage.textContent = message;
    notificationModal.classList.add('show');
  }

  function hideNotification() {
    notificationModal.classList.remove('show', 'success', 'error');
  }

  function toggleRegisterButton() {
    const notificationSelected = notifyEmail.checked || notifyWhatsApp.checked;
    const formFilled = nameInput.value.trim() !== '' &&
                       municipioSelect.value !== '' &&
                       bairroInput.value.trim() !== '' &&
                       passwordInput.value.length >= 8 &&
                       passwordInput.value === confirmPasswordInput.value &&
                       (notificationSelected && ((notifyEmail.checked && emailInput.value.trim() !== '') || (notifyWhatsApp.checked && phoneNumberInput.value.trim() !== '')));

    registerBtn.disabled = !(termsAccepted && notificationSelected && formFilled);
    if (!termsAccepted) showError(termsError, "Aceite os Termos de Serviço.");
    else hideError(termsError);
    if (!notificationSelected) showError(notificationError, "Selecione um método de notificação.");
    else hideError(notificationError);
  }

  nameInput.addEventListener('input', () => nameInput.value.trim() ? hideError(nameError) : null);
  emailInput.addEventListener('input', () => {
    if (notifyEmail.checked && !/^\S+@gmail\.com$/.test(emailInput.value.trim())) {
      showError(emailError, "Use um email do Gmail (ex: seu.email@gmail.com).");
    } else {
      hideError(emailError);
    }
  });
  phoneNumberInput.addEventListener('input', () => {
    if (notifyWhatsApp.checked && !/^\+2449[0-9]{8}$/.test(phoneNumberInput.value.trim().replace(/\s/g, ''))) {
      showError(phoneNumberError, "Formato inválido. Use +2449XXXXXXXX.");
    } else {
      hideError(phoneNumberError);
    }
  });
  municipioSelect.addEventListener('change', () => municipioSelect.value ? hideError(municipioError) : null);
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
  });
  passwordInput.addEventListener('input', () => passwordInput.value.length >= 8 ? hideError(passwordError) : null);
  confirmPasswordInput.addEventListener('input', () => confirmPasswordInput.value === passwordInput.value ? hideError(confirmPasswordError) : null);
  termsCheckbox.addEventListener('change', () => {
    termsAccepted = termsCheckbox.checked;
    toggleRegisterButton();
  });
  notifyEmail.addEventListener('change', toggleRegisterButton);
  notifyWhatsApp.addEventListener('change', toggleRegisterButton);

  showTermsLink.addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.add('show');
  });

  closeTermsModalBtn.addEventListener('click', () => {
    termsModal.classList.remove('show');
    if (!termsAccepted) toggleRegisterButton();
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
      if (!termsAccepted) toggleRegisterButton();
    }
  });

  closeNotificationModal.addEventListener('click', hideNotification);
  notificationModal.addEventListener('click', (e) => {
    if (e.target === notificationModal) hideNotification();
  });

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
    else if (municipiosData[selectedMunicipio] && !municipiosData[selectedMunicipio].includes(bairro)) {
      showError(bairroError, `Bairro inválido para ${selectedMunicipio}.`); isValid = false; }
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
      const verificationData = {
        name,
        municipio: selectedMunicipio,
        bairro,
        notificationMethod,
        email: notificationMethod === 'email' ? email : null,
        phoneNumber: notificationMethod === 'whatsapp' ? phoneNumber : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (notificationMethod === 'email') {
        await window.firebaseAuth.registerUserWithEmail(name, email, password, selectedMunicipio, bairro);
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
        const verificationCode = await window.firebaseAuth.registerUserWithPhone(name, phoneNumber, password, selectedMunicipio, bairro);
        await firebase.firestore().collection('pendingVerifications').doc(phoneNumber).set({
          ...verificationData,
          verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
          password,
        });
        await window.firebaseAuth.sendVerificationCode(phoneNumber);
        localStorage.setItem('pendingVerificationPhoneNumber', phoneNumber);
        showNotification('success', 'Código de verificação enviado para o seu WhatsApp.');
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
            userFacingMessage = 'Este email já está registrado.';
            showError(emailError, userFacingMessage);
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
        showNotification('error', userFacingMessage);
      }
    } finally {
      registerBtn.disabled = false;
      registerText.classList.remove('hidden');
      registerSpinner.classList.add('hidden');
      registerBtn.innerHTML = `<i class="fas fa-user-plus"></i> Criar Conta`;
      isSubmitting = false;
    }
  });
});