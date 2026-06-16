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

// Hamburger MENU icon tiles are a 52x52 rounded div with a
// `linear-gradient(145deg, <c1>, <c2>)` FILL and a white glyph. The user wants
// them OUTLINED in that color instead of filled: white tile + colored border +
// colored glyph. We read the gradient's first color and restyle. After restyle
// the background is no longer a gradient, so the element stops matching the
// selector (idempotent); a React re-render restores the gradient and we re-apply.
const MENU_TILE_SELECTOR = 'div[style*="linear-gradient(145deg"]';

/** Extract the first color of a `linear-gradient(145deg, C, K)` string. Pure. */
export function firstGradientColor(bg) {
  const s = typeof bg === "string" ? bg : "";
  // First color may be #hex, rgb()/rgba() (which contain commas) or a name.
  const m = s.match(/linear-gradient\(\s*145deg\s*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)/i);
  return m ? m[1].trim() : "";
}

// Recolor a glyph node to `color` robustly: the white glyph may be painted via a
// fill attr, a stroke attr, currentColor, or CSS, so don't rely on matching the
// exact white token. Fill: set to color UNLESS it is explicitly "none" (so a
// stroke-only/outline icon is not filled in). Stroke: set to color when present.
function paintNode(el, color) {
  if (!el || !el.getAttribute) return;
  const f = el.getAttribute("fill");
  if (f !== "none") {
    try {
      el.setAttribute("fill", color);
    } catch {
      /* ignore */
    }
  }
  const s = el.getAttribute("stroke");
  if (s && s !== "none") {
    try {
      el.setAttribute("stroke", color);
    } catch {
      /* ignore */
    }
  }
}

/** A light tint (hex8) of a #rrggbb color for the tile fill, else "" (use white). */
export function tintOf(color) {
  return /^#[0-9a-f]{6}$/i.test(color || "") ? color + "26" : "";
}

function outlineMenuIconsOnce() {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const tiles = document.querySelectorAll(MENU_TILE_SELECTOR);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      if (tile.offsetWidth > 80) continue; // menu tiles are 52px; skip big gradients
      const color = firstGradientColor(tile.style.background || tile.style.backgroundImage || "");
      if (!color) continue;
      // light tint instead of a solid fill, with a clear colored border — so each
      // tile stays distinguishable by color (a plain white tile + faint glyph was
      // unreadable). Glyph recolored to the color so it's visible on the tint.
      tile.style.background = tintOf(color) || "#ffffff";
      tile.style.backgroundImage = "none";
      tile.style.border = "2.5px solid " + color;
      tile.style.boxShadow = "none";
      const svg = tile.querySelector("svg");
      if (svg) {
        svg.style.color = color; // for glyphs that use currentColor
        svg.style.fill = color;
        paintNode(svg, color);
        const kids = svg.querySelectorAll("*");
        for (let k = 0; k < kids.length; k++) paintNode(kids[k], color);
      }
    }
  } catch {
    /* cosmetic only */
  }
}

// The 先生用管理 (teacher admin / settingsApp) screen is dark-themed (navy bg +
// white/gray/teal text via the bundle's `A` palette) while every other tab is
// light, so its gray-on-navy body text is hard to read. Convert it to the light
// look: light container + light cards + dark text. Detected by its title, since
// the screen uses only generic utility classes.
function parseRgb(s) {
  const m = typeof s === "string" && s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
}
/** True iff a CSS color string is an opaque, dark color. Pure + tested. */
export function isDarkOpaqueColor(s) {
  const c = parseRgb(s);
  if (!c || c.a < 0.5) return false;
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 120;
}

function findAdminContainer() {
  const nodes = document.querySelectorAll("h1,h2,h3,div,span");
  for (let i = 0; i < nodes.length; i++) {
    if ((nodes[i].textContent || "").trim() === "先生用管理") {
      let p = nodes[i];
      for (let up = 0; up < 8 && p; up += 1) {
        if (p.style && p.style.position === "absolute") return p;
        p = p.parentElement;
      }
      return nodes[i].parentElement;
    }
  }
  return null;
}

