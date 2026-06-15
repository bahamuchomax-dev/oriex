/* ============================================================
 * cutoverRoute — opt-in gate for the modern-auth → legacy CUTOVER bridge
 * ------------------------------------------------------------
 * The production-like cutover: modern Firebase Auth login/signup, then a clean
 * handoff into the real legacy Oriex app (no debug overlay). It is OPT-IN and is
 * NOT the default login. It mounts ONLY when explicitly requested:
 *
 *   ?oriexModernCutover=1   (query)
 *   #modern-cutover         (hash)
 *   localStorage["oriexModernCutover"] === "1"
 *
 * (The developer probe `?oriexAuthBridge=1` stays available separately for
 * diagnosis.) Tiny pure matcher: imports no React/Firebase, so it does not affect
 * normal startup. Never throws — on any error it reports "not enabled" so the
 * served legacy app keeps booting.
 * ============================================================ */

const QUERY_KEY = "oriexModernCutover";
const QUERY_VALUE = "1";
const HASH_VALUE = "modern-cutover";
export const MODERN_CUTOVER_FLAG = "oriexModernCutover";

/** True iff the URL explicitly requests the modern cutover bridge. Never throws. */
export function isModernCutoverUrl(location) {
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

/** True iff the cutover bridge is enabled by URL OR the localStorage opt-in. */
export function isModernCutoverEnabled(location) {
  try {
    if (isModernCutoverUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(MODERN_CUTOVER_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore — fall through to disabled */
  }
  return false;
}
