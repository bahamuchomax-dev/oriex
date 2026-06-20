/* ============================================================
 * avatarBake — make the legacy icon ADJUSTMENT actually stick.
 * ------------------------------------------------------------
 * The legacy "アイコンを調整" (zoom/position) is applied only at DISPLAY time via a
 * single [data-oxav] element (the profile-edit preview) — every OTHER place (the
 * header, cards, other viewers) shows the raw photo, so the adjustment "disappears"
 * after saving. Fix: when the profile is saved, BAKE the current adjustment into a
 * cropped square image and write THAT as the avatar (profile/main + public card),
 * then reset the display-time adjustment. The baked image is already cropped, so it
 * shows the same everywhere. Photo avatars only (character keys are untouched).
 * Writes happen AFTER the legacy save (short delay) so they are not overwritten.
 * ============================================================ */
import { auth } from "../firebase/firebase.js";
import { db } from "../firebase/db.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

/** Default (no) adjustment → nothing to bake. Pure. */
export function isDefaultAdjust(s) {
  if (!s) return true;
  const scale = Number(s.scale) || 1;
  const x = s.x == null ? 50 : Number(s.x);
  const y = s.y == null ? 50 : Number(s.y);
  return scale === 1 && x === 50 && y === 50;
}

// Replicate object-fit:cover + object-position(x%,y%) + transform:scale(s) (origin
// x%,y%) into a square CxC canvas — i.e. exactly what the [data-oxav] preview shows.
function bake(photoUrl, s, out = 384) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const C = out;
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;
          if (!iw || !ih) return resolve("");
          const scale = Math.max(0.1, Number(s.scale) || 1);
          const x = s.x == null ? 50 : Number(s.x);
          const y = s.y == null ? 50 : Number(s.y);
          const cover = Math.max(C / iw, C / ih);
          const w0 = iw * cover;
          const h0 = ih * cover;
          const left0 = -(x / 100) * (w0 - C);
          const top0 = -(y / 100) * (h0 - C);
          const px = (x / 100) * C;
          const py = (y / 100) * C;
          const left = px + (left0 - px) * scale;
          const top = py + (top0 - py) * scale;
          const cv = document.createElement("canvas");
          cv.width = C;
          cv.height = C;
          const ctx = cv.getContext("2d");
          if (!ctx) return resolve("");
          ctx.imageSmoothingQuality = "high";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, C, C);
          ctx.drawImage(img, left, top, w0 * scale, h0 * scale);
          return resolve(cv.toDataURL("image/jpeg", 0.88));
        } catch {
          return resolve("");
        }
      };
      img.onerror = () => resolve("");
      img.src = photoUrl;
    } catch {
      resolve("");
    }
  });
}

/** Install the save-time avatar baker. Idempotent; browser-only. */
export function installAvatarBake() {
  if (typeof document === "undefined") return;
  try {
    document.addEventListener(
      "click",
      (e) => {
        try {
          const t = e.target;
          const btn = t && t.closest ? t.closest("button") : null;
          if (!btn || (btn.textContent || "").trim() !== "保存する") return;
          const av = document.querySelector('img[data-oxav]');
          const photo = av ? av.getAttribute("src") || "" : "";
          const cur = window.__oxAv && window.__oxAv._cur ? window.__oxAv._cur.settings : null;
          // Only bake a PHOTO avatar that actually has a non-default adjustment.
          if (!/^data:image/.test(photo) || isDefaultAdjust(cur)) return;
          const settings = { scale: cur.scale, x: cur.x, y: cur.y };
          const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
          if (!uid) return;
          // Write AFTER the legacy save persists the raw photo, so the baked image wins.
          setTimeout(async () => {
            const baked = await bake(photo, settings);
            if (!baked) return;
            const patch = { avatar: baked, updatedAt: serverTimestamp() };
            try {
              await setDoc(doc(db, "artifacts", APP_ID, "users", uid, "profile", "main"), patch, { merge: true });
            } catch {
              /* ignore */
            }
            try {
              await setDoc(doc(db, "artifacts", APP_ID, "public", "data", "customApp", uid), { ...patch, uid }, { merge: true });
            } catch {
              /* ignore */
            }
            // crop is baked in now → clear the display-time adjustment so it is not re-applied
            try {
              if (window.__oxAv && typeof window.__oxAv.resetDefault === "function") window.__oxAv.resetDefault();
            } catch {
              /* ignore */
            }
            try {
              document.querySelectorAll('img[data-oxav]').forEach((im) => {
                im.src = baked;
                im.style.transform = "";
                im.style.objectPosition = "";
              });
            } catch {
              /* ignore */
            }
          }, 1200);
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
