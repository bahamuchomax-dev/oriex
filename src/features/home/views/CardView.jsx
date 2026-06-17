import "./card.css";
import { useState, useEffect } from "react";

/* ============================================================
 * CardView — 暗記カード (flashcard decks)
 * Self-contained: demo decks seeded inline, per-deck mastery
 * (latest run's 正答数) persisted under localStorage "oxhCards".
 * No backend, no shared store. Every storage access is guarded.
 * ============================================================ */

const STORE_KEY = "oxhCards";

/* accent palette aligned with the global tokens (--red/--blue/--gold/--good) */
const ACCENTS = {
  red: "#e8273c",
  blue: "#3f8dff",
  gold: "#ffd36e",
  good: "#2bd47e",
};
const tint = {
  red: "rgba(232,39,60,.16)",
  blue: "rgba(63,141,255,.16)",
  gold: "rgba(255,211,110,.16)",
  good: "rgba(43,212,126,.16)",
};

/* ---- demo decks ------------------------------------------------------- */
const DECKS = [
  {
    id: "history",
    title: "歴史年号",
    sub: "日本史の重要年号",
    accent: "red",
    icon: "history",
    cards: [
      { q: "平安京に都を移した年は？", a: "794年（鳴くよウグイス平安京）" },
      { q: "鎌倉幕府が成立した年は？", a: "1192年（いい国つくろう）" },
      { q: "鉄砲が種子島に伝来した年は？", a: "1543年" },
      { q: "応仁の乱が始まった年は？", a: "1467年" },
      { q: "関ヶ原の戦いが起きた年は？", a: "1600年" },
      { q: "江戸幕府が開かれた年は？", a: "1603年" },
      { q: "明治維新が始まった年は？", a: "1868年" },
    ],
  },
  {
    id: "chem",
    title: "化学式",
    sub: "物質名から化学式へ",
    accent: "blue",
    icon: "flask",
    cards: [
      { q: "水の化学式は？", a: "H₂O" },
      { q: "二酸化炭素の化学式は？", a: "CO₂" },
      { q: "塩化ナトリウムの化学式は？", a: "NaCl" },
      { q: "アンモニアの化学式は？", a: "NH₃" },
      { q: "硫酸の化学式は？", a: "H₂SO₄" },
      { q: "メタンの化学式は？", a: "CH₄" },
      { q: "炭酸カルシウムの化学式は？", a: "CaCO₃" },
    ],
  },
  {
    id: "idioms",
    title: "英熟語",
    sub: "頻出イディオム",
    accent: "gold",
    icon: "speech",
    cards: [
      { q: "look forward to ~", a: "～を楽しみに待つ" },
      { q: "give up", a: "あきらめる" },
      { q: "put off ~", a: "～を延期する" },
      { q: "take care of ~", a: "～の世話をする" },
      { q: "come up with ~", a: "～を思いつく" },
      { q: "get along with ~", a: "～と仲良くやる" },
    ],
  },
  {
    id: "classic",
    title: "古文単語",
    sub: "頻出の古語",
    accent: "good",
    icon: "scroll",
    cards: [
      { q: "あはれ", a: "しみじみとした趣・感動" },
      { q: "をかし", a: "趣がある・興味深い" },
      { q: "ありがたし", a: "めったにない・珍しい" },
      { q: "うつくし", a: "かわいらしい・いとしい" },
      { q: "やうやう", a: "だんだん・しだいに" },
      { q: "つとめて", a: "早朝・翌朝" },
    ],
  },
];

/* a couple of decks start with prior progress so the picker is alive on first open */
const SEED_PROGRESS = { history: 5, idioms: 3 };

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object" && !Array.isArray(o)) return o;
    }
  } catch {
    /* storage unavailable / corrupt — fall back to seed */
  }
  return { ...SEED_PROGRESS };
}

function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* non-fatal */
  }
}

