// Shared modern-auth → legacy handoff: set the (non-secret) uid global, ensure the
// signed-in user's OWN legacy-path profile exists, then start the legacy app. This
// is the verified probe flow, factored out so the opt-in cutover bridge reuses it.
//
// No password is read/compared/written; nothing sensitive is logged. The legacy
// bundle is IMPORTED (not edited). `importLegacy` is injectable for tests.

import { bridgeUid } from "./authBridgeController.js";
import { ensureLegacyBridgeProfile } from "./legacyBridgeProfile.js";
import { seedLegacyLocalSession } from "./legacyLocalSession.js";
// TEMPORARY save/auth tracing (?oriexAuthDebug=1); no-op when the flag is absent.
import { authDebugOn, installFsHook, logAuthIdentity, scheduleAuthIdentityProbes } from "./authDebug.js";
import { currentAuthUser } from "./modernAuthState.js";
import { installAttendanceSync } from "../../services/attendanceSync.js";

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

  // Debug-only: install the legacy setDoc/getDoc/getDocs hook and record the auth
  // identity BEFORE legacy boots, so we can see the uid/isAnonymous at every later
  // write/read. Safe metadata only; no document data. No-op unless ?oriexAuthDebug=1.
  if (authDebugOn()) {
    installFsHook(() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    });
    logAuthIdentity("before-legacy-import", (() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    })());
  }

  await (importLegacy || defaultImportLegacy)();

  // Server-persist the legacy 登校スタンプ (attendance stamps), which the bundle
  // otherwise keeps only in localStorage. Writes mirror to the user's OWN Firestore
  // subtree on change; reads happen on tab-open (+ a fresh-device restore). Frontend
  // only — the bundle is untouched and no Firestore rules change is required.
  try {
    installAttendanceSync();
  } catch {
    /* non-fatal: attendance still works locally */
  }

  // Debug-only: re-check the identity after boot settles, to catch a delayed
  // anonymous-session replacement (uid/isAnonymous at 1s and 4s).
  if (authDebugOn()) {
    scheduleAuthIdentityProbes(() => {
      try {
        return currentAuthUser();
      } catch {
        return null;
      }
    });
  }

  return { uid, ensured };
}
