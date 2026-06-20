import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const MAIN = readFileSync("src/main.js", "utf8");

describe("main.js wiring — modern cutover is the DEFAULT; legacy is emergency-only", () => {
  it("mounts the modern cutover by default (final else → startModernCutover)", () => {
    expect(MAIN).toContain('import("./features/auth/mountModernCutover.jsx")');
    expect(MAIN).toMatch(/} else \{[\s\S]*?startModernCutover\(\);/);
  });
  it("startModernCutover falls back to legacy only if the cutover chunk fails to load", () => {
    const fn = MAIN.slice(
      MAIN.indexOf("function startModernCutover"),
      MAIN.indexOf("const oriexLocation"),
    );
    expect(fn).toContain("startLegacyApp()");
  });
  it("the old legacy login is no longer the default — reachable ONLY via the emergency flag", () => {
    expect(MAIN).toContain('from "./features/auth/legacyFallbackRoute.js"');
    expect(MAIN).toMatch(/isLegacyFallbackEnabled\(oriexLocation\)/);
    // the no-flag path must NOT directly start the legacy app
    expect(MAIN).not.toMatch(/} else \{\s*startLegacyApp\(\);\s*}/);
    // the debug probe stays available
    expect(MAIN).toContain("isAuthBridgeEnabled(oriexLocation)");
  });
});

/* ---- security guards over the cutover's OWN files (not the legacy bundle) ---- */
const CUTOVER_FILES = [
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
  it("FRESH login: onAuthed calls startHandoff directly (immediate, not via effect re-run)", () => {
    const bridge = srcOf("src/features/auth/ModernCutoverBridge.jsx");
    // onAuthed both sets state AND kicks the idempotent handoff
    expect(bridge).toMatch(/onAuthed=\{\(u\) => \{[\s\S]*setUser\(u\);[\s\S]*startHandoff\(u\);[\s\S]*\}\}/);
    // a single idempotent trigger guarded against duplicate legacy imports
    expect(bridge).toMatch(/const startHandoff = useCallback\(\(u\) => \{/);
    expect(bridge).toMatch(/if \(!u \|\| startedRef\.current\) return;/);
    expect(bridge).toContain("handoffToLegacy(u)");
  });
  it("RESTORED session also hands off (observer + currentAuthUser fallback call startHandoff)", () => {
    const bridge = srcOf("src/features/auth/ModernCutoverBridge.jsx");
    expect(bridge).toMatch(/if \(u\)\s*\{?\s*startHandoff\(u\)/); // auth observer
    expect(bridge).toMatch(/const effectiveUser = user \|\| currentAuthUser\(\)/);
    expect(bridge).toMatch(/startHandoff\(effectiveUser\)/);
  });
  it("shows a 'checking login state' loading message (waits for auth restoration)", () => {
    const bridge = srcOf("src/features/auth/ModernCutoverBridge.jsx");
    expect(bridge).toContain("ログイン状態を確認中");
    // never imports legacy until auth is resolved with a user
    expect(bridge).toMatch(/if \(!ready\)/);
    expect(bridge).toMatch(/if \(!effectiveUser\)/);
  });
  it("returns to the MODERN login on logout (clears legacy session; legacy login is not terminal)", () => {
    const bridge = srcOf("src/features/auth/ModernCutoverBridge.jsx");
    // on sign-out AFTER a handoff: clear the legacy session, reset, show modern login
    expect(bridge).toContain("clearLegacyLocalSession");
    expect(bridge).toMatch(/window\.__oxUid = undefined/);
    expect(bridge).toMatch(/startedRef\.current = false;[\s\S]*setPhase\("signin"\)/);
  });
  it("seeds legacy's localStorage cache for reload (no password) and logs nothing", () => {
    const seed = srcOf("src/features/auth/legacyLocalSession.js");
    const code = seed.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(srcOf("src/features/auth/legacyHandoff.js")).toContain("seedLegacyLocalSession");
    expect(code).toContain('"genron_"');
    expect(code).not.toMatch(/\.password\b/);
    expect(code).not.toMatch(/\bpassword\s*:/);
    expect(code).not.toMatch(/console\s*\./);
    // localStorage only — no Firestore in the seed module
    for (const banned of ["getDoc", "setDoc", "firestore"]) expect(code.toLowerCase()).not.toContain(banned.toLowerCase());
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
  it("documents the DEFAULT FLIP, the emergency fallback, and keeps #21 blocked", () => {
    expect(doc).toMatch(/DEFAULT FLIP|default login/i);
    expect(doc).toContain("oriexLegacyFallback"); // emergency fallback documented
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/blocked|not deployed|not be deployed/i);
    expect(doc).toMatch(/git revert/i); // rollback documented
  });
});
