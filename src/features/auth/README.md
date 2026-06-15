# Auth

Firebase Authentication wiring for the app.

- `AuthProvider.jsx` — context that watches `onAuthStateChanged`, exposes
  `{ user, uid, loading, error, signInAnon, signOutUser }`, and the `useAuth()` hook.
- `LoginScreen.jsx` — shown when no user is signed in.

**Status (stage 1):** anonymous sign-in implemented. Requires "Anonymous" to be
enabled in the Firebase console (Authentication → Sign-in method). Swap in
Google/email by adding buttons that call the matching `firebase/auth` API.

## `friendIdAuth.js` — Friend ID ↔ Firebase Auth helpers (migration prep)

Pure, side-effect-free utilities that bridge the legacy 6-char Friend ID onto
Firebase Auth identities, replacing the legacy **client-side plaintext password**
login (see `AUTH_RECOVERY_PLAN.md`). They do **not** touch Firestore/Firebase and
never receive, return, or log a password (enforced by
`test/friendIdAuthNoLog.test.js`).

- `normalizeFriendId(input)` — canonicalize entry: uppercase, strip spaces/hyphens.
- `validateFriendIdFormat(id)` — strict check: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  (the legacy alphabet; no ambiguous `I O 0 1`). Normalize first.
- `makeInternalAuthEmailFromFriendId(friendId[, domain])` — deterministic internal
  email for the Firebase Auth email/password shim, on the non-deliverable reserved
  `…@friend-id.oriex.invalid` domain. Throws on an invalid Friend ID (no echo).
- `safeAuthErrorMessage(error)` — maps a Firebase Auth/Firestore error **object or
  raw code string** to safe Japanese UI strings; collapses credential-class errors
  to one message (no account enumeration) and never surfaces the raw
  `error.message`. Covers signup/reauth/rules-denied codes too
  (`email-already-in-use`, `requires-recent-login`, `permission-denied`).

These are building blocks only — wiring them into a real login flow (and the
identity re-key / forced password reset) is the migration work in
`AUTH_RECOVERY_PLAN.md` §4. No Cloud Functions, no data scripts, no deploy here.

> This is the canonical modern-auth utility module. It consolidates and
> supersedes the earlier draft in PR #19 (`secure-auth-recovery-sprint`): the
> strict 6-char Friend ID validation, the no-leak/no-log error handling, and the
> extra error codes from #19 are all folded in here.
