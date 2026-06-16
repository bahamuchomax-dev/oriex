/* ============================================================
 * deleteUsers.mjs — ADMIN-ONLY: bulk-delete users (auth + their data).
 * ------------------------------------------------------------
 * For cleaning up the many test accounts that pile up during testing. Deletes the
 * same things as deleteUser.mjs, for many users at once. DRY-RUN by default — it
 * only PRINTS what it would delete until you pass --yes. ADMIN accounts are NEVER
 * deleted by this tool. No password is ever read or logged.
 *
 * Choose WHO to delete:
 *   - explicit list:   ABC234 DEF567 <uid> ...
 *   - from a file:     --file ids.txt            (one Friend ID/uid per line; # comments ok)
 *   - all students:    --all-students            (every account with NO teacher/admin claim)
 *   - all non-admins:  --all-users               (students AND teachers; admins still protected)
 *
 * Choose WHO to KEEP (excluded from deletion; repeatable):
 *   --keep ABC234        keep this Friend ID / uid
 *   --keep-name てぃも    keep anyone whose profile name CONTAINS this text
 *
 * Optional creation-time filters (ISO or YYYY-MM-DD):
 *   --created-after 2026-06-01   --created-before 2026-06-16
 *
 * Example — keep only てぃも / みわちゃん (students) and the KGNS4Q teacher,
 * delete every other student + teacher (admins stay), preview then run:
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/deleteUsers.mjs --all-users \
 *     --keep KGNS4Q --keep-name てぃも --keep-name みわちゃん
 *   # add --yes once the dry-run list looks right.
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
const opts = { yes: false, allStudents: false, allUsers: false, file: null, after: null, before: null };
const ids = [];
const keepTokens = [];
const keepNames = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--yes") opts.yes = true;
  else if (a === "--all-students") opts.allStudents = true;
  else if (a === "--all-users") opts.allUsers = true;
  else if (a === "--file") opts.file = argv[++i];
  else if (a === "--keep") keepTokens.push(argv[++i]);
  else if (a === "--keep-name") keepNames.push((argv[++i] || "").trim().toLowerCase());
  else if (a === "--show-names") opts.showNames = true; // force profile-name display (extra Firestore reads)
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
if (!opts.allStudents && !opts.allUsers && ids.length === 0) {
  fail("nothing to do: pass Friend IDs/uids, or --file <path>, or --all-students / --all-users");
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

/** Best-known display name for a uid (legacy → modern → profiles → Auth). */
async function profileName(uid, authDisplayName) {
  const paths = [
    `artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`,
    `users/${uid}/profile/main`,
    `profiles/${uid}`,
  ];
  for (const path of paths) {
    try {
      const snap = await db.doc(path).get();
      if (snap.exists) {
        const n = snap.data() && snap.data().name;
        if (typeof n === "string" && n.trim()) return n.trim();
      }
    } catch {
      /* ignore, try next */
    }
  }
  return (authDisplayName || "").trim();
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

/** Per-user deletion: data + auth account. Mirrors deleteUser.mjs (plus the
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
  // 1) candidate UserRecords (deduped by uid)
  const byUid = new Map();
  if (opts.allStudents || opts.allUsers) {
    for (const u of await listAll()) {
      const role = roleOf(u);
      const wanted = opts.allUsers ? role !== "admin" : role === "student";
      if (wanted && inDateRange(u)) byUid.set(u.uid, u);
    }
  }
  for (const token of ids) {
    const u = await resolveUser(token);
    if (u) byUid.set(u.uid, u);
  }

  // 2) keep set (by uid). resolve --keep tokens; --keep-name matched per-user below.
  const keepUids = new Set();
  for (const token of keepTokens) {
    const u = await resolveUser(token);
    if (u) keepUids.add(u.uid);
  }

  // 3) classify each candidate
  const targets = [];
  const kept = [];
  const protectedAdmins = [];
  // Only read Firestore profile names when --keep-name needs them (or --show-names
  // is set). With uid/Friend-ID keeps this does ZERO Firestore reads — selection
  // is pure Auth (listUsers / getUser are Auth ops, not billed Firestore reads).
  const needNames = keepNames.length > 0 || process.argv.includes("--show-names");
  for (const u of byUid.values()) {
    const name = needNames ? await profileName(u.uid, u.displayName) : (u.displayName || "");
    const role = roleOf(u);
    u.__name = name;
    u.__role = role;
    if (role === "admin") {
      protectedAdmins.push(u);
      continue;
    }
    const keptByName = keepNames.some((s) => s && name.toLowerCase().includes(s));
    if (keepUids.has(u.uid) || keptByName) {
      kept.push(u);
      continue;
    }
    targets.push(u);
  }

  const fid = (u) => friendIdFromEmail(u.email) || u.uid;
  if (protectedAdmins.length) {
    console.log(`# admins (always protected): ${protectedAdmins.map(fid).join(", ")}`);
  }
  if (kept.length) {
    console.log(`# KEEP (${kept.length}): ` + kept.map((u) => `${fid(u)}/${u.__name || "?"}`).join(", "));
  }
  if (targets.length === 0) fail("no deletable targets after keep/admin filters. Nothing done.");

  console.log(`\n# ${opts.yes ? "DELETING" : "DRY-RUN (no --yes) would delete"} ${targets.length} user(s):`);
  console.log(["role", "friendId", "uid", "name", "created"].join("\t"));
  for (const u of targets) {
    console.log([u.__role, fid(u), u.uid, u.__name || "(no name)", u.metadata.creationTime].join("\t"));
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
      console.log(`[deleteUsers] deleted ${fid(u)} (${u.__name || "no name"}).`);
    } catch (e) {
      failed.push({ id: fid(u), err: e && e.message ? e.message : String(e) });
    }
  }
  console.log(`\n# done: ${ok} deleted, ${failed.length} failed.`);
  for (const f of failed) console.error(`  FAILED ${f.id}: ${f.err}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
