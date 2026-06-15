import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  dataUrlByteLength,
  isIconWithinLimit,
  MAX_ENCODED_BYTES,
  ICON_SIZE,
} from "../src/features/auth/iconImage.js";

/* The icon image utility downscales/encodes a chosen photo small enough to store
 * in Firestore (fixes the "アイコン保存エラー" caused by oversized data URLs). These
 * cover the pure size guards; the canvas rendering is exercised at runtime. */

describe("iconImage — size guards", () => {
  it("estimates the data URL byte length from its base64 payload", () => {
    expect(dataUrlByteLength("data:image/jpeg;base64,AAAA")).toBe(3); // 4 b64 chars = 3 bytes
    expect(dataUrlByteLength("")).toBe(0);
    expect(dataUrlByteLength(null)).toBe(0);
  });
  it("accepts small icons and rejects oversized ones", () => {
    const small = "data:image/jpeg;base64," + "A".repeat(1000); // ~750 bytes
    expect(isIconWithinLimit(small)).toBe(true);
    const huge = "data:image/jpeg;base64," + "A".repeat(MAX_ENCODED_BYTES * 2);
    expect(isIconWithinLimit(huge)).toBe(false);
    expect(isIconWithinLimit("")).toBe(false);
  });
  it("keeps the stored icon well under Firestore's ~1MB document limit", () => {
    expect(ICON_SIZE).toBeLessThanOrEqual(512);
    expect(MAX_ENCODED_BYTES).toBeLessThan(1024 * 1024);
  });
});

describe("iconImage — safe (canvas only, no eval/innerHTML)", () => {
  const SRC = readFileSync("src/features/auth/iconImage.js", "utf8");
  it("uses canvas/FileReader, never innerHTML/eval/new Function", () => {
    expect(SRC).toMatch(/toDataURL/);
    expect(SRC).not.toMatch(/innerHTML|\beval\(|new Function/);
  });
});
