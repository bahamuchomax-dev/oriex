/* ============================================================
 * readCounter — developer-only live Firestore read/write counter.
 * ------------------------------------------------------------
 * For accounts with the server-set `developer` custom claim (see
 * scripts/grantDeveloper.mjs), show an always-on badge counting Firestore reads
 * (getDoc/getDocs) and writes (setDoc) for the session. The legacy bundle already
 * calls window.__oxFsHook(op, ref, promise) on every read/write (the qn$o/Cl$o/
 * rn$o wrappers), so we tap that — chaining any existing hook (e.g. auth debug).
 * Pure instrumentation: no document data is read or logged, nothing is written.
 * Non-developers get nothing. Browser-only; the frozen bundle is untouched.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";

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

/** Install the counter IF the signed-in user has the developer claim. Idempotent. */
export function installReadCounter() {
  if (typeof window === "undefined" || window.__oxReadCounter) return;
  try {
    const u = auth && auth.currentUser;
    if (!u || typeof u.getIdTokenResult !== "function") return;
    u.getIdTokenResult()
      .then((res) => {
        if (res && res.claims && res.claims.developer === true) {
          window.__oxReadCounter = true;
          install();
        }
      })
      .catch(() => {
        /* not a developer / token unavailable — show nothing */
      });
  } catch {
    /* ignore */
  }
}
