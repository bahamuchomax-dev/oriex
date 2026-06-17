/* ============================================================
 * iconCropMath — pure geometry for the WYSIWYG icon crop stage.
 * ------------------------------------------------------------
 * Shared by the signup icon picker and the profile-edit icon editor so both
 * frame a photo IDENTICALLY (cover-fit + zoom + pan inside a square stage). Pure
 * functions only — no DOM, no React — so the two editors can stay in lock-step.
 * ============================================================ */

export const STAGE = 176; // crop-stage display px (square)
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Displayed image size at a given zoom (cover-fit to the square, then * zoom). */
export function dispDims(img, zoom, stage = STAGE) {
  const iw = (img && (img.naturalWidth || img.width)) || stage;
  const ih = (img && (img.naturalHeight || img.height)) || stage;
  const base = Math.max(stage / iw, stage / ih); // cover-fit
  return { w: iw * base * zoom, h: ih * base * zoom };
}

/** Keep the pan so the image always covers the square (no empty corners). */
export function clampPan(pan, img, zoom, stage = STAGE) {
  const { w, h } = dispDims(img, zoom, stage);
  return { x: clamp(pan.x, stage - w, 0), y: clamp(pan.y, stage - h, 0) };
}

/** Center an image of `zoom` within the square (the initial pan). */
export function centerPan(img, zoom, stage = STAGE) {
  const { w, h } = dispDims(img, zoom, stage);
  return { x: (stage - w) / 2, y: (stage - h) / 2 };
}

/** Euclidean distance between two {clientX,clientY} points (for pinch). */
export function pointDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
