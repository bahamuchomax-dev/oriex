/* ============================================================
 * friendCover — show ANOTHER user's profile background on their profile.
 * ------------------------------------------------------------
 * The friend-profile screen (.rx-mp with a 戻る button + an "ID xxxx" line in
 * .rx-pid) renders its OWN cover banner as a `.rx-cover` element (a gradient with a
 * dotted `.pat` overlay) that the avatar overlaps. coverSync.js publishes every
 * user's cover image + crop to their public card (public/data/customApp, world
 * readable). Here we read the friend's shortId from .rx-pid, fetch their card, and
 * paint their cover INTO that existing `.rx-cover` (so there is ONE banner in the
 * right place — earlier we injected a second banner, which is the duplicate /
 * mis-positioned background bug). If they have no published cover, the default
 * gradient is left untouched. Cosmetic; the frozen bundle is untouched.
 * ============================================================ */
import { db } from "../firebase/db.js";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

const APP_ID = "gen-ron-kai-app-v1";

// shortId -> { coverImage, size, pos } | null (null = fetched, no cover). A key
// being PRESENT (even inflight=undefined) prevents duplicate queries.
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
    // Teachers have NO customApp card (it's deleted on save) — their public data lives in
    // teacherIndex. Fall back there so a teacher friend's cover photo still paints.
    if (!res) {
      const tq = query(
        collection(db, "artifacts", APP_ID, "public", "data", "teacherIndex"),
        where("shortId", "==", shortId),
        limit(1),
      );
      const tsnap = await getDocs(tq);
      tsnap.forEach((d) => {
        const v = d.data() || {};
        if (v.coverImage) {
          const s = v.coverSettings || {};
          res = { coverImage: v.coverImage, size: s.size || "cover", pos: s.pos || "center" };
        }
      });
    }
    cache.set(shortId, res);
  } catch {
    cache.set(shortId, null);
  }
}

function restore(cover) {
  if (!cover || !cover.getAttribute("data-ox-cover-for")) return;
  cover.style.backgroundImage = "";
  cover.style.backgroundSize = "";
  cover.style.backgroundPosition = "";
  cover.style.backgroundRepeat = "";
  const pat = cover.querySelector(".pat");
  if (pat) pat.style.display = "";
  cover.removeAttribute("data-ox-cover-for");
}

function renderOnce() {
  try {
    if (typeof document === "undefined") return;
    const rxmp = document.querySelector(".rx-mp");
    if (!rxmp) return;
    // friend-profile signature: a 戻る button + an "ID xxxx" line + the cover banner
    const back = rxmp.querySelector(".rx-back");
    const pid = rxmp.querySelector(".rx-pid");
    const cover = rxmp.querySelector(".rx-cover");
    if (!back || !pid || !cover) return; // own page / not a friend profile
    const shortId = parseShortId(pid.textContent);
    if (!shortId) return;

    if (!cache.has(shortId)) {
      cache.set(shortId, undefined); // mark inflight so we query once
      fetchCard(shortId);
      return;
    }
    const card = cache.get(shortId);
    if (!card) {
      restore(cover); // still fetching, or this user published no cover
      return;
    }
    if (cover.getAttribute("data-ox-cover-for") !== shortId) {
      cover.style.backgroundImage = "url(" + card.coverImage + ")";
      cover.style.backgroundSize = card.size;
      cover.style.backgroundPosition = card.pos;
      cover.style.backgroundRepeat = "no-repeat";
      const pat = cover.querySelector(".pat");
      if (pat) pat.style.display = "none"; // hide the dot overlay over a real photo
      cover.setAttribute("data-ox-cover-for", shortId);
    }
  } catch {
    /* a cosmetic cover must never break the app */
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
        setTimeout(() => {
          queued = false;
          if (!document.hidden) renderOnce();
        }, 100);
      };
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    setInterval(() => { if (!document.hidden) renderOnce(); }, 1500);
  } catch {
    /* ignore */
  }
}
