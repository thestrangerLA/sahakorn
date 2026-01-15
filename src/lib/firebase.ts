
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "kaset-stock-manager",
  "appId": "1:772228625471:web:93f2f9fa68522ec202748a",
  "storageBucket": "kaset-stock-manager.appspot.com",
  "apiKey": "AIzaSyBdsGQbRWWD1lafromwVCjPQmAQT9bGboU",
  "authDomain": "kaset-stock-manager.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "772228625471"
};

// Initialize Firebase app as a singleton
const app: FirebaseApp =
  !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firestore database
const db = getFirestore(app);

export { db };
