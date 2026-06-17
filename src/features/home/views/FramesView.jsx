import "./frames.css";
import { useState } from "react";
import { FRAMES, getFrame, setFrame, frameRing, frameInfo, legendUnlocked } from "../iconFrames.js";

/* アイコンフレーム — equip a cosmetic frame for your icon. レジェンド is a HARD, hidden
 * unlock: it isn't shown at all until the study goal is met; once earned it appears
 * here and lets you switch to the new home from the original app's settings. */
export default function FramesView({ onBack }) {
  const [equipped, setEquipped] = useState(getFrame);
  const cur = frameInfo(equipped);
  const showLegend = legendUnlocked();
  const list = FRAMES.filter((f) => !f.legend || showLegend); // hide レジェンド until earned
  const equip = (key) => {
    if (setFrame(key)) setEquipped(key);
  };
  return (
    <div className="oxh-sub oxv-fm">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">アイコンフレーム</span>
      </div>
      <div className="oxv-body">
        <div className="oxv-fm-preview">
          <div className="oxv-fm-av" style={{ boxShadow: frameRing(equipped) === "none" ? undefined : frameRing(equipped) }}>ヒ</div>
          <div className="oxv-fm-pname">{cur.label}</div>
          <div className="oxv-fm-prarity" style={{ color: cur.color }}>{cur.rarity}</div>
        </div>

        <div className="oxv-fm-list">
          {list.map((f) => {
            const on = equipped === f.key;
            return (
              <button
                key={f.key}
                className={`oxv-fm-card${on ? " is-on" : ""}${f.legend ? " is-legend" : ""}`}
                onClick={() => equip(f.key)}
                aria-pressed={on}
              >
                <span className="oxv-fm-dot" style={{ boxShadow: frameRing(f.key) === "none" ? undefined : frameRing(f.key) }} />
                <span className="oxv-fm-meta">
                  <span className="oxv-fm-label">{f.label}</span>
                  <span className="oxv-fm-rarity" style={{ color: f.color }}>{f.rarity}</span>
                </span>
                <span className={`oxv-fm-state${on ? " is-on" : ""}`}>{on ? "装備中" : "装備する"}</span>
              </button>
            );
          })}
        </div>

        {showLegend && (
          <p className="oxv-fm-note">
            レジェンドを装備すると、元のホームの「アイコン」設定から新しいホームに切り替えられます。
          </p>
        )}
      </div>
    </div>
  );
}
