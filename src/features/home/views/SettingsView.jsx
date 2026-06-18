import "./settings.css";
import { useState, useEffect } from "react";
import { useStudy, setGoal, fmtMinutes } from "../studyStore.js";
import { switchToOriginalHome } from "../homeSwitch.js";
import { APP_VERSION_LABEL } from "../../../appVersion.js";

/* ============================================================
 * SettingsView — 設定
 * ------------------------------------------------------------
 * A real, working settings screen:
 *   1) 1日の学習目標 — preset buttons (60–300分) + a ±15分 stepper,
 *      both call setGoal() live and reflect st.goalMin from the store.
 *   2) 通知とサウンド — persisted toggles in localStorage "oxhSettings"
 *      (学習リマインダー / 効果音 / ダークモード[note only]).
 *   3) 表示 — static アプリ版 + an expandable このアプリについて.
 *   4) データ — 学習データをリセット with an inline confirm that clears
 *      localStorage "oxhStudy" and reloads.
 * Every selector in settings.css is prefixed with .oxv-st.
 * ============================================================ */

const GOAL_MIN = 15;
const GOAL_MAX = 600;
const GOAL_STEP = 15;
const GOAL_PRESETS = [60, 120, 180, 240, 300];

// --- inline icons (no emoji — svg only) ------------------------------------
const IcTarget = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
const IcBell = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const IcSound = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9v6h3l5 4V5L7 9H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const IcMoon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const IcInfo = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
  </svg>
);
const IcTag = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4h7l9 9-7 7-9-9V4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="8.4" cy="8.4" r="1.3" fill="currentColor" />
  </svg>
);
const IcDoc = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M14 3v4h4M9 12h6M9 16h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcChevron = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcTrash = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcMinus = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
);
const IcPlus = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
);
const IcHomeSwap = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9.5 14.5h5l-1.4-1.4M14.5 16.5h-5l1.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TOGGLES = [
  { key: "reminder", label: "学習リマインダー", desc: "毎日きまった時間に学習をうながします", icon: IcBell },
  { key: "sound", label: "効果音", desc: "タップや目標達成のときに音を鳴らします", icon: IcSound },
  { key: "dark", label: "ダークモード", desc: "現在はダークテーマのみに対応しています", icon: IcMoon },
];

const DEFAULT_SETTINGS = { reminder: true, sound: true, dark: true };

