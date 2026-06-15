import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  CUTOVER_RELOAD_MARKER,
  CUTOVER_LOGOUT_MARKER,
  consumeCutoverReloadMarker,
  reloadForCutoverRelogin,
  consumeCutoverLogoutMarker,
  reloadForCutoverLogout,
} from "../src/features/auth/cutoverReload.js";

/* The one-time, guarded same-URL reload used ONLY for the post-logout re-login
 * case in modern cutover mode (the legacy bundle's import is cached, so a second
 * in-lifecycle handoff cannot re-mount it). Proves: it reloads exactly once,
 * suppresses a repeat reload (no loops), the marker is consumed on a fresh boot so
 * the NEXT cycle can reload again, and it never throws / touches no credentials. */

const realWindow = globalThis.window;

function fakeWindow({ href = "https://app.test/?oriexModernCutover=1", withReplace = true } = {}) {
  const store = new Map();
  const calls = { replace: [], hrefSets: [] };
  let _href = href;
  const location = {
    get href() {
      return _href;
    },
    set href(v) {
      calls.hrefSets.push(v);
      _href = v;
    },
  };
  if (withReplace) {
    location.replace = (u) => {
      calls.replace.push(u);
    };
  }
  return {
    location,
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    _store: store,
    _calls: calls,
  };
}

beforeEach(() => {
  globalThis.window = fakeWindow();
});
afterEach(() => {
  globalThis.window = realWindow;
});

describe("reloadForCutoverRelogin — one-time guarded same-URL reload", () => {
  it("reloads the current URL via location.replace and sets the one-time marker", () => {
    const ok = reloadForCutoverRelogin();
    expect(ok).toBe(true);
    expect(globalThis.window._calls.replace).toEqual(["https://app.test/?oriexModernCutover=1"]);
    expect(globalThis.window._store.get(CUTOVER_RELOAD_MARKER)).toBe("1");
  });

  it("suppresses a SECOND reload while the marker is set (no reload loop)", () => {
    expect(reloadForCutoverRelogin()).toBe(true);
    const second = reloadForCutoverRelogin();
    expect(second).toBe(false);
    expect(globalThis.window._calls.replace).toHaveLength(1); // only the first reloaded
  });

  it("allows reload again only AFTER the marker is consumed (next lifecycle)", () => {
    expect(reloadForCutoverRelogin()).toBe(true); // cycle 1 reload
    expect(reloadForCutoverRelogin()).toBe(false); // suppressed within same lifecycle
    expect(consumeCutoverReloadMarker()).toBe(true); // fresh boot consumes the marker
    expect(reloadForCutoverRelogin()).toBe(true); // cycle 2 may reload again
    expect(globalThis.window._calls.replace).toHaveLength(2);
  });

  it("falls back to location.href when replace is unavailable", () => {
    globalThis.window = fakeWindow({ withReplace: false });
    expect(reloadForCutoverRelogin()).toBe(true);
    expect(globalThis.window._calls.hrefSets).toEqual(["https://app.test/?oriexModernCutover=1"]);
  });

  it("returns false and never throws with no window / no sessionStorage", () => {
    globalThis.window = undefined;
    expect(reloadForCutoverRelogin()).toBe(false);
    globalThis.window = { location: { href: "x", replace() {} } }; // no sessionStorage
    expect(reloadForCutoverRelogin()).toBe(true); // still reloads (best-effort, unguarded)
  });
});

