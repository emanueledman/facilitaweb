// Configuração do Firebase (Substitua pelos seus dados reais)
const firebaseConfig = {
  apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJJB5xFFCbcf4UQw",
  authDomain: "facilita-479b3.firebaseapp.com",
  projectId: "facilita-479b3",
  storageBucket: "facilita-479b3.appspot.com",
  messagingSenderId: "385676676886",
  appId: "1:385676676886:web:6976de7f3abc6c0da94a37",
  databaseURL: "https://facilita-479b3-default-rtdb.firebaseio.com/"
};

let firebaseApp;
let currentUser = null;

// Inicialização do AOS e Firebase
window.addEventListener('load', () => {
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
  });

  // Inicializar Firebase
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        try {
          const { user: anonymousUser } = await firebase.auth().signInAnonymously();
          currentUser = anonymousUser;
          document.getElementById('authPrompt').style.display = 'block';
        } catch (error) {
          console.error("Erro ao logar como visitante:", error);
        }
      } else {
        currentUser = user;
        if (!user.isAnonymous) {
          // Carregar dados do usuário do Firestore
          const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            localStorage.setItem('userData', JSON.stringify({
              name: userData.name,
              municipality: userData.municipio,
              neighborhood: userData.bairro
            }));
          }
        }
      }
      updateAuthUI(user);
      loadFormContent();
    });
  } else if (firebase.apps.length) {
    firebaseApp = firebase.app();
    firebase.auth().onAuthStateChanged((user) => {
      currentUser = user;
      updateAuthUI(user);
      loadFormContent();
    });
  }
  checkCookieConsent();
});

// Efeito de scroll na navbar
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Estado do formulário
let currentStep = 0;
let formData = {
  title: '',
  category: 'Buraco',
  urgency: 'Média',
  description: '',
  suggestion: '',
  images: [],
  latitude: null,
  longitude: null,
  municipality: '',
  neighborhood: '',
  imagePreviewUrls: [],
  anonymous: false,
  whatsappNumber: ''
};
let map, marker;

// Dados de municípios e bairros
const municipalitiesAndNeighborhoods = {
  'Belas': [
    'Morro Bento', 'Benfica', 'Vila Estoril', 'Kilamba', 'Barra do Kwanza',
    'Cabolombo', 'Quifica', 'Gamek', 'Salvador Allende', 'Quenguela', 'Ramiros',
    'Vila Verde'
  ],
  'Cacuaco': [
    'Kikolo', 'Sequele', 'Mulenvos', 'Cacuaco Praia', 'Kiaxi Grande', '4 de Fevereiro',
    'Baía do Bengo', 'Kifangondo', 'Funda', 'Cabiri', 'Panguila', 'Quicolo',
    'Quixinge', 'Quilómetro 30', 'Quilómetro 36', 'Quilómetro 40',
    'Quilómetro 42', 'Quilómetro 44', 'Quilómetro 45', 'Quilómetro 50'
  ],
  'Cazenga': [
    'Hoji Ya Henda', '11 de Novembro', 'Kima Kienda', 'São Pedro', 'Tala Hady',
    'Cazenga Popular', 'Kabolombota', 'Kambamba', 'Kassa Kala', 'Kawa',
    'Kicolo', 'Kilemba', 'Kimbamba', 'Kimbango', 'Kinda', 'Kintambi',
    'Kipata', 'Kuanza', 'Kueio', 'Mabor', 'Marçal', 'Ngola Kiluange'
  ],
  'Ícolo e Bengo': [
    'Catete', 'Bom Jesus', 'Caculo Cahango', 'Cassoneca', 'Demba Chio', 'Kibaxe',
    'Kicabo', 'Kikabo', 'Kixico', 'Muxima', 'Panguila', 'Quiminha', 'Quixinge',
    'Tabi', 'Zenza do Itombe'
  ],
  'Luanda': [
    'Maianga', 'Ingombota', 'Maculusso', 'Sambizanga', 'Rangel', 'Kinaxixi', 'Prenda',
    'Bairro Operário', 'Bairro Azul', 'Bairro Popular', 'Samba', 'Rocha Pinto',
    'São Paulo', 'Uíge', 'Vila Alice', 'Vila Flor', 'Vila Verde', 'Marçal',
    'Ngola Kiluange', 'Kuanza', 'Kilemba', 'Kintambi', 'Kimbamba', 'Kimbango',
    'Kinda', 'Kipata', 'Kueio', 'Luanda Sul', 'Mabor', 'Maculusso', 'Palmeirinhas'
  ],
  'Quiçama': [
    'Quiçama', 'Cabo Ledo', 'Demba Chio', 'Kissama', 'Mumbondo', 'Quiminha',
    'Quixinge', 'Zenza do Itombe'
  ],
  'Kilamba Kiaxi': [
    'Palanca', 'Golfe', 'Cassequel', 'Sapú', 'Camama', 'Cidade Universitária',
    'Bairro da Paz', 'Boavista'
  ],
  'Talatona': [
    'Futungo de Belas', 'Camama', 'Vida Pacífica', 'Benfica', 'Vila Estoril',
    'Cabolombo', 'Quifica', 'Gamek', 'Salvador Allende', 'Quenguela', 'Ramiros',
    'Vila Verde'
  ],
  'Viana': [
    'Estalagem', 'Zango', 'Viana Centro', 'Baía', 'Funda', 'Cabiri', 'Panguila',
    'Bom Jesus', 'Cabo Ledo', '4 de Fevereiro', 'Kikolo', 'Sequele', 'Cacuaco Praia',
    'Kiaxi Grande', 'Kifangondo', 'Quicolo', 'Quixinge', 'Quilómetro 30',
    'Quilómetro 36', 'Quilómetro 40', 'Quilómetro 42', 'Quilómetro 44',
    'Quilómetro 45', 'Quilómetro 50'
  ]
};

