/* ============================================================
 * cutoverReload — one-time, guarded full reload for post-logout RE-LOGIN
 * ------------------------------------------------------------
 * Why this exists: the legacy app bundle self-mounts into #root on its FIRST
 * dynamic import and has no exported remount entry point. ES module imports are
 * cached, so a SECOND in-lifecycle handoff (cutover login → home → logout →
 * modern login → re-login) cannot re-run the legacy bootstrap — legacy stays on
 * the OLD legacy login screen it rendered when Firebase Auth signed out.
 *
 * The verified path back to Oriex home is a fresh page boot with a persisted
 * session (the "signed-in reload" flow). So on the second-cycle re-login ONLY we
 * reload the SAME URL once. A sessionStorage marker makes this strictly one-time
 * (no reload loops): it is set immediately before the reload and consumed on the
 * next page boot; if it is still present when a reload is requested, the reload is
 * suppressed.
 *
 * Pure-ish + injectable for tests. Touches only window.location + sessionStorage.
 * No password/token/credential is read, written, or logged. Never throws.
 * ============================================================ */

export const CUTOVER_RELOAD_MARKER = "oriexCutoverReloadOnce";

function safeSessionStorage(win) {
  try {
    const w = win || (typeof window !== "undefined" ? window : null);
    return (w && w.sessionStorage) || null;
  } catch {
    return null;
  }
}

/**
 * Consume (clear) the one-time reload marker left by a prior cutover re-login
 * reload. Call once on bridge mount so a later cycle in a NEW page lifecycle can
 * reload again. Returns true iff a marker was present (i.e. this boot followed a
 * cutover re-login reload). Never throws.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function consumeCutoverReloadMarker(win) {
  const s = safeSessionStorage(win);
  if (!s) return false;
  try {
    if (s.getItem(CUTOVER_RELOAD_MARKER) === "1") {
      s.removeItem(CUTOVER_RELOAD_MARKER);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Perform the one-time same-URL reload used for the post-logout re-login case.
 * Suppressed (returns false) when the marker is already set — i.e. a reload was
 * requested again before the fresh boot consumed it — which prevents reload loops.
 * Returns true iff it initiated the reload. Never throws.
 * @param {Window} [win]
 * @returns {boolean}
 */
export function reloadForCutoverRelogin(win) {
  try {
    const w = win || (typeof window !== "undefined" ? window : null);
    if (!w || !w.location) return false;
    const s = safeSessionStorage(w);
    if (s && s.getItem(CUTOVER_RELOAD_MARKER) === "1") return false; // already reloaded once
    if (s) {
      try {
        s.setItem(CUTOVER_RELOAD_MARKER, "1");
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
