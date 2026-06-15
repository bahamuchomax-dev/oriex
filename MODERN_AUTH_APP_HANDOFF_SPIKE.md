# Spike: Modern Auth → Oriex App Handoff

- Status: **investigation / docs + tiny static probe. No broad implementation, no
  default flip, no rules change, no deploy.**
- Companions: `MODERN_AUTH_CUTOVER_PLAN.md`, `FRESH_REREGISTRATION_CUTOVER_UX.md`,
  `FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md`.

## The blocker

The modern auth shell (`ModernAuthShell.jsx`) is an **auth-only screen**: after
sign-in it shows the user's UID, not the app. The real Oriex app is the **legacy
bundle** (`src/main.js` boots `src/legacy/oriex-app.bundle.js`); the React app
(`src/App.jsx`) is a dormant scaffold. So modern auth cannot become the default
login until there is a **post-login handoff** into a working app.

## Files inspected (read-only)

- `src/main.js` — boot/opt-in routing (legacy is default; modern shell mounts only
  behind `isModernAuthEnabled`).
- `src/firebase/firebase.js` — the **real** `auth` + `db`; app created via
  `getApps().length ? getApp() : initializeApp(firebaseConfig)` (reuses an
  existing app instance).
- `src/firebase/firebaseConfig.js` — project `genro-b74de` (web apiKey, public).
- `src/features/auth/{modernAuthApi.js, ModernAuthShell.jsx, modernAuthRoute.js,
  modernAuthState.js}` — modern flow; uses `src/firebase/firebase.js`.
- `src/legacy/oriex-app.bundle.js` — (minified, read-only) initializes Firebase
  for the **same** project; contains app-level `onAuthStateChanged` handling that
  sets `window.__oxUid = user?.uid || window.__oxUid`; also still contains the
  legacy plaintext Friend-ID login (reads `profile/main.password`, client-side
  compare) and the `genronkai.miwa` bypass.
- `src/App.jsx` — imports 6 React screens (Home, Records, Review, Factory,
  Profile, TeacherProblems); **never mounted** by `main.js`.
- `src/features/*` — many feature scaffolds exist (auth, books, dm, friends,
  plans, vocabulary, studyDiary, hamster, settings, timer, …).
- `src/services/firebase/client.js` — **stub**: `firebaseEnabled = false`,
  `getDb()` returns `null`. The React repositories persist to **localStorage**
  (`src/services/repository/localStore.js`), NOT real Firestore.

## Option A — Bridge modern Firebase Auth into the legacy app

**Idea:** establish the Firebase Auth session with the modern shell, then start
the legacy app on the **same** Firebase app instance; the legacy app's
`onAuthStateChanged` adopts the signed-in user (`window.__oxUid = user.uid`) and
runs against real Firestore. A freshly re-registered user gets `__oxUid =` their
new Auth uid → a fresh account (matches v1 Option C — no continuity needed).

Answers to the evaluation questions:
1. **Can legacy accept an externally authenticated user?** Likely yes — it already
   reacts to `onAuthStateChanged` and derives `__oxUid` from `user.uid`.
2. **Does legacy init its own Firebase app?** Yes, for the same project
   (`genro-b74de`). Whether it guards with `getApps()` is **unverified** (minified)
   — a key risk (duplicate-app vs shared-app).
3. **Can modern + legacy share one app/auth instance?** `src/firebase/firebase.js`
   reuses an existing app; if legacy also reuses (or is initialized first), they
   can share — **must verify** legacy's init guard and load order.
4. **Mount legacy after modern sign-in without the plaintext path?** This is the
   crux. If legacy starts already-authenticated and its `onAuthStateChanged`
   adopts the user, the plaintext login UI should not be needed — but legacy may
   still *present* its own login gate; suppressing that may need a tiny, single-
   point legacy hook (see risks).
5. **Minimal interface:** start legacy **only after** a Firebase Auth user exists
   (shared persistence), optionally exposing `window.__ORIEX_AUTH_USER__` /
   relying on the existing `onAuthStateChanged` path. No password is passed.
6. **Can legacy avoid reading `profile/main.password`?** The bridge must enter the
   app via the Firebase-Auth path, never the Friend-ID plaintext compare. The
   plaintext code still *exists* in the bundle; the bridge must not invoke it.
7. **Requires editing the legacy bundle?** Possibly a **tiny** hook if legacy
   insists on showing its own login first; **ideally zero** if pure sequencing
   (start-after-auth + shared app) suffices. To be determined by a probe.
8. **How broad?** Target: zero or a **single narrow** hook (gate legacy's login
   screen on an existing Firebase user). NOT a broad rewrite. If it can't be done
   narrowly, stop and report.
9. **Security risks:** (a) accidentally invoking the plaintext login / reading
   `profile/main.password`; (b) duplicate Firebase app / wrong instance; (c) the
   `genronkai.miwa` bypass still living in the bundle; (d) re-exposing the legacy
   login UI. All are avoidable by sequencing + not touching those paths, but must
   be verified.
10. **Feasible as a small bridge?** Plausibly yes for v1, pending the probe in
    Phase 1 below. This is the **fastest** route to a working post-login app.

