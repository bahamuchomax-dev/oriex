// Single place where Firebase is initialized. Import { auth, db } from here.
//
// The v6.9 dist initialized Firestore with experimentalForceLongPolling and
// fell back to getFirestore() on failure. We replicate that intent here because
// the same hosting/network environment is expected.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig.js";

// Reuse an existing app instance during HMR instead of re-initializing.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Durably PIN auth persistence: IndexedDB first, then localStorage. Bare
// getAuth(app) lets the SDK pick a default that, on iOS standalone PWAs / WebViews,
// can resolve to a NON-durable store (or be evicted) — which logged the user out on
// EVERY cold start (re-login each launch); the legacy app masked it by fast-starting
// from localStorage. initializeAuth with an explicit persistence chain fixes that.
// getAuth(app) is the fallback if auth was already initialized (HMR) or initializeAuth
// throws. No change to sign-in/out, observers, or the cutover handoff.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    return getAuth(app);
  }
})();

// Firestore is split into src/firebase/db.js so the ~360 KB Firestore SDK stays
// OUT of the auth-critical chunk. Import { db } from "./db.js" instead.
