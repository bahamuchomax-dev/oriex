/* ============================================================
 * authBridgeRoute — opt-in gate for the modern-auth → legacy bridge PROBE
 * ------------------------------------------------------------
 * A developer probe (NOT a feature, NOT the default login) that signs in with
 * modern Firebase Auth and then starts the legacy app to observe whether legacy
 * adopts the same authenticated user — see AuthBridgeProbe.jsx and
 * MODERN_AUTH_APP_HANDOFF_SPIKE.md. It mounts ONLY when explicitly requested:
 *
 *   ?oriexAuthBridge=1     (query)
 *   #auth-bridge-probe     (hash)
 *   localStorage["oriexAuthBridge"] === "1"
 *
 * Tiny pure matcher: imports no React/Firebase, so it does not affect normal
 * startup or the initial bundle. Never throws — on any error it reports
 * "not enabled" so the served legacy app keeps booting.
 * ============================================================ */

const QUERY_KEY = "oriexAuthBridge";
const QUERY_VALUE = "1";
const HASH_VALUE = "auth-bridge-probe";
export const AUTH_BRIDGE_FLAG = "oriexAuthBridge";

/** True iff the URL explicitly requests the auth-bridge probe. Never throws. */
export function isAuthBridgeUrl(location) {
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

/** True iff the probe is enabled by URL OR the localStorage opt-in. */
export function isAuthBridgeEnabled(location) {
  try {
    if (isAuthBridgeUrl(location)) return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem(AUTH_BRIDGE_FLAG) === QUERY_VALUE
    ) {
      return true;
    }
  } catch {
    /* ignore — fall through to disabled */
  }
  return false;
}
