/* ============================================================
 * deployRules.mjs — ADMIN-ONLY: deploy firestore.rules to PRODUCTION.
 * ------------------------------------------------------------
 * Pushing to GitHub only deploys the WEB APP (GitHub Pages). The Firestore
 * Security Rules are a SEPARATE deploy. This script publishes the repo's
 * firestore.rules using your Admin SDK key — no Firebase CLI / login needed.
 *
 * It does the same two steps the Firebase CLI does, via the Rules REST API:
 *   1) create a ruleset from the local firestore.rules,
 *   2) point the live `cloud.firestore` release at that new ruleset.
 *
 * Usage:
 *   ORIEX_SA_KEY=/abs/path/to/admin-credentials.json node scripts/deployRules.mjs
 *
 * Prereqs: npm i firebase-admin ; ORIEX_SA_KEY = your Admin SDK creds (never commit).
 * Tip: check what is live first with  node scripts/getDeployedRules.mjs
 * ============================================================ */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";

function fail(msg) {
  console.error("[deployRules] " + msg);
  process.exit(1);
}

const keyPath = process.env.ORIEX_SA_KEY;
if (!keyPath) fail("set ORIEX_SA_KEY to the path of your Admin SDK credentials JSON");

let creds;
try {
  creds = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  fail("could not read/parse ORIEX_SA_KEY file");
}

let rules;
try {
  rules = readFileSync("firestore.rules", "utf8");
} catch {
  fail("could not read firestore.rules (run from the repo root)");
}

const app = initializeApp({ credential: cert(creds) });
const proj = creds.project_id;
if (!proj) fail("creds file has no project_id");

const token = (await app.options.credential.getAccessToken()).access_token;
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const API = "https://firebaserules.googleapis.com/v1";

// 1) create a ruleset from the local firestore.rules
const created = await fetch(`${API}/projects/${proj}/rulesets`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rules }] } }),
}).then((r) => r.json());
if (!created || !created.name) {
  fail("ruleset create failed: " + JSON.stringify(created && created.error ? created.error : created));
}
console.error("[deployRules] created ruleset:", created.name);

// 2) point the live cloud.firestore release at the new ruleset (same as the CLI)
const relName = `projects/${proj}/releases/cloud.firestore`;
const updated = await fetch(`${API}/projects/${proj}/releases/cloud.firestore`, {
  method: "PATCH",
  headers: H,
  body: JSON.stringify({ release: { name: relName, rulesetName: created.name } }),
}).then((r) => r.json());
if (updated && updated.error) {
  fail("release update failed: " + JSON.stringify(updated.error));
}

console.log(
  "[deployRules] ✅ DEPLOYED firestore.rules to " +
    proj +
    " (ruleset " +
    created.name.split("/").pop() +
    "). The save/plan/record fixes are now live.",
);
