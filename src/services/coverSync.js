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
import { auth } from "../firebase/firebase.js";
import { db } from "../firebase/db.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";
const BOOT_PUBLISH_MS = 24 * 60 * 60_000;
const BOOT_PUBLISH_PREFIX = "oxCoverBootPublishAt:";

const PUBLIC_NUMBER_FIELDS = ["xp", "streak", "level", "totalMinutes", "studyMinutes", "coins"];

function publicProfileFields(src = {}) {
  const out = {};
  if (typeof src.comment === "string") out.comment = src.comment;
  for (const key of PUBLIC_NUMBER_FIELDS) {
    if (src[key] == null || src[key] === "") continue;
    if (Number.isFinite(Number(src[key]))) out[key] = Number(src[key]);
  }
  return out;
}

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

/** The owner's Friend ID from the legacy fast-start cache (genron_profile_<uid>). */
function ownShortId(uid) {
  try {
    const raw = localStorage.getItem("genron_profile_" + uid);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.shortId === "string" && p.shortId) return p.shortId;
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** Copy {coverImage, coverSettings} from the owner's private profile to their card.
 *  Also stamp shortId so the card is findable by friendCover's `where shortId==`
 *  query — a teacher who had no leaderboard card otherwise gets one without it. */
async function publishCover(uid) {
  try {
    if (!uid) return;
    const snap = await getDoc(doc(db, "artifacts", APP_ID, "users", uid, "profile", "main"));
    // A missing/denied read returns a non-existent snapshot, NOT a throw. Treat that
    // as "unknown" and bail — publishing here would write coverImage:null and CLOBBER
    // an already-good card (merge does not protect against an explicit null), which is
    // how a friend's cover silently reverts to the default gradient for everyone.
    if (!snap || !snap.exists()) return;
    const profile = snap.data() || {};
    const coverImage = profile.coverImage || null;
    let frame = "none";
    try {
      frame = localStorage.getItem("oxhIconFrame") || "none";
    } catch {
      /* ignore */
    }
    const patch = {
      ...publicProfileFields(profile),
      frame,
      uid,
    };
    // Only publish the cover when we actually have one — never write a null that would
    // erase a previously-published cover. The crop is meaningful only with an image.
    if (coverImage) {
      patch.coverImage = coverImage;
      patch.coverSettings = currentCoverSettings();
    }
    const shortId = (typeof profile.shortId === "string" && profile.shortId) || ownShortId(uid);
    if (shortId) patch.shortId = shortId; // only when known — never clobber with ""
    await setDoc(doc(db, "artifacts", APP_ID, "public", "data", "customApp", uid), patch, {
      merge: true,
    });
    try {
      localStorage.setItem(BOOT_PUBLISH_PREFIX + uid, String(Date.now()));
    } catch {
      /* ignore */
    }
  } catch {
    /* non-fatal: the owner still sees their own cover locally */
  }
}

function shouldBootPublish(uid) {
  if (!uid) return false;
  try {
    const last = Number(localStorage.getItem(BOOT_PUBLISH_PREFIX + uid) || 0);
    return !Number.isFinite(last) || Date.now() - last > BOOT_PUBLISH_MS;
  } catch {
    return true;
  }
}

/** Install the cover publisher. Idempotent; browser-only. */
export function installCoverSync() {
  if (typeof document === "undefined") return;
  try {
    const uidNow = () => (auth && auth.currentUser ? auth.currentUser.uid : null);

    // (a) Boot backfill — give the legacy app time to restore auth + __oxPbg, then
    // publish once so existing covers reach the public card automatically.
    setTimeout(() => {
      const uid = uidNow();
      if (shouldBootPublish(uid)) publishCover(uid);
    }, 3500);

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
