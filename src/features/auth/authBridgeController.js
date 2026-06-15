// Pure decision helpers for the auth-bridge probe timing, split out so the
// "mount legacy only after auth is resolved" logic is unit-testable in node.
//
// No Firestore, no Firebase, no logging, no password handling — these only decide
// WHEN to start legacy and expose the (non-secret) uid the bridge will set.

/**
 * Whether the bridge should start the legacy app yet. It must wait until Firebase
 * Auth state is RESOLVED (`ready`) and a user EXISTS (`hasUser`), and must start
 * legacy at most once (`alreadyMounted` guards repeated auth events / re-renders).
 * @param {{ ready: boolean, hasUser: boolean, alreadyMounted: boolean }} s
 * @returns {boolean}
 */
export function shouldMountLegacy({ ready, hasUser, alreadyMounted } = {}) {
  return !!ready && !!hasUser && !alreadyMounted;
}

/**
 * The (non-secret) uid the bridge sets on `window.__oxUid` before starting legacy.
 * Returns null when there is no valid user.
 * @param {{ uid?: unknown } | null | undefined} user
 * @returns {string | null}
 */
export function bridgeUid(user) {
  return user && typeof user.uid === "string" && user.uid ? user.uid : null;
}
