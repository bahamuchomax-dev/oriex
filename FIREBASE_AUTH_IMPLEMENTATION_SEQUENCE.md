# Firebase Auth Implementation Sequence

- Status: **docs only. No code migration, no deploy, no rules change here.**
- Companion to `AUTH_RECOVERY_PLAN.md` (the incident finding + high-level plan)
  and the **gated** rules-hardening PR #21 (`noSecretFields()`,
  `DO NOT DEPLOY UNTIL FIREBASE AUTH MIGRATION IS COMPLETE`).
- Utilities already prepared and merged to `main` (no behaviour change):
  `src/features/auth/friendIdAuth.js` — `normalizeFriendId`,
  `validateFriendIdFormat`, `makeInternalAuthEmailFromFriendId`,
  `safeAuthErrorMessage`.

This document is the **concrete sequence** to replace the legacy client-side
plaintext Friend ID login with Firebase Auth, in safe, reviewable steps. It does
not restore or preserve plaintext-password auth, and it never re-opens
`users/{uid}/profile/main` to unauthenticated reads. Read `AUTH_RECOVERY_PLAN.md`
for *why*; this is the *how/when*.

## 0. Invariants that must hold at every step

- `users/{uid}/**` (incl. `profile/main`) stays **owner-only** (`isSelf(uid)`).
  Never publicly or `signedIn()`-wide readable.
- No document ever stores a password. Firebase Auth owns passwords.
- Friend ID (`shortId`) is a **public, non-secret** lookup/display identifier
  only — never a credential.
- No `allow read, write: if true`. Default-deny preserved.
- No password/token/credential/full-auth-user object is ever logged.
- `main`'s `firestore.rules` stays deployable; the `noSecretFields()` hardening
  (#21) is deployed **only after** the legacy plaintext writes are gone (§7).

## 1. Target architecture

- **Firebase Auth owns passwords.** Email/password provider, where the "email"
  is a deterministic internal address derived from the Friend ID
  (`makeInternalAuthEmailFromFriendId` → `<friendid>@friend-id.oriex.invalid`,
  a non-deliverable reserved `.invalid` domain). See §10 for the real-email
  alternative.
- **Friend ID = identifier/display only.** Stays in the public login directories
  (`public/data/customApp`, `public/data/teacherIndex`) with no password.
- **Firestore stores no password.** `profile/main` holds profile data only,
  owner-only.
- **Roles via custom claims** (`request.auth.token.teacher/admin`), set by a
  controlled server/admin process — never client-writable. See
  `TEACHER_CUSTOM_CLAIMS_PLAN.md`.
- **UI driven by `onAuthStateChanged`** (already the pattern in
  `src/features/auth/AuthProvider.jsx`).

## 2. Signup path (new users)

1. Validate the entered/desired Friend ID with `validateFriendIdFormat`
   (allocate a fresh unique `shortId` if not user-chosen).
2. `createUserWithEmailAndPassword(auth, makeInternalAuthEmailFromFriendId(id), password)`.
   The password goes to Firebase Auth only — never to Firestore.
3. After auth resolves, write `users/{uid}/profile/main` (owner-only) **without
   any password field**, and write the public directory entry
   (`customApp`/`teacherIndex`) with public fields only
   (`shortId, uid, name, avatar, color, …`).
4. `onAuthStateChanged` drives the UI to the logged-in state (no reload).

## 3. Login path (existing/after migration)

1. `normalizeFriendId` + `validateFriendIdFormat` the input.
2. Resolve to the internal email via `makeInternalAuthEmailFromFriendId` (no
   directory read needed for the email; the mapping is deterministic). A public
   directory lookup is still allowed for display/friend search.
3. `signInWithEmailAndPassword(auth, email, password)`.
4. `onAuthStateChanged(user)` → logged-in view. **No read of any other user's
   `profile/main`, and no client-side password comparison.**
5. On failure, show `safeAuthErrorMessage(err)` (no enumeration, no raw message).

## 4. Logout path

1. `signOut(auth)`.
2. Clear local/app state; `onAuthStateChanged(null)` → logged-out view (no
   reload). Never log the auth user object.

## 5. Existing-user migration

- Old plaintext passwords are **compromised** (world-readable during the
  allow-true window) and must not be reused or read.
- On first post-migration login, route existing users through **re-registration
  / forced password reset** (preferred: re-registration, since there is no
  trustworthy old secret to verify).
- Do **not** read the old `profile/main.password` to "verify" or "carry over"
  anything. After migration, the legacy `password` field is removed (§7).
- Keep the same `users/{uid}` data by mapping the legacy uid to the new Auth uid
  (§6) so study history/plans survive.

## 6. Data migration

- If the new Auth uid differs from the legacy uid, either (a) re-key
  `users/{legacyUid}/**` → `users/{newUid}/**`, or (b) keep a server-side
  `legacyUid → authUid` map. Prefer preserving the existing uid where the legacy
  identity can be reused.
- Re-keying/bulk reads of other users' docs require **Admin SDK / a Cloud
  Function** (server-side), not client code — clients cannot read across users
  under the owner-only rules (by design). Defer to a later, explicitly-approved
  server task. No client-side admin operations.

## 7. Cutover ordering (the critical sequence)

1. Ship the **app** with the new Firebase Auth login flow (legacy login disabled
   in the served app). App deploy first.
2. Confirm new signup/login/logout work and **no `password` field is written**
   anywhere (signup, profile-save, password-change, customApp card-sync).
3. Remove/blank legacy `profile/main.password` for migrated users (server task).
4. **Only then** merge + deploy **PR #21** (`noSecretFields()` rules hardening),
   after `npm run test:rules` (emulator) and the manual checklist in §8. Deploying
   #21 before step 2/3 would deny the legacy plaintext writes and break the app.

## 8. Manual test checklist (for the implementation PRs)

- New signup creates a real Firebase Auth user; **no password written to Firestore**.
- Login uses Firebase Auth; **no read of another user's `profile/main`**; no
  client-side password compare.
- `onAuthStateChanged(user)` → logged-in view **without reload**; `(null)` →
  logged-out.
- Logout calls `signOut`; `auth.currentUser` is null; no reload needed.
- Logged-out client **cannot read any `users/{uid}` doc** (incl. `profile/main`).
- Friend ID still resolves for friend search / leaderboard (public directories).
- PWA restart keeps the session (Auth persistence) and lands logged-in.
- Teacher/student flows work with custom claims; students cannot self-grant.
- **No permission-denied on allowed paths**; other users' private docs unreadable.
- No password/token/credential/auth-user object logged anywhere.

### 8a. Manual verification log

**2026-06-15 — opt-in modern shell (`?oriexModernAuth=1`) — PASS.** Covers PRs
#25/#26 (shell + sign-in state transition) and the in-review #27/#28 (invite-code
signup + signup error handling). Verified against project `genro-b74de` after
enabling the Email/Password provider in the Firebase Console:

