const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
const messaging = firebase.messaging();
let currentUser = null;

// Configurar autenticação com Google
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Navegação entre telas
function navigate(screen) {
  // Lista de telas que não precisam de autenticação
  const publicScreens = ['login', 'register', 'welcome'];
  
  if (!publicScreens.includes(screen) && !currentUser) {
    alert('Por favor, faça login para acessar esta tela.');
    return navigate('login');
  }

  document.querySelectorAll('.content').forEach(content => {
    content.classList.remove('active');
  });
  document.querySelectorAll('.navbar button').forEach(button => {
    button.classList.remove('active');
  });

  document.getElementById(screen).classList.add('active');
  const button = document.querySelector(`.navbar button[onclick="navigate('${screen}')"]`);
  if (button) button.classList.add('active');

  // Ocultar navbar na tela de boas-vindas, login e registro
  document.querySelector('.navbar').style.display = 
    ['welcome', 'login', 'register'].includes(screen) ? 'none' : 'flex';

  // Carregar dados específicos da tela
  if (screen === 'casos') loadCasosData();
  if (screen === 'documents') loadDocumentsData();
  if (screen === 'donations') loadDonationsData();
  if (screen === 'fila_online') loadTicketsData();
  if (screen === 'profile') loadProfileData();
}

// Esconder o splash screen após um tempo
setTimeout(() => {
  document.getElementById('splash-screen').style.display = 'none';
  navigate('welcome');
}, 2000);

// Login com Email/Senha
document.getElementById('login-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      navigate('home');
    })
    .catch(error => {
      alert('Erro ao fazer login: ' + error.message);
    });
});

// Registro com Email/Senha
document.getElementById('register-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      navigate('home');
    })
    .catch(error => {
      alert('Erro ao registrar: ' + error.message);
    });
});

// Login com Google
function signInWithGoogle() {
  auth.signInWithPopup(googleProvider)
    .then(result => {
      currentUser = result.user;
      navigate('home');
    })
    .catch(error => {
      alert('Erro ao fazer login com Google: ' + error.message);
    });
}

// Logout
function signOut() {
  auth.signOut().then(() => {
    currentUser = null;
    alert('Logout realizado com sucesso!');
    navigate('welcome');
  }).catch(error => {
    alert('Erro ao fazer logout: ' + error.message);
  });
}

// Monitorar estado de autenticação
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    console.log('Usuário logado:', user.email);
    // Verifique se o usuário está em uma tela de autenticação
    const currentScreen = document.querySelector('.content.active').id;
    if (['login', 'register'].includes(currentScreen)) {
      navigate('home');
    }
  } else {
    console.log('Nenhum usuário logado.');
    // Não redirecionamos automaticamente para o login mais
  }
  loadProfileData();
});

// Enviar Relatório
document.getElementById('report-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('problem-title').value;
  const description = document.getElementById('problem-description').value;
  db.ref('reports').push({
    title: title,
    description: description,
    userId: currentUser.uid,
    timestamp: Date.now()
  }).then(() => {
    alert('Relatório enviado com sucesso!');
    document.getElementById('report-form').reset();
    navigate('casos');
  }).catch(error => {
    alert('Erro ao enviar relatório: ' + error.message);
  });
});

