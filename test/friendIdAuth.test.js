import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  safeAuthErrorMessage,
} from "../src/features/auth/friendIdAuth.js";

describe("friendIdAuth — normalizeFriendId", () => {
  it("uppercases, trims, and removes inner whitespace", () => {
    expect(normalizeFriendId(" 2n7422 ")).toBe("2N7422");
    expect(normalizeFriendId("ab c12")).toBe("ABC12");
    expect(normalizeFriendId(null)).toBe("");
  });
});

describe("friendIdAuth — validateFriendIdFormat", () => {
  it("accepts short alphanumeric codes", () => {
    expect(validateFriendIdFormat("2N7422")).toBe(true);
    expect(validateFriendIdFormat(" 2n7422 ")).toBe(true);
  });
  it("rejects invalid characters / lengths", () => {
    expect(validateFriendIdFormat("ab")).toBe(false); // too short
    expect(validateFriendIdFormat("has space inside!")).toBe(false);
    expect(validateFriendIdFormat("toolongtoolongtoolong")).toBe(false);
    expect(validateFriendIdFormat("bad@chars")).toBe(false);
  });
});

describe("friendIdAuth — makeInternalAuthEmailFromFriendId", () => {
  it("is deterministic and normalized", () => {
    expect(makeInternalAuthEmailFromFriendId("2N7422")).toBe(
      "2n7422@friend-id.oriex.invalid",
    );
    // same id regardless of case/whitespace -> same email
    expect(makeInternalAuthEmailFromFriendId(" 2n7422 ")).toBe(
      makeInternalAuthEmailFromFriendId("2N7422"),
    );
  });
  it("throws on invalid Friend ID", () => {
    expect(() => makeInternalAuthEmailFromFriendId("@@")).toThrow();
  });
});

describe("friendIdAuth — safeAuthErrorMessage", () => {
  it("maps known codes to safe messages and never echoes the code", () => {
    expect(safeAuthErrorMessage("auth/wrong-password")).toBe("IDまたはパスワードが違います");
    expect(safeAuthErrorMessage("auth/requires-recent-login")).toBe("この操作には再ログインが必要です");
    expect(safeAuthErrorMessage("permission-denied")).toBe("権限設定エラーです。管理者にご連絡ください");
    const fallback = safeAuthErrorMessage("auth/something-new");
    expect(fallback).toBe("ログインに失敗しました。もう一度お試しください");
    expect(fallback).not.toContain("auth/");
  });
});

describe("friendIdAuth — no secret/password logging in the source", () => {
  it("does not call console.* with password/token/credential", () => {
    const src = readFileSync("src/features/auth/friendIdAuth.js", "utf8");
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*(password|token|credential)/i);
    // the helper never references a password field at all
    expect(src).not.toMatch(/\.password\b/);
  });
});
