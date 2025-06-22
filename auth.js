const firebaseConfig = {
  apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJPB5xFFCbcf4UQw",
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
  _recaptchaVerifier: null,

  initializeFirebaseApp(firebaseConfig) {
    console.log("Inicializando Firebase...");
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não carregado.");
    }
    this._app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    this._auth = firebase.auth();
    this._firestore = firebase.firestore();
    console.log("Firebase inicializado com sucesso.");
  },

  initializeRecaptcha(containerId) {
    console.log(`Inicializando reCAPTCHA no contêiner: ${containerId}...`);
    if (!this._auth) throw new Error("Firebase Auth não inicializado.");
    
    this._recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      size: 'invisible',
      callback: (response) => {
        document.getElementById('registerBtn').disabled = false;
        console.log("reCAPTCHA resolvido:", response);
      },
      'expired-callback': () => {
        document.getElementById('registerBtn').disabled = true;
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
    let finalEmail = email;

    try {
      // Validar BI
      const isBIValid = await this.validateBINumber(biNumber);
      if (!isBIValid) {
        throw new Error("Número de BI inválido ou não encontrado.");
      }

      // Validar email
      const emailError = this.validateEmail(email);
      if (emailError) throw new Error(emailError);

      // Validar telefone
      const phoneError = this.validatePhone(phoneNumber);
      if (phoneError) throw new Error(phoneError);

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Verificar se BI ou telefone já estão em uso
      const biMapping = await this._firestore.collection('authMappings').doc(biNumber).get();
      if (biMapping.exists) {
        throw new Error("custom/bi-already-in-use");
      }

      const phoneMapping = await this._firestore.collection('authMappings').doc(normalizedPhone).get();
      if (phoneMapping.exists) {
        throw new Error("custom/phone-already-in-use");
      }

      // Criar usuário com email
      const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
      user = userCredential.user;

      await user.updateProfile({ displayName: fullName });
      await user.sendEmailVerification();
      console.log(`Usuário ${user.uid} registrado via email.`);

      // Salvar dados no Firestore na coleção 'usuarios'
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

      // Criar mapeamento de BI e telefone para autenticação
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

      // Verificar se o identificador é um número de telefone
      if (/^\+?2449\d{8}$|^9\d{8}$/.test(identifier)) {
        const normalizedPhone = this.normalizePhoneNumber(identifier);
        const mapping = await this._firestore.collection('authMappings').doc(normalizedPhone).get();
        if (!mapping.exists) {
          throw new Error("Telefone não registrado.");
        }
        email = mapping.data().email;
      }
      // Verificar se o identificador é um BI
      else if (this.validateBINumberFormat(identifier)) {
        const mapping = await this._firestore.collection('authMappings').doc(identifier).get();
        if (!mapping.exists) {
          throw new Error("Bilhete de Identidade não registrado.");
        }
        email = mapping.data().email;
      }
      // Caso contrário, assumir que é um email
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

  checkAuthState(redirectIfLoggedIn, redirectIfNotSignedIn) {
    this._auth.onAuthStateChanged((user) => {
      const currentPath = window.location.pathname;

      if (user && redirectIfLoggedIn && currentPath !== new URL(redirectIfLoggedIn, window.location.origin).pathname) {
        window.location.href = redirectIfLoggedIn;
      } else if (!user && redirectIfNotSignedIn && currentPath !== new URL(redirectIfNotSignedIn, window.location.origin).pathname) {
        window.location.href = redirectIfNotSignedIn;
      }
    });
  },
};

// Inicializar Firebase
firebaseAuth.initializeFirebaseApp(firebaseConfig);

// Expor firebaseAuth globalmente
window.firebaseAuth = firebaseAuth;