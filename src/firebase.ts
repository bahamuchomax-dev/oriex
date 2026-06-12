import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

type FirebaseEnv = {
  REACT_APP_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_API_KEY?: string;
};

const readEnv = (): FirebaseEnv => {
  const viteEnv = (import.meta as unknown as { env?: FirebaseEnv }).env;
  const craEnv = (globalThis as typeof globalThis & {
    process?: { env?: FirebaseEnv };
  }).process?.env;
  return { ...craEnv, ...viteEnv };
};

const env = readEnv();
const apiKey = env.VITE_FIREBASE_API_KEY || env.REACT_APP_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error(
    "Firebase API key is missing. Add VITE_FIREBASE_API_KEY or REACT_APP_FIREBASE_API_KEY to your .env file."
  );
}

const config = {
  apiKey,
  authDomain: "genro-b74de.firebaseapp.com",
  projectId: "genro-b74de",
  storageBucket: "genro-b74de.firebasestorage.app",
  messagingSenderId: "311645846310",
  appId: "1:311645846310:web:4a11cadf49825db1f55fe7",
};

const app = getApps().length === 0 ? initializeApp(config) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const appId = "gen-ron-kai-app-v1";
