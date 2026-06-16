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
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";

// Reuse an existing app instance during HMR instead of re-initializing.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore with a PERSISTENT (IndexedDB) local cache. Beyond offline support,
// this is a read-cost win: cached listeners resume with a token so the server
// only sends CHANGES since the last sync — static data (book catalog, settings,
// app-lock, ranking cards) is re-read for ~0 billed reads on repeat sessions.
// experimentalForceLongPolling is kept (same network env as the v6.9 dist).
// Falls back to the default (memory) cache if IndexedDB is unavailable or the
// instance was already initialized (HMR).
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    try {
      return getFirestore(app);
    } catch {
      return initializeFirestore(app, { experimentalForceLongPolling: true });
    }
  }
})();
