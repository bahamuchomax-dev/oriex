import "./qa.css";
import { useState } from "react";

/* ============================================================
 * Qa — 質問箱 (LABO ask-the-teacher Q&A)
 * ------------------------------------------------------------
 * A compose card (single-select 科目 chips + textarea + primary
 * "先生に質問する" button) over a newest-first thread list. Submitting
 * non-empty text PREPENDs a {id, subject, q, status:"pending", date}
 * thread to the user list and persists it to localStorage "oxhLaboQa";
 * user threads sit above two seeded, already-answered juku questions.
 * Answered threads show a distinct teacher reply block (round avatar
 * with the teacher's initial + name + indented answer).
 *
 * Renders ONLY its own body — the parent supplies the back button /
 * title bar. Top-level node is .oxv-qa and EVERY selector in qa.css is
 * prefixed .oxv-qa (zero global collisions); tokens (--ink/--muted/
 * --good/--glass/--line/...) cascade from the .oxh ancestor.
 * ============================================================ */

const STORE_KEY = "oxhLaboQa";

// --- subject palette (shared across every LABO feature) --------------------
const SUBJECTS = [
  { key: "数学", color: "#3f8dff" },
  { key: "英語", color: "#e8273c" },
  { key: "国語", color: "#9a6bff" },
  { key: "理科", color: "#2bd47e" },
  { key: "社会", color: "#ffb020" },
  { key: "その他", color: "#36c5d6" },
];
const SUBJECT_COLOR = SUBJECTS.reduce((m, s) => {
  m[s.key] = s.color;
  return m;
}, {});

// translucent fill from a #rrggbb token (deterministic, no color-mix dep)
function hexA(hex, a) {
  const h = (hex || "#9aa3bd").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// --- seed threads (deterministic; dates relative to "now") -----------------
const DAY = 86400000;
const SEED = [
  {
    id: "seed-math-quad",
    subject: "数学",
    q: "二次関数 y = x² - 4x + 3 の頂点がうまく求められません。平方完成のやり方を順番に教えてください。",
    status: "answered",
    teacher: "田中先生",
    a: "x² - 4x の部分に注目しよう。-4 の半分の 2 を使って (x - 2)² - 4 に直し、もとの +3 を足すと y = (x - 2)² - 1 になります。よって頂点は (2, -1)。下に凸のグラフなので、この点が最小値です。慣れるまでは「x の係数の半分を2乗」を口に出して練習しよう。",
    date: new Date(Date.now() - 2 * DAY),
  },
  {
    id: "seed-eng-rel",
    subject: "英語",
    q: "関係代名詞の that と which の使い分けがあいまいです。どちらを選べばいいか基準を知りたいです。",
    status: "answered",
    teacher: "佐藤先生",
    a: "先行詞が「物」のときは基本どちらも使えます。ただしコンマ付きの非制限用法（,which …）では which のみ。逆に先行詞に the only・all・最上級が付くときは that が好まれます。迷ったら制限用法では that を選んでおけば大きな失点はありません。",
    date: new Date(Date.now() - 5 * DAY),
  },
];

// --- inline svg icons (no emoji) -------------------------------------------
const IcChat = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8 10h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcSend = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12l14-7-5.5 14-2.5-5.5L5 12z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M11 13l3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcCheck = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcClock = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v4.2l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcInbox = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 13l2.4-7A2 2 0 0 1 8.3 4.6h7.4A2 2 0 0 1 17.6 6L20 13v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M4 13h4a2 2 0 0 1 4 0 2 2 0 0 1 4 0h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- persistence (own key; every access in try/catch) ----------------------
function readThreads() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* ignore */ }
  return [];
}

function fmtDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Qa() {
  const [userThreads, setUserThreads] = useState(readThreads);
  const [subject, setSubject] = useState("数学");
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const threads = [...userThreads, ...SEED];

  const submit = () => {
    const q = text.trim();
    if (!q) return;
    const next = [
      { id: `q-${Date.now()}`, subject, q, status: "pending", date: new Date() },
      ...userThreads,
    ];
    setUserThreads(next);
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setText("");
  };

  return (
    <div className="oxv-qa">
      {/* compose -------------------------------------------------------- */}
      <div className="oxv-qa-compose">
        <div className="oxv-qa-chead">
          {IcChat}
          <span>質問する</span>
          <small>わからないところを先生に聞いてみよう</small>
        </div>

        <div className="oxv-qa-chips" role="radiogroup" aria-label="科目">
          {SUBJECTS.map((s) => {
            const on = subject === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={on}
                className={`oxv-qa-chip${on ? " oxv-qa-chip-on" : ""}`}
                style={on ? { color: s.color, borderColor: s.color, background: hexA(s.color, 0.14) } : undefined}
                onClick={() => setSubject(s.key)}
              >
                <i className="oxv-qa-chip-dot" style={{ background: s.color }} />
                {s.key}
              </button>
            );
          })}
        </div>

        <textarea
          className="oxv-qa-ta"
          placeholder="質問を入力…"
          value={text}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          type="button"
          className="oxv-qa-send"
          onClick={submit}
          disabled={!trimmed}
        >
          {IcSend}
          <span>先生に質問する</span>
        </button>
      </div>

      {/* history -------------------------------------------------------- */}
      <div className="oxv-qa-h">
        {IcInbox}
        <span>質問の履歴</span>
        <small>{threads.length}件</small>
      </div>

      <div className="oxv-qa-list">
        {threads.map((t) => {
          const color = SUBJECT_COLOR[t.subject] || "#9aa3bd";
          const answered = t.status === "answered";
          const isSeed = String(t.id || "").startsWith("seed-");
          return (
            <div className="oxv-qa-card" key={t.id}>
              <div className="oxv-qa-top">
                <span
                  className="oxv-qa-tag"
                  style={{ color, background: hexA(color, 0.16), borderColor: hexA(color, 0.5) }}
                >
                  <i className="oxv-qa-tag-dot" style={{ background: color }} />
                  {t.subject}
                </span>
                {isSeed && <span className="oxv-qa-demo">例</span>}
                <span className="oxv-qa-date">{fmtDate(t.date)}</span>
                <span className={`oxv-qa-badge${answered ? " oxv-qa-badge-ok" : ""}`}>
                  {answered ? IcCheck : IcClock}
                  {answered ? "回答済み" : "回答待ち"}
                </span>
              </div>

              <p className="oxv-qa-q">
                <i className="oxv-qa-q-mark">Q</i>
                {t.q}
              </p>

              {answered ? (
                <div className="oxv-qa-reply">
                  <span
                    className="oxv-qa-av"
                    style={{ background: `radial-gradient(circle at 32% 28%, ${hexA(color, 0.9)}, ${color} 72%)` }}
                  >
                    {t.teacher.slice(0, 1)}
                  </span>
                  <div className="oxv-qa-reply-body">
                    <span className="oxv-qa-teacher">{t.teacher}</span>
                    <p className="oxv-qa-a">{t.a}</p>
                  </div>
                </div>
              ) : (
                <p className="oxv-qa-wait">
                  {IcClock}
                  先生が確認しています。回答までしばらくお待ちください。
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
