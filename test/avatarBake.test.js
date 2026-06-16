import { describe, it, expect } from "vitest";
import { isDefaultAdjust } from "../src/services/avatarBake.js";

/* isDefaultAdjust gates whether the save-time bake runs (only when the user
 * actually adjusted zoom/position). The canvas bake itself is DOM/visual. */
describe("isDefaultAdjust", () => {
  it("is default for no settings / scale 1 + centered", () => {
    expect(isDefaultAdjust(null)).toBe(true);
    expect(isDefaultAdjust(undefined)).toBe(true);
    expect(isDefaultAdjust({})).toBe(true);
    expect(isDefaultAdjust({ scale: 1, x: 50, y: 50 })).toBe(true);
    expect(isDefaultAdjust({ scale: 1 })).toBe(true); // x/y default to 50
  });
  it("is NOT default when zoom or position changed", () => {
    expect(isDefaultAdjust({ scale: 1.5, x: 50, y: 50 })).toBe(false);
    expect(isDefaultAdjust({ scale: 1, x: 80, y: 50 })).toBe(false);
    expect(isDefaultAdjust({ scale: 1, x: 50, y: 20 })).toBe(false);
  });
});
