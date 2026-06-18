import "./labo.css";
import { useState } from "react";

import Homework from "./Homework.jsx";
import Qa from "./Qa.jsx";
import Timetable from "./Timetable.jsx";
import Grades from "./Grades.jsx";

/* ============================================================
 * Labo — LABO (学習ラボ): a 塾(juku) study hub mounted as the third
 * tab of ひろば (FriendsView). A small landing grid links to four
 * self-contained juku features; an internal router renders the
 * selected feature with a back-to-hub header (no Home.jsx routing).
 *   宿題 / 質問箱 / 時間割 / 成績カルテ
 * Each feature is its own scoped view (.oxv-hw/.oxv-qa/.oxv-tt/.oxv-gr);
 * this hub is scoped under .oxv-lab. Chrome (.oxh-back) + tokens come
 * from globals. No emoji — every glyph is an inline svg.
 * ============================================================ */

// --- inline svg icons (no emoji) -------------------------------------------
const IcHomework = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="3.5" width="14" height="17" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 3.5V6h6V3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M8.5 12l2.2 2.2L15 9.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcQa = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9.4 8.4a2.2 2.2 0 0 1 4.1 1c0 1.4-2 1.6-2 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="11.5" cy="14.2" r="0.95" fill="currentColor" stroke="none" />
  </svg>
);
const IcTimetable = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 9.5h17M8.5 5v15M3.5 14.5h17" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 3v3.4M16.5 3v3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcGrades = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="5.4" y="12" width="3.4" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="10.3" y="8" width="3.4" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="15.2" y="5" width="3.4" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
const IcFlask = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.5 3.5v5.2L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3l-4.3-8.3V3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8.5 3.5h7M7.6 14.5h8.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcChevron = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcBack = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FEATS = [
  { key: "homework", title: "宿題", desc: "提出物と期限の管理", color: "#3f8dff", icon: IcHomework, Comp: Homework },
  { key: "qa", title: "質問箱", desc: "先生に質問できる", color: "#e8273c", icon: IcQa, Comp: Qa },
  { key: "timetable", title: "時間割", desc: "今週の授業予定", color: "#ffb020", icon: IcTimetable, Comp: Timetable },
  { key: "grades", title: "成績カルテ", desc: "テストの点数と推移", color: "#2bd47e", icon: IcGrades, Comp: Grades },
];

// hex -> rgba (no color-mix dependency — works on older iOS Safari too). The
// per-card accent vars below tint each card's gradient, icon chip, and border.
function hexA(hex, a) {
  const h = (hex || "#9aa3bd").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function accentVars(color) {
  return {
    "--ac": color,
    "--ac-g": hexA(color, 0.18),
    "--ac-w": hexA(color, 0.16),
    "--ac-b": hexA(color, 0.42),
  };
}

export default function Labo() {
  const [feat, setFeat] = useState(null);
  const active = FEATS.find((f) => f.key === feat) || null;

  if (active) {
    const Comp = active.Comp;
    return (
      <div className="oxv-lab" key={active.key}>
        <div className="oxv-lab-fhead">
          <button className="oxh-back" onClick={() => setFeat(null)} aria-label="LABOにもどる">{IcBack}</button>
          <span className="oxv-lab-ftitle" style={{ color: active.color }}>{active.icon}</span>
          <span className="oxv-lab-fname">{active.title}</span>
        </div>
        <Comp />
      </div>
    );
  }

  return (
    <div className="oxv-lab" key="hub">
      <div className="oxv-lab-intro">
        <span className="oxv-lab-intro-ic">{IcFlask}</span>
        <span className="oxv-lab-intro-tx">
          <b>学習ラボ</b>
          <small>塾の学習をサポートする機能</small>
        </span>
      </div>

      <div className="oxv-lab-grid">
        {FEATS.map((f) => (
          <button
            type="button"
            className="oxv-lab-card"
            key={f.key}
            onClick={() => setFeat(f.key)}
            style={accentVars(f.color)}
          >
            <span className="oxv-lab-ic">{f.icon}</span>
            <span className="oxv-lab-tt">{f.title}</span>
            <span className="oxv-lab-ds">{f.desc}</span>
            <span className="oxv-lab-go">{IcChevron}</span>
          </button>
        ))}
      </div>

      <p className="oxv-lab-foot">先生が新しい機能を追加していきます。</p>
    </div>
  );
}
