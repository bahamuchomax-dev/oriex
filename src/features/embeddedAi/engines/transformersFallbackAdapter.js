/* ============================================================
 * transformersFallbackAdapter — Phase 3E WASM/Transformers.js fallback seam
 * ------------------------------------------------------------
 * Fallback path for when the WebGPU/WebLLM engine is unavailable or too slow on
 * a device (notably uncertain iOS Safari performance). It targets a small
 * Transformers.js-style / WASM model that can run without WebGPU.
 *
 * Phase 3E adds the SEAM ONLY — no dependency, no model, nothing bundled. With
 * nothing wired it returns a graceful not-enabled result (never throws, never a
 * white screen). A future engine is plugged in via
 * registerTransformersFallbackLoader(loader), where `loader` does a dynamic
 * import() of its library inside itself so nothing lands in the initial bundle.
 *
 * Hard rules (same posture as the WebGPU adapter):
 *   - no static import of any inference library,
 *   - load only on explicit opt-in,
 *   - concurrent loads share one in-flight Promise,
 *   - input is short text only (clamped); output is plain text only,
 *   - nothing talks to an external AI API; input never leaves the device,
 *   - input/output bodies are never written to a diagnostic log.
 * ============================================================ */

// Same small input cap as the WebGPU path.
export const TRANSFORMERS_FALLBACK_PROMPT_MAX_LENGTH = 800;

let engineLoader = null; // future real engine loader (dynamic-imports its lib)
let enginePromise = null;
let engine = null;

/* Wire a real fallback engine later. `loader` must dynamic-import its library
 * inside itself so the initial bundle is unaffected, and resolve to an object
 * with a `generate(prompt)` method. */
export function registerTransformersFallbackLoader(loader) {
  engineLoader = typeof loader === "function" ? loader : null;
}

/* Load the fallback engine on demand. Graceful + shared in-flight. */
export async function loadTransformersFallbackEngine(options = {}) {
  if (engine) return { ok: true, engine, cached: true };
  if (!engineLoader) {
    // Phase 3E: no fallback engine/library is wired yet. Expected, not a crash.
    return {
      ok: false,
      reason: "transformers-fallback-not-enabled",
      message: "Transformers.js fallback is not enabled yet.",
    };
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      const e = await engineLoader(options);
      if (!e || typeof e.generate !== "function") {
        throw new Error("invalid transformers fallback engine");
      }
      return e;
    })();
  }
  try {
    engine = await enginePromise;
    return { ok: true, engine, cached: false };
  } catch (err) {
    enginePromise = null; // allow a later retry
    return {
      ok: false,
      reason: "transformers-fallback-load-failed",
      message: (err && err.message) || String(err),
    };
  }
}

/* Generate short text via the fallback. Clamps input; returns { ok, text } or a
 * graceful { ok:false, reason, message }. */
export async function generateWithTransformersFallback(prompt, options = {}) {
  const text =
    typeof prompt === "string" ? prompt.slice(0, TRANSFORMERS_FALLBACK_PROMPT_MAX_LENGTH) : "";
  if (!text.trim()) {
    return { ok: false, reason: "empty-prompt", message: "メモを入力してください。" };
  }
  const loaded = await loadTransformersFallbackEngine(options);
  if (!loaded.ok) return loaded;
  try {
    const out = await loaded.engine.generate(text, options);
    const plain = typeof out === "string" ? out : String(out ?? "");
    const threeLines = plain
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join("\n");
    return { ok: true, text: threeLines };
  } catch (err) {
    return {
      ok: false,
      reason: "transformers-fallback-generate-failed",
      message: (err && err.message) || String(err),
    };
  }
}

/* Test seam. */
export function resetTransformersFallbackEngineForTests() {
  engineLoader = null;
  enginePromise = null;
  engine = null;
}
