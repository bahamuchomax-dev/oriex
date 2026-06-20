/* ============================================================
 * accountDeletion — actually delete the Firebase Auth account on self-delete.
 * ------------------------------------------------------------
 * The frozen legacy 設定→「アカウントを削除する」 handler deletes the user's Firestore
 * data and signs out, but it NEVER deletes the Firebase Auth account — so the student
 * could just log back in (Friend ID + password) and the account effectively still
 * existed. Login is Firebase Auth, so a real "delete my account" must remove the Auth
 * user too. This editable module exposes `window.__oxDeleteAuthUser()`, which the
 * (lightly-patched) legacy delete handler awaits right before it signs out.
 *
 * deleteUser() needs a recent login. If the session is stale Firebase throws
 * auth/requires-recent-login; we re-authenticate with the user's password (one prompt)
 * and retry, so a student on an old session can still complete the deletion. Uses the
 * modern Firebase instance (src/firebase/firebase.js), which shares the legacy session.
 * Best-effort; never throws into the app.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

async function deleteAuthUser() {
  const u = auth && auth.currentUser;
  if (!u) return;
  try {
    await deleteUser(u);
  } catch (e) {
    if (e && e.code === "auth/requires-recent-login") {
      try {
        const pw = window.prompt("アカウント削除の最終確認のため、パスワードを入力してください。");
        if (!pw) {
          alert("パスワードが未入力のため、ログイン情報は残っています。もう一度削除をお試しください。");
          return;
        }
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email || "", pw));
        await deleteUser(u);
      } catch {
        alert("パスワードが正しくないため、ログイン情報を削除できませんでした。もう一度お試しください。");
      }
    }
    // Other errors are swallowed: the user's data is already deleted and the legacy
    // handler still signs out, so the account is unusable; a retry finishes the Auth delete.
  }
}

/** Install the Auth-account deletion bridge. Idempotent; browser-only. */
export function installAccountDeletion() {
  if (typeof window === "undefined") return;
  window.__oxDeleteAuthUser = deleteAuthUser;
}
