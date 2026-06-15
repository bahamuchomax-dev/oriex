import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/* Guardrails that prevent re-introducing the unsafe plaintext-password login by
 * loosening Firestore Rules. These lock in the current safe posture
 * (see SECURE_AUTH_MIGRATION_PLAN.md). They must FAIL if someone:
 *  - restores allow-true,
 *  - opens unauthenticated/broad reads of users/{uid} (which holds profile/main
 *    with the legacy plaintext password),
 *  - makes any private path publicly readable,
 *  - lets a public index carry authority/answer fields. */

const RULES = readFileSync("firestore.rules", "utf8");
// comments stripped so doc text quoting old patterns can't cause false matches
const CODE = RULES.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("auth guardrails — no allow-true rollback", () => {
  it("has no full read+write wildcard", () => {
    expect(CODE).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/);
  });
  it("has no write/mutation granted via `if true`", () => {
    expect(CODE).not.toMatch(/allow\s+(?:write|create|update|delete)\b[^\n]*:\s*if\s+true\b/);
  });
  it("ends with an explicit default-deny", () => {
    expect(CODE).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);
  });
});

describe("auth guardrails — users subtree (profile/main + password) stays owner-only", () => {
  it("artifacts users subtree read/write is isSelf(uid) only", () => {
    expect(CODE).toMatch(
      /match \/users\/\{uid\}\/\{document=\*\*\}\s*\{\s*allow read, write: if isSelf\(uid\);/,
    );
  });
  it("does NOT grant public or signed-in-wide read on the users subtree", () => {
    const m = CODE.match(/match \/users\/\{uid\}\/\{document=\*\*\}\s*\{([\s\S]*?)\}/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toContain("allow read: if true");
    expect(m[1]).not.toContain("allow read: if signedIn()");
  });
  it("no rule opens a profile/main path to public/signed-in read", () => {
    // any match block whose path includes profile/main must not be world/signed-in readable
    expect(CODE).not.toMatch(/profile\/main[^}]*allow read: if true/);
    expect(CODE).not.toMatch(/profile\/main[^}]*allow read: if signedIn\(\)/);
  });
});

describe("auth guardrails — public reads limited to the login directories", () => {
  it("only customApp and teacherIndex are public-read (exactly two)", () => {
    const reads = CODE.match(/allow read: if true;/g) || [];
    expect(reads.length).toBe(2);
    expect(CODE).toMatch(/customApp\/\{cardUid\}\s*\{\s*allow read: if true;/);
    expect(CODE).toMatch(/teacherIndex\/\{docId\}\s*\{\s*allow read: if true;/);
  });
  it("teacherIndex public index rejects authority and answer fields on write", () => {
    expect(CODE).toMatch(
      /teacherIndex\/\{docId\}[\s\S]*allow write: if isSelf\(docId\) && noAuthorityFields\(\) && noAnswerFields\(\);/,
    );
  });
  it("public-index writes are owner-bound (no unauthenticated/broad write)", () => {
    expect(CODE).toMatch(/customApp\/\{cardUid\}[\s\S]*allow write: if isSelf\(cardUid\);/);
  });
});

describe("auth guardrails — rules never depend on a password field", () => {
  it("firestore.rules contains no `password` reference", () => {
    // Secure design must not read/compare a password in rules; password handling
    // belongs to Firebase Auth (see SECURE_AUTH_MIGRATION_PLAN.md).
    expect(CODE).not.toMatch(/password/i);
  });
});

describe("auth guardrails — the migration plan is documented", () => {
  it("SECURE_AUTH_MIGRATION_PLAN.md records the plaintext-password finding", () => {
    expect(existsSync("SECURE_AUTH_MIGRATION_PLAN.md")).toBe(true);
    const plan = readFileSync("SECURE_AUTH_MIGRATION_PLAN.md", "utf8");
    expect(plan).toMatch(/plaintext/i);
    expect(plan).toMatch(/Firebase Auth/);
  });
});
