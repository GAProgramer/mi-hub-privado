// Tus llaves originales del Hub
const firebaseConfig = {
    apiKey: "AIzaSyAoZ2tUJfI-TD_BGTeH5cPIfUGypZI6NTw",
    authDomain: "hub-de-proyectos-52620.firebaseapp.com",
    projectId: "hub-de-proyectos-52620",
    storageBucket: "hub-de-proyectos-52620.firebasestorage.app",
    messagingSenderId: "886778136503",
    appId: "1:886778136503:web:b0e1daf852dc36dc860a32",
    measurementId: "G-RFCRYDF89R"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firestore (Base de datos)
const db = firebase.firestore();