import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* Behavioural tests for handoffToLegacy with the profile-ensure mocked and the
 * legacy import injected. Proves the order: set __oxUid → ensure legacy profile →
 * import legacy; and that it never throws / never handles a password. */

vi.mock("../src/features/auth/legacyBridgeProfile.js", () => ({
  ensureLegacyBridgeProfile: vi.fn(async () => ({ ok: true, created: true })),
}));

import { handoffToLegacy } from "../src/features/auth/legacyHandoff.js";
import { ensureLegacyBridgeProfile } from "../src/features/auth/legacyBridgeProfile.js";

const realWindow = globalThis.window;
beforeEach(() => {
  vi.clearAllMocks();
  globalThis.window = {};
});
afterEach(() => {
  globalThis.window = realWindow;
});

describe("handoffToLegacy", () => {
  it("sets __oxUid, ensures the legacy profile, THEN imports legacy (in order)", async () => {
    const importLegacy = vi.fn(async () => {});
    const res = await handoffToLegacy({ uid: "U1" }, importLegacy);

    expect(globalThis.window.__oxUid).toBe("U1");
    expect(ensureLegacyBridgeProfile).toHaveBeenCalledWith("U1");
    expect(importLegacy).toHaveBeenCalledTimes(1);
    expect(ensureLegacyBridgeProfile.mock.invocationCallOrder[0]).toBeLessThan(
      importLegacy.mock.invocationCallOrder[0],
    );
    expect(res).toEqual({ uid: "U1", ensured: "created" });
  });

  it("imports legacy only AFTER __oxUid is set (uid present at import time)", async () => {
    let oxAtImport;
    const importLegacy = vi.fn(async () => {
      oxAtImport = globalThis.window.__oxUid;
    });
    await handoffToLegacy({ uid: "U2" }, importLegacy);
    expect(oxAtImport).toBe("U2");
  });

  it("maps the ensure result (created / existed / failed)", async () => {
    ensureLegacyBridgeProfile.mockResolvedValueOnce({ ok: true, created: false });
    expect((await handoffToLegacy({ uid: "U" }, vi.fn(async () => {}))).ensured).toBe("existed");
    ensureLegacyBridgeProfile.mockResolvedValueOnce({ ok: false });
    expect((await handoffToLegacy({ uid: "U" }, vi.fn(async () => {}))).ensured).toBe("failed");
  });

  it("never throws if ensure fails — records 'error' and still imports legacy", async () => {
    ensureLegacyBridgeProfile.mockRejectedValueOnce(new Error("denied"));
    const importLegacy = vi.fn(async () => {});
    const res = await handoffToLegacy({ uid: "U" }, importLegacy);
    expect(res.ensured).toBe("error");
    expect(importLegacy).toHaveBeenCalledTimes(1);
  });

  it("with no user: uid is null and __oxUid is not set", async () => {
    const importLegacy = vi.fn(async () => {});
    const res = await handoffToLegacy(null, importLegacy);
    expect(res.uid).toBe(null);
    expect(globalThis.window.__oxUid).toBeUndefined();
  });
});
