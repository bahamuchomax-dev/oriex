import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isAuthDebugUrl,
  isAuthDebugEnabled,
} from "../src/features/auth/authDebugRoute.js";
import {
  authDebugOn,
  dlog,
  logAuthIdentity,
  installFsHook,
} from "../src/features/auth/authDebug.js";

const BUNDLE = readFileSync(resolve("src/legacy/oriex-app.bundle.js"), "utf8");
const realWindow = globalThis.window;
afterEach(() => {
  globalThis.window = realWindow;
  vi.restoreAllMocks();
});

describe("auth debug flag", () => {
  it("enables only on the explicit flag", () => {
    expect(isAuthDebugUrl({ search: "?oriexAuthDebug=1", hash: "" })).toBe(true);
    expect(isAuthDebugUrl({ search: "", hash: "#oriex-auth-debug" })).toBe(true);
    expect(isAuthDebugEnabled({ search: "?x=1", hash: "" })).toBe(false);
    expect(isAuthDebugEnabled(null)).toBe(false);
  });
});

describe("disabled by default (no window) — production unchanged", () => {
  it("authDebugOn() false; dlog / logAuthIdentity / installFsHook are no-ops", () => {
    expect(authDebugOn()).toBe(false);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    dlog("x", { a: 1 });
    logAuthIdentity("t", { uid: "U", isAnonymous: false });
    installFsHook(() => ({ uid: "U" }));
    expect(info).not.toHaveBeenCalled();
  });
});

describe("FS hook logs SAFE metadata only (no document data / no secrets)", () => {
  it("records op/path/uid-match/isAnonymous/outcome but never the write data", async () => {
    globalThis.window = { location: { search: "?oriexAuthDebug=1", hash: "" }, __oxUid: "U1" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    installFsHook(() => ({ uid: "U1", isAnonymous: false }));
    expect(typeof window.__oxFsHook).toBe("function");

    const ref = { path: "artifacts/app/users/U1/profile/main" };
    const secret = { name: "太郎", password: "p4ss" };
    window.__oxFsHook("setDoc", ref, Promise.resolve({ exists: () => true }));
    // the hook is given (op, ref, promise) only — never the document payload
    window.__oxFsHook("setDoc", ref, Promise.resolve({ exists: () => true }), secret);
    await Promise.resolve();
    await Promise.resolve();

    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("artifacts/app/users/U1/profile/main");
    expect(logged).toContain("setDoc");
    expect(logged).not.toContain("p4ss");
    expect(logged).not.toContain("太郎");
  });

  it("records the rejection code on a denied write", async () => {
    globalThis.window = { location: { search: "?oriexAuthDebug=1", hash: "" }, __oxUid: "U1" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    installFsHook(() => ({ uid: "anon9", isAnonymous: true }));
    window.__oxFsHook(
      "setDoc",
      { path: "artifacts/app/users/U1/profile/main" },
      Promise.reject({ code: "permission-denied" }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(JSON.stringify(info.mock.calls)).toContain("permission-denied");
  });

  it("derives hasName (getDoc) / hasProgress (getDocs) as booleans, never the values", async () => {
    globalThis.window = { location: { search: "?oriexAuthDebug=1", hash: "" }, __oxUid: "U1" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    installFsHook(() => ({ uid: "U1", isAnonymous: false }));
    // getDoc with a name → hasName:true, value never logged
    window.__oxFsHook("getDoc", { path: "a/users/U1/profile/main" }, Promise.resolve({ exists: () => true, data: () => ({ name: "ひみつ", password: "p4ss" }) }));
    // getDocs with rows → hasProgress:true
    window.__oxFsHook("getDocs", { path: "(query)" }, Promise.resolve({ empty: false, size: 3 }));
    await Promise.resolve();
    await Promise.resolve();
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain('"hasName":true');
    expect(logged).toContain('"hasProgress":true');
    expect(logged).not.toContain("ひみつ");
    expect(logged).not.toContain("p4ss");
  });

  it("logs cf (anon sign-in) call decisions via __oxAuthHook", () => {
    globalThis.window = { location: { search: "?oriexAuthDebug=1", hash: "" }, __oxUid: "U1" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    installFsHook(() => null);
    expect(typeof window.__oxAuthHook).toBe("function");
    window.__oxAuthHook("cf", "reuse-modern");
    expect(JSON.stringify(info.mock.calls)).toContain("reuse-modern");
  });
});

describe("legacy bundle instrumentation present and surgical", () => {
  it("wraps setDoc/getDoc/getDocs via window.__oxFsHook, preserving originals", () => {
    for (const m of ["qn$o", "Cl$o", "rn$o"]) expect(BUNDLE).toContain("function " + m + "(");
    expect(BUNDLE).toContain('window.__oxFsHook("setDoc",e,__r)');
    expect(BUNDLE).toContain('window.__oxFsHook("getDoc",e,__r)');
    expect(BUNDLE).toContain('window.__oxFsHook("getDocs",e,__r)');
  });

  it("logs each cf anonymous-sign-in decision (reuse vs signin) via __oxAuthHook", () => {
    expect(BUNDLE).toContain('window.__oxAuthHook("cf"');
    // the #74 guard + its original are still present
    expect(BUNDLE).toContain("function cf$o(e){");
  });
});
