import { useState } from "react";
import { IcHamster } from "../../icons";
import HamsterCanvas from "./HamsterCanvas";

/**
 * HamsterRoom
 * Container shown on the petRoom (育成) screen. Renders the 3D hamster canvas,
 * and if the 3D scene can't initialise (no WebGL, missing three.js, etc.) it
 * falls back to a lightweight 2D placeholder so the screen never breaks.
 *
 * Props are optional and best-effort: pass theme (isLight) and, when available,
 * the pet mood (0–100, e.g. petAffection). Anything not passed uses the scene's
 * own defaults. This does not remove or alter any existing 育成 UI.
 */
type Props = {
  isLight?: boolean;
  mood?: number;
  accent?: string;
  inkMuted?: string;
};

export default function HamsterRoom({
  isLight = false,
  mood,
  accent = "#e8911e",
  inkMuted = "rgba(120,120,140,0.9)",
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {failed ? (
        // 2D fallback / placeholder — keeps the screen usable without 3D.
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              display: "grid",
              placeItems: "center",
              background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
            }}
          >
            <IcHamster size={56} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: inkMuted }}>
            3D表示を読み込めませんでした
          </p>
        </div>
      ) : (
        <HamsterCanvas
          isLight={isLight}
          mood={mood}
          onError={() => setFailed(true)}
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
}
