/* ============================================================
 * modernAuthRoute — opt-in gate for the modern Firebase Auth shell
 * ------------------------------------------------------------
 * The modern Firebase Auth login/signup shell is OPT-IN and is NOT the default
 * login. It mounts ONLY when explicitly requested, via either:
 *
 *   ?oriexModernAuth=1     (query)
 *   #modern-auth           (hash)
 *   localStorage["oriexModernAuth"] === "1"
 *
 * This module is a tiny pure matcher: it imports no React, no Firebase, and no
 * shell code, so importing it does not affect normal startup or the initial
 * bundle. It never throws — on any error it reports "not enabled" so the served
 * legacy app keeps booting.
 * ============================================================ */

const QUERY_KEY = "oriexModernAuth";
const QUERY_VALUE = "1";
const HASH_VALUE = "modern-auth";
export const MODERN_AUTH_FLAG = "oriexModernAuth";

/** True iff the URL explicitly requests the modern auth shell. Never throws. */
export function isModernAuthUrl(location) {
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

/** True iff the modern auth shell is enabled by URL OR the localStorage opt-in. */
export function isModernAuthEnabled(location) {
  try {
    if (isModernAuthUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(MODERN_AUTH_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore — fall through to disabled */
  }
  return false;
}
