import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  isLegacyFallbackUrl,
  isLegacyFallbackEnabled,
  LEGACY_FALLBACK_FLAG,
} from "../src/features/auth/legacyFallbackRoute.js";
import { isModernCutoverUrl } from "../src/features/auth/cutoverRoute.js";
import { isAuthBridgeUrl } from "../src/features/auth/authBridgeRoute.js";
import { isModernAuthUrl } from "../src/features/auth/modernAuthRoute.js";

const MAIN = readFileSync("src/main.js", "utf8");
const loc = (over = {}) => ({ search: "", hash: "", ...over });

describe("isLegacyFallbackUrl — emergency admin/dev fallback matcher", () => {
  it("is false for a normal visit and unrelated flags", () => {
    expect(isLegacyFallbackUrl(loc())).toBe(false);
    expect(isLegacyFallbackUrl(loc({ search: "?oriexModernCutover=1" }))).toBe(false);
  });
  it("matches ?oriexLegacyFallback=1 and #legacy-fallback", () => {
    expect(isLegacyFallbackUrl(loc({ search: "?oriexLegacyFallback=1" }))).toBe(true);
    expect(isLegacyFallbackUrl(loc({ hash: "#legacy-fallback" }))).toBe(true);
  });
  it("never throws on odd input", () => {
    for (const bad of [null, undefined, {}, { search: 1, hash: {} }]) {
      expect(isLegacyFallbackUrl(bad)).toBe(false);
    }
  });
});

describe("isLegacyFallbackEnabled — URL or localStorage", () => {
  const realWindow = globalThis.window;
  afterEach(() => {
    globalThis.window = realWindow;
  });
  it("true via URL / localStorage, false by default, never throws", () => {
    expect(isLegacyFallbackEnabled(loc({ search: "?oriexLegacyFallback=1" }))).toBe(true);
    globalThis.window = { localStorage: { getItem: (k) => (k === LEGACY_FALLBACK_FLAG ? "1" : null) } };
    expect(isLegacyFallbackEnabled(loc())).toBe(true);
    globalThis.window = { localStorage: { getItem: () => null } };
    expect(isLegacyFallbackEnabled(loc())).toBe(false);
  });
});

describe("default cutover routing — no-flag is modern cutover; legacy is emergency-only", () => {
  it("a normal (no-flag) visit matches NONE of the non-default gates → falls through to cutover", () => {
    const normal = loc();
    expect(isLegacyFallbackUrl(normal)).toBe(false);
    expect(isAuthBridgeUrl(normal)).toBe(false);
    expect(isModernAuthUrl(normal)).toBe(false);
    // (cutover is the default branch, so no-flag lands there)
  });
  it("?oriexModernCutover=1 still routes to the cutover (it is the default branch)", () => {
    const cut = loc({ search: "?oriexModernCutover=1" });
    expect(isModernCutoverUrl(cut)).toBe(true);
    // it matches no OTHER (pre-default) gate, so it falls through to the cutover default
    expect(isLegacyFallbackUrl(cut)).toBe(false);
    expect(isAuthBridgeUrl(cut)).toBe(false);
    expect(isModernAuthUrl(cut)).toBe(false);
  });
  it("the emergency legacy fallback branch starts the legacy app", () => {
    const branch = MAIN.slice(
      MAIN.indexOf("isLegacyFallbackEnabled(oriexLocation)"),
      MAIN.indexOf("isAuthBridgeEnabled(oriexLocation)"),
    );
    expect(branch).toContain("startLegacyApp()");
  });
  it("the fallback module documents itself as TEMPORARY / UNSAFE (not a user path)", () => {
    const src = readFileSync("src/features/auth/legacyFallbackRoute.js", "utf8");
    expect(src).toMatch(/TEMPORARY|UNSAFE/);
    expect(src).toMatch(/plaintext/i);
    expect(src).toMatch(/Changes no Firestore Rules|no Firestore Rules/i);
  });
});

describe("cutover copy on the signed-out screen (returning-user message)", () => {
  const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
  const COPY = readFileSync("src/features/auth/cutoverCopy.js", "utf8");
  it("the shell renders the cutover notice on the signed-out form", () => {
    expect(SHELL).toContain("CUTOVER_TITLE");
    expect(SHELL).toContain("CUTOVER_LINES");
  });
  it("the message says the login changed and the old password cannot be used", () => {
    expect(COPY).toMatch(/ログイン方式が新しくなりました/);
    expect(COPY).toMatch(/以前のパスワードは使用できません/);
    expect(COPY).toMatch(/新しいアカウントを作成/);
    expect(COPY).toMatch(/先生\/管理者/);
  });
  it("does NOT suggest reusing the old password", () => {
    expect(COPY).not.toMatch(/以前のパスワードを(?:使用してください|入力|そのまま)/);
  });
});
