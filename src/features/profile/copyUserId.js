// Copy the current user's OWN user ID (uid) to the clipboard.
//
// Strictly read-only and uid-only: this never touches tokens, custom claims,
// role/admin/isTeacher markers, or any credential, and it performs no Firestore
// access. Pure and testable — pass a clipboard stub in tests; defaults to
// navigator.clipboard in the browser. Never throws; returns a boolean.

// currentUid() returns this placeholder before Firebase Auth is wired / when no
// one is signed in. It is not a real id and must never be offered for copy.
export const PLACEHOLDER_UID = "local";

/**
 * True iff `uid` is a real, copyable user id (a non-empty string that is not the
 * "not signed in" placeholder).
 * @param {unknown} uid
 * @returns {boolean}
 */
export function isCopyableUid(uid) {
  return typeof uid === "string" && uid.length > 0 && uid !== PLACEHOLDER_UID;
}

/**
 * Copy the uid to the clipboard. Returns true on success, false if the uid is
 * not copyable or the clipboard is unavailable/failed. Never throws.
 * @param {string} uid
 * @param {{ writeText?: (text: string) => Promise<void> }} [clipboard]
 * @returns {Promise<boolean>}
 */
export async function copyUserId(uid, clipboard) {
  if (!isCopyableUid(uid)) return false;
  const cb =
    clipboard || (typeof navigator !== "undefined" ? navigator.clipboard : null);
  if (!cb || typeof cb.writeText !== "function") return false;
  try {
    await cb.writeText(uid);
    return true;
  } catch {
    return false;
  }
}
