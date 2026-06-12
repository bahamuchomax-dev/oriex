import {
  getDocs,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

/* ------------------------------------------------------------------ *
 * Reads (only called when the books screen is open — never at login)
 * ------------------------------------------------------------------ */

/**
 * Load the whole book shelf. Reads: 1 getDocs.
 * @returns array of { id, title, subject, level, ownerUid, ownerName, ... }
 */
export async function loadBookShelf() {
  const snap = await getDocs(refs.bookShelfCol());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Minimal option list for the plans feature (next stage). Plans must offer ONLY
 * registered textbooks, so this is the single source of truth for that picker.
 * @returns array of { bookId, title, subject, level }
 */
export async function loadBookOptions() {
  const shelf = await loadBookShelf();
  return shelf.map((b) => ({
    bookId: b.id,
    title: b.title ?? "",
    subject: b.subject ?? "",
    level: b.level ?? "",
  }));
}

/**
 * Load study logs for a single book. Uses a `where(bookId==)` filter + client-side
 * sort (avoids needing a composite index for this minimal stage). limit(100).
 * Reads: up to 100.
 */
export async function loadBookLogsForBook(bookId) {
  const q = query(refs.bookLogsCol(), where("bookId", "==", bookId), limit(100));
  const snap = await getDocs(q);
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // newest first by studiedAt (string) then createdAt
  logs.sort((a, b) => String(b.studiedAt ?? "").localeCompare(String(a.studiedAt ?? "")));
  return logs;
}

/**
 * Load recent book study logs for record/timeline surfaces.
 * Reads only when the screen opens. No realtime listener and no writes.
 *
 * @param params { uid?, limitCount? }
 * @returns array of bookLog docs, newest first by studiedAt/createdAt
 */
export async function loadBookLogs({ uid, limitCount = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limitCount) || 50, 1), 200);
  const fetchLimit = Math.min(Math.max(safeLimit * 3, safeLimit), 200);
  const q = uid
    ? query(refs.bookLogsCol(), where("uid", "==", uid), limit(fetchLimit))
    : query(refs.bookLogsCol(), limit(fetchLimit));
  const snap = await getDocs(q);
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  logs.sort((a, b) => bookLogDateMs(b) - bookLogDateMs(a));
  return logs.slice(0, safeLimit);
}

/* ------------------------------------------------------------------ *
 * Writes (only on explicit save — never per keystroke)
 * ------------------------------------------------------------------ */

/**
 * Add a book to the shelf. Writes: 1 setDoc (auto id).
 * @param data { title, subject, level }
 * @param owner { uid, name }
 * @returns the new bookId
 */
export async function addBook(data, owner) {
  const ref = doc(refs.bookShelfCol()); // auto-generated id
  const bookId = ref.id;
  await setDoc(ref, {
    id: bookId,
    title: (data.title || "").trim(),
    subject: (data.subject || "").trim(),
    level: (data.level || "").trim(),
    ownerUid: owner?.uid ?? null,
    ownerName: owner?.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return bookId;
}

/**
 * Add a study log for a book. Writes: 1 addDoc.
 * @param data { bookId, bookTitle, subject, minutes, memo, studiedAt }
 * @param user { uid, name }
 */
export async function addBookLog(data, user) {
  await addDoc(refs.bookLogsCol(), {
    bookId: data.bookId,
    bookTitle: data.bookTitle ?? "",
    subject: data.subject ?? "",
    minutes: Number(data.minutes) || 0,
    memo: (data.memo || "").trim(),
    studiedAt: data.studiedAt || todayStr(),
    uid: user?.uid ?? null,
    userName: user?.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * TODO (timer stage): convenience wrapper to turn a finished timer session into a
 * book log. The per-book timer will call this with the measured minutes so the
 * record surfaces in the book log (and later the record timeline).
 *
 * @param session { bookId, bookTitle, subject, minutes, studiedAt? }
 * @param user { uid, name }
 */
export async function createBookLogFromTimer(session, user) {
  return addBookLog(
    {
      bookId: session.bookId,
      bookTitle: session.bookTitle,
      subject: session.subject,
      minutes: session.minutes,
      memo: session.memo ?? "",
      studiedAt: session.studiedAt || todayStr(),
    },
    user
  );
}

function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function bookLogDateMs(log) {
  return toMillis(log?.studiedAt) || toMillis(log?.createdAt) || 0;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}
