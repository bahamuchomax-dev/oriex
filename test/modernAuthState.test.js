import { describe, it, expect, vi, beforeEach } from "vitest";

/* Behavioural tests for the auth-state plumbing with Firebase mocked. They prove
 * the subscription contract (the source of truth for reload + ongoing changes)
 * and that currentAuthUser() exposes the signed-in user for the immediate,
 * no-reload transition after sign-in. */

vi.mock("../src/firebase/firebase.js", () => ({ auth: { currentUser: { uid: "U_CURRENT" } } }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: vi.fn(() => () => {}) }));

import { subscribeAuth, currentAuthUser } from "../src/features/auth/modernAuthState.js";
import { onAuthStateChanged } from "firebase/auth";

beforeEach(() => vi.clearAllMocks());

describe("subscribeAuth", () => {
  it("registers onAuthStateChanged once and returns the unsubscribe fn", () => {
    const unsub = subscribeAuth(() => {}, () => {});
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(typeof unsub).toBe("function");
  });

  it("forwards a signed-in user to onChange and flips ready", () => {
    const onChange = vi.fn();
    const onReady = vi.fn();
    subscribeAuth(onChange, onReady);
    const successCb = onAuthStateChanged.mock.calls.at(-1)[1];
    const u = { uid: "U9" };
    successCb(u);
    expect(onChange).toHaveBeenCalledWith(u);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("forwards null (signed out) to onChange and flips ready", () => {
    const onChange = vi.fn();
    const onReady = vi.fn();
    subscribeAuth(onChange, onReady);
    const successCb = onAuthStateChanged.mock.calls.at(-1)[1];
    successCb(null);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("on observer error, flips ready without changing the user", () => {
    const onChange = vi.fn();
    const onReady = vi.fn();
    subscribeAuth(onChange, onReady);
    const errorCb = onAuthStateChanged.mock.calls.at(-1)[2];
    errorCb(new Error("observer failed"));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("works without an onReady callback (never throws)", () => {
    subscribeAuth(() => {});
    const successCb = onAuthStateChanged.mock.calls.at(-1)[1];
    const errorCb = onAuthStateChanged.mock.calls.at(-1)[2];
    expect(() => successCb({ uid: "x" })).not.toThrow();
    expect(() => errorCb(new Error("x"))).not.toThrow();
  });
});

describe("currentAuthUser", () => {
  it("returns auth.currentUser (the user for an immediate post-sign-in transition)", () => {
    expect(currentAuthUser()).toEqual({ uid: "U_CURRENT" });
  });
});
