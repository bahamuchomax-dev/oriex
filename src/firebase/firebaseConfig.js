// Firebase web config.
//
// Values are read from Vite env vars (see .env.example). If a var is missing,
// we fall back to the config that was embedded in the v6.9 dist (project
// genro-b74de) so the app still boots during early development.
//
// A Firebase web apiKey is safe to expose in client code; real protection comes
// from Firestore Security Rules, not from hiding this key.

const env = import.meta.env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCEO17iTlONLG4j6LwQu_bPp1HqSxj5qbk",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "genro-b74de.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "genro-b74de",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "genro-b74de.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "311645846310",
  appId: env.VITE_FIREBASE_APP_ID || "1:311645846310:web:4a11cadf49825db1f55fe7",
};