// Categorias e urgências
const categories = [
  { name: 'Buraco', icon: 'fa-exclamation-triangle', color: '#f59e0b' },
  { name: 'Lixo', icon: 'fa-trash', color: '#4CAF50' },
  { name: 'Iluminação', icon: 'fa-lightbulb', color: '#FFC107' },
  { name: 'Água', icon: 'fa-tint', color: '#2196F3' },
  { name: 'Segurança', icon: 'fa-shield-alt', color: '#DC3545' },
  { name: 'Estrada', icon: 'fa-road', color: '#607D8B' },
  { name: 'Transporte', icon: 'fa-bus', color: '#9C27B0' },
  { name: 'Outros', icon: 'fa-ellipsis-h', color: '#7F8C8D' }
];

const urgencies = [
  { level: 'Baixa', icon: 'fa-thermometer-empty', color: '#4CAF50' },
  { level: 'Média', icon: 'fa-thermometer-half', color: '#FF9800' },
  { level: 'Alta', icon: 'fa-thermometer-full', color: '#DC3545' }
];

// Funções de manipulação de erros
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

function hideError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}

// Salvar estado do formulário no localStorage
function saveFormState() {
  localStorage.setItem('fixabairro_form', JSON.stringify({ currentStep, formData }));
}

// Carregar estado do formulário do localStorage
function loadFormState() {
  const savedState = localStorage.getItem('fixabairro_form');
  if (savedState) {
    const { currentStep: savedStep, formData: savedFormData } = JSON.parse(savedState);
    currentStep = savedStep;
    formData = { ...formData, ...savedFormData };
    updateFormUI();
  }
}

// Atualizar interface de autenticação
function updateAuthUI(user) {
  const authButton = document.getElementById('authButton');
  if (user && !user.isAnonymous) {
    authButton.textContent = 'Perfil';
    authButton.href = 'profile.html';
  } else {
    authButton.textContent = 'Entrar';
    authButton.href = 'login.html';
  }
}

// Carregar conteúdo do formulário
function loadFormContent() {
  const formContent = document.getElementById('formContent');
  formContent.innerHTML = `
    <div class="stepper" data-step="${currentStep}">
      <div class="step ${currentStep >= 0 ? 'active' : ''} ${currentStep > 0 ? 'completed' : ''}">
        <div class="step-circle">1</div>
        <div class="step-title">Problema</div>
      </div>
      <div class="step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}">
        <div class="step-circle">2</div>
        <div class="step-title">Localização</div>
      </div>
      <div class="step ${currentStep >= 2 ? 'active' : ''}">
        <div class="step-circle">3</div>
        <div class="step-title">Detalhes</div>
      </div>
    </div>
    <form id="reportForm">
      ${getStepContent(currentStep)}
      <div class="btn-navigation">
        <button type="button" class="btn-outline-secondary-dark" id="prevBtn" ${currentStep === 0 ? 'disabled' : ''}>Voltar</button>
        <button type="button" class="btn-main" id="nextBtn">${currentStep === 2 ? 'Enviar Relato' : 'Próximo'}</button>
      </div>
    </form>
  `;
  initializeStep();
}

