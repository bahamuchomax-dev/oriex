/* ============================================================
 * iconFrames — avatar icon frames (cosmetic, with rarities). Shared by the new
 * home (React FramesView + avatar ring) AND the legacy-side frame-settings panel
 * (src/services/oxUiPatches.js). Equipping the レジェンド frame is what unlocks the
 * new character home. Pure data + localStorage; no React, so either side can import.
 * ============================================================ */
const KEY = "oxhIconFrame";

export const FRAMES = [
  { key: "none", label: "なし", rarity: "ノーマル", color: "#9aa3bd" },
  { key: "bronze", label: "ブロンズ", rarity: "レア", color: "#b9742f" },
  { key: "silver", label: "シルバー", rarity: "Sレア", color: "#9fb2c8" },
  { key: "gold", label: "ゴールド", rarity: "エピック", color: "#e8b53a" },
  { key: "legend", label: "レジェンド", rarity: "レジェンド", color: "#e8273c", legend: true },
];

// Ring (box-shadow) per frame — works on any round avatar element, no wrapper.
const RING = {
  none: "none",
  bronze: "0 0 0 3px #b9742f",
  silver: "0 0 0 3px #9fb2c8",
  gold: "0 0 0 3px #e8b53a, 0 0 12px rgba(232,181,58,.55)",
  legend: "0 0 0 3px #e8273c, 0 0 0 6px #ffd36e, 0 0 18px rgba(232,39,46,.65)",
};

export const LEGEND_KEY = "legend";

// レジェンド is a HARD, SECRET unlock: nothing about it (or the new home) is shown
// until the goal is met. The goal = minutes of REAL recorded study (studyStore.realMinutes;
// the seed leaves it 0). The goal is CONFIGURABLE at runtime via localStorage.oxhLegendGoal
// (so a teacher/owner can change the difficulty anytime), defaulting to a hard 10 hours.
export const LEGEND_GOAL_KEY = "oxhLegendGoal";
export const LEGEND_GOAL_DEFAULT = 600; // 10時間
export function legendGoal() {
  try {
    const v = parseInt(window.localStorage.getItem(LEGEND_GOAL_KEY) || "", 10);
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    /* ignore */
  }
  return LEGEND_GOAL_DEFAULT;
}
export function realStudyMinutes() {
  try {
    const o = JSON.parse(window.localStorage.getItem("oxhStudy") || "{}");
    return typeof o.realMinutes === "number" ? o.realMinutes : 0;
  } catch {
    return 0;
  }
}
export function legendUnlocked() {
  return realStudyMinutes() >= legendGoal();
}

export function getFrame() {
  try {
    return window.localStorage.getItem(KEY) || "none";
  } catch {
    return "none";
  }
}
/** Equip a frame. Refuses レジェンド until it's been earned. Returns true if applied. */
export function setFrame(key) {
  if (key === LEGEND_KEY && !legendUnlocked()) return false;
  try {
    window.localStorage.setItem(KEY, key);
  } catch {
    /* ignore */
  }
  return true;
}
export function isLegendEquipped() {
  return getFrame() === LEGEND_KEY;
}
export function frameRing(key) {
  return RING[key] || "none";
}
export function frameInfo(key) {
  return FRAMES.find((f) => f.key === key) || FRAMES[0];
}
