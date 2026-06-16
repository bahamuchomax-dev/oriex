/* ADMIN-ONLY, READ-ONLY: print the Firestore Security Rules CURRENTLY DEPLOYED
 * to production. Lets us diff deployed-vs-repo before any rules change, so a
 * deploy never silently breaks a live write path.
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/getDeployedRules.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";

const keyPath = process.env.ORIEX_SA_KEY;
if (!keyPath) {
  console.error("set ORIEX_SA_KEY");
  process.exit(1);
}
const creds = JSON.parse(readFileSync(keyPath, "utf8"));
const app = initializeApp({ credential: cert(creds) });
const proj = creds.project_id;

const token = (await app.options.credential.getAccessToken()).access_token;
const auth = { headers: { Authorization: `Bearer ${token}` } };

const rel = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${proj}/releases/cloud.firestore`,
  auth,
).then((r) => r.json());
console.error("release -> ruleset:", rel.rulesetName, "updated:", rel.updateTime);

const rs = await fetch(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`, auth).then((r) =>
  r.json(),
);
const files = (rs.source && rs.source.files) || [];
for (const f of files) {
  console.log(`/* ===== DEPLOYED: ${f.name} ===== */`);
  console.log(f.content);
}
