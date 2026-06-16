import { describe, it, expect, vi, beforeEach } from "vitest";

/* Behavioural tests for ensureLegacyBridgeProfile with Firebase mocked. Prove it
 * writes a minimal, OWN-uid, no-password profile at the LEGACY path so legacy
 * adopts the session — and never copies/writes a password. */

vi.mock("../src/firebase/firebase.js", () => ({ auth: { __auth: true }, db: { __db: true } }));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ __path: path.join("/") })),
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
  serverTimestamp: vi.fn(() => "TS"),
}));

import * as fs from "firebase/firestore";
import {
  ensureLegacyBridgeProfile,
  LEGACY_APP_ID,
} from "../src/features/auth/legacyBridgeProfile.js";

const LEGACY_PATH = `artifacts/${LEGACY_APP_ID}/users/UID/profile/main`;
const MODERN_PATH = "users/UID/profile/main";

beforeEach(() => vi.clearAllMocks());

describe("ensureLegacyBridgeProfile", () => {
  it("does nothing if the legacy-path profile is already complete (returns its identity, no modern read/write)", async () => {
    fs.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ shortId: "EX1234", name: "既存", avatar: "cat", color: "#abc" }),
    });
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r).toEqual({ ok: true, created: false, shortId: "EX1234", name: "既存", avatar: "cat", color: "#abc", isTeacher: false });
    expect(fs.getDoc).toHaveBeenCalledTimes(1); // legacy doc only — no modern read needed
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it("self-heals: back-fills missing name/icon from the modern profile and persists to the legacy doc (fixes the reload→'ユウキ' revert)", async () => {
    fs.getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ shortId: "EX1234" }) }) // legacy exists but name/icon empty
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: "本名", avatar: "bear", color: "#c80", password: "should-not-copy" }),
      });
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r).toEqual({ ok: true, created: false, shortId: "EX1234", name: "本名", avatar: "bear", color: "#c80", isTeacher: false });

    // back-fill written to the LEGACY path, identity fields only, NO credential/authority
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = fs.setDoc.mock.calls[0];
    expect(ref.__path).toBe(LEGACY_PATH);
    expect(payload.name).toBe("本名");
    expect(payload.avatar).toBe("bear");
    expect(payload.color).toBe("#c80");
    for (const f of ["password", "passwordHash", "isTeacher", "role"]) {
      expect(Object.keys(payload)).not.toContain(f);
    }
    expect(JSON.stringify(fs.setDoc.mock.calls)).not.toContain("should-not-copy");
  });

  it("self-heal preserves an existing teacher flag and never writes it back", async () => {
    fs.getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ shortId: "T1", name: "先生", isTeacher: true }) }) // teacher, missing icon
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ avatar: "teacher", color: "#c88040" }) });
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r.isTeacher).toBe(true);
    expect(r.avatar).toBe("teacher");
    const [, payload] = fs.setDoc.mock.calls[0];
    expect(Object.keys(payload)).not.toContain("isTeacher");
  });

  it("self-heal is a no-op write when the modern profile has nothing to fill", async () => {
    fs.getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ shortId: "EX1234" }) }) // legacy: name/icon empty
      .mockResolvedValueOnce({ exists: () => false }); // modern missing → nothing to back-fill
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r.name).toBe("");
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it("creates a minimal legacy profile (own paths), carrying shortId/name, NO password", async () => {
    fs.getDoc
      .mockResolvedValueOnce({ exists: () => false }) // legacy artifacts path: missing
      .mockResolvedValueOnce({
        exists: () => true,
        // even if the modern doc had a password, only shortId/name are copied
        data: () => ({ shortId: "KWFAQA", name: "太郎", password: "should-not-copy" }),
      });
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r).toEqual({ ok: true, created: true, shortId: "KWFAQA", name: "太郎", avatar: "", color: "", isTeacher: false });

    // read own legacy + own modern profile only
    const readPaths = fs.doc.mock.calls.map((c) => c.slice(1).join("/"));
    expect(readPaths).toContain(LEGACY_PATH);
    expect(readPaths).toContain(MODERN_PATH);

    // wrote to the LEGACY path with shortId/name and NO credential field
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = fs.setDoc.mock.calls[0];
    expect(ref.__path).toBe(LEGACY_PATH);
    expect(payload.shortId).toBe("KWFAQA");
    expect(payload.name).toBe("太郎");
    for (const f of ["password", "passwordHash", "token", "isTeacher", "role", "teacherId", "answer"]) {
      expect(Object.keys(payload)).not.toContain(f);
    }
    expect(JSON.stringify(fs.setDoc.mock.calls)).not.toContain("should-not-copy");
  });

  it("creates a minimal profile even when no modern profile exists", async () => {
    fs.getDoc
      .mockResolvedValueOnce({ exists: () => false }) // legacy missing
      .mockResolvedValueOnce({ exists: () => false }); // modern missing
    const r = await ensureLegacyBridgeProfile("UID");
    expect(r.created).toBe(true);
    const [, payload] = fs.setDoc.mock.calls[0];
    expect(payload.shortId).toBe("");
    expect(Object.keys(payload)).not.toContain("password");
  });

  it("returns {ok:false} and touches Firestore for nothing when uid is missing", async () => {
    for (const bad of ["", null, undefined, 123]) {
      const r = await ensureLegacyBridgeProfile(bad);
      expect(r.ok).toBe(false);
    }
    expect(fs.getDoc).not.toHaveBeenCalled();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});
