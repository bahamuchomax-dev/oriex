/* ============================================================
 * readCounter — developer-only live Firestore read/write counter.
 * ------------------------------------------------------------
 * For DEVELOPER accounts, show an always-on badge counting Firestore reads
 * (getDoc/getDocs) and writes (setDoc) for the session. The legacy bundle already
 * calls window.__oxFsHook(op, ref, promise) on every read/write (the qn$o/Cl$o/
 * rn$o wrappers), so we tap that — chaining any existing hook (e.g. auth debug).
 * Pure instrumentation: no document data is read or logged, nothing is written.
 * Non-developers get nothing. Browser-only; the frozen bundle is untouched.
 *
 * An account is a developer if EITHER:
 *   - it has the server-set `developer` custom claim (CLI: scripts/grantDeveloper.mjs), OR
 *   - an admin granted it in-app — a presence doc at developerAllowlist/{uid}
 *     (rules: admin-only write, self-readable). See TeacherAdminPanel「デベロッパー付与」.
 * When developer, we also publish window.__oxIsDeveloper=true so oxUiPatches can show
 * the「デベロッパー」name badge (mirrors the teacher .rx-tbadge). The allowlist GET uses
 * the modern SDK (not the legacy __oxFsHook), so it is NOT self-counted.
 * ============================================================ */
import { auth, db } from "../firebase/firebase.js";
import { doc, getDoc } from "firebase/firestore";

let reads = 0;
let writes = 0;
let badge = null;
let prevHook = null;

function render() {
  if (badge) badge.textContent = "FS  R:" + reads + "  W:" + writes;
}

function ensureBadge() {
  if (badge) return;
  badge = document.createElement("div");
  badge.id = "ox-readcounter";
  badge.style.cssText =
    "position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);" +
    "z-index:99999;background:rgba(17,24,39,.86);color:#7dd3fc;" +
    "font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;" +
    "padding:5px 8px;border-radius:9px;pointer-events:none;user-select:none;" +
    "-webkit-user-select:none;box-shadow:0 2px 8px rgba(0,0,0,.3)";
  document.body.appendChild(badge);
  render();
}

function install() {
  prevHook = typeof window.__oxFsHook === "function" ? window.__oxFsHook : null;
  window.__oxFsHook = function (op, ref, promise) {
    try {
      if (op === "getDoc" || op === "getDocs") {
        reads += 1;
        render();
      } else if (op === "setDoc") {
        writes += 1;
        render();
      }
    } catch {
      /* ignore */
    }
    if (prevHook) {
      try {
        prevHook(op, ref, promise);
      } catch {
        /* ignore */
      }
    }
  };
  ensureBadge();
}

/** Mark the signed-in user as a developer: publish the flag (for the name badge)
 *  and install the counter. Idempotent — safe to call from either gate. */
function markDeveloper() {
  try {
    if (typeof window !== "undefined") window.__oxIsDeveloper = true;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && !window.__oxReadCounter) {
    window.__oxReadCounter = true;
    install();
  }
}

/** Install the counter / dev badge IF the signed-in user is a developer (custom
 *  claim OR admin-granted developerAllowlist doc). Idempotent; the allowlist read
 *  runs at most once per uid so it never spams reads for non-developers. */
export function installReadCounter() {
  if (typeof window === "undefined" || window.__oxReadCounter) return;
  try {
    const u = auth && auth.currentUser;
    if (!u || typeof u.getIdTokenResult !== "function") return;
    if (window.__oxDevCheckedUid === u.uid) return; // already evaluated this user
    window.__oxDevCheckedUid = u.uid;
    u.getIdTokenResult()
      .then((res) => {
        if (res && res.claims && res.claims.developer === true) {
          markDeveloper();
          return;
        }
        // No claim — fall back to the admin-managed in-app allowlist (self-readable).
        getDoc(doc(db, "developerAllowlist", u.uid))
          .then((snap) => {
            if (snap && typeof snap.exists === "function" && snap.exists()) markDeveloper();
          })
          .catch(() => {
            /* not a developer / unreadable — show nothing */
          });
      })
      .catch(() => {
        // token unavailable — allow a later retry for this uid
        window.__oxDevCheckedUid = null;
      });
  } catch {
    /* ignore */
  }
}
