/* ============================================================
 * cutoverReload — one-time, guarded full reloads for modern cutover transitions
 * ------------------------------------------------------------
 * Two cases need a clean fresh boot because the legacy bundle self-mounts into
 * #root the first time it is imported (cached, no remount) and keeps live
 * Firestore listeners with no safe unmount API:
 *
 *   1) RE-LOGIN after logout in the SAME lifecycle — a second handoff can't
 *      re-mount the cached legacy bundle (CUTOVER_RELOAD_MARKER).
 *   2) LOGOUT — after signOut, legacy's still-active onSnapshot listeners throw
 *      permission-denied (owner-only Rules) and can repaint the OLD legacy login.
 *      A fresh boot lands on the modern login with auth null and legacy NEVER
 *      imported, so those listeners never exist (CUTOVER_LOGOUT_MARKER).
 *
 * Each reload is strictly one-time: a sessionStorage marker is set immediately
 * before the reload and consumed on the next boot; if it is still present when a
 * reload is requested, the reload is suppressed (no loops).
 *
 * Pure-ish + injectable for tests. Touches only window.location + sessionStorage.
 * No password/token/credential is read, written, or logged. Never throws.
 * ============================================================ */

export const CUTOVER_RELOAD_MARKER = "oriexCutoverReloadOnce";
export const CUTOVER_LOGOUT_MARKER = "oriexLogoutReloadOnce";

function safeSessionStorage(win) {
  try {
    const w = win || (typeof window !== "undefined" ? window : null);
    return (w && w.sessionStorage) || null;
  } catch {
    return null;
  }
}

// Consume (clear) a one-time marker. Returns true iff it was present.
function consumeMarker(marker, win) {
  const s = safeSessionStorage(win);
  if (!s) return false;
  try {
    if (s.getItem(marker) === "1") {
      s.removeItem(marker);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

// Perform a one-time same-URL reload guarded by `marker`. Suppressed (returns
// false) when the marker is already set, which prevents reload loops.
function reloadOnce(marker, win) {
  try {
    const w = win || (typeof window !== "undefined" ? window : null);
    if (!w || !w.location) return false;
    const s = safeSessionStorage(w);
    if (s && s.getItem(marker) === "1") return false; // already reloaded once
    if (s) {
      try {
        s.setItem(marker, "1");
      } catch {
        /* ignore — proceed with reload even if the marker can't be set */
      }
    }
    const url = String(w.location.href || "");
    if (typeof w.location.replace === "function") w.location.replace(url);
    else w.location.href = url;
    return true;
  } catch {
    return false;
  }
}

/**
 * Consume the one-time RE-LOGIN reload marker. Call once on bridge mount so a
 * later cycle in a NEW page lifecycle can reload again. Returns true iff present.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function consumeCutoverReloadMarker(win) {
  return consumeMarker(CUTOVER_RELOAD_MARKER, win);
}

/**
 * One-time same-URL reload for the post-logout RE-LOGIN case. Returns true iff it
 * initiated the reload. Never throws.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function reloadForCutoverRelogin(win) {
  return reloadOnce(CUTOVER_RELOAD_MARKER, win);
}

/**
 * Consume the one-time LOGOUT reload marker on boot so each logout gets its own
 * single reload. Returns true iff present. Never throws.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function consumeCutoverLogoutMarker(win) {
  return consumeMarker(CUTOVER_LOGOUT_MARKER, win);
}

/**
 * One-time same-URL reload for LOGOUT — boots a clean modern auth state (auth
 * null → modern login, legacy never imported) so legacy's post-signOut
 * permission-denied listeners can't repaint the old login. Returns true iff it
 * initiated the reload. Never throws.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function reloadForCutoverLogout(win) {
  return reloadOnce(CUTOVER_LOGOUT_MARKER, win);
}
