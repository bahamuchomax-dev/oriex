/* ============================================================
 * grantAdmin.mjs — ADMIN-ONLY: give a user the apex "admin" role.
 * ------------------------------------------------------------
 * `admin` is a SERVER-SET Firebase custom claim (request.auth.token.admin) and is
 * the apex role in firestore.rules: an admin may write the teacherAllowlist /
 * developerAllowlist, edit any profile's role, etc. It can therefore NEVER be
 * granted from the client (no self-promotion) — only this tool, run by someone who
 * already holds the Admin SDK credentials, can set it. Use it once to provision the
 * first operator account; that account can then grant developer (and teacher) IN-APP
 * via the 先生用管理 panel without touching the CLI again.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
 *     node scripts/grantAdmin.mjs <uid> [--revoke]
 *
 * Prereqs:
 *   - npm i firebase-admin           (admin-only tool; not a runtime dependency)
 *   - ORIEX_SA_KEY points at your Admin SDK credentials JSON. NEVER commit it.
 *
 * Notes:
 *   - The user must sign out / sign in again for the new claim to take effect.
 *   - No password is read/written/logged. Existing claims (teacher/developer) are kept.
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function fail(msg) {
  console.error("[grantAdmin] " + msg);
  process.exit(1);
}

const uid = process.argv[2];
const revoke = process.argv.includes("--revoke");
if (!uid || uid.startsWith("--")) {
  fail("usage: ORIEX_SA_KEY=<path> node scripts/grantAdmin.mjs <uid> [--revoke]");
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
  const admin = !revoke;
  const claims = { ...(user.customClaims || {}), admin };
  if (!admin) delete claims.admin;
  await auth.setCustomUserClaims(uid, claims);
  console.log(
    `[grantAdmin] ${admin ? "granted" : "revoked"} admin for ${uid}. ` +
      "The user must sign out and back in for the claim to refresh.",
  );
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
