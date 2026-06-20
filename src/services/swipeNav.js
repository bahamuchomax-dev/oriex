/* ============================================================
 * swipeNav — left/right swipe to move between the bottom-nav tabs.
 * ------------------------------------------------------------
 * The phone user wants to swipe horizontally to move between ホーム / 学習 / 記録 …
 * instead of only tapping the bottom bar. On a horizontal swipe we "click" the
 * previous/next button of the bottom nav.
 *
 * The legacy bundle's bottom nav has NO stable class and marks the active tab only
 * by inline color (no .on / aria), which is why a class-based approach did nothing.
 * So we (1) find the nav as the bottom-most wide short row of 3–8 buttons (any CSS
 * position), and (2) find the active tab by class/aria/data OR a COLOR heuristic
 * (the one accent-colored button among muted ones) — and we also TRACK taps so the
 * active index stays correct across the bundle's re-renders. Frozen bundle untouched.
 * ============================================================ */

const H_MIN = 80; // min horizontal travel (px) — deliberate swipe, not accidental
const H_DOM = 2.0; // horizontal must dominate vertical by this factor
// Over a horizontal scroller (e.g. the 記録 weekly table, minWidth 752px) a flick OR
// a deliberate long swipe switches tabs; only a SHORT, SLOW drag scrolls the table.
// This biases hard toward tab-switching (what the user wants) without removing the
// table's own horizontal scroll. Kept lenient so a normal-speed swipe still switches.
const V_FLICK = 0.2; // px/ms — at/above this a horizontal swipe is a tab-switch flick
const NAV_SEL = "button,a[role=button],[role=tab]";

let sx = 0;
let sy = 0;
let st = 0; // gesture start time (ms) for flick-velocity detection
let tracking = false;
let activeIdx = -1; // tracked active tab (survives re-renders by position)

function nowMs() {
  try {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  } catch {
    return Date.now();
  }
}

function modalOpen() {
  return !!document.querySelector(
    "#oxbg-modal,#oxpbg-modal,#oxav-modal,.ox-ice-backdrop,#ox-icon-editor .ox-ice-modal",
  );
}

let hScroller = null;

function findHorizontalScroller(el) {
  let n = el;
  while (n && n.nodeType === 1 && n !== document.body) {
    if (n.scrollWidth > n.clientWidth + 8) {
      const ov = getComputedStyle(n).overflowX;
      if (ov === "auto" || ov === "scroll") return n;
    }
    n = n.parentElement;
  }
  return null;
}

/** The bottom nav: the bottom-most wide, short row holding 3–8 buttons, regardless
 *  of CSS position (fixed/sticky/static). Class-agnostic so it survives the bundle. */
function findNav() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const all = document.querySelectorAll("nav,footer,div,ul");
  let best = null;
  let bestBottom = -1;
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const btns = el.querySelectorAll(NAV_SEL);
    if (btns.length < 3 || btns.length > 8) continue;
    let r;
    try {
      r = el.getBoundingClientRect();
    } catch {
      continue;
    }
    if (r.width < vw * 0.45 || r.height > 150) continue;
    if (r.bottom < vh - 170 || r.top > vh + 20) continue;
    if (r.bottom > bestBottom) {
      bestBottom = r.bottom;
      best = el;
    }
  }
  return best;
}

function navButtons(nav) {
  return nav ? Array.prototype.slice.call(nav.querySelectorAll(NAV_SEL)) : [];
}

function classStr(el) {
  const c = el.className;
  return typeof c === "string" ? c : c && c.baseVal != null ? c.baseVal : "";
}

/** Active tab by explicit markers (class / aria / data / active child). */
function detectActiveByMarker(btns) {
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    if (/\b(on|active|selected|current)\b/i.test(classStr(b))) return i;
    const as = b.getAttribute("aria-selected");
    const ac = b.getAttribute("aria-current");
    if (as === "true" || ac === "true" || ac === "page" || ac === "step") return i;
    if (b.getAttribute("data-active") != null || b.getAttribute("data-selected") != null) return i;
    if (b.querySelector && b.querySelector('.on,.active,[aria-current="page"]')) return i;
  }
  return -1;
}

/** Active tab by COLOR: the legacy nav colors the active tab with the accent while
 *  the others are muted, so the active one is the odd colour out. */
function detectActiveByColor(btns) {
  const colors = btns.map((b) => {
    const svg = b.querySelector("svg");
    try {
      if (svg) {
        const cs = getComputedStyle(svg);
        return cs.stroke && cs.stroke !== "none" ? cs.stroke : cs.color;
      }
      return getComputedStyle(b).color;
    } catch {
      return "";
    }
  });
  const counts = {};
  for (const c of colors) counts[c] = (counts[c] || 0) + 1;
  // the accent tab's colour appears exactly once among otherwise-uniform muted tabs
  for (let i = 0; i < colors.length; i++) {
    if (colors[i] && counts[colors[i]] === 1) return i;
  }
  return -1;
}

/** Active tab by BACKGROUND fill: the legacy bottom nav gives the active tab a
 *  translucent pill background while the others are transparent. This is the most
 *  reliable signal here because the raised ホーム button's icon is ALWAYS white, which
 *  breaks the colour heuristic for every non-home tab (two "white" icons → ambiguous).
 *  The active non-home tab is the one whose own background is not fully transparent. */
