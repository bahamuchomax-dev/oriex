import "./quiz.css";
import { useEffect, useState } from "react";

/* ===== 問題集 (QuizView) — a working 4-choice quiz runner =====================
 * Self-contained: ~6 demo questions seeded inline across subjects.
 * Flow: start card -> one question at a time (tap a choice -> mark correct/
 * incorrect + 解説 + 次へ) -> 結果 card (score, % ring, review, もう一度挑戦).
 * Best score persists in localStorage "oxhQuiz". No emoji; icons = inline svg.
 * ========================================================================== */

const QUESTIONS = [
  {
    id: "q1",
    subject: "数学",
    q: "2次方程式 x² − 5x + 6 = 0 の解はどれか。",
    choices: ["x = 1, 6", "x = 2, 3", "x = −2, −3", "x = −1, −6"],
    answer: 1,
    explain: "左辺を因数分解すると (x − 2)(x − 3) = 0。よって x = 2, 3 が解になる。",
  },
  {
    id: "q2",
    subject: "英語",
    q: "空所に最も適切な語を選べ。 “She has lived here ___ 2015.”",
    choices: ["for", "since", "during", "by"],
    answer: 1,
    explain: "「2015年から現在まで」と特定の起点から続く継続は since を使う。期間の長さを表すなら for。",
  },
  {
    id: "q3",
    subject: "理科",
    q: "植物が光合成で主に取り込む気体はどれか。",
    choices: ["酸素", "窒素", "二酸化炭素", "水素"],
    answer: 2,
    explain: "光合成は二酸化炭素と水を材料に、光のエネルギーででんぷんと酸素をつくる反応。",
  },
  {
    id: "q4",
    subject: "国語",
    q: "「推敲」の読みとして正しいものはどれか。",
    choices: ["すいこう", "すいごう", "ついこう", "しゅうこう"],
    answer: 0,
    explain: "「推敲」は文章を何度も練り直すこと。読みは「すいこう」。",
  },
  {
    id: "q5",
    subject: "社会",
    q: "日本国憲法が施行された年はどれか。",
    choices: ["1889年", "1945年", "1947年", "1951年"],
    answer: 2,
    explain: "日本国憲法は1946年11月3日に公布、1947年5月3日に施行された。",
  },
  {
    id: "q6",
    subject: "数学",
    q: "半径 r の円の面積を表す式はどれか。",
    choices: ["2πr", "πr²", "πr", "4πr²"],
    answer: 1,
    explain: "円の面積は πr²。2πr は円周の長さなので混同しないこと。",
  },
];

const N = QUESTIONS.length;
const SUBJECTS = [...new Set(QUESTIONS.map((q) => q.subject))];
const KEYS = ["A", "B", "C", "D"];
const RING_C = 2 * Math.PI * 52;
const STORE = "oxhQuiz";

const TONE = {
  数学: { c: "#ff5567", bg: "rgba(232,39,60,.15)" },
  英語: { c: "#3f8dff", bg: "rgba(63,141,255,.15)" },
  理科: { c: "#9a6bff", bg: "rgba(154,107,255,.15)" },
  国語: { c: "#2bd47e", bg: "rgba(43,212,126,.15)" },
  社会: { c: "#ffb020", bg: "rgba(255,176,32,.15)" },
};
const tone = (s) => TONE[s] || { c: "#7c8aa0", bg: "rgba(124,138,160,.15)" };

const scoreOf = (picks) =>
  QUESTIONS.reduce((a, q, i) => a + (picks[i] === q.answer ? 1 : 0), 0);

function loadBest() {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o.best === "number") return Math.max(0, Math.min(N, o.best));
    }
  } catch {
    /* ignore storage errors */
  }
  return 0;
}
function saveBest(n) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify({ best: n, total: N }));
  } catch {
    /* ignore storage errors */
  }
}

