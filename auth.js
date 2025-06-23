const firebaseConfig = {
  apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJJB5xFFCbcf4UQw",
  authDomain: "facilita-479b3.firebaseapp.com",
  databaseURL: "https://facilita-479b3-default-rtdb.firebaseio.com",
  projectId: "facilita-479b3",
  storageBucket: "facilita-479b3.appspot.com",
  messagingSenderId: "385676676886",
  appId: "1:385676676886:web:6976de7f3abc6c0da94a37"
};

const firebaseAuth = {
  _app: null,
  _auth: null,
  _firestore: null,
  _database: null,
  _recaptchaVerifier: null,
  _visitorSessionId: null,

  initializeFirebaseApp(firebaseConfig) {
    console.log("Inicializando Firebase...");
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não carregado.");
    }
    this._app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(firebaseConfig);
    this._auth = firebase.auth();
    this._firestore = firebase.firestore();
    this._database = firebase.database();
    console.log("Firebase inicializado com sucesso.");
    this.trackUserSession(); // Inicializa rastreamento de sessão
  },

  initializeRecaptcha(containerId) {
    console.log(`Inicializando reCAPTCHA no contêiner: ${containerId}...`);
    if (!this._auth) throw new Error("Firebase Auth não inicializado.");
    
    this._recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      size: 'invisible',
      callback: (response) => {
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) registerBtn.disabled = false;
        console.log("reCAPTCHA resolvido:", response);
      },
      'expired-callback': () => {
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) registerBtn.disabled = true;
        console.warn("reCAPTCHA expirado.");
      },
      'error-callback': (error) => {
        console.error("Erro no reCAPTCHA:", error);
        alert("Erro na verificação de segurança. Recarregue a página.");
      }
    });

    return this._recaptchaVerifier.render().catch((err) => {
      console.error("Erro ao renderizar reCAPTCHA:", err);
      throw new Error("Erro ao carregar a verificação de segurança.");
    });
  },

  normalizePhoneNumber(phone) {
    let normalized = phone.replace(/\D/g, '');
    
    if (normalized.startsWith('244') && normalized.length === 12) {
      normalized = '+' + normalized;
    } else if (normalized.startsWith('9') && normalized.length === 9) {
      normalized = '+244' + normalized;
    } else if (!normalized.startsWith('+244')) {
      normalized = '+244' + normalized;
    }

    if (!/^\+2449\d{8}$/.test(normalized)) {
      throw new Error("Formato de telefone inválido. Use 9XXXXXXXX ou +2449XXXXXXXX.");
    }
    return normalized;
  },

  validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) {
      return "Por favor, insira um email válido";
    }
    return null;
  },

  validatePhone(phone) {
    try {
      this.normalizePhoneNumber(phone);
      return null;
    } catch (error) {
      return error.message;
    }
  },

  validatePassword(password) {
    return password.length >= 8 ? null : "A senha deve ter pelo menos 8 caracteres.";
  },

  validateBINumberFormat(biNumber) {
    const biRegex = /^\d{9}[A-Za-z]{2}\d{3}$/;
    return biRegex.test(biNumber);
  },

  async validateBINumber(biNumber) {
    try {
      console.log('Validando BI:', biNumber);
      const response = await fetch(`https://fila-facilita-rp4z.onrender.com/validate-bi/${biNumber}`);
      const data = await response.json();
      
      console.log('Resposta completa:', data);
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        console.error('Erro na resposta:', data);
        throw new Error(data.message || "Erro ao validar BI");
      }
      
      const isValid = data.success || data.sucess || false;
      
      console.log('Resultado da validação:', isValid);
      return isValid;
    } catch (error) {
      console.error("Erro na validação do BI:", error);
      return false;
    }
  },

  async checkIdentifierExists(identifier) {
    try {
      const doc = await this._firestore.collection('authMappings').doc(identifier).get();
      return doc.exists;
    } catch (error) {
      console.error("Erro ao verificar identificador:", error);
      throw new Error("Erro ao verificar identificador. Tente novamente.");
    }
  },

  async registerUser({ fullName, biNumber, email, phoneNumber, password, municipio, bairro, notificationPreferences }) {
    console.log("Iniciando registro de usuário:", { fullName });

    if (!fullName || !biNumber || !email || !phoneNumber || !password || !municipio || !bairro || !notificationPreferences) {
      throw new Error("Por favor, preencha todos os campos obrigatórios.");
    }

    let user;

    try {
      const isBIValid = await this.validateBINumber(biNumber);
      if (!isBIValid) {
        throw new Error("Número de BI inválido ou não encontrado.");
      }

      const emailError = this.validateEmail(email);
      if (emailError) throw new Error(emailError);

      const phoneError = this.validatePhone(phoneNumber);
      if (phoneError) throw new Error(phoneError);

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      const biMapping = await this._firestore.collection('authMappings').doc(biNumber).get();
      if (biMapping.exists) {
        throw new Error("custom/bi-already-in-use");
      }

      const phoneMapping = await this._firestore.collection('authMappings').doc(normalizedPhone).get();
      if (phoneMapping.exists) {
        throw new Error("custom/phone-already-in-use");
      }

      const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
      user = userCredential.user;

      await user.updateProfile({ displayName: fullName });
      await user.sendEmailVerification();
      console.log(`Usuário ${user.uid} registrado via email.`);

      await this._firestore.collection('usuarios').doc(user.uid).set({
        name: fullName,
        biNumber,
        email,
        phoneNumber: normalizedPhone,
        municipio,
        bairro,
        notificationPreferences,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        registrationMethod: 'email'
      });

      await this._firestore.collection('authMappings').doc(biNumber).set({
        uid: user.uid,
        email,
      });

      await this._firestore.collection('authMappings').doc(normalizedPhone).set({
        uid: user.uid,
        email,
      });

      console.log("Dados do usuário salvos no Firestore.");
      return { user, method: 'email', requiresEmailVerification: true };

    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    }
  },

  async login(identifier, password) {
    try {
      let email = identifier;

      if (/^\+?2449\d{8}$|^9\d{8}$/.test(identifier)) {
        const normalizedPhone = this.normalizePhoneNumber(identifier);
        const mapping = await this._firestore.collection('authMappings').doc(normalizedPhone).get();
        if (!mapping.exists) {
          throw new Error("Telefone não registrado.");
        }
        email = mapping.data().email;
      }
      else if (this.validateBINumberFormat(identifier)) {
        const mapping = await this._firestore.collection('authMappings').doc(identifier).get();
        if (!mapping.exists) {
          throw new Error("Bilhete de Identidade não registrado.");
        }
        email = mapping.data().email;
      }
      else {
        const emailError = this.validateEmail(identifier);
        if (emailError) {
          throw new Error("Email inválido.");
        }
      }

      const userCredential = await this._auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        throw new Error("Por favor, verifique seu email antes de fazer login.");
      }

      return user;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  },

  async getCurrentUser() {
    return new Promise((resolve) => {
      const unsubscribe = this._auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  },

  async getUserInfo() {
    const user = await this.getCurrentUser();
    if (user) {
      const userDoc = await this._firestore.collection('usuarios').doc(user.uid).get();
      return {
        isLoggedIn: true,
        uid: user.uid,
        name: user.displayName || userDoc.data()?.name || 'Usuário Registrado',
        email: user.email,
        municipio: userDoc.data()?.municipio || '',
        bairro: userDoc.data()?.bairro || '',
        phoneNumber: userDoc.data()?.phoneNumber || ''
      };
    } else {
      return {
        isLoggedIn: false,
        uid: this._visitorSessionId || 'visitante',
        name: 'Visitante',
        email: null,
        municipio: null,
        bairro: null,
        phoneNumber: null
      };
    }
  },

  trackUserSession() {
    if (!this._visitorSessionId && !this._auth.currentUser) {
      this._visitorSessionId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Sessão de visitante iniciada:", this._visitorSessionId);
      this._firestore.collection('visitorSessions').doc(this._visitorSessionId).set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.error("Erro ao salvar sessão de visitante:", err));
    }
    // Atualiza a última atividade
    if (this._visitorSessionId) {
      this._firestore.collection('visitorSessions').doc(this._visitorSessionId).update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.error("Erro ao atualizar sessão de visitante:", err));
    }
  },

  isGuest() {
    return !this._auth.currentUser;
  },

  async logout() {
    try {
      if (this._visitorSessionId) {
        await this._firestore.collection('visitorSessions').doc(this._visitorSessionId).delete();
        this._visitorSessionId = null;
        console.log("Sessão de visitante encerrada.");
      }
      await this._auth.signOut();
      console.log("Usuário deslogado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deslogar:", error);
      throw error;
    }
  },

  checkAuthState(options = {}) {
    const {
      redirectIfLoggedIn = null,
      redirectIfNotSignedIn = null,
      onGuest = null,
      onLoggedIn = null
    } = options;

    return new Promise((resolve) => {
      this._auth.onAuthStateChanged(async (user) => {
        const currentPath = window.location.pathname;
        const userInfo = await this.getUserInfo();
        
        if (user) {
          if (redirectIfLoggedIn && currentPath !== new URL(redirectIfLoggedIn, window.location.origin).pathname) {
            window.location.href = redirectIfLoggedIn;
          }
          if (onLoggedIn) onLoggedIn(userInfo);
        } else {
          if (redirectIfNotSignedIn && currentPath !== new URL(redirectIfNotSignedIn, window.location.origin).pathname) {
            window.location.href = redirectIfNotSignedIn;
          }
          if (onGuest) onGuest(userInfo);
        }
        resolve(userInfo);
      });
    });
  },
};

try {
  firebaseAuth.initializeFirebaseApp(firebaseConfig);
  window.firebaseAuth = firebaseAuth;
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}