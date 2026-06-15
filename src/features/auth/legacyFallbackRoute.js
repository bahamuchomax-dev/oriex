/* ============================================================
 * legacyFallbackRoute — EMERGENCY admin/dev fallback to the legacy app
 * ------------------------------------------------------------
 * After the modern Firebase Auth cutover became the default, the OLD legacy app
 * (which still contains the unsafe plaintext Friend ID login) is reachable ONLY
 * via this explicit emergency flag, for admin/dev testing during the transition:
 *
 *   ?oriexLegacyFallback=1   (query)
 *   #legacy-fallback         (hash)
 *   localStorage["oriexLegacyFallback"] === "1"
 *
 * ⚠️ TEMPORARY / UNSAFE: it exposes the legacy plaintext-password login. It is
 * NOT a recommended user path and must be removed once the legacy login is
 * retired. It changes NO Firestore Rules. Tiny pure matcher; never throws.
 * ============================================================ */

const QUERY_KEY = "oriexLegacyFallback";
const QUERY_VALUE = "1";
const HASH_VALUE = "legacy-fallback";
export const LEGACY_FALLBACK_FLAG = "oriexLegacyFallback";

/** True iff the URL explicitly requests the emergency legacy fallback. Never throws. */
export function isLegacyFallbackUrl(location) {
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

/** True iff the emergency legacy fallback is enabled by URL OR localStorage. */
export function isLegacyFallbackEnabled(location) {
  try {
    if (isLegacyFallbackUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(LEGACY_FALLBACK_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore — fall through to disabled */
  }
  return false;
}
