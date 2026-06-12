import { useEffect, useRef } from "react";

/**
 * HamsterCanvas
 * Mounts a <canvas> and drives the 3D hamster scene defined globally as
 * `window.OriexHamu3D(canvas, env)` (see src/lib/hamster/hamsterScene.js,
 * which needs window.THREE from /three.min.js).
 *
 * - Calls OriexHamu3D on mount, keeps the returned `{ dispose }` handle.
 * - Cleans up (dispose) on unmount.
 * - Never throws: if THREE / OriexHamu3D is missing or init fails, it calls
 *   onError() so the parent can show a 2D fallback. The whole app must not crash.
 */
type HamsterEnv = {
  isLight?: boolean;
  mood?: number;
  sc?: number;
};

type Props = HamsterEnv & {
  onError?: () => void;
  style?: React.CSSProperties;
  className?: string;
};

export default function HamsterCanvas({
  isLight = false,
  mood,
  sc,
  onError,
  style,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const disposerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const factory = (window as any).OriexHamu3D;

    if (!canvas || typeof factory !== "function" || !(window as any).THREE) {
      onError?.();
      return;
    }

    try {
      const env: HamsterEnv = { isLight };
      if (typeof mood === "number") env.mood = mood;
      if (typeof sc === "number") env.sc = sc;

      const handle = factory(canvas, env);
      if (!handle) {
        onError?.();
        return;
      }
      disposerRef.current = handle;
    } catch (e) {
      // 3D init failed (e.g. no WebGL) — fall back gracefully.
      onError?.();
    }

    return () => {
      try {
        disposerRef.current?.dispose?.();
      } catch {}
      disposerRef.current = null;
    };
    // Re-init only when the theme changes (scene reads isLight at creation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLight]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        ...style,
      }}
    />
  );
}
