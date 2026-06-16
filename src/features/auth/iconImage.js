/* ============================================================
 * iconImage — client-side icon/avatar image processing for signup.
 * ------------------------------------------------------------
 * The legacy app stores custom icons as base64 data URLs inside the Firestore
 * profile document. A full-size photo's data URL easily exceeds Firestore's ~1 MB
 * per-document limit, which is the root cause of the "アイコン保存エラー" (the write
 * is rejected). This module downscales/crops the chosen image to a small square
 * and re-encodes it as a compact JPEG data URL that comfortably fits the document
 * — so the icon saves reliably AND the user can adjust (zoom/position) + preview.
 *
 * UI/util only. No password/token/credential is read, written, or logged. Uses
 * only canvas + FileReader (no unsafe DOM injection or dynamic code execution).
 * Functions are best-effort and reject/return safely on bad input.
 * ============================================================ */

export const ICON_SIZE = 384; // output square px — higher quality, still small
export const ICON_QUALITY = 0.88; // JPEG quality — crisper but compact
// Reject obviously-too-large source files up front (raw bytes, pre-resize).
export const MAX_SOURCE_BYTES = 16 * 1024 * 1024; // 16 MB
// Safety cap for the ENCODED data URL we will store (well under Firestore's 1 MB).
export const MAX_ENCODED_BYTES = 320 * 1024; // ~320 KB

/** Load an image File into an HTMLImageElement. Resolves null on failure. */
export function fileToImage(file) {
  return new Promise((resolve) => {
    try {
      if (!file || typeof FileReader === "undefined") return resolve(null);
      if (file.size && file.size > MAX_SOURCE_BYTES) return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Render a square icon data URL from a loaded image, with cover-fit + zoom/offset.
 * @param {HTMLImageElement} img
 * @param {{ size?: number, zoom?: number, offsetX?: number, offsetY?: number, quality?: number }} [opts]
 *   offsetX/offsetY are -1..1 (fraction of the overflow), zoom >= 1.
 * @returns {string} a JPEG data URL, or "" on failure.
 */
export function renderIconDataUrl(img, opts = {}) {
  try {
    if (!img || typeof document === "undefined") return "";
    const size = opts.size || ICON_SIZE;
    const zoom = Math.max(1, opts.zoom || 1);
    const quality = opts.quality || ICON_QUALITY;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return "";

    // cover-fit: scale so the image fills the square, then apply zoom
    const base = Math.max(size / iw, size / ih);
    const scale = base * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    // center, then shift by the requested fraction of the overflow
    const ox = (size - dw) / 2 + ((opts.offsetX || 0) * (dw - size)) / 2;
    const oy = (size - dh) / 2 + ((opts.offsetY || 0) * (dh - size)) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, ox, oy, dw, dh);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return "";
  }
}

/**
 * Render the icon from a WYSIWYG crop stage: a square frame of `stageSize` display
 * px in which the source image is cover-fit, scaled by `zoom`, and offset by the
 * pan (panX/panY, display px = the image's top-left within the frame). Produces the
 * exact square the user framed. Returns a JPEG data URL, or "" on failure.
 * @param {HTMLImageElement} img
 * @param {{ stageSize:number, zoom?:number, panX?:number, panY?:number, out?:number, quality?:number }} opts
 */
export function renderCroppedIcon(img, opts = {}) {
  try {
    if (!img || typeof document === "undefined") return "";
    const stageSize = opts.stageSize || ICON_SIZE;
    const zoom = Math.max(1, opts.zoom || 1);
    const out = opts.out || ICON_SIZE;
    const quality = opts.quality || ICON_QUALITY;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return "";

    const base = Math.max(stageSize / iw, stageSize / ih); // cover-fit
    const scale = base * zoom;
    // the frame [0..stageSize] maps to this source rect (image px)
    const sx = -(opts.panX || 0) / scale;
    const sy = -(opts.panY || 0) / scale;
    const sSize = stageSize / scale;

    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return "";
  }
}

/** Approximate byte length of a data URL's payload (for the size guard). */
export function dataUrlByteLength(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // base64 -> bytes
  return Math.floor((b64.length * 3) / 4);
}

/** True iff the encoded icon is small enough to store safely in Firestore. */
export function isIconWithinLimit(dataUrl) {
  const n = dataUrlByteLength(dataUrl);
  return n > 0 && n <= MAX_ENCODED_BYTES;
}
