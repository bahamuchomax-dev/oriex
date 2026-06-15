# Data Privacy & Authorization Audit (Phase 4)

- Audit date: 2026-06-15
- Audited commit (main): `8f2b3b7`
- Branch: `security-data-privacy-authorization-audit`
- Method: static audit of repo only. **Deployed Firestore/Storage rules were not
  available**; items that depend on the live config are marked **MUST-VERIFY**.
- No rules or runtime source were changed in this phase (changing rules that are
  not the deployed source could break the app or rest on wrong assumptions).

## ⚠️ Top finding: two data models; deployed rules for the legacy model are not in this repo

The codebase has **two Firestore data models**:

1. **Migrated model** — `src/services/repository/*` + `src/services/repository/paths.js`.
   Governed by `firestore.rules` (the file `firebase.json` deploys). **Strong**:
   - roles from **server-set custom claims** (`request.auth.token.teacher/admin`),
     never client fields;
   - `profiles/{uid}` self-update is whitelisted — a student cannot set
     `role/isTeacher/teacherId/admin` or add unknown fields;
   - `noAnswerFields()` blocks `answer/correctAnswer/explanation/solution/answerKey/answers`
     on student-visible docs;
   - `teacherProblemAnswers` readable only by the owning teacher or admin;
     students can **never** read answers;
   - default-deny on everything else.

2. **Legacy model** — `src/firebase/firestorePaths.js`, used by `src/features/dm`,
   `plans`, `vocabulary`, `profile`, and the legacy bundle. Collections:
   `chats/{pairId}/messages` (DM), `users/{uid}/friends`, `users/{uid}/studyDiary`,
   `users/{uid}/customSeen`, `users/{uid}/weeklyPlans`, `users/{uid}/sentPlans`,
   `public/data/{customApp,customVocabulary,bookLogs,bookShelf,sharedApps}`,
   and **`users/{uid}/profile/main`**.

**`firestore.rules` does not cover any legacy-model collection.** Its default-deny
would block them — yet the app uses them. Therefore the rules actually deployed
for the legacy collections are **not in this repo** (drift), and their security
**cannot be audited from the repo**. (Confirmed unknown by the maintainer at
audit time.)

### Potential privilege-escalation (MUST-VERIFY, not confirmed)

`src/features/profile/profileApi.js` writes an **`isTeacher` field into
`users/{uid}/profile/main`** (a client-written doc; default `false`). The
migrated model ignores such fields (uses claims) — safe. **But if the live/legacy
app or its deployed rules trust a client-written `isTeacher`/`role` for teacher
UI or data access, a student could self-escalate.** This cannot be confirmed or
refuted from the repo. **Verify deployed rules + how the live app determines
teacher authority (must be custom-claims-only).**

## A. Cross-user Firestore access (migrated model)

| Collection | Read | Write | Owner field | Teacher | Admin |
| --- | --- | --- | --- | --- | --- |
| profiles/{u} | self / admin / assigned teacher | self (whitelist) / admin | path uid | assigned only | yes |
| users/{u}/records | self / admin / teaches(u) | self (whitelist, userId==uid) | userId | assigned read | yes |
| users/{u}/bookLogs | self / admin / teaches(u) | self (whitelist, userId==uid) | userId | assigned read | yes |
| users/{u}/deliveredProblems | self / admin / teaches(u) | admin or assigned teacher; no answers | userId | assigned write | yes |
| public/data/teacherProblems | any signed-in | teacher(own teacherId)/admin; no answers | teacherId | own write | yes |
| deliveredProblems (top) | teacher/admin | teacher(own)/admin; no answers | teacherId | own write | yes |
| teacherProblemAnswers | owning teacher / admin only | owning teacher / admin | teacherId | own only | yes |
| teacherAllowlist | self get / admin | admin only | path uid | — | yes |
| (everything else) | DENY | DENY | — | — | — |

