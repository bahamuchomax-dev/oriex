import { describe, it, expect } from "vitest";
import {
  FRIEND_ID_ALPHABET,
  FRIEND_ID_LENGTH,
  INTERNAL_AUTH_EMAIL_DOMAIN,
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  safeAuthErrorMessage,
} from "../src/features/auth/friendIdAuth.js";

describe("normalizeFriendId", () => {
  it("trims, uppercases, and strips spaces and hyphens", () => {
    expect(normalizeFriendId("  abc234 ")).toBe("ABC234");
    expect(normalizeFriendId("abc-234")).toBe("ABC234");
    expect(normalizeFriendId("ab c2 34")).toBe("ABC234");
    expect(normalizeFriendId("AbC234")).toBe("ABC234");
  });
  it("returns empty string for non-string input", () => {
    for (const bad of [null, undefined, 42, {}, [], true]) {
      expect(normalizeFriendId(bad)).toBe("");
    }
  });
  it("does not invent characters — only case/whitespace/hyphen normalization", () => {
    // 0/1/I/O are not in the alphabet; normalize must NOT map them to anything.
    expect(normalizeFriendId("o0i1")).toBe("O0I1");
  });
});

describe("validateFriendIdFormat", () => {
  it("accepts exactly 6 chars from the alphabet", () => {
    expect(validateFriendIdFormat("ABC234")).toBe(true);
    expect(validateFriendIdFormat("ZZZZZZ")).toBe(true);
    expect(validateFriendIdFormat("23456789".slice(0, 6))).toBe(true);
  });
  it("rejects wrong length", () => {
    expect(validateFriendIdFormat("ABC23")).toBe(false); // 5
    expect(validateFriendIdFormat("ABC2345")).toBe(false); // 7
    expect(validateFriendIdFormat("")).toBe(false);
  });
  it("rejects the excluded ambiguous characters I, O, 0, 1", () => {
    expect(validateFriendIdFormat("ABCIO0")).toBe(false);
    expect(validateFriendIdFormat("ABC101")).toBe(false);
  });
  it("rejects lowercase (strict — caller must normalize first)", () => {
    expect(validateFriendIdFormat("abc234")).toBe(false);
  });
  it("rejects non-string input", () => {
    for (const bad of [null, undefined, 234, {}]) {
      expect(validateFriendIdFormat(bad)).toBe(false);
    }
  });
  it("the alphabet/length constants are self-consistent", () => {
    expect(FRIEND_ID_LENGTH).toBe(6);
    expect(FRIEND_ID_ALPHABET).toHaveLength(32);
    expect(FRIEND_ID_ALPHABET).not.toMatch(/[IO01]/);
  });
});

describe("makeInternalAuthEmailFromFriendId", () => {
  it("produces a deterministic lowercase local-part on the internal .invalid domain", () => {
    expect(makeInternalAuthEmailFromFriendId("ABC234")).toBe(
      `abc234@${INTERNAL_AUTH_EMAIL_DOMAIN}`,
    );
    // same Friend ID, different surface formatting → same email
    expect(makeInternalAuthEmailFromFriendId(" abc-234 ")).toBe(
      makeInternalAuthEmailFromFriendId("ABC234"),
    );
  });
  it("uses a non-deliverable reserved (.invalid) domain by default", () => {
    expect(INTERNAL_AUTH_EMAIL_DOMAIN.endsWith(".invalid")).toBe(true);
    expect(makeInternalAuthEmailFromFriendId("ABC234")).toMatch(/@.*\.invalid$/);
  });
  it("allows an explicit domain override", () => {
    expect(makeInternalAuthEmailFromFriendId("ABC234", "example.invalid")).toBe(
      "abc234@example.invalid",
    );
  });
  it("throws on an invalid Friend ID, without echoing the input", () => {
    let err;
    try {
      makeInternalAuthEmailFromFriendId("not-a-valid-id-secret123");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(err.message).not.toContain("secret123");
    expect(err.message).toMatch(/invalid friend id/i);
  });
});

describe("safeAuthErrorMessage", () => {
  it("collapses all credential-class errors to one generic message (no enumeration)", () => {
    const generic = safeAuthErrorMessage({ code: "auth/wrong-password" });
    for (const code of [
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
      "auth/user-not-found",
      "auth/invalid-email",
      "auth/missing-password",
    ]) {
      expect(safeAuthErrorMessage({ code })).toBe(generic);
    }
    // wrong-password and user-not-found are indistinguishable
    expect(safeAuthErrorMessage({ code: "auth/user-not-found" })).toBe(
      safeAuthErrorMessage({ code: "auth/wrong-password" }),
    );
  });
  it("maps rate-limit / network / disabled to their own safe messages", () => {
    expect(safeAuthErrorMessage({ code: "auth/too-many-requests" })).toMatch(/試行回数/);
    expect(safeAuthErrorMessage({ code: "auth/network-request-failed" })).toMatch(/ネットワーク/);
    expect(safeAuthErrorMessage({ code: "auth/user-disabled" })).toMatch(/無効化/);
  });
  it("never leaks the raw error.message", () => {
    const leaky = {
      code: "auth/wrong-password",
      message: "the password 'hunter2' for user alice@real.example is wrong",
    };
    const out = safeAuthErrorMessage(leaky);
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("alice@real.example");
    expect(out).not.toContain(leaky.message);
  });
  it("falls back to the generic message for unknown / malformed input", () => {
    const generic = safeAuthErrorMessage({ code: "auth/wrong-password" });
    for (const bad of [null, undefined, {}, "string", { code: 123 }, { code: "auth/whatever" }]) {
      expect(safeAuthErrorMessage(bad)).toBe(generic);
    }
  });
});
