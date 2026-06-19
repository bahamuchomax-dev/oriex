/* ============================================================
 * distributedVocab — bridge the new home to the teacher-distributed vocabulary the
 * LEGACY app actually serves. Teachers write words to
 *   artifacts/{appId}/public/data/customVocabulary
 *   { en, ja, sentence, category, stage, timestamp(ms), seenBy?, assignedTo? }
 * via BOTH the modern TeacherAdminPanel (spreadsheet import) and the legacy 配信
 * screen. Signed-in students may READ it (firestore.rules: the artifacts public/data
 * wildcard is `allow read: if signedIn()`).
 *
 * Firebase is dynamically imported so it stays OFF the home's initial chunk, and a
 * short in-memory cache keeps the home badge + VocabView from double-reading. Every
 * failure (not signed in / offline / rules) degrades to "no new words" — never throws.
 *
 * "Unread" = words distributed AFTER the last time the student opened the 単語帳 view
 * (localStorage 'oxhVocabSeenAt', ms). The baseline is set on first run so an existing
 * corpus does NOT show up as hundreds of unread — only genuinely NEW distributions light
 * the dot. Mirrors the 赤ぽっち request in task [12].
 * ============================================================ */
import { useEffect, useState } from "react";

// The legacy app's artifacts/{appId} namespace (a public, non-secret id — same value
// used by legacyBridgeProfile.js and TeacherAdminPanel.jsx).
const LEGACY_APP_ID = "gen-ron-kai-app-v1";
const SEEN_KEY = "oxhVocabSeenAt";
const MAX_WORDS = 200;
const CACHE_MS = 60_000;

let _cache = { at: 0, words: null };

// Mirror the legacy bundle's content filter (oriex-app.bundle.js ~L41342): hide any
// word whose category/subject/title/en/ja mentions みわ, so the new home shows the SAME
// set the legacy vocab screen does — which keeps the unread count honest.
function legacyVisible(w) {
  const s = String(
    (w.category || "") + (w.subject || "") + (w.title || "") + (w.en || "") + (w.ja || ""),
  );
  return !/みわ|三輪|ミワ|ﾐﾜ/.test(s);
}

/** Lazily read the distributed words, newest first. Cached ~60s; never throws. */
export async function loadDistributedVocab(force = false) {
  if (!force && _cache.words && Date.now() - _cache.at < CACHE_MS) return _cache.words;
  try {
    const [{ db }, { collection, getDocs, query, limit }] = await Promise.all([
      import("../../firebase/firebase.js"),
      import("firebase/firestore"),
    ]);
    const col = collection(db, "artifacts", LEGACY_APP_ID, "public", "data", "customVocabulary");
    const snap = await getDocs(query(col, limit(MAX_WORDS)));
    const words = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(legacyVisible)
      .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
    _cache = { at: Date.now(), words };
    return words;
  } catch {
    // Hard failure (not signed in / offline / rules): return the last good read if we
    // have one, else null so callers can tell "failed" apart from "empty corpus".
    return _cache.words || null;
  }
}

/** Last-opened timestamp (ms). 0 if the student has never opened the 単語帳 view. */
export function getVocabSeenAt() {
  try {
    const v = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/** Record that the student has just seen the distributed words (clears the home dot). */
export function markVocabSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — keep the dot until next successful write */
  }
}

/** How many distributed words are newer than `seenAt`. */
export function unreadVocabCount(words, seenAt = getVocabSeenAt()) {
  if (!Array.isArray(words)) return 0;
  return words.reduce((n, w) => ((Number(w.timestamp) || 0) > seenAt ? n + 1 : n), 0);
}

/**
 * Live count of teacher-distributed words newer than the student's last 単語帳 open.
 * Re-checks whenever `view` changes (cheap — cache hit) so the dot clears the moment the
 * student returns from the vocab view. One real Firestore read per ~60s, lazily after the
 * home paints. First run sets the baseline so an existing corpus never floods the badge.
 */
export function useDistributedVocabUnread(view) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let seenAt = getVocabSeenAt();
      if (!seenAt) {
        // First ever run: baseline to "now" so pre-existing words aren't all "new".
        markVocabSeen();
        seenAt = getVocabSeenAt();
      }
      const words = await loadDistributedVocab();
      if (!cancelled) setUnread(unreadVocabCount(words, seenAt));
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);
  return unread;
}
