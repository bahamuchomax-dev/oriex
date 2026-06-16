import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Static guards for the admin-only teacher-account creator. It must create a
 * Firebase user, grant the teacher claim + profile flag, derive the login email
 * from the generated Friend ID, take credentials from a runtime env path, and
 * embed no key material. */

const SRC = readFileSync("scripts/createTeacher.mjs", "utf8");

describe("createTeacher — creates a working teacher login", () => {
  it("creates a Firebase user with the Friend-ID-derived email + generated password", () => {
    expect(SRC).toContain("createUser");
    expect(SRC).toContain("makeInternalAuthEmailFromFriendId");
    expect(SRC).toContain("generateFriendId");
    expect(SRC).toContain("generatePassword");
  });
  it("grants the teacher custom claim and the isTeacher profile flag", () => {
    expect(SRC).toContain("setCustomUserClaims");
    expect(SRC).toMatch(/teacher:\s*true/);
    expect(SRC).toMatch(/isTeacher:\s*true/);
  });
  it("prints the Friend ID + password for the admin to hand over", () => {
    expect(SRC).toContain("Friend ID");
    expect(SRC).toMatch(/shortId/);
  });
});

describe("createTeacher — safe (no committed secret)", () => {
  it("reads credentials from a runtime env path, not source", () => {
    expect(SRC).toContain("ORIEX_SA_KEY");
    expect(SRC).toMatch(/readFileSync\([^)]*keyPath/);
  });
  it("embeds no private key material", () => {
    expect(SRC).not.toContain("PRIVATE KEY");
  });
});
