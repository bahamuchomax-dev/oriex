import "./timer.css";
import { useEffect, useRef, useState } from "react";
import {
  useStudy,
  addSession,
  SUBJECTS,
  subjectInfo,
  fmtMinutes,
  todayMinutes,
  streakDays,
} from "../studyStore.js";

/* ============================================================
 * TimerView — タイマー (a real study timer that records to the store)
 * ------------------------------------------------------------
 * - Subject chips (tinted from the store) pick what's being studied.
 * - setInterval(1s) drives an elapsed counter, anchored to wall-clock
 *   time (via a ref) so it never drifts; the interval is cleaned up on
 *   pause / unmount.
 * - 記録する (>=60s) writes a session through addSession and shows a
 *   success card with the minutes + coins earned, then resets.
 * - A 手動で記録 panel logs an arbitrary number of minutes.
 * - The top mini-stat row reads live data: 今日 / 連続 / コイン.
 * Every selector in timer.css is prefixed with .oxv-tm.
 * ============================================================ */

const pad = (n) => String(n).padStart(2, "0");
function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

const MANUAL_PRESETS = [15, 30, 45, 60];

/* --- inline icons (svg only, no emoji) ------------------------------- */
const IcPlay = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor" stroke="none" />
  </svg>
);
const IcPause = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const IcReset = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcCheck = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcPlus = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
);
const IcCoin = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v8M9.6 12h4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcToday = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3.5 2.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcFlame = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.4 1.3-3.2C9.8 8.6 11 7 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export default function TimerView({ onBack }) {
  const st = useStudy();

  const [subject, setSubject] = useState(SUBJECTS[0].key);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [manualMin, setManualMin] = useState("");
  const [toast, setToast] = useState(null); // {minutes, coins, manual}

  const anchorRef = useRef(0); // wall-clock ms anchor so the count never drifts

  // tick: only keyed on `running`; the anchor absorbs the current elapsed
  useEffect(() => {
    if (!running) return undefined;
    anchorRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - anchorRef.current) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // auto-dismiss the success card
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const sub = subjectInfo(subject);
  const today = todayMinutes(st);
  const streak = streakDays(st);
  const canFinish = elapsed >= 60;
  const finishMin = Math.round(elapsed / 60);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  const finish = () => {
    if (!canFinish) return;
    const before = st.coins;
    const next = addSession({ minutes: finishMin, subject });
    setToast({ minutes: finishMin, coins: Math.max(0, next.coins - before), manual: false });
    setRunning(false);
    setElapsed(0);
  };

  const addManual = () => {
    const m = Math.round(Number(manualMin));
    if (!m || m <= 0) return;
    const before = st.coins;
    const next = addSession({ minutes: m, subject });
    setToast({ minutes: m, coins: Math.max(0, next.coins - before), manual: true });
    setManualMin("");
  };

  const manualValid = Number(manualMin) >= 1;

  return (
    <div className="oxh-sub oxv-tm">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">タイマー</span>
      </div>

      <div className="oxv-body">
        <div className="oxv-tm-wrap">
          {/* live mini stats ------------------------------------------- */}
          <div className="oxv-tm-stats">
            <div className="oxv-tm-stat">
              <span className="oxv-tm-stat-ico" aria-hidden="true">{IcToday}</span>
              <span className="oxv-tm-stat-meta">
                <span className="oxv-tm-stat-k">今日</span>
                <span className="oxv-tm-stat-v">{fmtMinutes(today)}</span>
              </span>
            </div>
            <div className="oxv-tm-stat">
              <span className="oxv-tm-stat-ico oxv-tm-ico-flame" aria-hidden="true">{IcFlame}</span>
              <span className="oxv-tm-stat-meta">
                <span className="oxv-tm-stat-k">連続</span>
                <span className="oxv-tm-stat-v">{streak}<small>日</small></span>
              </span>
            </div>
            <div className="oxv-tm-stat">
              <span className="oxv-tm-stat-ico oxv-tm-ico-coin" aria-hidden="true">{IcCoin}</span>
              <span className="oxv-tm-stat-meta">
                <span className="oxv-tm-stat-k">コイン</span>
                <span className="oxv-tm-stat-v">{(st.coins || 0).toLocaleString("ja-JP")}</span>
              </span>
            </div>
          </div>

          {/* success card --------------------------------------------- */}
          {toast && (
            <div className="oxv-tm-toast" role="status">
              <span className="oxv-tm-toast-ico" aria-hidden="true">{IcCheck}</span>
              <span className="oxv-tm-toast-txt">
                <b>{toast.minutes}分</b>を記録しました
                <span className="oxv-tm-toast-coin">
                  <i aria-hidden="true">{IcCoin}</i>+{toast.coins}コイン
                </span>
              </span>
              <button
                type="button"
                className="oxv-tm-toast-x"
                onClick={() => setToast(null)}
                aria-label="閉じる"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* subject picker ------------------------------------------- */}
          <div className="oxv-tm-label">教科をえらぶ</div>
          <div className="oxv-tm-chips">
            {SUBJECTS.map((s) => {
              const on = s.key === subject;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={"oxv-tm-chip" + (on ? " is-on" : "")}
                  style={on ? { borderColor: s.color, color: s.color, background: `${s.color}22` } : undefined}
                  onClick={() => setSubject(s.key)}
                  aria-pressed={on}
                >
                  <i className="oxv-tm-chip-dot" style={{ background: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* stage : big elapsed display ------------------------------ */}
          <div className={"oxv-tm-stage" + (running ? " is-run" : "")}>
            <div className="oxv-tm-stage-top">
              <span className="oxv-tm-pulse" aria-hidden="true" />
              <span className="oxv-tm-stage-sub" style={{ color: sub.color }}>
                <i style={{ background: sub.color }} />
                {sub.label}
              </span>
            </div>
            <div className="oxv-tm-time">{fmtClock(elapsed)}</div>
            <div className="oxv-tm-stage-hint">
              {running
                ? "計測中…"
                : elapsed > 0
                ? "一時停止中"
                : "スタートして集中を始めよう"}
            </div>
          </div>

          {/* controls ------------------------------------------------- */}
          <div className="oxv-tm-controls">
            <button
              type="button"
              className={"oxv-tm-main" + (running ? " is-pause" : "")}
              onClick={toggle}
              aria-label={running ? "一時停止" : "スタート"}
            >
              <span className="oxv-tm-main-ico" aria-hidden="true">{running ? IcPause : IcPlay}</span>
              {running ? "一時停止" : "スタート"}
            </button>
            <button
              type="button"
              className="oxv-tm-reset"
              onClick={reset}
              disabled={elapsed === 0 && !running}
              aria-label="リセット"
            >
              <span aria-hidden="true">{IcReset}</span>
              リセット
            </button>
          </div>

          {/* finish --------------------------------------------------- */}
          <button
            type="button"
            className="oxv-tm-finish"
            onClick={finish}
            disabled={!canFinish}
            aria-label="記録する"
          >
            <span className="oxv-tm-finish-ico" aria-hidden="true">{IcCheck}</span>
            {canFinish ? `記録する（${finishMin}分）` : "記録する"}
          </button>
          {!canFinish && (
            <p className="oxv-tm-finish-note">60秒以上で記録できます</p>
          )}

          {/* manual entry --------------------------------------------- */}
          <div className="oxv-tm-manual">
            <div className="oxv-tm-manual-head">
              <span className="oxv-tm-manual-title">手動で記録</span>
              <span className="oxv-tm-manual-sub" style={{ color: sub.color }}>
                <i style={{ background: sub.color }} />
                {sub.label}
              </span>
            </div>
            <div className="oxv-tm-presets">
              {MANUAL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={"oxv-tm-preset" + (Number(manualMin) === p ? " is-on" : "")}
                  onClick={() => setManualMin(String(p))}
                >
                  {p}分
                </button>
              ))}
            </div>
            <div className="oxv-tm-manual-row">
              <div className="oxv-tm-field">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="600"
                  step="1"
                  className="oxv-tm-input"
                  placeholder="0"
                  value={manualMin}
                  onChange={(e) => setManualMin(e.target.value)}
                  aria-label="学習した分数"
                />
                <span className="oxv-tm-unit">分</span>
              </div>
              <button
                type="button"
                className="oxv-tm-add"
                onClick={addManual}
                disabled={!manualValid}
                aria-label="追加"
              >
                <span aria-hidden="true">{IcPlus}</span>
                追加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
