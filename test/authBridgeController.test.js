import { describe, it, expect } from "vitest";
import {
  shouldMountLegacy,
  bridgeUid,
} from "../src/features/auth/authBridgeController.js";

describe("shouldMountLegacy — wait for auth, mount once", () => {
  it("does NOT mount before auth state is resolved", () => {
    expect(shouldMountLegacy({ ready: false, hasUser: true, alreadyMounted: false })).toBe(false);
  });
  it("does NOT mount when resolved but no user", () => {
    expect(shouldMountLegacy({ ready: true, hasUser: false, alreadyMounted: false })).toBe(false);
  });
  it("mounts once auth is resolved AND a user exists", () => {
    expect(shouldMountLegacy({ ready: true, hasUser: true, alreadyMounted: false })).toBe(true);
  });
  it("does NOT mount again once already mounted (no double-mount on repeat events)", () => {
    expect(shouldMountLegacy({ ready: true, hasUser: true, alreadyMounted: true })).toBe(false);
  });
  it("never throws on missing/odd input", () => {
    expect(shouldMountLegacy()).toBe(false);
    expect(shouldMountLegacy({})).toBe(false);
  });
});

describe("bridgeUid — the non-secret uid set before legacy starts", () => {
  it("returns the uid for a real user", () => {
    expect(bridgeUid({ uid: "AbC123" })).toBe("AbC123");
  });
  it("returns null for no/odd user", () => {
    for (const bad of [null, undefined, {}, { uid: "" }, { uid: 123 }]) {
      expect(bridgeUid(bad)).toBe(null);
    }
  });
});
