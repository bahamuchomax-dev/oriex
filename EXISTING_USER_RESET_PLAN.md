# Existing-User Reset / Re-Registration Plan

- Status: **docs only. No code, no Cloud Functions, no data migration, no deploy,
  no rules change here.** A plan for the human decisions + later, gated work.
- Companions: `AUTH_RECOVERY_PLAN.md` (incident), `FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md`
  (the modern-auth how/when), `TEACHER_CUSTOM_CLAIMS_PLAN.md` (roles).
- Scope: how **existing legacy users** move onto Firebase Auth, given their old
  passwords are compromised and must never be read or reused.

## 0. Hard invariants (unchanged at every step)

- Old plaintext passwords are **compromised** (world-readable during the old
  `allow read, write: if true` window). **Never read `profile/main.password`,
  never reuse it, never compare a password on the client.**
- `users/{uid}/**` (incl. `profile/main`) stays **owner-only** (`isSelf(uid)`).
  Never re-open it to unauthenticated / signed-in-wide reads.
- No password is ever written to Firestore. Firebase Auth owns passwords.
- No `allow read, write: if true`. Default-deny preserved.
- No password/token/credential/auth-user object is logged.
- `main`'s `firestore.rules` stays deployable; the #21 hardening stays
  draft/blocked until after the migration (and only on explicit deploy approval).

## 1. The core problem: a public Friend ID is not proof of ownership

The modern login keys a Firebase Auth account to a **deterministic internal
email derived from the Friend ID** (`<shortId>@friend-id.oriex.invalid`). The
Friend ID (`shortId`) is **public** — it is exposed in the login directories
(`customApp` / `teacherIndex`) for friend search.

Therefore, **anyone who knows a Friend ID could "claim" that account** by being
the first to register the derived email with a password of their choice. Because
legacy users have **no Firebase Auth account yet**, every legacy Friend ID is an
unclaimed email in Auth. Opening modern signup to the public, keyed by an
arbitrary chosen Friend ID, would allow **account takeover / pre-emption** of
real users before they migrate.

This is the central security decision of the migration. The compromised legacy
password cannot help (it must not be read/used), so ownership must be proven some
**other** way, or continuity must be sacrificed.

> The current opt-in shell sidesteps this for testing only: signup **generates** a
> fresh random Friend ID (not user-chosen) and is gated by a documented test
> invite code. That is safe for test accounts but does NOT let a real user
> reclaim **their** existing Friend ID / data. That is what this plan is about.

## 2. Existing-user states (what we actually know)

- A legacy user is identified by their **Friend ID** (public) and their data
  lives under `artifacts/{appId}/users/{legacyUid}/…` (and top-level
  `users/{legacyUid}/…`), keyed by a **legacy uid** that is NOT a Firebase Auth
  uid (the legacy "login" was client-side state, possibly over an anonymous Auth
  session).
- We must assume **no trustworthy secret** exists for the user (password
  compromised; the legacy login is already broken by the hardened rules).
- We may or may not have an out-of-band contact (email/teacher) per user — an
  open decision (§8).

## 3. Ownership-verification options (pick one before implementing)

- **Option A — Teacher/Admin-mediated re-issue (no Cloud Functions needed for the
  decision, Admin SDK for the re-key).** A teacher/admin (already trusted, via
  custom claims) confirms a student's identity in person and triggers a
  server-side migration for that student. Pros: works for a school context, no
  reliance on student email; strong ownership proof. Cons: manual; needs an
  admin tool + Admin SDK for the data re-key.
- **Option B — One-time migration code (Admin SDK / Cloud Function).** A
  server-side job mints a single-use, expiring migration token per legacy user,
  distributed **out-of-band** (handed out by a teacher, printed, etc.). The user
  redeems it in the modern shell to bind their NEW Auth account to their existing
  Friend ID + data. Pros: scalable, self-service after distribution. Cons: needs
  Cloud Functions/Admin SDK + a secure distribution channel.
- **Option C — Fresh re-registration, no continuity (app-only, available now).**
  The user signs up fresh in the modern shell and receives a **new** generated
  Friend ID + new Auth account. Their legacy data is NOT carried over (or is
  linked later via A/B). Pros: zero takeover risk, no server work, shippable now.
  Cons: loses history/friends/leaderboard continuity unless paired with A/B.

