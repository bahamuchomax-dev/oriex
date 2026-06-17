/* ============================================================
 * cutoverLogoutShield — stop the LEGACY logout handler from rendering its old
 * login while the modern cutover owns auth.
 * ------------------------------------------------------------
 * The legacy logout button, left alone, signs out and renders the OLD legacy
 * login in #root before the cutover layer can react (the auth observer is too
 * late). This shield installs a CAPTURE-phase listener on `document`, so it sees
 * a logout press BEFORE the event reaches the legacy app. On a logout control it
 * CANCELS the event (preventDefault + stopPropagation + stopImmediatePropagation)
 * so legacy's own handler never runs, and hands control to the cutover layer's
 * onLogoutIntent (raise veil + run the modern Firebase sign-out).
 *
 * UI/routing only: no password/token/credential is read, written, or logged.
 * Only the cutover bridge installs this; the emergency ?oriexLegacyFallback=1
 * path never mounts the bridge, so legacy logout behaves normally there.
 * ============================================================ */

// Narrow, near-exact logout labels. Kept short so a big container that merely
// contains the word is not matched (we also bound the element text length).
const LOGOUT_TEXTS = ["ログアウト", "サインアウト", "logout", "log out", "sign out"];
// The legacy bundle's distinctive logout-icon SVG path. Language-INDEPENDENT and
// stable for this app, so it matches the icon-style logout control even though
// the bundle stores its Japanese labels as \uXXXX escapes (and the control may
// be a <div>/<span>, not a <button>).
const LOGOUT_ICON_PATH_PREFIX = "M15 12H3";

/** True iff `start` (or a close ancestor) is a narrow legacy logout control. */
export function isLogoutControl(start) {
  let el = start;
  // Tight walk (4): match the logout control itself / icon-in-button, NOT a big
  // top-bar container — otherwise a tap anywhere near the corner would count.
  for (let i = 0; el && i < 4; i++) {
    if (el.nodeType === 1) {
      // never treat the modern auth UI's own controls as a legacy logout
      if (el.classList && el.classList.contains("ox-auth")) return false;

      // 1) title / aria-label (the icon-only logout button carries title="ログアウト")
      const label =
        typeof el.getAttribute === "function"
          ? (el.getAttribute("title") || el.getAttribute("aria-label") || "")
          : "";
      const labelLc = label.toLowerCase();
      for (const t of LOGOUT_TEXTS) {
        if (labelLc.indexOf(t.toLowerCase()) !== -1) return true;
      }

      // Bound to a SMALL control so we don't match a big container that merely
      // contains a logout item somewhere deeper.
      const txt = (el.textContent || "").trim();
      if (txt.length <= 24) {
        const txtLc = txt.toLowerCase();
        for (const t of LOGOUT_TEXTS) {
          if (txtLc.indexOf(t.toLowerCase()) !== -1) return true;
        }
        // 2) distinctive logout icon path (works regardless of tag/language)
        try {
          if (el.querySelector && el.querySelector('path[d^="' + LOGOUT_ICON_PATH_PREFIX + '"]')) {
            return true;
          }
        } catch {
          /* ignore selector errors */
        }
      }
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Install the capture-phase logout shield on `document`.
 * @param {{ onLogoutIntent?: () => void }} [opts]
 * @returns {() => void} cleanup that removes the listeners
 */
export function installCutoverLogoutShield({ onLogoutIntent } = {}) {
  if (typeof document === "undefined") return () => {};

  const handler = (e) => {
    try {
      const t = e.target;
      // Do not intercept anything in the modern cutover UI (login shell, branded
      // loaders, and the logout CONFIRM dialog all live in #oriex-modern-cutover /
      // .ox-auth) — only the legacy app under #root.
      if (
        t &&
        typeof t.closest === "function" &&
        (t.closest(".ox-auth") || t.closest("#oriex-modern-cutover"))
      ) {
        return;
      }
      if (!isLogoutControl(t)) return;

      // Cancel BEFORE legacy sees it so its logout-render path never runs.
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      // Anti-mis-tap: pointerdown/touchstart are still CANCELLED (legacy never logs
      // out early), but only a deliberate CLICK opens the confirm dialog — so a
      // graze / scroll / near-miss by the corner icon no longer pops it.
      if (e.type === "click" && typeof onLogoutIntent === "function") onLogoutIntent();
    } catch {
      /* ignore — shield is best-effort visual/routing only */
    }
  };

  // capture: true  -> we see the press before the legacy app's own handler.
  // passive: false -> required so preventDefault() actually works; touchstart is
  //                   passive-by-default in Chrome, which otherwise ignores it
  //                   (the "[Intervention] Unable to preventDefault" warning).
  const OPTS = { capture: true, passive: false };
  const EVENTS = ["pointerdown", "touchstart", "click"];
  EVENTS.forEach((n) => document.addEventListener(n, handler, OPTS));
  return () => {
    EVENTS.forEach((n) => document.removeEventListener(n, handler, OPTS));
  };
}