Frontend filtering is **not** relied on for the migrated model — rules enforce it.

## B. Authority field protection

- Migrated model: students **cannot** write `role/isTeacher/teacherId/admin`
  (profiles whitelist). Frontend `profile.isTeacher` is **display-only** (badge);
  `src/features/profile/Profile.jsx` states role/isTeacher are never written there.
- **MUST-VERIFY (legacy):** `users/{uid}/profile/main.isTeacher` is client-written;
  confirm deployed rules forbid students setting it AND that authority is decided
  by claims only.

## C. Answer leakage

- Migrated model: `noAnswerFields()` blocks answer/solution fields on all
  student-visible problem docs; teacher answers live in a separate
  `teacherProblemAnswers` collection that students can never read; admin is **not**
  exempt from the answer-field ban on student-visible docs.
- MUST-VERIFY: legacy `public/data/*` problem/vocab docs are not covered by repo
  rules — confirm they carry no answer/solution fields and their deployed rules.

## D. Local storage audit (`localStorage` / IndexedDB)

- IndexedDB: avatar / home-room photos (`src/services/avatarStorage.js`,
  `src/features/home/homePhotoStorage.js`) — **images, local only**, not uploaded.
- `localStorage`: per-`uid` keys holding vocab review state / settings / items as
  JSON (e.g. `src/features/vocabulary/localReviewStore.js`,
  `localUserVocabStore.js`). Study content only.
- **No prompt text, no generated/AI text, no teacher answers, no teacher private
  notes** are stored in browser storage.
- MUST-VERIFY: logout/account-switch cleanup of per-uid keys and IndexedDB stores
  (keys are uid-scoped; confirm they are cleared or isolated on sign-out).

## E. PWA / cache

- `public/sw.js` is registered in production only, after `load`, once
  (`src/main.js`). MUST-VERIFY: confirm `sw.js` caches only static app assets and
  does **not** cache authenticated Firestore responses, answers, or generated
  text; document hard-refresh/update behavior.

## F. Exposed file scan (clean)

- No `.csv` / `.xlsx` / `.bak` / `.zip` data exports in the repo.
- No `.env` (only `.env.example`); no model weight files; no API keys; no
  service-account / private-key material (`npm run security:scan` = FAIL 0).

## Remaining risks (priority)

1. **HIGH / MUST-VERIFY:** Deployed Firestore rules for the legacy collections are
   not in this repo; export and audit them. Confirm no student can read another
   student's private data (DM, friends, plans) and that DM `chats/{pairId}` is
   restricted to the two participants.
2. **HIGH / MUST-VERIFY:** Confirm teacher/admin authority is decided by custom
   claims only; ensure no code/rule trusts a client-written `isTeacher`/`role`
   (`users/{uid}/profile/main`).
3. **MEDIUM:** No `storage.rules` in the repo though Firebase Storage is used by
   the legacy bundle — version-control and audit the deployed Storage rules.
4. **MEDIUM:** Bring legacy collections under version-controlled `firestore.rules`
   (single source of truth) so future audits are repo-complete.
5. **LOW:** Confirm browser-storage cleanup on logout; confirm `sw.js` cache scope.

## Manual production checklist

- [ ] Export the **deployed** `firestore.rules` and diff against this repo; bring
      legacy collections under version control.
- [ ] Verify DM (`chats/{pairId}/messages`) is readable/writable only by the two
      participants; friends/plans/studyDiary readable only by owner (+ assigned
      teacher where intended).
- [ ] Verify teacher/admin = custom claims only; no trust of client `isTeacher`.
- [ ] Export & audit deployed **Storage** rules; restrict to owner paths.
- [ ] Confirm `sw.js` caches only static assets (no private/authed responses).
- [ ] Confirm browser-storage (localStorage/IndexedDB) is cleared on sign-out.
- [ ] Re-run `npm run security:scan`, `npm run build`, `npm run test`,
      `npm run test:rules` (emulator) before release.
