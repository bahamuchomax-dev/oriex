import { useState } from "react";
import StudyDiary from "../studyDiary/index.jsx";

// Records hub. Tab scaffold; only "勉強時間記録" (studyDiary) is implemented in
// this stage. Other tabs render an "未実装" placeholder.
const TABS = [
  { key: "study", label: "勉強時間記録" },
  { key: "attendance", label: "現論会登校スタンプ" },
  { key: "calendar", label: "予定カレンダー" },
  { key: "notes", label: "メモ" },
  { key: "timeline", label: "記録タイムライン" },
];

export default function Records({ uid }) {
  const [tab, setTab] = useState("study");

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>記録</h2>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={"tab" + (t.key === tab ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tab === "study" ? (
          <StudyDiary uid={uid} />
        ) : (
          <div className="feature-placeholder">
            <h2>{TABS.find((t) => t.key === tab)?.label}</h2>
            <p>未実装です。今後のステージで実装します。</p>
          </div>
        )}
      </div>
    </section>
  );
}