// Carregar Casos
function loadCasosData() {
  db.ref('reports').once('value', snapshot => {
    const data = snapshot.val();
    const casosList = document.getElementById('casos-list');
    casosList.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, report]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>${report.title}</h2>
          <p>${report.description}</p>
          <p>Data: ${new Date(report.timestamp).toLocaleString()}</p>
        `;
        casosList.appendChild(card);
      });
    } else {
      casosList.innerHTML = '<p>Nenhum caso reportado.</p>';
    }
  });
}

// Enviar Agendamento
document.getElementById('appointment-form').addEventListener('submit', event => {
  event.preventDefault();
  const service = document.getElementById('appointment-service').value;
  const date = document.getElementById('appointment-date').value;
  db.ref('appointments').push({
    service: service,
    date: date,
    userId: currentUser.uid,
    timestamp: Date.now()
  }).then(() => {
    alert('Agendamento realizado com sucesso!');
    document.getElementById('appointment-form').reset();
  }).catch(error => {
    alert('Erro ao agendar: ' + error.message);
  });
});

// Enviar Matrícula
document.getElementById('enrollment-form').addEventListener('submit', event => {
  event.preventDefault();
  const studentName = document.getElementById('student-name').value;
  const schoolName = document.getElementById('school-name').value;
  db.ref('enrollments').push({
    studentName: studentName,
    schoolName: schoolName,
    userId: currentUser.uid,
    timestamp: Date.now()
  }).then(() => {
    alert('Matrícula enviada com sucesso!');
    document.getElementById('enrollment-form').reset();
  }).catch(error => {
    alert('Erro ao enviar matrícula: ' + error.message);
  });
});

// Carregar Documentos
function loadDocumentsData() {
  db.ref('documents').once('value', snapshot => {
    const data = snapshot.val();
    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, doc]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>${doc.title}</h2>
          <p>${doc.description}</p>
        `;
        documentsList.appendChild(card);
      });
    } else {
      documentsList.innerHTML = '<p>Nenhum documento disponível.</p>';
    }
  });
}

// Carregar Doações
function loadDonationsData() {
  db.ref('donations').once('value', snapshot => {
    const data = snapshot.val();
    const donationsList = document.getElementById('donations-list');
    donationsList.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, donation]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>${donation.title}</h2>
          <p>${donation.description}</p>
        `;
        donationsList.appendChild(card);
      });
    } else {
      donationsList.innerHTML = '<p>Nenhuma doação disponível.</p>';
    }
  });
}

// Gerar Senha para Fila Online
function generateTicket() {
  const ticket = {
    userId: currentUser.uid,
    timestamp: Date.now(),
    status: 'pendente'
  };
  db.ref('tickets').push(ticket).then(() => {
    alert('Senha gerada com sucesso!');
    loadTicketsData();
  }).catch(error => {
    alert('Erro ao gerar senha: ' + error.message);
  });
}

// Carregar Senhas da Fila Online
function loadTicketsData() {
  db.ref('tickets').orderByChild('userId').equalTo(currentUser.uid).once('value', snapshot => {
    const data = snapshot.val();
    const ticketList = document.getElementById('ticket-list');
    ticketList.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, ticket]) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>Senha #${id.slice(-5)}</h2>
          <p>Status: ${ticket.status}</p>
          <p>Data: ${new Date(ticket.timestamp).toLocaleString()}</p>
        `;
        ticketList.appendChild(card);
      });
    } else {
      ticketList.innerHTML = '<p>Nenhuma senha gerada.</p>';
    }
  });
}

// Carregar Perfil
function loadProfileData() {
  const profileInfo = document.getElementById('profile-info');
  if (currentUser) {
    profileInfo.innerHTML = `
      <div class="card">
        <h2>Informações do Usuário</h2>
        <p>Email: ${currentUser.email || 'Não informado'}</p>
        <p>ID: ${currentUser.uid}</p>
        <p>Cadastrado em: ${new Date(currentUser.metadata.creationTime).toLocaleString()}</p>
      </div>
    `;
  } else {
    profileInfo.textContent = 'Nenhum usuário logado.';
  }
}

// Configurar notificações push
if (firebase.messaging.isSupported()) {
  messaging.requestPermission().then(() => {
    console.log('Permissão para notificações concedida.');
    return messaging.getToken();
  }).then(token => {
    console.log('Token FCM:', token);
    if (currentUser) {
      db.ref('users/' + currentUser.uid + '/fcmToken').set(token);
    }
  }).catch(error => {
    console.log('Erro ao obter permissão para notificações:', error);
  });

  messaging.onMessage(payload => {
    alert('Nova notificação: ' + payload.notification.title);
  });

  // Registrar Service Worker para notificações em segundo plano
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.log('Erro ao registrar Service Worker:', error);
      });
  }
}