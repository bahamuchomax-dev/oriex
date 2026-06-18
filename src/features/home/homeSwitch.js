/* ============================================================
 * homeSwitch — shared "switch between the new & original home" helper.
 * ------------------------------------------------------------
 * Extracted from Home.jsx so the switch can live in ONE place (設定 /
 * SettingsView) instead of being duplicated on the home dashboard. Both
 * Home.jsx (to persist the opt-in) and SettingsView.jsx (the only entry
 * point that flips back) import from here. Pure DOM/localStorage — no React.
 * ============================================================ */

// localStorage flags the dispatcher (src/main.js) + oxUiPatches read.
export const HOME_FLAG = "oriexHome"; // "1" => boot into the new React home
export const TOGGLE_FLAG = "oriexHomeToggle"; // "1" => legacy side shows a "新ホーム" button

/** Switch to the ORIGINAL (legacy) home: clear the home flag, keep the toggle so
 *  the legacy side offers a way back, strip the URL opt-in, and reload. */
export function switchToOriginalHome() {
  try { window.localStorage.setItem(TOGGLE_FLAG, "1"); } catch { /* ignore */ }
  try { window.localStorage.removeItem(HOME_FLAG); } catch { /* ignore */ }
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete(HOME_FLAG);
    if (u.hash.replace(/^#/, "") === "oriex-home") u.hash = "";
    window.location.replace(u.toString());
  } catch {
    try { window.location.reload(); } catch { /* ignore */ }
  }
}
