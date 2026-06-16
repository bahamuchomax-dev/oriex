/* ============================================================
 * deleteUsers.mjs — ADMIN-ONLY: bulk-delete users (auth + their data).
 * ------------------------------------------------------------
 * For cleaning up the many test STUDENT accounts that pile up during testing.
 * Deletes the same things as deleteUser.mjs, for many users at once. DRY-RUN by
 * default — it only PRINTS what it would delete until you pass --yes. Teacher /
 * admin accounts are SKIPPED unless you pass --include-staff. No password is ever
 * read or logged.
 *
 * Pick targets one of three ways:
 *   - explicit list:  ABC234 DEF567 <uid> ...
 *   - from a file:    --file ids.txt        (one Friend ID or uid per line; # comments ok)
 *   - all students:   --all-students        (every account WITHOUT a teacher/admin claim)
 *
 * Optional date filters (creation time, ISO or YYYY-MM-DD), handy for test eras:
 *   --created-after 2026-06-01   --created-before 2026-06-16
 *
 * Examples:
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/deleteUsers.mjs ABC234 DEF567        # preview
 *   ORIEX_SA_KEY=... node scripts/deleteUsers.mjs --file ids.txt --yes
 *   ORIEX_SA_KEY=... node scripts/deleteUsers.mjs --all-students --created-after 2026-06-01 --yes
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY = path to Admin SDK creds (never commit).
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  INTERNAL_AUTH_EMAIL_DOMAIN,
} from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[deleteUsers] " + msg);
  process.exit(1);
}

// ---- parse argv -------------------------------------------------------------
const argv = process.argv.slice(2);
const opts = { yes: false, allStudents: false, includeStaff: false, file: null, after: null, before: null };
const ids = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--yes") opts.yes = true;
  else if (a === "--all-students") opts.allStudents = true;
  else if (a === "--include-staff") opts.includeStaff = true;
  else if (a === "--file") opts.file = argv[++i];
  else if (a === "--created-after") opts.after = new Date(argv[++i]);
  else if (a === "--created-before") opts.before = new Date(argv[++i]);
  else if (a.startsWith("--")) fail("unknown flag: " + a);
  else ids.push(a);
}
if (opts.file) {
  let text;
  try {
    text = readFileSync(opts.file, "utf8");
  } catch {
    fail("could not read --file " + opts.file);
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/#.*$/, "").trim();
    if (t) ids.push(t);
  }
}
if (!opts.allStudents && ids.length === 0) {
  fail("nothing to do: pass Friend IDs/uids, or --file <path>, or --all-students");
}

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

function friendIdFromEmail(email) {
  if (typeof email !== "string") return "";
  const suffix = "@" + INTERNAL_AUTH_EMAIL_DOMAIN;
  const lower = email.toLowerCase();
  return lower.endsWith(suffix) ? lower.slice(0, -suffix.length).toUpperCase() : "";
}
function roleOf(user) {
  const c = (user && user.customClaims) || {};
  if (c.admin === true) return "admin";
  if (c.teacher === true) return "teacher";
  return "student";
}
function inDateRange(user) {
  const t = new Date(user.metadata.creationTime || 0).getTime();
  if (opts.after && t < opts.after.getTime()) return false;
  if (opts.before && t > opts.before.getTime()) return false;
  return true;
}

/** Resolve one Friend ID / uid token to a Firebase UserRecord (or null). */
async function resolveUser(token) {
  const fid = normalizeFriendId(token);
  try {
    if (validateFriendIdFormat(fid)) {
      return await auth.getUserByEmail(makeInternalAuthEmailFromFriendId(fid));
    }
    return await auth.getUser(token);
  } catch {
    console.warn(`[deleteUsers] skip: no account for "${token}"`);
    return null;
  }
}

async function listAll() {
  const out = [];
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    out.push(...res.users);
    pageToken = res.pageToken;
  } while (pageToken);
  return out;
}

/** Delete one user's data + auth account. Mirrors deleteUser.mjs (plus the
 *  top-level profiles/{uid} role doc). Missing docs delete as no-ops. */
async function deleteOneUser(uid) {
  await db.recursiveDelete(db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}`));
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/customApp/${uid}`).delete();
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/teacherIndex/${uid}`).delete();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`public/data/customApp/${uid}`).delete();
  await db.doc(`profiles/${uid}`).delete();
  await auth.deleteUser(uid);
}

async function main() {
  // gather target UserRecords (deduped by uid)
  const byUid = new Map();
  if (opts.allStudents) {
    for (const u of await listAll()) {
      if (roleOf(u) === "student" && inDateRange(u)) byUid.set(u.uid, u);
    }
  }
  for (const token of ids) {
    const u = await resolveUser(token);
    if (u) byUid.set(u.uid, u);
  }

  // safety: never touch teacher/admin unless explicitly allowed
  const targets = [];
  const skippedStaff = [];
  for (const u of byUid.values()) {
    const role = roleOf(u);
    if ((role === "teacher" || role === "admin") && !opts.includeStaff) skippedStaff.push(u);
    else targets.push(u);
  }

  if (skippedStaff.length) {
    console.log(`# protected (teacher/admin) — NOT deleting ${skippedStaff.length}: ` +
      skippedStaff.map((u) => friendIdFromEmail(u.email) || u.uid).join(", "));
  }
  if (targets.length === 0) fail("no deletable targets after filters/safety. Nothing done.");

  console.log(`\n# ${opts.yes ? "DELETING" : "DRY-RUN (no --yes) would delete"} ${targets.length} user(s):`);
  console.log(["role", "friendId", "uid", "created", "name"].join("\t"));
  for (const u of targets) {
    console.log([roleOf(u), friendIdFromEmail(u.email) || "(non-fid)", u.uid, u.metadata.creationTime, u.displayName || ""].join("\t"));
  }

  if (!opts.yes) {
    console.log(`\n# DRY-RUN only. Re-run with --yes to permanently delete the ${targets.length} account(s) above.`);
    return;
  }

  let ok = 0;
  const failed = [];
  for (const u of targets) {
    try {
      await deleteOneUser(u.uid);
      ok++;
      console.log(`[deleteUsers] deleted ${friendIdFromEmail(u.email) || u.uid} (auth + own data).`);
    } catch (e) {
      failed.push({ id: friendIdFromEmail(u.email) || u.uid, err: e && e.message ? e.message : String(e) });
    }
  }
  console.log(`\n# done: ${ok} deleted, ${failed.length} failed.`);
  for (const f of failed) console.error(`  FAILED ${f.id}: ${f.err}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
