/* ============================================================
 * listUsers.mjs — ADMIN-ONLY: list every Firebase Auth user (read-only).
 * ------------------------------------------------------------
 * Use this to see the accounts that piled up during testing so you can pick the
 * test students to remove with scripts/deleteUsers.mjs. Reads nothing sensitive:
 * prints uid, Friend ID (decoded from the deterministic internal email), display
 * name, role (from custom claims), and created / last-sign-in times. No password
 * is ever read or shown.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json node scripts/listUsers.mjs
 *   ORIEX_SA_KEY=... node scripts/listUsers.mjs --students   # only non-staff
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY points at your Admin SDK
 * credentials JSON (NEVER committed).
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { INTERNAL_AUTH_EMAIL_DOMAIN } from "../src/features/auth/friendIdAuth.js";

function fail(msg) {
  console.error("[listUsers] " + msg);
  process.exit(1);
}

const studentsOnly = process.argv.includes("--students");

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

/** Recover the public Friend ID from a user's deterministic internal email. */
export function friendIdFromEmail(email) {
  if (typeof email !== "string") return "";
  const suffix = "@" + INTERNAL_AUTH_EMAIL_DOMAIN;
  const lower = email.toLowerCase();
  if (!lower.endsWith(suffix)) return "";
  return lower.slice(0, -suffix.length).toUpperCase();
}

/** Role from server-set custom claims (never client-writable). */
export function roleOf(user) {
  const c = (user && user.customClaims) || {};
  if (c.admin === true) return "admin";
  if (c.teacher === true) return "teacher";
  return "student";
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

async function main() {
  const users = await listAll();
  const rows = users
    .map((u) => ({
      role: roleOf(u),
      friendId: friendIdFromEmail(u.email) || "(non-friend-id)",
      uid: u.uid,
      created: u.metadata.creationTime || "",
      lastSignIn: u.metadata.lastSignInTime || "(never)",
      name: u.displayName || "",
    }))
    .filter((r) => (studentsOnly ? r.role === "student" : true))
    .sort((a, b) => new Date(a.created) - new Date(b.created));

  const counts = rows.reduce((m, r) => ((m[r.role] = (m[r.role] || 0) + 1), m), {});
  console.log(
    `# ${rows.length} user(s)  student:${counts.student || 0}  teacher:${counts.teacher || 0}  admin:${counts.admin || 0}`,
  );
  console.log(["role", "friendId", "uid", "created", "lastSignIn", "name"].join("\t"));
  for (const r of rows) {
    console.log([r.role, r.friendId, r.uid, r.created, r.lastSignIn, r.name].join("\t"));
  }
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
