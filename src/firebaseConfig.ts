// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBStq5SiCHgZlo7sv7zwohzT2JMar2Xz_w",
  authDomain: "pywebeditor.firebaseapp.com",
  projectId: "pywebeditor",
  storageBucket: "pywebeditor.appspot.com",
  messagingSenderId: "87504896914",
  appId: "1:87504896914:web:14a46e1df6acc4120a374b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
