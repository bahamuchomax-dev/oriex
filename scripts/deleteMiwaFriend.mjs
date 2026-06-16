/* ADMIN-ONLY: delete the dangling "Miwa" friend entry (a reference to a
 * deleted account g88pU7fa... left in student 2N7422's friends list). Verifies
 * the target is exactly that dangling Miwa ref before deleting; prints what it did.
 *   ORIEX_SA_KEY=/abs/creds.json node scripts/deleteMiwaFriend.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APP_ID = "gen-ron-kai-app-v1";
const OWNER = "zZi93NbA9mT0GIxp1QOjpI0jXDz2"; // student 2N7422
const FRIEND = "g88pU7faEhWpmwPIoiXpKS97gAg1"; // deleted "Miwa" account

const creds = JSON.parse(readFileSync(process.env.ORIEX_SA_KEY, "utf8"));
initializeApp({ credential: cert(creds) });
const db = getFirestore();

const ref = db.doc(`artifacts/${APP_ID}/users/${OWNER}/friends/${FRIEND}`);
const snap = await ref.get();
if (!snap.exists) {
  console.log("nothing to delete — friend entry already gone");
  process.exit(0);
}
const data = snap.data() || {};
console.log("found:", { name: data.name, uid: data.uid });
if (String(data.name || "").toLowerCase() !== "miwa") {
  console.error("ABORT: target name is not 'Miwa' — refusing to delete", data.name);
  process.exit(1);
}
await ref.delete();
console.log(`deleted artifacts/${APP_ID}/users/${OWNER}/friends/${FRIEND} (name=${data.name})`);
