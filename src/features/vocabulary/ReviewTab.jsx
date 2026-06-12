import { useEffect, useState } from "react";
import { loadReview, saveReview } from "./localReviewStore.js";
import { normalizeList } from "./vocabUtils.js";

// 復習 tab. Backed entirely by localStorage (loadReview/saveReview). No Firestore.
export default function ReviewTab({ uid }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all"); // all | learning | known
  const [quiz, setQuiz] = useState(false);
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    setItems(normalizeList(loadReview(uid)));
  }, [uid]);

  function persist(next) {
    setItems(next);
    saveReview(uid, next); // explicit operation -> save
  }

  function mark(id, status) {
    const now = new Date().toISOString();
    persist(
      items.map((it) =>
        it.id === id
          ? {
              ...it,
              status,
              lastReviewedAt: now,
              reviewCount: (it.reviewCount || 0) + 1,
            }
          : it
      )
    );
  }

  function remove(id) {
    const it = items.find((x) => x.id === id);
    if (!window.confirm(`「${it?.word || "この単語"}」を復習リストから削除しますか？`)) return;
    persist(items.filter((x) => x.id !== id));
  }

  const shown = items.filter((it) =>
    filter === "all" ? true : (it.status || "learning") === filter
  );

  if (items.length === 0) {
    return (
      <div className="ox-empty">
        <div className="ox-empty-icon">🗂</div>
        <p>復習リストはまだ空です。</p>
        <p className="ox-empty-sub">単語帳やマイワードから「復習に追加」すると、ここに並びます。</p>
      </div>
    );
  }

  return (
    <div className="vocab-tab-surface">
      <div className="vocab-tab-intro green">
        <div>
          <span className="section-chip">Review</span>
          <h3>復習</h3>
          <p>覚えた/もう一度で、localStorageの復習リストを整理します。</p>
        </div>
        <span className="vocab-count">{shown.length}/{items.length}</span>
      </div>

      <div className="vocab-toolbar">
        <div className="ox-segment">
          {[["all", "すべて"], ["learning", "未習得"], ["known", "習得済み"]].map(([k, label]) => (
            <button
              key={k}
              className={"ox-segment-btn" + (filter === k ? " active" : "")}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="ox-button-soft" onClick={() => { setQuiz((q) => !q); setRevealed({}); }}>
          {quiz ? "通常表示" : "クイズ"}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="ox-empty"><p>該当する単語がありません。</p></div>
      ) : (
        <ul className="ox-card-list">
          {shown.map((it) => {
            const hideMeaning = quiz && !revealed[it.id];
            return (
              <li key={it.id} className="ox-card vocab-card">
                <div className="vocab-card-head">
                  <span className="vocab-word">{it.word || "（語句なし）"}</span>
                  <span className={"vocab-status " + (it.status === "known" ? "known" : "learning")}>
                    {it.status === "known" ? "習得済み" : "未習得"}
                  </span>
                </div>

                {hideMeaning ? (
                  <button className="ox-button-soft" onClick={() => setRevealed((r) => ({ ...r, [it.id]: true }))}>
                    意味を表示
                  </button>
                ) : (
                  <>
                    {it.meaning && <div className="vocab-meaning">{it.meaning}</div>}
                    {it.note && <div className="vocab-note">{it.note}</div>}
                    {it.example && <div className="vocab-example">{it.example}</div>}
                  </>
                )}

                <div className="vocab-actions">
                  <button className="ox-button-primary" onClick={() => mark(it.id, "known")}>覚えた</button>
                  <button className="ox-button-soft" onClick={() => mark(it.id, "learning")}>もう一度</button>
                  <button className="ox-button-danger" onClick={() => remove(it.id)}>削除</button>
                </div>
                {it.reviewCount > 0 && (
                  <div className="vocab-meta">復習 {it.reviewCount} 回</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