describe("reloadForCutoverLogout — one-time guarded reload (separate marker)", () => {
  it("reloads once, sets its OWN logout marker, and suppresses a repeat (no loop)", () => {
    expect(reloadForCutoverLogout()).toBe(true);
    expect(globalThis.window._store.get(CUTOVER_LOGOUT_MARKER)).toBe("1");
    expect(reloadForCutoverLogout()).toBe(false); // suppressed within same lifecycle
    expect(globalThis.window._calls.replace).toHaveLength(1);
  });
  it("uses a marker independent of the re-login reload (no cross-suppression)", () => {
    expect(reloadForCutoverRelogin()).toBe(true); // relogin marker set
    expect(reloadForCutoverLogout()).toBe(true); // logout still allowed (different marker)
    expect(globalThis.window._calls.replace).toHaveLength(2);
  });
  it("allows another logout reload only after the marker is consumed (next boot)", () => {
    expect(reloadForCutoverLogout()).toBe(true);
    expect(reloadForCutoverLogout()).toBe(false);
    expect(consumeCutoverLogoutMarker()).toBe(true);
    expect(reloadForCutoverLogout()).toBe(true);
    expect(globalThis.window._calls.replace).toHaveLength(2);
  });
});

describe("consumeCutoverLogoutMarker", () => {
  it("returns true and clears the logout marker when present", () => {
    globalThis.window._store.set(CUTOVER_LOGOUT_MARKER, "1");
    expect(consumeCutoverLogoutMarker()).toBe(true);
    expect(globalThis.window._store.has(CUTOVER_LOGOUT_MARKER)).toBe(false);
  });
  it("returns false when absent and never throws", () => {
    expect(consumeCutoverLogoutMarker()).toBe(false);
    globalThis.window = undefined;
    expect(consumeCutoverLogoutMarker()).toBe(false);
  });
});

describe("consumeCutoverReloadMarker", () => {
  it("returns true and clears the marker when present", () => {
    globalThis.window._store.set(CUTOVER_RELOAD_MARKER, "1");
    expect(consumeCutoverReloadMarker()).toBe(true);
    expect(globalThis.window._store.has(CUTOVER_RELOAD_MARKER)).toBe(false);
  });
  it("returns false when no marker is present, and never throws", () => {
    expect(consumeCutoverReloadMarker()).toBe(false);
    globalThis.window = undefined;
    expect(consumeCutoverReloadMarker()).toBe(false);
  });
});

describe("cutoverReload — safety (no credentials touched)", () => {
  const src = readFileSync("src/features/auth/cutoverReload.js", "utf8");
  it("touches only the session marker + location (no localStorage, no Firestore)", () => {
    expect(src.includes("localStorage")).toBe(false); // session-only marker
    // self-contained: no import statements / dynamic imports (no firebase/firestore deps)
    expect(/\bimport\s*\(|\bfrom\s+["']|\brequire\s*\(/.test(src)).toBe(false);
    expect(/setDoc|getDoc|collection\(|doc\(/.test(src)).toBe(false);
  });
  it("does no password handling (no read/compare/write of a password value)", () => {
    // Allow the assurance comment, but reject any actual password access pattern.
    expect(/\.password\b|password\s*[:=]|getItem\([^)]*password/i.test(src)).toBe(false);
  });
});

describe("ModernCutoverBridge — wires the second-cycle re-login reload", () => {
  const BRIDGE = readFileSync("src/features/auth/ModernCutoverBridge.jsx", "utf8");
  it("imports the guarded reload helpers", () => {
    expect(BRIDGE).toMatch(/from "\.\/cutoverReload\.js"/);
    expect(BRIDGE).toContain("reloadForCutoverRelogin");
    expect(BRIDGE).toContain("consumeCutoverReloadMarker");
  });
  it("only reloads when a handoff already completed this lifecycle (guarded)", () => {
    expect(BRIDGE).toMatch(/handedOffOnceRef\.current\s*&&\s*reloadForCutoverRelogin\(\)/);
    // handedOffOnceRef is set only after a successful handoff completes.
    expect(BRIDGE).toMatch(/handedOffOnceRef\.current\s*=\s*true/);
  });
  it("does not read main.password or otherwise access a password value", () => {
    expect(/main\.password|\.password\b|getItem\([^)]*password/i.test(BRIDGE)).toBe(false);
  });
});
