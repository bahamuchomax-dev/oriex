import "./analysis.css";
import { useState } from "react";
import {
  useStudy,
  fmtMinutes,
  dateKey,
  weekSeries,
  totalMinutes,
  subjectBreakdown,
  monthMap,
} from "../studyStore.js";

/* ============================================================
 * AnalysisView — 分析 (study analytics dashboard)
 * ------------------------------------------------------------
 * Reads everything from the shared study store (useStudy) — no demo
 * data. Sections:
 *   1) 2x2 summary stat tiles (今週 / 今月 / 累計 / 1日平均, selectable)
 *   2) 教科別の学習割合 — proportion bars per subject (subjectBreakdown)
 *   3) 週別の推移 — last-6-weeks vertical bar chart (last bar = 今週)
 *   4) 時間帯の傾向 — 朝/昼/夕/夜 horizontal bars (by session hour)
 * Every selector in analysis.css is prefixed with .oxv-an.
 * ============================================================ */

const DAY = 86400000;

// --- inline section-heading icons (no emoji — svg only) --------------------
const IcSubjects = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 15v2M12 11v6M16 8v9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcTrend = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 16l5-5 4 3 7-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 6v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcClock = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STORE_KEY = "oriexAnalysisTile";
const TILE_KEYS = ["week", "month", "total", "avg"];

function readTile() {
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    if (v && TILE_KEYS.includes(v)) return v;
  } catch { /* ignore */ }
  return "week";
}

// --- derive everything the view needs from one live state snapshot ---------
function analyze(st) {
  const sessions = st.sessions || [];
  const now = new Date();

  // distinct studied days (for the daily average + sub-captions)
  const dayKeys = new Set(sessions.map((s) => dateKey(s.ts)));
  const studiedDays = dayKeys.size;

  const week = weekSeries(st).reduce((a, d) => a + d.minutes, 0);
  const mMap = monthMap(now.getFullYear(), now.getMonth(), st);
  const month = Object.values(mMap).reduce((a, d) => a + d.minutes, 0);
  const monthDays = Object.keys(mMap).length;
  const total = totalMinutes(st);
  const avg = studiedDays > 0 ? Math.round(total / studiedDays) : 0;

  // 教科別 — already sorted desc, only >0, each carries its own color
  const subjects = subjectBreakdown(st);

  // 週別の推移 — six rolling 7-day buckets back from today (idx 5 = 今週)
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const t0 = todayMid.getTime();
  const weeks = [0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    const sMid = new Date(s.ts);
    sMid.setHours(0, 0, 0, 0);
    const daysAgo = Math.floor((t0 - sMid.getTime()) / DAY);
    if (daysAgo < 0) continue;
    const wAgo = Math.floor(daysAgo / 7);
    if (wAgo > 5) continue;
    weeks[5 - wAgo] += s.minutes;
  }
  const weekLabels = ["5週前", "4週前", "3週前", "2週前", "先週", "今週"];
  const maxWeek = Math.max(...weeks, 1);
  const weekAvg = Math.round(weeks.reduce((a, v) => a + v, 0) / weeks.length);
  const weekDiff = weeks[5] - weeks[4];

  // 時間帯の傾向 — 朝5-11 / 昼11-17 / 夕17-21 / 夜21-5
  const parts = [
    { name: "朝", color: "var(--gold)", min: 0 },
    { name: "昼", color: "var(--blue)", min: 0 },
    { name: "夕", color: "#9a6bff", min: 0 },
    { name: "夜", color: "var(--red)", min: 0 },
  ];
  for (const s of sessions) {
    const h = new Date(s.ts).getHours();
    const i = h >= 5 && h < 11 ? 0 : h >= 11 && h < 17 ? 1 : h >= 17 && h < 21 ? 2 : 3;
    parts[i].min += s.minutes;
  }
  const partTotal = parts.reduce((a, p) => a + p.min, 0) || 1;

  const tiles = [
    { key: "week", label: "今週", value: fmtMinutes(week), sub:
        weekDiff === 0
          ? "先週と同じペース"
          : `先週比 ${weekDiff > 0 ? "+" : "-"}${fmtMinutes(Math.abs(weekDiff))}` },
    { key: "month", label: "今月", value: fmtMinutes(month), sub:
        monthDays > 0 ? `${now.getMonth() + 1}月は ${monthDays}日 学習` : "今月の記録はまだありません" },
    { key: "total", label: "累計", value: fmtMinutes(total), sub: `学習日数 ${studiedDays}日` },
    { key: "avg", label: "1日平均", value: fmtMinutes(avg), sub:
        studiedDays > 0 ? `学習した ${studiedDays}日の平均` : "—" },
  ];

  return { total, subjects, weeks, weekLabels, maxWeek, weekAvg, parts, partTotal, tiles };
}

