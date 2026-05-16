import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  projectId: "janati-flow-v1112233",
  appId: "1:263040292540:web:bdd9a5134a2435313522b9",
  storageBucket: "janati-flow-v1112233.firebasestorage.app",
  apiKey: "AIzaSyB3OtFp_4skxTWWcs_qEANnICr1bUiGQE0",
  authDomain: "janati-flow-v1112233.firebaseapp.com",
  messagingSenderId: "263040292540",
  measurementId: "G-MYCTPKHBQF" // This may vary but usually it's fine
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
