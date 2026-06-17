// Invite-code gate for the modern auth signup.
//
// NOT A SECURITY BOUNDARY. It is client-side only and trivially bypassable, so it
// provides ZERO real protection -- the real protections are Firebase Auth +
// Firestore Rules. A full production cutover should replace this with a
// server/backend-validated invite. The code is never written to Firestore and
// never logged.
//
// PRODUCTION: the active code is supplied at build time via the VITE_INVITE_CODE
// env var (NEVER committed to source). When that env var is unset (local dev /
// tests) it falls back to the documented, non-secret, TEST-ONLY DEV_INVITE_CODE
// so the suite and manual dev still work. The code is NOT shown in the UI.

const ENV_INVITE_CODE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_INVITE_CODE) || "";

/** Documented, non-secret invite code. Used when VITE_INVITE_CODE is unset — which
 * includes the GitHub Pages production build (the deploy workflow sets no env var),
 * so this IS the live signup code. */
export const DEV_INVITE_CODE = "GENGEN";

/** The ACTIVE invite code: the build-time VITE_INVITE_CODE (production, never
 * committed) when set, otherwise the dev fallback. */
const ACTIVE_INVITE_CODE = ENV_INVITE_CODE || DEV_INVITE_CODE;

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
  return entered.length > 0 && entered === normalizeInviteCode(ACTIVE_INVITE_CODE);
}
