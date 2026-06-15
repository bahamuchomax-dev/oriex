// Invite-code gate for the OPT-IN modern auth signup.
//
// NOT A SECURITY BOUNDARY. This is a documented, NON-SECRET, TEST-ONLY gate so
// the opt-in modern shell (`?oriexModernAuth=1`) can be exercised manually. It is
// client-side only and trivially bypassable, so it provides ZERO real protection
// -- the real protections are Firebase Auth + Firestore Rules. A production
// cutover must replace this with a server/backend-validated invite (a real
// secret, never shipped in client source). The code is never written to Firestore
// and never logged.

/** Documented, non-secret, TEST-ONLY development invite code. */
export const DEV_INVITE_CODE = "ORIX-TEST";

/**
 * Canonicalize an entered invite code so copy/paste, full-width input, casing,
 * spaces, hyphens, and hidden (zero-width) characters all compare equal: NFKC
 * (full-width to half-width), uppercase, then keep only A-Z and 0-9 (which drops
 * spaces, hyphens, and any zero-width/control junk in one step).
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeInviteCode(input) {
  if (typeof input !== "string") return "";
  return input.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * True iff the entered code matches the documented dev invite code after
 * normalization. (Test-only -- see the file header.)
 * @param {unknown} input
 * @returns {boolean}
 */
export function validateInviteCode(input) {
  const entered = normalizeInviteCode(input);
  return entered.length > 0 && entered === normalizeInviteCode(DEV_INVITE_CODE);
}
