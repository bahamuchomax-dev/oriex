import "./vocab.css";
import { useState, useEffect } from "react";
import { loadDistributedVocab, getVocabSeenAt, markVocabSeen } from "../distributedVocab.js";

/* persisted shape: [{ id, term, meaning, known }] under "oxhVocab" */
const STORE_KEY = "oxhVocab";

const SEED = [
  { id: "v1", term: "abandon", meaning: "見捨てる、放棄する", known: false },
  { id: "v2", term: "benefit", meaning: "利益、恩恵", known: true },
  { id: "v3", term: "consider", meaning: "よく考える、検討する", known: false },
  { id: "v4", term: "determine", meaning: "決定する、見極める", known: false },
  { id: "v5", term: "efficient", meaning: "効率的な、無駄のない", known: false },
  { id: "v6", term: "fundamental", meaning: "基本的な、根本的な", known: false },
  { id: "v7", term: "generate", meaning: "生み出す、発生させる", known: false },
  { id: "v8", term: "hesitate", meaning: "ためらう、躊躇する", known: false },
  { id: "v9", term: "influence", meaning: "影響、～に影響を与える", known: false },
  { id: "v10", term: "justify", meaning: "正当化する、弁明する", known: false },
  { id: "v11", term: "maintain", meaning: "維持する、主張する", known: false },
  { id: "v12", term: "obvious", meaning: "明らかな、明白な", known: true },
];

