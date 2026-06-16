import { describe, it, expect, vi, afterEach } from "vitest";

/* Tests for the TEMPORARY auth-reload instrumentation. They prove:
 *  - logging is enabled ONLY by ?oriexAuthDebug=1 / #oriex-auth-debug / localStorage,
 *  - the profile summary is BOOLEANS ONLY and never leaks a field value (incl. password),
 *  - with no window (node), debug is OFF and dlog is a no-op (production unchanged). */

import {
  isAuthDebugUrl,
  isAuthDebugEnabled,
  AUTH_DEBUG_FLAG,
} from "../src/features/auth/authDebugRoute.js";
import {
  authDebugOn,
  dlog,
  safeProfileSummary,
} from "../src/features/auth/authDebug.js";

describe("isAuthDebugUrl / isAuthDebugEnabled", () => {
  it("true for the explicit query flag", () => {
    expect(isAuthDebugUrl({ search: "?oriexAuthDebug=1", hash: "" })).toBe(true);
    expect(isAuthDebugEnabled({ search: "?a=0&oriexAuthDebug=1", hash: "" })).toBe(true);
  });

  it("true for the explicit hash", () => {
    expect(isAuthDebugUrl({ search: "", hash: "#oriex-auth-debug" })).toBe(true);
  });

  it("false without the flag, and never throws on bad input", () => {
    expect(isAuthDebugUrl({ search: "?other=1", hash: "#x" })).toBe(false);
    expect(isAuthDebugEnabled(null)).toBe(false);
    expect(isAuthDebugEnabled(undefined)).toBe(false);
    expect(AUTH_DEBUG_FLAG).toBe("oriexAuthDebug");
  });
});

describe("safeProfileSummary — booleans only, no value/secret leakage", () => {
  it("summarizes presence without returning any field value", () => {
    const r = safeProfileSummary({
      name: "太郎",
      displayName: "Taro",
      shortId: "KWFAQA",
      avatar: "bear",
      password: "p4ssw0rd",
      isTeacher: true,
    });
    expect(r).toEqual({
      hasName: true,
      hasDisplayName: true,
      hasShortId: true,
      hasAvatar: true,
      isTeacher: true,
    });
    const json = JSON.stringify(r);
    for (const secret of ["太郎", "Taro", "KWFAQA", "bear", "p4ssw0rd"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("treats empty strings / missing / null as absent", () => {
    expect(safeProfileSummary({ name: "" }).hasName).toBe(false);
    expect(safeProfileSummary({}).hasShortId).toBe(false);
    expect(safeProfileSummary(null)).toEqual({
      hasName: false,
      hasDisplayName: false,
      hasShortId: false,
      hasAvatar: false,
      isTeacher: false,
    });
  });
});

describe("disabled by default (no window in node) — production unchanged", () => {
  afterEach(() => vi.restoreAllMocks());

  it("authDebugOn() is false and dlog() never logs", () => {
    expect(authDebugOn()).toBe(false);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    dlog("anything", { a: 1 });
    dlog("bare");
    expect(info).not.toHaveBeenCalled();
  });
});
