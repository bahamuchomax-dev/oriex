// Shared modern-auth → legacy handoff: set the (non-secret) uid global, ensure the
// signed-in user's OWN legacy-path profile exists, then start the legacy app. This
// is the verified probe flow, factored out so the opt-in cutover bridge reuses it.
//
// No password is read/compared/written; nothing sensitive is logged. The legacy
// bundle is IMPORTED (not edited). `importLegacy` is injectable for tests.

import { bridgeUid } from "./authBridgeController.js";
import { ensureLegacyBridgeProfile } from "./legacyBridgeProfile.js";
import { seedLegacyLocalSession } from "./legacyLocalSession.js";
// TEMPORARY debug-only instrumentation (?oriexAuthDebug=1); no-op when absent.
import { authDebugOn, dlog, probeVisibleProfileName, installLegacyWriteHook } from "./authDebug.js";
import { currentAuthUser } from "./modernAuthState.js";

const defaultImportLegacy = () => import("../../legacy/oriex-app.bundle.js");

/**
 * Hand off a signed-in modern-auth user into the legacy app:
 *   1. set window.__oxUid = user.uid (non-secret id),
 *   2. ensure the user's OWN legacy-path profile exists (no password),
 *   3. start (import) the legacy bundle, which self-mounts into #root and adopts
 *      the Firebase Auth session, entering the real app without the old gate.
 * @param {{ uid?: unknown } | null} user
 * @param {() => Promise<unknown>} [importLegacy]  injectable for tests
 * @returns {Promise<{ uid: string|null, ensured: string }>}
 */
export async function handoffToLegacy(user, importLegacy) {
  const uid = bridgeUid(user);
  if (typeof window !== "undefined" && uid) window.__oxUid = uid;

  let ensured = "skipped";
  let shortId = "";
  let name = "";
  let avatar = "";
  let color = "";
  let isTeacher;
  try {
    const r = await ensureLegacyBridgeProfile(uid);
    ensured = r && r.ok ? (r.created ? "created" : "existed") : "failed";
    if (r) {
      shortId = r.shortId || "";
      name = r.name || "";
      avatar = r.avatar || "";
      color = r.color || "";
      if (typeof r.isTeacher === "boolean") isTeacher = r.isTeacher;
    }
  } catch {
    ensured = "error";
  }

  // Seed legacy's localStorage fast-start cache so it boots logged-in on RELOAD
  // too — independent of legacy's own Firebase-Auth restoration timing. Carries
  // the icon + teacher flag so a reload shows the right identity/role. No password;
  // mirrors legacy's key format.
  if (uid) seedLegacyLocalSession(uid, { shortId, name, avatar, color, isTeacher });

  // Debug-only: install the legacy setDoc write hook BEFORE importing legacy, so
  // every legacy write logs a safe path + uid-match + outcome code (no data).
  if (authDebugOn()) {
    installLegacyWriteHook(() => {
      try {
        return currentAuthUser()?.uid ?? null;
      } catch {
        return null;
      }
    });
  }

  // Debug-only: log the IDENTITY the handoff is using just before legacy boots —
  // the prime suspect for the reload fallback is a uid mismatch (legacy reads a
  // different uid than auth.currentUser) or an empty profile. uids are non-secret
  // ids (NOT the full user object / token). No-op unless ?oriexAuthDebug=1.
  if (authDebugOn()) {
    let authCurrentUid = null;
    try {
      authCurrentUid = currentAuthUser()?.uid ?? null;
    } catch {
      /* ignore */
    }
    const windowOxUid = (typeof window !== "undefined" && window.__oxUid) || null;
    dlog("handoff", {
      bridgeUid: uid || null,
      authCurrentUid,
      windowOxUid,
      uidMatchAuth: !!uid && !!authCurrentUid && uid === authCurrentUid,
      uidMatchWindow: !!uid && !!windowOxUid && uid === windowOxUid,
      ensured,
      ensuredProfile: { hasName: !!name, hasShortId: !!shortId, hasAvatar: !!avatar, isTeacher: isTeacher === true },
    });
  }

  await (importLegacy || defaultImportLegacy)();

  // Debug-only: after legacy paints, classify the VISIBLE profile name
  // (empty / "User" / other) so we can correlate it with the data summary above.
  if (authDebugOn()) probeVisibleProfileName();

  return { uid, ensured };
}
