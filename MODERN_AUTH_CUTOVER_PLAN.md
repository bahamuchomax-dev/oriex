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

## (HISTORICAL — now resolved) Why the default login was NOT flipped at first

> **SUPERSEDED:** the app-architecture gap below was the post-login handoff, which
> has since been solved (legacy-path profile + localStorage seed). The default IS
> now the modern cutover — see "DEFAULT FLIP" near the end of this doc.

Making modern auth the default was once **blocked by an app-architecture gap, not
just a flag**: the modern shell (`ModernAuthShell.jsx`) is an **auth-only screen** —
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

## Update — post-login handoff SOLVED; opt-in cutover flag implemented

The handoff blocker (above) is resolved. Root cause was a **profile path
mismatch**: legacy reads `artifacts/gen-ron-kai-app-v1/users/{uid}/profile/main`
while modern signup wrote the top-level `users/{uid}/profile/main`. Writing the
user's OWN minimal legacy-path profile (no password, owner-only, no rules change)
makes legacy's existing `onAuthStateChanged` adopt the session and enter the real
app. See PR #35.

### Manual PASS (first load)

`?oriexAuthBridge=1` probe, first load: Auth user YES · `__oxUid == auth uid` YES ·
legacy mounted YES · legacy-path profile **created** · old password field **NO** ·
**Oriex home appeared immediately**. The modern Firebase Auth → legacy handoff
works; Option A is feasible; bridge timing is stable on first load.

### Opt-in cutover flag (this PR — still NOT the default)

A production-like, **opt-in** cutover that reuses the verified handoff without the
debug overlay:

- **Enable:** `?oriexModernCutover=1` / `#modern-cutover` /
  `localStorage["oriexModernCutover"]=1`.
- **Flow:** modern Firebase Auth login/signup → on a user, `handoffToLegacy`
  (set `window.__oxUid`, ensure the user's own legacy-path profile, import the
  legacy bundle) → the real Oriex app, **no old login/register gate, no debug
  overlay**.
- **Files:** `cutoverRoute.js` (gate), `ModernCutoverBridge.jsx` (clean bridge,
  renders null once legacy owns `#root`), `mountModernCutover.jsx`,
  `legacyHandoff.js` (shared handoff). The debug probe `?oriexAuthBridge=1` stays
  available for diagnosis.
- **Unchanged:** with no flag, `main.js` boots legacy exactly as before;
  `firestore.rules` unchanged; legacy bundle imported (not edited).

### How to test

`npm run build && npm run preview`, open `…/?oriexModernCutover=1`, sign up
(invite `ORIX-TEST`, password ≥ 6) or log in → expect the real Oriex home with no
old login/register gate and no debug overlay. The probe `?oriexAuthBridge=1` shows
the diagnostic observations if needed.

### When this can become the default

Only after: (1) broader manual QA of the cutover across roles/devices, (2) the
cutover message (`cutoverCopy.js`) shown for returning users, (3) a decision to
retire the legacy plaintext login UI, and (4) explicit approval + an app deploy.
The default-flip is a separate future PR; this PR does NOT flip it.

### #21 stays blocked

`#21` (`noSecretFields()`) is deployed only AFTER the cutover is the served login,
the legacy plaintext-`password` writes are removed, `npm run test:rules` passes,
and deploy is explicitly approved. Nothing here merges or deploys #21.

## DEFAULT FLIP — modern cutover is now the default login (app-only)

Decision (v1): the **normal URL uses the modern Firebase Auth cutover by default**.
Existing users **re-register** with a new Friend ID (no old-data continuity yet;
old passwords are compromised and never reused). No Firestore Rules change, no
deploy, no `#21`.

### Exact URL behavior (after this PR)

- `/`, `/oriex/`, and any **no-flag** visit → **modern cutover**: modern
  login/signup → ensure the user's own legacy profile → seed the legacy local
  session → import the (unedited) legacy bundle → Oriex home. The returning-user
  cutover message (`cutoverCopy.js`) is shown on the signed-out screen.
- `?oriexModernCutover=1` → same modern cutover (it falls through to the default).
- `?oriexAuthBridge=1` → developer probe (diagnostic), unchanged.
- `?oriexModernAuth=1` → the standalone modern auth shell (opt-in), unchanged.
- **`?oriexLegacyFallback=1` / `#legacy-fallback` / `localStorage.oriexLegacyFallback=1`
  → the OLD legacy app.** ⚠️ Emergency admin/dev only; it still exposes the unsafe
  plaintext login. Temporary; remove once the legacy login is retired.

The old legacy plaintext login is **no longer the default** for anyone.

### Rollback

- **App rollback:** `git revert` this PR (and re-publish via the normal Pages
  flow). That restores legacy-as-default. **Never** roll back by loosening rules,
  re-opening `profile/main`, or restoring `allow read, write: if true`.
- **Interim:** an admin can reach the old app via `?oriexLegacyFallback=1` without
  a revert (emergency only).

### Manual QA checklist (REQUIRED before/after publishing — not automatable here)

There is **no browser E2E tooling** in this repo (no Playwright/Puppeteer) and no
Java for `npm run test:rules`, so the items below MUST be checked by hand on a
real device. Code-level tests prove the routing + handoff wiring + no-password
writes, but cannot prove the live Oriex home renders.

- Normal URL shows the modern cutover login (with the cutover message).
- Signup (test invite `ORIX-TEST` + throwaway password) creates a Firebase Auth
  user; a new Friend ID is issued and shown.
- Logout returns to the login screen; re-login reaches **Oriex home without a
  manual reload**.
- Reload while signed in stays on **Oriex home**.
- `users/{uid}/profile/main`, the artifacts legacy profile, and `customApp` have
  **no `password` field**; no permission-denied in the console.
- The old legacy login does **not** appear by default; `?oriexLegacyFallback=1`
  still reaches it (admin only).

### What remains blocked / out of scope

- **`#21` (`noSecretFields()`) stays draft/blocked and is NOT deployed.** It can be
  considered only after: (1) the modern default is stable in production, (2) the
  legacy plaintext-`password` writes are removed/retired, (3) `npm run test:rules`
  passes (needs Java), and (4) explicit deploy approval.
- No Firestore Rules change; no Firebase deploy; existing-user data continuity
  (teacher/admin-mediated) is a later effort.

## Next concrete step

Manual QA the default cutover on the published Pages site (checklist above). If a
problem appears, use `git revert` (or `?oriexLegacyFallback=1` for emergency
access) — never loosen rules. Keep `#21` blocked until its prerequisites are met.
