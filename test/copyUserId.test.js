import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  PLACEHOLDER_UID,
  isCopyableUid,
  copyUserId,
} from "../src/features/profile/copyUserId.js";

describe("isCopyableUid", () => {
  it("accepts a real non-empty uid string", () => {
    expect(isCopyableUid("aBc123XyzUid")).toBe(true);
  });
  it("rejects the not-signed-in placeholder, empty, and non-strings", () => {
    expect(isCopyableUid(PLACEHOLDER_UID)).toBe(false);
    expect(isCopyableUid("")).toBe(false);
    for (const bad of [null, undefined, 123, {}, []]) expect(isCopyableUid(bad)).toBe(false);
  });
});

describe("copyUserId", () => {
  it("writes the uid via the provided clipboard and returns true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const ok = await copyUserId("uid-123", { writeText });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("uid-123");
  });
  it("copies the uid value verbatim — nothing else", async () => {
    let captured = null;
    await copyUserId("uid-123", { writeText: (t) => ((captured = t), Promise.resolve()) });
    expect(captured).toBe("uid-123");
  });
  it("does not copy and returns false for a non-copyable uid", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyUserId(PLACEHOLDER_UID, { writeText })).toBe(false);
    expect(await copyUserId("", { writeText })).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
  it("returns false (never throws) when the clipboard is missing or fails", async () => {
    expect(await copyUserId("uid-123", null)).toBe(false);
    expect(await copyUserId("uid-123", {})).toBe(false);
    const ok = await copyUserId("uid-123", {
      writeText: () => Promise.reject(new Error("denied")),
    });
    expect(ok).toBe(false);
  });
});

/* ---- static guards: the Profile wiring is read-only and uid-only ---- */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const HELPER_SRC = readFileSync("src/features/profile/copyUserId.js", "utf8");
const HELPER_CODE = stripComments(HELPER_SRC); // doc comments legitimately name these
const PROFILE_SRC = readFileSync("src/features/profile/Profile.jsx", "utf8");

describe("copyUserId helper — read-only, uid-only, no credential surfaces", () => {
  it("the executable code never touches tokens / claims / role / admin / password / Firestore", () => {
    for (const forbidden of [
      "token", "claims", "role", "admin", "isTeacher", "password",
      "firestore", "setDoc", "updateDoc", "getDoc",
    ]) {
      expect(HELPER_CODE.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("Profile UID display — copy button wired, still read-only", () => {
  it("renders a copy button that calls copyUserId, only for a copyable uid", () => {
    expect(PROFILE_SRC).toContain('import { copyUserId, isCopyableUid }');
    expect(PROFILE_SRC).toContain("isCopyableUid(profileUid)");
    expect(PROFILE_SRC).toContain("copyUserId(profileUid)");
    expect(PROFILE_SRC).toMatch(/aria-label="ユーザーIDをコピー"/);
  });
  it("the ID display area exposes no authority/credential internals", () => {
    // narrow to the rx-pid block we added
    const m = PROFILE_SRC.match(/<div className="rx-pid">[\s\S]*?<\/div>/);
    expect(m).toBeTruthy();
    for (const forbidden of ["token", "claims", "role", "admin", "isTeacher", "password"]) {
      expect(m[0].toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
  it("does not add any Firestore/profile write for the UID display", () => {
    // the only profiles.save call remains the existing name/bio save
    const saves = PROFILE_SRC.match(/profiles\.save\(/g) || [];
    expect(saves.length).toBe(1);
  });
});
