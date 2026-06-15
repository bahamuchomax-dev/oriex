/* ============================================================
 * appVersionBadge — show the app version AFTER login too (unified).
 * ------------------------------------------------------------
 * The login screen already shows the version in its card; once the legacy app
 * takes over #root there is no version shown. To keep the version表記 consistent
 * everywhere, this injects a tiny, subtle, NON-interactive version label fixed at
 * the bottom edge (outside #root, so the legacy app never removes it). Same value
 * as the login card (APP_VERSION_LABEL → package.json). UI only; never throws.
 * ============================================================ */
import { APP_VERSION_LABEL } from "../../appVersion.js";

const BADGE_ID = "ox-version-badge";

export function showVersionBadge() {
  try {
    if (typeof document === "undefined" || !document.body) return;
    let el = document.getElementById(BADGE_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = BADGE_ID;
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = [
        "position:fixed",
        "left:0",
        "right:0",
        "bottom:max(2px,env(safe-area-inset-bottom,0px))",
        "z-index:2147483000",
        "text-align:center",
        "pointer-events:none",
        "margin:0",
        "font:600 10px/1.2 -apple-system,BlinkMacSystemFont,system-ui,sans-serif",
        "letter-spacing:0.5px",
        "color:rgba(43,39,36,0.32)",
      ].join(";");
      document.body.appendChild(el);
    }
    el.textContent = APP_VERSION_LABEL;
  } catch {
    /* ignore — best-effort visual only */
  }
}

export function hideVersionBadge() {
  try {
    if (typeof document === "undefined") return;
    const el = document.getElementById(BADGE_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch {
    /* ignore */
  }
}
