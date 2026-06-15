# Auth / Login Notes

Context for the email/password login regression after the Firestore Rules
hardening + deploy (project `genro-b74de`).

## 1. UI did not transition to logged-in state without a reload

- Cause: the deployed **legacy bundle** writes a per-user friend/username index
  entry to `artifacts/{appId}/public/data/teacherIndex/{uid}` during the
  signup/profile bootstrap (doc id = the user's uid; fields
  `{shortId, uid, name, avatar, color}`; later queried by `shortId`).
- PR #15 restored the live `artifacts/{appId}/...` tree but denied all
  `public/data` writes except the user's own `customApp` card. That denied the
  legitimate `teacherIndex/{uid}` self-write, so the post-login bootstrap promise
  rejected and the UI never transitioned. Reloading worked because the existing
  profile loads via the (allowed) read path.
- Fix (rules-only, least-privilege): allow each user to write **their own**
  `teacherIndex/{uid}` entry (`isSelf(docId)`), with `noAuthorityFields()` +
  `noAnswerFields()` so it grants no teacher/admin rights and carries no answers.
- The login UI itself lives in the **frozen legacy bundle** (not edited here). If
  the no-reload transition still fails after deploying this rules change, the
  remaining issue is a legacy-bundle re-render bug; the durable fix is to migrate
  login onto the modern `src/features/auth/AuthProvider.jsx` (which drives state
  from `onAuthStateChanged`). That is a separate, larger effort.

## 1b. Friend ID re-login still failed (customApp is the PRIMARY directory)

- Friend ID login resolves the ID to a uid by querying, **while unauthenticated**:
  1. `artifacts/{appId}/public/data/customApp` `where("shortId","==", id)` — **primary**, then
  2. `artifacts/{appId}/public/data/teacherIndex` `where("shortId","==", id)` — fallback.
- PR #17 made only `teacherIndex` public, so the **primary `customApp` query was
  still denied** (signed-in read) and re-login failed before reaching the fallback.
- Fix: make `customApp` read public too (`allow read: if true`), same scoped
  tradeoff as teacherIndex. Write stays owner-only (`isSelf(cardUid)`).
- Now exactly TWO collections are public-read (the Friend ID login directories:
  `customApp`, `teacherIndex`). All other `public/data` stays signed-in read;
  `users/{uid}/**` stays owner-only; default-deny preserved.

## 1c. Account deletion / 退会 failure

- The legacy bundle surfaces `requires-recent-login` (Firebase Auth). Deleting an
  Auth user requires a recent sign-in; if the session is old, `deleteUser()`
  throws `auth/requires-recent-login`.
- **This is an Auth requirement, not a Firestore rules problem** and cannot be
  fixed in rules or without editing the frozen legacy bundle. Mitigation: the user
  must re-login immediately before deleting (re-authentication), or a re-auth flow
  must be added in a future modern-auth migration.
- The Firestore-side cleanup IS permitted: a user may delete their own
  `users/{uid}/**`, `customApp/{uid}`, and `teacherIndex/{uid}` (owner-only).
  Cross-user friend-mirror cleanup (`users/{otherUid}/friends/{myUid}`) remains
  denied by design (no cross-user writes); that is a separate, non-blocking item.

## 2. OAuth "authorized domain" console warning

Console warning:

> The current domain is not authorized for OAuth operations. Add
> bahamuchomax-dev.github.io to Firebase Authentication Authorized domains.

- This is a **Firebase Console configuration item, not a code bug**.
- Fix in the console:
  **Authentication → Settings → Authorized domains → Add domain →
  `bahamuchomax-dev.github.io`**.
- Do NOT attempt to fix this in code (no secrets, no `.env`, no Firebase config
  changes in the repo). It mainly affects OAuth/popup providers; email/password
  basic login does not depend on it.

## Deploy

The rules change in this PR is **not deployed** by merging. After review, deploy
with:

```
firebase deploy --only firestore:rules --project genro-b74de
```

Then verify: signup and login transition to the logged-in state **without a
reload**, and a user can only write their own `teacherIndex/{uid}` entry.
