import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* UI/appearance guards for the polished modern-auth login screen. These lock in
 * the friendly, app-like copy and — importantly — that the internal user id is
 * NOT shown to normal users (only behind the ?oriexAuthDebug=1 support flag).
 * Appearance only: the auth/security contract lives in modernAuthShellStatic. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");

describe("modern auth login — friendly Oriex copy", () => {
  it("shows the Oriex brand and friendly login/signup labels", () => {
    for (const copy of ["Oriex", "ログイン", "Friend ID", "パスワード", "新しく始める"]) {
      expect(SHELL).toContain(copy);
    }
  });
  it("keeps the user-facing 'login method changed' notice", () => {
    // rendered via the cutover copy module (content asserted in cutoverCopy.test)
    expect(SHELL).toContain("CUTOVER_TITLE");
    expect(SHELL).toContain("CUTOVER_LINES");
  });
  it("drops the debug-style 'ログイン中' heading and internal handoff wording", () => {
    expect(SHELL).not.toContain("ログイン中");
    expect(BRIDGE).not.toContain("引き継ぎに失敗");
    expect(BRIDGE).not.toContain("アプリを起動中");
  });
  it("uses the dedicated, app-styled login stylesheet (not a debug shell)", () => {
    expect(SHELL).toContain('import "./authScreen.css"');
  });
});

describe("modern auth login — internal uid is not exposed by default", () => {
  it("gates the uid display behind the explicit ?oriexAuthDebug=1 support flag", () => {
    expect(SHELL).toContain("oriexAuthDebug");
    // the only rendered uid is inside the `debug && (...)` branch
    expect(SHELL).toMatch(/\{debug && \([\s\S]*?ID: \{user\.uid\}/);
  });
  it("does not render the uid in a non-debug branch", () => {
    // remove the debug block, then assert no leftover `{user.uid}` render target
    const withoutDebug = SHELL.replace(/\{debug && \([\s\S]*?\)\}/g, "");
    expect(withoutDebug).not.toContain("{user.uid}");
  });
});

describe("modern auth — calm branded loaders in the cutover bridge", () => {
  it("renders a branded loader and keeps the 'checking login state' wording", () => {
    expect(BRIDGE).toContain("BrandedLoader");
    expect(BRIDGE).toContain("ログイン状態を確認中");
    expect(BRIDGE).toContain('import "./authScreen.css"');
  });
});
