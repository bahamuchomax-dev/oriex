import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Guards: stylish brand title, login inputs auto-uppercase (NOT the password),
 * and the version表記 unified after login via a persistent badge. UI only. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const CSS = readFileSync("src/features/auth/authScreen.css", "utf8");
const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");
const MAIN = readFileSync("src/main.js", "utf8");
const LEGACY = readFileSync("src/legacy/oriex-app.bundle.js", "utf8");

describe("login — stylish brand wordmark", () => {
  it("the Oriex title uses a display font + gradient text", () => {
    const i = CSS.indexOf(".ox-auth-title {");
    const rule = CSS.slice(i, CSS.indexOf("}", i));
    expect(rule).toMatch(/font-family:\s*"Quicksand"/);
    expect(rule).toMatch(/background-clip:\s*text|-webkit-background-clip:\s*text/);
  });
});

describe("login — inputs auto-uppercase (password excluded)", () => {
  it("the Friend ID input uppercases on change", () => {
    expect(SHELL).toMatch(/setFriendId\(e\.target\.value\.toUpperCase\(\)\)/);
  });
  it("the invite code input uppercases on change", () => {
    expect(SHELL).toMatch(/setInviteCode\(e\.target\.value\.toUpperCase\(\)\)/);
  });
  it("the PASSWORD input is NOT uppercased (would corrupt credentials)", () => {
    expect(SHELL).not.toMatch(/setPassword\(e\.target\.value\.toUpperCase\(\)\)/);
  });
});

describe("version表記 — unified after login (legacy home, no overlapping badge)", () => {
  it("main.js exposes the current version on window before legacy loads", () => {
    expect(MAIN).toContain("window.__OX_APP_VERSION = APP_VERSION_LABEL");
    expect(MAIN).toMatch(/import \{ APP_VERSION_LABEL \} from "\.\/appVersion\.js"/);
  });
  it("the legacy home reads the current version (no hard-coded v7.36)", () => {
    expect(LEGACY).not.toContain('"Oriex v7.36"'); // old hard-coded label removed
    expect(LEGACY).toContain("window.__OX_APP_VERSION"); // reads the unified version
  });
  it("no floating version badge remains (it overlapped the home bar)", () => {
    expect(BRIDGE).not.toContain("VersionBadge");
  });
});
