/* ============================================================
 * customSeenSync — make solved 先生からの問題 (custom vocabulary) move to 過去.
 * ------------------------------------------------------------
 * The legacy list splits words with `pu(category,"new"|"past")` using the SHARED
 * doc's `seenBy` array — but writing seenBy was disabled (shared-doc cost/
 * contention), so solved words never leave "新しい問題". Meanwhile the bundle ALREADY
 * records each solved word per-student at users/{uid}/customSeen/{wordId} (own
 * subtree). The list just never reads it.
 *
 * This loads that own customSeen set into window.__oxCustomSeen (a tiny surgical
 * bundle edit makes pu's split read it), and — with ZERO extra reads — adds a word
 * id to the set the moment the bundle writes its customSeen doc (via the existing
 * window.__oxFsHook). One scoped own-subtree read per session; no shared-doc write.
 * ============================================================ */
import { auth, db } from "../firebase/firebase.js";
import { collection, getDocs } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

function uid() {
  if (auth && auth.currentUser && auth.currentUser.uid) return auth.currentUser.uid;
  return (typeof window !== "undefined" && window.__oxUid) || null;
}

async function loadSeen(u) {
  try {
    const snap = await getDocs(collection(db, "artifacts", APP_ID, "users", u, "customSeen"));
    snap.forEach((d) => {
      if ((d.data() || {}).seen) window.__oxCustomSeen.add(d.id);
    });
  } catch {
    /* non-fatal: the list just shows everything as new until it loads */
  }
}

/** Install the customSeen set + freshness hook. Idempotent; browser-only. */
export function installCustomSeenSync() {
  if (typeof window === "undefined" || window.__oxCustomSeenSync) return;
  try {
    window.__oxCustomSeenSync = true;
    window.__oxCustomSeen = window.__oxCustomSeen || new Set();

    // Load the student's solved-word ids once after boot (own-subtree scoped read).
    setTimeout(() => {
      const u = uid();
      if (u) loadSeen(u);
    }, 1000);

    // Keep the set fresh with NO extra reads: the bundle writes customSeen on each
    // solved session, so chain the existing FS hook and add the id on that write.
    const prev = typeof window.__oxFsHook === "function" ? window.__oxFsHook : null;
    window.__oxFsHook = function (op, ref, promise) {
      try {
        if (op === "setDoc" && ref && typeof ref.path === "string") {
          const m = ref.path.match(/\/customSeen\/([^/]+)$/);
          if (m) window.__oxCustomSeen.add(m[1]);
        }
      } catch {
        /* ignore */
      }
      if (prev) {
        try {
          prev(op, ref, promise);
        } catch {
          /* ignore */
        }
      }
    };
  } catch {
    /* ignore */
  }
}
