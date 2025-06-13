// firebaseAuth.js
// This file assumes firebase-app-compat.js, firebase-auth-compat.js, and firebase-firestore-compat.js are loaded BEFORE this script.

// These lines should be REMOVED or commented out if you are initializing
// Firebase globally in your main HTML file and expecting these to be available.
// const firebaseConfig = { ... };
// let auth; // REMOVE THIS IF YOU ARE DECLARING GLOBALLY IN HTML
// let db; // REMOVE THIS IF YOU ARE DECLARING GLOBALLY IN HTML
// let googleProvider; // REMOVE THIS IF YOU ARE DECLARING GLOBALLY IN HTML

// window.addEventListener('DOMContentLoaded', () => {
//   if (typeof firebase !== 'undefined' && !firebase.apps.length) {
//     firebase.initializeApp(firebaseConfig);
//     auth = firebase.auth();
//     db = firebase.firestore();
//     googleProvider = new firebase.auth.GoogleAuthProvider();
//     console.log("Firebase initialized in firebaseAuth.js");
//   } else if (firebase.apps.length) {
//     auth = firebase.auth();
//     db = firebase.firestore();
//     googleProvider = new firebase.auth.GoogleAuthProvider();
//     console.log("Firebase already initialized in firebaseAuth.js");
//   }
// });

// Function to check authentication state
function checkAuthState(callback) {
  // Access global 'auth' variable from the main script
  if (typeof firebase === 'undefined' || !window.auth) { // Use window.auth to access global
    console.error("Firebase Auth not loaded or not globally available. Cannot check auth state.");
    return null;
  }
  return window.auth.onAuthStateChanged(user => { // Use window.auth
    callback(user);
  });
}

// Function for login with email and password
async function loginWithEmail(email, password) {
  if (typeof firebase === 'undefined' || !window.auth) throw new Error("Firebase Auth não inicializado ou não global.");
  try {
    const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error };
  }
}

// Function for login with Google
async function loginWithGoogle() {
  if (typeof firebase === 'undefined' || !window.auth || !window.db) throw new Error("Firebase Auth ou Firestore não inicializado ou não global.");
  try {
    const provider = new firebase.auth.GoogleAuthProvider(); // This can be instantiated here
    const result = await window.auth.signInWithPopup(provider);
    const user = result.user;

    // Check if user exists in Firestore, create if not
    const userDoc = await window.db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      await window.db.collection('users').doc(user.uid).set({
        name: user.displayName || 'Usuário Google',
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    return { success: true, user: user };
  } catch (error) {
    console.error('Google login error:', error);
    return { success: false, error: error };
  }
}

// Function to reset password
async function resetPassword(email) {
  if (typeof firebase === 'undefined' || !window.auth) throw new Error("Firebase Auth não inicializado ou não global.");
  try {
    await window.auth.sendPasswordResetEmail(email);
    return { success: true, message: 'Email de redefinição de senha enviado.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: error };
  }
}

// Function for user registration (simplified, as complex logic is in index.html)
async function registerUser(name, emailOrPhone, password, municipio, bairro, firebaseAppInstance) {
    // This function will likely not be used for phone auth in this specific setup,
    // as phone auth is directly handled in index.html for reCAPTCHA/OTP flow.
    // It's primarily for email registration.
    if (typeof firebase === 'undefined' || !firebaseAppInstance) throw new Error("Firebase App não inicializado.");
    const authInstance = firebaseAppInstance.auth(); // Get auth instance from passed app
    const dbInstance = firebaseAppInstance.firestore(); // Get db instance from passed app

    const isEmail = emailOrPhone.includes('@');

    try {
        let user;
        if (isEmail) {
            const userCredential = await authInstance.createUserWithEmailAndPassword(emailOrPhone, password);
            user = userCredential.user;
            await dbInstance.collection('users').doc(user.uid).set({
                name: name,
                email: user.email,
                municipio: municipio,
                bairro: bairro,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, user: user, requiresPhoneVerification: false };
        } else {
            throw new Error("Phone registration initiation is handled directly by the main script for OTP flow.");
        }
    } catch (error) {
        console.error("Registration error in firebaseAuth.js:", error);
        return { success: false, error: error };
    }
}

// Function for logout
async function logout() {
  if (typeof firebase === 'undefined' || !window.auth) throw new Error("Firebase Auth não inicializado ou não global.");
  try {
    await window.auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error };
  }
}

// Export functions for use in other files
window.firebaseAuth = {
  checkAuthState,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
  registerUser,
  logout
};