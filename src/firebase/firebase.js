// Single place where Firebase is initialized. Import { auth, db } from here.
//
// The v6.9 dist initialized Firestore with experimentalForceLongPolling and
// fell back to getFirestore() on failure. We replicate that intent here because
// the same hosting/network environment is expected.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";

// Reuse an existing app instance during HMR instead of re-initializing.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = (() => {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
})();