// Obter conteúdo de cada etapa
function getStepContent(step) {
  switch (step) {
    case 0:
      return `
        <h2 class="section-title">Descreva o Problema</h2>
        <div class="form-group">
          <label for="problemTitle">Título do Problema</label>
          <input type="text" class="form-control" id="problemTitle" value="${formData.title}" placeholder="Ex.: Buraco na Rua Principal" required>
          <div class="error-message" id="problemTitleError"></div>
        </div>
        <div class="form-group">
          <label>Selecione a Categoria</label>
          <div class="category-grid">
            ${categories.map(category => `
              <div class="category-chip ${formData.category === category.name ? 'selected' : ''}" data-category="${category.name}">
                <i class="${category.icon}" style="color: ${category.color};"></i>
                ${category.name}
              </div>
            `).join('')}
          </div>
          <div class="error-message" id="categoryError"></div>
        </div>
        <div class="form-group">
          <label>Urgência</label>
          <div class="urgency-radio">
            ${urgencies.map(urgency => `
              <input type="radio" name="urgency" id="urgency${urgency.level}" value="${urgency.level}" ${formData.urgency === urgency.level ? 'checked' : ''} required>
              <label for="urgency${urgency.level}">
                <i class="${urgency.icon}" style="color: ${urgency.color};"></i>
                ${urgency.level}
              </label>
            `).join('')}
          </div>
          <div class="error-message" id="urgencyError"></div>
        </div>
      `;
    case 1:
      return `
        <h2 class="section-title">Indique a Localização</h2>
        <div class="form-group">
          <label for="municipality">Município</label>
          <div class="select-container">
            <select class="form-control" id="municipality" required>
              <option value="">Selecione o Município</option>
              ${Object.keys(municipalitiesAndNeighborhoods).map(m => `
                <option value="${m}" ${formData.municipality === m ? 'selected' : ''}>${m}</option>
              `).join('')}
            </select>
          </div>
          <div class="error-message" id="municipalityError"></div>
        </div>
        <div class="form-group">
          <label for="neighborhood">Bairro</label>
          <div class="select-container">
            <select class="form-control" id="neighborhood" required>
              <option value="">Selecione o Bairro</option>
            </select>
          </div>
          <div class="error-message" id="neighborhoodError"></div>
        </div>
        <div class="map-container" id="map"></div>
        <div class="error-message" id="mapError"></div>
      `;
    case 2:
      return `
        <h2 class="section-title">Detalhes Adicionais</h2>
        <div class="form-group">
          <label for="description">Descrição do Problema</label>
          <textarea class="form-control" id="description" rows="5" placeholder="Descreva o problema em detalhes..." required>${formData.description}</textarea>
          <div class="error-message" id="descriptionError"></div>
        </div>
        <div class="form-group">
          <label for="suggestion">Sugestão de Solução (Opcional)</label>
          <textarea class="form-control" id="suggestion" rows="3" placeholder="Tem alguma sugestão para resolver este problema?">${formData.suggestion}</textarea>
        </div>
        <div class="form-group">
          <label>Enviar como Anônimo</label>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="anonymous" ${formData.anonymous ? 'checked' : ''}>
            <label class="form-check-label" for="anonymous">Sim, enviar anonimamente</label>
          </div>
        </div>
        <div class="form-group">
          <label for="whatsappNumber">Número de WhatsApp (Opcional)</label>
          <input type="tel" class="form-control" id="whatsappNumber" value="${formData.whatsappNumber}" placeholder="+2449XXXXXXXX">
          <div class="error-message" id="whatsappNumberError"></div>
        </div>
        <div class="form-group">
          <label for="images">Fotos do Problema (Máximo 5)</label>
          <div class="image-upload-container" id="imageUpload">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Arraste e solte imagens aqui ou clique para selecionar (JPEG, PNG, até 5MB cada)</p>
            <input type="file" id="images" accept="image/jpeg,image/png" multiple style="display: none;">
          </div>
          <div class="image-preview-container" id="imagePreviewContainer">
            ${formData.imagePreviewUrls.length ? `
              <div class="image-preview-carousel">
                ${formData.imagePreviewUrls.map(url => `
                  <img src="${url}" class="image-preview-item" alt="Pré-visualização da imagem">
                `).join('')}
              </div>
            ` : `
              <div class="image-placeholder-text">
                <i class="fas fa-image"></i>
                <p>Sem imagens selecionadas</p>
              </div>
            `}
          </div>
          <div class="counter-text" id="imageCounter">0/5 imagens selecionadas</div>
          <div class="error-message" id="imagesError"></div>
        </div>
      `;
  }
}

