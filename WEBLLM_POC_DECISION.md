# WebLLM PoC — Isolation / Removal Decision (Phase 6)

- Date: 2026-06-15
- Audited commit (main): `812367e`
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

## Determination (Phase 6 questions)

| Question | Answer |
| --- | --- |
| Reachable from normal student UI? | **No** — no tab/button/link; hidden URL gate only. |
| Reachable from normal teacher UI? | **No** — same; not wired into any teacher screen. |
| Hidden URL only? | **Yes** — `?oriexProbe=embedded-ai-poc` / `#embedded-ai-poc` (PoC) and `?oriexProbe=embedded-ai` (device probe). |
| Feature-flagged? | Local AI (Ollama) UI: **flag off** (`LOCAL_AI_UI_ENABLED = false`). Embedded-AI PoC: URL-gated (no normal entry). |
| Stores prompt/generated text? | **No** — verified: no `localStorage`/`sessionStorage`/IndexedDB writes of prompt or output in `src/features/embeddedAi` or `src/features/localAi`. |
| Calls external AI APIs? | **No** — no OpenAI/Anthropic/Gemini. WebLLM fetches model weights/runtime from HF/MLC CDNs; local AI talks only to `localhost:11434`/`127.0.0.1:11434` (and blocks external URLs). Inference is on-device. |
| Downloads/caches large models? | **Yes, but only on the hidden PoC** — WebLLM downloads a ~0.5B model and caches weights/runtime in IndexedDB/Cache Storage when the user explicitly loads it. Never on a normal visit. |
| Affects normal bundle size / initial load? | **No** — `@mlc-ai/web-llm` is loaded via a runtime **dynamic `import()`**, so it is code-split into a lazy chunk fetched only on the hidden PoC; it is not in the initial bundle and does not load on a normal visit. |

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

## Phase 6.1a — WebLLM engine dependency removed (this PR)

A minimal first step toward Option B (full removal). Done here:

- Removed the `@mlc-ai/web-llm` dependency from `package.json` / `package-lock.json`.
- Neutralized `src/features/embeddedAi/engines/webLlmEngineLoader.js`: the
  `await import("@mlc-ai/web-llm")` and engine creation were deleted;
  `registerWebLlmEngine()` now registers a loader that reports the engine is
  unavailable in the main app. Exported constants/helpers are kept so the hidden
  PoC panel still builds and its static tests pass.
- Deleted the dedicated `test/embeddedAiWebLlmEngine.test.js` (it asserted the
  removed dynamic import and the removed dependency).

Deliberately NOT done in this PR (deferred to a later, separately-confirmed PR):

- Full deletion of `src/features/embeddedAi` and `src/features/localAi`.
- Editing the coupled non-PoC tests (`reactMigrationPlan`, `profileReactMigration`,
  `recordsReactMigration`, `reviewReactMigration`, `appShellStatic`,
  `pdfTextExtractor`) that currently assert those PoC files exist.
- Removing `pdfjs-dist` (used only by `localAi/pdfTextExtractor.js`).

Result: the heaviest browser-AI dependency is gone from the main app and the
embedded-AI PoC can no longer start a WebLLM engine. Browser-AI / WebLLM
experiments continue in the `oriex-embedded-ai-lab` repository. No external AI
API, API key, `.env`, service account, or model weights were added; no
prompt/generated text is stored in the main app.
