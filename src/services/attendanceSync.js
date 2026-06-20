/* ============================================================
 * attendanceSync — server-persist the legacy 登校スタンプ (attendance stamps)
 * ------------------------------------------------------------
 * The frozen legacy bundle stores attendance stamps ONLY in
 *   localStorage["oritan_attendance_stamps"]  (a JSON array of {id, ...})
 * so they are lost when switching devices / clearing storage. This editable
 * module mirrors them to Firestore WITHOUT touching the frozen bundle:
 *
 *   WRITE: every time the bundle writes the localStorage key (i.e. a stamp is
 *          added/removed), mirror the array up to
 *          artifacts/{appId}/users/{uid}/meta/attendanceStamps  (debounced).
 *          That path is the user's OWN subtree, already allowed by the deployed
 *          rules (users/{uid}/** : isSelf) — so NO rules change is needed.
 *
 *   READ:  only when the user opens the 登校スタンプ tab (a click whose control
 *          text contains "登校スタンプ"), fetch once, union with local by id, and
 *          write the merged array back to localStorage. PLUS a one-time restore
 *          at startup ONLY when local is empty (a fresh device), so a new device
 *          shows the stamps on first open. No continuous listener — reads stay
 *          minimal, as requested.
 *
 * Uses the modern Firebase instance (src/firebase/firebase.js); it shares the
 * project + auth session with the legacy bundle, so auth.currentUser.uid matches
 * the bundle's user. Everything is best-effort and never throws into the app.
 *
 * DISPLAY NOTE: writes are immediate + reliable. On a fresh device the tab-open
 * fetch lands in localStorage; because the frozen screen reads localStorage on
 * mount, server-only stamps may appear on the NEXT open of the tab (the startup
 * restore covers the empty-local case so the common path is correct). A future
 * React migration of this screen removes that one-render lag.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { db } from "../firebase/db.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";
const LS_KEY = "oritan_attendance_stamps";
const TAB_TEXT = "登校スタンプ";

let origSetItem = null;

function currentUid() {
  return auth && auth.currentUser ? auth.currentUser.uid : null;
}
function docRef(u) {
  return doc(db, "artifacts", APP_ID, "users", u, "meta", "attendanceStamps");
}
function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLocal(arr) {
  // use the ORIGINAL setItem so restoring from the server does not re-trigger an
  // upload (the wrapped setItem schedules a push on the LS_KEY).
  try {
    (origSetItem || localStorage.setItem.bind(localStorage))(LS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

/** Union two stamp arrays by `id` (local wins on duplicate ids). Pure + tested. */
export function mergeStamps(local, server) {
  const out = [];
  const seen = new Set();
  const add = (list) => {
    for (const s of Array.isArray(list) ? list : []) {
      const id = s && s.id != null ? String(s.id) : JSON.stringify(s);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(s);
      }
    }
  };
  add(local); // local first → local wins on conflicting id
  add(server);
  return out;
}

let pushTimer = null;
async function pushToServer() {
  const u = currentUid();
  if (!u) return;
  try {
    await setDoc(docRef(u), { stamps: readLocal(), updatedAt: Date.now() }, { merge: true });
  } catch {
    /* ignore */
  }
}
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToServer, 800);
}

let pulling = false;
async function pullFromServer() {
  const u = currentUid();
  if (!u || pulling) return;
  pulling = true;
  try {
    const snap = await getDoc(docRef(u));
    const server = snap.exists() && Array.isArray(snap.data().stamps) ? snap.data().stamps : [];
    const local = readLocal();
    const merged = mergeStamps(local, server);
    if (merged.length !== local.length) writeLocal(merged);
    // if local had stamps the server was missing, push the union up
    if (merged.length !== server.length) pushToServer();
  } catch {
    /* ignore */
  } finally {
    pulling = false;
  }
}

function installWriteSync() {
  try {
    const ls = window.localStorage;
    if (ls.setItem.__oxAttSync) return;
    origSetItem = ls.setItem.bind(ls);
    const wrapped = function setItem(key, value) {
      const r = origSetItem(key, value);
      if (key === LS_KEY) schedulePush();
      return r;
    };
    wrapped.__oxAttSync = true;
    ls.setItem = wrapped;
  } catch {
    /* ignore */
  }
}

function installTabOpenRead() {
  try {
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        const el = t && t.closest ? t.closest("button,a,[role=button]") : null;
        if (el && (el.textContent || "").indexOf(TAB_TEXT) >= 0) pullFromServer();
      },
      true,
    );
  } catch {
    /* ignore */
  }
}

/** Install attendance-stamp server sync. Idempotent; no-op outside the browser. */
export function installAttendanceSync() {
  if (typeof window === "undefined") return;
  installWriteSync();
  installTabOpenRead();
  // Fresh-device restore: only read at startup when there is nothing locally, so
  // a new device shows the stamps on first open without adding a per-load read
  // for devices that already have data.
  try {
    if (readLocal().length === 0) {
      // defer so Firebase auth has a chance to resolve the current user
      setTimeout(() => pullFromServer(), 2500);
    }
  } catch {
    /* ignore */
  }
}
