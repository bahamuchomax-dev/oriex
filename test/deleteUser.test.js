import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Static guards for the admin-only delete-user script. */

const SRC = readFileSync("scripts/deleteUser.mjs", "utf8");

describe("deleteUser — admin delete (auth + data)", () => {
  it("resolves a Friend ID or uid and deletes the Auth account + own data", () => {
    expect(SRC).toContain("makeInternalAuthEmailFromFriendId");
    expect(SRC).toContain("getUserByEmail");
    expect(SRC).toContain("deleteUser");
    expect(SRC).toMatch(/recursiveDelete/);
  });
  it("reads credentials from a runtime env path and embeds no key material", () => {
    expect(SRC).toContain("ORIEX_SA_KEY");
    expect(SRC).not.toContain("PRIVATE KEY");
  });
});
