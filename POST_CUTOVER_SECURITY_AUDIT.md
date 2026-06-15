# Post-Cutover Security Audit & Risk Register

- Status: **docs only. No code, no Firestore Rules change, no deploy.** A register
  of the security risks that remain after the modern Firebase Auth cutover, and
  the prerequisites before each can be retired/closed.
- Companions: `AUTH_RECOVERY_PLAN.md`, `MODERN_AUTH_CUTOVER_PLAN.md`,
  `EXISTING_USER_RESET_PLAN.md`, `TEACHER_CUSTOM_CLAIMS_PLAN.md`, `FIRESTORE_RULES_DRIFT_AUDIT.md`.

## 0. Standing invariants (never violate)

- Never restore the legacy plaintext-password login as a user path.
- Never read `profile/main.password`; never compare a password on the client;
  never write a password to Firestore or localStorage.
- Never re-open `profile/main` to unauthenticated reads; never restore
  `allow read, write: if true`. Roll back the app, never the rules.
- `#21` (`noSecretFields()`) stays draft/blocked until its prerequisites (§7).

## 1. Legacy password roster (HIGH)

The frozen legacy bundle (`src/legacy/oriex-app.bundle.js`) contains a teacher
screen that **renders student passwords in plaintext** (it reads `password` from
profile docs and shows it in a table). While the modern cutover never writes a
`password` field, **legacy still has this code**, and any legacy profile docs that
still contain a plaintext `password` (from before the cutover) remain readable to
that screen for whoever can reach it.

- Risk: plaintext credential exposure to teacher-mode sessions; the passwords are
  already compromised (world-readable during the allow-true window).
- Retire by: removing the legacy plaintext-`password` fields server-side (§3) AND
  retiring the legacy login/roster UI (§6). Do not edit the legacy bundle broadly.

## 2. `genronkai.miwa` hard-coded teacher bypass (HIGH)

The legacy bundle grants teacher mode when a magic username string
(`"genronkai.miwa"`) is entered — a client-side authority bypass independent of
custom claims.

- Risk: anyone typing the string in the legacy flow gets teacher UI; combined with
  the password roster (§1) and any teacher-only reads, this is privilege
  escalation on the client.
- Retire by: retiring the legacy login/roster UI (§6). Real authority must come
  only from server-set custom claims (`request.auth.token.teacher/admin`), which
  the deployed rules already require. Note: this bypass is **client-side UI only** —
  it cannot grant Firestore access that the rules don't already allow (the rules
  do not trust client fields), but it must still be removed.

## 3. Old plaintext `password` fields in Firestore (HIGH)

Legacy stored plaintext passwords at
`artifacts/gen-ron-kai-app-v1/users/{uid}/profile/main.password` (and possibly
mirrored into the public `customApp` card via object spreads). These were
world-readable during the allow-true window → **all are compromised**.

- Risk: compromised credentials persist in Firestore until removed.
- Remediate by (server-side, future, gated): a one-time **Admin SDK** job to
  remove/blank the `password` field from every legacy `profile/main` and any
  public card that carries it. **No client-side admin operations**; no reading the
  password for any purpose; do not run destructive scripts without explicit
  approval and a backup.

## 4. Public directory field hygiene (MEDIUM)

The Friend ID login directories are public-read by design
(`public/data/customApp`, `public/data/teacherIndex`) so unauthenticated Friend ID
resolution works. They must expose only non-secret lookup/display fields
(`shortId, uid, name, avatar, color, xp, streak`) — never authority, answer, or
credential fields.

- Current posture: the deployed rules bind writes to the owner and ban
  authority/answer fields; `#21` additionally bans credential fields
  (`noSecretFields()`), but is not deployed.
- Action: audit live `customApp`/`teacherIndex` docs for any stray `password`/
  authority field (read-only audit; server-side); confirm the modern cutover's
  card writes carry only the safe fields (covered by `modernAuthApi` tests).

## 5. Teacher/admin custom claims (MEDIUM)

The hardened rules grant teacher/admin via `request.auth.token.teacher/admin`
only. If those claims are not provisioned in production, teacher flows (plan send,
vocabulary/bookShelf management) are denied after the modern users sign in.

- Action: confirm/provision claims via the controlled admin process
  (`TEACHER_CUSTOM_CLAIMS_PLAN.md`). Students can never self-grant (rules forbid
  client-set authority). This is independent of the `genronkai.miwa` UI bypass (§2).

## 6. Legacy login/roster retirement (HIGH — gating for #21)

After the modern cutover is the served default and stable, the legacy login UI,
the password roster (§1), and the `genronkai.miwa` bypass (§2) should be retired.

- Constraint: the legacy bundle is **imported, not broadly edited**. Retirement is
  best achieved by completing the React migration (so legacy is no longer loaded)
  OR a narrow, reviewed legacy change — a separate, explicitly-approved effort.
- Until retired, the emergency `?oriexLegacyFallback=1` path still reaches the
  legacy login; treat it as admin/dev-only and time-boxed.

## 7. `#21` (`noSecretFields()`) deployment prerequisites

`#21` denies any credential-field write. It must NOT deploy until ALL hold:

1. The modern cutover is the **served default** and **stable** in production.
2. The legacy plaintext-`password` writes are **removed/retired** (§1, §3, §6) —
   otherwise deploying `#21` would deny the legacy app's writes and break it.
3. `npm run test:rules` (emulator) **passes** for the live flows (needs Java).
4. **Explicit deploy approval** is given.

Only then: un-draft `#21`, deploy `firestore:rules`. Never before.

## 8. Firebase App Check (LOW — later hardening)

The web `apiKey` is public (safe by design; protection is rules + Auth). For
defense-in-depth against abuse of the Auth/Firestore endpoints, consider enabling
**Firebase App Check** (reCAPTCHA/AppAttest) in a later phase. Not required for v1;
no code/rules change here.

## Risk summary

| # | Risk | Severity | Retire/close by |
|---|------|----------|-----------------|
| 1 | Legacy password roster (plaintext shown) | HIGH | §3 + §6 |
| 2 | `genronkai.miwa` teacher bypass (client UI) | HIGH | §6 |
| 3 | Old plaintext `password` fields in Firestore | HIGH | §3 Admin-SDK removal (gated) |
| 4 | Public directory field hygiene | MEDIUM | §4 audit + #21 (later) |
| 5 | Teacher/admin custom claims provisioning | MEDIUM | §5 |
| 6 | Legacy login/roster retirement | HIGH | §6 (gates #21) |
| 7 | #21 deploy | — | §7 prerequisites |
| 8 | App Check | LOW | §8 later |

## Next concrete step (human)

1. Land + QA the default cutover (separate PR) so the modern flow is the served
   default and stable.
2. Plan the server-side (Admin SDK) removal of legacy plaintext `password` fields
   (§3) — design first, run only with approval + backup; no destructive scripts
   unattended.
3. Schedule legacy login/roster retirement (§6), then the gated `#21` deploy (§7).

No code, rules, or deploy are performed by this document.
