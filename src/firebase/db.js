// Firestore instance, split from firebase.js so the ~360 KB Firestore SDK is NOT
// in the auth-critical chunk. Import { db } from here instead of from firebase.js.

import { app } from "./firebase.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

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
