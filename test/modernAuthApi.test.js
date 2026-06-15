import { describe, it, expect, vi, beforeEach } from "vitest";

/* Behavioural tests for the modern auth API with Firebase fully mocked (no real
 * network, no emulator). They prove the security contract: signup writes NO
 * password to Firestore, login uses Firebase Auth and reads/writes nothing, and
 * logout calls signOut. */

vi.mock("../src/firebase/firebase.js", () => ({ auth: { __auth: true }, db: { __db: true } }));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "UID_NEW" } })),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "UID_LOGIN" } })),
  signOut: vi.fn(async () => {}),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ __path: path.join("/") })),
  setDoc: vi.fn(async () => {}),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}));

import * as fbAuth from "firebase/auth";
import * as fs from "firebase/firestore";
import {
  signUpWithFriendId,
  loginWithFriendId,
  logout,
  assertSafePayload,
} from "../src/features/auth/modernAuthApi.js";

const PASSWORD = "s3cret-PLAINTEXT-pw";
const EMAIL = "2n7422@friend-id.oriex.invalid";

beforeEach(() => vi.clearAllMocks());

describe("signUpWithFriendId", () => {
  it("creates a real Auth user keyed by the deterministic internal email", async () => {
    const res = await signUpWithFriendId({ friendId: " 2n7422 ", password: PASSWORD, name: "太郎" });
    expect(res).toEqual({ uid: "UID_NEW", shortId: "2N7422" });
    expect(fbAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { __auth: true },
      EMAIL,
      PASSWORD,
    );
  });
  it("writes the owner profile + public card but NEVER a password/credential", async () => {
    await signUpWithFriendId({ friendId: "2N7422", password: PASSWORD });
    const payloads = fs.setDoc.mock.calls.map((c) => c[1]);
    expect(payloads.length).toBe(2);
    for (const p of payloads) {
      for (const forbidden of ["password", "passwordHash", "token", "credential", "isTeacher", "role", "answer"]) {
        expect(Object.keys(p)).not.toContain(forbidden);
      }
    }
    // the password value never reaches any Firestore call
    expect(JSON.stringify(fs.setDoc.mock.calls)).not.toContain(PASSWORD);
    // writes only the user's own docs
    const paths = fs.doc.mock.calls.map((c) => c.slice(1).join("/"));
    expect(paths).toContain("users/UID_NEW/profile/main");
    expect(paths).toContain("public/data/customApp/UID_NEW");
  });
  it("rejects an invalid Friend ID before any Auth/Firestore call", async () => {
    await expect(signUpWithFriendId({ friendId: "bad!", password: PASSWORD })).rejects.toThrow(
      /invalid-friend-id/,
    );
    expect(fbAuth.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});

describe("loginWithFriendId", () => {
  it("signs in via Firebase Auth with the derived email", async () => {
    const r = await loginWithFriendId({ friendId: "2N7422", password: PASSWORD });
    expect(r).toEqual({ uid: "UID_LOGIN" });
    expect(fbAuth.signInWithEmailAndPassword).toHaveBeenCalledWith({ __auth: true }, EMAIL, PASSWORD);
  });
  it("reads NOTHING from Firestore (no profile/main lookup) and writes nothing", async () => {
    await loginWithFriendId({ friendId: "2N7422", password: PASSWORD });
    expect(fs.doc).not.toHaveBeenCalled();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
  it("rejects an invalid Friend ID before any Auth call", async () => {
    await expect(loginWithFriendId({ friendId: "x", password: PASSWORD })).rejects.toThrow();
    expect(fbAuth.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("calls Firebase signOut", async () => {
    await logout();
    expect(fbAuth.signOut).toHaveBeenCalledWith({ __auth: true });
  });
});

describe("assertSafePayload", () => {
  it("throws on any credential / authority / answer field", () => {
    for (const bad of [
      { password: "x" }, { passwordHash: "x" }, { token: "x" }, { credential: "x" },
      { isTeacher: true }, { role: "admin" }, { teacherId: "t" }, { answer: "a" },
    ]) {
      expect(() => assertSafePayload(bad)).toThrow(/unsafe field/);
    }
  });
  it("passes a clean public payload through unchanged", () => {
    const ok = { shortId: "2N7422", uid: "U", name: "太郎", updatedAt: 1 };
    expect(assertSafePayload(ok)).toBe(ok);
  });
});
