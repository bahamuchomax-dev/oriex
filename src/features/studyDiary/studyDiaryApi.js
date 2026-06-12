import { getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

// Editable fields for a week of study diary. Keeping the shape here makes the
// form and the save path agree.
export const EMPTY_WEEK = {
  goal: "",        // 今週の目標
  plan: "",        // 計画
  actual: "",      // 実績
  studyTime: "",   // 勉強時間
  achievement: "", // 達成度
  reflection: "",  // 振り返り
  coachComment: "",// コーチコメント
  days: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" }, // 曜日別メモ
};

/**
 * Read ONE week's document. Reads: 1 (getDoc). Returns { data, exists }; data is
 * EMPTY_WEEK merged with any stored fields so the form always has a full shape.
 * Does NOT create a doc.
 */
export async function loadWeek(uid, weekId) {
  const snap = await getDoc(refs.studyDiaryDoc(uid, weekId));
  if (!snap.exists()) {
    return { exists: false, data: { ...EMPTY_WEEK, days: { ...EMPTY_WEEK.days } } };
  }
  const d = snap.data();
  return {
    exists: true,
    data: { ...EMPTY_WEEK, ...d, days: { ...EMPTY_WEEK.days, ...(d.days || {}) } },
  };
}

/**
 * Save a week. Only call on an explicit save (never per keystroke).
 * Writes: 1 (setDoc merge). Stamps updatedAt always, createdAt only the first time.
 */
export async function saveWeek(uid, weekId, data, isNew) {
  const payload = {
    ...data,
    uid,
    weekId,
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  await setDoc(refs.studyDiaryDoc(uid, weekId), payload, { merge: true });
}
