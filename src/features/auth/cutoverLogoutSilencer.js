/* ============================================================
 * cutoverLogoutSilencer — contain the ONE benign legacy console error on logout.
 * ------------------------------------------------------------
 * The legacy bundle keeps Firestore onSnapshot listeners with no unmount API.
 * For a brief moment after the modern signOut (before the clean logout reload
 * navigates away), those listeners fire against the strict owner-only rules and
 * Firebase logs exactly one: "@firebase/firestore: ... Uncaught Error in snapshot
 * listener: FirebaseError: [code=permission-denied] ...".
 *
 * This is EXPECTED (rules are working) and never user-visible (the veil covers
 * the screen and we reload), but it's noisy in the console. As a LAST RESORT
 * (the listeners can't be detached) we TEMPORARILY drop ONLY that exact signature
 * for a short window. We do NOT change Firestore Rules, do NOT globally silence
 * errors, and do NOT hide modern Firestore errors: the filter is scoped to a few
 * seconds around the logout reload and matches only the permission-denied +
 * Firestore-snapshot signature; everything else passes through unchanged.
 * ============================================================ */

const DENIED = /permission-denied|insufficient permissions/i;
const FIRESTORE_CTX = /snapshot listener|@firebase\/firestore|Firestore \(/i;

function isKnownLegacyDenied(args) {
  try {
    const text = (args || [])
      .map((a) => (a && typeof a === "object" && a.message ? a.message : String(a)))
      .join(" ");
    return DENIED.test(text) && FIRESTORE_CTX.test(text);
  } catch {
    return false;
  }
}

/**
 * Temporarily drop ONLY the known legacy permission-denied snapshot log. Returns
 * a cleanup function; also self-restores after `windowMs` so it can never linger.
 * @param {{ windowMs?: number }} [opts]
 * @returns {() => void}
 */
export function silenceLegacyPermissionDenied({ windowMs = 4000 } = {}) {
  if (typeof console === "undefined" || typeof console.error !== "function") {
    return () => {};
  }
  const original = console.error;
  let active = true;

  const patched = function patchedConsoleError(...args) {
    if (active && isKnownLegacyDenied(args)) return; // drop ONLY the known error
    return original.apply(this, args);
  };
  console.error = patched;

  const restore = () => {
    if (!active) return;
    active = false;
    try {
      // Only restore if nothing else replaced our patch in the meantime.
      if (console.error === patched) console.error = original;
    } catch {
      /* ignore */
    }
  };

  let timer = 0;
  try {
    timer = setTimeout(restore, windowMs);
  } catch {
    /* ignore — best effort */
  }

  return () => {
    try {
      if (timer) clearTimeout(timer);
    } catch {
      /* ignore */
    }
    restore();
  };
}
