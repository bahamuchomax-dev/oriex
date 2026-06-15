/* ============================================================
 * webLlmEngineLoader — Phase 3B WebLLM spike (WebGPU first candidate)
 * ------------------------------------------------------------
 * Phase 6.1a: the WebLLM engine was REMOVED from the main Oriex app. The heavy
 * `@mlc-ai/web-llm` dependency was dropped and the dynamic import deleted, so
 * this loader no longer starts an engine. Browser-AI experiments continue in the
 * separate `oriex-embedded-ai-lab` repository.
 *
 * The exported constants/helpers below are kept so the hidden PoC panel still
 * builds and its static tests pass. registerWebLlmEngine() now registers a
 * loader that simply reports the engine is unavailable here. No prompt/generated
 * text is stored and no external AI API is called.
 * ============================================================ */
import { registerWebGpuEngineLoader } from "./webGpuEngineAdapter.js";

// Smallest practical instruct model from the installed prebuilt model list
// (verified, not guessed). 0.5B / q4f16, low_resource_required, ~945 MB VRAM.
export const WEBLLM_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const WEBLLM_PACKAGE = "@mlc-ai/web-llm";

// Where the model weights / runtime are fetched from (engine provider). These
// are model/runtime sources, NOT external AI API endpoints; input is not sent.
export const WEBLLM_MODEL_WEIGHTS_SOURCE =
  "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const WEBLLM_RUNTIME_SOURCE =
  "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/";

let wired = false;

/* Classify a WebLLM load failure into a stable, plain-string type so the PoC UI
 * can show a useful retry hint. Takes the raw error text/reason plus a small
 * device context; returns one of a fixed set of types. The raw message is an
 * engine/network error string — it never contains user input or output. */
export function classifyWebLlmLoadError(rawErrorOrReason, ctx = {}) {
  const msg = String(rawErrorOrReason == null ? "" : rawErrorOrReason);

  // Device gates first (these are determined before any fetch).
  if (ctx.secureContext === false) return "secure-context-required";
  if (ctx.online === false) return "offline";
  if (ctx.hasWebGpu === false) return "webgpu-unavailable";
  if (ctx.hasIndexedDb === false) return "indexeddb-unavailable";

  // The observed PC Chrome failure: Cache.add() hit a network error while the
  // engine was registering model/runtime bytes in Cache Storage.
  if (/Cache\.add\(\)|execute 'add' on 'Cache'/i.test(msg)) return "cache-add-network-error";
  if (/\btimeout\b|timed out/i.test(msg)) return "load-timeout";
  if (/network|fetch|failed to fetch|Cache|cache|load-failed/i.test(msg)) {
    return "model-fetch-or-cache-failed";
  }
  return "unknown-load-error";
}

/* Plain-text suggested next step for a given load-error type. */
export function suggestedActionForLoadError(errorType) {
  switch (errorType) {
    case "cache-add-network-error":
    case "model-fetch-or-cache-failed":
      return "retry-after-reload-or-clear-site-data";
    case "webgpu-unavailable":
      return "use-a-webgpu-capable-browser";
    case "indexeddb-unavailable":
      return "enable-storage-or-leave-private-mode";
    case "secure-context-required":
      return "open-over-https";
    case "offline":
      return "reconnect-and-retry";
    case "load-timeout":
      return "retry-on-a-faster-network";
    default:
      return "retry-after-reload";
  }
}

/* Register the WebLLM engine with the adapter. Cheap + idempotent: stores a
 * loader function only. The heavy import() happens inside that loader. */
export function registerWebLlmEngine() {
  if (wired) return;
  wired = true;
  // WebLLM engine removed from the main app (Phase 6.1a). The @mlc-ai/web-llm
  // dependency and its dynamic import were dropped; this loader now reports the
  // engine is unavailable here. Experiments live in oriex-embedded-ai-lab.
  registerWebGpuEngineLoader(async () => {
    throw new Error(
      "WebLLM engine removed from the main Oriex app; see oriex-embedded-ai-lab",
    );
  });
}

export function resetWebLlmEngineWiringForTests() {
  wired = false;
}
