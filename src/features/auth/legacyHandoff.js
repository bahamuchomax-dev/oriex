// Shared modern-auth → legacy handoff: set the (non-secret) uid global, ensure the
// signed-in user's OWN legacy-path profile exists, then start the legacy app. This
// is the verified probe flow, factored out so the opt-in cutover bridge reuses it.
//
// No password is read/compared/written; nothing sensitive is logged. The legacy
// bundle is IMPORTED (not edited). `importLegacy` is injectable for tests.

import { bridgeUid } from "./authBridgeController.js";
import { ensureLegacyBridgeProfile } from "./legacyBridgeProfile.js";
import { seedLegacyLocalSession } from "./legacyLocalSession.js";

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
  try {
    const r = await ensureLegacyBridgeProfile(uid);
    ensured = r && r.ok ? (r.created ? "created" : "existed") : "failed";
    if (r) {
      shortId = r.shortId || "";
      name = r.name || "";
    }
  } catch {
    ensured = "error";
  }

  // Seed legacy's localStorage fast-start cache so it boots logged-in on RELOAD
  // too — independent of legacy's own Firebase-Auth restoration timing. No
  // password; mirrors legacy's key format.
  if (uid) seedLegacyLocalSession(uid, { shortId, name });

  await (importLegacy || defaultImportLegacy)();
  return { uid, ensured };
}
