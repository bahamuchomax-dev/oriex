/* ============================================================
 * grantTeacher.mjs — ADMIN-ONLY: make a user a teacher.
 * ------------------------------------------------------------
 * There is intentionally NO in-app way to become a teacher (a student must not be
 * able to self-promote). Teacher authority comes from a SERVER-SET Firebase custom
 * claim (firestore.rules reads request.auth.token.teacher). This script, run by an
 * admin with Admin SDK credentials, grants that claim AND sets the profile
 * `isTeacher` flag the legacy app reads for its teacher UI.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
 *     node scripts/grantTeacher.mjs <uid> [--revoke]
 *
 * Prereqs:
 *   - npm i firebase-admin           (admin-only tool; not a runtime dependency)
 *   - ORIEX_SA_KEY points at your Admin SDK credentials JSON. NEVER commit that
 *     file (it is read at runtime only; nothing secret is stored in this repo).
 *
 * Notes:
 *   - The user must sign out / sign in again for the new claim to take effect.
 *   - Admin SDK writes bypass Firestore Rules, so the profile flag is set on both
 *     the top-level and legacy-path profile docs.
 *   - No password is read/written/logged.
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[grantTeacher] " + msg);
  process.exit(1);
}

const uid = process.argv[2];
const revoke = process.argv.includes("--revoke");
if (!uid || uid.startsWith("--")) {
  fail("usage: ORIEX_SA_KEY=<path> node scripts/grantTeacher.mjs <uid> [--revoke]");
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
const db = getFirestore();

async function main() {
  const user = await auth.getUser(uid); // throws if the uid does not exist
  const teacher = !revoke;

  // 1) The REAL authority: the custom claim the rules check.
  const claims = { ...(user.customClaims || {}), teacher };
  if (!teacher) delete claims.teacher;
  await auth.setCustomUserClaims(uid, claims);

  // 2) The profile flag the legacy app reads for teacher UI (both doc paths).
  const stamp = FieldValue.serverTimestamp();
  const patch = { isTeacher: teacher, updatedAt: stamp };
  await db.doc(`users/${uid}/profile/main`).set(patch, { merge: true });
  await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).set(patch, { merge: true });

  console.log(
    `[grantTeacher] ${teacher ? "granted" : "revoked"} teacher for ${uid}. ` +
      "The user must sign out and back in for the claim to refresh.",
  );
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
