/* ============================================================
 * migrateUser.mjs — ADMIN-ONLY: let an EXISTING account log in with a Friend ID
 * + password WITHOUT changing its uid (so all of its data is preserved).
 * ------------------------------------------------------------
 * Old-app students are ANONYMOUS Firebase accounts. This upgrades one in place:
 * it sets the deterministic internal email (from a Friend ID) + a password on the
 * SAME uid via the Admin SDK, so the student can now sign in through the modern
 * Friend ID + password flow and keeps every bit of their data (same uid — no
 * re-keying). It also stamps the Friend ID into the legacy profile + the Friend
 * ID directory so the app shows/finds it.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/migrateUser.mjs <uid|FriendID> \
 *     [--friend-id ABC234] [--password yourpass] [--name "表示名"]
 *
 *   - Friend ID: --friend-id, else the account's existing legacy shortId, else a
 *     fresh generated one.
 *   - Password : --password, else a random one is generated. EITHER WAY the final
 *     Friend ID + password are PRINTED so you can hand them to the student.
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY = path to Admin SDK creds (never commit).
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  FRIEND_ID_ALPHABET,
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  generateFriendId,
} from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[migrateUser] " + msg);
  process.exit(1);
}

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const opts = { friendId: null, password: null, name: null };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--friend-id") opts.friendId = argv[++i];
  else if (a === "--password") opts.password = argv[++i];
  else if (a === "--name") opts.name = argv[++i];
  else if (a.startsWith("--")) fail("unknown flag: " + a);
  else positional.push(a);
}
const who = (positional[0] || "").trim();
if (!who) fail("usage: ORIEX_SA_KEY=<path> node scripts/migrateUser.mjs <uid|FriendID> [--friend-id ABC234] [--password ****]");

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

/** A readable random password (no ambiguous chars), >= Firebase's 6-char minimum. */
function generatePassword(len = 10) {
  const out = [];
  for (let i = 0; i < len; i++) out.push(FRIEND_ID_ALPHABET[Math.floor(Math.random() * FRIEND_ID_ALPHABET.length)]);
  return out.join("");
}

async function resolveUid(input) {
  const fid = normalizeFriendId(input);
  if (validateFriendIdFormat(fid)) {
    try {
      const u = await auth.getUserByEmail(makeInternalAuthEmailFromFriendId(fid));
      return u.uid;
    } catch {
      /* not an existing Friend ID account — treat the input as a uid */
    }
  }
  return input;
}

/** Existing legacy shortId for this uid, if any (so we reuse their old handle). */
async function existingShortId(uid) {
  try {
    const snap = await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).get();
    const s = snap.exists && snap.data() && snap.data().shortId;
    if (typeof s === "string" && validateFriendIdFormat(normalizeFriendId(s))) return normalizeFriendId(s);
  } catch {
    /* ignore */
  }
  return "";
}

/** True iff the deterministic email for this Friend ID already belongs to someone
 *  OTHER than `uid`. */
async function friendIdTakenByOther(friendId, uid) {
  try {
    const u = await auth.getUserByEmail(makeInternalAuthEmailFromFriendId(friendId));
    return u.uid !== uid;
  } catch {
    return false; // no account uses it
  }
}

async function main() {
  const uid = await resolveUid(who);
  const user = await auth.getUser(uid).catch(() => fail(`no account for "${who}"`));

  // pick the Friend ID
  let friendId;
  if (opts.friendId) {
    friendId = normalizeFriendId(opts.friendId);
    if (!validateFriendIdFormat(friendId)) fail("--friend-id is not a valid Friend ID");
    if (await friendIdTakenByOther(friendId, uid)) fail(`Friend ID ${friendId} is already used by another account`);
  } else {
    friendId = await existingShortId(uid);
    if (!friendId) {
      // generate a unique one
      for (let tries = 0; tries < 20 && (!friendId || (await friendIdTakenByOther(friendId, uid))); tries++) {
        friendId = generateFriendId();
      }
    }
  }

  const password = opts.password || generatePassword();
  if (password.length < 6) fail("--password must be at least 6 characters");

  // 1) AUTH: set email + password on the SAME uid (data preserved). This converts
  //    an anonymous account into a Friend ID + password login.
  await auth.updateUser(uid, {
    email: makeInternalAuthEmailFromFriendId(friendId),
    emailVerified: false,
    password,
  });

  // 2) stamp the Friend ID into the legacy profile + the correct directory so the
  //    app shows/finds it (never writes a password to Firestore). The legacy app
  //    splits the directory by role: STUDENTS go in public/data/customApp (also the
  //    primary Friend-ID login lookup), TEACHERS in public/data/teacherIndex.
  //    Writing a student into teacherIndex makes the app treat them as a teacher.
  const prof = (await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).get()).data() || {};
  const namePatch = opts.name ? { name: opts.name } : {};
  await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).set({ shortId: friendId, ...namePatch }, { merge: true });
  const dir = prof.isTeacher === true ? "teacherIndex" : "customApp";
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/${dir}/${uid}`).set(
    { shortId: friendId, uid, name: namePatch.name || prof.name || "", avatar: prof.avatar || "", color: prof.color || "" },
    { merge: true },
  );

  console.log("[migrateUser] done — the student keeps ALL their data (same uid).");
  console.log("  uid      : " + uid);
  console.log("  name     : " + (opts.name || user.displayName || "(unchanged)"));
  console.log("  Friend ID: " + friendId);
  console.log("  password : " + password);
  console.log("  → log in with the Friend ID + password above.");
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
