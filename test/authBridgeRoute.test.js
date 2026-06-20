import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  isAuthBridgeUrl,
  isAuthBridgeEnabled,
  AUTH_BRIDGE_FLAG,
} from "../src/features/auth/authBridgeRoute.js";

const MAIN = readFileSync("src/main.js", "utf8");
const loc = (over = {}) => ({ search: "", hash: "", ...over });

describe("isAuthBridgeUrl — opt-in probe route matcher", () => {
  it("is false for a normal visit", () => {
    expect(isAuthBridgeUrl(loc())).toBe(false);
    expect(isAuthBridgeUrl(loc({ search: "?tab=home" }))).toBe(false);
    expect(isAuthBridgeUrl(loc({ search: "?oriexModernAuth=1" }))).toBe(false);
  });
  it("matches ?oriexAuthBridge=1 and #auth-bridge-probe", () => {
    expect(isAuthBridgeUrl(loc({ search: "?oriexAuthBridge=1" }))).toBe(true);
    expect(isAuthBridgeUrl(loc({ search: "?a=1&oriexAuthBridge=1" }))).toBe(true);
    expect(isAuthBridgeUrl(loc({ hash: "#auth-bridge-probe" }))).toBe(true);
  });
  it("does not match near-misses and never throws", () => {
    expect(isAuthBridgeUrl(loc({ search: "?oriexAuthBridge=0" }))).toBe(false);
    expect(isAuthBridgeUrl(loc({ hash: "#auth-bridge" }))).toBe(false);
    for (const bad of [null, undefined, {}, { search: 1, hash: {} }]) {
      expect(isAuthBridgeUrl(bad)).toBe(false);
    }
  });
});

describe("isAuthBridgeEnabled — URL or localStorage opt-in", () => {
  const realWindow = globalThis.window;
  afterEach(() => {
    globalThis.window = realWindow;
  });
  it("true via URL, true via localStorage, false by default, never throws", () => {
    expect(isAuthBridgeEnabled(loc({ search: "?oriexAuthBridge=1" }))).toBe(true);
    globalThis.window = { localStorage: { getItem: (k) => (k === AUTH_BRIDGE_FLAG ? "1" : null) } };
    expect(isAuthBridgeEnabled(loc())).toBe(true);
    globalThis.window = { localStorage: { getItem: () => null } };
    expect(isAuthBridgeEnabled(loc())).toBe(false);
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(isAuthBridgeEnabled(loc())).toBe(false);
  });
});

describe("main.js wiring — probe is opt-in; default boot stays legacy", () => {
  it("imports the gate and mounts the probe only when enabled", () => {
    expect(MAIN).toContain('from "./features/auth/authBridgeRoute.js"');
    expect(MAIN).toMatch(/isAuthBridgeEnabled\(oriexLocation\)/);
    expect(MAIN).toContain('import("./features/auth/mountAuthBridgeProbe.jsx")');
  });
  it("falls back to the legacy app if the probe fails to load", () => {
    const branch = MAIN.slice(
      MAIN.indexOf("isAuthBridgeEnabled(oriexLocation)"),
      MAIN.indexOf("isModernAuthEnabled(oriexLocation)"),
    );
    expect(branch).toContain("startLegacyApp()");
  });
  it("modern cutover is the default boot (no flag → cutover, not legacy)", () => {
    expect(MAIN).toContain("legacy/oriex-app.bundle.js"); // still imported for fallback
    expect(MAIN).toMatch(/} else \{[\s\S]*?startModernCutover\(\);/);
  });
});

/* ---- security guards over the probe's OWN files (not the legacy bundle) ---- */
const PROBE_FILES = [
  "src/features/auth/authBridgeRoute.js",
  "src/features/auth/AuthBridgeProbe.jsx",
  "src/features/auth/mountAuthBridgeProbe.jsx",
];
const srcOf = (p) => readFileSync(p, "utf8");

