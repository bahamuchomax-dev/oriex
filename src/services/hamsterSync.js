/* ============================================================
 * hamsterSync — persist hamster furniture (purchases + placement) online.
 * ------------------------------------------------------------
 * The legacy hamster room keeps its whole pet state in
 *   localStorage["oriex_hamu_" + uid] = { name, food, happy, …, own:{}, layout:{} }
 * `own` = bought furniture (購入履歴), `layout` = where each piece is placed (配置).
 * Those were device-local only, so a re-install / another device lost them.
 *
 * This mirrors ONLY `own` + `layout` (not the volatile gauges) to the user's OWN
 * Firestore subtree, which rules already allow (isSelf):
 *   artifacts/{appId}/users/{uid}/hamster/room = { own, layout, updatedAt }
 *
 *  - READ happens when the ROOM is OPENED — the bundle calls window.OriexHamu3D()
 *    to mount the room, so we wrap it and pull the saved furniture then (per the
 *    "へやをタップした時読み取り開始" requirement — no read on every login).
 *  - WRITE mirrors back on change (debounced by a signature) so purchases and
 *    placement are saved online.
 * Frozen bundle untouched; browser-only.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { db } from "../firebase/db.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

function uid() {
  if (auth && auth.currentUser && auth.currentUser.uid) return auth.currentUser.uid;
  return (typeof window !== "undefined" && window.__oxUid) || null;
}
function lsKey(u) {
  return "oriex_hamu_" + (u || "local");
}
function roomRef(u) {
  return doc(db, "artifacts", APP_ID, "users", u, "hamster", "room");
}
function readLocal(u) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(u)) || "null");
  } catch {
    return null;
  }
}
function writeLocal(u, state) {
  try {
    localStorage.setItem(lsKey(u), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// Once-per-session-per-uid guard: the room re-mounts on every [L] change in the
// bundle, so without this the room doc was re-read on every open. Set before the
// await so concurrent re-mounts dedupe to a single read. (Furniture bought on
// another device mid-session surfaces on the next cold start — rare; acceptable.)
let loadedFor = null;

// Pull saved own/layout from the cloud and merge into the local pet state (keeping
// the volatile gauges). Applies to the engine on its next furniture rebuild / open.
async function loadFromCloud(u) {
  try {
    if (loadedFor === u) return;
    loadedFor = u;
    const snap = await getDoc(roomRef(u));
    if (!snap.exists()) return;
    const d = snap.data() || {};
    if (!d.own && !d.layout) return;
    const local = readLocal(u) || {};
    if (d.own && typeof d.own === "object") local.own = d.own;
    if (d.layout && typeof d.layout === "object") local.layout = d.layout;
    writeLocal(u, local);
  } catch {
    /* non-fatal: local state still works */
  }
}

let lastSig = "";
async function saveToCloud(u) {
  const local = readLocal(u);
  if (!local) return;
  const own = local.own || {};
  const layout = local.layout || {};
  // Only write when furniture actually changed (avoid per-tick writes / cost).
  const sig = JSON.stringify(own) + "|" + JSON.stringify(layout);
  if (sig === lastSig) return;
  lastSig = sig;
  try {
    await setDoc(roomRef(u), { own, layout, updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    /* non-fatal */
  }
}

/** Install the hamster furniture sync. Idempotent; browser-only. */
export function installHamsterSync() {
  if (typeof window === "undefined" || window.__oxHamsterSync) return;
  try {
    window.__oxHamsterSync = true;

    // Seed the signature from whatever is already local, so the first change (not
    // the existing state) is what triggers the first cloud write.
    const u0 = uid();
    if (u0) {
      const l = readLocal(u0);
      if (l) lastSig = JSON.stringify(l.own || {}) + "|" + JSON.stringify(l.layout || {});
    }

    // READ on room open: wrap window.OriexHamu3D (set by oriexHamu3D.js, called by
    // the bundle when the room mounts).
    const orig = window.OriexHamu3D;
    if (typeof orig === "function") {
      window.OriexHamu3D = function () {
        const u = uid();
        if (u) loadFromCloud(u); // async — applies on the next furniture rebuild/open
        return orig.apply(this, arguments);
      };
    }

    // WRITE on change: poll the local state and mirror own/layout when it changes.
    setInterval(() => {
      if (document.hidden) return;
      const u = uid();
      if (u) saveToCloud(u);
    }, 4000);
  } catch {
    /* ignore */
  }
}
