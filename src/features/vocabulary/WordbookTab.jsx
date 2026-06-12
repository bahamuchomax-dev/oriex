import { useEffect, useMemo, useState } from "react";
import { WORDBOOK } from "./vocabData.js";
import { normalizeList, hasWord, toReviewItem, newId } from "./vocabUtils.js";
import { loadReview, saveReview } from "./localReviewStore.js";
import { loadUserVocab, saveUserVocab } from "./localUserVocabStore.js";
import {
  loadCustomVocabulary,
  loadCustomSeen,
  markCustomSeen,
  unmarkCustomSeen,
} from "./customVocabularyApi.js";

const wkey = (w) => (w || "").trim().toLowerCase();

// 単語帳 tab.
// Data priority: customVocabulary (Firestore, read-only) -> WORDBOOK -> empty.
// Firestore is read ONLY when this tab mounts (never at login), and we never
// write to customVocabulary or any seenBy field. Seen state lives in customSeen.
export default function WordbookTab({ uid }) {
  const fallback = useMemo(() => normalizeList(WORDBOOK), []);
  const [customWords, setCustomWords] = useState([]);
  const [seen, setSeen] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [addedReview, setAddedReview] = useState(() => new Set());
  const [addedMine, setAddedMine] = useState(() => new Set());
  const [flash, setFlash] = useState(null);

  // Read customVocabulary + my customSeen when the tab opens.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [words, seenSet] = await Promise.all([
          loadCustomVocabulary(),
          loadCustomSeen(uid),
        ]);
        if (!active) return;
        setCustomWords(normalizeList(words));
        setSeen(seenSet);
      } catch (e) {
        console.error("loadCustomVocabulary failed", e);
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [uid]);

  const usingCustom = customWords.length > 0;
  const all = usingCustom ? customWords : fallback;

  // Pre-mark which words are already in review / mywords (by word text).
  useEffect(() => {
    const review = normalizeList(loadReview(uid));
    const mine = normalizeList(loadUserVocab(uid));
    const r = new Set(), m = new Set();
    all.forEach((w) => {
      if (hasWord(review, w.word)) r.add(wkey(w.word));
      if (hasWord(mine, w.word)) m.add(wkey(w.word));
    });
    setAddedReview(r);
    setAddedMine(m);
  }, [uid, all]);

  const subjects = useMemo(
    () => ["all", ...new Set(all.map((w) => w.subject).filter(Boolean))],
    [all]
  );

  const shown = all.filter((w) => {
    if (subject !== "all" && w.subject !== subject) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (w.word + " " + w.meaning + " " + (w.note || "")).toLowerCase().includes(q);
  });

  function addToReview(w) {
    const review = normalizeList(loadReview(uid));
    if (!hasWord(review, w.word)) saveReview(uid, [toReviewItem(w), ...review]);
    setAddedReview((s) => new Set(s).add(wkey(w.word)));
    setFlash("復習に追加しました");
  }

  function addToMine(w) {
    const mine = normalizeList(loadUserVocab(uid));
    if (!hasWord(mine, w.word)) {
      const now = new Date().toISOString();
      saveUserVocab(uid, [
        { id: newId(), word: w.word, meaning: w.meaning, note: w.note, example: w.example, addedAt: now, updatedAt: now },
        ...mine,
      ]);
    }
    setAddedMine((s) => new Set(s).add(wkey(w.word)));
    setFlash("マイワードに追加しました");
  }

  async function toggleSeen(w) {
    if (!uid || !usingCustom) return;
    const isSeen = seen.has(w.id);
    // optimistic update
    setSeen((prev) => {
      const next = new Set(prev);
      isSeen ? next.delete(w.id) : next.add(w.id);
      return next;
    });
    try {
      if (isSeen) await unmarkCustomSeen(uid, w.id);
      else await markCustomSeen(uid, w);
    } catch (e) {
      console.error("toggleSeen failed", e);
      // revert
      setSeen((prev) => {
        const next = new Set(prev);
        isSeen ? next.add(w.id) : next.delete(w.id);
        return next;
      });
      setFlash("既読の更新に失敗しました");
    }
  }

  if (loading) {
    return <div className="ox-empty"><p>読み込み中…</p></div>;
  }
  if (error) {
    return (
      <div className="ox-empty">
        <div className="ox-empty-icon">⚠️</div>
        <p>単語データの読み込みに失敗しました。</p>
        <p className="ox-empty-sub">通信状態を確認して、もう一度お試しください。</p>
      </div>
    );
  }
  if (all.length === 0) {
    return (
      <div className="ox-empty">
        <div className="ox-empty-icon">📚</div>
        <p>単語帳のデータはまだありません。</p>
        <p className="ox-empty-sub">
          共有単語が登録されると、ここに表示されます。
          それまでは「マイワード」で自分の単語を登録できます。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="vocab-toolbar">
        <input className="vocab-search" placeholder="検索（単語・意味）" value={search} onChange={(e) => setSearch(e.target.value)} />
        {subjects.length > 1 && (
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map((s) => <option key={s} value={s}>{s === "all" ? "すべての教科" : s}</option>)}
          </select>
        )}
      </div>
      {flash && <div className="vocab-flash">{flash}</div>}

      {shown.length === 0 ? (
        <div className="ox-empty"><p>該当する単語がありません。</p></div>
      ) : (
        <ul className="ox-card-list">
          {shown.map((w) => {
            const isSeen = usingCustom && seen.has(w.id);
            return (
              <li key={w.id} className="ox-card vocab-card">
                <div className="vocab-card-head">
                  <span className="vocab-word">{w.word}</span>
                  {w.pos && <span className="vocab-tag">{w.pos}</span>}
                  {w.subject && <span className="vocab-tag">{w.subject}</span>}
                  {usingCustom && (
                    <span className={"vocab-status " + (isSeen ? "known" : "learning")}>
                      {isSeen ? "既読" : "未読"}
                    </span>
                  )}
                </div>
                {w.meaning && <div className="vocab-meaning">{w.meaning}</div>}
                {w.note && <div className="vocab-note">{w.note}</div>}
                {w.example && <div className="vocab-example">{w.example}</div>}
                {w.authorName && <div className="vocab-meta">作成者: {w.authorName}</div>}
                <div className="vocab-actions">
                  <button className="ox-button-primary" disabled={addedReview.has(wkey(w.word))} onClick={() => addToReview(w)}>
                    {addedReview.has(wkey(w.word)) ? "復習に追加済み" : "復習に追加"}
                  </button>
                  <button className="ox-button-soft" disabled={addedMine.has(wkey(w.word))} onClick={() => addToMine(w)}>
                    {addedMine.has(wkey(w.word)) ? "マイワード済み" : "マイワードに追加"}
                  </button>
                  {usingCustom && uid && (
                    <button className="ox-button-soft" onClick={() => toggleSeen(w)}>
                      {isSeen ? "未読に戻す" : "既読にする"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
