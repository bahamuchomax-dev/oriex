# Rebuild plan

Suggested order for re-implementing features in `src/`. Each step should land as
a working slice (read path → render → write path) before moving on. The order
front-loads foundations (auth, navigation) and the things other features depend
on (books before timer/plans), and leaves cross-cutting concerns (XP) and
polish-heavy work (profile UI unification, factory) for later.

1. **Firebase Auth / profile read** — `features/auth`, then `features/profile`
   read path. Get a real `uid` flowing and `profile/main` rendering.
2. **Home / bottom nav** — flesh out `App.jsx` home + expand the nav toward the
   full screen list (`docs/screens.md`).
3. **Friends / DM** — `features/friends` (with the deleted-user skip fix) and
   `features/dm`. Confirm the `pairId` format against existing chats first.
4. **studyDiary** — `features/studyDiary` CRUD over `users/{uid}/studyDiary`.
5. **plans** — `features/plans`: teacher send + student view, next-Friday due
   date, single-doc `onSnapshot`, per-student progress %. Depends on books (8).
6. **vocabulary (review / userVocab / wordbook)** — wire the local stores into
   the study UI. No Firestore for review/userVocab.
7. **customVocabulary** — shared set + `customSeen`; keep `seenBy` write-back out.
8. **books / timer** — `features/books` first (source of truth), then
   `features/timer` (book pick on start + record write) and the per-book timer in
   the books "記録を追加" flow.
9. **hamsterRoom** — port the three.js engine from `legacy-dist`, add the
   confirmation dialog + tutorial + naming + grooming.
10. **profile UI unification** — single profile card; edit-only-via-edit-screen;
    remove my-page top-right settings; reduce palette; fix bg apply/persist/
    visible-to-others.
11. **XP management** — implement as a single source of truth once the earning
    surfaces (word study, review, teacher problems, study records) exist; ensure
    no double-counting, correct persistence, and consistency across profile /
    customApp / ranking; minimize Firestore writes.
12. **Factory** — the FACTORY workflow UI, with improved content contrast.

### Cross-cutting cleanups to fold in as you go
- Records tab borders (subtle) — step 2/8.
- Contrast fixes (先生からの問題, オリジナル問題, FACTORY content) — steps 5/12.
- Footer version string — set when a real release is cut, not before.

### Reminders (constraints that must survive the rebuild)
- review / userVocab stay in localStorage.
- `customVocabulary` `seenBy` write-back stays removed.
- Don't break friend DM when cleaning up the friend list.
- Keep Firestore reads/writes lean (narrow listeners, batch related writes).
