/* ============================================================
 * listUsers.mjs — ADMIN-ONLY: list every Firebase Auth user (read-only).
 * ------------------------------------------------------------
 * Use this to see the accounts that piled up during testing so you can pick who
 * to keep / remove with scripts/deleteUsers.mjs. Prints uid, Friend ID (decoded
 * from the deterministic internal email), the display NAME (from the user's
 * Firestore profile — the legacy profile first, then modern), role (from custom
 * claims), and created / last-sign-in times. No password is ever read or shown.
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
import { getFirestore } from "firebase-admin/firestore";
import { INTERNAL_AUTH_EMAIL_DOMAIN } from "../src/features/auth/friendIdAuth.js";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";

function fail(msg) {
  console.error("[listUsers] " + msg);
  process.exit(1);
}

const studentsOnly = process.argv.includes("--students");
// --no-names: skip the Firestore profile lookups entirely (0 billed reads — only
// Auth data: uid, Friend ID, role, created, lastSignIn). Names show as Auth
// displayName (usually blank). Use it when you only need to count / pick by id.
const noNames = process.argv.includes("--no-names");

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

/** Recover the public Friend ID from a user's deterministic internal email. */
export function friendIdFromEmail(email) {
  if (typeof email !== "string") return "";
  const suffix = "@" + INTERNAL_AUTH_EMAIL_DOMAIN;
  const lower = email.toLowerCase();
  return lower.endsWith(suffix) ? lower.slice(0, -suffix.length).toUpperCase() : "";
}

/** Role from server-set custom claims (never client-writable). */
export function roleOf(user) {
  const c = (user && user.customClaims) || {};
  if (c.admin === true) return "admin";
  if (c.teacher === true) return "teacher";
  return "student";
}

/** Best-known display name for a uid: legacy profile → modern profile → profiles
 *  → Auth displayName. Reads only `name` (never a password). Never throws. */
export async function profileName(uid, authDisplayName) {
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
      /* ignore and try the next path */
    }
  }
  return (authDisplayName || "").trim();
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
  const rows = [];
  for (const u of users) {
    const role = roleOf(u);
    if (studentsOnly && role !== "student") continue;
    rows.push({
      role,
      friendId: friendIdFromEmail(u.email) || "(non-friend-id)",
      uid: u.uid,
      created: u.metadata.creationTime || "",
      lastSignIn: u.metadata.lastSignInTime || "(never)",
      name: noNames ? (u.displayName || "") : await profileName(u.uid, u.displayName),
    });
  }
  rows.sort((a, b) => new Date(a.created) - new Date(b.created));

  const counts = rows.reduce((m, r) => ((m[r.role] = (m[r.role] || 0) + 1), m), {});
  console.log(
    `# ${rows.length} user(s)  student:${counts.student || 0}  teacher:${counts.teacher || 0}  admin:${counts.admin || 0}`,
  );
  console.log(["role", "friendId", "uid", "name", "created", "lastSignIn"].join("\t"));
  for (const r of rows) {
    console.log([r.role, r.friendId, r.uid, r.name || "(no name)", r.created, r.lastSignIn].join("\t"));
  }
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
