/* ============================================================
 * authDebugRoute — opt-in gate for TEMPORARY save/auth tracing
 * ------------------------------------------------------------
 * Turns on debug-only logging (see authDebug.js) used to trace the production
 * save/persistence failure. It is NOT a feature and changes NO app behaviour —
 * it only enables console logging. Enabled ONLY by:
 *
 *   ?oriexAuthDebug=1      (query)
 *   #oriex-auth-debug      (hash)
 *   localStorage["oriexAuthDebug"] === "1"
 *
 * Tiny pure matcher: imports no React/Firebase, so it never affects normal
 * startup or the initial bundle. Never throws.
 *
 * TEMPORARY: remove with authDebug.js + call sites once the save path is fixed.
 * ============================================================ */

const QUERY_KEY = "oriexAuthDebug";
const QUERY_VALUE = "1";
const HASH_VALUE = "oriex-auth-debug";
export const AUTH_DEBUG_FLAG = "oriexAuthDebug";

/** True iff the URL explicitly requests auth/save debug logging. Never throws. */
export function isAuthDebugUrl(location) {
  try {
    if (!location) return false;
    const search = String(location.search || "");
    let byQuery = false;
    try {
      byQuery = new URLSearchParams(search).get(QUERY_KEY) === QUERY_VALUE;
    } catch {
      byQuery = new RegExp("[?&]" + QUERY_KEY + "=" + QUERY_VALUE + "(?:&|$)").test(search);
    }
    const hash = String(location.hash || "").replace(/^#/, "");
    return byQuery || hash === HASH_VALUE;
  } catch {
    return false;
  }
}

/** True iff enabled by URL OR the localStorage opt-in. */
export function isAuthDebugEnabled(location) {
  try {
    if (isAuthDebugUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(AUTH_DEBUG_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
