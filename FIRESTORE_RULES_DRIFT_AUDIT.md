# Firestore Rules Drift Audit (Phase 4.5 → escalated to 4.6)

- Date: 2026-06-15
- Audited main commit: `09779a6`
- Branch: `fix-critical-firestore-rules`

## 🔴 CRITICAL: deployed Firestore Rules allow public read/write to ALL documents

The **deployed** Firestore Rules (provided by the maintainer from Firebase
Console / CLI) were:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

This grants **unrestricted public read and write to every document** — including
unauthenticated clients. Anyone could read or modify every student/teacher
profile, all study/plan/DM data, set `isTeacher`/admin markers, and read or alter
teacher answer documents. **This was the real production attack surface — NOT the
repository `firestore.rules`.**

Severity: CRITICAL, active, live data exposure + trivial privilege escalation.

## Repo vs deployed (drift)

- **Repository `firestore.rules`** (deployed source per `firebase.json`, but the
  console clearly had a different ruleset): strong for the migrated model
  (custom-claims roles, profile whitelist, answer-field bans, `teacherProblemAnswers`
  teacher/admin-only, default-deny). It does **not** cover the legacy collections
  the live app uses.
- **Deployed rules**: a single `allow read, write: if true` wildcard — i.e. the
  repo file was apparently never the effective production ruleset. Drift is total.

## Real attack surface (what the deployed rules actually permitted)

Every collection used by the app was world read/write, including but not limited to:
`profiles/**`, `users/{uid}/**` (records, bookLogs, deliveredProblems, profile/main,
friends, weeklyPlans, sentPlans, customSeen, studyDiary), `chats/{pairId}/messages`,
`public/data/**` (customApp, teacherIndex, customVocabulary, bookShelf, bookLogs,
teacherProblems), top-level `deliveredProblems`, `teacherProblemAnswers`,
`teacherAllowlist`. **Including teacher answers and authority fields.**

## Resolution path

- Phase 4.6 (this branch): replace the wildcard with explicit, least-privilege
  rules in the repo `firestore.rules` (proposal only — NOT deployed). See the PR
  "Fix critical Firestore authorization rules".
- The repo becomes the single source of truth; the wildcard is removed entirely.
- Deploy only after explicit maintainer confirmation and emulator verification
  (`npm run test:rules`) of the live flows.

## Teacher authorization / escalation under deployed rules

- Under `allow ... if true`, teacher/admin authority was effectively meaningless:
  any client could set any field (`isTeacher`, `role`, `teacherId`, …) on any doc.
  Confirmed privilege-escalation was trivially possible in production.
- The fix uses **custom claims** (`request.auth.token.teacher/admin`) for
  teacher/admin and forbids clients from setting authority fields.

## Deploy-prep corrections (post-merge follow-up)

Verifying the live write shapes against `src/features/books/booksApi.js` surfaced
two field/intent corrections to the proposed legacy rules (would have broken
features on deploy):

- `public/data/bookLogs`: owner field is **`uid`** (not `userId`) —
  `addBookLog` stamps `uid: user.uid`. Rule corrected to bind writes to
  `request.resource.data.uid == request.auth.uid`.
- `public/data/bookShelf`: books are added by **any signed-in user** (Books
  screen "追加" → `addBook`), stamping `ownerUid`. The first draft restricted
  writes to teacher/admin, which would have blocked normal "add book". Rule
  corrected to **owner-bound** (`ownerUid == request.auth.uid`); owner/admin
  update/delete.

Still REQUIRES CONFIRMATION via emulator (`npm run test:rules`, needs Java) +
manual app testing before deploy:

- `sentPlans` student progress update is not yet field-whitelisted to
  progress/status-only.
- `teacherIndex` / `sharedApps` remain default-deny (odd-segment TODO paths);
  manually test any feature that might use them.
- Teacher/admin **custom claims must actually be provisioned** in production. The
  hardened rules grant teacher/admin via `request.auth.token.teacher/admin`. If
  the live app never set these claims (e.g. relied on a client `isTeacher`), then
  teacher flows (plan send, vocabulary/bookShelf management) will be denied after
  deploy. Confirm claims are set BEFORE deploying.

## Storage rules

- Not provided at audit time → **not audited**. If Firebase Storage is used
  (the legacy bundle references it), the deployed Storage rules must be audited
  separately (a similar `allow ... if true` would be equally critical).
- Update: Console shows Storage **not enabled** on the Spark plan; see
  `STORAGE_RULES_AUDIT.md` (PR #10) for the recorded status.

## Production deploy record

Two Firestore Rules deployments have replaced the original
`allow read, write: if true` wildcard. **Production is no longer publicly
readable/writable.**

### Deploy 1 — critical fix (least-privilege + default-deny)

- Project: `genro-b74de`
- Deployed commit: `6fd833a`
- Command: `firebase.cmd deploy --only firestore:rules --project genro-b74de`
- Result: Deploy complete; Console showed the hardened ruleset.
- (Also recorded in `DEPLOYED_FIRESTORE_RULES_NOTE.md`, PR #8 — pending merge.)

### Deploy 2 — tightened plan progress updates (PR #9)

- Project: `genro-b74de`
- Local main commit: `17d36b7` ("Tighten plan progress update rules")
- Command: `firebase.cmd deploy --only firestore:rules --project genro-b74de`
- git: fast-forward to `17d36b7`
- Dry-run: **success**
- Deploy: **complete** — `firestore.rules` released to `cloud.firestore`
- Effect: students may now update only progress fields
  (`items` / `overallProgress` / `bookProgress` / `updatedAt`) on
  `weeklyPlans` / `sentPlans`; they cannot create plans or edit teacher content /
  ownership / authority / answer fields.

### Remaining risks (current)

- **Storage Rules**: Storage not enabled / not audited — recorded in
  `STORAGE_RULES_AUDIT.md` (PR #10).
- **Custom claims**: teacher/admin claims provisioning not confirmed — documented
  in `TEACHER_CUSTOM_CLAIMS_PLAN.md` (PR #7). If teachers lack claims, teacher
  flows are denied by the deployed rules.
- **`npm run test:rules`**: not run (Java 11+ not installed); only static tests
  (450 passing) validated the rules.
- **`chats/{pairId}` parent doc write**: currently allowed for either participant;
  tighten to the fields actually used (or deny parent writes) if needed.
- **`public/data/bookLogs` read**: signed-in users can read all book logs
  (incl. `uid`/`memo`); confirm the intended public scope.
