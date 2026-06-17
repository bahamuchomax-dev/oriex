import "./diary.css";
import { useState, useEffect, useMemo } from "react";

/* ===== 学習日記 (DiaryView) =====
 * A dated study journal. Each entry = { dateKey:"YYYY-MM-DD", mood:1..5, text }.
 * Persisted to localStorage "oxhDiary". The editor at top upserts TODAY's entry
 * by date; tapping a past card loads it into the same editor for editing.
 * Self-contained (own oxh* key) — no shared store needed here. No emoji; faces
 * are inline <svg>. Browser-only; every storage access wrapped in try/catch.
 */

const STORE_KEY = "oxhDiary";
const WD = ["日", "月", "火", "水", "木", "金", "土"];

const MOODS = [
  { level: 1, label: "つらい", color: "#e8273c" },
  { level: 2, label: "いまいち", color: "#ffb020" },
  { level: 3, label: "ふつう", color: "#ffd36e" },
  { level: 4, label: "よい", color: "#3f8dff" },
  { level: 5, label: "絶好調", color: "#2bd47e" },
];
function moodInfo(level) {
  return MOODS.find((m) => m.level === level) || MOODS[2];
}

/* mouth path per mood level — frown(1) … smile(5), 24x24 viewBox */
const MOUTHS = {
  1: "M8.4 16.4 Q12 13 15.6 16.4",
  2: "M8.4 15.7 Q12 14.3 15.6 15.7",
  3: "M8.6 15 H15.4",
  4: "M8.4 14.5 Q12 16.4 15.6 14.5",
  5: "M8 14.1 Q12 18.6 16 14.1",
};

