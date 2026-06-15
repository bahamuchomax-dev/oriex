import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  CUTOVER_TITLE,
  CUTOVER_LINES,
  SIGNUP_NEW_FRIEND_ID_NOTE,
} from "../src/features/auth/cutoverCopy.js";

const SHELL = readFileSync("src/features/auth/ModernAuthShell.jsx", "utf8");
const COPY_SRC = readFileSync("src/features/auth/cutoverCopy.js", "utf8");
// strip comments: the module's own doc comment legitimately names Firestore/etc.
const COPY_CODE = COPY_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("cutover copy — content", () => {
  it("includes the three required cutover lines (v1 = fresh re-registration)", () => {
    expect(CUTOVER_LINES).toContain("安全性向上のため、ログイン方式を新しくしました。");
    expect(CUTOVER_LINES).toContain("以前のパスワードは使用できません。新しいアカウントを作成してください。");
    expect(CUTOVER_LINES).toContain("学習記録の引き継ぎが必要な場合は先生/管理者に相談してください。");
    expect(CUTOVER_TITLE).toMatch(/ログイン方式/);
  });
  it("signup copy explains a NEW Friend ID is issued", () => {
    expect(SIGNUP_NEW_FRIEND_ID_NOTE).toMatch(/新しいフレンドIDが発行されます/);
  });
  it("does NOT suggest reusing the old password", () => {
    const all = [CUTOVER_TITLE, ...CUTOVER_LINES, SIGNUP_NEW_FRIEND_ID_NOTE].join(" ");
    // it says the old password CANNOT be used; it must not invite reuse
    expect(all).toMatch(/以前のパスワードは使用できません/);
    expect(all).not.toMatch(/以前のパスワードを(?:使|入力|そのまま)/);
  });
  it("the copy module is plain strings — no Firestore/secret/logging (code only)", () => {
    for (const forbidden of ["console", "password:", "getDoc", "setDoc", "firestore", "token"]) {
      expect(COPY_CODE.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("cutover copy — rendered in the modern shell (signed-out view)", () => {
  it("the shell imports and renders the cutover notice + signup note", () => {
    expect(SHELL).toContain("CUTOVER_LINES");
    expect(SHELL).toContain("CUTOVER_TITLE");
    expect(SHELL).toContain("SIGNUP_NEW_FRIEND_ID_NOTE");
  });
  it("keeps signup issuing a generated Friend ID (no user-typed ID at signup)", () => {
    // signup uses the invite code, not a typed Friend ID; the Friend ID field is
    // login-only (the label reads "Friend ID" in the polished UI).
    expect(SHELL).toContain("signUpWithInviteCode");
    expect(SHELL).toMatch(/mode === "login" && \(\s*<label[^>]*>\s*<span[^>]*>Friend ID/);
  });
});

describe("modern auth cutover plan doc", () => {
  const DOC = "MODERN_AUTH_CUTOVER_PLAN.md";
  const doc = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";
  it("exists and is app-only/no-deploy/no-rules", () => {
    expect(existsSync(DOC)).toBe(true);
    expect(doc).toMatch(/no deploy/i);
    expect(doc).toMatch(/no Firestore Rules change|no rules/i);
  });
  it("records that the default login is NOT flipped (post-login handoff gap)", () => {
    expect(doc).toMatch(/NOT flipped|not flip/i);
    expect(doc).toMatch(/auth-only|app-less|handoff/i);
  });
  it("designs the production cutover flag with an admin-only legacy fallback", () => {
    expect(doc).toMatch(/MODERN_AUTH_DEFAULT/);
    expect(doc).toMatch(/admin.*fallback|emergency fallback/i);
  });
  it("keeps #21 blocked and the rollback invariants", () => {
    expect(doc).toMatch(/#21/);
    expect(doc).toMatch(/allow read, write: if true|never re-open|never reuse/i);
  });
});
