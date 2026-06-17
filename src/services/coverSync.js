/* ============================================================
 * coverSync — publish the user's profile background so OTHERS can see it.
 * ------------------------------------------------------------
 * The legacy app saves the profile cover photo (`coverImage`) only to the OWNER's
 * private profile (users/{uid}/profile/main), and the crop (zoom/position) lives
 * ONLY in the owner's localStorage (__oxPbg). So when someone opens another user's
 * profile, their background can't be shown — the viewer has neither the image nor
 * the crop. Fix: mirror the cover image + its crop (as plain CSS size/position
 * strings) onto the user's PUBLIC card (public/data/customApp/{uid}), which is
 * world-readable and owner-writable (see firestore.rules). friendCover.js then
 * renders it on the friend-profile screen.
 *
 * Runs (a) once on boot — so EXISTING users' covers propagate the next time they
 * open the app, no manual re-save needed — and (b) on each profile 保存する. Owner
 * writes only; no password/authority fields. Frozen bundle untouched.
 * ============================================================ */
import { auth, db } from "../firebase/firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

/** The owner's current cover crop as CSS strings (they ARE the local user). */
function currentCoverSettings() {
  try {
    return {
      size: (window.__oxPbgSize && window.__oxPbgSize()) || "cover",
      pos: (window.__oxPbgPos && window.__oxPbgPos()) || "center",
    };
  } catch {
    return { size: "cover", pos: "center" };
  }
}

/** Copy {coverImage, coverSettings} from the owner's private profile to their card. */
async function publishCover(uid) {
  try {
    if (!uid) return;
    const snap = await getDoc(doc(db, "artifacts", APP_ID, "users", uid, "profile", "main"));
    const coverImage = snap && snap.exists() ? snap.data().coverImage || null : null;
    await setDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "customApp", uid),
      { coverImage: coverImage || null, coverSettings: currentCoverSettings(), uid },
      { merge: true },
    );
  } catch {
    /* non-fatal: the owner still sees their own cover locally */
  }
}

/** Install the cover publisher. Idempotent; browser-only. */
export function installCoverSync() {
  if (typeof document === "undefined") return;
  try {
    const uidNow = () => (auth && auth.currentUser ? auth.currentUser.uid : null);

    // (a) Boot backfill — give the legacy app time to restore auth + __oxPbg, then
    // publish once so existing covers reach the public card automatically.
    setTimeout(() => publishCover(uidNow()), 3500);

    // (b) On profile save — re-publish AFTER the legacy write lands. Scope to the
    // profile-edit screen (a cover element is present) so unrelated 保存する buttons
    // (settings, password) don't trigger a write.
    document.addEventListener(
      "click",
      (e) => {
        try {
          const t = e.target;
          const btn = t && t.closest ? t.closest("button") : null;
          if (!btn || (btn.textContent || "").trim() !== "保存する") return;
          if (!document.querySelector("[data-oxpbg-cover]")) return;
          const uid = uidNow();
          if (!uid) return;
          setTimeout(() => publishCover(uid), 1400);
        } catch {
          /* ignore */
        }
      },
      false,
    );
  } catch {
    /* ignore */
  }
}
