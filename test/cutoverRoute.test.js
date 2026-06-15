import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  isModernCutoverUrl,
  isModernCutoverEnabled,
  MODERN_CUTOVER_FLAG,
} from "../src/features/auth/cutoverRoute.js";

const MAIN = readFileSync("src/main.js", "utf8");
const loc = (over = {}) => ({ search: "", hash: "", ...over });

describe("isModernCutoverUrl — opt-in cutover route matcher", () => {
  it("is false for a normal visit and other flags", () => {
    expect(isModernCutoverUrl(loc())).toBe(false);
    expect(isModernCutoverUrl(loc({ search: "?oriexAuthBridge=1" }))).toBe(false);
    expect(isModernCutoverUrl(loc({ search: "?oriexModernAuth=1" }))).toBe(false);
  });
  it("matches ?oriexModernCutover=1 and #modern-cutover", () => {
    expect(isModernCutoverUrl(loc({ search: "?oriexModernCutover=1" }))).toBe(true);
    expect(isModernCutoverUrl(loc({ search: "?a=1&oriexModernCutover=1" }))).toBe(true);
    expect(isModernCutoverUrl(loc({ hash: "#modern-cutover" }))).toBe(true);
  });
  it("never throws on odd input", () => {
    for (const bad of [null, undefined, {}, { search: 1, hash: {} }]) {
      expect(isModernCutoverUrl(bad)).toBe(false);
    }
  });
});

describe("isModernCutoverEnabled — URL or localStorage opt-in", () => {
  const realWindow = globalThis.window;
  afterEach(() => {
    globalThis.window = realWindow;
  });
  it("true via URL, true via localStorage, false by default, never throws", () => {
    expect(isModernCutoverEnabled(loc({ search: "?oriexModernCutover=1" }))).toBe(true);
    globalThis.window = { localStorage: { getItem: (k) => (k === MODERN_CUTOVER_FLAG ? "1" : null) } };
    expect(isModernCutoverEnabled(loc())).toBe(true);
    globalThis.window = { localStorage: { getItem: () => null } };
    expect(isModernCutoverEnabled(loc())).toBe(false);
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(isModernCutoverEnabled(loc())).toBe(false);
  });
});

describe("main.js wiring — cutover is opt-in; default boot stays legacy", () => {
  it("imports the gate and mounts the cutover only when enabled", () => {
    expect(MAIN).toContain('from "./features/auth/cutoverRoute.js"');
    expect(MAIN).toMatch(/isModernCutoverEnabled\(oriexLocation\)/);
    expect(MAIN).toContain('import("./features/auth/mountModernCutover.jsx")');
  });
  it("falls back to legacy if the cutover fails to load", () => {
    const branch = MAIN.slice(
      MAIN.indexOf("isModernCutoverEnabled(oriexLocation)"),
      MAIN.indexOf("isAuthBridgeEnabled(oriexLocation)"),
    );
    expect(branch).toContain("startLegacyApp()");
  });
  it("keeps the debug probe (?oriexAuthBridge=1) available and legacy as default", () => {
    expect(MAIN).toContain("isAuthBridgeEnabled(oriexLocation)");
    expect(MAIN).toContain("legacy/oriex-app.bundle.js");
    expect(MAIN).toMatch(/}\s*else\s*{\s*startLegacyApp\(\);\s*}/);
  });
});

/* ---- security guards over the cutover's OWN files (not the legacy bundle) ---- */
const CUTOVER_FILES = [
  "src/features/auth/cutoverRoute.js",
  "src/features/auth/ModernCutoverBridge.jsx",
  "src/features/auth/mountModernCutover.jsx",
  "src/features/auth/legacyHandoff.js",
];
const srcOf = (p) => readFileSync(p, "utf8");

describe("cutover bridge — safe by construction", () => {
  it("reads no `.password`, does no plaintext compare, writes no `password:` field", () => {
    for (const f of CUTOVER_FILES) {
      const s = srcOf(f);
      expect(s).not.toMatch(/\.password\b/);
      expect(s).not.toMatch(/\.password\s*[!=]==?/);
      expect(s).not.toMatch(/\bpassword\s*:/);
    }
  });
  it("logs nothing (no console.*) in the cutover modules", () => {
    for (const f of CUTOVER_FILES) {
      const s = srcOf(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      expect(s).not.toMatch(/console\s*\./);
    }
  });
  it("ensures the legacy profile and imports the (unedited) legacy bundle", () => {
    // runtime order (ensure → import) is verified behaviourally in
    // test/legacyHandoff.test.js via invocationCallOrder; here we just assert the
    // handoff both ensures the profile and imports (not edits) the bundle.
    const handoff = srcOf("src/features/auth/legacyHandoff.js");
    expect(handoff).toContain("ensureLegacyBridgeProfile(uid)");
    expect(handoff).toContain('import("../../legacy/oriex-app.bundle.js")');
  });
  it("the cutover bridge has no debug overlay (uses handoffToLegacy, renders null when mounted)", () => {
    const bridge = srcOf("src/features/auth/ModernCutoverBridge.jsx");
    expect(bridge).toContain("handoffToLegacy");
    expect(bridge).not.toContain("Bridge Probe"); // no debug observations banner
    expect(bridge).toMatch(/phase === "mounted"\)\s*return null/);
  });
});

describe("cutover plan doc — manual PASS + flag + #21 recorded", () => {
  const doc = readFileSync("MODERN_AUTH_CUTOVER_PLAN.md", "utf8");
  it("records the manual PASS and the opt-in cutover flag + how to test", () => {
    expect(doc).toMatch(/Manual PASS/i);
    expect(doc).toContain("oriexModernCutover");
    expect(doc).toMatch(/How to test/i);
    expect(doc).toMatch(/oriexAuthBridge/); // debug probe still documented/available
  });
  it("documents when it can become default and keeps #21 blocked", () => {
    expect(doc).toMatch(/become the default|default-flip/i);
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/NOT flip|not the default|do not flip/i);
  });
});
