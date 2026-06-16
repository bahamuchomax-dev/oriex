/* ============================================================
 * deleteUser.mjs — ADMIN-ONLY: delete a user (auth + their data).
 * ------------------------------------------------------------
 * In-app deletion of OTHER users cannot work from the client (Firestore rules are
 * owner-only, and deleting another Auth account requires the Admin SDK). This
 * admin tool deletes a user's Auth account AND their own Firestore data.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
 *     node scripts/deleteUser.mjs <FriendID | uid>
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY points at your Admin SDK
 * credentials JSON (NEVER committed). No password is read/written/logged.
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
} from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[deleteUser] " + msg);
  process.exit(1);
}

const arg = (process.argv[2] || "").trim();
if (!arg) fail("usage: ORIEX_SA_KEY=<path> node scripts/deleteUser.mjs <FriendID | uid>");

const keyPath = process.env.ORIEX_SA_KEY;
if (!keyPath) fail("set ORIEX_SA_KEY to the path of your Admin SDK credentials JSON (never commit it)");

let creds;
try {
  creds = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  fail("could not read/parse ORIEX_SA_KEY file");
}

initializeApp({ credential: cert(creds) });
const auth = getAuth();
const db = getFirestore();

async function resolveUid(input) {
  // a 6-char Friend ID resolves via its deterministic auth email; else it's a uid
  const fid = normalizeFriendId(input);
  if (validateFriendIdFormat(fid)) {
    const user = await auth.getUserByEmail(makeInternalAuthEmailFromFriendId(fid));
    return user.uid;
  }
  return input;
}

async function main() {
  const uid = await resolveUid(arg);
  // 1) the user's own data (subtrees + public directory entries)
  await db.recursiveDelete(db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}`));
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/customApp/${uid}`).delete();
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/teacherIndex/${uid}`).delete();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`public/data/customApp/${uid}`).delete();
  // 2) the Auth account
  await auth.deleteUser(uid);
  console.log(`[deleteUser] deleted user ${uid} (auth + own data).`);
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
