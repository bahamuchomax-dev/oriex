# Plans (週計画)

Weekly plans teachers send to students.

- Storage: student side `users/{studentUid}/weeklyPlans/{planId}`, teacher history
  `users/{teacherUid}/sentPlans/{planId}`. `planId = {weekId}_{teacherUid}_{studentUid}`
  (stable — re-sending overwrites the week's plan).
- `planUtils.js` — `getNextWeekFriday(date)` (due date), `buildPlanId`, `planWeekId`,
  `computeOverall(items)`, `computeBookProgress(items)`, `clampPercent`, `newItemId`.
- `plansApi.js`
  - `sendPlan({teacher, student, items})` — writes both docs; dueDate = next-week Friday.
  - `subscribeMyPlans(studentUid, onChange)` — student subscribes to THEIR OWN
    weeklyPlans only (`onSnapshot`, no login-time global listeners).
  - `saveStudentProgress(plan, items)` — recomputes summaries, writes the student
    doc, mirrors summary to the teacher's sentPlans (non-fatal if rules block it).
  - `loadSentPlans(teacherUid)` — teacher history via `getDocs`.
- `TeacherPlans.jsx` — send form (students from friends, books from
  `loadBookOptions()` only) + history with overall & per-book progress.
- `StudentPlans.jsx` — live plans + per-item progress slider, save-button only.
- `index.jsx` — branches on `isTeacher`.

Progress is always recomputed from `items` on display, so stored summaries can be
absent/stale without breaking the UI.

**Status (stage 5):** implemented.
