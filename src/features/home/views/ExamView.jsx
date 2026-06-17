import "./exam.css";
import { useState } from "react";

/* ============================================================
 * ExamView — 模試 (mock-exam hub)
 * ------------------------------------------------------------
 * Presentational + demo, but fully interactive:
 *   1) 次回の模試 banner — date + countdown + 申込 toggle
 *      (persisted in localStorage "oxhExam").
 *   2) 成績推移 — an SVG line chart of past 偏差値 with the
 *      latest point highlighted + 前回比 delta.
 *   3) 模試結果 — expandable result cards: 偏差値, A-E判定,
 *      and a per-subject score breakdown (tap to expand).
 *   4) 科目別平均 — mini average bars across all results.
 * All demo data is generated relative to "now" so the banner
 * always reads as upcoming. Every selector is prefixed .oxv-ex;
 * chrome (.oxh-sub/.oxv-body/...) is global and never redefined.
 * ============================================================ */

const DAY = 86400000;
const NOW = Date.now();
const WD = ["日", "月", "火", "水", "木", "金", "土"];

// --- subject meta (display order for breakdowns) ---------------------------
const SUBJECTS = [
  { key: "math", label: "数学", color: "#e8273c" },
  { key: "english", label: "英語", color: "#3f8dff" },
  { key: "japanese", label: "国語", color: "#2bd47e" },
  { key: "science", label: "理科", color: "#9a6bff" },
  { key: "social", label: "社会", color: "#ffb020" },
];

// --- demo exams (oldest first; chart reads in this order) ------------------
const PAST = [
  { id: "e1", name: "第1回 駿台全国模試", daysAgo: 158, hensachi: 54.2, judge: "C", examinees: 18900, rank: 5210,
    scores: { math: 62, english: 55, japanese: 58, science: 60, social: 64 } },
  { id: "e2", name: "第2回 進研記述模試", daysAgo: 112, hensachi: 57.8, judge: "B", examinees: 19500, rank: 3180,
    scores: { math: 68, english: 63, japanese: 60, science: 66, social: 70 } },
  { id: "e3", name: "第3回 全統共通テスト模試", daysAgo: 74, hensachi: 56.1, judge: "C", examinees: 18700, rank: 4020,
    scores: { math: 64, english: 61, japanese: 57, science: 63, social: 66 } },
  { id: "e4", name: "第4回 駿台全国模試", daysAgo: 38, hensachi: 61.5, judge: "B", examinees: 20100, rank: 1880,
    scores: { math: 72, english: 69, japanese: 64, science: 70, social: 74 } },
  { id: "e5", name: "第5回 共通テスト本番レベル模試", daysAgo: 12, hensachi: 64.9, judge: "A", examinees: 21000, rank: 980,
    scores: { math: 78, english: 74, japanese: 68, science: 75, social: 80 } },
];

const NEXT = { name: "第6回 全国記述模試", daysAhead: 24, format: "記述式・5教科", venue: "会場受験 / オンライン選択" };

const STORE_KEY = "oxhExam";

// --- date helpers ----------------------------------------------------------
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
}
function fmtShort(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function monthLabel(ts) {
  return `${new Date(ts).getMonth() + 1}月`;
}

// --- persistence (申込 state) ----------------------------------------------
function loadApplied() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o.applied === "boolean") return o.applied;
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
  return false;
}
function saveApplied(applied) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ applied }));
  } catch {
    /* ignore */
  }
}

