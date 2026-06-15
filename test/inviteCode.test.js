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
    for (const ok of ["ORIX-TEST", "orix-test", "  ORIX TEST  ", "ＯＲＩＸ－ＴＥＳＴ", "orixtest"]) {
      expect(validateInviteCode(ok)).toBe(true);
    }
  });
  it("rejects wrong / empty / non-string codes", () => {
    for (const bad of ["WRONG", "ORIX-TES", "ORIXTESTX", "", "   ", null, undefined, 0]) {
      expect(validateInviteCode(bad)).toBe(false);
    }
  });
  it("the dev code is non-secret and documented (ORIX-TEST)", () => {
    expect(DEV_INVITE_CODE).toBe("ORIX-TEST");
  });
});

describe("inviteCode — security posture", () => {
  const SRC = readFileSync("src/features/auth/inviteCode.js", "utf8");
  it("is explicitly documented as a non-secret, test-only, non-security boundary", () => {
    expect(SRC).toMatch(/NOT A SECURITY BOUNDARY/);
    expect(SRC).toMatch(/TEST-ONLY/);
    expect(SRC).toMatch(/never written to Firestore/i);
  });
});
