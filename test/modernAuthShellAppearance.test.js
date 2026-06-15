import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* UI/appearance guards for the polished modern-auth login screen. These lock in
 * the friendly, app-like copy and — importantly — that the internal user id is
 * NOT shown to normal users (only behind the ?oriexAuthDebug=1 support flag).
 * Appearance only: the auth/security contract lives in modernAuthShellStatic. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");
const MARK = readFileSync("src/features/auth/OriexMark.jsx", "utf8");

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

describe("modern auth — brand mark uses the real Oriex app/PWA icon", () => {
  it("OriexMark renders the existing public app icon (no new heavy asset)", () => {
    expect(MARK).toContain("icon-192.png");
    // BASE_URL keeps the path correct under the GitHub Pages project subpath
    expect(MARK).toContain("import.meta.env.BASE_URL");
    expect(MARK).toContain('alt="Oriex"');
  });
  it("the login + handoff screens use OriexMark, not the square 'O' placeholder", () => {
    expect(SHELL).toContain("OriexMark");
    expect(BRIDGE).toContain("OriexMark");
    // the old debug-style square placeholder is gone everywhere
    expect(SHELL).not.toContain('ox-auth-logo">O');
    expect(BRIDGE).not.toContain('ox-auth-logo">O');
  });
});

describe("modern auth — handoff covers the legacy flash, bounded (no infinite load)", () => {
  it("holds a 'revealing' cover until legacy paints, then drops to mounted->null", () => {
    expect(BRIDGE).toContain('setPhase("revealing")');
    expect(BRIDGE).toMatch(/phase === "revealing"/);
    // the reveal is bounded: animation frames + a finite timeout, then mounted
    expect(BRIDGE).toContain("requestAnimationFrame");
    expect(BRIDGE).toMatch(/setTimeout\([\s\S]*?\d+\)/);
    expect(BRIDGE).toMatch(/setPhase\("mounted"\)/);
    expect(BRIDGE).toMatch(/phase === "mounted"\)\s*return null/);
  });
});
