import { describe, it, expect } from "vitest";
import { parseSheetCsvUrl, parseCsv, rowsToVocab } from "../src/features/teacherAdmin/sheetImport.js";

describe("parseSheetCsvUrl", () => {
  it("builds the CSV export URL from a sheet URL, with gid", () => {
    expect(parseSheetCsvUrl("https://docs.google.com/spreadsheets/d/ABC_123/edit#gid=42")).toBe(
      "https://docs.google.com/spreadsheets/d/ABC_123/export?format=csv&gid=42",
    );
  });
  it("defaults gid to 0 when absent", () => {
    expect(parseSheetCsvUrl("https://docs.google.com/spreadsheets/d/XYZ/edit")).toBe(
      "https://docs.google.com/spreadsheets/d/XYZ/export?format=csv&gid=0",
    );
  });
  it("returns '' for a non-sheet URL", () => {
    expect(parseSheetCsvUrl("https://example.com")).toBe("");
    expect(parseSheetCsvUrl("")).toBe("");
    expect(parseSheetCsvUrl(null)).toBe("");
  });
});

describe("parseCsv", () => {
  it("splits simple rows and columns", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });
  it("handles quoted fields with commas, quotes and newlines", () => {
    const csv = 'en,ja,ex\nachieve,達成する,"He said ""hi"", then left"';
    expect(parseCsv(csv)).toEqual([
      ["en", "ja", "ex"],
      ["achieve", "達成する", 'He said "hi", then left'],
    ]);
  });
  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("rowsToVocab", () => {
  it("skips the header row and maps A/B/C to en/ja/sentence", () => {
    const rows = [
      ["英単語", "日本語", "例文"],
      ["achieve", "達成する", "He achieved his goal."],
      ["benefit", "利益", ""],
    ];
    const { ok, bad } = rowsToVocab(rows);
    expect(ok).toEqual([
      { en: "achieve", ja: "達成する", sentence: "He achieved his goal." },
      { en: "benefit", ja: "利益", sentence: "" },
    ]);
    expect(bad).toEqual([]);
  });
  it("flags rows missing en or ja as bad (by 1-based row number), ignores blank lines", () => {
    const rows = [
      ["header", "", ""],
      ["only-en", "", ""], // missing ja → bad (row 2)
      ["", "", ""], // blank → ignored
      ["good", "よい", ""],
    ];
    const { ok, bad } = rowsToVocab(rows);
    expect(ok).toEqual([{ en: "good", ja: "よい", sentence: "" }]);
    expect(bad).toEqual([2]);
  });
  it("is safe on non-array input", () => {
    expect(rowsToVocab(null)).toEqual({ ok: [], bad: [] });
  });
});
