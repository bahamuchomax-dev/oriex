/* DEV-ONLY, READ-ONLY: extract embedded data:image URIs from the legacy bundle
 * to ./tmp-bundle-img so we can visually identify which one is the hamster icon.
 *   node scripts/extractBundleImages.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("src/legacy/oriex-app.bundle.js", "utf8");
mkdirSync("tmp-bundle-img", { recursive: true });

const re = /data:image\/(png|webp|jpeg|jpg);base64,([A-Za-z0-9+/]+=*)/g;
let m;
let i = 0;
const seen = new Set();
while ((m = re.exec(src)) !== null) {
  const ext = m[1];
  const b64 = m[2];
  if (b64.length < 2000) continue; // skip tiny icons; we want the big illustrations
  const key = b64.slice(0, 24);
  if (seen.has(key)) continue;
  seen.add(key);
  i += 1;
  const buf = Buffer.from(b64, "base64");
  const name = `tmp-bundle-img/img_${i}_${ext}_${key.replace(/[^A-Za-z0-9]/g, "")}.${ext}`;
  writeFileSync(name, buf);
  console.log(`${name}  bytes=${buf.length}  prefix=${key}`);
}
console.log(`done: ${i} image(s)`);
