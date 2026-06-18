import "./homework.css";
import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "oxhLaboHw";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const SUBJECT_COLORS = {
  数学: "#3F8DFF",
  英語: "#E8273C",
  国語: "#9A6BFF",
  理科: "#2BA85B",
  社会: "#E8923A",
  その他: "#36B4C4",
};

const SUBJECT_TINTS = {
  数学: "#3F8DFF1A",
  英語: "#E8273C1A",
  国語: "#9A6BFF1A",
  理科: "#2BA85B1A",
  社会: "#E8923A1A",
  その他: "#36B4C41A",
};

// Deterministic seed. offset = days from today (negative = overdue).
const SEED = [
  { id: "hw-math-1", subject: "数学", title: "二次関数 章末問題 p.84〜86", offset: -1 },
  { id: "hw-eng-1", subject: "英語", title: "Unit 5 単語テスト 範囲を暗記", offset: 0 },
  { id: "hw-jpn-1", subject: "国語", title: "「こころ」読書感想 400字", offset: 2 },
  { id: "hw-sci-1", subject: "理科", title: "化学反応式 プリント No.3", offset: 4 },
  { id: "hw-soc-1", subject: "社会", title: "明治維新 年表まとめ", offset: 6 },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function loadDone() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    /* ignore unreadable / malformed storage */
    return {};
  }
}

function formatDue(due) {
  return `期限 ${due.getMonth() + 1}/${due.getDate()}(${WEEKDAYS[due.getDay()]})`;
}

function dueStatus(due, today) {
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { kind: "over", label: "期限切れ" };
  if (days === 0) return { kind: "today", label: "今日まで" };
  return { kind: "soon", label: `あと${days}日` };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
      <path
        d="M5 12.5l4.2 4.2L19 7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Homework() {
  const [doneMap, setDoneMap] = useState(loadDone);

  const today = useMemo(() => startOfToday(), []);

  const items = useMemo(
    () =>
      SEED.map((a) => {
        const due = addDays(today, a.offset);
        return {
          id: a.id,
          subject: a.subject,
          title: a.title,
          due,
          done: !!doneMap[a.id],
          status: dueStatus(due, today),
        };
      }),
    [doneMap, today]
  );

  const ordered = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.due.getTime() - b.due.getTime();
      }),
    [items]
  );

  const total = items.length;
  const completed = items.filter((i) => i.done).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const toggle = useCallback((id) => {
    setDoneMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* persistence is best-effort; keep UI responsive */
      }
      return next;
    });
  }, []);

  return (
    <div className="oxll-hw">
      <section className="oxll-hw-summary" aria-label="今週の宿題の進捗">
        <div className="oxll-hw-summary-head">
          <h2 className="oxll-hw-summary-title">今週の宿題</h2>
          <span className="oxll-hw-summary-count">
            <strong>{completed}</strong> / {total} 完了
          </span>
        </div>
        <div
          className="oxll-hw-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
        >
          <span className="oxll-hw-fill" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <ul className="oxll-hw-list">
        {ordered.map((item) => (
          <li
            key={item.id}
            className={`oxll-hw-row${item.done ? " oxll-hw-row-done" : ""}`}
          >
            <button
              type="button"
              className="oxll-hw-check"
              aria-pressed={item.done}
              aria-label={item.done ? "未完了に戻す" : "完了にする"}
              onClick={() => toggle(item.id)}
            >
              {item.done ? <CheckIcon /> : null}
            </button>

            <div className="oxll-hw-body">
              <div className="oxll-hw-meta">
                <span
                  className="oxll-hw-tag"
                  style={{
                    color: SUBJECT_COLORS[item.subject],
                    background: SUBJECT_TINTS[item.subject],
                  }}
                >
                  {item.subject}
                </span>
                <span className="oxll-hw-due">{formatDue(item.due)}</span>
              </div>
              <p className="oxll-hw-title">{item.title}</p>
            </div>

            <span className={`oxll-hw-pill oxll-hw-pill-${item.status.kind}`}>
              {item.status.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
