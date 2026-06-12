import { useState } from "react";
import WordbookTab from "./WordbookTab.jsx";
import ReviewTab from "./ReviewTab.jsx";
import MyWordsTab from "./MyWordsTab.jsx";

// Vocabulary screen: 単語帳 / 復習 / マイワード. review & userVocab are stored in
// localStorage only (see the two local*Store.js files) — never Firestore.
const TABS = [
  { key: "wordbook", label: "単語帳" },
  { key: "review", label: "復習" },
  { key: "mywords", label: "マイワード" },
];

export default function Vocabulary({ uid }) {
  const [tab, setTab] = useState("wordbook");

  return (
    <section className="ox-screen">
      <h2 className="ox-screen-title">単語学習</h2>

      <div className="ox-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={"ox-tab" + (t.key === tab ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ox-tab-panel">
        {tab === "wordbook" && <WordbookTab uid={uid} />}
        {tab === "review" && <ReviewTab uid={uid} />}
        {tab === "mywords" && <MyWordsTab uid={uid} />}
      </div>
    </section>
  );
}
