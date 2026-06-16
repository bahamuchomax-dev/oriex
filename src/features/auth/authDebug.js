/* ============================================================
 * authDebug — TEMPORARY, debug-only instrumentation for the reload auth issue
 * ------------------------------------------------------------
 * Goal: pinpoint why a production RELOAD shows the default profile ("User") and
 * logs a Firestore permission-denied. Everything here is GATED behind
 * ?oriexAuthDebug=1 (see authDebugRoute.js): when the flag is absent, every
 * export is a no-op and production behaviour is UNCHANGED.
 *
 * SAFETY (hard constraints):
 *   - Never logs password / token / credential / a full Firebase user object.
 *   - Profile logging is a BOOLEAN field summary only (hasName, …) plus the
 *     document PATH and exists flag — never field VALUES.
 *   - The visible-name probe logs a CLASSIFICATION (empty / User / other) and a
 *     length, never the raw display name.
 *
 * TEMPORARY: remove this module + authDebugRoute.js + all call sites before the
 * production fix. See PR "Instrument auth reload profile and listener paths".
 *
 * NOTE on the permission-denied listener (items 7–8 of the brief): the rejected
 * onSnapshot lives INSIDE the frozen legacy bundle, which imports its own
 * Firestore symbols. Those ES bindings cannot be wrapped from this layer without
 * editing the legacy bundle (out of scope) or enabling Firestore's global debug
 * log level (which would also dump document data — including the legacy password
 * field — and is therefore forbidden here). So we instrument OUR OWN reads and
 * the lifecycle/identity around the handoff; the legacy listener's exact path is
 * documented as not safely interceptable from here.
 * ============================================================ */

import { isAuthDebugEnabled } from "./authDebugRoute.js";

const PREFIX = "[oriex auth-debug]";

/** True iff auth debug logging is currently enabled (URL/hash/localStorage). */
export function authDebugOn() {
  try {
    return typeof window !== "undefined" && isAuthDebugEnabled(window.location);
  } catch {
    return false;
  }
}

/** Gated console log. No-op (and no argument evaluation cost at the call site is
 *  expected — guard with authDebugOn() for heavy payloads) unless enabled. */
export function dlog(label, payload) {
  if (!authDebugOn()) return;
  try {
    if (payload === undefined) console.info(PREFIX, label);
    else console.info(PREFIX, label, payload);
  } catch {
    /* ignore */
  }
}

/**
 * SAFE summary of a profile document: BOOLEANS ONLY. Never returns name /
 * displayName / shortId / password VALUES — only whether each is present. The
 * password (and any other field) is intentionally never read here.
 * @param {Record<string, unknown> | null | undefined} data
 */
export function safeProfileSummary(data) {
  const d = data && typeof data === "object" ? data : {};
  return {
    hasName: typeof d.name === "string" && d.name.length > 0,
    hasDisplayName: typeof d.displayName === "string" && d.displayName.length > 0,
    hasShortId: typeof d.shortId === "string" && d.shortId.length > 0,
    hasAvatar: typeof d.avatar === "string" && d.avatar.length > 0,
    isTeacher: d.isTeacher === true,
  };
}

/**
 * Probe the VISIBLE profile name the legacy app rendered, after a short settle.
 * Logs only a classification (empty / User / yuuki-default / other) and the
 * length — never the raw text. The production legacy bundle renders the name
 * into `.rx-pname` (default "User" when name is empty). No-op unless enabled.
 */
export function probeVisibleProfileName() {
  if (!authDebugOn() || typeof document === "undefined") return;
  const read = (at) => {
    try {
      const el = document.querySelector(".rx-pname");
      if (!el) {
        dlog("visibleName", { at, found: false });
        return;
      }
      const text = String(el.textContent || "").trim();
      let kind = "other";
      if (text.length === 0) kind = "empty";
      else if (text === "User") kind = "User";
      else if (text === "ユウキ") kind = "yuuki-default";
      dlog("visibleName", { at, found: true, kind, length: text.length });
    } catch {
      /* ignore */
    }
  };
  try {
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      window.setTimeout(() => read("1.5s"), 1500);
      window.setTimeout(() => read("4s"), 4000);
    }
  } catch {
    /* ignore */
  }
}
