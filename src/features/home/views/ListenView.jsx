import "./listen.css";
import { useState, useEffect } from "react";

/* ===== demo English listening tracks (no real audio — simulated) ===== */
const TRACKS = [
  {
    id: "ls-morning",
    title: "Morning Routine in New York",
    level: "初級",
    sec: 95,
    script: [
      "I usually wake up at six in the morning.",
      "First, I drink a glass of water and stretch a little.",
      "Then I take the subway downtown to my office.",
      "On the way, I listen to a short news podcast.",
    ],
  },
  {
    id: "ls-cafe",
    title: "Ordering Coffee at a Café",
    level: "初級",
    sec: 78,
    script: [
      "Hi, could I get a medium latte, please?",
      "Sure. Would you like it hot or iced?",
      "Hot, please. And can I have oat milk instead?",
      "Of course. That will be four dollars fifty.",
    ],
  },
  {
    id: "ls-interview",
    title: "A Job Interview",
    level: "中級",
    sec: 142,
    script: [
      "Thank you for coming in today. Tell me about yourself.",
      "I graduated last year and have worked in marketing since then.",
      "What would you say is your greatest strength?",
      "I think I'm good at staying calm under pressure.",
    ],
  },
  {
    id: "ls-hotel",
    title: "Booking a Hotel by Phone",
    level: "中級",
    sec: 118,
    script: [
      "Good evening, I'd like to book a room for two nights.",
      "Certainly. For how many guests will that be?",
      "Two adults. Do you have a room with a city view?",
      "We do. Breakfast is included with that rate.",
    ],
  },
  {
    id: "ls-talk",
    title: "Short Talk: The Future of Learning",
    level: "上級",
    sec: 196,
    script: [
      "Imagine a classroom that adapts to every single student.",
      "Technology is no longer a tool we simply add on top.",
      "Instead, it reshapes how we ask questions in the first place.",
      "The goal is not to replace curiosity, but to amplify it.",
    ],
  },
];

const LEVEL = {
  "初級": { c: "var(--good)", bg: "rgba(43,212,126,.16)" },
  "中級": { c: "var(--blue)", bg: "rgba(63,141,255,.16)" },
  "上級": { c: "var(--red)", bg: "rgba(232,39,60,.16)" },
};
const levelTone = (l) => LEVEL[l] || LEVEL["初級"];

const SPEEDS = [0.75, 1.0, 1.25];

