# Security Audit (main app hardening pass)

- Audit date: 2026-06-15
- Audited commit (main): `5e76e50` ("Improve WebLLM PoC load failure diagnostics")
- Branch: `security-hardening-main-audit`
- Scope: minimal, reviewable security-hardening changes only. No UI redesign, no
  large rewrites, no dependency removal, no runtime behavior change.

## Summary of findings

1. Browser-AI experiment code is present but already isolated:
   - Local AI (Ollama) UI is disabled via `LOCAL_AI_UI_ENABLED = false`
     (`src/features/localAi/uiFlag.js`); the Ollama client only ever talks to
     `http://localhost:11434` / `http://127.0.0.1:11434` and explicitly blocks
     `https`/external URLs (`src/features/localAi/localAiClient.js`).
   - Embedded-AI WebGPU/WebLLM PoC and the device probe are hidden, URL-gated
     routes only (`?oriexProbe=embedded-ai-poc` / `#embedded-ai-poc`,
     `?oriexProbe=embedded-ai`), lazy-loaded, and never part of the normal
     student/teacher UI (`src/main.js`).
   - `@mlc-ai/web-llm` IS used by the hidden PoC, so it is **not** unused;
     removing it would be a large change and is intentionally **out of scope**
     for this minimal PR (tracked as a possible separate PR).
2. No external AI API and no API keys: the AI features download model assets
   (Hugging Face / MLC CDNs) or talk to a local Ollama; there are no
   OpenAI/Anthropic/Gemini endpoints and no AI API keys in source.
3. No prompt/generated text persistence: the embedded-AI code only
   feature-detects `indexedDB` (`embeddedAiDevice.js`); it does not store prompt
   or generated text in localStorage/sessionStorage/IndexedDB.
4. Dangerous DOM APIs exist only in frozen legacy / third-party assets:
   `src/legacy/oriex-app.bundle.js`, `public/three.min.js`, `legacy-dist/*`.
   Non-legacy React source has **no** `dangerouslySetInnerHTML` / `innerHTML` /
   `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval` / `new Function`
   / quoted `javascript:` usage. (Matches in `src/services/repository/*` are
   safe comments documenting that such schemes are stripped.)
5. Firestore Rules are strong and were left unchanged (see below).
6. CSP is intentionally minimal; a strict `script-src` is deferred because of an
   inline portrait-lock script and legacy dynamic scripts (see
   `docs/XSS_AUDIT.md`).

## What was changed (fixed / hardened) in this PR

- Added a security/scope comment to the two AI gate points stating that
  browser-AI experiments belong in the separate repo `oriex-embedded-ai-lab`,
  and that the main-app PoC/local-AI paths must remain disabled / isolated and
  not exposed in the normal UI:
  - `src/features/localAi/uiFlag.js`
  - `src/features/embeddedAi/embeddedAiPocRoute.js`
- Extended `scripts/securityScan.mjs` (no behavior change to existing checks;
  scan still reports FAIL 0 on this repo):
  - Dangerous DOM / code-exec API detection (`dangerouslySetInnerHTML`,
    `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`,
    `new Function(`, quoted `javascript:`), scoped to non-legacy `src/**`
    (excludes `src/legacy/**` and `*.min.js`) to avoid false positives.
  - Model-weight file ban (`.onnx` / `.gguf` / `.safetensors` / `.bin`).
  - `.env` / `.env.*` ban (only `.env.example` allowed).
- Added this `SECURITY_AUDIT.md`.

No runtime behavior changed. `package.json` / `package-lock.json` untouched.
Firestore Rules untouched. CSP untouched.

## Firestore Rules verification (unchanged, preserved)

`firestore.rules` already enforces:
- Roles from server-set custom claims (`request.auth.token.teacher/admin`), not
  client-writable fields.
- Profile self-update whitelist — a student cannot set
  `role` / `isTeacher` / `teacherId` / `admin` or invent fields.