## Option B — Continue the React migration as the post-login app

Answers:
1. **How much exists in React?** Substantial scaffolding (`src/App.jsx` + ~20
   feature dirs), but…
2. **Is `src/App.jsx` functional enough?** As a UI shell yes, but its **data layer
   is stubbed** (`firebaseEnabled = false`; localStorage repositories). It is not
   wired to real Firestore or to modern Firebase Auth's `uid`.
3. **Core features available outside legacy?** UI for Home/Records/Review/Factory/
   Profile/Teacher exists on localStorage; not real-data-backed.
4. **Critical features still legacy-only?** Effectively all *real-data* behaviour:
   friends/DM/plans/vocabulary/studyDiary/leaderboard/hamster, and the real
   Firestore reads/writes under the hardened rules.
5. **Minimum viable modern app after login?** Would require wiring the React data
   layer to real Firestore + Auth `uid` for at least the core screens — a large,
   multi-step effort.
6. **Effort/risk vs A?** Much larger and riskier than A; weeks–months to parity.
7. **Avoids the legacy password-roster + `genronkai.miwa` bypass?** **Yes** — the
   clean end state has none of the legacy plaintext code.
8. **Migration sequence?** Enable real Firestore in `client.js` (gated on
   `authReady`), port repositories screen-by-screen, verify each against the
   hardened rules, then mount `App.jsx` as the post-login app.

## Risks (summary)

- **A:** shared-Firebase-app uncertainty; risk of touching the plaintext path; a
  possible small legacy hook (needs approval); the bundle still contains the
  plaintext login + `genronkai.miwa` until B retires it.
- **B:** large scope; data layer is stubbed; high risk of incomplete parity;
  long timeline before any user benefit.

## Recommendation

- **Short-term: Option A** (bridge) — fastest path to a working post-login app for
  v1 fresh re-registration, since legacy is the real app. Pursue as a **probe
  first**, then a **narrow** bridge; do **not** broadly edit legacy.
- **Long-term: Option B** (React migration) — the clean end state that removes the
  legacy plaintext login, the password roster, and the `genronkai.miwa` bypass.
  Progress it incrementally behind the modern app while A carries v1.

## Phased implementation plan

- **Phase 1 — Probe (next PR, app-only, behind a NEW opt-in flag):** verify the
  shared-Firebase-app assumption and whether legacy can start already-authenticated
  without showing/using its plaintext login. No production change; no broad legacy
  edit. **Stop and report** if a non-narrow legacy edit would be required.
- **Phase 2 — Narrow bridge (only if Phase 1 is green, with approval):** sequence
  modern sign-in → start legacy on the shared app; if a single login-gate hook in
  legacy is unavoidable, get explicit approval for that one narrow change.
- **Phase 3 — Cutover:** flip the default behind `MODERN_AUTH_DEFAULT` (admin-only
  legacy fallback), app deploy; remove legacy `profile/main.password` server-side.
- **Phase 4 — #21:** un-draft + deploy `noSecretFields()` after `test:rules` +
  explicit approval.
- **Parallel (Option B):** incrementally wire the React data layer to real
  Firestore to retire legacy long-term.

## First implementation PR

- **Branch:** `probe-modern-auth-legacy-bridge`
- **Tasks (app-only, behind a new `?oriexAuthBridge=1` opt-in flag — NOT default):**
  1. A docs/probe note on the shared-Firebase-app instance (does loading
     `src/firebase/firebase.js` then the legacy bundle yield one app or two?).
  2. A tiny harness that, only under the flag, signs in via modern auth, then
     loads legacy and **observes** (no asserts on real data) whether legacy adopts
     the Firebase user without the plaintext login.
  3. Static tests: default boot still legacy; the new flag is off by default; no
     `profile/main.password` read added; no rules change.
  4. **Stop** the moment a broad legacy edit, a rules change, or a default flip
     would be needed — and report.

## What must NOT be done

- No broad legacy bundle edit. No default-login flip. No Firestore Rules change.
  No deploy. No production cutover. No reading/reusing old passwords. No writing a
  password to Firestore. No logging of password/token/credential/auth-user object.

## Manual test plan (for the eventual bridge, behind the flag)

- Modern signup → on success, land in the **real app** (legacy), not the auth-only
  screen, with `__oxUid` = the new Auth uid (fresh account).
- No legacy plaintext login UI is shown; no `profile/main.password` read occurs.
- Logout returns to the modern signed-out screen; reload preserves the session.
- A logged-out client cannot read any `users/{uid}` doc.
- No permission-denied on the new user's own paths.

## Rollback plan

- Roll back the **app** only (disable the bridge flag). Never roll back by
  loosening rules, re-opening `profile/main`, or restoring `allow read, write: if
  true` / the plaintext login.

## Why #21 remains blocked

`#21` (`noSecretFields()`) denies any credential-field write. The legacy bundle
still writes a plaintext `password` (signup/profile/customApp) until the bridge
(or B) makes modern auth the live login and those writes are removed. Deploying
#21 before then would break the live app. So **#21 stays draft/blocked** until the
modern flow is the served login, the legacy plaintext writes are gone,
`npm run test:rules` passes, and deploy is explicitly approved.
