import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import pkg from "../package.json";
import { APP_VERSION_LABEL } from "../src/appVersion.js";

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

describe("modern auth — mobile screen is vertically centered", () => {
  it("the auth container fills the viewport and centers the card", () => {
    const rule = cssRule(".ox-auth");
    expect(rule).toMatch(/min-height:\s*100svh/);
    expect(rule).toMatch(/place-items:\s*center/);
  });
  it("uses symmetric safe-area padding (no top-heavy bottom-only inset)", () => {
    const rule = cssRule(".ox-auth");
    expect(rule).toMatch(/safe-area-inset-top/);
    expect(rule).toMatch(/safe-area-inset-bottom/);
  });
  it("falls back to top-aligned scrolling on short screens (no clipping)", () => {
    expect(CSS).toMatch(/@media \(max-height: 720px\)[\s\S]*\.ox-auth[\s\S]*align-items:\s*start/);
  });
});

describe("modern auth — cutover intercepts legacy logout (no old-login render)", () => {
  const SHIELD = readFileSync("src/features/auth/cutoverLogoutShield.js", "utf8");

  it("the shield cancels the event so legacy's logout handler never runs", () => {
    expect(SHIELD).toContain("preventDefault");
    expect(SHIELD).toContain("stopPropagation");
    expect(SHIELD).toContain("stopImmediatePropagation");
    // capture phase so it fires before legacy's own handler
    expect(SHIELD).toMatch(/addEventListener\([^,]+,\s*handler,\s*true\)/);
    expect(SHIELD).toMatch(/removeEventListener\([^,]+,\s*handler,\s*true\)/);
  });
  it("detects logout by label, short text, OR the language-independent icon path", () => {
    expect(SHIELD).toContain("ログアウト");
    // title / aria-label and the distinctive legacy logout-icon svg path
    expect(SHIELD).toMatch(/aria-label|title/);
    expect(SHIELD).toContain("M15 12H3");
    expect(SHIELD).toContain('path[d^=');
    // does not hijack the modern cutover UI (login shell, loaders, confirm dialog)
    expect(SHIELD).toMatch(/closest\("\.ox-auth"\)/);
    expect(SHIELD).toContain("oriex-modern-cutover");
  });
  it("the bridge installs the shield only while the legacy home is mounted", () => {
    expect(BRIDGE).toContain("installCutoverLogoutShield");
    expect(BRIDGE).toMatch(/homeReady = phase === "mounted" && !!user;\s*\n\s*if \(!homeReady\) return undefined;\s*\n\s*return installCutoverLogoutShield/);
  });
  it("logout intent opens the confirm dialog (does not sign out immediately)", () => {
    expect(BRIDGE).toMatch(/onLogoutIntent = useCallback\(\(\) => \{[\s\S]*?setConfirmingLogout\(true\)/);
  });
  it("confirming runs the MODERN sign-out path (not legacy's)", () => {
    expect(BRIDGE).toMatch(/import \{ logout \} from "\.\/modernAuthApi\.js"/);
    expect(BRIDGE).toMatch(/confirmLogout = useCallback/);
    expect(BRIDGE).toContain("logout()");
    expect(BRIDGE).toContain("showCutoverVeil()");
    // clears the safe legacy fast-start session + uid global (no password/token)
    expect(BRIDGE).toContain("clearLegacyLocalSession(lastUidRef.current)");
    expect(BRIDGE).toMatch(/window\.__oxUid = undefined/);
  });
  it("the auth observer drives a one-time clean reload on auth-null after handoff", () => {
    // legacy keeps live Firestore listeners that throw permission-denied after
    // signOut; the reload is triggered when auth becomes null (after sign-out has
    // persisted) so it fires for BOTH our shield's signOut and legacy's own
    // logout button — then a fresh boot (auth null, legacy never imported) avoids
    // the repaint. Not gated on the click shield (which can't ID the legacy btn).
    expect(BRIDGE).toMatch(/else if \(startedRef\.current && !logoutReloadStartedRef\.current\)[\s\S]*?reloadForCutoverLogout\(\)/);
    // synchronous cover in the auth callback (before paint), not a React effect
    expect(BRIDGE).toMatch(/logoutReloadStartedRef\.current = true;[\s\S]*?showCutoverVeil\(\)/);
    // one-time: marker consumed on boot, guard reset for the next cycle
    expect(BRIDGE).toContain("consumeCutoverLogoutMarker()");
    expect(BRIDGE).toMatch(/logoutReloadStartedRef\.current = false/);
  });
  it("sign-out is idempotent (guarded) and reset for the next cycle", () => {
    expect(BRIDGE).toMatch(/if \(loggingOutRef\.current\) return;/);
    expect(BRIDGE).toMatch(/loggingOutRef\.current = false;/);
  });
  it("does not log credentials on sign-out failure", () => {
    const start = BRIDGE.indexOf("confirmLogout = useCallback");
    const seg = BRIDGE.slice(start, start + 600);
    expect(seg).not.toMatch(/console\s*\./);
  });
});

describe("modern auth — logout confirmation dialog", () => {
  it("renders a confirm dialog over the legacy home on logout intent", () => {
    expect(BRIDGE).toContain("confirmingLogout");
    expect(BRIDGE).toMatch(/if \(confirmingLogout && user\)/);
    expect(BRIDGE).toContain("ログアウトしますか？");
    expect(BRIDGE).toContain('role="dialog"');
  });
  it("wires confirm -> sign-out and cancel -> dismiss", () => {
    expect(BRIDGE).toMatch(/onClick=\{confirmLogout\}/);
    expect(BRIDGE).toMatch(/onClick=\{cancelLogout\}/);
    expect(BRIDGE).toMatch(/cancelLogout = useCallback\(\(\) => setConfirmingLogout\(false\)/);
  });
  it("the dialog backdrop is a dim scrim pinned above #root", () => {
    expect(CSS).toMatch(/\.ox-auth-modal-backdrop\s*\{[\s\S]*?z-index:\s*2147483646/);
    expect(CSS).toMatch(/\.ox-auth-modal-backdrop\s*\{[\s\S]*?background:\s*rgba\(/);
  });
});

describe("modern auth — out-of-#root cutover veil (stronger flash guard)", () => {
  const MOUNT = readFileSync("src/features/auth/mountModernCutover.jsx", "utf8");
  const VEIL = readFileSync("src/features/auth/cutoverVeil.js", "utf8");
  it("the veil node lives outside #root with a max z-index full-screen cover", () => {
    expect(VEIL).toContain("ox-cutover-veil");
    expect(VEIL).toContain("document.body.appendChild");
    expect(VEIL).toContain("2147483647");
    expect(VEIL).toMatch(/position:fixed/);
  });
  it("the cutover entry raises the veil before legacy is imported (and on reload)", () => {
    expect(MOUNT).toContain("showCutoverVeil()");
  });
  it("the bridge raises the veil during transitions and drops it when UI is ready", () => {
    expect(BRIDGE).toContain("showCutoverVeil");
    expect(BRIDGE).toContain("hideCutoverVeil");
    // bounded reveal of the legacy home: rAF + finite timeout
    expect(BRIDGE).toContain("requestAnimationFrame");
    expect(BRIDGE).toMatch(/setTimeout\([\s\S]*?\d+\)/);
  });
});

describe("modern auth — scoped mobile no-zoom on the auth screen", () => {
  it("the bridge toggles ox-auth-nozoom and guards iOS pinch gestures (scoped)", () => {
    expect(BRIDGE).toContain("ox-auth-nozoom");
    expect(BRIDGE).toContain("gesturestart");
    expect(BRIDGE).toContain("preventDefault");
    // removed when the home is ready so the app zooms normally after login
    expect(BRIDGE).toContain("removeEventListener");
  });
  it("CSS disables double-tap zoom via touch-action on the auth screen", () => {
    expect(cssRule("html.ox-auth-nozoom,\nhtml.ox-auth-nozoom body") || CSS).toMatch(
      /touch-action:\s*manipulation/,
    );
    expect(CSS).toMatch(/\.ox-auth,\s*\.ox-auth \*\s*\{[\s\S]*touch-action:\s*manipulation/);
  });
});

describe("modern auth — version label", () => {
  it("login & signup render the app version label from a single source", () => {
    expect(SHELL).toContain("APP_VERSION_LABEL");
    expect(SHELL).toContain('className="ox-auth-version"');
  });
  it("the version label derives from package.json (auto-updates on bump)", () => {
    expect(APP_VERSION_LABEL).toMatch(/^v\d+\.\d+\.\d+/);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
  });
  it("the version label has an unobtrusive (low-contrast) style", () => {
    expect(cssRule(".ox-auth-version")).toMatch(/color:\s*rgba\(/);
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
    expect(BRIDGE).toMatch(/homeReady = phase === "mounted" && !!user/);
    expect(BRIDGE).toMatch(/toggle\("ox-cutover-covering", !homeReady\)/);
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