// Inicializar etapa
function initializeStep() {
  // Adicionar manipuladores de eventos
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  prevBtn?.addEventListener('click', prevStep);
  nextBtn?.addEventListener('click', nextStep);

  if (currentStep === 0) {
    document.getElementById('problemTitle')?.addEventListener('input', (e) => {
      formData.title = e.target.value;
      saveFormState();
    });
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        formData.category = chip.dataset.category;
        saveFormState();
      });
    });
    document.querySelectorAll('input[name="urgency"]').forEach(input => {
      input.addEventListener('change', (e) => {
        formData.urgency = e.target.value;
        saveFormState();
      });
    });
  } else if (currentStep === 1) {
    initializeMap();
    const municipalitySelect = document.getElementById('municipality');
    const neighborhoodSelect = document.getElementById('neighborhood');
    municipalitySelect?.addEventListener('change', (e) => {
      formData.municipity = e.target.value;
      updateNeighborhoods();
      saveFormState();
    });
    neighborhoodSelect?.addEventListener('change', (e) => {
      formData.neighborhood = e.target.value;
      saveFormState();
    });
    updateNeighborhoods();
  } else if (currentStep === 2) {
    document.getElementById('description')?.addEventListener('input', (e) => {
      formData.description = e.target.value;
      saveFormState();
    });
    document.getElementById('suggestion')?.addEventListener('input', (e) => {
      formData.suggestion = e.target.value;
      saveFormState();
    });
    document.getElementById('anonymous')?.addEventListener('change', (e) => {
      formData.anonymous = e.target.checked;
      saveFormState();
    });
    document.getElementById('whatsappNumber')?.addEventListener('input', (e) => {
      formData.whatsappNumber = e.target.value;
      saveFormState();
    });
    initializeImageUpload();
  }
}

// Inicializar mapa
function initializeMap() {
  if (!map) {
    map = L.map('map').setView([-8.838333, 13.234444], 12); // Centro de Luanda
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('click', (e) => {
      formData.latitude = e.latlng.lat;
      formData.longitude = e.latlng.lng;
      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }
      saveFormState();
    });
    if (formData.latitude && formData.longitude) {
      marker = L.marker([formData.latitude, formData.longitude]).addTo(map);
      map.setView([formData.latitude, formData.longitude], 15);
    }
  }
}

// Atualizar bairros com base no município selecionado
function updateNeighborhoods() {
  const municipalitySelect = document.getElementById('municipality');
  const neighborhoodSelect = document.getElementById('neighborhood');
  if (municipalitySelect && neighborhoodSelect) {
    const selectedMunicipality = municipalitySelect.value;
    neighborhoodSelect.innerHTML = '<option value="">Selecione o Bairro</option>';
    if (selectedMunicipality && municipalitiesAndNeighborhoods[selectedMunicipality]) {
      municipalitiesAndNeighborhoods[selectedMunicipality].forEach(neighborhood => {
        const option = document.createElement('option');
        option.value = neighborhood;
        option.textContent = neighborhood;
        if (formData.neighborhood === neighborhood) {
          option.selected = true;
        }
        neighborhoodSelect.appendChild(option);
      });
    }
  }
}

