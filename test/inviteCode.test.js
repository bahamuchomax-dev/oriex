import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEV_INVITE_CODE,
  normalizeInviteCode,
  validateInviteCode,
} from "../src/features/auth/inviteCode.js";

describe("normalizeInviteCode", () => {
  it("trims, uppercases, and strips spaces/hyphens/zero-width chars", () => {
    expect(normalizeInviteCode("  orix-test ")).toBe("ORIXTEST");
    expect(normalizeInviteCode("ORIX TEST")).toBe("ORIXTEST");
    expect(normalizeInviteCode("o r i x t e s t")).toBe("ORIXTEST");
    expect(normalizeInviteCode("ORIX​-‌TEST")).toBe("ORIXTEST"); // hidden chars
  });
  it("converts full-width input to half-width (NFKC)", () => {
    expect(normalizeInviteCode("ＯＲＩＸ－ＴＥＳＴ")).toBe("ORIXTEST");
  });
  it("returns empty string for non-string input", () => {
    for (const bad of [null, undefined, 42, {}, []]) expect(normalizeInviteCode(bad)).toBe("");
  });
});

describe("validateInviteCode", () => {
  it("accepts the documented dev code in any reasonable casing/spacing", () => {
    for (const ok of ["GENGEN", "gengen", "  GEN GEN  ", "ＧＥＮＧＥＮ", "gen-gen"]) {
      expect(validateInviteCode(ok)).toBe(true);
    }
  });
  it("rejects wrong / empty / non-string codes", () => {
    for (const bad of ["WRONG", "GENGE", "GENGENX", "", "   ", null, undefined, 0]) {
      expect(validateInviteCode(bad)).toBe(false);
    }
  });
  it("the dev code is non-secret and documented (GENGEN)", () => {
    expect(DEV_INVITE_CODE).toBe("GENGEN");
  });
});

describe("inviteCode — security posture", () => {
  const SRC = readFileSync("src/features/auth/inviteCode.js", "utf8");
  it("is explicitly documented as a non-secret, test-only, non-security boundary", () => {
    expect(SRC).toMatch(/NOT A SECURITY BOUNDARY/);
    expect(SRC).toMatch(/TEST-ONLY/);
    expect(SRC).toMatch(/never written to Firestore/i);
  });
  it("uses a build-time production code (VITE_INVITE_CODE) with the dev code as fallback", () => {
    expect(SRC).toMatch(/import\.meta\.env\.VITE_INVITE_CODE|VITE_INVITE_CODE/);
    expect(SRC).toMatch(/ACTIVE_INVITE_CODE/);
    // validation compares against the ACTIVE code, not the dev code directly
    expect(SRC).toMatch(/normalizeInviteCode\(ACTIVE_INVITE_CODE\)/);
  });
});
