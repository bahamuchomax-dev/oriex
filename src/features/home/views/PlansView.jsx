import "./plans.css";
import { useEffect, useMemo, useState } from "react";

/* 週計画 (PlansView) — a weekly study plan, self-contained, persisted to
 * localStorage "oxhPlans" as { Mon:[{id,text,min,done}], ... }. Browser-only;
 * every storage access is wrapped in try/catch. No store coupling. */

const STORE_KEY = "oxhPlans";

const DAYS = [
  { key: "Mon", label: "月", name: "月曜日", tone: "ink" },
  { key: "Tue", label: "火", name: "火曜日", tone: "ink" },
  { key: "Wed", label: "水", name: "水曜日", tone: "ink" },
  { key: "Thu", label: "木", name: "木曜日", tone: "ink" },
  { key: "Fri", label: "金", name: "金曜日", tone: "ink" },
  { key: "Sat", label: "土", name: "土曜日", tone: "blue" },
  { key: "Sun", label: "日", name: "日曜日", tone: "red" },
];
const DOW_KEY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMin(min) {
  const v = Math.max(0, Math.round(min || 0));
  const h = Math.floor(v / 60);
  const m = v % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function genId() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function emptyWeek() {
  return DAYS.reduce((o, d) => ((o[d.key] = []), o), {});
}

function seed() {
  const t = (text, min, done = false) => ({ id: genId(), text, min, done });
  return {
    Mon: [t("数学 二次関数の演習", 40, true), t("英単語 50語を暗記", 20, true)],
    Tue: [t("英語 長文読解 2題", 35), t("理科 化学反応式の復習", 30)],
    Wed: [t("数学 過去問にチャレンジ", 50), t("国語 古文単語 30語", 20)],
    Thu: [t("英語 文法問題集", 40), t("社会 歴史の流れを整理", 30)],
    Fri: [t("数学 模試の解き直し", 45)],
    Sat: [t("理科 物理の演習", 60), t("英語 リスニング", 25)],
    Sun: [t("今週の振り返りメモ", 20), t("苦手分野をまとめ直す", 40)],
  };
}

function normalize(raw) {
  const base = emptyWeek();
  if (!raw || typeof raw !== "object") return base;
  // flat list with a `day` field is also accepted
  if (Array.isArray(raw)) {
    for (const it of raw) {
      const k = it && DOW_KEY.includes(it.day) ? it.day : null;
      if (k) base[k].push(cleanTask(it));
    }
    return base;
  }
  for (const d of DAYS) {
    const arr = Array.isArray(raw[d.key]) ? raw[d.key] : [];
    base[d.key] = arr.filter((x) => x && typeof x.text === "string").map(cleanTask);
  }
  return base;
}

function cleanTask(x) {
  return {
    id: typeof x.id === "string" ? x.id : genId(),
    text: String(x.text || "").slice(0, 120),
    min: clampMin(x.min),
    done: !!x.done,
  };
}

function clampMin(n) {
  const v = Math.round(Number(n) || 0);
  if (!v) return 30;
  return Math.min(600, Math.max(5, v));
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const norm = normalize(parsed);
      const any = DAYS.some((d) => norm[d.key].length > 0);
      if (any) return norm;
    }
  } catch {
    /* ignore storage errors */
  }
  return seed();
}