function MoodFace({ level, color }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.3" fill={color + "22"} stroke={color} strokeWidth="1.7" />
      <circle cx="9" cy="10.2" r="1.2" fill={color} />
      <circle cx="15" cy="10.2" r="1.2" fill={color} />
      <path
        d={MOUTHS[level] || MOUTHS[3]}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---- date helpers (today comes from new Date()) ---- */
function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function labelOf(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${m}月${d}日（${WD[dt.getDay()]}）`;
}
function byDateDesc(a, b) {
  return a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0;
}

function seedEntries() {
  const now = new Date();
  const mk = (offset, mood, text) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    return { dateKey: keyOf(d), mood, text };
  };
  return [
    mk(1, 4, "数学の二次関数を2時間。グラフの平行移動がやっと手に馴染んできた。明日は応用問題に挑戦する。"),
    mk(3, 2, "英語の長文でつまずいた。知らない単語が多くて読むのが遅い。毎朝10分の単語学習を習慣にしたい。"),
    mk(6, 5, "模試の判定がBからAに上がった。毎日の積み重ねが結果になって本当にうれしい。この調子で続ける。"),
  ].sort(byDateDesc);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter((e) => e && e.dateKey)
          .map((e) => ({
            dateKey: String(e.dateKey),
            mood: Number(e.mood) || 3,
            text: typeof e.text === "string" ? e.text : "",
          }))
          .sort(byDateDesc);
      }
    }
  } catch {
    /* ignore storage errors */
  }
  return seedEntries();
}

export default function DiaryView({ onBack }) {
  // compute initial state once (today + entries from storage)
  const initial = useMemo(() => {
    const list = loadEntries();
    const tk = keyOf(new Date());
    const mine = list.find((e) => e.dateKey === tk);
    return { list, tk, mood: mine ? mine.mood : 3, text: mine ? mine.text : "" };
  }, []);

  const todayKey = initial.tk;
  const [entries, setEntries] = useState(initial.list);
  const [draftKey, setDraftKey] = useState(initial.tk); // dateKey the editor targets
  const [mood, setMood] = useState(initial.mood);
  const [text, setText] = useState(initial.text);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    } catch {
      /* ignore storage errors */
    }
  }, [entries]);

  const isToday = draftKey === todayKey;
  const trimmed = text.trim();

  function loadToday(list) {
    const mine = list.find((e) => e.dateKey === todayKey);
    setDraftKey(todayKey);
    setMood(mine ? mine.mood : 3);
    setText(mine ? mine.text : "");
  }

  function editEntry(entry) {
    setDraftKey(entry.dateKey);
    setMood(entry.mood);
    setText(entry.text);
  }

  function save() {
    if (!trimmed) return;
    const entry = { dateKey: draftKey, mood, text: trimmed };
    const next = [...entries.filter((e) => e.dateKey !== draftKey), entry].sort(byDateDesc);
    setEntries(next);
    loadToday(next); // return the editor to today's slot
  }

  function remove(key) {
    const next = entries.filter((e) => e.dateKey !== key);
    setEntries(next);
    if (key === draftKey) loadToday(next);
  }

  const past = entries.filter((e) => e.dateKey !== todayKey).sort(byDateDesc);

  return (
    <div className="oxh-sub oxv-dy">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">学習日記</span>
      </div>

      <div className="oxv-body">
        {/* ===== editor ===== */}
        <section className="oxv-dy-editor" aria-label="今日のふりかえり">
          <div className="oxv-dy-edhead">
            <div className="oxv-dy-edheadtext">
              <span className="oxv-dy-edtitle">{isToday ? "今日のふりかえり" : "日記を編集"}</span>
              <span className="oxv-dy-eddate">{labelOf(draftKey)}</span>
            </div>
            {!isToday && (
              <button className="oxv-dy-return" type="button" onClick={() => loadToday(entries)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5l-7 7 7 7M4 12h15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                今日に戻る
              </button>
            )}
          </div>

          <span className="oxv-dy-qlabel">きょうの気分は？</span>
          <div className="oxv-dy-moods" role="group" aria-label="気分を選ぶ">
            {MOODS.map((m) => {
              const on = mood === m.level;
              return (
                <button
                  key={m.level}
                  type="button"
                  className={"oxv-dy-mood" + (on ? " is-on" : "")}
                  style={on ? { borderColor: m.color, background: m.color + "1f" } : undefined}
                  onClick={() => setMood(m.level)}
                  aria-pressed={on}
                >
                  <span className="oxv-dy-face">
                    <MoodFace level={m.level} color={on ? m.color : "#9aa3bd"} />
                  </span>
                  <span className="oxv-dy-moodlabel" style={on ? { color: m.color } : undefined}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          <textarea
            className="oxv-dy-area"
            placeholder="今日がんばったこと、つまずいたこと、明日やることを書こう。"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={600}
          />

          <div className="oxv-dy-edactions">
            <span className="oxv-dy-count">
              <span className="oxv-dy-countnum">{trimmed.length}</span> / 600 文字
            </span>
            <button className="oxv-dy-save" type="button" onClick={save} disabled={!trimmed}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isToday ? "保存する" : "更新する"}
            </button>
          </div>
        </section>

        {/* ===== past entries ===== */}
        <div className="oxv-dy-listhead">
          <span className="oxv-dy-listtitle">これまでの記録</span>
          <span className="oxv-dy-listcount">{past.length}日分</span>
        </div>

        {past.length === 0 ? (
          <div className="oxv-dy-empty">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM15 3v5h5M9 13h6M9 17h4" />
            </svg>
            <p>
              まだ過去の記録はありません。
              <br />
              上のふりかえりを保存して、続けていきましょう。
            </p>
          </div>
        ) : (
          <div className="oxv-dy-list">
            {past.map((e) => {
              const mi = moodInfo(e.mood);
              const editing = e.dateKey === draftKey;
              return (
                <div key={e.dateKey} className={"oxv-dy-card" + (editing ? " is-editing" : "")}>
                  <button
                    className="oxv-dy-cardmain"
                    type="button"
                    onClick={() => editEntry(e)}
                    aria-label={labelOf(e.dateKey) + "の日記を編集"}
                  >
                    <span className="oxv-dy-cardtop">
                      <span className="oxv-dy-dot" style={{ borderColor: mi.color + "55" }}>
                        <MoodFace level={e.mood} color={mi.color} />
                      </span>
                      <span className="oxv-dy-carddate">{labelOf(e.dateKey)}</span>
                      <span className="oxv-dy-moodtag" style={{ color: mi.color, background: mi.color + "1f" }}>
                        {mi.label}
                      </span>
                    </span>
                    <span className="oxv-dy-cardtext">{e.text || "（本文なし）"}</span>
                    {editing && <span className="oxv-dy-editing">編集中</span>}
                  </button>
                  <button
                    className="oxv-dy-del"
                    type="button"
                    onClick={() => remove(e.dateKey)}
                    aria-label={labelOf(e.dateKey) + "の日記を削除"}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
