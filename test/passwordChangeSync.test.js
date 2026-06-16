import { describe, it, expect } from "vitest";
import { isNewPasswordPlaceholder } from "../src/services/passwordChangeSync.js";

/* The DOM polling is thin glue; the identifiable-logic worth pinning is which
 * password field is the "new password" one we bridge to Firebase Auth. */
describe("isNewPasswordPlaceholder", () => {
  it("matches the legacy new-password field placeholder", () => {
    expect(isNewPasswordPlaceholder("新しいパスワード")).toBe(true);
    expect(isNewPasswordPlaceholder("新しいパスワード（4文字以上）")).toBe(true);
  });
  it("does not match other password fields or junk", () => {
    expect(isNewPasswordPlaceholder("パスワード")).toBe(false);
    expect(isNewPasswordPlaceholder("パスワードを入力")).toBe(false);
    expect(isNewPasswordPlaceholder("確認用パスワード")).toBe(false);
    expect(isNewPasswordPlaceholder("")).toBe(false);
    expect(isNewPasswordPlaceholder(null)).toBe(false);
    expect(isNewPasswordPlaceholder(undefined)).toBe(false);
  });
});