function detectActiveByBg(btns) {
  for (let i = 0; i < btns.length; i++) {
    try {
      const bg = getComputedStyle(btns[i]).backgroundColor;
      // transparent computes to rgba(0,0,0,0); any non-zero alpha = the active pill.
      if (bg && bg !== "transparent" && !/,\s*0\)\s*$/.test(bg) && bg !== "rgba(0, 0, 0, 0)") return i;
    } catch {
      /* ignore */
    }
  }
  return -1;
}

function activeIndex(btns) {
  // DETECT the active tab from the nav every time so the swipe target is correct even
  // when the screen was reached WITHOUT tapping the nav — e.g. the 記録 / 勉強時間記録
  // screen opened from a home quick-action, which never updates the tracked tap index
  // (the root cause of "can't swipe from 記録" while every other tab works). Background
  // fill is primary (reliable for non-home tabs); marker/colour catch the ホーム tab;
  // the tracked tap index is only a last resort.
  let i = detectActiveByBg(btns);
  if (i < 0) i = detectActiveByMarker(btns);
  if (i < 0) i = detectActiveByColor(btns);
  if (i >= 0) {
    activeIdx = i; // keep the tracked index in sync with reality
    return i;
  }
  if (activeIdx >= 0 && activeIdx < btns.length) return activeIdx;
  return -1;
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
    target.closest("input,textarea,select,[contenteditable=true],canvas,.rx-timer,.rx-profile-edit,[data-no-swipe]")
  ) {
    return;
  }
  hScroller = findHorizontalScroller(target);
  sx = t.clientX;
  sy = t.clientY;
  st = nowMs();
  tracking = true;
}

function onEnd(e) {
  if (!tracking) return;
  tracking = false;
  const t = (e.changedTouches && e.changedTouches[0]) || e;
  const dx = t.clientX - sx;
  const dy = t.clientY - sy;
  if (Math.abs(dx) < H_MIN || Math.abs(dx) < Math.abs(dy) * H_DOM) return;
  if (hScroller) {
    // Bias HARD toward switching tabs (what the user wants on 記録): a flick OR a
    // deliberate long swipe switches tabs. Only a SHORT, SLOW drag that the table can
    // still absorb is treated as a horizontal table scroll.
    const dt = Math.max(1, nowMs() - st);
    const vx = Math.abs(dx) / dt; // px/ms
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const longSwipe = Math.abs(dx) >= Math.min(120, vw * 0.22);
    if (vx < V_FLICK && !longSwipe) {
      const canScrollLeft = hScroller.scrollLeft > 1;
      const canScrollRight = hScroller.scrollLeft < hScroller.scrollWidth - hScroller.clientWidth - 1;
      if ((dx < 0 && canScrollRight) || (dx > 0 && canScrollLeft)) return;
    }
  }
  const nav = findNav();
  const btns = navButtons(nav);
  if (btns.length < 2) return;
  const idx = activeIndex(btns);
  if (idx < 0) return; // genuinely can't tell which tab is active — don't jump blindly
  // swipe LEFT (dx<0) → next tab to the right; swipe RIGHT → previous
  const next = dx < 0 ? idx + 1 : idx - 1;
  if (next < 0 || next >= btns.length) return;
  activeIdx = next;
  btns[next].click();
  slideIn(dx < 0 ? "l" : "r");
}

/** Keep the tracked active index in sync with manual taps on the nav. */
function onNavTap(e) {
  try {
    const t = e.target;
    if (!t || !t.closest) return;
    const nav = findNav();
    if (!nav || !nav.contains(t)) return;
    const btn = t.closest(NAV_SEL);
    if (!btn) return;
    const i = navButtons(nav).indexOf(btn);
    if (i >= 0) activeIdx = i;
  } catch {
    /* ignore */
  }
}

/** Seamless feel: slide the freshly-shown screen in from the swipe direction. */
function slideIn(dir) {
  const cls = dir === "l" ? "ox-swipe-l" : "ox-swipe-r";
  let tries = 0;
  const tick = () => {
    const el = document.querySelector(".rx-home, .rx-mp");
    if (el) {
      el.classList.remove("ox-swipe-l", "ox-swipe-r");
      void el.offsetWidth; // restart the animation
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 360);
      return;
    }
    if (tries++ < 4) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Install swipe-to-switch-tab. Idempotent; browser-only. */
export function installSwipeNav() {
  if (typeof document === "undefined" || document.__oxSwipeNav) return;
  try {
    document.__oxSwipeNav = true;
    // CAPTURE phase: observe the gesture BEFORE inner components (e.g. the friend-
    // timeline preview / any swipeable carousel) can stopPropagation a touch event and
    // "absorb" the swipe. Passive (we never preventDefault), so native scrolling inside
    // those elements still works for a short slow drag; a flick/long swipe still
    // switches tabs (see onEnd).
    document.addEventListener("touchstart", onStart, { passive: true, capture: true });
    document.addEventListener("touchend", onEnd, { passive: true, capture: true });
    document.addEventListener("click", onNavTap, true);
  } catch {
    /* ignore */
  }
}
