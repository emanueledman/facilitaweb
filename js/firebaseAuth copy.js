const firebaseAuth = (function() {
  let firebaseApp;
  let auth;
  let db;
  let recaptchaVerifier;

  function initializeFirebaseApp(config) {
    if (!firebase) {
      throw new Error("Firebase SDK não está disponível.");
    }
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error("Configuração do Firebase inválida.");
    }
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
        auth = firebase.auth();
        db = firebase.firestore();
      } else {
        firebaseApp = firebase.app();
        auth = firebase.auth();
        db = firebase.firestore();
      }
    } catch (error) {
      throw new Error(`Falha na inicialização do Firebase: ${error.message}`);
    }
  }

  function checkAuthState(redirectUrl, callback) {
    if (!auth) {
      throw new Error("Autenticação Firebase não inicializada.");
    }
    auth.onAuthStateChanged((user) => {
      if (user) {
        window.location.href = redirectUrl;
      } else if (callback) {
        callback();
      }
    });
  }

  function initializeRecaptcha(containerId) {
    return new Promise((resolve, reject) => {
      if (!firebase.auth.RecaptchaVerifier) {
        reject(new Error("reCAPTCHA não disponível no Firebase Auth."));
        return;
      }
      try {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
          'size': 'normal',
          'callback': () => {
            window.recaptchaCallback && window.recaptchaCallback();
            resolve();
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
        recaptchaVerifier.render().then(() => {
          resolve();
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Formato de email inválido';
  }

  function validatePhone(phone) {
    const phoneRegex = /^\+2449\d{8}$/;
    return phoneRegex.test(phone) ? null : 'Número de telefone inválido';
  }

  function normalizePhoneNumber(phone) {
    return phone.replace(/\s/g, '');
  }

  function validatePassword(password) {
    if (password.length < 6) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    return null;
  }

  async function registerUserWithEmail(name, email, password, municipio, bairro) {
    if (!auth || !db) {
      throw new Error("Firebase Auth ou Firestore não inicializados.");
    }
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await user.updateProfile({ displayName: name });
    await db.collection('users').doc(user.uid).set({
      name,
      email,
      municipio,
      bairro,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await user.sendEmailVerification();
    return user;
  }

  async function initiatePhoneRegistration(name, phoneNumber, municipio, bairro) {
    if (!auth || !recaptchaVerifier) {
      throw new Error("Firebase Auth ou reCAPTCHA não inicializados.");
    }
    const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    sessionStorage.setItem('registrationData', JSON.stringify({
      name,
      phoneNumber,
      municipio,
      bairro
    }));
  }

  return {
    initializeFirebaseApp,
    checkAuthState,
    initializeRecaptcha,
    validateEmail,
    validatePhone,
    normalizePhoneNumber,
    validatePassword,
    registerUserWithEmail,
    initiatePhoneRegistration
  };
})();