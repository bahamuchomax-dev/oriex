import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  TRANSFORMERS_FALLBACK_PROMPT_MAX_LENGTH,
  registerTransformersFallbackLoader,
  loadTransformersFallbackEngine,
  generateWithTransformersFallback,
  resetTransformersFallbackEngineForTests,
} from "../src/features/embeddedAi/engines/transformersFallbackAdapter.js";

const ADAPTER_PATH = "src/features/embeddedAi/engines/transformersFallbackAdapter.js";
const ADAPTER = readFileSync(ADAPTER_PATH, "utf8");
const PLAN = readFileSync("docs/EMBEDDED_AI_PLAN.md", "utf8");
const RESULTS = readFileSync("docs/EMBEDDED_AI_DEVICE_RESULTS.md", "utf8");

beforeEach(() => resetTransformersFallbackEngineForTests());
afterEach(() => resetTransformersFallbackEngineForTests());

describe("transformersFallbackAdapter — static safety", () => {
  it("exists and exposes the seam API", () => {
    expect(existsSync(ADAPTER_PATH)).toBe(true);
    expect(typeof loadTransformersFallbackEngine).toBe("function");
    expect(typeof generateWithTransformersFallback).toBe("function");
    expect(typeof resetTransformersFallbackEngineForTests).toBe("function");
  });

  it("does not statically import a heavy inference library", () => {
    expect(ADAPTER).not.toMatch(
      /import\s[^;]*from\s+["'][^"']*(transformers|onnxruntime|@xenova|@huggingface|web-llm|mediapipe)/i,
    );
    expect(ADAPTER).toContain("registerTransformersFallbackLoader");
  });

  it("has no external AI endpoint, API key, or raw-HTML sink", () => {
    expect(ADAPTER).not.toMatch(/openai|anthropic|gemini|googleapis/i);
    expect(ADAPTER).not.toMatch(/api[_-]?key/i);
    expect(ADAPTER).not.toContain("dangerouslySetInnerHTML");
    expect(ADAPTER).not.toMatch(/\.innerHTML\s*=/);
    expect(ADAPTER).not.toMatch(/localStorage/);
    expect(ADAPTER).not.toMatch(/firebase|firestore/i);
    expect(ADAPTER).not.toMatch(/\bfetch\s*\(/);
  });

  it("keeps the small input cap", () => {
    expect(TRANSFORMERS_FALLBACK_PROMPT_MAX_LENGTH).toBe(800);
  });
});

describe("transformersFallbackAdapter — graceful not-enabled + behaviour", () => {
  it("returns a graceful not-enabled result when nothing is wired", async () => {
    const r = await loadTransformersFallbackEngine();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("transformers-fallback-not-enabled");
    expect(r.message).toMatch(/not enabled/i);
  });

  it("rejects an empty prompt", async () => {
    const r = await generateWithTransformersFallback("   ");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-prompt");
  });

  it("clamps a long prompt before handing it to a wired engine", async () => {
    let seen = "";
    registerTransformersFallbackLoader(async () => ({
      generate: async (p) => {
        seen = p;
        return "復習1\n復習2\n復習3\n復習4";
      },
    }));
    const r = await generateWithTransformersFallback("あ".repeat(2000));
    expect(r.ok).toBe(true);
    expect(seen.length).toBe(TRANSFORMERS_FALLBACK_PROMPT_MAX_LENGTH);
    // output trimmed to <= 3 plain-text lines
    expect(r.text.split("\n").length).toBeLessThanOrEqual(3);
  });

  it("shares one in-flight load and fails gracefully when the loader throws", async () => {
    let calls = 0;
    registerTransformersFallbackLoader(async () => {
      calls += 1;
      await new Promise((res) => setTimeout(res, 5));
      return { generate: async () => "ok" };
    });
    const [a, b] = await Promise.all([
      loadTransformersFallbackEngine(),
      loadTransformersFallbackEngine(),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(calls).toBe(1);

    resetTransformersFallbackEngineForTests();
    registerTransformersFallbackLoader(async () => {
      throw new Error("boom");
    });
    const f = await loadTransformersFallbackEngine();
    expect(f.ok).toBe(false);
    expect(f.reason).toBe("transformers-fallback-load-failed");
  });
});

describe("docs — WebLLM vs Transformers.js roles, measurement pending", () => {
  it("documents the role split and the candidate table", () => {
    expect(PLAN).toMatch(/Transformers\.js/);
    expect(PLAN).toMatch(/WebLLM/);
    expect(PLAN).toMatch(/未完了|未測定|pending/i);
    expect(RESULTS).toMatch(/Phase 3E Transformers\.js Fallback Candidate/);
  });
});
