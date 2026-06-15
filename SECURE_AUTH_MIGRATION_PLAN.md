# Secure Auth Migration Plan

Status: planning + guardrails (no deploy, no rules change, no legacy rewrite).
Audited commit: main at the time of this PR. No real passwords/profiles are
reproduced here.

## 1. Current unsafe design (as found)

The legacy "Friend ID" login (in the frozen `src/legacy/oriex-app.bundle.js`) is a
**custom, client-side, plaintext-password** scheme — it does **not** use Firebase
Auth for the Friend ID path:

1. The user enters a **Friend ID** (`shortId`, e.g. `2N7422`) + password.
2. The app resolves Friend ID → uid by querying, while **unauthenticated**:
   - `artifacts/{appId}/public/data/customApp` `where("shortId","==", id)` (primary), then
   - `artifacts/{appId}/public/data/teacherIndex` `where("shortId","==", id)` (fallback).
3. It then reads the **target user's** `artifacts/{appId}/users/{uid}/profile/main`
   and compares `profile/main.password` to the entered password **client-side**.
4. On match it sets local app state and persists the profile locally — there is
   **no `signInWithPassword` / Firebase Auth session** for this path.

(Confirmed by inspecting the bundle: app-level `onAuthStateChanged` is not used to
gate the view; the `profile/main` doc carries a `password` field; "logged in" is
local state, which is why a page reload restores it from cache.)

## 2. Why it is dangerous

- **Plaintext passwords stored in Firestore** (`users/{uid}/profile/main.password`).
- Login requires **reading another user's `profile/main`** before auth — so any
  rule that permits that read exposes **everyone's password**.
- During the previous deployed `allow read, write: if true` period, these
  plaintext passwords were **world-readable** → treat all existing passwords as
  **potentially compromised**.
- "Login" is local state, not a real session → weak session integrity.

## 3. Why a rules rollback is forbidden

Restoring login by allowing unauthenticated (or broad) read of
`users/{uid}/profile/main` would **re-publish every user's plaintext password and
private profile**. Firestore rules cannot return a field subset, so "allow the
login to read the doc" == "expose the password field". The app being temporarily
unable to log in is **far less severe** than world-readable passwords. Therefore:
**do not** revert to `allow true`, **do not** open `users/{uid}` reads.

## 4. Recommended Firebase Auth migration route

Adopt **real Firebase Auth (email/password)** and stop reading passwords from
Firestore (Option A below), combined with **re-registration / password reset** for
existing users (Option C), because the old plaintext passwords are compromised.

- Friend ID becomes a **public lookup/display identifier only** (it already lives
  in the public `customApp`/`teacherIndex` directories).
- Password handling moves entirely to Firebase Auth. `profile/main.password` is
  **removed/ignored** after migration.
- `users/{uid}/profile/main` stays **owner-only** (`isSelf(uid)`).

## 5. Existing-user handling

- Existing accounts cannot keep using the compromised plaintext password.
- On first login after migration, route existing users through **password reset /
  re-registration** that creates a real Firebase Auth credential.
- Map the existing uid to the new Auth user (keep the same `users/{uid}` data) so
  history/profile is preserved.

## 6. Password reset / re-registration approach

- Prefer **re-registration** (Option C) since old passwords are compromised:
  - user proves ownership of their Friend ID (e.g., via a recovery email if one
    exists, or admin-assisted reset), then sets a new password via Firebase Auth.
- Never reuse the old `profile/main.password`. After a user migrates, blank/remove
  that field for their own doc (owner write) and stop relying on it.

## 7. Friend ID role after migration

- Friend ID (`shortId`) = **public, non-secret** lookup/display id (friend search,
  leaderboard). It is NOT a credential.
- It may remain publicly readable in `customApp`/`teacherIndex` (no password, no
  authority, no answer fields there).

## 8. Firestore Rules policy (target)

- `users/{uid}/**` → owner-only (`isSelf(uid)`). **Never** publicly/`signedIn`-wide
  readable; **never** carries a usable password.
- `public/data/customApp` & `teacherIndex` → public read (login/friend directory),
  owner-only write, **no authority/answer fields** (tighten `customApp` write to
  add `noAuthorityFields()`/`noAnswerFields()` like `teacherIndex` — small follow-up).
- Everything else → `signedIn()` read where needed, writes owner/role-scoped,
  default-deny. No `allow true`, no broad authenticated write.

## 9. Implementation phases

1. **(this PR)** Plan + guardrail tests + safe auth utilities (no behavior change).
2. **Implement Firebase Auth Friend ID login shell** (next PR): real
   `createUserWithEmailAndPassword`/`signInWithEmailAndPassword` keyed off
   `makeInternalAuthEmailFromFriendId`, driven by `onAuthStateChanged`; stop
   reading `profile/main.password`. Keep legacy data migration separate.
3. **Existing-user re-registration / reset flow.**
4. **Remove/ignore `profile/main.password`** and tighten rules
   (`customApp` write field-guards).
5. **Decommission the legacy plaintext login path.**

## 10. Manual test checklist (for the implementation PRs)

- New signup creates a real Firebase Auth user; no password is written to Firestore.
- Login uses Firebase Auth; no read of another user's `profile/main`.
- `onAuthStateChanged(user)` → logged-in view without reload; `(null)` → logged-out.
- Logout calls `signOut(auth)`; `auth.currentUser` becomes null; no reload needed.
- Logged-out client cannot read any `users/{uid}` doc (incl. profile/main).
- Friend ID still resolves for friend search/leaderboard (public directories).
- No password/token logged anywhere.

## 11. Remaining risks

- **Compromised legacy passwords** (world-readable during the allow-true period) →
  force reset on migration; advise users not to reuse that password elsewhere.
- The legacy bundle still contains the plaintext-login code until the
  implementation PR replaces it (it is currently non-functional because
  `users/{uid}` reads are owner-only — which is the safe state).
- `customApp` write currently lacks answer/authority field guards (own-doc only;
  low risk since authority is claim-based) — tighten in a follow-up.
- `npm run test:rules` (emulator) not run here (Java unavailable) — run before any
  future rules deploy.

## Next recommended implementation PR

**`Implement Firebase Auth Friend ID login shell`** — real Firebase Auth sessions,
stop reading `profile/main.password`, keep `users/{uid}` owner-only, safe error
messages, signup/re-registration support; legacy data migration handled separately.
