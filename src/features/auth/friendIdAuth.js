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
 * Generate a fresh random Friend ID (a new user does NOT type one — it is the
 * system-assigned public handle, matching the legacy generator). Always returns a
 * value that passes validateFriendIdFormat. Uses the crypto RNG when available.
 *
 * NOTE: uniqueness is not checked here. On the (rare) collision, the downstream
 * createUserWithEmailAndPassword fails with auth/email-already-in-use and the
 * caller surfaces a safe "already registered" message / retries. A production
 * cutover should add a real uniqueness check.
 * @returns {string}
 */
export function generateFriendId() {
  const n = FRIEND_ID_LENGTH;
  let bytes = null;
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    bytes = globalThis.crypto.getRandomValues(new Uint32Array(n));
  }
  let out = "";
  for (let i = 0; i < n; i++) {
    const r = bytes ? bytes[i] : Math.floor(Math.random() * 0xffffffff);
    out += FRIEND_ID_ALPHABET[r % FRIEND_ID_ALPHABET.length];
  }
  return out;
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

// Generic, non-enumerating messages: credential-class failures must NOT reveal
// whether the account exists or which factor was wrong. The base wording is
// context-aware so a SIGNUP failure never shows login-specific text.
const GENERIC_LOGIN_MESSAGE = "ログインに失敗しました。IDまたはパスワードをご確認ください。";
const GENERIC_SIGNUP_MESSAGE = "登録に失敗しました。もう一度お試しください。";

// REST tokens (accounts:signUp / signInWithPassword return these in the body).
// The Firebase JS SDK usually maps them to auth/* codes, but classify by message
// too so a raw REST error is still handled. We READ the message only to classify
// — we never display it.
const REST_TOKENS = [
  "OPERATION_NOT_ALLOWED",
  "WEAK_PASSWORD",
  "EMAIL_EXISTS",
  "INVALID_EMAIL",
  "TOO_MANY_ATTEMPTS_TRY_LATER",
  "PASSWORD_LOGIN_DISABLED",
];

// Extract a normalized classification key from a code string, an error object's
// `.code`, or (as a fallback) a REST token found in `.message`. Never returns the
// raw message.
function classifyAuthError(error) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  if (typeof error.code === "string" && error.code) return error.code;
  const msg = typeof error.message === "string" ? error.message : "";
  for (const token of REST_TOKENS) {
    if (msg.includes(token)) return token;
  }
  return "";
}

/**
 * Map a Firebase Auth / Firestore error to a SAFE, user-facing Japanese message.
 * Accepts an error object (reads `.code`, falls back to a REST token in
 * `.message`) or a raw code string. Never returns the raw `error.message` (which
 * may carry an email/uid/credential) and never distinguishes user-not-found from
 * wrong-password (no account enumeration).
 * @param {unknown} error  a Firebase error object, or a code string
 * @param {"login"|"signup"} [context="login"]  drives the generic wording
 * @returns {string}
 */
export function safeAuthErrorMessage(error, context = "login") {
  const generic = context === "signup" ? GENERIC_SIGNUP_MESSAGE : GENERIC_LOGIN_MESSAGE;
  const code = classifyAuthError(error);
  switch (code) {
    // Provider / sign-in method not enabled in the Firebase project settings.
    case "auth/operation-not-allowed":
    case "OPERATION_NOT_ALLOWED":
    case "PASSWORD_LOGIN_DISABLED":
      return "Firebase Authentication のメール/パスワードログインが有効になっていません。";
    case "auth/weak-password":
    case "WEAK_PASSWORD":
      return "パスワードは6文字以上にしてください。";
    case "auth/email-already-in-use":
    case "EMAIL_EXISTS":
      return "このIDはすでに登録されています。ログインしてください。";
    case "auth/invalid-email":
    case "INVALID_EMAIL":
      return "内部ログインIDの形式に問題があります。";
    case "auth/too-many-requests":
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "試行回数が多すぎます。時間をおいてお試しください。";
    case "auth/requires-recent-login":
      return "この操作には再ログインが必要です。もう一度ログインしてください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "auth/user-disabled":
      return "このアカウントは無効化されています。管理者にお問い合わせください。";
    case "permission-denied":
      return "権限設定エラーです。管理者にお問い合わせください。";
    // Credential-class — collapse to the generic message (no enumeration).
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/missing-password":
      return generic;
    default:
      return generic;
  }
}
