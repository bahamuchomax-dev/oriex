import { useState } from "react";
import WordbookTab from "./WordbookTab.jsx";
import ReviewTab from "./ReviewTab.jsx";
import MyWordsTab from "./MyWordsTab.jsx";

// Vocabulary screen: 単語帳 / 復習 / マイワード. review & userVocab are stored in
// localStorage only (see the two local*Store.js files) — never Firestore.
const TABS = [
  { key: "wordbook", label: "単語帳", icon: "単" },
  { key: "review", label: "復習", icon: "復" },
  { key: "mywords", label: "マイワード", icon: "作" },
];

export default function Vocabulary({ uid, navigate }) {
  const [tab, setTab] = useState("wordbook");

  return (
    <section className="ox-screen vocab-screen">
      <div className="vocab-hero">
        <div>
          <p className="home-kicker">Vocabulary</p>
          <h2>単語学習</h2>
          <p>単語帳、復習、マイワードをFactory風に整理しました。</p>
        </div>
        {navigate && (
          <button className="vocab-factory-button" onClick={() => navigate("factory")}>
            Factory
          </button>
        )}
      </div>

      <div className="ox-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={"ox-tab" + (t.key === tab ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            <span aria-hidden="true">{t.icon}</span>
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
