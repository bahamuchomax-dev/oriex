import "./homework.css";
import { useState } from "react";

/* ============================================================
 * Homework — 宿題 (LABO homework tracker)
 * ------------------------------------------------------------
 * Renders ONLY its own body inside the existing dark scroll area
 * (.oxv-body); the parent supplies the back button + title bar.
 *   - "今週の宿題" summary card: a live linear progress bar plus
 *     "X / Y 完了" that updates the instant a row is toggled.
 *   - Assignment rows: a colored 科目 tag, the title, a "期限 M/D(曜)"
 *     due line, a due-status chip computed against the real today
 *     (期限切れ / 今日まで / あと N日) and a round tap checkbox.
 *   - Done rows strike + dim; not-done sort first by due date,
 *     done sink to the bottom; all-done shows an encouraging card.
 * Demo data is deterministic (no RNG); only the per-item done flags
 * are user state, persisted to localStorage "oxhLaboHw" (try/catch).
 * Scope: EVERY selector in homework.css begins with .oxv-hw; tokens
 * (--ink/--muted/--red/--blue/--gold/--good/--glass/--line/...) and
 * the page chrome cascade from the .oxh ancestor — never redefined.
 * ============================================================ */

const STORE_KEY = "oxhLaboHw";

// 科目 palette shared across every LABO feature (given, not theme tokens)
const SUBJECTS = {
  数学: "#3f8dff",
  英語: "#e8273c",
  国語: "#9a6bff",
  理科: "#2bd47e",
  社会: "#ffb020",
  その他: "#36c5d6",
};

// seed assignments — `offset` = whole days from today (deterministic, no RNG):
// -2 overdue, 0 due today, the rest upcoming.
const SEED = [
  { id: "hw-math-1", subject: "数学", title: "教科書 p.42〜45 の演習問題", offset: -2 },
  { id: "hw-eng-1", subject: "英語", title: "Unit 6 の単語テスト範囲を暗記", offset: 0 },
  { id: "hw-jpn-1", subject: "国語", title: "漢字ドリル 第8回（書き取り）", offset: 1 },
  { id: "hw-sci-1", subject: "理科", title: "「光の屈折」の観察レポート", offset: 3 },
  { id: "hw-soc-1", subject: "社会", title: "江戸時代のまとめノート", offset: 5 },
];

const WDAY = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_MS = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// --- persistence (own key; every access wrapped in try/catch) --------------
function readDone() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") return obj;
    }
  } catch { /* ignore */ }
  return {};
}
function writeDone(map) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// --- inline svg icons (no emoji) -------------------------------------------
const IcBook = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 6c-1.6-1.3-3.6-2-6-2v13c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2V4c-2.4 0-4.4.7-6 2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 6v13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcClock = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcCheck = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcSpark = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="currentColor" />
    <path d="M18.5 14l.8 2.2L21 17l-1.7.8-.8 2.2-.8-2.2L16 17l1.7-.8.8-2.2z" fill="currentColor" opacity=".7" />
  </svg>
);

export default function Homework() {
  const [done, setDone] = useState(readDone);

  const today = startOfDay(new Date());

  const items = SEED.map((s) => {
    const dueDate = startOfDay(new Date(today.getTime() + s.offset * DAY_MS));
    const diff = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
    return {
      ...s,
      dueDate,
      diff,
      isDone: Boolean(done[s.id]),
      color: SUBJECTS[s.subject] || SUBJECTS.その他,
    };
  });

  const total = items.length;
  const completed = items.filter((i) => i.isDone).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const overdue = items.filter((i) => !i.isDone && i.diff < 0).length;
  const remaining = total - completed;
  const allDone = total > 0 && remaining === 0;

  // not-done first (due ascending), done sink to the bottom (due ascending)
  const sorted = [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const toggle = (id) => {
    setDone((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      writeDone(next);
      return next;
    });
  };

  let summarySub;
  if (allDone) summarySub = "今週の宿題はすべて完了。よくがんばりました。";
  else if (overdue > 0) summarySub = `期限切れが ${overdue}件。早めに片付けよう。`;
  else summarySub = `残り ${remaining}件。今日も少しずつ進めよう。`;

  return (
    <div className="oxv-hw">
      {/* summary --------------------------------------------------------- */}
      <div className="oxv-hw-sum">
        <div className="oxv-hw-sum-head">
          <span className="oxv-hw-sum-t">{IcBook}今週の宿題</span>
          <span className="oxv-hw-sum-c">
            <b>{completed}</b> / {total} 完了
          </span>
        </div>
        <div
          className="oxv-hw-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="oxv-hw-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="oxv-hw-sum-s">{summarySub}</span>
      </div>

      {/* all-done banner ------------------------------------------------- */}
      {allDone && (
        <div className="oxv-hw-clear">
          <span className="oxv-hw-clear-ic">{IcSpark}</span>
          <div className="oxv-hw-clear-txt">
            <b>すべて完了しました</b>
            <small>今週の宿題はもう残っていません。次の予習に進もう。</small>
          </div>
        </div>
      )}

      {/* assignment list ------------------------------------------------- */}
      <div className="oxv-hw-list">
        {sorted.map((it) => {
          const m = it.dueDate.getMonth() + 1;
          const d = it.dueDate.getDate();
          const w = WDAY[it.dueDate.getDay()];

          let chipClass = "oxv-hw-chip";
          let chipText;
          if (it.isDone) {
            chipClass += " oxv-hw-chip-done";
            chipText = "完了";
          } else if (it.diff < 0) {
            chipClass += " oxv-hw-chip-over";
            chipText = "期限切れ";
          } else if (it.diff === 0) {
            chipClass += " oxv-hw-chip-today";
            chipText = "今日まで";
          } else {
            chipText = `あと ${it.diff}日`;
          }

          return (
            <div className={`oxv-hw-row${it.isDone ? " oxv-hw-row-done" : ""}`} key={it.id}>
              <span
                className="oxv-hw-tag"
                style={{ color: it.color, borderColor: it.color, background: `${it.color}22` }}
              >
                {it.subject}
              </span>

              <div className="oxv-hw-mid">
                <span className="oxv-hw-title">{it.title}</span>
                <span className="oxv-hw-meta">
                  <span className="oxv-hw-due">
                    {IcClock}期限 {m}/{d}({w})
                  </span>
                  <span className={chipClass}>{chipText}</span>
                </span>
              </div>

              <button
                type="button"
                className={`oxv-hw-check${it.isDone ? " oxv-hw-check-on" : ""}`}
                onClick={() => toggle(it.id)}
                aria-pressed={it.isDone}
                aria-label={it.isDone ? "未完了にする" : "完了にする"}
              >
                {it.isDone && IcCheck}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
