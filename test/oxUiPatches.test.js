import { describe, it, expect } from "vitest";
import {
  nextLabel,
  RELABELS,
  isHideHeading,
  HIDE_SECTION_HEADINGS,
  isHamsterIconSrc,
  firstGradientColor,
  isDarkOpaqueColor,
  tintOf,
} from "../src/services/oxUiPatches.js";

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

describe("isHideHeading — admin sections to remove", () => {
  it("matches the four admin section headings exactly (icon adds no text)", () => {
    for (const h of ["招待コード管理", "パスワード一覧", "先生管理", "ユーザー管理"]) {
      expect(isHideHeading(h)).toBe(true);
      expect(isHideHeading(` ${h} `)).toBe(true); // leading icon-space trimmed
    }
  });

  it("uses exact whole-text match, so unrelated/partial headings are kept", () => {
    expect(isHideHeading("先生からの問題")).toBe(false);
    expect(isHideHeading("パスワード")).toBe(false);
    expect(isHideHeading("ユーザー")).toBe(false);
    expect(isHideHeading("設定")).toBe(false);
    expect(isHideHeading("")).toBe(false);
    expect(isHideHeading(null)).toBe(false);
  });

  it("exposes exactly the four targeted headings", () => {
    expect(HIDE_SECTION_HEADINGS).toEqual([
      "招待コード管理",
      "パスワード一覧",
      "先生管理",
      "ユーザー管理",
    ]);
  });
});

describe("isHamsterIconSrc", () => {
  it("matches the two embedded hamster-icon base64 webp prefixes", () => {
    expect(isHamsterIconSrc("data:image/webp;base64,UklGRkIeAABXRUJQ...")).toBe(true);
    expect(isHamsterIconSrc("data:image/webp;base64,UklGRuQmAABXRUJQ...")).toBe(true);
  });
  it("does NOT match the run-animation frames or other images", () => {
    expect(isHamsterIconSrc("data:image/webp;base64,UklGRsRQAABXRUJQ...")).toBe(false); // run frame
    expect(isHamsterIconSrc("data:image/png;base64,iVBORw0KGgo...")).toBe(false);
    expect(isHamsterIconSrc("/hamster.png")).toBe(false); // already swapped
    expect(isHamsterIconSrc("")).toBe(false);
    expect(isHamsterIconSrc(null)).toBe(false);
  });
});

describe("firstGradientColor — menu tile outline color", () => {
  it("extracts the first color of a 145deg linear-gradient", () => {
    expect(firstGradientColor("linear-gradient(145deg, #eba36a, #d4823f)")).toBe("#eba36a");
    expect(firstGradientColor("linear-gradient(145deg,#e8989b,#d4757a)")).toBe("#e8989b");
    expect(firstGradientColor("width: 52px; background: linear-gradient(145deg, rgb(1,2,3), #000)")).toBe(
      "rgb(1,2,3)",
    );
  });
  it("returns '' when there is no 145deg gradient", () => {
    expect(firstGradientColor("linear-gradient(90deg, #fff, #000)")).toBe("");
    expect(firstGradientColor("#ff0000")).toBe("");
    expect(firstGradientColor("")).toBe("");
    expect(firstGradientColor(null)).toBe("");
  });
});

describe("isDarkOpaqueColor — admin dark backgrounds to lighten", () => {
  it("flags opaque dark colors (navy/near-black)", () => {
    expect(isDarkOpaqueColor("rgb(30, 26, 58)")).toBe(true); // admin navy
    expect(isDarkOpaqueColor("rgb(0, 0, 0)")).toBe(true);
    expect(isDarkOpaqueColor("rgba(20, 20, 40, 1)")).toBe(true);
  });
  it("does NOT flag light, or transparent, colors", () => {
    expect(isDarkOpaqueColor("rgb(255, 255, 255)")).toBe(false);
    expect(isDarkOpaqueColor("rgb(251, 248, 243)")).toBe(false);
    expect(isDarkOpaqueColor("rgba(0,0,0,0)")).toBe(false); // transparent → leave it
    expect(isDarkOpaqueColor("rgba(0,0,0,0.2)")).toBe(false); // mostly transparent
    expect(isDarkOpaqueColor("")).toBe(false);
    expect(isDarkOpaqueColor(null)).toBe(false);
  });
});

describe("tintOf — menu tile light tint", () => {
  it("appends alpha to a #rrggbb hex", () => {
    expect(tintOf("#eba36a")).toBe("#eba36a26");
    expect(tintOf("#E8989B")).toBe("#E8989B26");
  });
  it("returns '' for non-hex colors (caller falls back to white)", () => {
    expect(tintOf("rgb(1,2,3)")).toBe("");
    expect(tintOf("#fff")).toBe("");
    expect(tintOf("")).toBe("");
    expect(tintOf(null)).toBe("");
  });
});
