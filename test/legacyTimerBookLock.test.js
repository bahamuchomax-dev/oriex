import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BUNDLE = readFileSync(resolve("src/legacy/oriex-app.bundle.js"), "utf8");

describe("legacy home timer book lock", () => {
  it("locks book/subject selection once the timer has started until the save reset", () => {
    expect(BUNDLE).toContain("_timerLocked = p.running || p.acc > 0");
    expect(BUNDLE).toContain("disabled: _timerLocked");
    expect(BUNDLE).toContain("onClick: () => !_timerLocked && fe({ ...p, bookTitle: Pe.title");
    expect(BUNDLE).toContain("onClick: () => !_timerLocked && fe({ ...p, bookTitle: \"\", _subjectMode: true })");
    expect(BUNDLE).toContain("onClick: () => !_timerLocked && fe({");
  });

  it("surfaces the rounded save minutes before recording", () => {
    expect(BUNDLE).toContain("_tmSaveMinutes = Math.max(1, Math.round(ye / 6e4))");
    expect(BUNDLE).toContain("保存予定");
    expect(BUNDLE).toContain("30秒以上で保存");
    expect(BUNDLE).toContain("let Pe = _tmSaveMinutes");
  });

  it("shows the same save preview on the book-detail timer", () => {
    expect(BUNDLE).toContain("oxBkSaveMinutes = oxBkMs >= 3e4 ? Math.max(1, Math.round(oxBkMs / 6e4)) : 0");
    expect(BUNDLE).toContain("30秒以上で反映");
    expect(BUNDLE).toContain("入力欄に反映可");
  });
});
