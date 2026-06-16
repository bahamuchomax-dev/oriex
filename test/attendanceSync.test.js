import { describe, it, expect } from "vitest";
import { mergeStamps } from "../src/services/attendanceSync.js";

/* mergeStamps is the part with real logic (union by id, local wins). The
 * Firestore/localStorage wiring is thin glue exercised in the app. */

describe("mergeStamps", () => {
  it("unions local and server stamps by id", () => {
    const local = [{ id: "a", v: 1 }];
    const server = [{ id: "b", v: 2 }];
    expect(mergeStamps(local, server)).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
  });

  it("dedups by id, local winning on conflict", () => {
    const local = [{ id: "a", note: "local" }];
    const server = [{ id: "a", note: "server" }, { id: "b", note: "s" }];
    expect(mergeStamps(local, server)).toEqual([
      { id: "a", note: "local" },
      { id: "b", note: "s" },
    ]);
  });

  it("preserves local order first, then new server entries", () => {
    const local = [{ id: "2" }, { id: "1" }];
    const server = [{ id: "1" }, { id: "3" }];
    expect(mergeStamps(local, server).map((s) => s.id)).toEqual(["2", "1", "3"]);
  });

  it("handles empty / non-array inputs safely", () => {
    expect(mergeStamps([], [])).toEqual([]);
    expect(mergeStamps(null, undefined)).toEqual([]);
    expect(mergeStamps([{ id: "a" }], null)).toEqual([{ id: "a" }]);
    expect(mergeStamps(null, [{ id: "b" }])).toEqual([{ id: "b" }]);
  });

  it("falls back to value identity when a stamp has no id", () => {
    const local = [{ d: "2026-06-17" }];
    const server = [{ d: "2026-06-17" }, { d: "2026-06-18" }];
    // first object dedups against the identical server one; the new date is added
    expect(mergeStamps(local, server)).toEqual([{ d: "2026-06-17" }, { d: "2026-06-18" }]);
  });
});
