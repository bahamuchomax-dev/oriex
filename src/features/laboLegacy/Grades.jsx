import "./grades.css";
import { useState } from "react";

/* ============================================================
 * Grades — 成績カルテ (LABO LEGACY: test-score record + trend)
 * ------------------------------------------------------------
 * LIGHT / cream "old home" build. The parent already draws the
 * top bar + back button, so this renders ONLY its own body
 * content. White cards on a warm/cream page; dark text on light.
 *
 *  - Trend card: a bar sparkline (plain divs) of the recent ~5
 *    tests' 合計点, the latest score large, and a +/- delta vs the
 *    previous test shown with an up (green) / down (red) svg arrow.
 *  - History list (newest first; user records sit above the seeds):
 *    日付 (M/D) / テスト名 / 合計点 / colored delta / 科目別 minis.
 *  - 記録する reveals an inline form (テスト名 / 点数 / 偏差値?).
 *    On a valid submit the record is prepended, persisted, and the
 *    trend recomputes.
 *
 * Demo seeds are deterministic (no Math.random for content); user
 * records persist to localStorage "oxhLaboGrades" (every access in
 * try/catch). Every selector in grades.css is prefixed .oxll-gr and
 * the only @keyframes are namespaced oxllGr*. Colors are literal —
 * this mounts inside the legacy app, which has no design tokens.
 * ============================================================ */

const KEY = "oxhLaboGrades";

// shared LABO subject palette (科目 tags)
const SUBJECT_COLOR = {
  数学: "#3F8DFF",
  英語: "#E8273C",
  国語: "#9A6BFF",
  理科: "#2BA85B",
  社会: "#E8923A",
  その他: "#36B4C4",
};

// --- date helpers ----------------------------------------------------------
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function md(s) {
  const parts = String(s).split("-");
  return `${Number(parts[1])}/${Number(parts[2])}`;
}
function daysAgoYmd(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

// --- deterministic seeds (improving / upward trend) ------------------------
function buildSeeds() {
  return [
    {
      id: "seed-4",
      date: daysAgoYmd(13),
      name: "第4回 模試",
      total: 437,
      hensachi: 62,
      subjects: [
        { key: "数学", score: 86 },
        { key: "英語", score: 82 },
        { key: "国語", score: 85 },
      ],
    },
    {
      id: "seed-3",
      date: daysAgoYmd(38),
      name: "第3回 定期テスト",
      total: 401,
      hensachi: 58,
      subjects: [
        { key: "数学", score: 78 },
        { key: "英語", score: 74 },
        { key: "国語", score: 79 },
      ],
    },
    {
      id: "seed-2",
      date: daysAgoYmd(66),
      name: "第2回 模試",
      total: 358,
      hensachi: 53,
      subjects: [
        { key: "数学", score: 68 },
        { key: "英語", score: 64 },
        { key: "国語", score: 70 },
      ],
    },
    {
      id: "seed-1",
      date: daysAgoYmd(96),
      name: "第1回 実力テスト",
      total: 312,
      hensachi: 48,
      subjects: [
        { key: "数学", score: 58 },
        { key: "英語", score: 52 },
        { key: "国語", score: 61 },
      ],
    },
  ];
}

// --- persistence (own key; every access in try/catch) ----------------------
function readUser() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r.name === "string" && Number.isFinite(Number(r.total)))
      .map((r) => ({
        id: String(r.id || `gr-${r.date}-${r.name}`),
        date: String(r.date || ymd(new Date())),
        name: String(r.name),
        total: Number(r.total),
        hensachi: Number.isFinite(Number(r.hensachi)) ? Number(r.hensachi) : null,
        subjects: Array.isArray(r.subjects) ? r.subjects : [],
        user: true,
      }));
  } catch {
    return [];
  }
}
function writeUser(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

let idc = 0;
function nextId() {
  idc += 1;
  return `gr-${Date.now()}-${idc}`;
}

// --- inline svg icons (stroke-based, literal hex; no emoji) -----------------
const IcChart = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4v15a1 1 0 0 0 1 1h15" fill="none" stroke="#E8923A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 15l3.2-4 3 2.4L20 7.5" fill="none" stroke="#E8923A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcList = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="#9C8E7C" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="4" cy="6" r="1.3" fill="#9C8E7C" />
    <circle cx="4" cy="12" r="1.3" fill="#9C8E7C" />
    <circle cx="4" cy="18" r="1.3" fill="#9C8E7C" />
  </svg>
);
const IcUp = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcDown = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcPlus = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IcClose = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// --- delta badge (up = green / down = red / flat = muted) -------------------
function Delta({ value, big }) {
  if (value === null || value === undefined) return null;
  const cls = `oxll-gr-delta${big ? " oxll-gr-delta-lg" : ""}`;
  if (value === 0) {
    return <span className={`${cls} oxll-gr-flat`}>±0</span>;
  }
  const up = value > 0;
  return (
    <span className={`${cls} ${up ? "oxll-gr-up" : "oxll-gr-down"}`}>
      {up ? IcUp : IcDown}
      <b>{up ? "+" : "−"}{Math.abs(value)}</b>
    </span>
  );
}

