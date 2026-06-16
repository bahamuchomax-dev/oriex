/* ============================================================
 * authDebugRoute — opt-in gate for TEMPORARY auth-reload instrumentation
 * ------------------------------------------------------------
 * Enables debug-only logging (see authDebug.js) that helps locate the source of
 * the reload permission-denied / profile-fallback. It is NOT a feature and
 * changes NO app behaviour — it only turns console logging on. Enabled ONLY by:
 *
 *   ?oriexAuthDebug=1      (query)
 *   #oriex-auth-debug      (hash)
 *   localStorage["oriexAuthDebug"] === "1"
 *
 * Tiny pure matcher: imports no React/Firebase, so it does not affect normal
 * startup or the initial bundle. Never throws — on any error it reports
 * "not enabled" so production behaviour is unchanged.
 *
 * TEMPORARY: remove this module (and authDebug.js + its call sites) before the
 * production fix lands. See PR "Instrument auth reload profile and listener paths".
 * ============================================================ */

const QUERY_KEY = "oriexAuthDebug";
const QUERY_VALUE = "1";
const HASH_VALUE = "oriex-auth-debug";
export const AUTH_DEBUG_FLAG = "oriexAuthDebug";

/** True iff the URL explicitly requests auth debug logging. Never throws. */
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
    const byHash = hash === HASH_VALUE;

    return byQuery || byHash;
  } catch {
    return false;
  }
}

/** True iff auth debug is enabled by URL OR the localStorage opt-in. */
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
    /* ignore — fall through to disabled */
  }
  return false;
}
