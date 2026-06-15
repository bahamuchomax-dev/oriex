import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Guards: stylish brand title, login inputs auto-uppercase (NOT the password),
 * and the version表記 unified after login via a persistent badge. UI only. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const CSS = readFileSync("src/features/auth/authScreen.css", "utf8");
const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");
const BADGE = readFileSync("src/features/auth/appVersionBadge.js", "utf8");

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

describe("version表記 — unified after login", () => {
  it("a persistent version badge is shown once the legacy home is ready", () => {
    expect(BRIDGE).toContain("showVersionBadge");
    expect(BRIDGE).toMatch(/if \(homeReady\) showVersionBadge\(\);\s*\n\s*else hideVersionBadge\(\)/);
  });
  it("the badge shows the same APP_VERSION_LABEL as the login card", () => {
    expect(BADGE).toContain("APP_VERSION_LABEL");
    expect(BADGE).toContain("ox-version-badge");
    expect(BADGE).toMatch(/pointer-events:none/); // non-interactive over the app
  });
});
