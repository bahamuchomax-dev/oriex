/* ============================================================
 * passwordChangeSync — make the legacy in-app password change actually apply
 * ------------------------------------------------------------
 * The frozen legacy "パスワード変更" screen writes {password: <new>} to the
 * Firestore profile (the old plaintext model) but NEVER updates Firebase Auth —
 * and login now goes through Firebase Auth (signInWithEmailAndPassword). So a
 * password change there has no effect on the real login. This editable module
 * bridges that WITHOUT touching the frozen bundle:
 *
 *   - It watches the "新しいパスワード" (new password) field. The legacy screen
 *     CLEARS that field only after a VALID submit (matching confirmation, length
 *     ok). So the moment the field goes from non-empty -> empty is exactly a
 *     successful change. We capture the last value and call Firebase Auth
 *     updatePassword() with it, so the real login password is updated too.
 *
 * Firebase needs a recent login for updatePassword; if the session is stale it
 * throws auth/requires-recent-login and we ask the user to re-login. Firebase
 * also requires >= 6 chars (the legacy UI allows 4) -> we surface a clear note.
 *
 * Uses the modern Firebase instance (src/firebase/firebase.js), which shares the
 * auth session with the legacy bundle. Best-effort; never throws into the app.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { updatePassword } from "firebase/auth";

const NEW_PW_PLACEHOLDER = "新しいパスワード";

/** Does this placeholder mark the "new password" field? Pure + tested. */
export function isNewPasswordPlaceholder(placeholder) {
  return typeof placeholder === "string" && placeholder.indexOf(NEW_PW_PLACEHOLDER) >= 0;
}

function findNewPwInput() {
  try {
    const inputs = document.querySelectorAll('input[type="password"]');
    for (let i = 0; i < inputs.length; i++) {
      if (isNewPasswordPlaceholder(inputs[i].getAttribute("placeholder") || "")) return inputs[i];
    }
  } catch {
    /* ignore */
  }
  return null;
}

let remembered = "";
let busy = false;

async function applyToAuth(pw) {
  if (busy) return;
  const u = auth && auth.currentUser;
  if (!u) return;
  busy = true;
  try {
    await updatePassword(u, pw);
    // success: the real (Firebase Auth) login password now matches the new one.
  } catch (e) {
    const code = e && e.code;
    try {
      if (code === "auth/requires-recent-login") {
        alert("パスワードを反映するには再ログインが必要です。ログアウトして入り直し、もう一度変更してください。");
      } else if (code === "auth/weak-password") {
        alert("ログイン用パスワードは6文字以上にしてください。");
      }
    } catch {
      /* ignore */
    }
  } finally {
    busy = false;
  }
}

function tick() {
  const el = findNewPwInput();
  if (!el) {
    remembered = "";
    return;
  }
  const v = el.value || "";
  if (v) {
    remembered = v; // keep the latest typed value while the field is filled
  } else if (remembered) {
    const pw = remembered;
    remembered = "";
    applyToAuth(pw); // field cleared after having a value = a successful submit
  }
}

let timer = null;
/** Install the password-change → Firebase Auth bridge. Idempotent; browser-only. */
export function installPasswordChangeSync() {
  if (typeof window === "undefined" || timer) return;
  try {
    timer = setInterval(() => { if (!document.hidden) tick(); }, 1000);
  } catch {
    /* ignore */
  }
}
