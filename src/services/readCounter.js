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
 *   - an admin added it to the public developer directory
 *     artifacts/{appId}/public/data/developerList/{uid} (rules: admin-only write,
 *     signed-in read). See TeacherAdminPanel「デベロッパー付与」.
 * We load that directory once and publish window.__oxDevUids (a Set of developer uids)
 * so the legacy bundle can show the「デベロッパー」badge on OTHER users too (connections
 * list / friend profiles), and window.__oxIsDeveloper=true for the signed-in user so
 * oxUiPatches shows it on their own profile (mirrors the teacher .rx-tbadge「先生」).
 * The directory read uses the modern SDK (not the legacy __oxFsHook), so it is NOT
 * self-counted.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { db } from "../firebase/db.js";
import { collection, getDocs } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

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

/** Load the public developer directory ONCE per uid: publish window.__oxDevUids (a
 *  Set of developer uids) so the bundle can badge OTHER users, and decide the signed-
 *  in user's own status (in the list OR a `developer` custom claim) to enable the
 *  read counter + own badge. Runs for every user (not just developers) so dev friends
 *  get badged. Modern SDK read — not self-counted. */
export function installReadCounter() {
  if (typeof window === "undefined") return;
  try {
    const u = auth && auth.currentUser;
    if (!u) return;
    if (window.__oxDevCheckedUid === u.uid) return; // already evaluated this user
    window.__oxDevCheckedUid = u.uid;
    getDocs(collection(db, "artifacts", APP_ID, "public", "data", "developerList"))
      .then((snap) => {
        const ids = new Set();
        snap.forEach((d) => ids.add(String(d.id)));
        window.__oxDevUids = ids;
        if (ids.has(String(u.uid))) {
          markDeveloper();
          return;
        }
        confirmByClaim(u); // not listed — may still be a CLI-claim developer
      })
      .catch(() => {
        // directory unreadable — still honor a `developer` custom claim for self
        confirmByClaim(u);
      });
  } catch {
    /* ignore */
  }
}

/** Honor a server-set `developer` custom claim (scripts/grantDeveloper.mjs) so a
 *  CLI-granted developer still gets the counter + own badge even if not in the list. */
function confirmByClaim(u) {
  if (!u || typeof u.getIdTokenResult !== "function") return;
  u.getIdTokenResult()
    .then((res) => {
      if (res && res.claims && res.claims.developer === true) markDeveloper();
    })
    .catch(() => {
      // token unavailable — allow a later retry for this uid
      if (typeof window !== "undefined") window.__oxDevCheckedUid = null;
    });
}
