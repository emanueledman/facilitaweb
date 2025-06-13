// js/firebaseAuth.js

const firebaseAuth = {

  async sendVerificationCode(phoneNumber, firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber);
      window.confirmationResult = confirmationResult;
      console.log(`Código de verificação enviado para ${phoneNumber}`);
      return confirmationResult;
    } catch (error) {
      console.error("Erro ao enviar código de verificação:", error);
      throw error;
    }
  },

  async registerUser(name, emailOrPhone, password, municipio, bairro, firebaseApp) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();

    const isEmail = emailOrPhone.includes('@');
    const isPhone = /^\+244(9[1-6]{1}|99)\d{7}$/.test(emailOrPhone); 

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone angolano válido (+2449XXXXXXXX).");
    }

    try {
      let user;

      if (isEmail) {
        const userCredential = await auth.createUserWithEmailAndPassword(emailOrPhone, password);
        user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          name: name,
          email: emailOrPhone,
          municipio: municipio,
          bairro: bairro,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: { email: true, phone: false }
        });
        console.log('Utilizador registado com email e dados salvos no Firestore:', user.uid);
        return user;
      } else {
        localStorage.setItem('pendingVerificationPhoneNumber', emailOrPhone);
        localStorage.setItem('userTempName', name);
        localStorage.setItem('userTempMunicipio', municipio);
        localStorage.setItem('userTempBairro', bairro);
        localStorage.setItem('userTempPassword', password);

        await this.sendVerificationCode(emailOrPhone, firebaseApp);
        
        return { requiresPhoneVerification: true }; 
      }
    } catch (error) {
      console.error("Erro no registo de utilizador:", error);
      throw error;
    }
  },

  async loginUser(credential, password, firebaseApp) {
    const auth = firebaseApp.auth();

    const isEmail = credential.includes('@');
    const isPhone = /^\+244(9[1-6]{1}|99)\d{7}$/.test(credential);

    if (!isEmail && !isPhone) {
      throw new Error("Formato inválido. Use um email ou um número de telefone angolano válido (+2449XXXXXXXX).");
    }

    try {
      let user;

      if (isEmail) {
        const userCredential = await auth.signInWithEmailAndPassword(credential, password);
        user = userCredential.user;
        console.log('Login com email realizado:', user.uid);
        return user;
      } else {
        localStorage.setItem('pendingVerificationPhoneNumber', credential);

        await this.sendVerificationCode(credential, firebaseApp);
        
        return { requiresPhoneVerification: true };
      }
    } catch (error) {
      console.error("Erro ao fazer login de utilizador:", error);
      throw error;
    }
  },

  async loginWithGoogle(firebaseApp) {
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    try {
      const userCredential = await auth.signInWithPopup(googleProvider);
      const user = userCredential.user;

      const userDocRef = db.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        let municipio = prompt("Para personalizar sua experiência, por favor, digite seu município (Ex: Luanda):");
        let bairro = prompt("E agora, digite o nome do seu bairro (Ex: Morro Bento):");

        await userDocRef.set({
          uid: user.uid,
          name: user.displayName || 'Utilizador Google',
          email: user.email,
          municipio: municipio || "Não informado",
          bairro: bairro || "Não informado",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          notificationPreferences: {
            email: true,
            phone: false
          }
        });
        console.log('Novo utilizador Google registado e dados salvos no Firestore.');
      } else {
        console.log('Utilizador Google já existente, carregando perfil.');
      }

      console.log('Login com Google realizado:', user.uid);
      return user;
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      throw error;
    }
  },

  async resetPassword(email, firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      await auth.sendPasswordResetEmail(email);
      console.log('Email de redefinição de senha enviado para:', email);
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      throw error;
    }
  },

  async logout(firebaseApp) {
    const auth = firebaseApp.auth();
    try {
      await auth.signOut();
      console.log('Utilizador desconectado.');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  },

  async getUserData(uid, firebaseApp) {
    const db = firebaseApp.firestore();
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        return doc.data();
      } else {
        console.log("Nenhum documento de utilizador encontrado para o UID:", uid);
        return null;
      }
    } catch (error) {
      console.error("Erro ao obter dados do utilizador:", error);
      throw error;
    }
  },

  async updateUserData(uid, data, firebaseApp) {
    const db = firebaseApp.firestore();
    try {
      await db.collection('users').doc(uid).update(data);
      console.log('Dados do utilizador atualizados com sucesso para o UID:', uid);
    } catch (error) {
      console.error("Erro ao atualizar dados do utilizador:", error);
      throw error;
    }
  },

  onAuthStateChanged: (firebaseApp, callback) => {
    const auth = firebaseApp.auth();
    return auth.onAuthStateChanged(callback);
  }
};