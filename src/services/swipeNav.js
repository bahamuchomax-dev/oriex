/* ============================================================
 * swipeNav — left/right swipe to move between the bottom-nav tabs.
 * ------------------------------------------------------------
 * On a phone the user wants to swipe horizontally to move between ホーム / 学習 /
 * ひろば … instead of only tapping the bottom bar. We detect a horizontal swipe and
 * "click" the previous/next button of the bottom nav. The nav is found at RUNTIME
 * (a fixed bar near the bottom with a few buttons), so it works without depending
 * on the frozen bundle's class names. We ignore swipes that begin on a horizontally
 * scrollable row (category/student chips), an input, or while a modal is open, so
 * normal interactions are untouched. Frozen bundle untouched.
 * ============================================================ */

const H_MIN = 60; // min horizontal travel (px) to count as a swipe
const H_DOM = 1.7; // horizontal must dominate vertical by this factor

let sx = 0;
let sy = 0;
let tracking = false;

function modalOpen() {
  return !!document.querySelector(
    "#oxbg-modal,#oxpbg-modal,#oxav-modal,.ox-ice-backdrop,#ox-icon-editor .ox-ice-modal",
  );
}

/** True if the touch began inside a horizontally scrollable element (chips row). */
function inHorizontalScroller(el) {
  let n = el;
  while (n && n.nodeType === 1 && n !== document.body) {
    if (n.scrollWidth > n.clientWidth + 6) {
      const ov = getComputedStyle(n).overflowX;
      if (ov === "auto" || ov === "scroll") return true;
    }
    n = n.parentElement;
  }
  return false;
}

/** Find the bottom navigation bar: a fixed element near the viewport bottom that
 *  holds a small row of buttons. Class-agnostic so it survives bundle changes. */
function findNav() {
  const byClass = document.querySelector(".rx-tabbar");
  if (byClass && byClass.querySelectorAll("button").length >= 2) return byClass;
  const els = document.querySelectorAll("nav,div");
  const vh = window.innerHeight || document.documentElement.clientHeight;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    let cs;
    try {
      cs = getComputedStyle(el);
    } catch {
      continue;
    }
    if (cs.position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width < vh * 0.4 || r.bottom < vh - 130 || r.top > vh) continue;
    const btns = el.querySelectorAll("button");
    if (btns.length >= 3 && btns.length <= 6) return el;
  }
  return null;
}

function onStart(e) {
  tracking = false;
  if (e.touches && e.touches.length > 1) return;
  if (modalOpen()) return;
  const t = e.touches ? e.touches[0] : e;
  const target = e.target;
  if (
    target &&
    target.closest &&
    (target.closest("input,textarea,select,[contenteditable=true]") ||
      target.closest(".rx-tabbar") ||
      inHorizontalScroller(target))
  ) {
    return;
  }
  sx = t.clientX;
  sy = t.clientY;
  tracking = true;
}

function onEnd(e) {
  if (!tracking) return;
  tracking = false;
  const t = (e.changedTouches && e.changedTouches[0]) || e;
  const dx = t.clientX - sx;
  const dy = t.clientY - sy;
  if (Math.abs(dx) < H_MIN || Math.abs(dx) < Math.abs(dy) * H_DOM) return;
  const nav = findNav();
  if (!nav) return;
  const btns = Array.prototype.slice.call(nav.querySelectorAll("button"));
  if (btns.length < 2) return;
  let idx = btns.findIndex((b) => /(^|\s)on(\s|$)/.test(b.className || ""));
  if (idx < 0) idx = btns.findIndex((b) => b.getAttribute("aria-selected") === "true");
  if (idx < 0) return; // can't tell which tab is active — do nothing
  // Swipe left (dx<0) → next tab to the right; swipe right → previous.
  const next = dx < 0 ? idx + 1 : idx - 1;
  if (next < 0 || next >= btns.length) return;
  btns[next].click();
}

/** Install swipe-to-switch-tab. Idempotent; browser-only. */
export function installSwipeNav() {
  if (typeof document === "undefined" || document.__oxSwipeNav) return;
  try {
    document.__oxSwipeNav = true;
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
  } catch {
    /* ignore */
  }
}
