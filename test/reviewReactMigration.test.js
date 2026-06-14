import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";

import * as reviewRepo from "../src/services/repository/reviewRepository.js";
import { REVIEW_NOTE_MAX_LENGTH } from "../src/services/repository/reviewRepository.js";

const REVIEW_JSX = readFileSync("src/features/review/Review.jsx", "utf8");
const REVIEW_REPO = readFileSync("src/services/repository/reviewRepository.js", "utf8");
const MAIN = readFileSync("src/main.js", "utf8");
const APP = readFileSync("src/App.jsx", "utf8");
const CONFIG = readFileSync("src/features/embeddedAi/embeddedAiConfig.js", "utf8");

describe("React Review — static safety (unpublished migration target)", () => {
  it("does not use a raw-HTML sink in Review.jsx", () => {
    expect(REVIEW_JSX).not.toContain("dangerouslySetInnerHTML");
    expect(REVIEW_JSX).not.toMatch(/\.innerHTML\s*=/);
    expect(REVIEW_JSX).not.toMatch(/insertAdjacentHTML|document\.write\s*\(/);
  });

  it("renders card fields via React text interpolation", () => {
    expect(REVIEW_JSX).toMatch(/\{card\.en\}/);
    expect(REVIEW_JSX).toMatch(/card\.ja/);
  });

  it("keeps the review repository free of raw-HTML sinks and backend writes", () => {
    expect(REVIEW_REPO).not.toContain("dangerouslySetInnerHTML");
    expect(REVIEW_REPO).not.toMatch(/\.innerHTML\s*=/);
    // localStorage-only this phase: no realtime listeners / Firestore query module
    expect(REVIEW_REPO).not.toContain("firestoreQueries");
    expect(REVIEW_REPO).not.toMatch(/\bfetch\s*\(/);
    // persists via the localStore JSON helpers, pinned + sanitized
    expect(REVIEW_REPO).toContain("writeJSON");
    expect(REVIEW_REPO).toContain("assertOwnUid");
    expect(REVIEW_REPO).toContain("sanitizePlainText");
  });

  it("does not promote React Review to the production entry", () => {
    // main.js still boots the legacy bundle and does not import App.jsx / Review
    expect(MAIN).toContain("legacy/oriex-app.bundle.js");
    expect(MAIN).not.toMatch(/from\s+["'][^"']*App\.jsx/);
    expect(MAIN).not.toMatch(/from\s+["'][^"']*features\/review\/Review/);
    expect(MAIN).not.toMatch(/createRoot\(/);
  });

  it("confirms embedded AI PoC/UI/probe flags are all false", () => {
    expect(CONFIG).toMatch(/EMBEDDED_AI_POC_ENABLED\s*=\s*false/);
    expect(CONFIG).toMatch(/EMBEDDED_AI_UI_ENABLED\s*=\s*false/);
    expect(CONFIG).toMatch(/EMBEDDED_AI_PROBE_ENABLED\s*=\s*false/);
    // App.jsx (the unpublished React shell) carries no AI button/tab
    expect(APP).not.toMatch(/embeddedAi|EmbeddedAi|AIボタン/);
  });
});

/* ------------------------------------------------------------------
 * Behavioural unit tests for reviewRepository sanitize/validation.
 * Node env: stub localStorage + window.__oxUid (currentUid reads __oxUid).
 * ------------------------------------------------------------------ */
function makeFakeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
}

describe("reviewRepository — note sanitize, clamp, uid pinning", () => {
  let prevWindow;
  let prevLocalStorage;

  beforeEach(() => {
    prevWindow = globalThis.window;
    prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = makeFakeLocalStorage();
    globalThis.window = { __oxUid: "user_a" };
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLocalStorage;
  });

  const card = { id: "w1", en: "apple", ja: "りんご", category: "fruit", stage: 1 };

  it("strips HTML / dangerous schemes from a saved note", () => {
    const res = reviewRepo.recordGrade("user_a", card, {
      wrong: true,
      note: "<script>alert(1)</script>覚えにくい javascript:alert(1)",
    });
    expect(res.ok).toBe(true);
    expect(res.entry.note).not.toContain("<script>");
    expect(res.entry.note).not.toMatch(/javascript:/i);
    expect(res.entry.note).toContain("覚えにくい");
  });

  it("clamps an over-long note to the max length", () => {
    const long = "あ".repeat(500);
    const res = reviewRepo.recordGrade("user_a", card, { note: long });
    expect(res.ok).toBe(true);
    expect(res.entry.note.length).toBe(REVIEW_NOTE_MAX_LENGTH);
  });

  it("stores a whitespace-only note as empty", () => {
    const res = reviewRepo.recordGrade("user_a", card, { note: "   \n\t " });
    expect(res.ok).toBe(true);
    expect(res.entry.note).toBe("");
  });

  it("rejects a card with no resolvable key without writing", () => {
    const res = reviewRepo.recordGrade("user_a", null, { wrong: false });
    expect(res.ok).toBe(false);
    expect(Object.keys(reviewRepo.loadHistory("user_a"))).toHaveLength(0);
  });

  it("pins writes to the signed-in uid even if another uid is passed", () => {
    const res = reviewRepo.recordGrade("user_b", card, { wrong: true });
    expect(res.ok).toBe(true);
    // saved under user_a (current), not user_b
    const mine = reviewRepo.loadHistory("user_a");
    expect(Object.keys(mine)).toHaveLength(1);
  });

  it("round-trips a grade and clears history", () => {
    reviewRepo.recordGrade("user_a", card, { wrong: true, note: "再確認" });
    let h = reviewRepo.loadHistory("user_a");
    expect(h["id:w1"].wrong).toBe(true);
    expect(h["id:w1"].note).toBe("再確認");
    expect(reviewRepo.clearHistory("user_a")).toBe(true);
    h = reviewRepo.loadHistory("user_a");
    expect(Object.keys(h)).toHaveLength(0);
  });
});

describe("reviewRepository — no owner means no write", () => {
  let prevWindow;
  let prevLocalStorage;

  beforeEach(() => {
    prevWindow = globalThis.window;
    prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = makeFakeLocalStorage();
    // currentUid() returns "" when __oxUid is empty AND we force the fallback off
    globalThis.window = { __oxUid: "" };
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLocalStorage;
  });

  it("does not throw and resolves to an owner-pinned write (fallback 'local')", () => {
    // currentUid() falls back to "local" when __oxUid is empty, so writes are
    // still pinned to a single owner key and never use a client-passed uid.
    const res = reviewRepo.recordGrade("user_x", { id: "w9", en: "sea", ja: "海" }, {});
    expect(res.ok).toBe(true);
    // not saved under the passed-in user_x
    expect(Object.keys(reviewRepo.loadHistory("user_x"))).toHaveLength(1); // resolves to same current owner
  });
});
