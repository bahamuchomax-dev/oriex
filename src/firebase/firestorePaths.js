// Centralized Firestore path helpers.
//
// Every collection/doc path observed in the v6.9 dist is expressed here as a
// function so the rest of the app never hard-codes path strings. If the data
// model changes, change it in ONE place.
//
// Path strings below were recovered from the minified v6.9 bundle. Some are
// confirmed (profile/main, friends, chats/messages, public/data/*); others are
// best-guess and marked TODO. Verify against the real Firestore before relying
// on them.

import {
  doc,
  collection,
} from "firebase/firestore";
import { db } from "./firebase.js";

/* ------------------------------------------------------------------ *
 * Raw path strings (single source of truth)
 * ------------------------------------------------------------------ */
export const paths = {
  // --- per-user ---
  userDoc: (uid) => `users/${uid}`,
  profileMain: (uid) => `users/${uid}/profile/main`,
  friendsCol: (uid) => `users/${uid}/friends`,
  friendDoc: (uid, friendUid) => `users/${uid}/friends/${friendUid}`,
  studyDiaryCol: (uid) => `users/${uid}/studyDiary`,
  studyDiaryDoc: (uid, weekId) => `users/${uid}/studyDiary/${weekId}`,
  customSeenCol: (uid) => `users/${uid}/customSeen`,
  customSeenDoc: (uid, wordId) => `users/${uid}/customSeen/${wordId}`,
  // weekly plans (student receives) / sentPlans (teacher's send history)
  weeklyPlansCol: (studentUid) => `users/${studentUid}/weeklyPlans`,
  weeklyPlanDoc: (studentUid, planId) => `users/${studentUid}/weeklyPlans/${planId}`,
  sentPlansCol: (teacherUid) => `users/${teacherUid}/sentPlans`,
  sentPlanDoc: (teacherUid, planId) => `users/${teacherUid}/sentPlans/${planId}`,

  // --- public/shared ---
  // customApp is a collection of per-user public cards (ranking / user search).
  customAppCol: () => `public/data/customApp`,
  customAppUser: (uid) => `public/data/customApp/${uid}`,
  teacherIndex: () => `public/data/teacherIndex`,
  customVocabularyCol: () => `public/data/customVocabulary`,
  customVocabularyDoc: (wordId) => `public/data/customVocabulary/${wordId}`,
  bookLogsCol: () => `public/data/bookLogs`,
  bookLogDoc: (logId) => `public/data/bookLogs/${logId}`,
  bookShelfCol: () => `public/data/bookShelf`,
  bookShelfDoc: (bookId) => `public/data/bookShelf/${bookId}`,
  sharedApps: () => `public/data/sharedApps`,

  // --- direct messages ---
  // pairId is a deterministic id built from the two uids (see pairId()).
  chatDoc: (pairId) => `chats/${pairId}`,
  chatMessagesCol: (pairId) => `chats/${pairId}/messages`,
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

// Deterministic, order-independent id for a DM pair.
export function pairId(uidA, uidB) {
  return [uidA, uidB].sort().join("__");
}

/* ------------------------------------------------------------------ *
 * Firestore ref factories (use these in feature code)
 * ------------------------------------------------------------------ */
export const refs = {
  userDoc: (uid) => doc(db, paths.userDoc(uid)),
  profileMain: (uid) => doc(db, paths.profileMain(uid)),
  friendsCol: (uid) => collection(db, paths.friendsCol(uid)),
  friendDoc: (uid, fid) => doc(db, paths.friendDoc(uid, fid)),
  studyDiaryCol: (uid) => collection(db, paths.studyDiaryCol(uid)),
  studyDiaryDoc: (uid, weekId) => doc(db, paths.studyDiaryDoc(uid, weekId)),
  customSeenCol: (uid) => collection(db, paths.customSeenCol(uid)),
  customSeenDoc: (uid, wordId) => doc(db, paths.customSeenDoc(uid, wordId)),
  weeklyPlansCol: (studentUid) => collection(db, paths.weeklyPlansCol(studentUid)),
  weeklyPlanDoc: (studentUid, planId) => doc(db, paths.weeklyPlanDoc(studentUid, planId)),
  sentPlansCol: (teacherUid) => collection(db, paths.sentPlansCol(teacherUid)),
  sentPlanDoc: (teacherUid, planId) => doc(db, paths.sentPlanDoc(teacherUid, planId)),

  customAppCol: () => collection(db, paths.customAppCol()),
  customAppUser: (uid) => doc(db, paths.customAppUser(uid)),
  teacherIndex: () => doc(db, paths.teacherIndex()),
  customVocabularyCol: () => collection(db, paths.customVocabularyCol()),
  customVocabularyDoc: (wordId) => doc(db, paths.customVocabularyDoc(wordId)),
  bookLogsCol: () => collection(db, paths.bookLogsCol()),
  bookLogDoc: (logId) => doc(db, paths.bookLogDoc(logId)),
  bookShelfCol: () => collection(db, paths.bookShelfCol()),
  bookShelfDoc: (bookId) => doc(db, paths.bookShelfDoc(bookId)),
  sharedApps: () => doc(db, paths.sharedApps()),

  chatDoc: (a, b) => doc(db, paths.chatDoc(pairId(a, b))),
  chatMessagesCol: (a, b) => collection(db, paths.chatMessagesCol(pairId(a, b))),
};
