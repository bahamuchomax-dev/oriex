/* ============================================================
 * stripLegacyPasswords.mjs — ADMIN-ONLY one-off data cleanup.
 * ------------------------------------------------------------
 * Removes the plaintext `password` (and `passwordHash`) field from every legacy
 * doc that should never have carried a credential:
 *   - artifacts/<appId>/public/data/customApp/<uid>   (WORLD-READABLE — critical)
 *   - artifacts/<appId>/public/data/teacherIndex/<uid> (world-readable)
 *   - artifacts/<appId>/users/<uid>/profile/main       (owner-read; defense-in-depth)
 *
 * Why: the legacy bundle used to spread the whole profile (incl. the plaintext
 * login password) into the WORLD-READABLE customApp card, so anyone could bulk-
 * download Friend ID + password and take over any account. The bundle no longer
 * writes those fields and firestore.rules now rejects them, but EXISTING docs
 * still hold the field until it is deleted here. Passwords now live only in
 * Firebase Auth (modern login), so deleting this dead field changes no behavior.
 *
 * Usage (DRY RUN by default — prints what it WOULD delete, writes nothing):
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/stripLegacyPasswords.mjs
 * Apply for real:
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/stripLegacyPasswords.mjs --apply
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY = path to Admin SDK creds (never commit).
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const LEGACY_APP_ID = "gen-ron-kai-app-v1";
const CREDENTIAL_FIELDS = ["password", "passwordHash"];
const APPLY = process.argv.slice(2).includes("--apply");

function fail(msg) {
  console.error("[stripLegacyPasswords] " + msg);
  process.exit(1);
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
const db = getFirestore();

const base = db.collection("artifacts").doc(LEGACY_APP_ID);

/** Build the FieldValue.delete() patch for whichever credential fields a doc actually has. */
function deletionPatch(data) {
  const patch = {};
  for (const f of CREDENTIAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, f)) patch[f] = FieldValue.delete();
  }
  return patch;
}

async function stripCollection(label, colRef) {
  const snap = await colRef.get();
  let hits = 0;
  for (const doc of snap.docs) {
    const patch = deletionPatch(doc.data() || {});
    if (Object.keys(patch).length === 0) continue;
    hits++;
    console.log(`  ${APPLY ? "DELETE" : "would delete"} [${Object.keys(patch).join(", ")}] on ${label}/${doc.id}`);
    if (APPLY) await doc.ref.update(patch);
  }
  console.log(`[${label}] ${snap.size} docs scanned, ${hits} carried a credential field.`);
  return hits;
}

async function stripProfiles() {
  // users/<uid>/profile/main — iterate user docs, then the fixed profile/main doc.
  const userRefs = await base.collection("users").listDocuments();
  let scanned = 0;
  let hits = 0;
  for (const userRef of userRefs) {
    const mainRef = userRef.collection("profile").doc("main");
    const main = await mainRef.get();
    if (!main.exists) continue;
    scanned++;
    const patch = deletionPatch(main.data() || {});
    if (Object.keys(patch).length === 0) continue;
    hits++;
    console.log(`  ${APPLY ? "DELETE" : "would delete"} [${Object.keys(patch).join(", ")}] on users/${userRef.id}/profile/main`);
    if (APPLY) await mainRef.update(patch);
  }
  console.log(`[profile/main] ${scanned} profiles scanned, ${hits} carried a credential field.`);
  return hits;
}

async function main() {
  console.log(`[stripLegacyPasswords] appId=${LEGACY_APP_ID} mode=${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`);
  const total =
    (await stripCollection("public/data/customApp", base.collection("public").doc("data").collection("customApp"))) +
    (await stripCollection("public/data/teacherIndex", base.collection("public").doc("data").collection("teacherIndex"))) +
    (await stripProfiles());
  console.log(`[stripLegacyPasswords] DONE. ${total} doc(s) ${APPLY ? "cleaned" : "would be cleaned"}.`);
  if (!APPLY && total > 0) console.log("[stripLegacyPasswords] Re-run with --apply to actually delete these fields.");
  process.exit(0);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
