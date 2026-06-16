/* ADMIN-ONLY, READ-ONLY: locate any leftover "miwa" entry in the legacy live
 * directories so we can decide whether to remove the phantom account. Prints only
 * non-sensitive fields (uid, shortId, name, isTeacher) — never passwords.
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/findMiwa.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APP_ID = "gen-ron-kai-app-v1";
const creds = JSON.parse(readFileSync(process.env.ORIEX_SA_KEY, "utf8"));
initializeApp({ credential: cert(creds) });
const db = getFirestore();

const hit = (s) => typeof s === "string" && s.toLowerCase().includes("miwa");

const uids = new Set();
for (const dir of ["customApp", "teacherIndex"]) {
  const snap = await db.collection(`artifacts/${APP_ID}/public/data/${dir}`).get();
  console.log(`# ${dir}: ${snap.size} docs`);
  for (const d of snap.docs) {
    const x = d.data() || {};
    uids.add(x.uid || d.id);
    if (hit(d.id) || hit(x.uid) || hit(x.shortId) || hit(x.name)) {
      console.log(`  MIWA? dir=${dir} docId=${d.id} uid=${x.uid || ""} shortId=${x.shortId || ""} name=${x.name || ""}`);
    }
  }
}

// scan each known user's friends list for a leftover miwa entry
for (const uid of uids) {
  const fs = await db.collection(`artifacts/${APP_ID}/users/${uid}/friends`).get();
  for (const f of fs.docs) {
    const x = f.data() || {};
    if (hit(f.id) || hit(x.uid) || hit(x.name) || hit(x.shortId)) {
      console.log(`  MIWA in friends of ${uid}: friendDocId=${f.id} uid=${x.uid || ""} name=${x.name || ""}`);
    }
  }
}
console.log("done (no MIWA lines above = none found)");