describe("auth bridge probe — safe by construction", () => {
  it("reads no `.password` field and does no plaintext password compare", () => {
    for (const f of PROBE_FILES) {
      const s = srcOf(f);
      expect(s).not.toMatch(/\.password\b/); // no credential field read
      expect(s).not.toMatch(/\.password\s*[!=]==?/); // no plaintext compare
    }
  });
  it("does no Firestore read/write (no getDoc/setDoc/onSnapshot) and writes no password", () => {
    for (const f of PROBE_FILES) {
      const s = srcOf(f);
      for (const banned of ["getDoc", "setDoc", "onSnapshot", "password:"]) {
        expect(s).not.toContain(banned);
      }
    }
  });
  it("logs nothing (no console.*) in the probe modules", () => {
    for (const f of PROBE_FILES) {
      const s = srcOf(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      expect(s).not.toMatch(/console\s*\./);
    }
  });
  it("starts legacy by importing (not editing) the bundle, leaving #root for it", () => {
    const probe = srcOf("src/features/auth/AuthBridgeProbe.jsx");
    expect(probe).toContain('import("../../legacy/oriex-app.bundle.js")');
    const mount = srcOf("src/features/auth/mountAuthBridgeProbe.jsx");
    expect(mount).toContain("oriex-bridge-probe"); // separate overlay host
  });
});

describe("auth bridge probe — waits for auth restoration before mounting legacy", () => {
  const PROBE = srcOf("src/features/auth/AuthBridgeProbe.jsx");
  it("subscribes to auth state (does not rely only on immediate currentUser)", () => {
    expect(PROBE).toContain("subscribeAuth");
    expect(PROBE).not.toContain("currentAuthUser"); // no eager pre-resolution read
  });
  it("gates the legacy mount on resolved auth + a user (shouldMountLegacy)", () => {
    expect(PROBE).toContain("shouldMountLegacy");
    expect(PROBE).toMatch(/if \(!ready\)/);
    expect(PROBE).toMatch(/if \(!user\)/);
  });
  it("shows a 'checking auth' loading state", () => {
    expect(PROBE).toContain("認証状態を確認中");
  });
  it("sets window.__oxUid before importing legacy (uid set first, then mount)", () => {
    const setIdx = PROBE.indexOf("window.__oxUid = authUid");
    const importIdx = PROBE.indexOf('import("../../legacy/oriex-app.bundle.js")');
    expect(setIdx).toBeGreaterThan(-1);
    expect(importIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeLessThan(importIdx);
  });
  it("guards against a double legacy mount (mountedRef)", () => {
    expect(PROBE).toContain("mountedRef");
    expect(PROBE).toContain("mountedRef.current = true");
  });
  it("ensures the legacy-path profile BEFORE importing legacy (so legacy enters the app)", () => {
    const ensureIdx = PROBE.indexOf("ensureLegacyBridgeProfile(authUid)");
    const importIdx = PROBE.indexOf('import("../../legacy/oriex-app.bundle.js")');
    expect(ensureIdx).toBeGreaterThan(-1);
    expect(importIdx).toBeGreaterThan(-1);
    expect(ensureIdx).toBeLessThan(importIdx);
  });
});

describe("legacyBridgeProfile — own-uid, no-password, no legacy edit", () => {
  const SRC = srcOf("src/features/auth/legacyBridgeProfile.js");
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("writes to the legacy artifacts path for the user's OWN uid only", () => {
    expect(SRC).toContain('LEGACY_APP_ID = "gen-ron-kai-app-v1"');
    expect(CODE).toMatch(/doc\(db, "artifacts", LEGACY_APP_ID, "users", uid, "profile", "main"\)/);
    expect(CODE).toMatch(/doc\(db, "users", uid, "profile", "main"\)/);
  });
  it("reads no `.password`, does no plaintext compare, writes no `password:` field (except the backfill-DELETE)", () => {
    // Allow the documented plaintext-password BACKFILL-DELETE: it checks existence
    // (`d.password !== undefined`) and removes the field (`password: deleteField()`).
    // That is a security improvement, not a password read/write — strip it, then
    // assert no OTHER password handling remains.
    const C2 = CODE
      .replace(/\.password(?:Hash)?\s*[!=]==?\s*undefined/g, "")
      .replace(/password(?:Hash)?\s*:\s*deleteField\(\)/g, "");
    expect(C2).not.toMatch(/\.password\b/);
    expect(C2).not.toMatch(/\.password\s*[!=]==?/);
    expect(C2).not.toMatch(/\bpassword\s*:/);
  });
  it("runs every write through assertSafePayload and logs nothing", () => {
    expect(CODE).toContain("assertSafePayload(");
    expect(CODE).not.toMatch(/console\s*\./);
  });
});
