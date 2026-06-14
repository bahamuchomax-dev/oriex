import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  WEBLLM_MODEL_ID,
  WEBLLM_PACKAGE,
  registerWebLlmEngine,
  resetWebLlmEngineWiringForTests,
  classifyWebLlmLoadError,
  suggestedActionForLoadError,
} from "../src/features/embeddedAi/engines/webLlmEngineLoader.js";
import {
  loadWebGpuEmbeddedAiEngine,
  resetWebGpuEmbeddedAiEngineForTests,
} from "../src/features/embeddedAi/engines/webGpuEngineAdapter.js";

const LOADER_SRC = readFileSync("src/features/embeddedAi/engines/webLlmEngineLoader.js", "utf8");
const POC_PANEL_SRC = readFileSync("src/features/embeddedAi/EmbeddedAiPocPanel.jsx", "utf8");
const PKG = JSON.parse(readFileSync("package.json", "utf8"));

function stubDevice({ gpu = true, idb = true } = {}) {
  const navigator = { userAgent: "test" };
  if (gpu) navigator.gpu = {};
  vi.stubGlobal("navigator", navigator);
  vi.stubGlobal("indexedDB", idb ? {} : undefined);
}

beforeEach(() => {
  resetWebLlmEngineWiringForTests();
  resetWebGpuEmbeddedAiEngineForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetWebLlmEngineWiringForTests();
  resetWebGpuEmbeddedAiEngineForTests();
});

describe("webLlmEngineLoader — dynamic, never on import", () => {
  it("does not statically import the heavy library", () => {
    // no top-level `import ... from "@mlc-ai/web-llm"`
    expect(LOADER_SRC).not.toMatch(/import\s[^;]*from\s+["']@mlc-ai\/web-llm["']/);
    // the library is dynamic-imported (lazy chunk), inside the loader
    expect(LOADER_SRC).toMatch(/import\(\s*["']@mlc-ai\/web-llm["']\s*\)/);
  });

  it("uses a verified model id and the WebGPU adapter seam", () => {
    expect(typeof WEBLLM_MODEL_ID).toBe("string");
    expect(WEBLLM_MODEL_ID.length).toBeGreaterThan(0);
    expect(WEBLLM_PACKAGE).toBe("@mlc-ai/web-llm");
    expect(LOADER_SRC).toContain("registerWebGpuEngineLoader");
  });

  it("documents model/runtime sources (not external AI API endpoints)", () => {
    expect(LOADER_SRC).toMatch(/huggingface\.co/);
    expect(LOADER_SRC).toMatch(/raw\.githubusercontent\.com/);
  });

  it("does not store prompts or send anything from the loader", () => {
    expect(LOADER_SRC).not.toMatch(/localStorage/);
    expect(LOADER_SRC).not.toMatch(/\bfetch\s*\(/);
    expect(LOADER_SRC).not.toMatch(/firebase|firestore/i);
  });
});

describe("webLlmEngineLoader — registration is cheap, load is gated", () => {
  it("registering does not load on a non-WebGPU device (engine import not triggered)", async () => {
    stubDevice({ gpu: false, idb: true });
    registerWebLlmEngine();
    const r = await loadWebGpuEmbeddedAiEngine();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-webgpu"); // returns before the WebLLM import runs
  });

  it("is gated on IndexedDB too (graceful failure)", async () => {
    stubDevice({ gpu: true, idb: false });
    registerWebLlmEngine();
    const r = await loadWebGpuEmbeddedAiEngine();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-indexeddb");
  });

  it("is idempotent to register", () => {
    expect(() => {
      registerWebLlmEngine();
      registerWebLlmEngine();
    }).not.toThrow();
  });
});

describe("PoC panel wiring — load only on explicit action", () => {
  it("registers the engine on mount but loads only via a button handler", () => {
    expect(POC_PANEL_SRC).toContain("registerWebLlmEngine");
    // model load is behind an onClick handler, not called at module/render top level
    expect(POC_PANEL_SRC).toMatch(/onClick=\{loadModel\}/);
    expect(POC_PANEL_SRC).not.toMatch(/^\s*loadWebGpuEmbeddedAiEngine\(/m);
    // output stays plain text
    expect(POC_PANEL_SRC).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("package.json — spike dependency present", () => {
  it("declares @mlc-ai/web-llm as a dependency", () => {
    const deps = { ...(PKG.dependencies || {}), ...(PKG.devDependencies || {}) };
    expect(Object.keys(deps)).toContain("@mlc-ai/web-llm");
  });
});

describe("classifyWebLlmLoadError — failure classification (phase 3C-Fix1)", () => {
  it("maps the observed Cache.add network error", () => {
    const msg = "load-failed Failed to execute 'add' on 'Cache': Cache.add() encountered a network error";
    const type = classifyWebLlmLoadError(msg, {
      hasWebGpu: true,
      hasIndexedDb: true,
      secureContext: true,
      online: true,
    });
    expect(type).toBe("cache-add-network-error");
    expect(suggestedActionForLoadError(type)).toBe("retry-after-reload-or-clear-site-data");
  });

  it("prefers device-gate classifications when those are the cause", () => {
    expect(classifyWebLlmLoadError("x", { secureContext: false })).toBe("secure-context-required");
    expect(classifyWebLlmLoadError("x", { online: false })).toBe("offline");
    expect(classifyWebLlmLoadError("x", { hasWebGpu: false })).toBe("webgpu-unavailable");
    expect(classifyWebLlmLoadError("x", { hasIndexedDb: false })).toBe("indexeddb-unavailable");
  });

  it("classifies generic fetch/cache and timeout and unknown", () => {
    expect(classifyWebLlmLoadError("failed to fetch model", {})).toBe("model-fetch-or-cache-failed");
    expect(classifyWebLlmLoadError("request timed out", {})).toBe("load-timeout");
    expect(classifyWebLlmLoadError("something odd", {})).toBe("unknown-load-error");
  });

  it("returns plain-text suggested actions (no HTML)", () => {
    for (const t of [
      "cache-add-network-error",
      "webgpu-unavailable",
      "indexeddb-unavailable",
      "secure-context-required",
      "offline",
      "load-timeout",
      "unknown-load-error",
    ]) {
      const a = suggestedActionForLoadError(t);
      expect(typeof a).toBe("string");
      expect(a).not.toMatch(/<[a-z]/i);
    }
  });
});

describe("docs — real-device measurement still pending (phase 3D)", () => {
  it("records that real-device measurement is incomplete and PoC stays paused", () => {
    const results = readFileSync("docs/EMBEDDED_AI_DEVICE_RESULTS.md", "utf8");
    const plan = readFileSync("docs/EMBEDDED_AI_PLAN.md", "utf8");
    // measurement table still has unfilled rows
    expect(results).toMatch(/未測定|Not tested/);
    // plan states measurement incomplete / production UI still not allowed
    expect(plan).toMatch(/未完了|未測定|pending/i);
    expect(plan).toMatch(/Transformers\.js/);
  });
});
