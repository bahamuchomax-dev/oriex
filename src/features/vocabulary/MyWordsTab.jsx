import { useEffect, useState } from "react";
import { loadUserVocab, saveUserVocab } from "./localUserVocabStore.js";
import { loadReview, saveReview } from "./localReviewStore.js";
import { normalizeList, newId, hasWord, toReviewItem } from "./vocabUtils.js";

// マイワード tab. Personal word list in localStorage (loadUserVocab/saveUserVocab).
// No Firestore. Saves only on explicit add/edit/delete/add-to-review actions.
export default function MyWordsTab({ uid }) {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => { setItems(normalizeList(loadUserVocab(uid))); }, [uid]);

  function persist(next) {
    setItems(next);
    saveUserVocab(uid, next);
  }

  function addWord(form) {
    if (!form.word.trim()) return false;
    if (hasWord(items, form.word)) { setFlash("すでに登録されています"); return false; }
    const now = new Date().toISOString();
    persist([
      { id: newId(), word: form.word.trim(), meaning: form.meaning.trim(), note: form.note.trim(), example: form.example.trim(), addedAt: now, updatedAt: now },
      ...items,
    ]);
    setFlash("追加しました");
    return true;
  }

  function saveEdit(id, form) {
    persist(items.map((it) => it.id === id
      ? { ...it, ...form, updatedAt: new Date().toISOString() }
      : it));
    setEditingId(null);
  }

  function remove(id) {
    const it = items.find((x) => x.id === id);
    if (!window.confirm(`「${it?.word || "この単語"}」を削除しますか？`)) return;
    persist(items.filter((x) => x.id !== id));
  }

  function addToReview(it) {
    const review = normalizeList(loadReview(uid));
    if (hasWord(review, it.word)) { setFlash("すでに復習リストにあります"); return; }
    saveReview(uid, [toReviewItem(it), ...review]);
    setFlash("復習に追加しました");
  }

  return (
    <div className="vocab-tab-surface">
      <div className="factory-mini-hero">
        <div>
          <span className="section-chip">Factory</span>
          <h3>マイワードを作る</h3>
          <p>自分の単語を作って、必要なものだけ復習へ送れます。</p>
        </div>
        <span className="vocab-count">{items.length}語</span>
      </div>

      <AddForm onAdd={addWord} />
      {flash && <div className="vocab-flash">{flash}</div>}

      {items.length === 0 ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">📒</div>
          <p>マイワードはまだ空です。</p>
          <p className="ox-empty-sub">上のフォームから自分だけの単語を追加できます。</p>
        </div>
      ) : (
        <ul className="ox-card-list">
          {items.map((it) =>
            editingId === it.id ? (
              <li key={it.id} className="ox-card vocab-card">
                <EditForm item={it} onSave={(f) => saveEdit(it.id, f)} onCancel={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={it.id} className="ox-card vocab-card">
                <div className="vocab-card-head">
                  <span className="vocab-word">{it.word}</span>
                </div>
                {it.meaning && <div className="vocab-meaning">{it.meaning}</div>}
                {it.note && <div className="vocab-note">{it.note}</div>}
                {it.example && <div className="vocab-example">{it.example}</div>}
                <div className="vocab-actions">
                  <button className="ox-button-soft" onClick={() => addToReview(it)}>復習に追加</button>
                  <button className="ox-button-soft" onClick={() => setEditingId(it.id)}>編集</button>
                  <button className="ox-button-danger" onClick={() => remove(it.id)}>削除</button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function AddForm({ onAdd }) {
  const empty = { word: "", meaning: "", note: "", example: "" };
  const [form, setForm] = useState(empty);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="ox-card vocab-add factory-add-card">
      <div className="factory-step-label">自分の単語を作る</div>
      <div className="vocab-add-grid">
        <input placeholder="英単語" value={form.word} onChange={set("word")} />
        <input placeholder="日本語訳" value={form.meaning} onChange={set("meaning")} />
        <input placeholder="メモ（任意）" value={form.note} onChange={set("note")} />
        <input placeholder="例文（任意）" value={form.example} onChange={set("example")} />
      </div>
      <button
        className="ox-button-primary"
        disabled={!form.word.trim()}
        onClick={() => { if (onAdd(form)) setForm(empty); }}
      >
        マイワードに追加
      </button>
    </div>
  );
}

function EditForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    word: item.word, meaning: item.meaning, note: item.note, example: item.example,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      <div className="vocab-add-grid">
        <input placeholder="英単語" value={form.word} onChange={set("word")} />
        <input placeholder="日本語訳" value={form.meaning} onChange={set("meaning")} />
        <input placeholder="メモ" value={form.note} onChange={set("note")} />
        <input placeholder="例文" value={form.example} onChange={set("example")} />
      </div>
      <div className="vocab-actions">
        <button className="ox-button-primary" disabled={!form.word.trim()} onClick={() => onSave(form)}>保存</button>
        <button className="ox-button-soft" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}