/* ---- inline icons --------------------------------------------------------- */
const ICheck = () => (
  <svg className="oxv-qz-i" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICross = () => (
  <svg className="oxv-qz-i" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function QuizView({ onBack }) {
  const [phase, setPhase] = useState("start"); // start | play | result
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState(() => Array(N).fill(null));
  const [best, setBest] = useState(loadBest);
  const [justBeat, setJustBeat] = useState(false);
  const [ringOn, setRingOn] = useState(false);

  // animate the result ring from empty -> target once the result card mounts
  useEffect(() => {
    if (phase !== "result") {
      setRingOn(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setRingOn(true));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const current = QUESTIONS[idx];
  const answered = picks[idx] != null;
  const correct = answered && picks[idx] === current.answer;
  const score = scoreOf(picks);
  const pct = Math.round((score / N) * 100);

  function begin() {
    setPicks(Array(N).fill(null));
    setIdx(0);
    setJustBeat(false);
    setPhase("play");
  }

  function choose(c) {
    if (picks[idx] != null) return; // lock once answered
    setPicks((prev) => {
      const next = prev.slice();
      next[idx] = c;
      return next;
    });
  }

  function next() {
    if (picks[idx] == null) return;
    if (idx < N - 1) {
      setIdx(idx + 1);
      return;
    }
    const final = scoreOf(picks);
    const beat = final > best;
    if (beat) {
      setBest(final);
      saveBest(final);
    }
    setJustBeat(beat);
    setPhase("result");
  }

  const ringColor = pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--blue)" : "var(--red)";
  const verdict =
    pct === 100
      ? "全問正解。文句なしの実力だ。"
      : pct >= 80
      ? "よくできた。この調子で伸ばそう。"
      : pct >= 50
      ? "あと一歩。間違えた問題を復習しよう。"
      : "基礎から見直して、もう一度挑戦しよう。";

  return (
    <div className="oxh-sub oxv-qz">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">問題集</span>
      </div>

      <div className="oxv-body">
        {/* ===================== START ===================== */}
        {phase === "start" && (
          <div className="oxv-qz-start">
            <div className="oxv-qz-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 4h6a1 1 0 0 1 1 1H8a1 1 0 0 1 1-1zM7 5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 11l1.6 1.6L14 9.5M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="oxv-qz-start-title">総合実力クイズ</h2>
            <p className="oxv-qz-start-sub">
              5教科の基礎から全{N}問。4つの選択肢から正しい答えを選ぼう。
            </p>

            <div className="oxv-qz-meta">
              <div className="oxv-qz-meta-item">
                <span className="oxv-qz-meta-v">{N}</span>
                <span className="oxv-qz-meta-k">問題数</span>
              </div>
              <span className="oxv-qz-meta-sep" aria-hidden="true" />
              <div className="oxv-qz-meta-item">
                <span className="oxv-qz-meta-v">4択</span>
                <span className="oxv-qz-meta-k">形式</span>
              </div>
              <span className="oxv-qz-meta-sep" aria-hidden="true" />
              <div className="oxv-qz-meta-item">
                <span className="oxv-qz-meta-v">
                  {best}
                  <i>/{N}</i>
                </span>
                <span className="oxv-qz-meta-k">自己ベスト</span>
              </div>
            </div>

            <div className="oxv-qz-chips">
              {SUBJECTS.map((s) => {
                const t = tone(s);
                return (
                  <span key={s} className="oxv-qz-chip" style={{ color: t.c, background: t.bg, borderColor: t.c }}>
                    {s}
                  </span>
                );
              })}
            </div>

            <button className="oxv-qz-start-btn" type="button" onClick={begin}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
              はじめる
            </button>
          </div>
        )}

        {/* ===================== PLAY ===================== */}
        {phase === "play" && (
          <div className="oxv-qz-play">
            <div className="oxv-qz-bar">
              <div className="oxv-qz-bar-top">
                <span className="oxv-qz-prog">
                  問題 <b>{idx + 1}</b> / {N}
                </span>
                <span className="oxv-qz-score">
                  <ICheck />
                  正解 <b>{score}</b>
                </span>
              </div>
              <div className="oxv-qz-track">
                <div
                  className="oxv-qz-fill"
                  style={{ width: `${((idx + (answered ? 1 : 0)) / N) * 100}%` }}
                />
              </div>
            </div>

            <div className="oxv-qz-card">
              <span
                className="oxv-qz-tag"
                style={{ color: tone(current.subject).c, background: tone(current.subject).bg }}
              >
                {current.subject}
              </span>
              <p className="oxv-qz-q">{current.q}</p>
            </div>

            <div className="oxv-qz-choices">
              {current.choices.map((ch, i) => {
                const isCorrect = i === current.answer;
                const isPicked = picks[idx] === i;
                let cls = "oxv-qz-choice";
                if (answered && isCorrect) cls += " is-correct";
                else if (answered && isPicked) cls += " is-wrong";
                else if (answered) cls += " is-dim";
                return (
                  <button
                    key={ch}
                    type="button"
                    className={cls}
                    disabled={answered}
                    onClick={() => choose(i)}
                  >
                    <span className="oxv-qz-key">{KEYS[i]}</span>
                    <span className="oxv-qz-choice-t">{ch}</span>
                    {answered && isCorrect && (
                      <span className="oxv-qz-mark is-ok">
                        <ICheck />
                      </span>
                    )}
                    {answered && isPicked && !isCorrect && (
                      <span className="oxv-qz-mark is-no">
                        <ICross />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={"oxv-qz-explain" + (correct ? " is-good" : " is-bad")}>
                <div className="oxv-qz-explain-head">
                  {correct ? <ICheck /> : <ICross />}
                  <span>{correct ? "正解" : "不正解"}</span>
                </div>
                <p className="oxv-qz-explain-t">{current.explain}</p>
              </div>
            )}

            {answered && (
              <button className="oxv-qz-next" type="button" onClick={next}>
                {idx < N - 1 ? "次の問題へ" : "結果を見る"}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* ===================== RESULT ===================== */}
        {phase === "result" && (
          <div className="oxv-qz-result">
            <div className="oxv-qz-ring-wrap">
              <svg className="oxv-qz-ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="oxv-qz-ring-track" cx="60" cy="60" r="52" />
                <circle
                  className="oxv-qz-ring-prog"
                  cx="60"
                  cy="60"
                  r="52"
                  style={{
                    stroke: ringColor,
                    strokeDasharray: RING_C,
                    strokeDashoffset: ringOn ? RING_C * (1 - pct / 100) : RING_C,
                  }}
                />
              </svg>
              <div className="oxv-qz-ring-center">
                <span className="oxv-qz-ring-pct" style={{ color: ringColor }}>
                  {pct}
                  <i>%</i>
                </span>
                <span className="oxv-qz-ring-sub">
                  {score} / {N} 問正解
                </span>
              </div>
            </div>

            <p className="oxv-qz-verdict">{verdict}</p>

            <div className="oxv-qz-best">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h10v3a5 5 0 0 1-10 0V4zM5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M9 14h6l-.5 4h-5L9 14zM8 20h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                自己ベスト <b>{best}</b> / {N} 問
              </span>
              {justBeat && <span className="oxv-qz-best-new">更新</span>}
            </div>

            <div className="oxv-qz-review">
              <span className="oxv-qz-review-h">解答の振り返り</span>
              {QUESTIONS.map((q, i) => {
                const ok = picks[i] === q.answer;
                return (
                  <div key={q.id} className={"oxv-qz-rev" + (ok ? " is-ok" : " is-no")}>
                    <span className="oxv-qz-rev-icon">{ok ? <ICheck /> : <ICross />}</span>
                    <div className="oxv-qz-rev-main">
                      <span className="oxv-qz-rev-q">
                        <b>{i + 1}.</b> {q.q}
                      </span>
                      <span className="oxv-qz-rev-a">
                        正解: {q.choices[q.answer]}
                        {!ok && (
                          <em>あなた: {picks[i] == null ? "未回答" : q.choices[picks[i]]}</em>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="oxv-qz-result-actions">
              <button className="oxv-qz-again" type="button" onClick={begin}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 1 2.3 5.6M4 19v-4h4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                もう一度挑戦
              </button>
              <button className="oxv-qz-home" type="button" onClick={onBack}>
                ホームへ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
