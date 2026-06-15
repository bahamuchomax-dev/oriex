import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  safeAuthErrorMessage,
} from "../src/features/auth/friendIdAuth.js";

/* The auth utilities must never log (and therefore can never log a password).
 * Two layers: a static check that the module has no console.* calls, and a
 * runtime check that exercising every function with password-bearing inputs
 * produces no console output and no return value containing the secret. */

const MODULE_SRC = readFileSync("src/features/auth/friendIdAuth.js", "utf8");
const SECRET = "hunter2-PLAINTEXT";

describe("friendIdAuth — no logging (static)", () => {
  it("the module source contains no console.* call", () => {
    expect(MODULE_SRC).not.toMatch(/console\s*\./);
  });
  it("the module never reads a `.password` field off any object", () => {
    // helpers operate on the public Friend ID handle only — they never access a
    // credential value. (The Firebase error CODES like "auth/wrong-password" are
    // string literals, not field reads, so they are fine.)
    expect(MODULE_SRC).not.toMatch(/\.password\b/);
  });
});

describe("friendIdAuth — no password leakage (runtime)", () => {
  /** @type {Array<{method: string, args: unknown[]}>} */
  let calls;
  const methods = ["log", "info", "warn", "error", "debug", "trace"];
  const spies = [];

  beforeEach(() => {
    calls = [];
    for (const m of methods) {
      spies.push(
        vi.spyOn(console, m).mockImplementation((...args) => {
          calls.push({ method: m, args });
        }),
      );
    }
  });
  afterEach(() => {
    for (const s of spies.splice(0)) s.mockRestore();
  });

  it("exercising all helpers with secret-bearing inputs logs nothing", () => {
    normalizeFriendId(`ABC234 ${SECRET}`);
    validateFriendIdFormat(`ABC234${SECRET}`);
    try {
      makeInternalAuthEmailFromFriendId(`ABC234-${SECRET}`);
    } catch {
      /* expected: invalid format */
    }
    safeAuthErrorMessage({
      code: "auth/wrong-password",
      message: `password '${SECRET}' is wrong`,
      customData: { password: SECRET },
    });

    expect(calls).toEqual([]);
    // and just to be explicit: no console arg ever carried the secret
    const flat = JSON.stringify(calls);
    expect(flat).not.toContain(SECRET);
  });

  it("no helper return value echoes the secret", () => {
    const outputs = [
      normalizeFriendId(`ABC234${SECRET}`),
      String(validateFriendIdFormat(`ABC234${SECRET}`)),
      safeAuthErrorMessage({ code: "auth/wrong-password", message: SECRET }),
    ];
    for (const out of outputs) expect(out).not.toContain(SECRET);

    let thrownMsg = "";
    try {
      makeInternalAuthEmailFromFriendId(SECRET);
    } catch (e) {
      thrownMsg = e.message;
    }
    expect(thrownMsg).not.toContain(SECRET);
  });
});