function mmss(s) {
  const v = Math.max(0, Math.floor(s));
  const m = Math.floor(v / 60);
  const sec = v % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export default function ListenView({ onBack }) {
  const [done, setDone] = useState(() => {
    try {
      const raw = localStorage.getItem("oxhListen");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch {
      /* ignore storage errors */
    }
    return [];
  });

  const [selectedId, setSelectedId] = useState(null);
  const [currentSec, setCurrentSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [showScript, setShowScript] = useState(false);

  const track = TRACKS.find((t) => t.id === selectedId) || null;

  /* persist completed tracks */
  useEffect(() => {
    try {
      localStorage.setItem("oxhListen", JSON.stringify(done));
    } catch {
      /* ignore storage errors */
    }
  }, [done]);

  /* simulated playback tick — advances currentSec to the track length */
  useEffect(() => {
    if (!playing || !selectedId) return;
    const t = TRACKS.find((x) => x.id === selectedId);
    if (!t) return;
    const id = setInterval(() => {
      setCurrentSec((s) => (s + 1 >= t.sec ? t.sec : s + 1));
    }, 300);
    return () => clearInterval(id);
  }, [playing, selectedId]);

  /* stop + mark 完了 when the simulated player reaches the end */
  useEffect(() => {
    if (!playing || !selectedId) return;
    const t = TRACKS.find((x) => x.id === selectedId);
    if (!t) return;
    if (currentSec >= t.sec) {
      setPlaying(false);
      setDone((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
    }
  }, [currentSec, playing, selectedId]);

  function openTrack(t) {
    setSelectedId(t.id);
    setCurrentSec(0);
    setPlaying(false);
    setSpeed(1.0);
    setShowScript(false);
  }

  function backToList() {
    setPlaying(false);
    setSelectedId(null);
  }

  function togglePlay() {
    if (!track) return;
    if (!playing && currentSec >= track.sec) {
      setCurrentSec(0);
    }
    setPlaying((p) => !p);
  }

  function seek(e) {
    if (!track) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setCurrentSec(Math.round(ratio * track.sec));
  }

  const doneCount = done.length;
  const pct = track ? Math.min(100, (currentSec / track.sec) * 100) : 0;
  const atEnd = track ? currentSec >= track.sec : false;
  const isDone = track ? done.includes(track.id) : false;

  return (
    <div className="oxh-sub oxv-ls">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="oxh-sub-title">リスニング</span>
      </div>

      <div className="oxv-body">
        {!track ? (
          <>
            <div className="oxv-ls-intro">
              <div className="oxv-ls-introtext">
                <span className="oxv-ls-h">英語リスニング</span>
                <span className="oxv-ls-sub">トラックを選んで音声トレーニングを始めましょう。</span>
              </div>
              <div className="oxv-ls-progress">
                <span className="oxv-ls-prognum">{doneCount}<span className="oxv-ls-progslash">/{TRACKS.length}</span></span>
                <span className="oxv-ls-proglabel">完了</span>
              </div>
            </div>

            <div className="oxv-ls-list">
              {TRACKS.map((t) => {
                const tone = levelTone(t.level);
                const fin = done.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={"oxv-ls-card" + (fin ? " is-done" : "")}
                    onClick={() => openTrack(t)}
                  >
                    <span className="oxv-ls-cardicon" aria-hidden="true">
                      {fin ? (
                        <svg viewBox="0 0 24 24">
                          <path d="M5 13l4 4 10-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                    <span className="oxv-ls-cardmain">
                      <span className="oxv-ls-cardtop">
                        <span className="oxv-ls-lvl" style={{ color: tone.c, background: tone.bg }}>{t.level}</span>
                        {fin && <span className="oxv-ls-donetag">完了</span>}
                      </span>
                      <span className="oxv-ls-cardtitle">{t.title}</span>
                    </span>
                    <span className="oxv-ls-carddur">{mmss(t.sec)}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="oxv-ls-player">
            <button type="button" className="oxv-ls-tolist" onClick={backToList}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              一覧へ戻る
            </button>

            <div className="oxv-ls-now">
              <span className="oxv-ls-lvl" style={{ color: levelTone(track.level).c, background: levelTone(track.level).bg }}>{track.level}</span>
              <span className="oxv-ls-nowtitle">{track.title}</span>
              {isDone && (
                <span className="oxv-ls-nowdone">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 13l4 4 10-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  完了済み
                </span>
              )}
            </div>

            <div className="oxv-ls-stage">
              <button
                type="button"
                className={"oxv-ls-play" + (playing ? " is-playing" : "")}
                onClick={togglePlay}
                aria-label={playing ? "一時停止" : "再生"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
                    <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
                  </svg>
                )}
              </button>
              <span className="oxv-ls-playhint">{atEnd ? "もう一度再生" : playing ? "一時停止" : "再生"}</span>
            </div>

            <button type="button" className="oxv-ls-seek" onClick={seek} aria-label="再生位置を変更">
              <span className="oxv-ls-seektrack">
                <span className="oxv-ls-seekfill" style={{ width: pct + "%" }} />
                <span className="oxv-ls-seekhandle" style={{ left: pct + "%" }} />
              </span>
            </button>

            <div className="oxv-ls-times">
              <span className="oxv-ls-time">{mmss(currentSec)}</span>
              <span className="oxv-ls-time is-muted">{mmss(track.sec)}</span>
            </div>

            <div className="oxv-ls-speed">
              <span className="oxv-ls-speedlabel">速度</span>
              <div className="oxv-ls-speedrow">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={"oxv-ls-speedbtn" + (speed === s ? " is-on" : "")}
                    onClick={() => setSpeed(s)}
                  >
                    {s.toFixed(2).replace(/0$/, "")}x
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={"oxv-ls-scripttoggle" + (showScript ? " is-open" : "")}
              onClick={() => setShowScript((v) => !v)}
              aria-expanded={showScript}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM14 4v5h5M8 13h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showScript ? "スクリプトを隠す" : "スクリプトを表示"}
            </button>

            {showScript && (
              <div className="oxv-ls-script">
                {track.script.map((line, i) => (
                  <p key={i} className="oxv-ls-line">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
