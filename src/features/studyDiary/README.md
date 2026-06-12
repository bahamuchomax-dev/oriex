# Study Diary

Per-week study records at `users/{uid}/studyDiary/{weekId}` (e.g. `2026-W24`).

- `weekId.js` — ISO-week helpers: `weekIdFromDate`, `mondayOf`, `shiftWeeks`,
  `weekRangeLabel`, `currentWeekId`.
- `studyDiaryApi.js`
  - `loadWeek(uid, weekId)` → `{ data, exists }` via a single `getDoc` (no
    full-collection reads, no realtime).
  - `saveWeek(uid, weekId, data, isNew)` → one `setDoc(..., {merge:true})`,
    stamping `updatedAt`/`uid`/`weekId` always and `createdAt` only when new.
- `index.jsx` — `StudyDiary`: week switcher (前週/次週/今週), the input fields
  (目標/計画/実績/勉強時間/達成度/振り返り/コーチコメント/曜日別メモ), a
  save-status indicator, and **save-button-only** persistence (no per-keystroke
  writes).

**Status (stage 3):** implemented.
