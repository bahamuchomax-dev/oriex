import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  installReadMeter,
  isReadMeterEnabled,
  __resetReadMeterForTests,
} from "../src/services/diagnostics/readMeter.js";

/* readMeter is an OPT-IN, OBSERVE-ONLY Firestore read counter installed at the
 * network transport (the one layer the frozen legacy bundle and the modern
 * shell both funnel through). These tests pin the behavior that matters:
 *   - it stays dormant unless the flag is set (no global wrapping when off)
 *   - it counts documents, not collection/query-target echoes
 *   - streaming responses (growing responseText) don't double-count
 *   - it never disturbs the request/response it observes
 */

const PROJECT = "projects/genro-b74de/databases/(default)/documents";

// A WebChannel-ish payload: two real bookLog documents (even-segment names with
// `fields`) plus a query TARGET that references the collection path (odd
// segments) — the target must NOT be counted.
function fsResponse() {
  return JSON.stringify([
    { targetChange: { targetChangeType: "ADD", targetIds: [2] } },
    {
      documentChange: {
        document: {
          name: `${PROJECT}/users/UID1/bookLogs/AAA`,
          fields: { minutes: { integerValue: "30" } },
        },
        targetIds: [2],
      },
    },
    {
      documentChange: {
        document: {
          name: `${PROJECT}/users/UID1/bookLogs/BBB`,
          fields: { minutes: { integerValue: "45" } },
        },
        targetIds: [2],
      },
    },
    // A profile doc (single document fetch).
    {
      documentChange: {
        document: { name: `${PROJECT}/profiles/UID1`, fields: { name: { stringValue: "x" } } },
      },
    },
    // Query target echo at the COLLECTION path — odd segments, must be ignored.
    { documentsTarget: { documents: [`${PROJECT}/users/UID1/bookLogs`] } },
  ]);
}

/* Minimal fake XHR whose prototype readMeter can wrap, with a manual event pump. */
function makeXhrClass() {
  return class FakeXHR {
    constructor() {
      this._listeners = {};
      this.responseType = "";
      this.responseText = "";
      this.status = 200;
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    send() {}
    addEventListener(type, fn) {
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    }
    _emit(type) {
      (this._listeners[type] || []).forEach((fn) => fn.call(this, { type }));
    }
  };
}

function makeScope(extra = {}) {
  return {
    XMLHttpRequest: makeXhrClass(),
    localStorage: {
      _m: new Map(),
      getItem(k) {
        return this._m.has(k) ? this._m.get(k) : null;
      },
      setItem(k, v) {
        this._m.set(k, String(v));
      },
    },
    ...extra,
  };
}

beforeEach(() => {
  __resetReadMeterForTests();
});

describe("readMeter — gating", () => {
  it("is OFF by default (no flag) and wraps nothing", () => {
    const scope = makeScope();
    const ProtoOpen = scope.XMLHttpRequest.prototype.open;
    const active = installReadMeter({ scope, location: { search: "", hash: "" } });
    expect(active).toBe(false);
    expect(scope.__oxReads).toBeUndefined();
    expect(scope.XMLHttpRequest.prototype.open).toBe(ProtoOpen); // untouched
  });

  it("enables via ?oxReadMeter=1, #ox-read-meter, or localStorage", () => {
    expect(isReadMeterEnabled({ search: "?oxReadMeter=1", hash: "" })).toBe(true);
    expect(isReadMeterEnabled({ search: "", hash: "#ox-read-meter" })).toBe(true);
    const store = { getItem: (k) => (k === "oxReadMeter" ? "1" : null) };
    expect(isReadMeterEnabled({ search: "", hash: "" }, store)).toBe(true);
    expect(isReadMeterEnabled({ search: "?foo=1", hash: "#bar" })).toBe(false);
  });
});

describe("readMeter — counting", () => {
  it("counts documents per collection group and ignores query-target echoes", () => {
    const scope = makeScope();
    installReadMeter({ scope, force: true });
    expect(scope.__oxReads).toBeDefined();

    const xhr = new scope.XMLHttpRequest();
    xhr.open("POST", "https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel");
    xhr.send();
    xhr.responseText = fsResponse();
    xhr._emit("loadend");

    const snap = scope.__oxReads.snapshot();
    // 2 bookLogs + 1 profile = 3 documents. Collection-path echo not counted.
    expect(snap.total).toBe(3);
    expect(snap.groups["users/bookLogs"]).toBe(2);
    expect(snap.groups["profiles"]).toBe(1);
    expect(snap.paths["users/*/bookLogs/*"]).toBe(2);
    expect(snap.requests).toBe(1);
  });

  it("does not double-count a streaming response delivered in two chunks", () => {
    const scope = makeScope();
    installReadMeter({ scope, force: true });

    const xhr = new scope.XMLHttpRequest();
    xhr.open("POST", "https://firestore.googleapis.com/Listen/channel");
    xhr.send();

    const full = fsResponse();
    const cut = Math.floor(full.length / 2);
    xhr.responseText = full.slice(0, cut);
    xhr._emit("progress");
    xhr.responseText = full; // grows
    xhr._emit("progress");
    xhr._emit("loadend");

    expect(scope.__oxReads.snapshot().total).toBe(3);
  });

  it("ignores non-Firestore XHRs entirely", () => {
    const scope = makeScope();
    installReadMeter({ scope, force: true });

    const xhr = new scope.XMLHttpRequest();
    xhr.open("GET", "https://example.com/api/thing");
    xhr.send();
    xhr.responseText = fsResponse(); // even Firestore-shaped text must be ignored
    xhr._emit("loadend");

    expect(scope.__oxReads.total).toBe(0);
  });

  it("reset() zeroes the counters", () => {
    const scope = makeScope();
    installReadMeter({ scope, force: true });
    const xhr = new scope.XMLHttpRequest();
    xhr.open("POST", "https://firestore.googleapis.com/Listen/channel");
    xhr.send();
    xhr.responseText = fsResponse();
    xhr._emit("loadend");
    expect(scope.__oxReads.total).toBe(3);
    scope.__oxReads.reset();
    expect(scope.__oxReads.total).toBe(0);
    expect(scope.__oxReads.snapshot().groups).toEqual({});
  });
});

describe("readMeter — fetch transport", () => {
  it("counts documents from a fetch() Firestore response without consuming the body", async () => {
    const body = fsResponse();
    const realText = vi.fn().mockResolvedValue(body);
    const res = {
      clone: () => ({ text: realText }),
      text: () => Promise.resolve(body),
    };
    const scope = makeScope({ fetch: vi.fn().mockResolvedValue(res) });
    installReadMeter({ scope, force: true });

    const returned = await scope.fetch("https://firestore.googleapis.com/v1/foo");
    expect(returned).toBe(res); // app still gets the original response
    await Promise.resolve();
    await Promise.resolve();
    expect(realText).toHaveBeenCalled(); // we read a CLONE, not the body
    expect(scope.__oxReads.total).toBe(3);
  });
});
