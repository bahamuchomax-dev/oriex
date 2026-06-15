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

## Storage rules

- Not provided at audit time → **not audited**. If Firebase Storage is used
  (the legacy bundle references it), the deployed Storage rules must be audited
  separately (a similar `allow ... if true` would be equally critical).
