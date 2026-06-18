import "./laboLegacy.css";
import { useState } from "react";

import Homework from "./Homework.jsx";
import Qa from "./Qa.jsx";
import Timetable from "./Timetable.jsx";
import Grades from "./Grades.jsx";

/* ============================================================
 * LaboLegacy — the LIGHT, cream-themed LABO mounted INTO the legacy
 * ("old"/原) home's ひろば screen (the legacy renders a #ox-labo-host
 * div + its own native top bar with a「‹ ひろば」back button; we render
 * the hub + features inside it via our own React root — see
 * mountLaboLegacy.jsx). A small internal router shows a 4-card hub and,
 * when a card is tapped, that feature with a back-to-hub header.
 *   宿題 / 質問箱 / 時間割 / 成績カルテ
 * Everything is scoped under .oxll (no global tokens — this lives in the
 * legacy DOM which has none). No emoji; inline SVG only.
 * ============================================================ */

const IcHomework = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="3.5" width="14" height="17" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M9 3.5V6h6V3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M8.5 12l2.2 2.2L15 9.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcQa = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9.4 8.4a2.2 2.2 0 0 1 4.1 1c0 1.4-2 1.6-2 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="11.5" cy="14.2" r="0.95" fill="currentColor" stroke="none" />
  </svg>
);
const IcTimetable = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9.5h17M8.5 5v15M3.5 14.5h17" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7.5 3v3.4M16.5 3v3.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const IcGrades = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="5.4" y="12" width="3.4" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="10.3" y="8" width="3.4" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="15.2" y="5" width="3.4" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);
const IcBack = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcChevron = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FEATS = [
  { key: "homework", title: "宿題", desc: "提出物と期限の管理", color: "#3F8DFF", icon: IcHomework, Comp: Homework },
  { key: "qa", title: "質問箱", desc: "先生に質問できる", color: "#E8273C", icon: IcQa, Comp: Qa },
  { key: "timetable", title: "時間割", desc: "今週の授業予定", color: "#E8923A", icon: IcTimetable, Comp: Timetable },
  { key: "grades", title: "成績カルテ", desc: "テストの点数と推移", color: "#2BA85B", icon: IcGrades, Comp: Grades },
];

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function LaboLegacy() {
  const [feat, setFeat] = useState(null);
  const active = FEATS.find((f) => f.key === feat) || null;

  if (active) {
    const Comp = active.Comp;
    return (
      <div className="oxll" key={active.key}>
        <div className="oxll-fhead">
          <button className="oxll-fback" onClick={() => setFeat(null)} aria-label="LABOにもどる">{IcBack}</button>
          <span className="oxll-fic" style={{ color: active.color, background: hexA(active.color, 0.12) }}>{active.icon}</span>
          <span className="oxll-fname">{active.title}</span>
        </div>
        <Comp />
      </div>
    );
  }

  return (
    <div className="oxll" key="hub">
      <p className="oxll-intro">塾の学習をサポートする機能です。気になるものを開いてみよう。</p>
      <div className="oxll-grid">
        {FEATS.map((f) => (
          <button
            type="button"
            className="oxll-card"
            key={f.key}
            onClick={() => setFeat(f.key)}
            style={{ "--ac": f.color, "--acw": hexA(f.color, 0.12), "--acb": hexA(f.color, 0.32) }}
          >
            <span className="oxll-card-ic">{f.icon}</span>
            <span className="oxll-card-tt">{f.title}</span>
            <span className="oxll-card-ds">{f.desc}</span>
            <span className="oxll-card-go">{IcChevron}</span>
          </button>
        ))}
      </div>
      <p className="oxll-foot">先生が新しい機能を追加していきます。</p>
    </div>
  );
}
