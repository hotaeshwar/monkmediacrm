import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyA4bo26wCGVD5QgBGkM8ssIhG57BKtadVI",
  authDomain: "mediacrm-9b0a0.firebaseapp.com",
  projectId: "mediacrm-9b0a0",
  storageBucket: "mediacrm-9b0a0.firebasestorage.app",
  messagingSenderId: "130125988840",
  appId: "1:130125988840:web:424aef19d7ecfc209f1a5d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
