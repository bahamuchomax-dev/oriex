// Auth-state plumbing for the modern shell, split out so it is unit-testable in
// the node test environment (no browser / React renderer needed).
//
// The shell drives its UI from Firebase Auth in two complementary ways:
//   1. subscribeAuth() — the ongoing SOURCE OF TRUTH. Fires on mount (restoring a
//      persisted session after reload) and on every later change (sign-in,
//      sign-out, token refresh, sign-out in another tab).
//   2. currentAuthUser() — read once right after an awaited sign-in/sign-up so the
//      UI transitions IMMEDIATELY, without waiting for (or depending on) the
//      observer to re-fire. This fixes the "login only shows after reload" bug.
//
// Neither function logs anything (no password/token/user object is ever logged).

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebase.js";

/**
 * Subscribe to Firebase Auth state. Calls `onChange(user|null)` for every change
 * and `onReady()` once auth has reported (success or error). Returns the
 * unsubscribe function for cleanup on unmount.
 * @param {(user: import("firebase/auth").User | null) => void} onChange
 * @param {() => void} [onReady]
 * @returns {() => void} unsubscribe
 */
export function subscribeAuth(onChange, onReady) {
  return onAuthStateChanged(
    auth,
    (user) => {
      onChange(user);
      if (onReady) onReady();
    },
    () => {
      // Observer error: don't change the user, but stop the loading gate.
      if (onReady) onReady();
    },
  );
}

/**
 * The currently signed-in user. After an awaited signInWithEmailAndPassword /
 * createUserWithEmailAndPassword resolves, `auth.currentUser` is already the
 * signed-in user, so the shell can set it into state immediately.
 * @returns {import("firebase/auth").User | null}
 */
export function currentAuthUser() {
  return auth.currentUser;
}
