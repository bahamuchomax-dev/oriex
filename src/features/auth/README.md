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

## Modern Firebase Auth login shell (opt-in — NOT the default login)

An **opt-in** Firebase Auth login/signup shell that uses real Firebase Auth and
the `friendIdAuth.js` helpers. It does **not** replace the served legacy login and
does **not** touch the legacy bundle. It is preparatory: existing-user migration,
password reset, Cloud Functions, the #21 rules hardening, and production cutover
are all intentionally out of scope.

- `modernAuthRoute.js` — tiny pure gate. `isModernAuthEnabled(location)` is true
  only when explicitly opted in.
- `modernAuthApi.js` — `signUpWithInviteCode`, `loginWithFriendId`, `logout`.
  Firebase Auth owns the password; it is passed **only** to the Auth SDK, never
  written to Firestore (every Firestore write runs through `assertSafePayload`,
  which rejects credential/authority/answer fields). **Signup is gated by an
  invite code and GENERATES the Friend ID** (a new user does not type one — the
  Friend ID is the system-assigned public handle, matching the legacy generator).
  Login derives the internal email deterministically — it reads no other user's
  `profile/main` and does no client-side password comparison (the module imports
  no Firestore read primitive).
- `inviteCode.js` — the signup gate. ⚠️ **`DEV_INVITE_CODE = "ORIX-TEST"` is a
  documented, NON-SECRET, TEST-ONLY code and is NOT a security boundary** (it is
  client-side and trivially bypassable; the real protections are Firebase Auth +
  Firestore Rules). `validateInviteCode` normalizes casing / spaces / hyphens /
  full-width / hidden chars. The invite code is never written to Firestore and
  never logged. A production cutover must replace this with a server-validated
  invite (a real secret, never shipped in client source).
- `ModernAuthShell.jsx` — `onAuthStateChanged`-driven UI; signed-out shows
  login (Friend ID) / signup (invite code → generates & displays the Friend ID),
  signed-in shows the user's own UID (copy) + logout. The invite error is the
  specific `招待コードが正しくありません`; all other errors go through
  `safeAuthErrorMessage`. Nothing is logged.
- `mountModernAuth.jsx` — lazy mount; `src/main.js` loads it (separate chunk)
  only when enabled, falling back to the legacy app on any failure.

### How to enable (opt-in) + sign up

- URL query: `…/?oriexModernAuth=1`
- URL hash: `…/#modern-auth`
- localStorage: `localStorage.setItem("oriexModernAuth", "1")` (clear it to disable)

To sign up while testing, enter the **test invite code `ORIX-TEST`** + a password
(≥ 6 chars). A Friend ID is generated and shown — use that Friend ID + the same
password to log in next time.

With the flag absent (the default), `main.js` boots the legacy app exactly as
before. Firestore Rules are unchanged; deploying nothing is required. The #21
rules hardening remains blocked until the migration is complete.
