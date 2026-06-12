import { mondayOf, weekIdFromDate } from "../studyDiary/weekId.js";

// Format a Date as "YYYY-MM-DD".
export function dateStr(date) {
  const d = new Date(date);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/**
 * Due date = the Friday of the NEXT week relative to `date`.
 * This week's Monday + 7 (next Monday) + 4 (Friday) = Monday + 11 days.
 * e.g. 2026/06/10 (Wed) -> 2026/06/19, 2026/06/13 (Sat) -> 2026/06/19.
 */
export function getNextWeekFriday(date = new Date()) {
  const mon = mondayOf(date);
  const friday = new Date(mon);
  friday.setDate(friday.getDate() + 11);
  return dateStr(friday);
}

export function planWeekId(date = new Date()) {
  return weekIdFromDate(date);
}

// planId is stable for a (week, teacher, student) triple.
export function buildPlanId(weekId, teacherUid, studentUid) {
  return `${weekId}_${teacherUid}_${studentUid}`;
}

export function clampPercent(n) {
  const v = Math.round(Number(n) || 0);
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * Overall progress = average of all items' progressPercent (0 if no items).
 */
export function computeOverall(items) {
  if (!items || items.length === 0) return 0;
  const sum = items.reduce((acc, it) => acc + clampPercent(it.progressPercent), 0);
  return Math.round(sum / items.length);
}

/**
 * Per-book progress: group items by bookId (fallback bookTitle), average each
 * group's progressPercent. Returns [{ bookId, bookTitle, subject, progressPercent }].
 */
export function computeBookProgress(items) {
  if (!items || items.length === 0) return [];
  const groups = new Map();
  for (const it of items) {
    const key = it.bookId || it.bookTitle || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        bookId: it.bookId ?? null,
        bookTitle: it.bookTitle ?? "",
        subject: it.subject ?? "",
        sum: 0,
        count: 0,
      });
    }
    const g = groups.get(key);
    g.sum += clampPercent(it.progressPercent);
    g.count += 1;
  }
  return [...groups.values()].map((g) => ({
    bookId: g.bookId,
    bookTitle: g.bookTitle,
    subject: g.subject,
    progressPercent: g.count ? Math.round(g.sum / g.count) : 0,
  }));
}

// Cheap unique id for plan items.
export function newItemId() {
  return "it_" + Math.random().toString(36).slice(2, 9);
}
