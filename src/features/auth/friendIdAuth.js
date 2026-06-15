// Friend ID auth utilities for the Firebase Auth migration (see
// AUTH_RECOVERY_PLAN.md). Pure, side-effect-free helpers used to bridge the
// legacy 6-char Friend ID onto Firebase Auth identities WITHOUT the legacy
// plaintext-password pattern.
//
// IMPORTANT: nothing here reads/writes Firestore, calls Firebase, or logs. In
// particular these functions never receive, return, or log a password — that is
// enforced by tests (friendIdAuth.test.js + friendIdAuthNoLog.test.js). Auth
// itself is Firebase Auth; these helpers only normalize/validate the public
// Friend ID handle and produce safe, non-enumerating UI strings.

// The legacy Friend ID alphabet: A–Z and 2–9 with the visually ambiguous
// I, O, 0, 1 removed (matches the legacy `shortId` generator). 32 symbols.
export const FRIEND_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const FRIEND_ID_LENGTH = 6;

// Deterministic, NON-deliverable internal email domain for the Firebase Auth
// email/password shim. `.invalid` is reserved (RFC 2606) so these addresses can
// never reach a real mailbox — a Friend ID is a public handle, not an email.
export const INTERNAL_AUTH_EMAIL_DOMAIN = "friend-id.oriex.invalid";

const FRIEND_ID_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Canonicalize user-entered Friend ID input: trim, uppercase, and strip spaces
 * and hyphens (so "abc 234" / "abc-234" → "ABC234"). Does NOT validate; pass the
 * result to validateFriendIdFormat. Returns "" for non-string input.
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeFriendId(input) {
  if (typeof input !== "string") return "";
  return input.toUpperCase().replace(/[\s-]+/g, "");
}

/**
 * True iff `id` is already in canonical Friend ID form: exactly 6 characters
 * from FRIEND_ID_ALPHABET. Strict — normalize first with normalizeFriendId.
 * @param {unknown} id
 * @returns {boolean}
 */
export function validateFriendIdFormat(id) {
  return typeof id === "string" && FRIEND_ID_RE.test(id);
}

/**
 * Map a Friend ID to its deterministic internal Firebase Auth email. Normalizes
 * and validates the input first; throws a generic error (never echoing the
 * input) on an invalid Friend ID.
 * @param {string} friendId
 * @param {string} [domain=INTERNAL_AUTH_EMAIL_DOMAIN]
 * @returns {string} e.g. "abc234@friend-id.oriex.invalid"
 */
export function makeInternalAuthEmailFromFriendId(friendId, domain = INTERNAL_AUTH_EMAIL_DOMAIN) {
  const normalized = normalizeFriendId(friendId);
  if (!validateFriendIdFormat(normalized)) {
    throw new Error("Invalid Friend ID format");
  }
  return `${normalized.toLowerCase()}@${domain}`;
}

// Generic, non-enumerating message: credential-class failures must NOT reveal
// whether the account exists or which factor was wrong.
const GENERIC_AUTH_MESSAGE = "ログインに失敗しました。IDまたはパスワードをご確認ください。";

/**
 * Map a Firebase Auth error to a SAFE, user-facing Japanese message. Never
 * returns the raw `error.message` (which may carry an email/uid) and never
 * distinguishes user-not-found from wrong-password (no account enumeration).
 * @param {unknown} error
 * @returns {string}
 */
export function safeAuthErrorMessage(error) {
  const code =
    error && typeof error === "object" && typeof error.code === "string" ? error.code : "";
  switch (code) {
    // Credential-class — collapse to one generic message (no enumeration).
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/missing-password":
      return GENERIC_AUTH_MESSAGE;
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらくしてからもう一度お試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "auth/user-disabled":
      return "このアカウントは無効化されています。管理者にお問い合わせください。";
    default:
      return GENERIC_AUTH_MESSAGE;
  }
}
