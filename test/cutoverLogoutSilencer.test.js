import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { silenceLegacyPermissionDenied } from "../src/features/auth/cutoverLogoutSilencer.js";

/* The scoped, temporary console filter that drops ONLY the known benign legacy
 * Firestore permission-denied snapshot log during the logout->reload window. It
 * must not touch unrelated errors and must always restore console.error. */

const LEGACY_DENIED =
  "@firebase/firestore: Firestore (12.14.0): Uncaught Error in snapshot listener: " +
  "FirebaseError: [code=permission-denied]: Missing or insufficient permissions.";

let realError;
let captured;

beforeEach(() => {
  realError = console.error;
  captured = [];
  console.error = (...a) => captured.push(a);
});
afterEach(() => {
  console.error = realError;
});

describe("silenceLegacyPermissionDenied", () => {
  it("drops ONLY the known legacy permission-denied snapshot error", () => {
    const restore = silenceLegacyPermissionDenied();
    console.error(LEGACY_DENIED);
    restore();
    expect(captured).toHaveLength(0);
  });

  it("lets unrelated errors through unchanged", () => {
    const restore = silenceLegacyPermissionDenied();
    console.error("some unrelated modern error");
    console.error(new Error("boom"));
    restore();
    expect(captured).toHaveLength(2);
  });

  it("does NOT silence a generic permission-denied without the Firestore context", () => {
    const restore = silenceLegacyPermissionDenied();
    console.error("permission-denied somewhere unrelated");
    restore();
    // no Firestore/snapshot context -> not suppressed
    expect(captured).toHaveLength(1);
  });

  it("restores console.error on cleanup (no lingering patch)", () => {
    const spy = console.error;
    const restore = silenceLegacyPermissionDenied();
    expect(console.error).not.toBe(spy); // patched
    restore();
    expect(console.error).toBe(spy); // restored to the pre-patch fn
  });
});

describe("cutoverLogoutSilencer — does not loosen anything / no globals abuse", () => {
  const src = readFileSync("src/features/auth/cutoverLogoutSilencer.js", "utf8");
  it("only filters the permission-denied + Firestore signature (not all errors)", () => {
    expect(src).toMatch(/permission-denied/);
    expect(src).toMatch(/snapshot listener|@firebase\/firestore/);
    // self-restoring window so it can never linger
    expect(src).toMatch(/setTimeout\(restore/);
  });
  it("touches no Firestore/rules/password APIs", () => {
    expect(/setDoc|getDoc|firestore\.rules|\.password\b/i.test(src)).toBe(false);
  });
});
