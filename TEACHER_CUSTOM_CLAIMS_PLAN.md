# Teacher / Admin Custom Claims Provisioning Plan

- Date: 2026-06-15
- Status: documentation only. No code, no rules, no deploy.
- Related: FIRESTORE_RULES_DRIFT_AUDIT.md, DATA_PRIVACY_AUDIT.md.

## Why custom claims are required (deploy blocker)

The hardened Firestore Rules (repo `firestore.rules`, pending deploy) authorize
teacher/admin **only** via server-set custom claims:

- `request.auth.token.teacher == true`
- `request.auth.token.admin == true`

But the **client UI** derives the teacher flag from the **profile document**, not
from claims. In `src/services/firebase/authz.js`:

```
isTeacher(profile) === (profile.isTeacher === true
                        || profile.role === "teacher"
                        || profile.role === "admin")
```

This is used for **display / routing only** (e.g. `TeacherHub`, `Plans`,
`TeacherProblems`, the "先生" badge in profile/home/settings). It is **not** an
authorization decision.

### The mismatch / risk

A user whose **profile** says `isTeacher: true` (or `role: "teacher"`) will see the
teacher UI, but their Firestore **writes** (and teacher-scoped reads) are governed
by the **claims**. After the hardened rules are deployed:

- If that teacher **has** the custom claim → teacher flows work.
- If that teacher **lacks** the custom claim → teacher Firestore operations are
  **DENIED**, even though the UI shows teacher controls.

So custom claims for every real teacher/admin **must be provisioned before (or at
the same time as) the rules deploy**, or teacher features break in production.

## Why `profile/main.isTeacher` / `role` must NOT be trusted for authorization

- These fields live in client-writable documents. Under the old deployed
  `allow read, write: if true`, any user could set `isTeacher: true` on their own
  profile and self-promote. Trusting them for authorization = trivial privilege
  escalation.
- The hardened rules therefore ignore them and use server-set claims only. The
  rules also forbid clients from changing authority fields
  (`profiles` whitelist; `users/{uid}/profile/main` authority-field lockdown).
- `profile.isTeacher` may remain for **UI display/routing**, but it is advisory
  only. Keeping the UI flag in sync with the claim is a nice-to-have, not a
  security control.

## Required claims

| Claim | Value | Grants |
| --- | --- | --- |
| `teacher` | `true` | teacher Firestore operations (plan send, etc.) |
| `admin` | `true` | admin operations (superset; also satisfies teacher checks) |

## Features that break if claims are NOT set (post-deploy)

- Teacher sending weekly plans (`users/{student}/weeklyPlans`, `users/{teacher}/sentPlans`).
- Managing shared `public/data/customVocabulary` and `public/data/bookShelf`.
- Reading assigned students' data (records, bookLogs, deliveredProblems, studyDiary)
  via `teaches()`.
- Creating/reading `teacherProblems` / `deliveredProblems` / `teacherProblemAnswers`.

Students are unaffected (own data + participant DM + read-only shared catalogs).

## How to provision claims (outside this repo)

Custom claims are set with the Firebase **Admin SDK** (server side). The Firebase
Console has **no UI** to set arbitrary custom claims directly, so this requires an
Admin-SDK script, a Cloud Function (admin-gated), or `gcloud`/Identity Platform.

- Do **NOT** commit a service account key / `.env` / Admin credentials to this repo.
- Run any provisioning script in a trusted environment (local with ADC, or a
  deployed admin-gated Cloud Function), not from client code.

Reference (Admin SDK, run in a trusted env — illustrative, do not commit creds):

```
// admin.auth().setCustomUserClaims(uid, { teacher: true })
// admin.auth().setCustomUserClaims(uid, { admin: true })
```

Token propagation: after a claim change the user's **existing ID token does not
update automatically**. The user must **sign out and back in**, or the client must
force-refresh the token (`getIdToken(true)` / `getIdTokenResult(true)`) before the
new claim is honored by Rules.

## Pre-deploy checklist

- [ ] Identify all real teacher/admin accounts (uids).
- [ ] Confirm a provisioning path exists (Admin SDK script / Cloud Function) with
      credentials kept OUT of the repo.
- [ ] Set `teacher: true` (and `admin: true` where applicable) for those uids.
- [ ] On a **teacher test account**, verify `getIdTokenResult()` shows the claim
      after re-login.
- [ ] Decide rollout order: set claims first, then deploy rules (safer), so
      teachers are not locked out between deploy and provisioning.

## Post-deploy checklist

- [ ] Teacher test account: send a weekly plan → succeeds.
- [ ] Teacher test account: manage customVocabulary / bookShelf → succeeds.
- [ ] Teacher reads an assigned student's records → succeeds; a non-assigned
      teacher is denied.
- [ ] Student account: teacher UI not shown / teacher writes denied.
- [ ] Student cannot self-promote (`profile.isTeacher = true` does not grant
      teacher Firestore access).
- [ ] If a teacher reports "permission denied", verify their claim + that they
      re-logged in (token refresh).

## Notes

- This document changes nothing in code, rules, or deployment.
- The repo currently contains **no** claims-provisioning script/function and no
  Admin credentials; provisioning is a manual/server step performed outside this
  repository.
