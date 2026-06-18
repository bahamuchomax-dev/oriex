import "./friends.css";
import { useState, useEffect } from "react";
import { useStudy, weekSeries, fmtMinutes } from "../studyStore.js";
import Labo from "./labo/Labo.jsx";

/* ============================================================
 * FriendsView — ひろば (social / leaderboard, demo)
 * ------------------------------------------------------------
 * Two tabs:
 *   1) ランキング — this-week study-time leaderboard. Eight rows; the
 *      current user "ヒカリ" is live (weekSeries from useStudy) and
 *      highlighted. Top 3 get colored svg medals (no emoji).
 *   2) フレンド — friends list (avatar initial, online dot, 連続日数)
 *      plus a 友だちを追加 button that reveals an invite-code card.
 * Self-contained demo data; only the user's own row reads the store.
 * Own localStorage keys: oxhFriendsTab / oxhFriendsInvite (try/catch).
 * Every selector in friends.css is prefixed with .oxv-fr; chrome
 * (.oxh-sub / .oxh-sub-head / .oxh-back / .oxh-sub-title / .oxv-body)
 * and tokens (--red/--blue/--gold/...) come from globals.
 * ============================================================ */

const TAB_KEY = "oxhFriendsTab";
const INVITE_KEY = "oxhFriendsInvite";

// --- demo rosters (deterministic, no RNG) ----------------------------------
const RIVALS = [
  { name: "リク", min: 1180, color: "#e8273c" },
  { name: "アオイ", min: 965, color: "#3f8dff" },
  { name: "ソウタ", min: 840, color: "#9a6bff" },
  { name: "ミオ", min: 695, color: "#2bd47e" },
  { name: "ハルト", min: 560, color: "#ffb020" },
  { name: "ユイ", min: 470, color: "#ff6fa5" },
  { name: "ナナ", min: 355, color: "#36c5d6" },
];

const FRIENDS = [
  { name: "リク", streak: 24, online: true, color: "#e8273c" },
  { name: "アオイ", streak: 18, online: true, color: "#3f8dff" },
  { name: "ソウタ", streak: 12, online: false, color: "#9a6bff" },
  { name: "ミオ", streak: 9, online: true, color: "#2bd47e" },
  { name: "ハルト", streak: 6, online: false, color: "#ffb020" },
  { name: "ユイ", streak: 3, online: false, color: "#ff6fa5" },
  { name: "ナナ", streak: 1, online: true, color: "#36c5d6" },
];

// --- inline svg icons (no emoji) -------------------------------------------
const IcTrophy = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M10 14v3M14 14v3M8 20h8M9.4 20l.6-3M14.6 20l-.6-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcPeople = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.6 19c.7-3 3-4.6 5.4-4.6S13.7 16 14.4 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 5.6a3 3 0 0 1 0 5.4M17.6 19c-.3-1.6-1-2.9-2-3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcFlame = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c.6 2.6 2.6 3.9 3.5 5.7.8 1.5 1 3.2.2 4.9a4.7 4.7 0 0 1-8.9-.7c-.4-1.9.3-3.4 1.3-4.5.2 1.3 1 2 1.7 2.2.6-2.5-.3-5.1 2.2-7.6z" fill="currentColor" />
  </svg>
);
const IcAdd = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.6 19c.6-2.9 2.8-4.5 5.4-4.5 1 0 1.9.2 2.7.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M18 13.5v5M15.5 16h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
const IcCopy = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcCheck = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcLabo = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.5 3.5v5.2L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3l-4.3-8.3V3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8.5 3.5h7M7.6 14.5h8.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// top-3 colored medal (svg + rank number, no emoji)
const MEDAL = {
  1: { face: "#ffd36e", edge: "#c79121", ink: "#4a3408" },
  2: { face: "#d6dcec", edge: "#97a0b6", ink: "#363d4f" },
  3: { face: "#e6a06a", edge: "#b06a37", ink: "#4a2a11" },
};
function Medal({ rank }) {
  const m = MEDAL[rank];
  return (
    <span className="oxv-fr-medal" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M8.6 3l2.4 6M15.4 3l-2.4 6" stroke={m.edge} strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="14.6" r="6.8" fill={m.face} stroke={m.edge} strokeWidth="1.4" />
        <text x="12" y="14.6" textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight="900" fill={m.ink}>{rank}</text>
      </svg>
    </span>
  );
}