function loadSettings() {
  try {
    const raw = window.localStorage.getItem("oxhSettings");
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") return { ...DEFAULT_SETTINGS, ...o };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

export default function SettingsView({ onBack }) {
  const st = useStudy();
  const [settings, setSettings] = useState(loadSettings);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem("oxhSettings", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const stepGoal = (delta) =>
    setGoal(Math.min(GOAL_MAX, Math.max(GOAL_MIN, st.goalMin + delta)));

  const resetData = () => {
    try {
      window.localStorage.removeItem("oxhStudy");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <div className="oxh-sub oxv-st">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">設定</span>
      </div>

      <div className="oxv-body">
        {/* 1) 1日の学習目標 ------------------------------------------------ */}
        <div className="oxv-st-h">{IcTarget}<span>1日の学習目標</span></div>
        <div className="oxv-st-card oxv-st-goal">
          <div className="oxv-st-goal-top">
            <span className="oxv-st-goal-cap">現在の目標</span>
            <span className="oxv-st-goal-val">{fmtMinutes(st.goalMin)}</span>
          </div>

          <div className="oxv-st-presets">
            {GOAL_PRESETS.map((p) => {
              const on = st.goalMin === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={`oxv-st-preset${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => setGoal(p)}
                >
                  {p}<small>分</small>
                </button>
              );
            })}
          </div>

          <div className="oxv-st-step">
            <button
              type="button"
              className="oxv-st-step-btn"
              onClick={() => stepGoal(-GOAL_STEP)}
              disabled={st.goalMin <= GOAL_MIN}
              aria-label="目標を15分減らす"
            >
              {IcMinus}
            </button>
            <span className="oxv-st-step-val">{st.goalMin}<small>分</small></span>
            <button
              type="button"
              className="oxv-st-step-btn"
              onClick={() => stepGoal(GOAL_STEP)}
              disabled={st.goalMin >= GOAL_MAX}
              aria-label="目標を15分増やす"
            >
              {IcPlus}
            </button>
          </div>
          <p className="oxv-st-goal-note">15分きざみで調整できます（{GOAL_MIN}〜{GOAL_MAX}分）</p>
        </div>

        {/* 2) 通知とサウンド ----------------------------------------------- */}
        <div className="oxv-st-h">{IcBell}<span>通知とサウンド</span></div>
        <div className="oxv-st-card oxv-st-list">
          {TOGGLES.map((t) => {
            const on = !!settings[t.key];
            return (
              <div className="oxv-st-row" key={t.key}>
                <span className="oxv-st-ic">{t.icon}</span>
                <span className="oxv-st-rtext">
                  <span className="oxv-st-rlabel">{t.label}</span>
                  <span className="oxv-st-rdesc">{t.desc}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t.label}
                  className={`oxv-st-sw${on ? " is-on" : ""}`}
                  onClick={() => toggle(t.key)}
                >
                  <span className="oxv-st-knob" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 3) 表示 --------------------------------------------------------- */}
        <div className="oxv-st-h">{IcInfo}<span>表示</span></div>
        <div className="oxv-st-card oxv-st-list">
          <div className="oxv-st-row oxv-st-row-static">
            <span className="oxv-st-ic">{IcTag}</span>
            <span className="oxv-st-rtext">
              <span className="oxv-st-rlabel">アプリ版</span>
              <span className="oxv-st-rdesc">Oriex 学習トラッカー</span>
            </span>
            <span className="oxv-st-ver">{APP_VERSION_LABEL}</span>
          </div>

          <button
            type="button"
            className="oxv-st-row oxv-st-row-btn"
            aria-expanded={aboutOpen}
            onClick={() => setAboutOpen((o) => !o)}
          >
            <span className="oxv-st-ic">{IcDoc}</span>
            <span className="oxv-st-rtext">
              <span className="oxv-st-rlabel">このアプリについて</span>
              <span className="oxv-st-rdesc">Oriex の概要を表示します</span>
            </span>
            <span className={`oxv-st-chev${aboutOpen ? " is-open" : ""}`}>{IcChevron}</span>
          </button>

          {aboutOpen && (
            <div className="oxv-st-about">
              <p>
                Oriex（オリエクス）は、学習時間を記録して毎日の積み重ねを見える化する学習アプリです。タイマーで計測した学習を、ダッシュボード・分析・カレンダーがひとつにつないで表示します。
              </p>
              <p className="oxv-st-about-meta">© 2026 Oriex ・ {APP_VERSION_LABEL}</p>
            </div>
          )}
        </div>

        {/* 4) ホーム — switch back to the original home (ONLY entry point) -- */}
        <div className="oxv-st-h">{IcHomeSwap}<span>ホーム</span></div>
        <div className="oxv-st-card oxv-st-list">
          <div className="oxv-st-row oxv-st-row-static">
            <span className="oxv-st-ic">{IcHomeSwap}</span>
            <span className="oxv-st-rtext">
              <span className="oxv-st-rlabel">元のホームに切り替える</span>
              <span className="oxv-st-rdesc">以前のホーム画面に戻ります（いつでもここから新ホームに戻せます）</span>
            </span>
          </div>
          <button type="button" className="oxv-st-switch" onClick={switchToOriginalHome}>
            {IcHomeSwap}<span>元のホームに切り替える</span>
          </button>
        </div>

        {/* 5) データ ------------------------------------------------------- */}
        <div className="oxv-st-h">{IcTrash}<span>データ</span></div>
        <div className="oxv-st-card oxv-st-danger">
          <div className="oxv-st-row oxv-st-row-static">
            <span className="oxv-st-ic oxv-st-ic-danger">{IcTrash}</span>
            <span className="oxv-st-rtext">
              <span className="oxv-st-rlabel">学習データをリセット</span>
              <span className="oxv-st-rdesc">記録した学習時間とコインをすべて消去します</span>
            </span>
          </div>

          {confirming ? (
            <div className="oxv-st-confirm">
              <p className="oxv-st-confirm-t">本当にリセットしますか？この操作は元に戻せません。</p>
              <div className="oxv-st-confirm-row">
                <button type="button" className="oxv-st-cbtn is-cancel" onClick={() => setConfirming(false)}>
                  キャンセル
                </button>
                <button type="button" className="oxv-st-cbtn is-danger" onClick={resetData}>
                  リセットする
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="oxv-st-reset" onClick={() => setConfirming(true)}>
              {IcTrash}<span>データをリセット</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
