import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Static guards for the admin-only teacher-granting script. It must grant the
 * real authority (custom claim) AND the profile flag, take credentials only from
 * a runtime env path, and never embed a secret. */

const SRC = readFileSync("scripts/grantTeacher.mjs", "utf8");

describe("grantTeacher — grants real authority + profile flag", () => {
  it("sets the teacher custom claim (the authority the rules check)", () => {
    expect(SRC).toContain("setCustomUserClaims");
    expect(SRC).toMatch(/teacher\b/);
  });
  it("sets the isTeacher profile flag on both the top-level and legacy paths", () => {
    expect(SRC).toMatch(/isTeacher: teacher|isTeacher:\s*teacher/);
    expect(SRC).toContain("users/${uid}/profile/main");
    expect(SRC).toContain("artifacts/${LEGACY_APP_ID}/users/${uid}/profile/main");
  });
  it("supports --revoke", () => {
    expect(SRC).toContain("--revoke");
  });
});

describe("grantTeacher — safe (no committed secret, no password handling)", () => {
  it("reads credentials from a runtime env path, not from source", () => {
    expect(SRC).toContain("ORIEX_SA_KEY");
    expect(SRC).toMatch(/readFileSync\([^)]*keyPath/);
  });
  it("embeds no key material or password handling", () => {
    expect(SRC).not.toContain("PRIVATE KEY");
    expect(SRC).not.toMatch(/\.password\b|password\s*[:=]/i);
  });
});
