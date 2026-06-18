import { createRoot } from "react-dom/client";
import LaboLegacy from "./LaboLegacy.jsx";

/* ============================================================
 * mountLaboLegacy — bridges the de-minified legacy ("old home") app to the
 * React LABO. The legacy ひろば's「LABO」card navigates to its `labo` screen,
 * whose render contains a native top bar (「‹ ひろば」back) + an empty host
 * <div id="ox-labo-host">. Here we mount the LIGHT LaboLegacy into that host
 * with our OWN React root (independent of the legacy React tree — two roots on
 * one page is safe). We (re)mount when the host appears (the legacy re-creates
 * it on navigation) and unmount when it leaves. Installed from main.js; a no-op
 * on the new React home (#root holds .oxh) and outside the browser.
 * ============================================================ */

const HOST_ID = "ox-labo-host";
let root = null;
let host = null;

function sync() {
  const el = document.getElementById(HOST_ID);
  if (el) {
    // (Re)mount if this is a new host node, or the legacy re-render cleared ours.
    if (el !== host || el.childElementCount === 0) {
      if (root) {
        try { root.unmount(); } catch { /* ignore */ }
        root = null;
      }
      host = el;
      try {
        root = createRoot(el);
        root.render(<LaboLegacy />);
      } catch { /* never break the legacy app */ }
    }
  } else if (host) {
    // Left the LABO screen — tear down.
    if (root) {
      try { root.unmount(); } catch { /* ignore */ }
      root = null;
    }
    host = null;
  }
}

export function installLaboLegacy() {
  if (typeof document === "undefined" || !document.body) return;
  const tick = () => { try { sync(); } catch { /* ignore */ } };
  try {
    const mo = new MutationObserver(tick);
    mo.observe(document.body, { childList: true, subtree: true });
  } catch { /* ignore */ }
  // Safety net for renders the observer coalesces past; cheap and infrequent.
  try { window.setInterval(tick, 700); } catch { /* ignore */ }
  tick();
}
