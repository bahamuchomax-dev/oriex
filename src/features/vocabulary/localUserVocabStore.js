// Local (per-user) store for the user's personal vocabulary ("マイワード").
//
// Since v6.8 this data lives in localStorage, NOT Firestore. Do not move it
// back to Firebase.
//
// Keys (from the v6.9 dist):
//   oriex_userVocab_{uid}            -> the user's vocab list
//   oriex_userVocab_migrated_{uid}   -> "1" once migration from Firestore ran

const keyFor = (uid) => `oriex_userVocab_${uid}`;
const migratedKeyFor = (uid) => `oriex_userVocab_migrated_${uid}`;

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadUserVocab(uid) {
  if (!uid) return [];
  return safeParse(localStorage.getItem(keyFor(uid)), []);
}

export function saveUserVocab(uid, items) {
  if (!uid) return;
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(items ?? []));
  } catch {
    // ignore quota / disabled-storage errors
  }
}

export function clearUserVocab(uid) {
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
