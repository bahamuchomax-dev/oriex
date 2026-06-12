import {
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";
import {
  buildPlanId,
  planWeekId,
  getNextWeekFriday,
  computeOverall,
  computeBookProgress,
} from "./planUtils.js";

/**
 * Teacher sends a weekly plan to a student.
 * Writes 2 docs: the student's weeklyPlans/{planId} and the teacher's
 * sentPlans/{planId} (same content). planId is stable for (week, teacher, student),
 * so re-sending overwrites that week's plan rather than duplicating.
 */
export async function sendPlan({ teacher, student, items, date = new Date() }) {
  const weekId = planWeekId(date);
  const planId = buildPlanId(weekId, teacher.uid, student.uid);
  const dueDate = getNextWeekFriday(date);

  const cleanItems = items.map((it) => ({
    itemId: it.itemId,
    bookId: it.bookId ?? null,
    bookTitle: it.bookTitle ?? "",
    subject: it.subject ?? "",
    level: it.level ?? "",
    taskText: it.taskText ?? "",
    target: it.target ?? "",
    progressPercent: 0,
  }));

  const plan = {
    planId,
    weekId,
    teacherUid: teacher.uid,
    teacherName: teacher.name ?? "",
    studentUid: student.uid,
    studentName: student.name ?? "",
    dueDate,
    status: "active",
    items: cleanItems,
    overallProgress: computeOverall(cleanItems),
    bookProgress: computeBookProgress(cleanItems),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(refs.weeklyPlanDoc(student.uid, planId), plan, { merge: true });
  await setDoc(refs.sentPlanDoc(teacher.uid, planId), plan, { merge: true });
  return planId;
}

/**
 * Student subscribes to THEIR OWN weeklyPlans only (scoped to their subcollection).
 * No login-time global listeners; never reads other students' plans.
 * @returns unsubscribe()
 */
export function subscribeMyPlans(studentUid, onChange, onError) {
  const q = query(
    refs.weeklyPlansCol(studentUid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

/**
 * Student saves progress for one plan. Recomputes overall + per-book summaries
 * and writes the student's plan doc. Also mirrors the progress summary to the
 * teacher's sentPlans/{planId} so the teacher sees up-to-date numbers.
 *
 * Save-only (call on the save button, not per slider move). Stamps updatedAt.
 * Writes: 2 (student doc + teacher mirror).
 */
export async function saveStudentProgress(plan, updatedItems) {
  const overallProgress = computeOverall(updatedItems);
  const bookProgress = computeBookProgress(updatedItems);

  await setDoc(
    refs.weeklyPlanDoc(plan.studentUid, plan.planId),
    { items: updatedItems, overallProgress, bookProgress, updatedAt: serverTimestamp() },
    { merge: true }
  );

  // Mirror to the teacher's history. If security rules forbid this cross-user
  // write, it will fail silently here — the student's own doc is still the source
  // of truth and the teacher view recomputes from items anyway.
  try {
    await setDoc(
      refs.sentPlanDoc(plan.teacherUid, plan.planId),
      { items: updatedItems, overallProgress, bookProgress, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("sentPlans mirror failed (non-fatal)", e);
  }

  return { overallProgress, bookProgress };
}

/**
 * Teacher loads their sent-plan history. getDocs only (no realtime required).
 */
export async function loadSentPlans(teacherUid) {
  const q = query(refs.sentPlansCol(teacherUid), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