// --- inline icons (svg only — no emoji) ------------------------------------
const IcCal = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 9h16M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcTrend = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 16l5-5 4 3 7-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 6v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcAward = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="9" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 13.4L7.5 21l4.5-2.6L16.5 21 15 13.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcBars = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 20V10M12 20V4M19 20v-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcCheck = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- 偏差値 line-chart geometry -------------------------------------------
function buildChart(points) {
  const W = 300;
  const H = 134;
  const padL = 14;
  const padR = 14;
  const padTop = 26;
  const padBottom = 24;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;
  const vals = points.map((p) => p.hensachi);
  const lo = Math.floor(Math.min(...vals) - 4);
  const hi = Math.ceil(Math.max(...vals) + 4);
  const range = hi - lo || 1;
  const n = points.length;
  const xOf = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yOf = (v) => padTop + innerH * (1 - (v - lo) / range);
  const nodes = points.map((p, i) => ({ ...p, x: xOf(i), y: yOf(p.hensachi), last: i === n - 1 }));
  const line = nodes.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  const baseY = H - padBottom;
  const area = `M ${nodes[0].x.toFixed(1)},${baseY} ` +
    nodes.map((d) => `L ${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ") +
    ` L ${nodes[n - 1].x.toFixed(1)},${baseY} Z`;
  const showFifty = lo <= 50 && hi >= 50;
  return { W, H, nodes, line, area, fiftyY: yOf(50), showFifty, baseY };
}

export default function ExamView({ onBack }) {
  const [applied, setApplied] = useState(loadApplied);
  const [openId, setOpenId] = useState(null);

  const toggleApply = () => {
    const next = !applied;
    setApplied(next);
    saveApplied(next);
  };
  const toggleCard = (id) => setOpenId((cur) => (cur === id ? null : id));

  // next exam timing
  const nextTs = NOW + NEXT.daysAhead * DAY;
  const daysLeft = Math.max(0, Math.ceil((nextTs - NOW) / DAY));

  // results: newest first for the list; chart keeps chronological order
  const exams = PAST.map((e) => ({ ...e, ts: NOW - e.daysAgo * DAY }));
  const listed = [...exams].reverse();
  const chart = buildChart(exams);
  const latest = exams[exams.length - 1];
  const prev = exams[exams.length - 2];
  const delta = prev ? Math.round((latest.hensachi - prev.hensachi) * 10) / 10 : 0;

  // 科目別平均 across all results
  const averages = SUBJECTS.map((s) => {
    const sum = exams.reduce((a, e) => a + (e.scores[s.key] || 0), 0);
    return { ...s, avg: Math.round((sum / exams.length) * 10) / 10 };
  });

  return (
    <div className="oxh-sub oxv-ex">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">模試</span>
      </div>

      <div className="oxv-body">
        <div className="oxv-ex-wrap">

          {/* 1) 次回の模試 banner ---------------------------------------- */}
          <section className="oxv-ex-next">
            <div className="oxv-ex-next-glow" aria-hidden="true" />
            <span className="oxv-ex-next-tag">次回の模試</span>
            <h2 className="oxv-ex-next-name">{NEXT.name}</h2>
            <div className="oxv-ex-next-meta">
              <span className="oxv-ex-next-date">{IcCal}{fmtDate(nextTs)}</span>
            </div>
            <p className="oxv-ex-next-fmt">{NEXT.format}・{NEXT.venue}</p>
            <div className="oxv-ex-next-foot">
              <span className={"oxv-ex-cd" + (applied ? " is-on" : "")}>
                受験まで<b>{daysLeft}</b>日
              </span>
              <button
                type="button"
                className={"oxv-ex-apply" + (applied ? " is-applied" : "")}
                onClick={toggleApply}
                aria-pressed={applied}
                aria-label={applied ? "申込を取り消す" : "次回の模試に申し込む"}
              >
                {applied ? <>{IcCheck}申込済</> : "申込する"}
              </button>
            </div>
          </section>

          {/* 2) 成績推移 chart ------------------------------------------- */}
          <div className="oxv-ex-h">{IcTrend}<span>成績推移</span></div>
          <div className="oxv-ex-card">
            <div className="oxv-ex-chart">
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="oxv-ex-svg" role="img" aria-label="過去の偏差値の推移">
                <defs>
                  <linearGradient id="oxvExLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#ff6173" />
                    <stop offset="1" stopColor="#7db4ff" />
                  </linearGradient>
                  <linearGradient id="oxvExAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(232,39,60,.32)" />
                    <stop offset="1" stopColor="rgba(232,39,60,0)" />
                  </linearGradient>
                </defs>

                {chart.showFifty && (
                  <>
                    <line className="oxv-ex-grid" x1="12" y1={chart.fiftyY} x2={chart.W - 12} y2={chart.fiftyY} />
                    <text className="oxv-ex-glab" x={chart.W - 12} y={chart.fiftyY - 4} textAnchor="end">偏差値50</text>
                  </>
                )}

                <path className="oxv-ex-area" d={chart.area} fill="url(#oxvExAreaGrad)" />
                <polyline className="oxv-ex-ln" points={chart.line} />

                {chart.nodes.map((d) => (
                  <g key={d.id}>
                    {d.last && <circle className="oxv-ex-ring" cx={d.x} cy={d.y} r="8" />}
                    <circle className={"oxv-ex-dot" + (d.last ? " oxv-ex-dot-last" : "")} cx={d.x} cy={d.y} r={d.last ? 5 : 3.6} />
                    <text className={"oxv-ex-vlab" + (d.last ? " oxv-ex-vlab-last" : "")} x={d.x} y={d.y - (d.last ? 13 : 10)} textAnchor="middle">
                      {d.hensachi.toFixed(1)}
                    </text>
                    <text className="oxv-ex-xlab" x={d.x} y={chart.H - 7} textAnchor="middle">{monthLabel(d.ts)}</text>
                  </g>
                ))}
              </svg>
            </div>
            <div className="oxv-ex-chart-cap">
              <span>最新 <b>{latest.hensachi.toFixed(1)}</b></span>
              <span className={"oxv-ex-delta" + (delta >= 0 ? " is-up" : " is-down")}>
                前回比 {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(1)}
              </span>
            </div>
          </div>

          {/* 3) 模試結果 list (expandable) ------------------------------- */}
          <div className="oxv-ex-h">{IcAward}<span>模試結果</span></div>
          <ul className="oxv-ex-list">
            {listed.map((e) => {
              const open = openId === e.id;
              return (
                <li key={e.id} className={"oxv-ex-item" + (open ? " is-open" : "")}>
                  <button
                    type="button"
                    className="oxv-ex-item-btn"
                    onClick={() => toggleCard(e.id)}
                    aria-expanded={open}
                  >
                    <span className="oxv-ex-item-main">
                      <span className="oxv-ex-item-name">{e.name}</span>
                      <span className="oxv-ex-item-date">{fmtShort(e.ts)}・受験者 {e.examinees.toLocaleString("ja-JP")}名</span>
                    </span>
                    <span className="oxv-ex-item-fig">
                      <span className="oxv-ex-hen">
                        <small>偏差値</small>
                        <b>{e.hensachi.toFixed(1)}</b>
                      </span>
                      <span className={"oxv-ex-judge oxv-ex-judge-" + e.judge.toLowerCase()}>{e.judge}</span>
                    </span>
                    <svg className="oxv-ex-chev" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <div className="oxv-ex-detail">
                    <div className="oxv-ex-detail-in">
                      {SUBJECTS.map((s) => {
                        const score = e.scores[s.key] || 0;
                        return (
                          <div className="oxv-ex-srow" key={s.key}>
                            <span className="oxv-ex-sname"><i style={{ background: s.color }} />{s.label}</span>
                            <span className="oxv-ex-track">
                              <i style={{ width: `${score}%`, background: s.color }} />
                            </span>
                            <span className="oxv-ex-sval">{score}</span>
                          </div>
                        );
                      })}
                      <div className="oxv-ex-rank">志望者内順位 <b>{e.rank.toLocaleString("ja-JP")}</b> 位 / {e.examinees.toLocaleString("ja-JP")}名中</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 4) 科目別平均 mini summary ---------------------------------- */}
          <div className="oxv-ex-h">{IcBars}<span>科目別平均</span></div>
          <div className="oxv-ex-card oxv-ex-avg">
            {averages.map((s) => (
              <div className="oxv-ex-srow" key={s.key}>
                <span className="oxv-ex-sname"><i style={{ background: s.color }} />{s.label}</span>
                <span className="oxv-ex-track">
                  <i style={{ width: `${s.avg}%`, background: s.color }} />
                </span>
                <span className="oxv-ex-sval">{s.avg.toFixed(1)}</span>
              </div>
            ))}
            <p className="oxv-ex-foot">直近{exams.length}回の平均点（各科目100点満点）</p>
          </div>

        </div>
      </div>
    </div>
  );
}
