import { useCallback, useEffect, useRef, useState } from "react";
import { fileToImage, renderCroppedIcon, isIconWithinLimit } from "./iconImage.js";
import { STAGE, MIN_ZOOM, MAX_ZOOM, clamp, dispDims, clampPan, centerPan, pointDistance } from "./iconCropMath.js";

/* ============================================================
 * useIconCrop — finger-driven WYSIWYG crop state for an icon stage.
 * ------------------------------------------------------------
 * ONE finger drags to pan; TWO fingers pinch to zoom; the mouse wheel zooms on
 * desktop. There is NO slider — adjustment is by finger, the same in signup and
 * profile edit. The framed square is baked to a compact JPEG data URL (`photo`)
 * on every change, so what you see is exactly what is saved everywhere.
 *
 * Returns the image + transform + ready-to-spread stage handlers, plus loaders
 * for a picked File (`loadFile`) and an existing avatar URL (`loadSrc`, used to
 * re-crop the current photo from profile edit). DOM/React glue only.
 * ============================================================ */
export function useIconCrop() {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");

  const dragRef = useRef(null); // single-finger pan origin
  const pinchRef = useRef(null); // two-finger pinch origin
  const pointers = useRef(new Map()); // active pointerId -> {clientX,clientY}

  // Re-bake the cropped square whenever the source / zoom / pan changes.
  useEffect(() => {
    if (!img) return;
    const url = renderCroppedIcon(img, { stageSize: STAGE, zoom, panX: pan.x, panY: pan.y });
    if (!url) {
      setError("画像を処理できませんでした。");
      return;
    }
    if (!isIconWithinLimit(url)) {
      setError("画像が大きすぎます。別の画像をお試しください。");
      return;
    }
    setError("");
    setPhoto(url);
  }, [img, zoom, pan]);

  const reset = useCallback(() => {
    setImg(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPhoto("");
    setError("");
    dragRef.current = null;
    pinchRef.current = null;
    pointers.current.clear();
  }, []);

  const place = useCallback((loaded) => {
    setImg(loaded);
    setZoom(1);
    setPan(centerPan(loaded, 1));
  }, []);

  const loadFile = useCallback(
    async (file) => {
      setError("");
      const loaded = await fileToImage(file);
      if (!loaded) {
        setError("この画像は読み込めません。別の画像をお試しください。");
        return false;
      }
      place(loaded);
      return true;
    },
    [place],
  );

  // Re-crop an EXISTING avatar (a data:/http URL) — load it as an <img> we can frame.
  const loadSrc = useCallback(
    (src) =>
      new Promise((resolve) => {
        if (!src) return resolve(false);
        try {
          const el = new Image();
          el.crossOrigin = "anonymous"; // best-effort for http(s) icons
          el.onload = () => {
            place(el);
            resolve(true);
          };
          el.onerror = () => {
            setError("この画像は読み込めません。");
            resolve(false);
          };
          el.src = src;
        } catch {
          resolve(false);
        }
      }),
    [place],
  );

  const applyZoom = useCallback(
    (next) => {
      const z = clamp(Number(next) || 1, MIN_ZOOM, MAX_ZOOM);
      setZoom(z);
      if (img) setPan((p) => clampPan(p, img, z));
    },
    [img],
  );

  const onPointerDown = useCallback((e) => {
    if (!img) return;
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      pinchRef.current = { dist: pointDistance(pts[0], pts[1]), zoom };
      dragRef.current = null;
    } else {
      dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    }
  }, [img, pan.x, pan.y, zoom]);

  const onPointerMove = useCallback((e) => {
    if (!img || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length >= 2 && pinchRef.current) {
      const dist = pointDistance(pts[0], pts[1]);
      const ratio = pinchRef.current.dist > 0 ? dist / pinchRef.current.dist : 1;
      applyZoom(pinchRef.current.zoom * ratio);
      return;
    }
    if (dragRef.current) {
      const nx = dragRef.current.px + (e.clientX - dragRef.current.x);
      const ny = dragRef.current.py + (e.clientY - dragRef.current.y);
      setPan(clampPan({ x: nx, y: ny }, img, zoom));
    }
  }, [img, zoom, applyZoom]);

  const onPointerUp = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    const pts = [...pointers.current.values()];
    pinchRef.current = null;
    if (pts.length === 1) {
      // a finger lifted mid-pinch — resume panning from the remaining one
      dragRef.current = { x: pts[0].clientX, y: pts[0].clientY, px: pan.x, py: pan.y };
    } else if (pts.length === 0) {
      dragRef.current = null;
    }
  }, [pan.x, pan.y]);

  const onWheel = useCallback((e) => {
    if (!img) return;
    e.preventDefault();
    applyZoom(zoom - e.deltaY * 0.0015 * zoom);
  }, [img, zoom, applyZoom]);

  const dims = img ? dispDims(img, zoom) : { w: STAGE, h: STAGE };
  const stageHandlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel };

  return { img, zoom, pan, photo, error, dims, reset, loadFile, loadSrc, applyZoom, stageHandlers, STAGE };
}
