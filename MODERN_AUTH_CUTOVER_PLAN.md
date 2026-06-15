# Modern Auth Cutover Plan (UI prepared; default NOT flipped)

- Status: **app-only UI prep + design docs. No deploy, no Firestore Rules change,
  no legacy bundle edit, no default-login flip in this PR.**
- v1 decision (recorded): **fresh re-registration** with a new Friend ID; **no old
  data continuity** at cutover; old passwords are compromised and never reused;
  teacher/admin-mediated continuity is designed for later.
- Companions: `FRESH_REREGISTRATION_CUTOVER_UX.md`, `EXISTING_USER_RESET_PLAN.md`,
  `FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md`.

## What this PR does (app-only, safe)

- Adds the **cutover message** to the modern auth shell's signed-out view
  (`src/features/auth/cutoverCopy.js` + `ModernAuthShell.jsx`):
  - 安全性向上のため、ログイン方式を新しくしました。
  - 以前のパスワードは使用できません。新しいアカウントを作成してください。
  - 学習記録の引き継ぎが必要な場合は先生/管理者に相談してください。
- Adds signup copy stating a **new Friend ID is issued** (the user does not type
  one) and is used for the next login.
- Changes **no** behaviour of the served app: the modern shell stays **opt-in**
  (`?oriexModernAuth=1` / `#modern-auth` / `localStorage`), legacy remains the
  default boot.

It does **not** read/reuse any old password, does **not** read `profile/main`
for auth, does **not** write a password to Firestore, and changes **no** rules.

## ⛔ Why the default login is NOT flipped here (key finding)

Making modern auth the default is **blocked by an app-architecture gap, not just
a flag**: the modern shell (`ModernAuthShell.jsx`) is an **auth-only screen** —
after sign-in it shows "ログイン中" + the user's UID, and nothing else. The actual
Oriex app is still the **legacy bundle** (`src/main.js` boots
`src/legacy/oriex-app.bundle.js`); the modern React app (`src/App.jsx`) is the
dormant migration scaffold.

So if we flipped the default today, every user would authenticate and then land
on an **app-less screen** — there is no handoff from the modern Auth session into
the running app. That handoff requires either:
1. wiring the modern Firebase Auth session into the **legacy bundle** (a broad
   legacy change — out of scope / prohibited), or
2. completing enough of the **React migration** that the modern app can run after
   login.

Either is a much larger, separate effort. **Per the task, this is reported rather
than attempted** — the default-flip is deferred until the post-login app handoff
exists.

## Production cutover flag — design (not implemented)

When the post-login handoff exists, gate the cutover behind a single switch
instead of editing call sites:

- A constant/config flag, e.g. `MODERN_AUTH_DEFAULT` (default `false` today).
  - `false` → current behaviour: legacy boots by default; modern shell is opt-in
    via `isModernAuthEnabled(location)`.
  - `true` → modern auth becomes the default gate; legacy boot is reachable
    **only** via an **admin/testing emergency fallback** (e.g. a reserved
    `?oriexLegacyAuth=1`), never the normal path. The fallback exists so admins
    can still reach the old app during the transition; it must not re-enable the
    legacy plaintext **login** for end users.
- Implementation would live in `src/main.js`'s existing opt-in branch (the
  established hidden-route pattern), so it is a **small** main.js change — but it
  must not ship until the handoff above is real.

Safety constraints for the flag (when built):
- The emergency legacy fallback must **not** restore the plaintext-password login
  for end users; it is admin/testing only and time-boxed.
- No `profile/main` is read unauthenticated; no `allow read, write: if true`; no
  old password is read or reused.

## Cutover sequence (target order)

1. **(done)** Modern auth shell works opt-in; signup issues a new Friend ID; no
   password in Firestore. Manual test PASS (see sequence doc §8a).
2. **(this PR)** Cutover message + signup copy prepared in the modern shell. No
   default flip.
3. Build the **post-login app handoff** (legacy integration or React migration) —
   the actual blocker for the default flip.
4. Add the `MODERN_AUTH_DEFAULT` flag + admin-only legacy fallback (small main.js
   change), test behind the flag.
5. Flip the default (app deploy) so new visitors get modern auth + the cutover
   message; legacy login is retired for end users.
6. Remove/blank legacy `profile/main.password` server-side (Admin SDK).
7. **Only then** un-draft and deploy **#21** (`noSecretFields()`), after
   `npm run test:rules` and explicit deploy approval.

## Invariants / rollback

- Never re-open `profile/main` to unauthenticated reads; never restore
  `allow read, write: if true`; never reuse old plaintext passwords.
- Roll back the **app** only; never roll back by loosening rules.
- **#21 remains draft/blocked** and is not merged or deployed by anything here.

## Open decisions (human)

1. The **post-login app handoff** approach (legacy integration vs React migration
   completion) — the gating item for the default flip.
2. Production **registration gate** to replace the `ORIX-TEST` test invite.
3. Whether/when to build the teacher admin continuity tool (needs Admin SDK /
   Blaze) — not required for v1.

## Next concrete step

Decide the post-login handoff (#1 above). Until it exists, keep the modern shell
opt-in and the cutover message prepared; do not flip the default, do not change
rules, do not deploy, and keep #21 blocked.
