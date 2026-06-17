/* ============================================================
 * friendCover — show ANOTHER user's profile background on their profile.
 * ------------------------------------------------------------
 * The frozen bundle renders only the OWN cover (i.coverImage); the friend-profile
 * screen (.rx-mp with a back button + an "ID xxxx" line in .rx-pid) shows the
 * friend's avatar/name but NOT their background. coverSync.js publishes every
 * user's cover image + crop to their public card (public/data/customApp, world
 * readable). Here we read the friend's shortId from the rendered .rx-pid, fetch
 * their card, and inject a background banner with THEIR crop — so a teacher (or any
 * viewer) sees the student's profile background as they framed it.
 *
 * Cosmetic injection only; the bundle is untouched. Reapplied by an observer +
 * interval like the other oxUi patches.
 * ============================================================ */
import { db } from "../firebase/firebase.js";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";
const BANNER = "data-ox-friendcover";

// shortId -> { coverImage, size, pos } | null (null = fetched, no cover). A key
// being PRESENT (even inflight) prevents duplicate queries for the same friend.
const cache = new Map();

/** "ID 7F3K9" -> "7F3K9" from the .rx-pid line. */
function parseShortId(text) {
  const m = (text || "").match(/ID\s+(\S+)/);
  return m ? m[1] : "";
}

async function fetchCard(shortId) {
  try {
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "customApp"),
      where("shortId", "==", shortId),
      limit(1),
    );
    const snap = await getDocs(q);
    let res = null;
    snap.forEach((d) => {
      const v = d.data() || {};
      if (v.coverImage) {
        const s = v.coverSettings || {};
        res = { coverImage: v.coverImage, size: s.size || "cover", pos: s.pos || "center" };
      }
    });
    cache.set(shortId, res);
  } catch {
    cache.set(shortId, null);
  }
}

function removeBanner(rxmp) {
  const ex = rxmp.querySelector("[" + BANNER + "]");
  if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
}

function renderOnce() {
  try {
    if (typeof document === "undefined") return;
    const rxmp = document.querySelector(".rx-mp");
    if (!rxmp) return;
    // Friend-profile signature: a back button + an "ID xxxx" line. (The own page
    // has neither, and already shows its own cover — never touch it.)
    const back = rxmp.querySelector(".rx-back");
    const pid = rxmp.querySelector(".rx-pid");
    const shortId = back && pid ? parseShortId(pid.textContent) : "";
    if (!shortId) {
      removeBanner(rxmp);
      return;
    }
    if (!cache.has(shortId)) {
      cache.set(shortId, undefined); // mark inflight so we query once
      fetchCard(shortId);
      return;
    }
    const card = cache.get(shortId);
    if (!card) {
      removeBanner(rxmp); // still fetching, or this friend has no published cover
      return;
    }
    let banner = rxmp.querySelector("[" + BANNER + "]");
    if (!banner) {
      banner = document.createElement("div");
      banner.setAttribute(BANNER, "1");
      banner.style.cssText =
        "width:100%;height:132px;border-radius:16px;margin-bottom:12px;" +
        "background-repeat:no-repeat;box-shadow:0 4px 14px rgba(15,23,42,.08)";
      // sit at the top of the profile content, just under the 戻る button
      if (back && back.parentNode) back.parentNode.insertBefore(banner, back.nextSibling);
      else rxmp.insertBefore(banner, rxmp.firstChild);
    }
    if (banner.getAttribute("data-ox-cover-for") !== shortId) {
      banner.style.backgroundImage = "url(" + card.coverImage + ")";
      banner.style.backgroundSize = card.size;
      banner.style.backgroundPosition = card.pos;
      banner.setAttribute("data-ox-cover-for", shortId);
    }
  } catch {
    /* a cosmetic banner must never break the app */
  }
}

/** Install the friend-cover renderer. Idempotent; browser-only. */
export function installFriendCover() {
  if (typeof document === "undefined") return;
  try {
    if (document.readyState !== "loading") setTimeout(renderOnce, 0);
    else document.addEventListener("DOMContentLoaded", renderOnce);

    if (typeof window !== "undefined" && window.MutationObserver) {
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(() => {
          queued = false;
          renderOnce();
        }, 16);
      };
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    setInterval(renderOnce, 700);
  } catch {
    /* ignore */
  }
}