// Inicializar upload de imagens
function initializeImageUpload() {
  const imageUpload = document.getElementById('imageUpload');
  const imageInput = document.getElementById('images');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imageCounter = document.getElementById('imageCounter');

  imageUpload?.addEventListener('click', () => imageInput.click());
  imageUpload?.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUpload.style.borderColor = '#FF5722';
  });
  imageUpload?.addEventListener('dragleave', () => {
    imageUpload.style.borderColor = '#2196F3';
  });
  imageUpload?.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUpload.style.borderColor = '#2196F3';
    handleImages(e.dataTransfer.files);
  });
  imageInput?.addEventListener('change', (e) => {
    handleImages(e.target.files);
  });

  function handleImages(files) {
    const newFiles = Array.from(files).slice(0, 5 - formData.images.length);
    newFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        showError('imagesError', 'Cada imagem deve ter até 5MB.');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showError('imagesError', 'Apenas imagens JPEG ou PNG são permitidas.');
        return;
      }
      formData.images.push(file);
      const url = URL.createObjectURL(file);
      formData.imagePreviewUrls.push(url);
    });
    updateImagePreview();
    saveFormState();
  }

  function updateImagePreview() {
    if (formData.imagePreviewUrls.length) {
      imagePreviewContainer.innerHTML = `
        <div class="image-preview-carousel">
          ${formData.imagePreviewUrls.map(url => `
            <img src="${url}" class="image-preview-item" alt="Pré-visualização da imagem">
          `).join('')}
        </div>
      `;
    } else {
      imagePreviewContainer.innerHTML = `
        <div class="image-placeholder-text">
          <i class="fas fa-image"></i>
          <p>Sem imagens selecionadas</p>
        </div>
      `;
    }
    imageCounter.textContent = `${formData.images.length}/5 imagens selecionadas`;
  }
}

// Navegar para a etapa anterior
function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    loadFormContent();
    saveFormState();
  }
}

// Navegar para a próxima etapa ou enviar
async function nextStep() {
  if (await validateStep(currentStep)) {
    if (currentStep < 2) {
      currentStep++;
      loadFormContent();
      saveFormState();
    } else {
      await submitReport();
    }
  }
}

// Validar etapa atual
async function validateStep(step) {
  let isValid = true;
  if (step === 0) {
    const title = document.getElementById('problemTitle').value.trim();
    if (!title) {
      showError('problemTitleError', 'O título é obrigatório.');
      isValid = false;
    } else {
      hideError('problemTitleError');
    }
    if (!formData.category) {
      showError('categoryError', 'Selecione uma categoria.');
      isValid = false;
    } else {
      hideError('categoryError');
    }
    if (!formData.urgency) {
      showError('urgencyError', 'Selecione o nível de urgência.');
      isValid = false;
    } else {
      hideError('urgencyError');
    }
  } else if (step === 1) {
    const municipality = document.getElementById('municipality').value;
    const neighborhood = document.getElementById('neighborhood').value;
    if (!municipality) {
      showError('municipalityError', 'Selecione o município.');
      isValid = false;
    } else {
      hideError('municipalityError');
    }
    if (!neighborhood) {
      showError('neighborhoodError', 'Selecione o bairro.');
      isValid = false;
    } else {
      hideError('neighborhoodError');
    }
    if (!formData.latitude || !formData.longitude) {
      showError('mapError', 'Selecione uma localização no mapa.');
      isValid = false;
    } else {
      hideError('mapError');
    }
  } else if (step === 2) {
    const description = document.getElementById('description').value.trim();
    const whatsappNumber = document.getElementById('whatsappNumber').value.trim();
    if (!description) {
      showError('descriptionError', 'A descrição é obrigatória.');
      isValid = false;
    } else {
      hideError('descriptionError');
    }
    if (whatsappNumber && !/^\+2449\d{8}$/.test(whatsappNumber)) {
      showError('whatsappNumberError', 'Número inválido. Use o formato +2449XXXXXXXX.');
      isValid = false;
    } else {
      hideError('whatsappNumberError');
    }
  }
  return isValid;
}

