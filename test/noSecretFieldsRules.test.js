import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Gated rules hardening — noSecretFields() (PR #21).
 *
 * ⛔ The rules in THIS branch must not be deployed until the Firebase Auth
 * migration is complete (the live legacy bundle still writes a plaintext
 * `password`). These STATIC guards prove the credential ban is wired into every
 * world-readable login-directory write and the legacy self profile, and that the
 * DO-NOT-DEPLOY banner is present. No emulator (Java not installed); behavioural
 * tests are `npm run test:rules`. See AUTH_RECOVERY_PLAN.md. */

const RULES = readFileSync("firestore.rules", "utf8");
const RULES_CODE = RULES.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CREDENTIAL_FIELDS = ["password", "passwordHash", "pass", "pin", "secret", "credential"];

/* text of `match <path> { ... }` with balanced braces */
function block(path) {
  const header = "match " + path;
  const start = RULES.indexOf(header);
  if (start === -1) throw new Error("rule block not found: " + path);
  const lineEnd = RULES.indexOf("\n", start);
  const open = RULES.lastIndexOf("{", lineEnd);
  let depth = 0;
  for (let i = open; i < RULES.length; i++) {
    if (RULES[i] === "{") depth++;
    else if (RULES[i] === "}") {
      depth--;
      if (depth === 0) return RULES.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces for: " + path);
}

describe("noSecretFields() — credential ban definition", () => {
  it("is defined and rejects every credential field", () => {
    const m = RULES.match(/function noSecretFields\(\)\s*\{[\s\S]*?\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain("!request.resource.data.keys()");
    for (const f of CREDENTIAL_FIELDS) expect(m[0].includes("'" + f + "'")).toBe(true);
  });
});

describe("noSecretFields() — applied to every world-readable login-directory write", () => {
  it("artifacts customApp (public-read) write rejects credentials", () => {
    expect(RULES_CODE).toMatch(
      /customApp\/\{cardUid\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(cardUid\) && noSecretFields\(\);/,
    );
  });
  it("artifacts teacherIndex (public-read) write rejects credentials", () => {
    expect(RULES_CODE).toMatch(
      /teacherIndex\/\{docId\}\s*\{\s*allow read: if true;\s*allow write: if isSelf\(docId\) && noAuthorityFields\(\) && noAnswerFields\(\) && noSecretFields\(\);/,
    );
  });
  it("top-level public customApp card write rejects credentials", () => {
    const b = block("/public/data/customApp/{cardUid}");
    expect(b).toMatch(/create, update:[\s\S]*noSecretFields\(\)/);
  });
});

describe("noSecretFields() — applied to the legacy self profile (where the password lived)", () => {
  const b = block("/users/{u}/profile/main");
  it("create rejects credential fields", () => {
    expect(b).toMatch(/create:[\s\S]*noSecretFields\(\)/);
  });
  it("self update rejects credential fields", () => {
    expect(b).toMatch(/update:[\s\S]*isSelf\(u\) && authorityUnchanged\(\) && noSecretFields\(\)/);
  });
});

describe("noSecretFields() — read surface and posture are unchanged by the hardening", () => {
  it("does not touch any `allow read` rule (still exactly two public reads)", () => {
    const reads = RULES_CODE.match(/allow read: if true;/g) || [];
    expect(reads.length).toBe(2);
  });
  it("profile/main is still owner-read only (no unauthenticated read)", () => {
    const r = block("/users/{u}/profile/main").match(/allow read:[^\n]*/)[0];
    expect(r).toContain("isSelf(u)");
    expect(r).not.toMatch(/if true/);
  });
  it("no `allow read, write: if true` wildcard exists", () => {
    expect(RULES_CODE).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/);
  });
});

describe("gated hardening — DO NOT DEPLOY banner is present", () => {
  it("firestore.rules carries the do-not-deploy-until-migration banner", () => {
    expect(RULES).toMatch(/DO NOT DEPLOY UNTIL FIREBASE AUTH MIGRATION/);
  });
  it("rules_version is still the first statement (file stays parseable)", () => {
    expect(RULES.trimStart().startsWith("rules_version = '2';")).toBe(true);
  });
});
