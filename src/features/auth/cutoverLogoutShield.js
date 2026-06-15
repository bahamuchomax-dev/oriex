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

/** True iff `start` (or a close ancestor) is a narrow legacy logout control. */
export function isLogoutControl(start) {
  let el = start;
  for (let i = 0; el && i < 4; i++) {
    if (el.nodeType === 1) {
      // never treat the modern auth UI's own controls as a legacy logout
      if (el.classList && el.classList.contains("ox-auth")) return false;
      const role = typeof el.getAttribute === "function" ? el.getAttribute("role") : null;
      if (el.tagName === "BUTTON" || el.tagName === "A" || role === "button") {
        const txt = (el.textContent || "").trim().toLowerCase();
        if (txt.length <= 16) {
          for (const t of LOGOUT_TEXTS) {
            if (txt.indexOf(t.toLowerCase()) !== -1) return true;
          }
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
      // Do not intercept inside the modern auth form/screen (its own logout is
      // handled by the modern shell), only the legacy app under #root.
      if (t && typeof t.closest === "function" && t.closest(".ox-auth")) return;
      if (!isLogoutControl(t)) return;

      // Cancel BEFORE legacy sees it so its logout-render path never runs.
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      if (typeof onLogoutIntent === "function") onLogoutIntent();
    } catch {
      /* ignore — shield is best-effort visual/routing only */
    }
  };

  const EVENTS = ["pointerdown", "touchstart", "click"];
  EVENTS.forEach((n) => document.addEventListener(n, handler, true));
  return () => {
    EVENTS.forEach((n) => document.removeEventListener(n, handler, true));
  };
}
