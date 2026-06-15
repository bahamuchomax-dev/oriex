# Secure Auth Recovery Plan

- Date: 2026-06-15
- Project: `genro-b74de`
- Status: **proposal + guard tests only — NOT deployed.** No production change
  is made by merging this PR. See "Sequencing & deploy" below.
- Related: `FIRESTORE_RULES_DRIFT_AUDIT.md`, `AUTH_LOGIN_NOTES.md`,
  `DATA_PRIVACY_AUDIT.md`, `SECURITY_AUDIT.md`.

## 1. Confirmed vulnerability: client-side plaintext password "auth"

The deployed **legacy bundle** (`src/legacy/oriex-app.bundle.js`, frozen /
reference-only) does NOT use Firebase Authentication for the Friend ID login. It
implements a homegrown credential check entirely on the client:

1. Resolve the entered Friend ID (`shortId`) → `uid` by querying, **while
   unauthenticated**, the public login directories:
   - `artifacts/{appId}/public/data/customApp` `where("shortId","==", id)` (primary)
   - `artifacts/{appId}/public/data/teacherIndex` `where("shortId","==", id)` (fallback)
2. Read the resolved user's profile document directly:
   `getDoc(doc(db,"artifacts",appId,"users",uid,"profile","main"))`.
3. Compare the stored password **in plaintext, on the client**:
   `if (data.password !== entered) { /* "パスワードが違います" */ }`.
4. On match, set client app state as that user. There is **no Firebase Auth
   identity** established for this path.

Two further confirmed issues in the same bundle:

- A **teacher roster screen renders student passwords in plaintext**
  (`{ ...password: K.password || "（未設定）" }`, displayed in a table cell). Any
  teacher-mode session could read every student's plaintext password.
- A **hard-coded credential bypass**: a magic username string
  (`"genronkai.miwa"`) is treated as a teacher grant on the client.

### Why this is critical

- Passwords are stored **in plaintext** at
  `artifacts/{appId}/users/{uid}/profile/main.password`.
- During the `allow read, write: if true` production window
  (see `FIRESTORE_RULES_DRIFT_AUDIT.md`), that document was **world-readable**.
  Therefore **every legacy plaintext password must be treated as compromised /
  publicly disclosed**, regardless of the rules hardening that has since landed.
- The "auth" check is client-side string comparison, so it provides **no real
  authentication**: a modified client can skip it. Real authorization must come
  from Firebase Auth + server-evaluated Firestore Rules.

### Current containment (already in place)

- The hardened rules now gate `artifacts/{appId}/users/{uid}/**` behind
  `isSelf(uid)`, so `profile/main` (and its `password`) is **no longer
  unauthenticated-readable**. This intentionally **breaks** the legacy plaintext
  login (it can no longer read the password to compare) — which is the correct
  security posture. The path forward is migration, not re-opening the read.
- This PR additionally forbids any credential field from being **written** into
  the public login directories or the legacy profile doc (see §3), so the
  plaintext-password pattern cannot be reintroduced via rules drift.

## 2. Target architecture: Firebase Auth + claims

- **Identity:** Firebase Authentication is the only source of identity. Email/
  password (or a Friend-ID-as-email shim) accounts replace the Firestore
  `password` field. Optionally keep an anonymous→permanent upgrade path.
- **Authorization:** Firestore Rules continue to evaluate `request.auth.uid`
  (`isSelf`) and server-set custom claims (`request.auth.token.teacher/admin`,
  per `TEACHER_CUSTOM_CLAIMS_PLAN.md`). No client field grants authority; the
  `"genronkai.miwa"` bypass is removed when the modern login replaces the bundle.
- **Friend ID:** `shortId` remains a public, **non-secret** lookup handle (a
  display/contact code only). The public login directories keep exposing only
  `{shortId, uid, name, avatar, color, xp, streak}` — never a credential.
