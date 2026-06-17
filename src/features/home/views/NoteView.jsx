import "./note.css";
import { useState, useEffect } from "react";

const SUBJECTS = ["数学", "英語", "化学", "自由"];

/* subject -> accent color + translucent tint (token-aligned) */
const SUB = {
  "数学": { c: "#3f8dff", bg: "rgba(63,141,255,.16)" },
  "英語": { c: "#ff5567", bg: "rgba(232,39,60,.16)" },
  "化学": { c: "#2bd47e", bg: "rgba(43,212,126,.16)" },
  "自由": { c: "#ffd36e", bg: "rgba(255,211,110,.16)" },
};
const tone = (s) => SUB[s] || SUB["自由"];

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
}

function genId() {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const SEED = [
  {
    id: "seed-1",
    subject: "数学",
    title: "二次関数の頂点の求め方",
    body: "平方完成して y=a(x-p)²+q の形にすると、頂点は (p, q)。係数 a の符号で上凸・下凸が決まる。最大最小はここから判断する。",
    date: "2026.06.15",
  },
  {
    id: "seed-2",
    subject: "英語",
    title: "関係代名詞 which / that の使い分け",
    body: "先行詞が「人＋もの」や最上級・序数を含むときは that が好まれる。非制限用法（コンマつき）では that は使えない点に注意。",
    date: "2026.06.12",
  },
  {
    id: "seed-3",
    subject: "化学",
    title: "モル計算でつまずかないコツ",
    body: "物質量[mol] = 質量[g] ÷ モル質量[g/mol]。気体なら 標準状態で 22.4L/mol。単位を必ず書いて約分する習慣をつける。",
    date: "2026.06.09",
  },
];

export default function NoteView({ onBack }) {
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem("oxhNotes");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch {
      /* ignore storage errors */
    }
    return SEED;
  });

  // draft === null -> editor closed; otherwise { id, subject, title, body }
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("oxhNotes", JSON.stringify(notes));
    } catch {
      /* ignore storage errors */
    }
  }, [notes]);

  function openNew() {
    setDraft({ id: null, subject: "数学", title: "", body: "" });
  }

  function openEdit(n) {
    setDraft({ id: n.id, subject: n.subject, title: n.title, body: n.body });
  }

  function save() {
    if (!draft) return;
    const title = (draft.title || "").trim() || "無題のノート";
    const body = (draft.body || "").trim();
    const subject = draft.subject || "自由";
    if (draft.id) {
      setNotes((prev) =>
        prev.map((n) => (n.id === draft.id ? { ...n, title, body, subject } : n))
      );
    } else {
      const note = { id: genId(), subject, title, body, date: today() };
      setNotes((prev) => [note, ...prev]);
    }
    setDraft(null);
  }

  function remove() {
    if (!draft || !draft.id) return;
    setNotes((prev) => prev.filter((n) => n.id !== draft.id));
    setDraft(null);
  }

  return (
    <div className="oxh-sub oxv-nt">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">ノート</span>
      </div>

      <div className="oxv-body">
        <div className="oxv-nt-head">
          <div className="oxv-nt-headtext">
            <span className="oxv-nt-h">マイノート</span>
            <span className="oxv-nt-count">{notes.length}件のノート</span>
          </div>
          <button className="oxv-nt-new" onClick={openNew} type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新規ノート
          </button>
        </div>

        {draft && (
          <div className="oxv-nt-editor">
            <div className="oxv-nt-edhead">
              <span className="oxv-nt-edtitle">
                {draft.id ? "ノートを編集" : "新しいノート"}
              </span>
            </div>

            <div className="oxv-nt-ed-subs">
              {SUBJECTS.map((s) => {
                const on = draft.subject === s;
                const t = tone(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={"oxv-nt-sub" + (on ? " is-on" : "")}
                    style={on ? { color: t.c, borderColor: t.c, background: t.bg } : undefined}
                    onClick={() => setDraft({ ...draft, subject: s })}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <input
              className="oxv-nt-input"
              placeholder="タイトル"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <textarea
              className="oxv-nt-area"
              placeholder="本文を入力..."
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />

            <div className="oxv-nt-ed-actions">
              {draft.id && (
                <button className="oxv-nt-btn is-del" type="button" onClick={remove}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  削除
                </button>
              )}
              <button className="oxv-nt-btn is-ghost" type="button" onClick={() => setDraft(null)}>
                キャンセル
              </button>
              <button className="oxv-nt-btn is-save" type="button" onClick={save}>
                保存
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 && !draft ? (
          <div className="oxv-nt-empty">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM15 3v5h5M9 13h6M9 17h4" />
            </svg>
            <p>まだノートがありません。<br />「新規ノート」から作成しましょう。</p>
          </div>
        ) : (
          <div className="oxv-nt-list">
            {notes.map((n) => {
              const t = tone(n.subject);
              const active = draft && draft.id === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={"oxv-nt-card" + (active ? " is-active" : "")}
                  onClick={() => openEdit(n)}
                >
                  <span className="oxv-nt-bar" style={{ background: t.c }} />
                  <span className="oxv-nt-main">
                    <span className="oxv-nt-top">
                      <span className="oxv-nt-tag" style={{ color: t.c, background: t.bg }}>
                        {n.subject}
                      </span>
                      <span className="oxv-nt-date">{n.date}</span>
                    </span>
                    <span className="oxv-nt-title">{n.title}</span>
                    {n.body ? <span className="oxv-nt-snip">{n.body}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