export default function PlansView({ onBack }) {
  const [plans, setPlans] = useState(load);
  const [adding, setAdding] = useState(null); // day key whose form is open
  const [draftText, setDraftText] = useState("");
  const [draftMin, setDraftMin] = useState("30");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(plans));
    } catch {
      /* ignore storage errors */
    }
  }, [plans]);

  const todayKey = DOW_KEY[new Date().getDay()];

  const totals = useMemo(() => {
    let count = 0;
    let done = 0;
    let plannedMin = 0;
    let doneMin = 0;
    for (const d of DAYS) {
      for (const tk of plans[d.key]) {
        count += 1;
        plannedMin += tk.min;
        if (tk.done) {
          done += 1;
          doneMin += tk.min;
        }
      }
    }
    const pct = count ? Math.round((done / count) * 100) : 0;
    return { count, done, plannedMin, doneMin, pct };
  }, [plans]);

  function toggle(dayKey, id) {
    setPlans((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }

  function remove(dayKey, id) {
    setPlans((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((t) => t.id !== id),
    }));
  }

  function openAdd(dayKey) {
    setAdding(dayKey);
    setDraftText("");
    setDraftMin("30");
  }

  function submitAdd(dayKey) {
    const text = draftText.trim();
    if (!text) return;
    const task = { id: genId(), text, min: clampMin(draftMin), done: false };
    setPlans((prev) => ({ ...prev, [dayKey]: [...prev[dayKey], task] }));
    setDraftText("");
    setDraftMin("30");
    // keep the form open so several tasks can be added in a row
  }

  // ring geometry
  const R = 26;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - totals.pct / 100);

  return (
    <div className="oxh-sub oxv-pl">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">週計画</span>
      </div>

      <div className="oxv-body">
        {/* progress header */}
        <div className="oxv-pl-head">
          <div className="oxv-pl-ring" role="img" aria-label={`達成率 ${totals.pct}パーセント`}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <linearGradient id="oxvPlGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3f8dff" />
                  <stop offset="1" stopColor="#e8273c" />
                </linearGradient>
              </defs>
              <circle className="oxv-pl-ring-bg" cx="32" cy="32" r={R} />
              <circle
                className="oxv-pl-ring-fg"
                cx="32"
                cy="32"
                r={R}
                strokeDasharray={C}
                strokeDashoffset={dash}
              />
            </svg>
            <div className="oxv-pl-ringnum">
              <b>{totals.pct}</b>
              <i>%</i>
            </div>
          </div>

          <div className="oxv-pl-headtext">
            <span className="oxv-pl-h">今週の予定</span>
            <span className="oxv-pl-sub">
              達成 <b>{totals.done}</b> / {totals.count} タスク
            </span>
            <div className="oxv-pl-stats">
              <span className="oxv-pl-stat">
                <i>合計</i>
                <b>{fmtMin(totals.plannedMin)}</b>
              </span>
              <span className="oxv-pl-stat is-done">
                <i>完了</i>
                <b>{fmtMin(totals.doneMin)}</b>
              </span>
            </div>
          </div>
        </div>

        {/* 7 day sections */}
        <div className="oxv-pl-week">
          {DAYS.map((d) => {
            const tasks = plans[d.key];
            const dayDone = tasks.filter((t) => t.done).length;
            const dayMin = tasks.reduce((a, t) => a + t.min, 0);
            const isToday = d.key === todayKey;
            const isAdding = adding === d.key;
            return (
              <section
                key={d.key}
                className={
                  "oxv-pl-day" +
                  (isToday ? " is-today" : "") +
                  (d.tone === "blue" ? " is-blue" : d.tone === "red" ? " is-red" : "")
                }
              >
                <div className="oxv-pl-dayhead">
                  <span className="oxv-pl-badge">{d.label}</span>
                  <span className="oxv-pl-dayname">
                    {d.name}
                    {isToday ? <span className="oxv-pl-today">今日</span> : null}
                  </span>
                  <span className="oxv-pl-daymeta">
                    {tasks.length ? (
                      <>
                        {dayDone}/{tasks.length}・{fmtMin(dayMin)}
                      </>
                    ) : (
                      "予定なし"
                    )}
                  </span>
                </div>

                {tasks.length > 0 && (
                  <ul className="oxv-pl-tasks">
                    {tasks.map((t) => (
                      <li key={t.id} className={"oxv-pl-task" + (t.done ? " is-done" : "")}>
                        <button
                          type="button"
                          className="oxv-pl-check"
                          role="checkbox"
                          aria-checked={t.done}
                          aria-label={t.done ? "未完了に戻す" : "完了にする"}
                          onClick={() => toggle(d.key, t.id)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <span className="oxv-pl-text">{t.text}</span>
                        <span className="oxv-pl-min">
                          {t.min}
                          <i>分</i>
                        </span>
                        <button
                          type="button"
                          className="oxv-pl-del"
                          aria-label="削除"
                          onClick={() => remove(d.key, t.id)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {isAdding ? (
                  <form
                    className="oxv-pl-add"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitAdd(d.key);
                    }}
                  >
                    <input
                      className="oxv-pl-add-text"
                      placeholder="やることを入力"
                      value={draftText}
                      autoFocus
                      maxLength={120}
                      onChange={(e) => setDraftText(e.target.value)}
                    />
                    <div className="oxv-pl-add-min">
                      <input
                        className="oxv-pl-add-num"
                        inputMode="numeric"
                        placeholder="30"
                        value={draftMin}
                        onChange={(e) => setDraftMin(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                      />
                      <span>分</span>
                    </div>
                    <button type="submit" className="oxv-pl-add-go" disabled={!draftText.trim()}>
                      追加
                    </button>
                    <button
                      type="button"
                      className="oxv-pl-add-cancel"
                      onClick={() => setAdding(null)}
                      aria-label="閉じる"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </form>
                ) : (
                  <button type="button" className="oxv-pl-addbtn" onClick={() => openAdd(d.key)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    予定を追加
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
