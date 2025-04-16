// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVtY6ML3j-qrIsAprIJPB5xFFCbcf4UQw",
    authDomain: "facilita-479b3.firebaseapp.com",
    projectId: "facilita-479b3",
    storageBucket: "facilita-479b3.firebasestorage.app",
    messagingSenderId: "385676676886",
    appId: "1:385676676886:web:6976de7f3abc6c0da94a37"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  
  // Função para login com email e senha
  async function loginWithEmail(emailInput, passwordInput, loginBtn, loginText, loginSpinner, emailError, passwordError) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    // Reset errors
    emailError.style.display = 'none';
    passwordError.style.display = 'none';
  
    // Validate inputs
    if (!email) {
      emailError.textContent = 'Por favor, insira seu email';
      emailError.style.display = 'block';
      return;
    }
  
    if (!password) {
      passwordError.textContent = 'Por favor, insira sua senha';
      passwordError.style.display = 'block';
      return;
    }
  
    // Show loading state
    loginText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';
    loginBtn.disabled = true;
  
    try {
      // Sign in with email and password
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      loginText.style.display = 'inline-block';
      loginSpinner.style.display = 'none';
      loginBtn.disabled = false;
  
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
  
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Nenhum usuário encontrado com este email.';
          emailError.textContent = errorMessage;
          emailError.style.display = 'block';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta. Tente novamente.';
          passwordError.textContent = errorMessage;
          passwordError.style.display = 'block';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido.';
          emailError.textContent = errorMessage;
          emailError.style.display = 'block';
          break;
        default:
          alert(errorMessage);
      }
    }
  }
  
  // Função para login com Google
  async function loginWithGoogle(googleLoginBtn) {
    try {
      googleLoginBtn.disabled = true;
      googleLoginBtn.innerHTML = '<span class="spinner"></span>';
  
      const result = await auth.signInWithPopup(googleProvider);
      const user = result.user;
  
      const userDoc = await db.collection('usuarios').doc(user.uid).get();
  
      if (!userDoc.exists) {
        await db.collection('usuarios').doc(user.uid).set({
          nome: user.displayName || 'Usuário Google',
          email: user.email,
          data_criacao: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
  
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Google login error:', error);
      alert('Erro ao fazer login com Google. Tente novamente.');
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = `
        <span class="google-btn">
          <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google Logo">
          <span>Entrar com Google</span>
        </span>
      `;
    }
  }
  
  // Função para redefinição de senha
  async function resetPassword(forgotPasswordLink) {
    const email = prompt('Por favor, insira seu email para redefinir a senha:');
  
    if (email) {
      try {
        await auth.sendPasswordResetEmail(email);
        alert('Email de redefinição de senha enviado. Verifique sua caixa de entrada.');
      } catch (error) {
        alert('Erro ao enviar email de redefinição. Verifique o email e tente novamente.');
      }
    }
  }
  
  // Função para registro de novo usuário
  async function registerUser(nameInput, emailInput, passwordInput, confirmPasswordInput, registerBtn, registerText, registerSpinner, nameError, emailError, passwordError, confirmPasswordError) {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
  
    // Reset errors
    nameError.style.display = 'none';
    emailError.style.display = 'none';
    passwordError.style.display = 'none';
    confirmPasswordError.style.display = 'none';
  
    // Validate inputs
    if (!name) {
      nameError.textContent = 'Por favor, insira seu nome';
      nameError.style.display = 'block';
      return;
    }
  
    if (!email) {
      emailError.textContent = 'Por favor, insira seu email';
      emailError.style.display = 'block';
      return;
    }
  
    if (!password) {
      passwordError.textContent = 'Por favor, insira sua senha';
      passwordError.style.display = 'block';
      return;
    }
  
    if (password.length < 6) {
      passwordError.textContent = 'A senha deve ter pelo menos 6 caracteres';
      passwordError.style.display = 'block';
      return;
    }
  
    if (password !== confirmPassword) {
      confirmPasswordError.textContent = 'As senhas não coincidem';
      confirmPasswordError.style.display = 'block';
      return;
    }
  
    // Show loading state
    registerText.style.display = 'none';
    registerSpinner.style.display = 'inline-block';
    registerBtn.disabled = true;
  
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
  
      await db.collection('usuarios').doc(user.uid).set({
        nome: name,
        email: email,
        data_criacao: firebase.firestore.FieldValue.serverTimestamp()
      });
  
      window.location.href = 'dashboard.html';
    } catch (error) {
      registerText.style.display = 'inline-block';
      registerSpinner.style.display = 'none';
      registerBtn.disabled = false;
  
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
  
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está em uso.';
          emailError.textContent = errorMessage;
          emailError.style.display = 'block';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido.';
          emailError.textContent = errorMessage;
          emailError.style.display = 'block';
          break;
        case 'auth/weak-password':
          errorMessage = 'A senha é muito fraca.';
          passwordError.textContent = errorMessage;
          passwordError.style.display = 'block';
          break;
        default:
          alert(errorMessage);
      }
    }
  }
  
  // Função para verificar estado de autenticação
  function checkAuthState() {
    auth.onAuthStateChanged(user => {
      if (user) {
        window.location.href = 'dashboard.html';
      }
    });
  }
  
  // Exportar funções para uso em outros arquivos
  window.firebaseAuth = {
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    registerUser,
    checkAuthState
  };