import { describe, it, expect } from "vitest";
import { nextLabel, RELABELS } from "../src/services/oxUiPatches.js";

/* nextLabel holds the relabel decision (exact whole-text match, idempotent),
 * which is the part worth pinning. The DOM glue mirrors the trusted oxHelpers
 * MutationObserver pattern and is exercised in the browser. */

describe("nextLabel", () => {
  it('renames the exact "マイ" label to "マイページ"', () => {
    expect(nextLabel("マイ")).toBe("マイページ");
    expect(nextLabel("  マイ  ")).toBe("マイページ"); // trims surrounding whitespace
  });

  it("is idempotent — the already-renamed label is left alone", () => {
    expect(nextLabel("マイページ")).toBeNull();
  });

  it("uses WHOLE-text equality, so it never touches substrings like マイワード", () => {
    expect(nextLabel("マイワード")).toBeNull();
    expect(nextLabel("マイページ設定")).toBeNull();
    expect(nextLabel("プラスマイ")).toBeNull();
  });

  it("returns null for unmapped / empty / non-string input", () => {
    expect(nextLabel("ホーム")).toBeNull();
    expect(nextLabel("")).toBeNull();
    expect(nextLabel(null)).toBeNull();
    expect(nextLabel(undefined)).toBeNull();
    expect(nextLabel(123)).toBeNull();
  });

  it("honours a custom map and skips no-op (key===value) entries", () => {
    expect(nextLabel("A", { A: "B" })).toBe("B");
    expect(nextLabel("A", { A: "A" })).toBeNull();
  });

  it("ships the マイ→マイページ mapping by default", () => {
    expect(RELABELS["マイ"]).toBe("マイページ");
  });
});