- Firebase Console → Authentication → Sign-in method → **Email/Password enabled**
  (the prerequisite for `accounts:signUp`; a console setting, not a rules change).
- **Signup succeeded**; a Friend ID was **generated** (`KWFAQA`) and displayed
  (the user does not type one).
- **Logout succeeded.**
- **Re-login** with the generated Friend ID + the same password **succeeded**,
  and the UI transitioned to signed-in **without a reload**.
- `users/{uid}/profile/main` contained **only** `name`, `shortId`, `updatedAt` —
  **no `password` field present** (the security contract held end-to-end).
- **No deploy** was performed. `firestore.rules` unchanged. **#21 remains
  draft/blocked.**

Scope note: this validates the **new-account** flow only. Existing-user
migration (reset / re-registration) is unverified and is planned separately in
`EXISTING_USER_RESET_PLAN.md`.

## 9. Rollback

- Roll back the **app** to the previous version if the new flow misbehaves.
- **Never** roll back by loosening rules: do not re-open `profile/main` reads and
  do not restore `allow read, write: if true`. Rules and app roll back
  independently; the rules must never regress to expose `profile/main`.
- If #21 was already deployed and must be reverted, redeploy the prior
  (still-hardened, non-`noSecretFields`) ruleset — not an open one.

## 10. Open decisions (need a human call before implementation)

1. **Internal email vs real email.** Internal `…@friend-id.oriex.invalid`
   (deterministic, no email collection, but no email-based recovery) vs real
   email (enables recovery, but requires collecting/verifying email). Default
   recommendation: internal email + an admin-assisted reset for recovery.
2. **Cloud Functions / Admin SDK availability** for the re-key/reset and claims
   provisioning (Spark vs Blaze plan).
3. **Custom-claims process** (who/what sets teacher/admin; see
   `TEACHER_CUSTOM_CLAIMS_PLAN.md`).
4. **Existing-user reset UX** (forced reset vs re-registration; messaging that
   old passwords are invalid).

## Next concrete step

Open a small, reviewable **app-only** PR `feat/firebase-auth-login-flow` that
wires `signInWithEmailAndPassword` + `onAuthStateChanged` into the modern auth
screens using the merged `friendIdAuth.js` helpers — **behind a flag, with the
legacy bundle still the served app** — plus emulator/manual tests from §8. It
must write no password to Firestore and must not read other users' `profile/main`.
Do not touch `firestore.rules` (that is the gated #21) and do not deploy.
