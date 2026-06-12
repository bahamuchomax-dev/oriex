// Local (per-user) store for the spaced-repetition "review" data.
//
// Since v6.8 this data lives in localStorage, NOT Firestore. Do not move it
// back to Firebase (that was an intentional change to cut read/write costs).
//
// Keys (from the v6.9 dist):
//   oriex_review_{uid}            -> the review items for that user
//   oriex_review_migrated_{uid}   -> "1" once migration from Firestore ran
//
// Related (older) keys also seen in the dist, kept here for reference:
//   oriex_review_folders, oriex_review_assign

const keyFor = (uid) => `oriex_review_${uid}`;
const migratedKeyFor = (uid) => `oriex_review_migrated_${uid}`;

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadReview(uid) {
  if (!uid) return [];
  return safeParse(localStorage.getItem(keyFor(uid)), []);
}

export function saveReview(uid, items) {
  if (!uid) return;
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(items ?? []));
  } catch {
    // localStorage can throw when full / disabled; swallow to avoid crashing UI.
  }
}

export function clearReview(uid) {
  if (!uid) return;
  localStorage.removeItem(keyFor(uid));
}

export function isMigrated(uid) {
  return !!uid && localStorage.getItem(migratedKeyFor(uid)) === "1";
}

export function markMigrated(uid) {
  if (!uid) return;
  localStorage.setItem(migratedKeyFor(uid), "1");
}
