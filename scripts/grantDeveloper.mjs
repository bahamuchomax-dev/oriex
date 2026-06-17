/* ============================================================
 * grantDeveloper.mjs — ADMIN-ONLY: give a user the "developer" role.
 * ------------------------------------------------------------
 * The developer role is a SERVER-SET Firebase custom claim (request.auth.token
 * .developer). It does NOT grant any data authority in firestore.rules — it only
 * turns on developer-facing UI in the app (currently: an always-on Firestore
 * read/write counter, see src/services/readCounter.js). A student can never self-
 * promote; only an admin running this tool can grant it.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
 *     node scripts/grantDeveloper.mjs <uid> [--revoke]
 *
 * Prereqs:
 *   - npm i firebase-admin           (admin-only tool; not a runtime dependency)
 *   - ORIEX_SA_KEY points at your Admin SDK credentials JSON. NEVER commit it.
 *
 * Notes:
 *   - The user must sign out / sign in again for the new claim to take effect.
 *   - No password is read/written/logged. Existing claims (teacher/admin) are kept.
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function fail(msg) {
  console.error("[grantDeveloper] " + msg);
  process.exit(1);
}

const uid = process.argv[2];
const revoke = process.argv.includes("--revoke");
if (!uid || uid.startsWith("--")) {
  fail("usage: ORIEX_SA_KEY=<path> node scripts/grantDeveloper.mjs <uid> [--revoke]");
}

const keyPath = process.env.ORIEX_SA_KEY;
if (!keyPath) {
  fail("set ORIEX_SA_KEY to the path of your Admin SDK credentials JSON (never commit it)");
}

let creds;
try {
  creds = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  fail("could not read/parse ORIEX_SA_KEY file");
}

initializeApp({ credential: cert(creds) });
const auth = getAuth();

async function main() {
  const user = await auth.getUser(uid); // throws if the uid does not exist
  const developer = !revoke;
  const claims = { ...(user.customClaims || {}), developer };
  if (!developer) delete claims.developer;
  await auth.setCustomUserClaims(uid, claims);
  console.log(
    `[grantDeveloper] ${developer ? "granted" : "revoked"} developer for ${uid}. ` +
      "The user must sign out and back in for the claim to refresh.",
  );
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