- `noAnswerFields()` blocks answer/solution fields on student-visible docs.
- `teacherProblemAnswers` readable only by the owning teacher or an admin;
  students can never read answers.
- Default-deny on everything else.

Rules tests: `test/firestoreRulesStatic.test.js` (static) and
`test/firestoreRules.emulator.test.js` (needs the Firestore emulator + Java; run
locally with `npm run test:rules`). The emulator test is kept manual because CI
does not provision the emulator reliably here.

## Remaining / known risks (not changed in this PR)

- Legacy XSS surface: `src/legacy/oriex-app.bundle.js`, `public/three.min.js`,
  `legacy-dist/*` contain `innerHTML`/`document.write`. These are frozen/minified
  and were intentionally not modified (would require a non-minimal rewrite).
- CSP cannot adopt a strict `script-src` until the inline portrait-lock script
  and legacy dynamic scripts are removed/refactored (deferred; see
  `docs/XSS_AUDIT.md`).
- Pre-existing CI is RED on `main` (independent of this PR):
  - `npm run lint`: ~670 problems (legacy/source lint debt).
  - `npm run test`: 2 failing files — `firebaseSecurity.test.js`
    (`onSnapshot` guardrail flags `src/features/dm/dmApi.js` +3) and
    `secretScanStatic.test.js` (a `SyntaxError` parsing the test file).
  These are out of scope for a minimal security PR and are documented here rather
  than "fixed to make CI pass" (and no tests were removed).

## PR #2 CI follow-up (Phase 2A)

- CI step order was changed so `security:scan` and `build` run **before**
  `test` and `lint` (`.github/workflows/ci.yml`). The security checks now
  execute in CI even though the pre-existing legacy `lint`/`test` debt can still
  fail later in the run. No steps were removed; lint/test were not weakened.
- The pre-existing `secretScanStatic.test.js` failure was fixed at its root: the
  imported `scripts/securityScan.mjs` started with a `#!/usr/bin/env node`
  shebang. Node and standalone esbuild strip a shebang, but Vitest's vite-node
  transform did not strip it when the file is imported by a test, so V8 reported
  a spurious `SyntaxError: Invalid or unexpected token`. The shebang was removed
  (the script is run via `node scripts/securityScan.mjs`); no assertions, banned
  patterns, or scan coverage were changed. `secretScanStatic.test.js` now passes
  (17/17).
- `lint` remains RED due to ~670 pre-existing issues (unchanged here).
- The `onSnapshot` guardrail in `firebaseSecurity.test.js` remains RED and is
  intentionally left for a separate follow-up PR (see remaining risks above).
- Expectation: in CI, `security:scan` and `build` now run (and pass) before the
  pre-existing `test`/`lint` failures are reached.

## Next steps (separate PRs)

- Optionally remove `@mlc-ai/web-llm` and the PoC engine code entirely if the
  PoC is no longer wanted in the main app (larger change).
- Address the pre-existing lint debt and the two failing tests
  (`onSnapshot` usage in `src/features/dm/*` and the `secretScanStatic` parse
  error) so CI can go green.
- Refactor the inline portrait-lock script so a strict `script-src` CSP becomes
  possible.

## Commands run (this audit)

- `npm ci` — exit 0
- `npm run security:scan` — exit 0 (FAIL 0, WARN 2: Firebase web apiKey, allowed)
- `npm run build` — exit 0 (chunk-size warning only)
- `npm run lint` — exit 1 (pre-existing; ~670 problems)
- `npm run test` — exit 1 (pre-existing; 2 failing files documented above)
- `npm run test:rules` — manual only (needs Firestore emulator + Java)

## Confirmation

- No external AI API added.
- No API keys added.
- No `.env` added.
- No Firebase Admin credentials / service-account JSON added.
- No model weight files added.
- No teacher answer exposure introduced; Firestore Rules unchanged.
- No student privilege escalation introduced; Rules unchanged.
- No dangerous DOM API introduced (non-legacy source remains clean).
- App still builds.
