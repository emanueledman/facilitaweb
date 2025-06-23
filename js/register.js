document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa Firebase
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

  // Elementos da UI (mantidos como você forneceu, apenas alguns ajustes de nome)
  const registerForm = document.getElementById('register-form'); // Assumindo 'register-form' do HTML
  const nameInput = document.getElementById('reg-name'); // Ajustado para o ID do HTML
  const emailInput = document.getElementById('reg-email'); // Ajustado para o ID do HTML
  const phoneNumberInput = document.getElementById('reg-phone'); // Ajustado para o ID do HTML
  const municipioSelect = document.getElementById('reg-municipio'); // Ajustado para o ID do HTML
  const bairroInput = document.getElementById('reg-bairro'); // Ajustado para o ID do HTML
  const bairrosList = document.getElementById('bairrosList');
  const passwordInput = document.getElementById('reg-password'); // Ajustado para o ID do HTML
  const confirmPasswordInput = document.getElementById('reg-confirm-password'); // Ajustado para o ID do HTML
  const notifyEmail = document.getElementById('method-email'); // Assumindo seu radio button
  const notifyWhatsApp = document.getElementById('method-phone'); // Assumindo seu radio button
  const registerBtn = document.getElementById('main-login-button'); // Assumindo o botão de submissão do form de registro
  const registerText = registerBtn ? registerBtn.querySelector('span:not(.spinner-border)') : null;
  const registerSpinner = registerBtn ? registerBtn.querySelector('.spinner-border') : null;
  
  // Elementos de erro (ajustados para IDs genéricos ou você pode mapeá-los individualmente)
  const nameError = document.getElementById('nameError'); // Exemplo
  const emailError = document.getElementById('emailError');
  const phoneNumberError = document.getElementById('phoneNumberError');
  const municipioError = document.getElementById('municipioError');
  const bairroError = document.getElementById('bairroError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const notificationError = document.getElementById('notificationError');
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');

  // Modais e notificações (ajustados para IDs do HTML)
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
  let confirmationResult = null; // Para guardar o resultado do sendPhoneVerificationCode do Firebase Auth (não usado com UltraMsg)

  // Dados de municípios e bairros (centralizados)
  const municipiosData = {
    "Luanda": ["Maianga", "Rangel", "Samba", "Ingombota", "Neves Bendinha"],
    "Viana": ["Vila Estoril", "Viana Sede", "Zango", "Calumbo"],
    "Cacuaco": ["Cacuaco Sede", "Sequele", "Mulenvos"],
    "Belas": ["Futungo", "Quenguela", "Benfica", "Morro Bento"],
    "Talatona": ["Talatona Cidade", "Camama", "Benfica Sul"],
    "Kilamba Kiaxi": ["Golfe", "Nova Vida", "Palanca"],
    "Cazenga": ["Tala Hady", "Hoji Ya Henda", "Cazenga Popular"]
  };

  /**
   * Popula o dropdown de municípios.
   */
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

  /**
   * Atualiza o datalist de bairros com base no município selecionado.
   */
  function updateBairrosDatalist() {
    const selectedMunicipio = municipioSelect.value;
    bairrosList.innerHTML = ''; // Limpa as opções existentes
    if (selectedMunicipio && municipiosData[selectedMunicipio]) {
      const bairros = municipiosData[selectedMunicipio].sort();
      bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        bairrosList.appendChild(option);
      });
    }
    bairroInput.value = ''; // Limpa o campo de bairro ao mudar o município
    hideError(bairroError); // Oculta o erro de bairro
  }

  // Chama a função para popular municípios e adiciona listeners
  populateMunicipios();
  municipioSelect.addEventListener('change', updateBairrosDatalist);

  // Máscara para telefone
  const phoneMask = IMask(phoneNumberInput, {
    mask: '+244 000 000 000',
    lazy: false, // Inicia com a máscara visível
    placeholderChar: '_',
  });

  // Funções auxiliares para mostrar/esconder erros e notificações
  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
      const inputElement = element.parentElement.querySelector('input, select');
      if (inputElement) {
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.classList.add('border-error');
      }
    } else {
      console.warn("Elemento de erro não encontrado:", element);
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

  // Lógica para habilitar/desabilitar botão de registro
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

  // Adiciona listeners para validar campos dinamicamente
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
      phoneNumberInput.value = ''; // Limpa o telefone se mudar para email
      hideError(phoneNumberError);
      toggleRegisterButton();
  });
  notifyWhatsApp.addEventListener('change', () => {
      phoneFields.classList.remove('hidden');
      emailFields.classList.add('hidden');
      emailInput.value = ''; // Limpa o email se mudar para telefone
      hideError(emailError);
      toggleRegisterButton();
  });


  // Lógica dos modais (Termos e Notificações)
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
    termsCheckbox.checked = true; // Marca o checkbox ao aceitar no modal
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

  // Função para enviar código de verificação via WhatsApp (UltraMsg)
  // !!! AVISO DE SEGURANÇA GRAVE: O TOKEN ABAIXO ESTÁ EXPOSTO NO CÓDIGO DO CLIENTE !!!
  // !!! PARA PRODUÇÃO, ESTA CHAMADA DEVE SER MOVIDA PARA UM SERVIDOR BACKEND SEGURO !!!
  async function sendWhatsAppVerificationCode(phoneNumber) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const ULTRA_MSG_TOKEN = 'dklefhlqae1key9l'; // SEU TOKEN AQUI
    const ULTRA_MSG_INSTANCE_ID = 'instance126366'; // SEU ID DE INSTÂNCIA AQUI

    try {
      const response = await fetch(`https://api.ultramsg.com/${ULTRA_MSG_INSTANCE_ID}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ULTRA_MSG_TOKEN,
          to: phoneNumber.replace(/\s/g, ''), // Remove espaços antes de enviar
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

  // Event listener para o envio do formulário
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    document.querySelectorAll('.error-message').forEach(hideError); // Esconde todos os erros antes de revalidar

    let isValid = true;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim().replace(/\s/g, ''); // Remove espaços para validação
    const notificationMethod = notifyEmail.checked ? 'email' : notifyWhatsApp.checked ? 'whatsapp' : '';
    const selectedMunicipio = municipioSelect.value;
    const bairro = bairroInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validações (MANTIDAS)
    if (!name) { showError(nameError, "Nome completot é obrigatório."); isValid = false; }
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

    // Habilita o spinner e desabilita o botão
    if (registerBtn) {
        registerBtn.disabled = true;
        if (registerText) registerText.classList.add('hidden');
        if (registerSpinner) registerSpinner.classList.remove('hidden');
        registerBtn.innerHTML = `<span class="spinner-border" role="status" aria-hidden="true"></span> A criar...`;
    }

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

        } else { // notificationMethod === 'whatsapp'
            // PRIMEIRO: Verifique se o número de telefone já existe no Firestore.
            const userExists = await window.firebaseAuth.checkPhoneNumberExists(phoneNumber);
            if (userExists) {
                throw new Error("Este número de telefone já está registrado.");
            }

            // SEGUNDO: GERE E ENVIE O CÓDIGO VIA UltraMsg
            const verificationCode = await sendWhatsAppVerificationCode(phoneNumber);
            
            // TERCEIRO: Crie o usuário no Firebase Auth (com email fictício)
            // Aqui estamos criando o usuário no Firebase Auth e o documento no Firestore
            // ANTES da verificação do código via UltraMsg.
            // Isso é um ponto chave de diferença da abordagem anterior (Firebase Auth SMS).
            userAuthData = await window.firebaseAuth.registerUser({
                name,
                phoneNumber, // Use o número de telefone real aqui para o Firestore
                password, // A senha será tratada pelo Firebase Auth
                municipio: selectedMunicipio,
                bairro,
                method: 'phone',
                notificationPreference: 'whatsapp'
            });

            // QUARTO: Armazene os dados da verificação no Firestore e o UID do novo usuário.
            // O Firestore será usado para VERIFICAR o código do UltraMsg.
            // Usamos o UID do Firebase Auth User para vincular
            await firebase.firestore().collection('phoneVerifications').doc(userAuthData.user.uid).set({
                phoneNumber: phoneNumber,
                verificationCode: verificationCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                // Remova o password daqui, já foi tratado pelo Firebase Auth
                verified: false
            });

            // Redireciona para a tela de verificação de telefone
            // Armazenamos o UID do usuário para que a tela de verificação saiba qual doc buscar.
            localStorage.setItem('pendingVerificationUserId', userAuthData.user.uid);
            localStorage.setItem('pendingVerificationPhoneNumber', phoneNumber); // Pode ser útil exibir o número
            
            showNotification('success', 'Código de verificação enviado para o seu WhatsApp!');
            setTimeout(() => {
                window.location.href = 'verify-phone.html';
            }, 2000);
        }
    } catch (error) {
        console.error("Erro no registro:", error);
        let userFacingMessage = error.message || 'Erro ao criar conta. Tente novamente.';
        if (error.code) { // Códigos de erro do Firebase Auth
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
          } else { // Erros lançados pelo seu próprio código ou de validação
            if (userFacingMessage.includes("telefone já está registrado")) {
                showError(phoneNumberError, userFacingMessage);
            } else {
                showNotification('error', userFacingMessage);
            }
          }
    } finally {
      if (registerBtn) {
          registerBtn.disabled = false;
          if (registerText) registerText.classList.remove('hidden');
          if (registerSpinner) registerSpinner.classList.add('hidden');
          registerBtn.innerHTML = `<i class="fas fa-user-plus"></i> Criar Conta`;
      }
      isSubmitting = false;
    }
  });

  // Garante que o botão de registro está no estado correto no carregamento
  toggleRegisterButton();
});