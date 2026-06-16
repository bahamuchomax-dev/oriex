/* ============================================================
 * oxUiPatches — durable runtime relabels over the frozen legacy bundle's DOM
 * ------------------------------------------------------------
 * The live app is the frozen, minified legacy bundle — its JSX (e.g. the bottom
 * nav labels) cannot be hand-edited. oxHelpers.js already establishes the
 * codebase pattern for adjusting the bundle's OUTPUT at runtime (MutationObserver
 * + a low-frequency interval that re-applies after React re-renders). This module
 * uses that same mechanism for small, exact-match text relabels.
 *
 * Currently: rename the bottom-nav "マイ" tab to "マイページ" (the bundle renders
 * {id:"myPage",label:"マイ"} — see src/legacy/oriex-app.bundle.js). Pure relabel
 * decisions live in nextLabel() so they are unit-tested without a DOM.
 * ============================================================ */

// Exact whole-label renames, keyed by the EXACT trimmed text the bundle renders.
// Whole-text equality (not substring) so "マイワード" etc. are never touched.
export const RELABELS = { "マイ": "マイページ" };

// Teacher/admin sections to REMOVE from the (frozen-bundle) admin screen. Each is
// an <h3>/<button> heading whose whole text equals one of these; we hide its
// PARENT (the section card that holds the heading + its controls). Exact-text
// match means a container with extra text never matches, so only the intended
// section is hidden. Cosmetic + reversible (display:none, try/caught) — the
// bundle JS is untouched. NOTE: hiding the パスワード一覧 UI stops it being shown,
// but the legacy plaintext password DATA still exists in Firestore — retiring
// that store is a separate follow-up (see auth-password-architecture memory).
export const HIDE_SECTION_HEADINGS = [
  "招待コード管理",
  "パスワード一覧",
  "先生管理",
  "ユーザー管理",
];

/**
 * The replacement for a label's text, or null to leave it unchanged (no mapping,
 * or it already equals the target). Pure + unit-tested.
 * @param {unknown} text
 * @param {Record<string,string>} [map]
 * @returns {string|null}
 */
export function nextLabel(text, map = RELABELS) {
  const t = (text == null ? "" : String(text)).trim();
  if (Object.prototype.hasOwnProperty.call(map, t)) {
    return map[t] === t ? null : map[t];
  }
  return null;
}

// A label is a leaf element holding only text (no child elements) — e.g. the
// nav <span>. Restricting to leaves avoids rewriting a container that merely
// happens to contain the text plus other markup.
function isLeafLabel(el) {
  return !!el && el.childElementCount === 0;
}

/** True iff this exact (trimmed) heading text marks a section to remove. Pure. */
export function isHideHeading(text, headings = HIDE_SECTION_HEADINGS) {
  const t = (text == null ? "" : String(text)).trim();
  return headings.indexOf(t) >= 0;
}

// The hamster "house + wheel" icon is embedded in the frozen bundle as base64
// webp and shown on the home / cards. Swap just those <img> srcs to the new
// public/hamster.png (the run-animation frames use DIFFERENT prefixes, so they
// keep animating). Matched by the exact base64 head of each embedded variant.
export const HAMSTER_SRC_PREFIXES = [
  "data:image/webp;base64,UklGRkIe",
  "data:image/webp;base64,UklGRuQm",
];
const HAMSTER_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL
    ? import.meta.env.BASE_URL
    : "/") + "hamster.png";

/** True iff this <img> src is one of the embedded hamster-icon images. Pure. */
export function isHamsterIconSrc(src, prefixes = HAMSTER_SRC_PREFIXES) {
  const s = typeof src === "string" ? src : "";
  return prefixes.some((p) => s.indexOf(p) === 0);
}

function swapHamsterIconsOnce() {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const imgs = document.querySelectorAll('img[src^="data:image/webp;base64,UklGR"]');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      if (isHamsterIconSrc(img.getAttribute("src") || "")) {
        img.setAttribute("src", HAMSTER_URL); // no longer matches the prefix -> idempotent
      }
    }
  } catch {
    /* a cosmetic swap must never break the app */
  }
}

function hideSectionsOnce(headings) {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    // Section headings in the admin screen are <h3> (some actions are <button>).
    // An icon <svg> child contributes no text, so textContent is just the label.
    const nodes = document.querySelectorAll("h2,h3,h4,button");
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!isHideHeading(el.textContent, headings)) continue;
      const section = el.parentElement;
      if (section && section.style && section.style.display !== "none") {
        section.style.display = "none";
      }
    }
  } catch {
    /* a cosmetic removal must never break the app */
  }
}

function relabelOnce(map) {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const nodes = document.querySelectorAll("span,div,button,a,p");
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!isLeafLabel(el)) continue;
      const repl = nextLabel(el.textContent, map);
      if (repl != null && el.textContent !== repl) el.textContent = repl;
    }
  } catch {
    /* never let a cosmetic patch break the app */
  }
}

/** Install the relabel patches. Idempotent enough to call once at startup. */
export function installUiPatches(map = RELABELS) {
  try {
    if (typeof document === "undefined") return;
    const run = () => {
      relabelOnce(map);
      hideSectionsOnce(HIDE_SECTION_HEADINGS);
      swapHamsterIconsOnce();
    };

    if (document.readyState !== "loading") setTimeout(run, 0);
    else document.addEventListener("DOMContentLoaded", run);

    if (typeof window !== "undefined" && window.MutationObserver) {
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(() => {
          queued = false;
          run();
        }, 16);
      };
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    // Backstop for re-renders the observer might coalesce away (mirrors oxHelpers).
    setInterval(run, 700);
  } catch {
    /* ignore */
  }
}
