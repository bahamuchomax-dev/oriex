# WebLLM PoC — Isolation / Removal Decision (Phase 5)

- Date: 2026-06-15
- Audited commit (main): `09779a6`
- Scope: decide whether the WebLLM / browser-AI PoC belongs in the main Oriex app
  now that the separate `oriex-embedded-ai-lab` repository exists.

## What exists today

- Dependency: `@mlc-ai/web-llm@^0.2.84` (`package.json`).
- Used only by the **hidden** embedded-AI PoC:
  - `src/features/embeddedAi/engines/webLlmEngineLoader.js` loads it via a
    **dynamic** `await import("@mlc-ai/web-llm")` inside a loader that runs ONLY
    on an explicit user action (no top-level import; not in the initial bundle).
  - Reached ONLY via hidden URL gates (`?oriexProbe=embedded-ai-poc` /
    `#embedded-ai-poc`, and the device probe `?oriexProbe=embedded-ai`); never a
    tab, button, or link in the normal student/teacher UI (`src/main.js`).
- Local AI (Ollama) UI is separately disabled via
  `src/features/localAi/uiFlag.js` (`LOCAL_AI_UI_ENABLED = false`).

## Safety facts (verified)

- **Not reachable from normal UI** — hidden URL only, lazy-loaded.
- **Disabled/gated** — embedded-AI PoC is URL-gated; local-AI UI flag is off.
- **No prompt/generated text persistence** — inference runs on-device (WebGPU);
  output is returned to the PoC view, not written to localStorage/sessionStorage/
  IndexedDB. (The library caches model **weights/runtime** in IndexedDB/Cache
  Storage — assets only, not user text.)
- **No external AI API** — model weights/runtime are fetched from the engine
  provider CDNs (`huggingface.co/mlc-ai/...`, `raw.githubusercontent.com/mlc-ai/...`);
  user input is processed on-device and is never sent to an AI API.
- Guard tests already exist: `test/localAiUiPause.test.js`,
  `test/embeddedAiPocStatic.test.js`, `test/embeddedAiStatic.test.js`.

## Options

- **A. Keep isolated (status quo).** Leave the PoC in main, hidden/gated, with
  guard tests. Lowest risk/effort; dependency remains.
- **B. Remove from main; keep experiments only in `oriex-embedded-ai-lab`.**
  Remove `@mlc-ai/web-llm` and the `src/features/embeddedAi` engine/PoC code and
  routes; update `package-lock.json`. Cleanest end state, but a larger,
  delete-bearing change.
- **C. Build-time flag.** Tree-shake the PoC out of production builds behind a
  compile-time flag while keeping the source. Middle ground; adds config
  complexity.

## Recommendation

- **Short term: Option A (keep isolated).** It is already safe (hidden, gated,
  no external AI API, no text persistence) and guarded by tests. No change needed
  to ship the current security-hardening work.
- **Target end state: Option B (remove from main).** Now that
  `oriex-embedded-ai-lab` is the dedicated home for browser-AI experiments, the
  main app should eventually drop `@mlc-ai/web-llm` and the PoC code to shrink the
  dependency/attack surface.
- **Removal requires explicit confirmation** (absolute constraint: no delete
  without confirmation). When confirmed, do Option B in a **separate PR**:
  remove the dependency + all `embeddedAi` PoC engine/route references, update the
  lockfile, then run `security:scan` / `build` / `test` / `lint` and confirm the
  app still builds and no dangling imports remain.

## If staying on Option A (until B is confirmed)

- Keep `LOCAL_AI_UI_ENABLED = false`.
- Keep the PoC URL-gated and lazy; do not wire it into navigation or default flags.
- Keep the guard tests green (UI does not expose the PoC).