function genId() {
  return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function VocabView({ onBack }) {
  const [vocab, setVocab] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          return arr
            .filter((w) => w && typeof w.term === "string")
            .map((w) => ({
              id: w.id || genId(),
              term: w.term,
              meaning: typeof w.meaning === "string" ? w.meaning : "",
              known: !!w.known,
            }));
        }
      }
    } catch {
      /* ignore storage errors */
    }
    return SEED;
  });

  const [tab, setTab] = useState("list"); // "list" | "study"
  const [form, setForm] = useState({ term: "", meaning: "" });

  // 先生から届いた単語 (teacher-distributed, bridged from the legacy customVocabulary path).
  // Opening this view marks them seen, which clears the home's 単語配布 赤ぽっち.
  const [distWords, setDistWords] = useState([]);
  const [distPriorSeen, setDistPriorSeen] = useState(0);
  useEffect(() => {
    let active = true;
    setDistPriorSeen(getVocabSeenAt()); // captured BEFORE marking seen, to flag 新着
    loadDistributedVocab().then((ws) => {
      if (!active) return;
      if (Array.isArray(ws)) {
        setDistWords(ws);
        markVocabSeen(); // success (incl. empty) → the introduction is "seen"
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // study session: queue of ids still to master, plus the session size
  const [session, setSession] = useState({ queue: [], total: 0 });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(vocab));
    } catch {
      /* ignore storage errors */
    }
  }, [vocab]);

  const knownCount = vocab.filter((w) => w.known).length;
  const total = vocab.length;
  const masteredPct = total ? Math.round((knownCount / total) * 100) : 0;

  // ----- list actions -----
  function addWord() {
    const term = form.term.trim();
    const meaning = form.meaning.trim();
    if (!term) return;
    setVocab((prev) => [{ id: genId(), term, meaning, known: false }, ...prev]);
    setForm({ term: "", meaning: "" });
  }
  function toggleKnown(id) {
    setVocab((prev) => prev.map((w) => (w.id === id ? { ...w, known: !w.known } : w)));
  }
  function removeWord(id) {
    setVocab((prev) => prev.filter((w) => w.id !== id));
  }

  // ----- teacher-distributed words -> personal list (dedup by term, case-insensitive) -----
  function addDistWord(w) {
    const term = (w.en || "").trim();
    if (!term) return;
    setVocab((prev) =>
      prev.some((v) => v.term.trim().toLowerCase() === term.toLowerCase())
        ? prev
        : [{ id: genId(), term, meaning: (w.ja || "").trim(), known: false }, ...prev]
    );
  }
  function addAllDist() {
    setVocab((prev) => {
      const have = new Set(prev.map((v) => v.term.trim().toLowerCase()));
      const additions = [];
      distWords.forEach((w) => {
        const term = (w.en || "").trim();
        const key = term.toLowerCase();
        if (term && !have.has(key)) {
          have.add(key);
          additions.push({ id: genId(), term, meaning: (w.ja || "").trim(), known: false });
        }
      });
      return additions.length ? [...additions, ...prev] : prev;
    });
  }

  // ----- study session -----
  function startSession(useAll) {
    const pool = vocab.filter((w) => useAll || !w.known);
    setSession({ queue: pool.map((w) => w.id), total: pool.length });
    setRevealed(false);
  }
  function goStudy() {
    setTab("study");
    startSession(false);
  }
  function markKnown() {
    const id = session.queue[0];
    if (id == null) return;
    setVocab((prev) => prev.map((w) => (w.id === id ? { ...w, known: true } : w)));
    setSession((s) => ({ ...s, queue: s.queue.slice(1) }));
    setRevealed(false);
  }
  function markAgain() {
    setSession((s) =>
      s.queue.length ? { ...s, queue: [...s.queue.slice(1), s.queue[0]] } : s
    );
    setRevealed(false);
  }

  const current =
    tab === "study" && session.queue.length
      ? vocab.find((w) => w.id === session.queue[0])
      : null;
  const mastered = session.total - session.queue.length;
  const sessionPct = session.total ? Math.round((mastered / session.total) * 100) : 0;

  // distributed-words derived state (which are already in the personal list / which are 新着)
  const ownTerms = new Set(vocab.map((v) => v.term.trim().toLowerCase()));
  const newDistCount = distWords.reduce(
    (n, w) => ((Number(w.timestamp) || 0) > distPriorSeen ? n + 1 : n),
    0
  );
  const distHasUnadded = distWords.some(
    (w) => !ownTerms.has((w.en || "").trim().toLowerCase())
  );

  return (
    <div className="oxh-sub oxv-vc">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">単語帳</span>
      </div>

      <div className="oxv-body">
        {/* progress header */}
        <div className="oxv-vc-prog">
          <div className="oxv-vc-prog-top">
            <span className="oxv-vc-prog-label">習得</span>
            <span className="oxv-vc-prog-num">
              <b>{knownCount}</b>
              <i>/ {total}</i>
            </span>
          </div>
          <div className="oxv-vc-bar" role="presentation">
            <span className="oxv-vc-bar-fill" style={{ width: masteredPct + "%" }} />
          </div>
          <span className="oxv-vc-prog-sub">あと {Math.max(0, total - knownCount)} 単語</span>
        </div>

        {/* mode tabs */}
        <div className="oxv-vc-tabs" role="tablist" aria-label="表示モード">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "list"}
            className={"oxv-vc-tab" + (tab === "list" ? " is-on" : "")}
            onClick={() => setTab("list")}
          >
            リスト
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "study"}
            className={"oxv-vc-tab" + (tab === "study" ? " is-on" : "")}
            onClick={goStudy}
          >
            暗記モード
          </button>
        </div>

        {tab === "list" ? (
          <div className="oxv-vc-listwrap">
            {/* 先生から届いた単語 — teacher-distributed; 新着 are flagged with a red pip */}
            {distWords.length > 0 && (
              <div className="oxv-vc-dist">
                <div className="oxv-vc-dist-h">
                  <span className="oxv-vc-dist-title">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v16M8 8h7M8 12h5" />
                    </svg>
                    先生から届いた単語
                  </span>
                  {newDistCount > 0 ? (
                    <span className="oxv-vc-dist-new" aria-label={`新着${newDistCount}語`}>
                      新着 {newDistCount}
                    </span>
                  ) : (
                    <span className="oxv-vc-dist-count">{distWords.length}語</span>
                  )}
                </div>
                <ul className="oxv-vc-dist-list">
                  {distWords.map((w) => {
                    const term = (w.en || "").trim();
                    const added = ownTerms.has(term.toLowerCase());
                    const isNew = (Number(w.timestamp) || 0) > distPriorSeen;
                    return (
                      <li key={w.id} className={"oxv-vc-dist-row" + (isNew ? " is-new" : "")}>
                        <div className="oxv-vc-dist-text">
                          <span className="oxv-vc-dist-term">
                            {isNew && <i className="oxv-vc-dist-pip" aria-label="新着" />}
                            {term || "（単語なし）"}
                          </span>
                          <span className="oxv-vc-dist-mean">{(w.ja || "").trim() || "（意味なし）"}</span>
                        </div>
                        <button
                          type="button"
                          className={"oxv-vc-dist-add" + (added ? " is-added" : "")}
                          onClick={() => addDistWord(w)}
                          disabled={added}
                        >
                          {added ? "追加済み" : "追加"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {distHasUnadded && (
                  <button type="button" className="oxv-vc-dist-all" onClick={addAllDist}>
                    すべてリストに追加
                  </button>
                )}
              </div>
            )}

            {/* inline add form */}
            <div className="oxv-vc-add">
              <span className="oxv-vc-add-h">新規追加</span>
              <div className="oxv-vc-add-row">
                <input
                  className="oxv-vc-input"
                  placeholder="英単語"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addWord()}
                  aria-label="英単語"
                />
                <input
                  className="oxv-vc-input"
                  placeholder="意味"
                  value={form.meaning}
                  onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addWord()}
                  aria-label="意味"
                />
                <button
                  type="button"
                  className="oxv-vc-add-btn"
                  onClick={addWord}
                  disabled={!form.term.trim()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  追加
                </button>
              </div>
            </div>

            {vocab.length === 0 ? (
              <div className="oxv-vc-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v16M8 7h7M8 11h5" />
                </svg>
                <p>単語がまだありません。<br />上のフォームから登録しましょう。</p>
              </div>
            ) : (
              <ul className="oxv-vc-list">
                {vocab.map((w) => (
                  <li key={w.id} className={"oxv-vc-row" + (w.known ? " is-known" : "")}>
                    <div className="oxv-vc-row-text">
                      <span className="oxv-vc-row-term">{w.term}</span>
                      <span className="oxv-vc-row-mean">{w.meaning || "（意味なし）"}</span>
                    </div>
                    <button
                      type="button"
                      className={"oxv-vc-toggle" + (w.known ? " is-on" : "")}
                      onClick={() => toggleKnown(w.id)}
                      aria-pressed={w.known}
                    >
                      {w.known ? (
                        <>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          覚えた
                        </>
                      ) : (
                        "未習"
                      )}
                    </button>
                    <button
                      type="button"
                      className="oxv-vc-del"
                      onClick={() => removeWord(w.id)}
                      aria-label={w.term + " を削除"}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="oxv-vc-study">
            {current ? (
              <>
                <div className="oxv-vc-study-top">
                  <span className="oxv-vc-study-count">
                    <b>{Math.min(mastered + 1, session.total)}</b>
                    <i>/ {session.total}</i>
                  </span>
                  <span className="oxv-vc-study-remain">残り {session.queue.length} 枚</span>
                </div>
                <div className="oxv-vc-sbar" role="presentation">
                  <span className="oxv-vc-sbar-fill" style={{ width: sessionPct + "%" }} />
                </div>

                <div className="oxv-vc-stage">
                  <button
                    type="button"
                    className={"oxv-vc-card" + (revealed ? " is-flipped" : "")}
                    onClick={() => setRevealed((r) => !r)}
                    aria-label="カードをめくる"
                  >
                    <span className="oxv-vc-face oxv-vc-front">
                      <span className="oxv-vc-card-term">{current.term}</span>
                      <span className="oxv-vc-card-hint">タップして意味を表示</span>
                    </span>
                    <span className="oxv-vc-face oxv-vc-back">
                      <span className="oxv-vc-card-mean">{current.meaning || "（意味なし）"}</span>
                      <span className="oxv-vc-card-termsm">{current.term}</span>
                    </span>
                  </button>
                </div>

                <div className="oxv-vc-actions">
                  <button
                    type="button"
                    className="oxv-vc-act is-again"
                    onClick={markAgain}
                    disabled={!revealed}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    もう一度
                  </button>
                  <button
                    type="button"
                    className="oxv-vc-act is-known"
                    onClick={markKnown}
                    disabled={!revealed}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    覚えた
                  </button>
                </div>
                {!revealed && <span className="oxv-vc-tip">意味を確認してから判定できます</span>}
              </>
            ) : (
              <div className="oxv-vc-done">
                <div className="oxv-vc-done-badge">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="oxv-vc-done-h">
                  {total === 0
                    ? "単語がありません"
                    : session.total === 0
                    ? "すべて覚えています"
                    : "全部覚えました"}
                </span>
                <span className="oxv-vc-done-sub">
                  {total === 0
                    ? "リストから単語を追加しましょう。"
                    : `習得 ${knownCount}/${total} 単語`}
                </span>
                <div className="oxv-vc-done-actions">
                  <button type="button" className="oxv-vc-done-btn is-ghost" onClick={() => setTab("list")}>
                    リストを見る
                  </button>
                  <button
                    type="button"
                    className="oxv-vc-done-btn is-fill"
                    onClick={() => startSession(true)}
                    disabled={total === 0}
                  >
                    全部もう一度
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