// Enviar relato
async function submitReport() {
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.disabled = true;
  nextBtn.innerHTML = 'Enviando <span class="spinner"></span>';

  try {
    const reportData = {
      ...formData,
      userId: formData.anonymous ? null : currentUser.uid,
      status: 'Aberto',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await firebase.firestore().collection('reports').add(reportData);
    if (formData.images.length) {
      const imageUrls = [];
      for (const [index, file] of formData.images.entries()) {
        const storageRef = firebase.storage().ref(`reports/${docRef.id}/image_${index}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        imageUrls.push(url);
      }
      await docRef.update({ imageUrls });
    }

    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    document.getElementById('modalTitle').textContent = formData.title;
    document.getElementById('modalProblemId').textContent = docRef.id;
    document.getElementById('modalLocation').textContent = `${formData.neighborhood}, ${formData.municipality}`;
    document.getElementById('modalMessage').textContent = formData.anonymous
      ? 'Seu relato foi enviado anonimamente. Guarde o ID para acompanhar o status.'
      : 'Seu relato foi enviado com sucesso! Acompanhe o progresso na sua conta.';
    document.getElementById('modalDetailsLink').href = `report-details.html?id=${docRef.id}`;
    if (formData.anonymous || currentUser.isAnonymous) {
      document.getElementById('modalLoginLink').style.display = 'inline-block';
    }
    successModal.show();

    // Limpar formulário
    currentStep = 0;
    formData = {
      title: '',
      category: 'Buraco',
      urgency: 'Média',
      description: '',
      suggestion: '',
      images: [],
      latitude: null,
      longitude: null,
      municipality: '',
      neighborhood: '',
      imagePreviewUrls: [],
      anonymous: false,
      whatsappNumber: ''
    };
    localStorage.removeItem('fixabairro_form');
  } catch (error) {
    console.error('Erro ao enviar relato:', error);
    showError('formContent', 'Erro ao enviar o relato. Tente novamente.');
  } finally {
    nextBtn.disabled = false;
    nextBtn.innerHTML = 'Enviar Relato';
  }
}

// Verificar status do relato
document.getElementById('checkReportBtn')?.addEventListener('click', async () => {
  const reportId = document.getElementById('checkReportId').value.trim();
  if (!reportId) {
    showError('checkReportId', 'Digite um ID de relato válido.');
    return;
  }
  try {
    const doc = await firebase.firestore().collection('reports').doc(reportId).get();
    if (doc.exists) {
      const data = doc.data();
      alert(`Status do Relato ${reportId}: ${data.status}\nTítulo: ${data.title}\nLocalização: ${data.neighborhood}, ${data.municipality}`);
    } else {
      showError('checkReportId', 'Relato não encontrado.');
    }
  } catch (error) {
    console.error('Erro ao verificar relato:', error);
    showError('checkReportId', 'Erro ao verificar o relato. Tente novamente.');
  }
});

// Login com telefone
document.getElementById('phoneLoginBtn')?.addEventListener('click', () => {
  const phoneLoginModal = new bootstrap.Modal(document.getElementById('phoneLoginModal'));
  phoneLoginModal.show();
});

document.getElementById('sendOtpBtn')?.addEventListener('click', async () => {
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  if (!/^\+2449\d{8}$/.test(phoneNumber)) {
    showError('phoneNumberError', 'Número inválido. Use o formato +2449XXXXXXXX.');
    return;
  }
  try {
    const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible'
    });
    const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    document.getElementById('otpGroup').style.display = 'block';
    document.getElementById('sendOtpBtn').style.display = 'none';
    document.getElementById('verifyOtpBtn').style.display = 'inline-block';
  } catch (error) {
    console.error('Erro ao enviar OTP:', error);
    showError('phoneNumberError', 'Erro ao enviar o código. Tente novamente.');
  }
});

document.getElementById('verifyOtpBtn')?.addEventListener('click', async () => {
  const otpCode = document.getElementById('otpCode').value.trim();
  if (otpCode.length !== 6) {
    showError('otpError', 'O código OTP deve ter 6 dígitos.');
    return;
  }
  try {
    const result = await window.confirmationResult.confirm(otpCode);
    const user = result.user;
    currentUser = user;
    const phoneLoginModal = bootstrap.Modal.getInstance(document.getElementById('phoneLoginModal'));
    phoneLoginModal.hide();
    updateAuthUI(user);
    loadFormContent();
  } catch (error) {
    console.error('Erro ao verificar OTP:', error);
    showError('otpError', 'Código inválido ou expirado. Tente novamente.');
  }
});

// Gerenciar consentimento de cookies
function checkCookieConsent() {
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) {
    document.getElementById('cookieConsentBanner').classList.add('show');
  }
}

document.getElementById('acceptCookies')?.addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'accepted');
  document.getElementById('cookieConsentBanner').classList.remove('show');
});

document.getElementById('rejectCookies')?.addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'rejected');
  document.getElementById('cookieConsentBanner').classList.remove('show');
});