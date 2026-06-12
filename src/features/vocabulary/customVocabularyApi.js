import {
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

// Max shared words to pull at once (client-side sort afterwards).
const MAX_WORDS = 200;

/**
 * Read the shared custom vocabulary (read-only). getDocs, NOT onSnapshot.
 * Called only when the wordbook tab opens — never at login.
 *
 * Never writes to customVocabulary and never touches a `seenBy` field.
 *
 * @returns array of { id, word, meaning, subject, pos, example, note, authorName, ... }
 */
export async function loadCustomVocabulary() {
  const q = query(refs.customVocabularyCol(), limit(MAX_WORDS));
  const snap = await getDocs(q);
  const words = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Client-side sort (avoid needing an index): subject, then word.
  words.sort((a, b) => {
    const s = String(a.subject ?? "").localeCompare(String(b.subject ?? ""));
    return s !== 0 ? s : String(a.word ?? "").localeCompare(String(b.word ?? ""));
  });
  return words;
}

/**
 * Read THIS user's seen markers from users/{uid}/customSeen.
 * @returns Set of wordIds the user has marked seen (empty if no uid).
 */
export async function loadCustomSeen(uid) {
  if (!uid) return new Set();
  const snap = await getDocs(refs.customSeenCol(uid));
  return new Set(snap.docs.map((d) => d.id));
}

/**
 * Mark a shared word as seen by writing ONLY to users/{uid}/customSeen/{wordId}.
 * Does not modify customVocabulary. Save-only (explicit user action).
 *
 * @param uid
 * @param word the word object ({ id, word, meaning, subject, ... })
 */
export async function markCustomSeen(uid, word) {
  if (!uid || !word?.id) return;
  await setDoc(refs.customSeenDoc(uid, word.id), {
    wordId: word.id,
    word: word.word ?? "",
    meaning: word.meaning ?? "",
    subject: word.subject ?? "",
    uid,
    seenAt: serverTimestamp(),
  });
}

/**
 * Remove a seen marker (un-read). Deletes only the user's own customSeen doc.
 */
export async function unmarkCustomSeen(uid, wordId) {
  if (!uid || !wordId) return;
  await deleteDoc(refs.customSeenDoc(uid, wordId));
}
