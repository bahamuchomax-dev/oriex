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
    const run = () => relabelOnce(map);

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
