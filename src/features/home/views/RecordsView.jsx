import "./records.css";
import {
  useStudy,
  fmtMinutes,
  subjectInfo,
  weekSeries,
  recentSessions,
  todayMinutes,
  totalMinutes,
  streakDays,
  dateKey,
} from "../studyStore.js";

/* ============================================================
 * RecordsView — 記録 (study records / history)
 * ------------------------------------------------------------
 * Reads everything live from the shared studyStore (useStudy):
 *   1) 4 summary stat tiles — 今日 / 今週 / 累計 / 連続
 *   2) a 7-day mini bar chart (today highlighted blue) + average
 *   3) a day-grouped timeline of the most recent sessions
 *   4) a real empty state when nothing has been recorded yet
 * Every selector in records.css is prefixed with .oxv-rc.
 * Chrome (.oxh-sub / .oxh-sub-head / .oxh-back / .oxh-sub-title /
 * .oxv-body) and tokens (--red/--blue/...) come from globals.
 * ============================================================ */

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// "HH:MM" time-of-day from a session timestamp.
function clockOf(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "M月D日（曜）" header from a dateKey ("YYYY-MM-DD").
function dayLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const wd = WEEK[new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日（${wd}）`;
}

// Group newest-first sessions into ordered day buckets.
function groupByDay(sessions) {
  const groups = [];
  let cur = null;
  for (const s of sessions) {
    const key = dateKey(s.ts);
    if (!cur || cur.key !== key) {
      cur = { key, label: dayLabel(key), total: 0, items: [] };
      groups.push(cur);
    }
    cur.items.push(s);
    cur.total += s.minutes;
  }
  return groups;
}

// --- section-heading icons (svg only, no emoji) ----------------------------
const IcChart = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="6" y="11" width="3" height="6" rx="1" fill="currentColor" />
    <rect x="11" y="7" width="3" height="10" rx="1" fill="currentColor" />
    <rect x="16" y="13" width="3" height="4" rx="1" fill="currentColor" />
  </svg>
);
const IcList = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 7h12M8 12h12M8 17h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="4" cy="7" r="1.4" fill="currentColor" />
    <circle cx="4" cy="12" r="1.4" fill="currentColor" />
    <circle cx="4" cy="17" r="1.4" fill="currentColor" />
  </svg>
);

export default function RecordsView({ onBack }) {
  const st = useStudy();

  const week = weekSeries(st);
  const weekTotal = week.reduce((a, w) => a + w.minutes, 0);
  const weekAvg = Math.round(weekTotal / 7);
  const peak = Math.max(1, ...week.map((w) => w.minutes));

  const today = todayMinutes(st);
  const total = totalMinutes(st);
  const streak = streakDays(st);

  const recent = recentSessions(40, st);
  const groups = groupByDay(recent);
  const hasData = st.sessions.length > 0;

  const TILES = [
    { key: "today", label: "今日", value: fmtMinutes(today) },
    { key: "week", label: "今週", value: fmtMinutes(weekTotal) },
    { key: "total", label: "累計", value: fmtMinutes(total) },
    { key: "streak", label: "連続", value: `${streak}日`, accent: true },
  ];

  return (
    <div className="oxh-sub oxv-rc">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">記録</span>
      </div>

      <div className="oxv-body">
        {/* 1) summary stat tiles ------------------------------------------ */}
        <div className="oxv-rc-stats">
          {TILES.map((t) => (
            <div className={`oxv-rc-tile${t.accent ? " oxv-rc-tile-hot" : ""}`} key={t.key}>
              <span className="oxv-rc-tile-k">{t.label}</span>
              <span className="oxv-rc-tile-v">{t.value}</span>
            </div>
          ))}
        </div>

        {/* 2) 7-day mini bar chart ---------------------------------------- */}
        <div className="oxv-rc-h">{IcChart}<span>この1週間</span></div>
        <div className="oxv-rc-card">
          <div className="oxv-rc-chart">
            {week.map((w) => {
              const h = Math.round((w.minutes / peak) * 100);
              return (
                <div className={`oxv-rc-col${w.today ? " oxv-rc-col-t" : ""}`} key={w.dateKey}>
                  <span className="oxv-rc-coltip">{w.minutes > 0 ? `${w.minutes}` : ""}</span>
                  <span className="oxv-rc-bar">
                    <i style={{ height: `${w.minutes > 0 ? Math.max(6, h) : 0}%` }} />
                  </span>
                  <span className={`oxv-rc-collab${w.dow === 0 ? " sun" : w.dow === 6 ? " sat" : ""}`}>
                    {WEEK[w.dow]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="oxv-rc-cap">
            1日平均 <b>{fmtMinutes(weekAvg)}</b>・合計 {fmtMinutes(weekTotal)}
          </div>
        </div>

        {/* 3) timeline ---------------------------------------------------- */}
        <div className="oxv-rc-h">{IcList}<span>学習タイムライン</span></div>

        {hasData ? (
          <div className="oxv-rc-timeline">
            {groups.map((g) => (
              <div className="oxv-rc-group" key={g.key}>
                <div className="oxv-rc-day">
                  <span className="oxv-rc-day-d">{g.label}</span>
                  <span className="oxv-rc-day-t">{fmtMinutes(g.total)}</span>
                </div>
                <div className="oxv-rc-card oxv-rc-rows">
                  {g.items.map((s) => {
                    const info = subjectInfo(s.subject);
                    return (
                      <div className="oxv-rc-row" key={s.id}>
                        <span className="oxv-rc-dot" style={{ background: info.color }} />
                        <span className="oxv-rc-subj">{info.label}</span>
                        <span className="oxv-rc-time">{clockOf(s.ts)}</span>
                        <span className="oxv-rc-min">{fmtMinutes(s.minutes)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="oxv-rc-card oxv-rc-empty">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <p>まだ記録がありません。タイマーで学習を記録しましょう。</p>
          </div>
        )}
      </div>
    </div>
  );
}
