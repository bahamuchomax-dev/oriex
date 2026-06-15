// Preparatory, side-effect-free helpers for the upcoming Firebase Auth migration
// (see SECURE_AUTH_MIGRATION_PLAN.md). NOT wired into the app yet. These never
// read/write Firestore, never touch passwords beyond receiving an error code, and
// never log anything.

// Friend ID is a PUBLIC, non-secret lookup/display identifier (e.g. "2N7422").
// It is NOT a credential after migration.

/** Normalize a Friend ID for lookup/auth: trim, drop inner whitespace, uppercase. */
export function normalizeFriendId(input) {
  return String(input == null ? "" : input).replace(/\s+/g, "").toUpperCase();
}

/** Friend IDs are short alphanumeric codes. Reject anything else. */
export function validateFriendIdFormat(input) {
  const id = normalizeFriendId(input);
  return /^[A-Z0-9]{4,16}$/.test(id);
}

/**
 * Deterministically derive an INTERNAL Firebase Auth email from a Friend ID so a
 * Friend ID can back a real Auth credential without exposing a real email. This
 * is a stable, non-secret mapping (no password, no token). Throws on invalid id.
 */
export function makeInternalAuthEmailFromFriendId(input) {
  if (!validateFriendIdFormat(input)) {
    throw new Error("invalid-friend-id-format");
  }
  return `${normalizeFriendId(input).toLowerCase()}@friend-id.oriex.invalid`;
}

/**
 * Map a Firebase Auth / Firestore error code to a safe, user-facing message.
 * Never returns or logs the raw error, password, token, or credential.
 */
export function safeAuthErrorMessage(code) {
  switch (String(code || "")) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "IDまたはパスワードが違います";
    case "auth/too-many-requests":
      return "試行が多すぎます。しばらくしてからお試しください";
    case "auth/network-request-failed":
      return "通信に失敗しました。接続を確認してください";
    case "auth/email-already-in-use":
      return "このIDは既に登録されています";
    case "auth/requires-recent-login":
      return "この操作には再ログインが必要です";
    case "permission-denied":
      return "権限設定エラーです。管理者にご連絡ください";
    default:
      return "ログインに失敗しました。もう一度お試しください";
  }
}
