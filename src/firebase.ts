// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBDPU5P7888UnZCwywtYBdiyQLgpKzc7zo",
  authDomain: "fir-ae52e.firebaseapp.com",
  databaseURL: "https://fir-ae52e-default-rtdb.firebaseio.com",
  projectId: "fir-ae52e",
  storageBucket: "fir-ae52e.firebasestorage.app",
  messagingSenderId: "325608837174",
  appId: "1:325608837174:web:240f9ed32233579a31c897"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
