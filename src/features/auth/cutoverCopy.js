// User-facing copy for the modern-auth cutover (v1 = fresh re-registration).
//
// Plain strings only — no secrets, no Firestore, no logging. These tell a
// returning legacy user that the login changed, that the old (compromised)
// password cannot be reused, and that a new account must be created. Continuity
// of old learning records is teacher/admin-mediated and out of scope for v1.

export const CUTOVER_TITLE = "ログイン方式が新しくなりました";

export const CUTOVER_LINES = [
  "安全性向上のため、ログイン方式を新しくしました。",
  "以前のパスワードは使用できません。新しいアカウントを作成してください。",
  "学習記録の引き継ぎが必要な場合は先生/管理者に相談してください。",
];

// Shown on the signup form: a new Friend ID is ISSUED (the user does not type
// one), and it is what they use to log in next time.
export const SIGNUP_NEW_FRIEND_ID_NOTE =
  "登録すると新しいフレンドIDが発行されます。次回のログインに使うので、お控えください。";