export default function Grades() {
  const [seeds] = useState(buildSeeds);
  const [userRecords, setUserRecords] = useState(readUser);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [hensachi, setHensachi] = useState("");
  const [touched, setTouched] = useState(false);

  // combined history, newest first (user records above seeds)
  const all = [...userRecords, ...seeds];

  // delta vs the previous (older) test for each record
  const deltaOf = (i) => (i < all.length - 1 ? all[i].total - all[i + 1].total : null);

  const latest = all[0] || null;
  const headDelta = all.length > 1 ? all[0].total - all[1].total : null;

  // sparkline window: recent ~5, chronological (oldest -> newest)
  const window5 = all.slice(0, 5).reverse();
  const totals = window5.map((r) => r.total);
  const maxT = totals.length ? Math.max(...totals) : 0;
  const minT = totals.length ? Math.min(...totals) : 0;
  const span = maxT - minT || 1;

  const nameOk = name.trim() !== "";
  const scoreOk = score.trim() !== "" && Number.isFinite(Number(score));
  const valid = nameOk && scoreOk;

  const resetForm = () => {
    setName("");
    setScore("");
    setHensachi("");
    setTouched(false);
  };

  const toggleForm = () => {
    setOpen((o) => {
      if (o) resetForm();
      return !o;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const hv = hensachi.trim() !== "" && Number.isFinite(Number(hensachi)) ? Number(hensachi) : null;
    const rec = {
      id: nextId(),
      date: ymd(new Date()),
      name: name.trim(),
      total: Number(score),
      hensachi: hv,
      subjects: [],
      user: true,
    };
    const next = [rec, ...userRecords];
    setUserRecords(next);
    writeUser(next);
    resetForm();
    setOpen(false);
  };

  return (
    <div className="oxll-gr">
      {/* --- trend / summary ------------------------------------------- */}
      <section className="oxll-gr-trend">
        <div className="oxll-gr-trend-head">
          {IcChart}
          <span>成績の推移</span>
          <small>直近 {window5.length} 回</small>
        </div>

        <div className="oxll-gr-trend-top">
          <div className="oxll-gr-latest">
            <span className="oxll-gr-latest-k">最新の合計点</span>
            <span className="oxll-gr-latest-row">
              <b className="oxll-gr-latest-v">{latest ? latest.total : 0}</b>
              <small className="oxll-gr-latest-unit">点</small>
            </span>
            {latest && (
              <span className="oxll-gr-latest-name">
                {md(latest.date)}・{latest.name}
              </span>
            )}
          </div>
          <Delta value={headDelta} big />
        </div>

        <div className="oxll-gr-spark" role="img" aria-label="直近のテスト合計点の推移">
          {window5.map((r, i) => {
            const h = Math.round((0.3 + 0.7 * ((r.total - minT) / span)) * 100);
            const isLast = i === window5.length - 1;
            return (
              <div className="oxll-gr-bar-wrap" key={r.id}>
                <span className="oxll-gr-bar-val">{r.total}</span>
                <div className="oxll-gr-bar-track">
                  <span
                    className={`oxll-gr-bar${isLast ? " oxll-gr-bar-on" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="oxll-gr-bar-x">{md(r.date)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- record action / form ------------------------------------- */}
      <button
        type="button"
        className={`oxll-gr-add${open ? " oxll-gr-add-open" : ""}`}
        onClick={toggleForm}
        aria-expanded={open}
      >
        {open ? IcClose : IcPlus}
        <span>{open ? "閉じる" : "記録する"}</span>
      </button>

      {open && (
        <form className="oxll-gr-form" onSubmit={submit}>
          <label className="oxll-gr-field">
            <span className="oxll-gr-flabel">テスト名</span>
            <input
              className="oxll-gr-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="第5回 模試"
              maxLength={40}
            />
          </label>

          <div className="oxll-gr-grid">
            <label className="oxll-gr-field">
              <span className="oxll-gr-flabel">点数<i>必須</i></span>
              <input
                className="oxll-gr-input"
                type="number"
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="450"
              />
            </label>
            <label className="oxll-gr-field">
              <span className="oxll-gr-flabel">偏差値<i>任意</i></span>
              <input
                className="oxll-gr-input"
                type="number"
                inputMode="numeric"
                value={hensachi}
                onChange={(e) => setHensachi(e.target.value)}
                placeholder="64"
              />
            </label>
          </div>

          {touched && !valid && (
            <p className="oxll-gr-err">テスト名と点数（数値）を入力してください。</p>
          )}

          <button type="submit" className="oxll-gr-submit" disabled={!valid}>
            この成績を記録する
          </button>
        </form>
      )}

      {/* --- history list --------------------------------------------- */}
      <div className="oxll-gr-h">
        {IcList}
        <span>テスト履歴</span>
        <small>{all.length} 件</small>
      </div>

      <div className="oxll-gr-list">
        {all.map((r, i) => (
          <article className="oxll-gr-card" key={r.id}>
            <div className="oxll-gr-card-head">
              <span className="oxll-gr-date">{md(r.date)}</span>
              <span className="oxll-gr-name">{r.name}</span>
              {r.user ? (
                <i className="oxll-gr-tag">自分</i>
              ) : (
                <i className="oxll-gr-tag oxll-gr-tag-demo">例</i>
              )}
            </div>

            <div className="oxll-gr-card-main">
              <span className="oxll-gr-total">
                {r.total}<small>点</small>
              </span>
              {r.hensachi !== null && r.hensachi !== undefined && (
                <span className="oxll-gr-hensachi">偏差値 <b>{r.hensachi}</b></span>
              )}
              <span className="oxll-gr-card-delta">
                <Delta value={deltaOf(i)} />
              </span>
            </div>

            {Array.isArray(r.subjects) && r.subjects.length > 0 && (
              <div className="oxll-gr-subs">
                {r.subjects.map((s) => (
                  <span className="oxll-gr-sub" key={s.key}>
                    <i
                      className="oxll-gr-sub-dot"
                      style={{ background: SUBJECT_COLOR[s.key] || SUBJECT_COLOR["その他"] }}
                    />
                    <span className="oxll-gr-sub-k">{s.key}</span>
                    <b className="oxll-gr-sub-v">{s.score}</b>
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
