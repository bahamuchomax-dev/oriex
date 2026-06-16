import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  seedLegacyLocalSession,
  clearLegacyLocalSession,
} from "../src/features/auth/legacyLocalSession.js";

/* seedLegacyLocalSession writes legacy's localStorage fast-start cache so legacy
 * boots logged-in on reload (it reads `_i("profile")` = genron_profile_<uid> on
 * startup). Key format mirrors legacy __oxPk; values are JSON. No password. */

function makeStore() {
  const m = new Map();
  return {
    _m: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const realWindow = globalThis.window;
let store;
beforeEach(() => {
  store = makeStore();
  globalThis.window = { localStorage: store };
});
afterEach(() => {
  globalThis.window = realWindow;
});

describe("seedLegacyLocalSession", () => {
  it("writes the legacy-format uid + minimal profile (no password)", () => {
    const ok = seedLegacyLocalSession("U123", { shortId: "KWFAQA", name: "太郎" });
    expect(ok).toBe(true);
    expect(store.getItem("genron_uid")).toBe(JSON.stringify("U123"));
    const prof = JSON.parse(store.getItem("genron_profile_U123"));
    expect(prof).toEqual({ uid: "U123", shortId: "KWFAQA", name: "太郎" });
    for (const f of ["password", "passwordHash", "token", "isTeacher", "role"]) {
      expect(Object.keys(prof)).not.toContain(f);
    }
  });

  it("namespaces the profile key per uid and JSON-encodes values", () => {
    seedLegacyLocalSession("ABC", { shortId: "Z" });
    expect(store.getItem("genron_profile_ABC")).toBe(
      JSON.stringify({ uid: "ABC", shortId: "Z", name: "" }),
    );
  });

  it("does not clobber a richer profile legacy already cached", () => {
    store.setItem(
      "genron_profile_U123",
      JSON.stringify({ uid: "U123", shortId: "RICH", totalExp: 99 }),
    );
    seedLegacyLocalSession("U123", { shortId: "KWFAQA", name: "太郎" });
    const prof = JSON.parse(store.getItem("genron_profile_U123"));
    expect(prof.shortId).toBe("RICH");
    expect(prof.totalExp).toBe(99);
  });

  it("seeds avatar/color + isTeacher when provided (reload shows the right identity/role)", () => {
    seedLegacyLocalSession("T1", { shortId: "AAA234", name: "先生", avatar: "bear", color: "#c88040", isTeacher: true });
    const prof = JSON.parse(store.getItem("genron_profile_T1"));
    expect(prof.avatar).toBe("bear");
    expect(prof.color).toBe("#c88040");
    expect(prof.isTeacher).toBe(true);
  });

  it("refreshes isTeacher on an EXISTING cache without clobbering richer fields", () => {
    store.setItem(
      "genron_profile_T2",
      JSON.stringify({ uid: "T2", shortId: "RICH", totalExp: 50, isTeacher: false }),
    );
    seedLegacyLocalSession("T2", { isTeacher: true });
    const prof = JSON.parse(store.getItem("genron_profile_T2"));
    expect(prof.isTeacher).toBe(true); // teacher no longer reverts to user on reload
    expect(prof.totalExp).toBe(50); // richer field preserved
    expect(prof.shortId).toBe("RICH");
  });

  it("is a no-op for a missing uid", () => {
    expect(seedLegacyLocalSession("", { shortId: "X" })).toBe(false);
    expect(seedLegacyLocalSession(null)).toBe(false);
    expect(store._m.size).toBe(0);
  });

  it("never throws when localStorage is unavailable", () => {
    globalThis.window = {};
    expect(seedLegacyLocalSession("U", {})).toBe(false);
  });
});

describe("clearLegacyLocalSession (logout)", () => {
  it("removes the cached uid and that uid's profile", () => {
    store.setItem("genron_uid", JSON.stringify("U123"));
    store.setItem("genron_profile_U123", JSON.stringify({ uid: "U123", shortId: "X" }));
    const ok = clearLegacyLocalSession("U123");
    expect(ok).toBe(true);
    expect(store.getItem("genron_uid")).toBe(null);
    expect(store.getItem("genron_profile_U123")).toBe(null);
  });
  it("does not touch other users' cached profiles", () => {
    store.setItem("genron_profile_OTHER", JSON.stringify({ uid: "OTHER" }));
    clearLegacyLocalSession("U123");
    expect(store.getItem("genron_profile_OTHER")).not.toBe(null);
  });
  it("never throws without a uid or without localStorage", () => {
    expect(clearLegacyLocalSession()).toBe(true); // clears genron_uid only
    globalThis.window = {};
    expect(clearLegacyLocalSession("U")).toBe(false);
  });
});
