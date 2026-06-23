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
const WORDS_CACHE_KEY = "oxCustomVocabularyCache";
const SEEN_CACHE_PREFIX = "oxCustomSeenCache:";
const WORDS_CACHE_MS = 10 * 60_000;
const SEEN_CACHE_MS = 5 * 60_000;

let wordsCache = { at: 0, words: null };
const seenCache = new Map(); // uid -> { at, seen }

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable - memory cache still works */
  }
}

function fresh(at, ttl) {
  return Number.isFinite(Number(at)) && Date.now() - Number(at) < ttl;
}

function cachedWords() {
  if (wordsCache.words && fresh(wordsCache.at, WORDS_CACHE_MS)) return wordsCache.words;
  const stored = readJson(WORDS_CACHE_KEY);
  if (stored && Array.isArray(stored.words) && fresh(stored.at, WORDS_CACHE_MS)) {
    wordsCache = { at: Number(stored.at), words: stored.words };
    return stored.words;
  }
  return null;
}

function storeWords(words) {
  wordsCache = { at: Date.now(), words };
  writeJson(WORDS_CACHE_KEY, wordsCache);
  return words;
}

function cachedSeen(uid) {
  const hit = seenCache.get(uid);
  if (hit && fresh(hit.at, SEEN_CACHE_MS)) return new Set(hit.seen);
  const stored = readJson(SEEN_CACHE_PREFIX + uid);
  if (stored && Array.isArray(stored.ids) && fresh(stored.at, SEEN_CACHE_MS)) {
    const seen = new Set(stored.ids);
    seenCache.set(uid, { at: Number(stored.at), seen });
    return new Set(seen);
  }
  return null;
}

function storeSeen(uid, seen) {
  const next = new Set(seen);
  seenCache.set(uid, { at: Date.now(), seen: next });
  writeJson(SEEN_CACHE_PREFIX + uid, { at: Date.now(), ids: Array.from(next) });
  return new Set(next);
}

/**
 * Read the shared custom vocabulary (read-only). getDocs, NOT onSnapshot.
 * Called only when the wordbook tab opens — never at login.
 *
 * Never writes to customVocabulary and never touches a `seenBy` field.
 *
 * @returns array of { id, word, meaning, subject, pos, example, note, authorName, ... }
 */
export async function loadCustomVocabulary(force = false) {
  const cached = force ? null : cachedWords();
  if (cached) return cached;
  const q = query(refs.customVocabularyCol(), limit(MAX_WORDS));
  const snap = await getDocs(q);
  const words = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Client-side sort (avoid needing an index): subject, then word.
  words.sort((a, b) => {
    const s = String(a.subject ?? "").localeCompare(String(b.subject ?? ""));
    return s !== 0 ? s : String(a.word ?? "").localeCompare(String(b.word ?? ""));
  });
  return storeWords(words);
}

/**
 * Read THIS user's seen markers from users/{uid}/customSeen.
 * @returns Set of wordIds the user has marked seen (empty if no uid).
 */
export async function loadCustomSeen(uid, force = false) {
  if (!uid) return new Set();
  const cached = force ? null : cachedSeen(uid);
  if (cached) return cached;
  const snap = await getDocs(refs.customSeenCol(uid));
  return storeSeen(uid, snap.docs.map((d) => d.id));
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
  const current = cachedSeen(uid) || new Set();
  current.add(word.id);
  storeSeen(uid, current);
}

/**
 * Remove a seen marker (un-read). Deletes only the user's own customSeen doc.
 */
export async function unmarkCustomSeen(uid, wordId) {
  if (!uid || !wordId) return;
  await deleteDoc(refs.customSeenDoc(uid, wordId));
  const current = cachedSeen(uid) || new Set();
  current.delete(wordId);
  storeSeen(uid, current);
}
