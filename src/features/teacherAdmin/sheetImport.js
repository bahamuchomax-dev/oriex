/* Pure helpers for the teacher-admin "スプレッドシートから単語を追加" feature.
 * No network/DOM/Firestore here — just URL → CSV-export URL, CSV text → rows, and
 * rows → {en, ja, sentence}. Unit-tested. (The legacy import used the same shape.)
 */

/** Build the CSV export URL for a Google Sheets share/edit URL, or "" if invalid. */
export function parseSheetCsvUrl(url) {
  const s = typeof url === "string" ? url.trim() : "";
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return "";
  const gid = (s.match(/[#&?]gid=([0-9]+)/) || [])[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

/** Parse CSV text into an array of string-cell rows (handles quoted fields). */
export function parseCsv(text) {
  const out = [];
  const src = typeof text === "string" ? text : "";
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

/** Rows (incl. a header row 1, which is skipped) → { ok:[{en,ja,sentence}], bad:[rowNo] }.
 *  A row is valid when it has a non-empty English (col A) AND Japanese (col B). */
export function rowsToVocab(rows) {
  const ok = [];
  const bad = [];
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 1; i < list.length; i += 1) {
    const r = list[i] || [];
    const en = String(r[0] == null ? "" : r[0]).trim();
    const ja = String(r[1] == null ? "" : r[1]).trim();
    const sentence = String(r[2] == null ? "" : r[2]).trim();
    if (!en && !ja && !sentence) continue; // blank line — ignore silently
    if (en && ja) ok.push({ en, ja, sentence });
    else bad.push(i + 1); // 1-based row number for the user
  }
  return { ok, bad };
}
