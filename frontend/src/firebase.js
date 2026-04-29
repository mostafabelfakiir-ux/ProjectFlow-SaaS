import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "project-management-98bdc",
  appId: "1:109160710729:web:f514c4ca1edf3f8537f598",
  storageBucket: "project-management-98bdc.firebasestorage.app",
  apiKey: "AIzaSyA7vb7cR_8Qh0sJhXnT2jADitw5qbmCMQs",
  authDomain: "project-management-98bdc.firebaseapp.com",
  messagingSenderId: "109160710729",
  measurementId: "G-MYCTPKHBQF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