function lightenAdminOnce() {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll || !window.getComputedStyle) return;
    const container = findAdminContainer();
    if (!container) return;
    if (container.classList && !container.classList.contains("ox-admin-light")) {
      container.classList.add("ox-admin-light");
    }
    if (isDarkOpaqueColor(window.getComputedStyle(container).backgroundColor)) {
      container.style.setProperty("background", "#fbf8f3", "important");
    }
    const els = container.querySelectorAll("*");
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.tagName === "SVG" || el.tagName === "PATH") continue;
      const bgc = window.getComputedStyle(el).backgroundColor;
      if (isDarkOpaqueColor(bgc)) {
        el.style.setProperty("background-color", "#ffffff", "important");
        el.style.setProperty("background-image", "none", "important");
      }
    }
  } catch {
    /* cosmetic only */
  }
}

// On a photo background the top profile header (avatar + name + 現論会 校名 +
// streak) sits directly on the photo and can be hard to read. That header uses
// only generic utility classes, so we find it by its org label ("現論会…") and
// back the nearest ancestor row that contains the avatar image. Photo-bg only.
const HEADER_BACK = "rgba(255,255,255,0.66)";

function backProfileHeaderOnce() {
  try {
    if (typeof document === "undefined" || !document.body) return;
    if (!document.body.classList || !document.body.classList.contains("oxbg-on")) return;
    const spans = document.querySelectorAll("span");
    for (let i = 0; i < spans.length; i++) {
      if ((spans[i].textContent || "").trim().indexOf("現論会") !== 0) continue;
      let el = spans[i].parentElement;
      let hops = 0;
      while (el && hops < 6) {
        if (el.querySelector && el.querySelector('img[data-oxav], img[alt="avatar"]')) break;
        el = el.parentElement;
        hops += 1;
      }
      if (el && el.style && String(el.style.background).indexOf("255, 255, 255, 0.66") < 0) {
        el.style.background = HEADER_BACK;
        el.style.borderRadius = "16px";
        el.style.padding = "6px 10px";
        el.style.backdropFilter = "blur(6px)";
        el.style.webkitBackdropFilter = "blur(6px)";
      }
      return;
    }
  } catch {
    /* cosmetic only */
  }
}

// Section headings that sit directly on the photo veil (no card backing). On a
// photo background give just these a white halo so they stay legible — they have
// mixed markup (.rx-sec h3 AND inline-styled headings) so we match by exact text.
export const VEIL_HALO_TEXTS = [
  "プレイリスト",
  "つながり",
  "お知らせ",
  "クイックメニュー",
  "最近の記録",
  "アカウント",
];
const VEIL_HALO =
  "0 1px 2px rgba(255,255,255,.95), 0 0 8px rgba(255,255,255,.75), 0 0 2px rgba(255,255,255,.9)";

function haloVeilHeadingsOnce() {
  try {
    if (typeof document === "undefined" || !document.body) return;
    if (!document.body.classList || !document.body.classList.contains("oxbg-on")) return;
    const nodes = document.querySelectorAll("h1,h2,h3,h4,b,span,div,p");
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.childElementCount !== 0) continue;
      if (VEIL_HALO_TEXTS.indexOf((el.textContent || "").trim()) < 0) continue;
      if (String(el.style.textShadow).indexOf("255, 255, 255") < 0) {
        el.style.textShadow = VEIL_HALO;
      }
    }
  } catch {
    /* cosmetic only */
  }
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
    // Preload the hamster image so the icon swap is INSTANT (no async-load size
    // pop / flicker when the swapped <img> first appears).
    try {
      if (typeof Image === "function") {
        const pre = new Image();
        pre.src = HAMSTER_URL;
      }
    } catch {
      /* ignore */
    }
    const run = () => {
      relabelOnce(map);
      hideSectionsOnce(HIDE_SECTION_HEADINGS);
      swapHamsterIconsOnce();
      outlineMenuIconsOnce();
      backProfileHeaderOnce();
      lightenAdminOnce();
      haloVeilHeadingsOnce();
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
