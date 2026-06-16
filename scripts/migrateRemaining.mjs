/* ============================================================
 * migrateRemaining.mjs — ADMIN-ONLY: find every NOT-YET-MIGRATED account and
 * (on --apply) issue each one a Friend ID + password in place, then print a
 * single consolidated credential list to hand out.
 * ------------------------------------------------------------
 * "Remaining" = an account that has NO Friend ID login yet (its Auth email is
 * not a deterministic friend-id email — i.e. an old anonymous account or any
 * account never run through migrateUser). Migrated accounts are skipped.
 *
 * Each migration is the SAME in-place upgrade as scripts/migrateUser.mjs: it sets
 * the internal email (from a Friend ID) + a password on the SAME uid (all data
 * preserved), reuses the account's existing legacy shortId as the Friend ID when
 * present (else mints a unique one), and stamps the Friend ID into the legacy
 * profile + the role-correct directory (students→customApp, teachers→teacherIndex).
 *
 * PASSWORDS CANNOT BE RECOVERED LATER. Firebase Auth stores only a hash; this
 * script PRINTS each password ONCE at issuance. Save the output now.
 *
 * Usage:
 *   # 1) DRY RUN (default) — list who WOULD be migrated. Writes nothing.
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/migrateRemaining.mjs
 *
 *   # 2) APPLY — actually issue credentials and print the consolidated list.
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/migrateRemaining.mjs --apply
 *
 * Flags:
 *   --apply                actually write (without it, nothing is changed)
 *   --include-non-students also migrate teacher/admin anonymous accounts
 *                          (default: students only — safest)
 *   --password <pw>        use one fixed password for everyone (default: a fresh
 *                          random password per user)
 *   --limit <n>            cap how many to process (handy for a careful first run)
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY = path to Admin SDK creds (never commit).
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  FRIEND_ID_ALPHABET,
  INTERNAL_AUTH_EMAIL_DOMAIN,
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  generateFriendId,
} from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[migrateRemaining] " + msg);
  process.exit(1);
}

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const opts = { apply: false, includeNonStudents: false, password: null, limit: Infinity };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--apply") opts.apply = true;
  else if (a === "--include-non-students") opts.includeNonStudents = true;
  else if (a === "--password") opts.password = argv[++i];
  else if (a === "--limit") opts.limit = Number(argv[++i]);
  else fail("unknown flag: " + a);
}
if (opts.password != null && opts.password.length < 6) fail("--password must be at least 6 characters");
if (!(opts.limit > 0)) fail("--limit must be a positive number");

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

// ---- helpers (mirrors migrateUser.mjs / listUsers.mjs) ----------------------
function generatePassword(len = 10) {
  const out = [];
  for (let i = 0; i < len; i++) out.push(FRIEND_ID_ALPHABET[Math.floor(Math.random() * FRIEND_ID_ALPHABET.length)]);
  return out.join("");
}

/** Recover the public Friend ID from a user's deterministic internal email
 *  (""=not a friend-id account ⇒ NOT migrated yet). */
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

/** True iff this Friend ID's deterministic email already belongs to someone
 *  OTHER than `uid` (existing account OR one we minted earlier this run). */
async function friendIdTakenByOther(friendId, uid, mintedThisRun) {
  if (mintedThisRun.has(friendId)) return true;
  try {
    const u = await auth.getUserByEmail(makeInternalAuthEmailFromFriendId(friendId));
    return u.uid !== uid;
  } catch {
    return false;
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

/** Best display name for a uid (legacy profile → modern → profiles). */
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
      /* ignore */
    }
  }
  return (authDisplayName || "").trim();
}

/** Migrate ONE account in place. Returns { friendId, password, name, uid }. */
async function migrateOne(user, mintedThisRun) {
  const uid = user.uid;

  // pick the Friend ID: reuse existing legacy shortId, else mint a unique one
  let friendId = await existingShortId(uid);
  if (!friendId || (await friendIdTakenByOther(friendId, uid, mintedThisRun))) {
    friendId = "";
    for (let tries = 0; tries < 30 && !friendId; tries++) {
      const candidate = generateFriendId();
      if (!(await friendIdTakenByOther(candidate, uid, mintedThisRun))) friendId = candidate;
    }
    if (!friendId) throw new Error("could not mint a unique Friend ID after 30 tries");
  }
  mintedThisRun.add(friendId);

  const password = opts.password || generatePassword();

  // 1) AUTH: email + password on the SAME uid (data preserved).
  await auth.updateUser(uid, {
    email: makeInternalAuthEmailFromFriendId(friendId),
    emailVerified: false,
    password,
  });

  // 2) stamp Friend ID into legacy profile + role-correct directory (no password
  //    is ever written to Firestore).
  const prof = (await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).get()).data() || {};
  await db.doc(`artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main`).set({ shortId: friendId }, { merge: true });
  const dir = prof.isTeacher === true ? "teacherIndex" : "customApp";
  await db.doc(`artifacts/${LEGACY_APP_ID}/public/data/${dir}/${uid}`).set(
    { shortId: friendId, uid, name: prof.name || user.displayName || "", avatar: prof.avatar || "", color: prof.color || "" },
    { merge: true },
  );

  return { friendId, password, name: prof.name || user.displayName || "", uid };
}

// ---- main -------------------------------------------------------------------
async function main() {
  const users = await listAll();

  // "remaining" = no friend-id email yet (not migrated). Students only unless asked.
  let candidates = [];
  for (const u of users) {
    if (friendIdFromEmail(u.email)) continue; // already migrated
    const role = roleOf(u);
    if (!opts.includeNonStudents && role !== "student") continue;
    candidates.push({ user: u, role });
  }
  candidates.sort((a, b) => new Date(a.user.metadata.creationTime || 0) - new Date(b.user.metadata.creationTime || 0));
  if (candidates.length > opts.limit) candidates = candidates.slice(0, opts.limit);

  console.log(`[migrateRemaining] ${candidates.length} account(s) not yet migrated` +
    (opts.includeNonStudents ? " (all roles)" : " (students only)") +
    (Number.isFinite(opts.limit) ? `, limited to ${opts.limit}` : ""));

  if (!opts.apply) {
    console.log("\n--- DRY RUN (no changes). Re-run with --apply to issue credentials. ---");
    console.log(["role", "uid", "name", "created", "lastSignIn"].join("\t"));
    for (const c of candidates) {
      const name = await profileName(c.user.uid, c.user.displayName);
      console.log([
        c.role,
        c.user.uid,
        name || "(no name)",
        c.user.metadata.creationTime || "",
        c.user.metadata.lastSignInTime || "(never)",
      ].join("\t"));
    }
    console.log(`\n[migrateRemaining] DRY RUN — ${candidates.length} would be migrated. Nothing was changed.`);
    return;
  }

  // APPLY
  const results = [];
  const failures = [];
  const mintedThisRun = new Set();
  for (const c of candidates) {
    try {
      results.push(await migrateOne(c.user, mintedThisRun));
    } catch (e) {
      failures.push({ uid: c.user.uid, error: (e && e.message) || String(e) });
    }
  }

  console.log("\n========== CREDENTIALS (shown ONCE — save now) ==========");
  console.log(["name", "friendId", "password", "uid"].join("\t"));
  for (const r of results) {
    console.log([r.name || "(no name)", r.friendId, r.password, r.uid].join("\t"));
  }
  console.log(`\n[migrateRemaining] issued ${results.length} credential(s).`);
  if (failures.length) {
    console.log(`[migrateRemaining] ${failures.length} FAILED:`);
    for (const f of failures) console.log(`  ${f.uid}: ${f.error}`);
  }
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
