/* ============================================================
 * authDebug — TEMPORARY save/auth tracing (gated by ?oriexAuthDebug=1)
 * ------------------------------------------------------------
 * Goal: prove WHY profile/stage saves don't persist in production. Logs, ONLY
 * when the flag is on:
 *   - the modern auth identity before legacy import and 1s/4s after boot
 *     (uid + isAnonymous + window.__oxUid + match) — to see if the session is
 *     silently replaced by an anonymous user;
 *   - every legacy setDoc / getDoc / getDocs with SAFE metadata only: operation,
 *     doc PATH, whether the path contains the current/handoff uid, the auth uid's
 *     isAnonymous flag at that moment, and the resolved exists / rejected CODE.
 *
 * SAFETY (hard): never logs document data, password, token, credential, or a full
 * auth-user / profile object. Only ids, booleans, paths, and Firestore error codes.
 *
 * When the flag is absent every export is a no-op and production is unchanged.
 * TEMPORARY: remove this module + authDebugRoute.js + call sites after the fix.
 * ============================================================ */

import { isAuthDebugEnabled } from "./authDebugRoute.js";

const PREFIX = "[oriex auth-debug]";

/** True iff debug logging is currently enabled. */
export function authDebugOn() {
  try {
    return typeof window !== "undefined" && isAuthDebugEnabled(window.location);
  } catch {
    return false;
  }
}

/** Gated console log (no-op unless enabled). */
export function dlog(label, payload) {
  if (!authDebugOn()) return;
  try {
    if (payload === undefined) console.info(PREFIX, label);
    else console.info(PREFIX, label, payload);
  } catch {
    /* ignore */
  }
}

/** Safe identity snapshot of a Firebase user — ids/booleans only, never the
 *  full user object / token. */
function identityOf(user) {
  const oxUid = (typeof window !== "undefined" && window.__oxUid) || null;
  const uid = user && typeof user.uid === "string" ? user.uid : null;
  const isAnonymous = user ? user.isAnonymous === true : null;
  return {
    uid,
    isAnonymous,
    oxUid,
    uidMatchesOx: uid && oxUid ? uid === oxUid : null,
  };
}

/** Log the current modern auth identity at a labelled moment. */
export function logAuthIdentity(at, user) {
  if (!authDebugOn()) return;
  dlog("authIdentity", { at, ...identityOf(user) });
}

/** After legacy boot settles, re-check the identity (1s and 4s) so a delayed
 *  anonymous-session replacement is visible. `getUser` returns auth.currentUser. */
export function scheduleAuthIdentityProbes(getUser) {
  if (!authDebugOn() || typeof window === "undefined") return;
  const probe = (at) => {
    try {
      logAuthIdentity(at, typeof getUser === "function" ? getUser() : null);
    } catch {
      /* ignore */
    }
  };
  try {
    if (typeof window.setTimeout === "function") {
      window.setTimeout(() => probe("post-boot-1s"), 1000);
      window.setTimeout(() => probe("post-boot-4s"), 4000);
    }
  } catch {
    /* ignore */
  }
}

/** Install the hook the legacy bundle calls on every setDoc/getDoc/getDocs (see
 *  the qn$o/Cl$o/rn$o wrappers in src/legacy/oriex-app.bundle.js). Logs SAFE
 *  metadata only — never document data. `getUser` returns auth.currentUser so we
 *  can record the uid + isAnonymous AT THE MOMENT OF THE WRITE/READ. */
export function installFsHook(getUser) {
  if (!authDebugOn() || typeof window === "undefined") return;
  // Log every legacy anonymous-sign-in (cf) call AND its decision (reuse the
  // existing modern/anon session vs actually sign in anonymously). This proves or
  // disproves a SECOND session replacement happening after the #74 boot guard.
  window.__oxAuthHook = function (op, decision) {
    try {
      dlog("authCall", { op, decision });
    } catch {
      /* ignore */
    }
  };
  window.__oxFsHook = function (op, ref, promise) {
    try {
      const path = ref && typeof ref.path === "string" ? ref.path : "(query/unknown)";
      const u = typeof getUser === "function" ? getUser() : null;
      const authUid = u && typeof u.uid === "string" ? u.uid : null;
      const oxUid = (typeof window !== "undefined" && window.__oxUid) || null;
      dlog(op, {
        path,
        pathHasAuthUid: authUid ? path.indexOf(authUid) >= 0 : null,
        pathHasOxUid: oxUid ? path.indexOf(oxUid) >= 0 : null,
        authIsAnon: u ? u.isAnonymous === true : null,
        authMatchesOx: authUid && oxUid ? authUid === oxUid : null,
      });
      if (promise && typeof promise.then === "function") {
        promise.then(
          (snap) => {
            // Booleans only — NEVER the field values. hasName confirms a profile
            // read reflects a saved name; hasProgress confirms a progress query
            // returned rows. We read data() solely to derive booleans (no logging).
            let exists;
            let hasName;
            let hasProgress;
            try {
              if (snap && typeof snap.exists === "function") {
                exists = snap.exists();
                if (exists && typeof snap.data === "function") {
                  const d = snap.data() || {};
                  hasName = typeof d.name === "string" && d.name.length > 0;
                }
              } else if (snap && typeof snap.empty === "boolean") {
                exists = !snap.empty;
                hasProgress = (typeof snap.size === "number" ? snap.size : 0) > 0;
              }
            } catch {
              /* ignore */
            }
            dlog(op + ".ok", { path, exists, hasName, hasProgress });
          },
          (e) => dlog(op + ".err", { path, code: e && e.code ? e.code : "unknown" }),
        );
      }
    } catch {
      /* ignore */
    }
  };
}
