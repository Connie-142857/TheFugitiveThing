import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAftf72GCs5HLimScDekNp_yj_RsnuVUsU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "the-fugitive-6aeea.firebaseapp.com",
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL ||
    "https://the-fugitive-6aeea-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "the-fugitive-6aeea",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "the-fugitive-6aeea.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "587069936597",
  appId: env.VITE_FIREBASE_APP_ID || "1:587069936597:web:daf93c7453b7e4c170235c",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-DY6103PYYN",
};

// Initialize Firebase App idempotently
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

// Initialize Firebase App Check when reCAPTCHA v3 site key is configured in browser
const appCheckSiteKey = env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
if (typeof window !== "undefined" && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
