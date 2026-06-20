import { describe, it, expect, vi, beforeEach } from "vitest";

/* Behavioural tests for the modern auth API with Firebase fully mocked (no real
 * network, no emulator). They prove the security contract: signup writes NO
 * password to Firestore, login uses Firebase Auth and reads/writes nothing, and
 * logout calls signOut. */

vi.mock("../src/firebase/firebase.js", () => ({ auth: { __auth: true }, db: { __db: true } }));
// db.js calls initializeFirestore at load; mock it directly so real init never
// reaches the firestore mock (the auth API reaches firestore transitively).
vi.mock("../src/firebase/db.js", () => ({ db: { __db: true } }));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "UID_NEW" } })),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "UID_LOGIN" } })),
  signOut: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn((email, pw) => ({ __cred: true, email, pw })) },
  reauthenticateWithCredential: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ __path: path.join("/") })),
  setDoc: vi.fn(async () => {}),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}));

import * as fbAuth from "firebase/auth";
import * as fs from "firebase/firestore";
import { auth } from "../src/firebase/firebase.js";
import {
  signUpWithInviteCode,
  loginWithFriendId,
  logout,
  changePassword,
  assertSafePayload,
} from "../src/features/auth/modernAuthApi.js";
import { DEV_INVITE_CODE } from "../src/features/auth/inviteCode.js";
import { validateFriendIdFormat } from "../src/features/auth/friendIdAuth.js";

const PASSWORD = "s3cret-PLAINTEXT-pw";
const EMAIL = "2n7422@friend-id.oriex.invalid";
const EMAIL_RE = /^[a-z0-9]{6}@friend-id\.oriex\.invalid$/;

beforeEach(() => vi.clearAllMocks());

describe("signUpWithInviteCode", () => {
  it("requires a valid invite code, then creates an Auth user with a GENERATED Friend ID", async () => {
    const res = await signUpWithInviteCode({ inviteCode: " gengen ", password: PASSWORD, name: "太郎" });
    expect(res.uid).toBe("UID_NEW");
    // the Friend ID is generated (not supplied) and is well-formed
    expect(validateFriendIdFormat(res.shortId)).toBe(true);
    // Auth user keyed by the internal email derived from that generated id
    expect(fbAuth.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    const [, email, pw] = fbAuth.createUserWithEmailAndPassword.mock.calls[0];
    expect(email).toMatch(EMAIL_RE);
    expect(email.split("@")[0]).toBe(res.shortId.toLowerCase());
    expect(pw).toBe(PASSWORD);
  });
  it("writes the owner profile + public card but NEVER a password / invite code / credential", async () => {
    await signUpWithInviteCode({ inviteCode: DEV_INVITE_CODE, password: PASSWORD });
    const payloads = fs.setDoc.mock.calls.map((c) => c[1]);
    expect(payloads.length).toBe(2);
    for (const p of payloads) {
      for (const forbidden of ["password", "passwordHash", "token", "credential", "inviteCode", "isTeacher", "role", "answer"]) {
        expect(Object.keys(p)).not.toContain(forbidden);
      }
    }
    // neither the password nor the invite code value reaches any Firestore call
    const flat = JSON.stringify(fs.setDoc.mock.calls);
    expect(flat).not.toContain(PASSWORD);
    expect(flat).not.toContain(DEV_INVITE_CODE);
    // writes only the user's own docs
    const paths = fs.doc.mock.calls.map((c) => c.slice(1).join("/"));
    expect(paths).toContain("users/UID_NEW/profile/main");
    expect(paths).toContain("public/data/customApp/UID_NEW");
  });
  it("accepts case/space/hyphen/full-width variants of the invite code", async () => {
    for (const code of ["gengen", "GEN GEN", "ＧＥＮＧＥＮ"]) {
      vi.clearAllMocks();
      await signUpWithInviteCode({ inviteCode: code, password: PASSWORD });
      expect(fbAuth.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects an invalid invite code before any Auth/Firestore call", async () => {
    await expect(signUpWithInviteCode({ inviteCode: "WRONG", password: PASSWORD })).rejects.toThrow(
      /invalid-invite-code/,
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

describe("changePassword", () => {
  const NEW_PW = "brandNew-pw-9";
  beforeEach(() => {
    auth.currentUser = { uid: "UID_ME", email: EMAIL };
  });

  it("reauthenticates with the current password, then updates to the new one", async () => {
    const r = await changePassword({ currentPassword: PASSWORD, newPassword: NEW_PW });
    expect(r).toEqual({ uid: "UID_ME" });
    // reauth uses the signed-in user's own email + the CURRENT password
    expect(fbAuth.EmailAuthProvider.credential).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(fbAuth.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, {
      __cred: true,
      email: EMAIL,
      pw: PASSWORD,
    });
    // then the NEW password is set on Auth — and only after reauth
    expect(fbAuth.updatePassword).toHaveBeenCalledWith(auth.currentUser, NEW_PW);
    const reauthOrder = fbAuth.reauthenticateWithCredential.mock.invocationCallOrder[0];
    const updateOrder = fbAuth.updatePassword.mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(updateOrder);
  });

  it("touches Firestore for NOTHING (password never written) ", async () => {
    await changePassword({ currentPassword: PASSWORD, newPassword: NEW_PW });
    expect(fs.doc).not.toHaveBeenCalled();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it("rejects when nobody is signed in", async () => {
    auth.currentUser = null;
    await expect(changePassword({ currentPassword: PASSWORD, newPassword: NEW_PW })).rejects.toThrow(
      /not-signed-in/,
    );
    expect(fbAuth.reauthenticateWithCredential).not.toHaveBeenCalled();
  });

  it("rejects a weak (<6) new password before any Auth call", async () => {
    await expect(changePassword({ currentPassword: PASSWORD, newPassword: "123" })).rejects.toThrow(
      /weak-password/,
    );
    expect(fbAuth.reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(fbAuth.updatePassword).not.toHaveBeenCalled();
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
