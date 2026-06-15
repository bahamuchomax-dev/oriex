import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Static security guards over the modern auth shell + API. Lock in the contract
 * that can't be (cheaply) exercised at runtime here: no plaintext-password
 * compare, no profile/main read, no logging of secrets, Firebase-Auth-driven UI,
 * and opt-in gating that preserves the legacy boot. */

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const API = readFileSync("src/features/auth/modernAuthApi.js", "utf8");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const API_CODE = stripComments(API);
const SHELL_CODE = stripComments(SHELL);

describe("modern auth — no client-side plaintext password handling", () => {
  it("neither shell nor API compares a `.password` field (no client-side check)", () => {
    expect(API_CODE).not.toMatch(/\.password\s*[!=]==?/);
    expect(SHELL_CODE).not.toMatch(/\.password\s*[!=]==?/);
  });
  it("the API reads no Firestore document — no profile/main lookup primitives", () => {
    for (const readPrim of ["getDoc", "getDocs", "onSnapshot", "query", "where", "collection"]) {
      expect(API_CODE).not.toContain(readPrim);
    }
  });
  it("password is never persisted: the API has no `password:` object field", () => {
    // `password` may appear only as a function parameter / the forbidden-field
    // ban list — never as a key written into a Firestore payload object.
    expect(API_CODE).not.toMatch(/\bpassword\s*:/);
  });
});

describe("modern auth — driven by Firebase Auth, errors are safe", () => {
  it("the shell drives UI from the auth observer (subscribeAuth → onAuthStateChanged)", () => {
    expect(SHELL).toContain("subscribeAuth");
    const STATE = readFileSync("src/features/auth/modernAuthState.js", "utf8");
    expect(STATE).toContain("onAuthStateChanged");
  });
  it("transitions IMMEDIATELY after sign-in/up (does not wait for a reload/observer)", () => {
    // the awaited login/signup handler sets the user from the authoritative
    // current user, so the signed-in view shows without a reload.
    expect(SHELL).toContain("setUser(currentAuthUser())");
  });
  it("transitions to signed-out immediately after logout (no reload)", () => {
    expect(SHELL).toContain("setUser(null)");
  });
  it("clears the busy/submitting state in finally on both success and failure", () => {
    // one finally per handler (onSubmit, onLogout), each resetting busy
    expect((SHELL.match(/finally\s*{\s*setBusy\(false\);\s*}/g) || []).length).toBeGreaterThanOrEqual(2);
  });
  it("the subscription is registered once on mount and cleaned up on unmount", () => {
    expect(SHELL_CODE).toMatch(/useEffect\(\(\) => \{[\s\S]*subscribeAuth\([\s\S]*return unsub;[\s\S]*\}, \[\]\)/);
  });
  it("the shell uses the API for signup/login/logout (real Firebase Auth)", () => {
    expect(SHELL).toContain("signUpWithFriendId");
    expect(SHELL).toContain("loginWithFriendId");
    expect(SHELL).toContain("logout");
    expect(API).toContain("createUserWithEmailAndPassword");
    expect(API).toContain("signInWithEmailAndPassword");
    expect(API).toContain("signOut");
  });
  it("the shell shows only safeAuthErrorMessage output (never the raw error)", () => {
    expect(SHELL).toContain("safeAuthErrorMessage");
    expect(SHELL_CODE).not.toMatch(/setError\(\s*err\b/);
    expect(SHELL_CODE).not.toMatch(/err\.message/);
  });
});

describe("modern auth — no logging of secrets / auth objects", () => {
  it("neither shell nor API calls console.* (no password/token/user logging)", () => {
    expect(SHELL_CODE).not.toMatch(/console\s*\./);
    expect(API_CODE).not.toMatch(/console\s*\./);
  });
});

describe("modern auth — current user shows UID only (no claims/role/token)", () => {
  it("the signed-in view exposes uid only, no authority/credential internals", () => {
    // grab the signed-in branch: from `if (user)` to the final (signed-out) return
    const start = SHELL.indexOf("if (user)");
    const seg = start >= 0 ? SHELL.slice(start, SHELL.lastIndexOf("return (")) : SHELL;
    expect(seg).toContain("user.uid");
    for (const forbidden of ["token", "claims", "getIdToken", "isTeacher", "role", "admin", "password"]) {
      expect(seg.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
