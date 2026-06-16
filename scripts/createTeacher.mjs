/* ============================================================
 * createTeacher.mjs — ADMIN-ONLY: create a ready-to-use TEACHER account.
 * ------------------------------------------------------------
 * Creates a new Firebase Auth user, grants the teacher custom claim + profile
 * flag, writes the profile / public directory entries, and PRINTS the login
 * credentials (Friend ID + generated password) once for the admin to hand over.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json \
 *     node scripts/createTeacher.mjs ["表示名"]
 *
 * Prereqs:
 *   - npm i firebase-admin            (admin-only tool; not a runtime dependency)
 *   - ORIEX_SA_KEY points at your Admin SDK credentials JSON. NEVER commit it.
 *
 * The Friend ID is the public login handle; the password is generated strong and
 * shown only on this admin console (it is not stored anywhere else by this tool).
 * Logging in uses the modern login (Friend ID + password). No legacy plaintext.
 * ============================================================ */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  generateFriendId,
  makeInternalAuthEmailFromFriendId,
} from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";
const PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function fail(msg) {
  console.error("[createTeacher] " + msg);
  process.exit(1);
}

function generatePassword(len = 12) {
  const b = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += PW_ALPHABET[b[i] % PW_ALPHABET.length];
  return s;
}

const name = (process.argv[2] || "先生").trim() || "先生";
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

async function createWithUniqueFriendId(secret, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const shortId = generateFriendId();
    const email = makeInternalAuthEmailFromFriendId(shortId);
    try {
      const user = await auth.createUser({ email, password: secret });
      return { uid: user.uid, shortId };
    } catch (e) {
      if (e && e.code === "auth/email-already-exists") continue; // collision — retry
      throw e;
    }
  }
  throw new Error("could not allocate a unique Friend ID after several attempts");
}

async function main() {
  const password = generatePassword();
  const { uid, shortId } = await createWithUniqueFriendId(password);

  // teacher authority (the claim rules check)
  await auth.setCustomUserClaims(uid, { teacher: true });

  // profiles + public directory (so the app shows teacher UI and Friend ID resolves)
  const stamp = FieldValue.serverTimestamp();
  const color = "#9060b8";
  const profile = { shortId, name, isTeacher: true, color, createdAt: stamp, updatedAt: stamp };
  const card = { shortId, uid, name, color, updatedAt: stamp };
  await db.doc(`users/${uid}/profile/main`).set(profile, { merge: true });
  await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).set(profile, { merge: true });
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/customApp/${uid}`).set(card, { merge: true });
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/teacherIndex/${uid}`).set(card, { merge: true });

  console.log("\n===== TEACHER ACCOUNT CREATED =====");
  console.log("  Friend ID (login):  " + shortId);
  console.log("  Password:           " + password);
  console.log("  Name:               " + name);
  console.log("  uid:                " + uid);
  console.log("===================================");
  console.log("Log in with the Friend ID + password on the normal login screen.\n");
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
