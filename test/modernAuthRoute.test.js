import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  isModernAuthUrl,
  isModernAuthEnabled,
  MODERN_AUTH_FLAG,
} from "../src/features/auth/modernAuthRoute.js";

const MAIN = readFileSync("src/main.js", "utf8");
const loc = (over = {}) => ({ search: "", hash: "", ...over });

describe("isModernAuthUrl — opt-in route matcher", () => {
  it("is false for a normal visit", () => {
    expect(isModernAuthUrl(loc())).toBe(false);
    expect(isModernAuthUrl(loc({ search: "?tab=home" }))).toBe(false);
    expect(isModernAuthUrl(loc({ hash: "#home" }))).toBe(false);
  });
  it("matches the query form ?oriexModernAuth=1", () => {
    expect(isModernAuthUrl(loc({ search: "?oriexModernAuth=1" }))).toBe(true);
    expect(isModernAuthUrl(loc({ search: "?a=1&oriexModernAuth=1&b=2" }))).toBe(true);
  });
  it("matches the hash form #modern-auth", () => {
    expect(isModernAuthUrl(loc({ hash: "#modern-auth" }))).toBe(true);
    expect(isModernAuthUrl(loc({ hash: "modern-auth" }))).toBe(true);
  });
  it("does not match near-misses", () => {
    expect(isModernAuthUrl(loc({ search: "?oriexModernAuth=0" }))).toBe(false);
    expect(isModernAuthUrl(loc({ search: "?oriexModernAuth=2" }))).toBe(false);
    expect(isModernAuthUrl(loc({ hash: "#modern" }))).toBe(false);
    expect(isModernAuthUrl(loc({ search: "?oriexmodernauth=1" }))).toBe(false);
  });
  it("never throws on odd input", () => {
    for (const bad of [null, undefined, {}, { search: 123, hash: {} }]) {
      expect(isModernAuthUrl(bad)).toBe(false);
    }
  });
});

describe("isModernAuthEnabled — URL or localStorage opt-in", () => {
  const realWindow = globalThis.window;
  afterEach(() => {
    globalThis.window = realWindow;
  });
  it("true when the URL requests it (regardless of storage)", () => {
    expect(isModernAuthEnabled(loc({ search: "?oriexModernAuth=1" }))).toBe(true);
  });
  it("true when the localStorage opt-in is set", () => {
    const store = { [MODERN_AUTH_FLAG]: "1" };
    globalThis.window = { localStorage: { getItem: (k) => store[k] ?? null } };
    expect(isModernAuthEnabled(loc())).toBe(true);
  });
  it("false by default (no URL, no storage) and never throws", () => {
    globalThis.window = { localStorage: { getItem: () => null } };
    expect(isModernAuthEnabled(loc())).toBe(false);
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(isModernAuthEnabled(loc())).toBe(false);
  });
});

describe("main.js wiring — opt-in shell, preserved legacy boot", () => {
  it("imports the opt-in gate and mounts the shell only when enabled", () => {
    expect(MAIN).toContain('from "./features/auth/modernAuthRoute.js"');
    expect(MAIN).toMatch(/isModernAuthEnabled\(oriexLocation\)/);
    expect(MAIN).toContain('import("./features/auth/mountModernAuth.jsx")');
  });
  it("falls back to the legacy app on any shell-load failure (no white screen)", () => {
    // the modern-auth branch must call startLegacyApp() in its failure paths
    const branch = MAIN.slice(
      MAIN.indexOf("isModernAuthEnabled(oriexLocation)"),
      MAIN.indexOf("isEmbeddedAiPocUrl(oriexLocation)"),
    );
    expect(branch).toContain("startLegacyApp()");
  });
  it("modern cutover is the default boot (flag absent → cutover, not legacy)", () => {
    expect(MAIN).toContain("legacy/oriex-app.bundle.js"); // still imported for fallback
    // the final else now starts the modern cutover (legacy is emergency-only)
    expect(MAIN).toMatch(/} else \{[\s\S]*?startModernCutover\(\);/);
  });
});
