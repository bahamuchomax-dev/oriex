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

const STUDENT_PLAN_LIMIT = 20;
const STUDENT_PLAN_PREVIEW_LIMIT = 6;
const SENT_PLAN_LIMIT = 25;
const PLAN_CACHE_MS = 5 * 60_000;

const planCache = new Map(); // key -> { at, plans }

function fresh(entry) {
  return entry && Date.now() - entry.at < PLAN_CACHE_MS;
}

function cacheKey(kind, uid, n) {
  return `${kind}:${uid}:${n}`;
}

async function fetchPlans(colRef, n) {
  const q = query(colRef, orderBy("createdAt", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

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
    limit(STUDENT_PLAN_LIMIT)
  );
  return onSnapshot(
    q,
    (snap) => {
      const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      planCache.set(cacheKey("student", studentUid, STUDENT_PLAN_LIMIT), {
        at: Date.now(),
        plans,
      });
      onChange(plans);
    },
    (err) => onError?.(err)
  );
}

/**
 * One-shot student plan read for previews (home card, badges).
 * This avoids keeping a realtime listener open on the home screen.
 */
export async function loadMyPlans(studentUid, max = STUDENT_PLAN_PREVIEW_LIMIT, force = false) {
  if (!studentUid) return [];
  const key = cacheKey("student", studentUid, max);
  const hit = planCache.get(key);
  if (!force && fresh(hit)) return hit.plans;
  const plans = await fetchPlans(refs.weeklyPlansCol(studentUid), max);
  planCache.set(key, { at: Date.now(), plans });
  return plans;
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

  for (const key of planCache.keys()) {
    if (key.startsWith(`student:${plan.studentUid}:`)) planCache.delete(key);
    if (key.startsWith(`sent:${plan.teacherUid}:`)) planCache.delete(key);
  }

  return { overallProgress, bookProgress };
}

/**
 * Teacher loads their sent-plan history. getDocs only (no realtime required).
 */
export async function loadSentPlans(teacherUid) {
  if (!teacherUid) return [];
  const key = cacheKey("sent", teacherUid, SENT_PLAN_LIMIT);
  const hit = planCache.get(key);
  if (fresh(hit)) return hit.plans;
  const plans = await fetchPlans(refs.sentPlansCol(teacherUid), SENT_PLAN_LIMIT);
  planCache.set(key, { at: Date.now(), plans });
  return plans;
}