**Recommendation:** ship **C** as the immediately-available path (it is safe and
needs no backend), and implement **A** (teacher-mediated) for users who need
their existing data, since Oriex is teacher/student-oriented and teachers are
already a trusted role. Treat **B** as the scale-up option if self-service
migration is required. **Do NOT** allow user-chosen Friend IDs at signup in
production (only generated, or verified-claim via A/B) — that is the takeover
vector.

## 4. Old password & credential handling

- The old `profile/main.password` is **never read** for any purpose, including
  "verifying" the user. On (or before) migration of a user, the legacy
  `password` field is **removed/blanked server-side** (Admin SDK) so it stops
  existing entirely. The #21 `noSecretFields()` rules hardening then prevents any
  future write of a credential field (deploy it only after these writes are gone).
- No "re-use old password" path exists. Every migrated user sets a NEW password
  via Firebase Auth (or, for Option C, simply registers fresh).

## 5. Identity & data mapping

- The new Firebase Auth `uid` differs from the `legacyUid`. Two ways to keep data:
  1. **Re-key** `users/{legacyUid}/**` → `users/{authUid}/**` (and the
     `artifacts/{appId}/users/{legacyUid}/**` subtree) — a server-side, Admin-SDK
     batch. Cleanest end state; owner-only rules then apply to the real identity.
  2. **Mapping doc** `migration/{authUid} = { legacyUid }` maintained server-side,
     with reads/writes bridged — more moving parts; avoid if re-key is feasible.
- **All cross-user reads/writes and re-keys require the Admin SDK** (a client
  cannot read another uid's data under the owner-only rules — by design). This is
  **deferred** server work; no client-side admin operations, ever.

## 6. Per-user flow (target)

**New users (already working, app-only):** modern shell → invite/registration
gate → generate Friend ID → `createUserWithEmailAndPassword` → write profile (no
password). Done.

**Existing users — continuity (Option A/B, future, gated):**
1. Verify ownership (A: teacher confirms; B: user redeems a one-time code).
2. Create the Firebase Auth account for that user's existing Friend ID
   (server-assisted so it can't be pre-empted), user sets a NEW password.
3. Server (Admin SDK) re-keys legacy data → the new Auth uid and **removes the
   legacy `password`**.
4. User logs in with Friend ID + new password; `onAuthStateChanged` drives the UI.

**Existing users — no continuity (Option C, now):** treat as a new signup; they
get a new Friend ID. Optionally link old data later via A/B.

## 7. Phasing — safe now vs deferred (needs approval)

- **Safe now (app-only, no deploy):** the opt-in modern shell for **new**
  accounts (PRs #25/#26/#27/#28). This plan doc. An admin-facing **design** for
  Option A. No production user is migrated.
- **Deferred (explicit human + deploy approval required):** Admin SDK / Cloud
  Functions for ownership tokens (B) and the data re-key + legacy-password
  removal; the teacher migration tool (A); then, last, un-drafting and deploying
  the #21 rules hardening.

## 8. Open decisions (need a human call before building the migration)

1. **Verification mechanism:** A (teacher-mediated), B (one-time code), or
   C-only (no continuity) — or A+C. Drives whether Cloud Functions are needed.
2. **Cloud Functions / Admin SDK availability** (Spark vs Blaze) for the re-key,
   token minting, and legacy-password removal.
3. **Do existing users keep their Friend ID** (continuity, needs verified claim)
   **or get a new one** (safe, no continuity)?
4. **Out-of-band channel** for any migration code / identity confirmation
   (teacher hand-out, printed slip, etc.).
5. **Communication:** how users are told their old password is invalid and how to
   re-register / reset.

## 9. Rollback & safety

- Roll back the **app** only; **never** roll back by loosening rules. Do not
  re-open `profile/main` reads and do not restore `allow read, write: if true`.
- If a migration step misbehaves, halt and fix forward; do not expose any
  credential-bearing doc to recover.

## 10. Next concrete step

This is a **human decision point** (§8 #1 + #2). Recommended:
1. Decide the verification mechanism (suggest **A teacher-mediated + C fresh**).
2. If A/B is chosen, open a **docs/design PR** for the admin migration tool +
   the Admin-SDK re-key (still no implementation until Cloud Functions / Blaze and
   approval are confirmed).
3. Keep shipping the app-only modern shell for new accounts; do not migrate real
   users or touch `firestore.rules` / #21 until the above is decided and approved.
