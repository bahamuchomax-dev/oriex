import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* UI/appearance guards for the polished modern-auth login screen. These lock in
 * the friendly, app-like copy and — importantly — that the internal user id is
 * NOT shown to normal users (only behind the ?oriexAuthDebug=1 support flag).
 * Appearance only: the auth/security contract lives in modernAuthShellStatic. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");
const MARK = readFileSync("src/features/auth/OriexMark.jsx", "utf8");
const CSS = readFileSync("src/features/auth/authScreen.css", "utf8");

// extract the body of a CSS rule by selector (first match), for style guards
function cssRule(selector) {
  const i = CSS.indexOf(selector + " {");
  if (i < 0) return "";
  return CSS.slice(i, CSS.indexOf("}", i));
}

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

describe("modern auth — inputs are clearly visible & mobile-safe", () => {
  it("auth inputs use the self-sufficient ox-auth-input class (not borderless rx-tf)", () => {
    // all four possible fields (Friend ID, invite, name, password) use the class
    expect((SHELL.match(/className="ox-auth-input"/g) || []).length).toBeGreaterThanOrEqual(4);
    // no longer depends on the legacy .rx-tf whose --line border is undefined here
    expect(SHELL).not.toContain("rx-tf");
  });
  it("ox-auth-input has a visible border, distinct background and a focus ring", () => {
    const base = cssRule(".ox-auth-input");
    expect(base).toMatch(/border:\s*1px solid/);
    expect(base).toMatch(/background:/);
    const focus = cssRule(".ox-auth-input:focus");
    expect(focus).toMatch(/box-shadow:/);
  });
  it("inputs and buttons are >=16px so mobile (iOS) does not auto-zoom on tap", () => {
    expect(cssRule(".ox-auth-input")).toMatch(/font-size:\s*16px/);
    expect(cssRule(".ox-auth-primary")).toMatch(/font-size:\s*16px/);
    expect(cssRule(".ox-auth-switch-btn")).toMatch(/font-size:\s*16px/);
  });
  it("inputs have a comfortable mobile height and no horizontal overflow", () => {
    const base = cssRule(".ox-auth-input");
    expect(base).toMatch(/min-height:\s*48px/);
    expect(base).toMatch(/box-sizing:\s*border-box/);
    expect(base).toMatch(/width:\s*100%/);
  });
});

describe("modern auth — strengthened legacy flash guard (covers all transitions)", () => {
  it("the bridge toggles the cutover cover class on <html> while transitioning", () => {
    expect(BRIDGE).toContain("ox-cutover-covering");
    // covering for every phase except a signed-in, mounted legacy home
    expect(BRIDGE).toMatch(/!\(phase === "mounted" && !!user\)/);
  });
  it("the cover class hides #root (legacy) so its old login can't paint", () => {
    expect(CSS).toMatch(/html\.ox-cutover-covering #root\s*\{[\s\S]*visibility:\s*hidden/);
  });
  it("signup view shares the same Oriex brand mark (no separate debug form)", () => {
    expect(SHELL).toContain("新しく始める");
    expect(SHELL).toContain("OriexMark");
  });
});

describe("modern auth — logout covers the legacy login flash", () => {
  it("renders a branded cover the frame auth drops to null after a handoff", () => {
    // synchronous render-time guard (not an effect) so legacy can't flash for a
    // frame; uses the branded loader (OriexMark + calm copy)
    expect(BRIDGE).toMatch(/if \(startedRef\.current && !user\)/);
    expect(BRIDGE).toContain("ログアウトしています");
    // the cover guard sits BEFORE the mounted->null return
    const coverIdx = BRIDGE.indexOf("startedRef.current && !user");
    const nullIdx = BRIDGE.indexOf('phase === "mounted") return null');
    expect(coverIdx).toBeGreaterThan(-1);
    expect(nullIdx).toBeGreaterThan(coverIdx);
  });
  it("after auth-null it clears session state and returns to the modern signin", () => {
    expect(BRIDGE).toContain("clearLegacyLocalSession");
    expect(BRIDGE).toMatch(/startedRef\.current = false;[\s\S]*setPhase\("signin"\)/);
  });
  it("legacy login is not terminal: the bridge never renders the legacy login", () => {
    // the only signed-out terminal UI is the modern ModernAuthShell
    expect(BRIDGE).toContain("ModernAuthShell");
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
