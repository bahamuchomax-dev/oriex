# Fresh Re-Registration — Cutover UX & Sequencing

- Status: **docs only. No code, no Cloud Functions, no data migration, no deploy,
  no rules change here.** Design for the chosen short-term path.
- Decision (recorded): **short term = Option C** (fresh re-registration with a new
  Friend ID, app-only, available now); **medium term = Option A**
  (teacher/admin-mediated continuity, design-only until approved).
- Companions: `EXISTING_USER_RESET_PLAN.md`, `FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md`,
  `AUTH_RECOVERY_PLAN.md`.

## 0. Invariants (unchanged)

- Old plaintext passwords are **compromised** — never read, never reuse, never
  compare on the client.
- `users/{uid}/profile/main` stays **owner-only** (`isSelf(uid)`); never
  unauthenticated/`signedIn`-wide readable.
- No password written to Firestore. No `allow read, write: if true`. Nothing
  sensitive logged. `main`'s `firestore.rules` stays the deployable baseline; #21
  stays blocked.

## 1. Why the old Friend ID + old password cannot be trusted

- The legacy "login" read `artifacts/{appId}/users/{uid}/profile/main.password`
  and compared it **in plaintext on the client**. During the old
  `allow read, write: if true` window that document was world-readable, so **every
  legacy password is compromised** and must be treated as public.
- A compromised secret proves nothing about who is using it. Reusing it (or
  reading it to "verify" a user) would re-introduce the exact vulnerability we
  removed. So the old credential is discarded, not migrated.

## 2. Why a public Friend ID is not proof of ownership

- The Friend ID (`shortId`) is a **public** handle — it is exposed in the login
  directories (`customApp` / `teacherIndex`) for friend search. Knowing it is not
  evidence of owning it.
- Modern auth keys an account to an internal email **derived** from the Friend ID
  (`<shortId>@friend-id.oriex.invalid`). If signup let a user **choose** an
  existing Friend ID, anyone who knows a public ID could register it first and
  **pre-empt / take over** that account. Therefore production signup must issue a
  **system-generated** Friend ID; it must never let a user claim an arbitrary
  existing one. (Claiming an *existing* ID requires verified ownership — that is
  Option A, §4, not this flow.)

## 3. Fresh re-registration flow (Option C — app-only, available now)

For every user (new or returning), the modern shell does the same safe thing:

1. User opens the modern auth shell and chooses **新規登録 (sign up)**.
2. User provides a password (≥ 6 chars) and, during this preview phase, the
   documented **test invite gate** (`ORIX-TEST`); production will swap the gate
   for the real registration mechanism.
3. The app **generates a brand-new Friend ID** (`generateFriendId`) — the user
   does **not** type or choose one.
4. `createUserWithEmailAndPassword(auth, <derived internal email>, password)`
   creates a real Firebase Auth account. The password goes **only** to the Auth
   SDK.
5. The app writes the user's **own** `users/{uid}/profile/main` + public card with
   `name` / `shortId` / `updatedAt` only — **no password**, guarded by
   `assertSafePayload`.
6. The new Friend ID is displayed; the user uses it + their password to log in
   later. `onAuthStateChanged` drives the UI (no reload).

What this flow deliberately does **not** do:
- It does **not** read or reuse any old password (no `profile/main.password` read).
- It does **not** read any other user's `profile/main` (no unauthenticated read,
  no Friend-ID → profile lookup for auth).
- It does **not** promise automatic continuity of old learning records — a fresh
  account starts empty. Continuity is Option A (§4), handled separately and later.

This is the verified path (manual test PASS — see
`FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md` §8a, Friend ID `KWFAQA`).

## 4. Teacher/admin-mediated continuity (Option A — design-only, later)

For users who need their old data linked to the new account:

1. A **teacher/admin** (already a trusted role via custom claims) verifies the
   student's identity **out of band** (in person) or through a controlled admin
   UI — never via the compromised old password.
2. After verification, a **server-side** job (**Admin SDK / Cloud Function**)
   links/re-keys the legacy data (`users/{legacyUid}/**`) to the new Auth `uid`
   and **removes the legacy `password`** field.
3. **No client-side admin migration** ever — clients cannot (and must not) read
   across users; the owner-only rules stay intact.

This requires explicit approval + (likely) the Blaze plan and is **not built
here**. Until then, returning users use the fresh-registration flow (§3) and
request continuity through a teacher.

## 5. Cutover message draft (user-facing)

Shown when the modern login goes live / when a returning user looks for the old
login. **Draft — wording to be confirmed; contains no secrets.**

Japanese (primary):

> **ログイン方法が新しくなりました**
> 安全のため、以前のログイン（フレンドID＋パスワード）は終了しました。
> お手数ですが、**新しいアカウントを作成**してください。新しいフレンドIDが発行されます。
> これまでの学習記録が必要な場合は、**古いフレンドIDと新しいフレンドIDを添えて、先生・管理者にご連絡ください。**
> （以前のパスワードは使用できません。安全のため再設定が必要です。）

English (gloss):

> **Login has been upgraded.** For your security, the old login (Friend ID +
> password) has been retired. Please **create a new account** — a new Friend ID
> will be issued. If you need your previous learning records, **contact your
> teacher/admin with your old and new Friend IDs.** (Your old password can no
> longer be used; a reset is required for safety.)

Notes: the message must not state or imply that the old password is reusable, and
must not surface any account's existence based on a Friend ID.

## 6. Open decisions (need a human call)

1. **Cloud Functions / Admin SDK availability** (Spark vs **Blaze**) — gates
   Option A continuity and the legacy-password removal.
2. **Will a teacher admin panel be built** (controlled UI to trigger continuity),
   or is identity verification purely out-of-band initially?
3. **Is old data required for the initial release?** If no, ship Option C alone
   first and add Option A later. If yes, Option A (and Blaze) is a prerequisite.
4. **Registration gate for production** (what replaces the `ORIX-TEST` test
   invite — class code, teacher-issued code, open with rate limiting, …).

## 7. Rollback invariant

- Roll back the **app** only. **Never** roll back by loosening rules: do not
  re-open `profile/main` reads, do not restore `allow read, write: if true`, and
  do not reintroduce a plaintext-password path.
- The old password is never reused, in normal operation or rollback.

## 8. #21 status

`#21` (`noSecretFields()` rules hardening) **remains draft/blocked**. It is
deployed **only after**: the modern flow is live, the legacy plaintext-`password`
writes are gone, `npm run test:rules` passes (needs Java), and explicit deploy
approval is given. Nothing in this plan merges or deploys #21.

## Next concrete step

This is a **human decision point** (§6 #1–#4). Once Cloud Functions availability
and the "old data required?" question are answered:
- If Option C alone suffices for v1 → a small **app-only** PR can replace the
  `ORIX-TEST` test gate with the chosen production registration gate and finalize
  the cutover message (still no rules change, no deploy until cutover approval).
- If continuity is required for v1 → a **design PR** for the teacher admin tool +
  the Admin-SDK re-key (still implementation-gated on Blaze + approval).