// --- persistence helpers (own oxh keys; every access in try/catch) ---------
function readTab() {
  try {
    const v = window.localStorage.getItem(TAB_KEY);
    if (v === "rank" || v === "friends" || v === "labo") return v;
  } catch { /* ignore */ }
  return "rank";
}
function genCode() {
  const cs = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i += 1) s += cs[Math.floor(Math.random() * cs.length)];
  return `ORIEX-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
function readInvite() {
  try {
    const v = window.localStorage.getItem(INVITE_KEY);
    if (v) return v;
  } catch { /* ignore */ }
  const code = genCode();
  try { window.localStorage.setItem(INVITE_KEY, code); } catch { /* ignore */ }
  return code;
}

export default function FriendsView({ onBack }) {
  const st = useStudy();
  const [tab, setTab] = useState(readTab);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invite] = useState(readInvite);

  // reset the "copied" confirmation after a moment (clean deps, no plugin refs)
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const pickTab = (t) => {
    setTab(t);
    try { window.localStorage.setItem(TAB_KEY, t); } catch { /* ignore */ }
  };

  const copyCode = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(invite);
      }
    } catch { /* ignore */ }
    setCopied(true);
  };

  // live this-week minutes for the user's own row
  const myWeek = weekSeries(st).reduce((a, d) => a + d.minutes, 0);
  const board = [...RIVALS, { name: "ヒカリ", min: myWeek, color: "var(--blue)", me: true }]
    .sort((a, b) => b.min - a.min)
    .map((u, i) => ({ ...u, rank: i + 1 }));
  const me = board.find((u) => u.me) || board[0];
  const top = board[0];
  const gap = top.min - me.min;

  return (
    <div className="oxh-sub oxv-fr">
      <div className="oxh-sub-head">
        <button className="oxh-back" onClick={onBack} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="oxh-sub-title">ひろば</span>
      </div>

      <div className="oxv-body">
        {/* tab switch -------------------------------------------------------- */}
        <div className="oxv-fr-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "rank"}
            className={`oxv-fr-tab${tab === "rank" ? " oxv-fr-on" : ""}`}
            onClick={() => pickTab("rank")}
          >
            {IcTrophy}<span>ランキング</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "friends"}
            className={`oxv-fr-tab${tab === "friends" ? " oxv-fr-on" : ""}`}
            onClick={() => pickTab("friends")}
          >
            {IcPeople}<span>フレンド</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "labo"}
            className={`oxv-fr-tab${tab === "labo" ? " oxv-fr-on" : ""}`}
            onClick={() => pickTab("labo")}
          >
            {IcLabo}<span>LABO</span>
          </button>
        </div>

        {tab === "labo" ? (
          <div className="oxv-fr-panel" key="labo">
            <Labo />
          </div>
        ) : tab === "rank" ? (
          <div className="oxv-fr-panel" key="rank">
            {/* your standing -------------------------------------------------- */}
            <div className="oxv-fr-hero">
              <span className="oxv-fr-hero-badge">
                <b>{me.rank}</b><small>位</small>
              </span>
              <div className="oxv-fr-hero-txt">
                <span className="oxv-fr-hero-k">あなたの今週の順位</span>
                <span className="oxv-fr-hero-v">{fmtMinutes(me.min)}</span>
                <span className="oxv-fr-hero-s">
                  {me.rank === 1
                    ? "今週のトップです。この調子で走りきりましょう。"
                    : `1位まであと ${fmtMinutes(gap)}`}
                </span>
              </div>
            </div>

            <div className="oxv-fr-h">
              {IcTrophy}<span>今週のランキング</span><small>毎週月曜リセット</small>
            </div>

            <p className="oxv-fr-demo">※ あなた以外はデモ表示です。フレンドを追加すると実際の順位になります。</p>

            <div className="oxv-fr-list">
              {board.map((u) => (
                <div className={`oxv-fr-row${u.me ? " oxv-fr-row-me" : ""}`} key={u.name}>
                  <span className="oxv-fr-rank">
                    {u.rank <= 3 ? <Medal rank={u.rank} /> : <span className="oxv-fr-num">{u.rank}</span>}
                  </span>
                  <span className="oxv-fr-av" style={{ background: u.color }}>{u.name.slice(0, 1)}</span>
                  <span className="oxv-fr-name">
                    {u.name}
                    {u.me && <i className="oxv-fr-you">あなた</i>}
                  </span>
                  <span className="oxv-fr-min">{fmtMinutes(u.min)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="oxv-fr-panel" key="friends">
            {/* friends header + add ------------------------------------------ */}
            <div className="oxv-fr-fhead">
              <span className="oxv-fr-fcount">フレンド <b>{FRIENDS.length}</b>人</span>
              <button
                type="button"
                className="oxv-fr-add"
                onClick={() => setInviteOpen((o) => !o)}
                aria-expanded={inviteOpen}
              >
                {IcAdd}<span>友だちを追加</span>
              </button>
            </div>

            <p className="oxv-fr-demo">※ 一覧はデモのフレンドです。招待コードでつながると実際のフレンドが表示されます。</p>

            {inviteOpen && (
              <div className="oxv-fr-invite">
                <p className="oxv-fr-invite-t">招待コードを送ろう</p>
                <p className="oxv-fr-invite-s">このコードを友だちに伝えると、ひろばでつながって学習時間を競えます。</p>
                <div className="oxv-fr-code">
                  <span className="oxv-fr-code-v">{invite}</span>
                  <button
                    type="button"
                    className="oxv-fr-copy"
                    onClick={copyCode}
                    disabled={copied}
                  >
                    {copied ? IcCheck : IcCopy}
                    <span>{copied ? "コピー済み" : "コピー"}</span>
                  </button>
                </div>
                <p className="oxv-fr-invite-n">コードは7日間有効です。</p>
              </div>
            )}

            <div className="oxv-fr-list">
              {FRIENDS.map((f) => (
                <div className="oxv-fr-row" key={f.name}>
                  <span className="oxv-fr-av" style={{ background: f.color }}>
                    {f.name.slice(0, 1)}
                    <i className={`oxv-fr-dot${f.online ? " oxv-fr-dot-on" : ""}`} />
                  </span>
                  <span className="oxv-fr-fmeta">
                    <b>{f.name}</b>
                    <small>{f.online ? "オンライン" : "オフライン"}</small>
                  </span>
                  <span className="oxv-fr-streak">
                    {IcFlame}<b>{f.streak}</b><small>日連続</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
