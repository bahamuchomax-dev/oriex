import "./calendar.css";
import { useState } from "react";
import {
  useStudy,
  monthMap,
  sessionsOn,
  subjectInfo,
  fmtMinutes,
  dateKey,
} from "../studyStore.js";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

// Heat intensity (4 non-zero steps) relative to the daily goal, so the tint
// scales with what "a full day" means for this user instead of magic numbers.
function heatLevel(min, goal) {
  if (min <= 0) return 0;
  const g = goal > 0 ? goal : 180;
  if (min < g * 0.34) return 1;
  if (min < g * 0.67) return 2;
  if (min < g) return 3;
  return 4;
}

// Stable "YYYY-MM-DD" for a calendar cell, matching the keys monthMap emits.
function cellKey(y, m, d) {
  return dateKey(new Date(y, m, d).getTime());
}

export default function CalendarView({ onBack }) {
  const st = useStudy();

  const [today] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  });
  const [view, setView] = useState(() => ({ y: today.y, m: today.m }));
  const [selected, setSelected] = useState(() => ({ ...today }));

  function shift(delta) {
    let m = view.m + delta;
    let y = view.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setView({ y, m });
    if (y === today.y && m === today.m) setSelected({ y, m, d: today.d });
    else setSelected({ y, m, d: 1 });
  }

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  // Real study data for the displayed month.
  const mm = monthMap(view.y, view.m, st);
  let monthMin = 0;
  for (const k in mm) monthMin += mm[k].minutes;
  const monthDays = Object.keys(mm).length;

  // Selected day — real sessions, total minutes, and per-subject breakdown.
  const selKey = cellKey(selected.y, selected.m, selected.d);
  const selSessions = sessionsOn(selKey, st);
  const selMin = selSessions.reduce((a, s) => a + s.minutes, 0);
  const bySub = {};
  for (const s of selSessions) bySub[s.subject] = (bySub[s.subject] || 0) + s.minutes;
  const selSubjects = Object.keys(bySub)
    .map((key) => ({ ...subjectInfo(key), minutes: bySub[key] }))
    .sort((a, b) => b.minutes - a.minutes);
  const selWd = WEEK[new Date(selected.y, selected.m, selected.d).getDay()];

  return (
    <div className="oxh-sub oxv-cal">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">カレンダー</span>
      </div>

      <div className="oxv-body">
        <div className="oxv-cal-nav">
          <button className="oxv-cal-nav-btn" onClick={() => shift(-1)} aria-label="前の月">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="oxv-cal-title-wrap">
            <span className="oxv-cal-title">{view.y}年{view.m + 1}月</span>
            <span className="oxv-cal-sub">
              {monthDays > 0 ? `${fmtMinutes(monthMin)} ・ ${monthDays}日学習` : "学習記録なし"}
            </span>
          </div>
          <button className="oxv-cal-nav-btn" onClick={() => shift(1)} aria-label="次の月">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="oxv-cal-week">
          {WEEK.map((w, i) => (
            <div key={w} className={"oxv-cal-wd" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>
              {w}
            </div>
          ))}
        </div>

        <div className="oxv-cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={"b" + i} className="oxv-cal-blank" aria-hidden="true" />;
            const wd = (firstWeekday + d - 1) % 7;
            const entry = mm[cellKey(view.y, view.m, d)];
            const min = entry ? entry.minutes : 0;
            const lv = heatLevel(min, st.goalMin);
            const isToday = view.y === today.y && view.m === today.m && d === today.d;
            const isSel = view.y === selected.y && view.m === selected.m && d === selected.d;
            const cls =
              "oxv-cal-day lv" + lv +
              (wd === 0 ? " sun" : wd === 6 ? " sat" : "") +
              (isToday ? " today" : "") +
              (isSel ? " sel" : "");
            return (
              <button
                key={d}
                className={cls}
                onClick={() => setSelected({ y: view.y, m: view.m, d })}
                aria-pressed={isSel}
                aria-label={`${view.m + 1}月${d}日 ${min > 0 ? fmtMinutes(min) : "学習なし"}`}
              >
                <span className="oxv-cal-num">{d}</span>
                {min > 0 && <span className="oxv-cal-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="oxv-cal-legend">
          <span>少</span>
          <i className="l0" />
          <i className="l1" />
          <i className="l2" />
          <i className="l3" />
          <i className="l4" />
          <span>多</span>
        </div>

        <div className="oxv-cal-sum">
          <div className="oxv-cal-sum-head">
            <span className="oxv-cal-sum-date">{selected.m + 1}月{selected.d}日</span>
            <span className="oxv-cal-sum-wd">（{selWd}）</span>
          </div>

          <div className="oxv-cal-stat">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="oxv-cal-stat-lbl">学習</span>
            <b>{fmtMinutes(selMin)}</b>
          </div>

          {selSubjects.length > 0 ? (
            <div className="oxv-cal-chips">
              {selSubjects.map((s) => (
                <span key={s.key} className="oxv-cal-chip">
                  <i style={{ background: s.color }} />
                  {s.label}
                  <span className="oxv-cal-chip-min">{fmtMinutes(s.minutes)}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="oxv-cal-empty">この日は学習記録がありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