export default function AnalysisView({ onBack }) {
  const st = useStudy();
  const [active, setActive] = useState(readTile);

  const a = analyze(st);

  const pick = (key) => {
    setActive(key);
    try { window.localStorage.setItem(STORE_KEY, key); } catch { /* ignore */ }
  };

  const cur = a.tiles.find((t) => t.key === active) || a.tiles[0];

  return (
    <div className="oxh-sub oxv-an">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">分析</span>
      </div>

      <div className="oxv-body">
        {a.total <= 0 ? (
          <div className="oxv-an-empty">
            <span className="oxv-an-empty-ic">{IcTrend}</span>
            <p className="oxv-an-empty-t">まだ学習記録がありません</p>
            <p className="oxv-an-empty-s">タイマーで学習を記録すると、ここに学習時間の分析が表示されます。</p>
          </div>
        ) : (
          <>
            {/* 1) summary stat tiles ------------------------------------------ */}
            <div className="oxv-an-stats">
              {a.tiles.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`oxv-an-tile${t.key === active ? " oxv-an-on" : ""}`}
                  onClick={() => pick(t.key)}
                  aria-pressed={t.key === active}
                >
                  <span className="oxv-an-tile-k">{t.label}</span>
                  <span className="oxv-an-tile-v">{t.value}</span>
                </button>
              ))}
            </div>
            <p className="oxv-an-note">{cur.label}：{cur.sub}</p>

            {/* 2) 教科別の学習割合 -------------------------------------------- */}
            <div className="oxv-an-h">{IcSubjects}<span>教科別の学習割合</span></div>
            <div className="oxv-an-card">
              {a.subjects.length === 0 ? (
                <p className="oxv-an-mini">教科別の記録がまだありません。</p>
              ) : (
                a.subjects.map((s) => (
                  <div className="oxv-an-srow" key={s.key}>
                    <span className="oxv-an-sname"><i style={{ background: s.color }} />{s.label}</span>
                    <span className="oxv-an-track">
                      <i style={{ width: `${s.pct}%`, background: s.color }} />
                    </span>
                    <span className="oxv-an-smeta">
                      <b>{s.pct}%</b>
                      <small>{fmtMinutes(s.minutes)}</small>
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 3) 週別の推移 -------------------------------------------------- */}
            <div className="oxv-an-h">{IcTrend}<span>週別の推移</span></div>
            <div className="oxv-an-card">
              <div className="oxv-an-chart">
                {a.weeks.map((v, i) => {
                  const last = i === a.weeks.length - 1;
                  const h = a.maxWeek > 0 ? (v / a.maxWeek) * 100 : 0;
                  return (
                    <div className={`oxv-an-col${last ? " oxv-an-col-t" : ""}`} key={a.weekLabels[i]}>
                      <span className="oxv-an-coltip">{v > 0 ? fmtMinutes(v) : "—"}</span>
                      <span className="oxv-an-bar"><i style={{ height: `${h}%` }} /></span>
                      <span className="oxv-an-collab">{a.weekLabels[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="oxv-an-cap">週平均 <b>{fmtMinutes(a.weekAvg)}</b>・直近6週</div>
            </div>

            {/* 4) 時間帯の傾向 ------------------------------------------------ */}
            <div className="oxv-an-h">{IcClock}<span>時間帯の傾向</span></div>
            <div className="oxv-an-card">
              {a.parts.map((p) => {
                const pct = Math.round((p.min / a.partTotal) * 100);
                return (
                  <div className="oxv-an-prow" key={p.name}>
                    <span className="oxv-an-pname">{p.name}</span>
                    <span className="oxv-an-track">
                      <i style={{ width: `${pct}%`, background: p.color }} />
                    </span>
                    <span className="oxv-an-pmeta">
                      <b>{pct}%</b>
                      <small>{fmtMinutes(p.min)}</small>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
