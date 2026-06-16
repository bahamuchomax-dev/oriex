/* ============================================================
 * homePreviewRoute — opt-in gate to view the new (mockup) home
 * ------------------------------------------------------------
 * The new React home is OPT-IN and is NOT the default screen. It mounts ONLY
 * when explicitly requested, via either:
 *
 *   ?oriexHome=1     (query)
 *   #oriex-home      (hash)
 *   localStorage["oriexHome"] === "1"
 *
 * Tiny pure matcher: imports no React and no home code, so importing it does
 * not affect normal startup or the initial bundle. Never throws — on any error
 * it reports "not enabled" so the served legacy app keeps booting.
 * ============================================================ */

const QUERY_KEY = "oriexHome";
const QUERY_VALUE = "1";
const HASH_VALUE = "oriex-home";
export const HOME_PREVIEW_FLAG = "oriexHome";

/** True iff the URL explicitly requests the new home. Never throws. */
export function isHomePreviewUrl(location) {
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

/** True iff the new home is enabled by URL OR the localStorage opt-in. */
export function isHomePreviewEnabled(location) {
  try {
    if (isHomePreviewUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(HOME_PREVIEW_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore — fall through to disabled */
  }
  return false;
}