- **Login UI:** migrate onto `src/features/auth/AuthProvider.jsx`
  (`onAuthStateChanged`-driven) + a real `LoginScreen`. This also fixes the
  no-reload state-transition bug documented in `AUTH_LOGIN_NOTES.md` §1.

## 3. The work is split into two PRs (deploy safety)

The credential-field write hardening and the docs/guards are split so that
`main`'s `firestore.rules` stays the **deployable source of truth** at all times.
This repo deploys Firestore Rules from `main` by hand (see the deploy records in
`FIRESTORE_RULES_DRIFT_AUDIT.md`), so an undeployable ruleset must never sit in
`main`.

### PR #20 — docs + static guard tests (safe to merge now, no deploy)

- **Does not change `firestore.rules`.** No production-rules change; no deploy
  required; nothing breaks if the rules are later deployed from `main`.
- Adds this plan and `test/authRecoveryGuards.test.js`, which lock the invariants
  of the **currently deployable** rules so a regression cannot silently re-open
  the hole:
  - `profile/main` is never unauthenticated-readable (no `if true`, no bare `signedIn`);
  - the legacy per-user subtree stays owner-only (not broadly public-readable);
  - the only public (`if true`) reads are the two Friend ID directories, and no
    `allow read, write: if true` / `if true` mutation survives anywhere;
  - modern `src/` (excluding the frozen legacy bundle) contains **no** client-side
    plaintext password comparison and the auth feature is Firebase-Auth-driven.

### PR #21 (gated/draft) — `noSecretFields()` rules hardening, ship AFTER migration

- Adds a `noSecretFields()` helper (rejects writes carrying `password`,
  `passwordHash`, `pass`, `pin`, `secret`, `credential`) and AND-s it into the
  writes of the **world-readable** Friend ID login directories
  (`public/data/customApp` top-level + artifacts, `public/data/teacherIndex`) and
  the legacy self profile (`users/{u}/profile/main`), plus tests proving credential
  fields are rejected.
- **Must NOT be merged/deployed before the §4 Firebase Auth migration.** The
  current legacy signup, profile-save, password-change, and `customApp` card-sync
  writes all carry a plaintext `password` field, so deploying this hardening today
  would deny those writes and break the live app. The hardening is intentional
  **only after** migration removes those plaintext-password writes. `firestore.rules`
  in that PR carries a `DO NOT DEPLOY UNTIL FIREBASE AUTH MIGRATION` banner.

Neither PR edits the frozen legacy bundle, and neither changes any `allow read`
rule. PR #20 changes no rules at all.

## 4. Migration steps (future PRs, gated, out of scope here)

1. **Treat all legacy passwords as compromised.** On cutover, **force a password
   reset** for every migrated account; do not carry over any plaintext password.
2. Provision Firebase Auth accounts for existing users; map Friend ID → Auth uid
   (one-time, server-side / Admin SDK; no secrets committed to the repo).
3. Re-key per-user documents to the Firebase Auth `uid` (or maintain a
   server-side mapping) so `isSelf(uid)` rules apply to real identities.
4. Replace the legacy login UI with the modern `AuthProvider`/`LoginScreen`
   flow; remove the `"genronkai.miwa"` bypass and the password-display roster.
5. Provision teacher/admin **custom claims** (`TEACHER_CUSTOM_CLAIMS_PLAN.md`).
6. **Then** deploy: the PR #21 `noSecretFields()` hardening + the rest, after
   emulator verification (`npm run test:rules`, needs Java) and manual flow tests.

## Sequencing & deploy

- Merging **PR #20** changes **repo files only** and changes no rules — it is safe
  to merge now and requires no deploy.
- The **PR #21** rules hardening must NOT be deployed (nor merged into `main`)
  until the application-layer migration in §4 is done, or the legacy bundle's
  signup / profile / password-change / `customApp` card-sync writes (which still
  carry a plaintext `password`) would be denied.
- Do not re-open `profile/main` reads, do not restore `allow read, write: if
  true`, and do not reintroduce a plaintext-password path. The guard tests fail
  the build if any of these regress.