/* ---- inline icons ----------------------------------------------------- */
function DeckIcon({ name }) {
  switch (name) {
    case "flask":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6M10 3v6.2L5.4 18a2 2 0 0 0 1.8 3h9.6a2 2 0 0 0 1.8-3L14 9.2V3" />
          <path d="M7.3 14h9.4" />
        </svg>
      );
    case "speech":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case "scroll":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "history":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
  }
}

/* ---- progress ring ---------------------------------------------------- */
function Ring({ pct, color, size = 48, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct || 0));
  const off = c * (1 - clamped);
  const mid = size / 2;
  return (
    <svg className="oxv-cd-ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle className="oxv-cd-ring-track" cx={mid} cy={mid} r={r} strokeWidth={stroke} fill="none" />
      <circle
        className="oxv-cd-ring-val"
        cx={mid}
        cy={mid}
        r={r}
        strokeWidth={stroke}
        fill="none"
        style={{ stroke: color }}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${mid} ${mid})`}
      />
    </svg>
  );
}

export default function CardView({ onBack }) {
  const [progress, setProgress] = useState(loadProgress);
  const [activeId, setActiveId] = useState(null); // null -> deck picker
  const [idx, setIdx] = useState(0); // index of current card in the run
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0); // 正答数 this run
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const deck = activeId ? DECKS.find((d) => d.id === activeId) : null;
  const accent = deck ? ACCENTS[deck.accent] : ACCENTS.blue;

  const totalMastered = DECKS.reduce((a, d) => a + Math.min(progress[d.id] || 0, d.cards.length), 0);

  function openDeck(id) {
    setActiveId(id);
    setIdx(0);
    setFlipped(false);
    setKnown(0);
    setFinished(false);
  }

  function backToList() {
    setActiveId(null);
  }

  function flip() {
    setFlipped((f) => !f);
  }

  function judge(ok) {
    if (!deck) return;
    const total = deck.cards.length;
    const nextKnown = known + (ok ? 1 : 0);
    if (idx + 1 >= total) {
      setKnown(nextKnown);
      setFinished(true);
      setProgress((p) => ({ ...p, [deck.id]: nextKnown }));
    } else {
      setKnown(nextKnown);
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  function restart() {
    setIdx(0);
    setFlipped(false);
    setKnown(0);
    setFinished(false);
  }

  /* ---- deck picker ---------------------------------------------------- */
  function renderPicker() {
    return (
      <div className="oxv-cd-wrap">
        <div className="oxv-cd-intro">
          <span className="oxv-cd-intro-h">デッキを選んで暗記</span>
          <span className="oxv-cd-intro-sub">
            {DECKS.length}個のデッキ・合計{totalMastered}枚を習得
          </span>
        </div>

        <div className="oxv-cd-decks">
          {DECKS.map((d) => {
            const total = d.cards.length;
            const done = Math.min(progress[d.id] || 0, total);
            const pct = done / total;
            const col = ACCENTS[d.accent];
            return (
              <button key={d.id} type="button" className="oxv-cd-deck" onClick={() => openDeck(d.id)}>
                <span className="oxv-cd-deck-ico" style={{ color: col, background: tint[d.accent] }}>
                  <DeckIcon name={d.icon} />
                </span>
                <span className="oxv-cd-deck-info">
                  <span className="oxv-cd-deck-title">{d.title}</span>
                  <span className="oxv-cd-deck-sub">{d.sub}</span>
                  <span className="oxv-cd-deck-meta">
                    <span>{total}枚</span>
                    <span className="oxv-cd-dot" aria-hidden="true" />
                    <span>{done > 0 ? `${done}枚 習得` : "未学習"}</span>
                  </span>
                </span>
                <span className="oxv-cd-ringwrap">
                  <Ring pct={pct} color={col} />
                  <span className="oxv-cd-ringpct" style={{ color: col }}>
                    {Math.round(pct * 100)}
                    <i>%</i>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---- in-deck study run ---------------------------------------------- */
  function renderRun() {
    const total = deck.cards.length;
    const card = deck.cards[idx];
    const fillPct = Math.round((idx / total) * 100);
    return (
      <div className="oxv-cd-run" style={{ "--acc": accent }}>
        <div className="oxv-cd-runhead">
          <button type="button" className="oxv-cd-tolist" onClick={backToList}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            一覧へ
          </button>
          <span className="oxv-cd-runtitle">{deck.title}</span>
        </div>

        <div className="oxv-cd-prog">
          <div className="oxv-cd-prog-row">
            <span className="oxv-cd-prog-count">
              {idx + 1} <i>/ {total}</i>
            </span>
            <span className="oxv-cd-prog-known">正答 {known}</span>
          </div>
          <div className="oxv-cd-prog-bar">
            <span className="oxv-cd-prog-fill" style={{ width: `${fillPct}%` }} />
          </div>
        </div>

        <div className="oxv-cd-stage" key={idx}>
          <button
            type="button"
            className={"oxv-cd-flip" + (flipped ? " is-flipped" : "")}
            onClick={flip}
            aria-pressed={flipped}
            aria-label={flipped ? "問題に戻る" : "答えを見る"}
          >
            <span className="oxv-cd-face oxv-cd-front">
              <span className="oxv-cd-tag">問題</span>
              <span className="oxv-cd-q">{card.q}</span>
              <span className="oxv-cd-hint">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v9m0 0l-3.2-3.2M12 13l3.2-3.2M6 18h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                タップして答えを見る
              </span>
            </span>
            <span className="oxv-cd-face oxv-cd-back">
              <span className="oxv-cd-tag">答え</span>
              <span className="oxv-cd-a">{card.a}</span>
              <span className="oxv-cd-hint">タップで問題に戻る</span>
            </span>
          </button>
        </div>

        <div className="oxv-cd-actions">
          <button
            type="button"
            className="oxv-cd-judge is-later"
            onClick={() => judge(false)}
            aria-label="あとで復習する"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 8v4.5l3 1.8" />
            </svg>
            あとで
          </button>
          <button
            type="button"
            className="oxv-cd-judge is-known"
            onClick={() => judge(true)}
            disabled={!flipped}
            aria-label="この問題はわかった"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            わかった
          </button>
        </div>
        {!flipped && <p className="oxv-cd-nudge">答えを確認すると「わかった」を押せます</p>}
      </div>
    );
  }

  /* ---- completion summary --------------------------------------------- */
  function renderDone() {
    const total = deck.cards.length;
    const pct = total ? known / total : 0;
    const perfect = known === total;
    return (
      <div className="oxv-cd-done" style={{ "--acc": accent }}>
        <div className="oxv-cd-done-card">
          <div className="oxv-cd-done-ringwrap">
            <Ring pct={pct} color={accent} size={132} stroke={11} />
            <div className="oxv-cd-done-score">
              <span className="oxv-cd-done-num">
                {known}
                <i>/{total}</i>
              </span>
              <span className="oxv-cd-done-pct">{Math.round(pct * 100)}%</span>
            </div>
          </div>
          <span className="oxv-cd-done-title">{perfect ? "全問クリア" : "おつかれさま"}</span>
          <span className="oxv-cd-done-sub">
            {deck.title}を{total}枚学習し、{known}枚を「わかった」にしました。
          </span>

          <div className="oxv-cd-done-actions">
            <button type="button" className="oxv-cd-done-btn is-ghost" onClick={backToList}>
              デッキ一覧
            </button>
            <button type="button" className="oxv-cd-done-btn is-primary" onClick={restart}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12a8 8 0 1 1 2.6 5.9M4 12V7m0 5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              もう一度
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oxh-sub oxv-cd">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">暗記カード</span>
      </div>

      <div className="oxv-body">
        {!deck ? renderPicker() : finished ? renderDone() : renderRun()}
      </div>
    </div>
  );
}
