import "./home.css";

// Transparent assets (Vite handles hashing + base path, so GitHub Pages base works)
import bgUrl from "./assets/bg.webp";
import heroUrl from "./assets/hero.webp";
import avatarUrl from "./assets/avatar.webp";
import chibiUrl from "./assets/chibi.webp";
import bagUrl from "./assets/bag.webp";
import shakerUrl from "./assets/shaker.webp";

/* ============================================================
 * Home — Oriex dashboard (mockup-faithful rebuild)
 * ------------------------------------------------------------
 * Pure presentational layout that matches the design 1:1.
 * All numbers come from props with mockup-matching fallbacks, so it
 * renders identically out of the box and you can wire real data later:
 *   - profile: { name, level, expPct, totalLabel, totalSub, streak, streakSub }
 *   - week:    [{ label, minutes, today? }]   (7 items)  + avgLabel
 *   - plan:    [{ name, min, done }]          + planDone / planTotal
 *   - goal:    { current, target }
 * Navigation: onOpen(key) is called for nav tabs + tool tiles. Map the
 * keys to your existing routes in App.jsx (see TOOLS / NAV below).
 * Never reads storage directly; never touches legacy.
 * ============================================================ */

const HS = (
  <svg className="oxh-hs" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4c-2 1.5-3 4-3 7 0 4 3 8 8 8s8-4 8-8c0-3-1-5.5-3-7"
      fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const TOOL_ICONS = {
  note: <path d="M7 4h8l4 4v12H7z" fill="none" /> ,
  vocab: <><rect x="5" y="4" width="14" height="16" rx="2" fill="none" /><path d="M12 4v16" /></>,
  card: <><rect x="3" y="7" width="14" height="11" rx="2" fill="none" /><rect x="7" y="5" width="14" height="11" rx="2" fill="none" /></>,
  quiz: <><rect x="6" y="3" width="12" height="18" rx="2" fill="none" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  exam: <path d="M4 19V9M9 19V5M14 19v-7M19 19V8" strokeLinecap="round" />,
  listen: <><path d="M5 13a7 7 0 0114 0" fill="none" /><rect x="3" y="13" width="4" height="7" rx="1.5" fill="none" /><rect x="17" y="13" width="4" height="7" rx="1.5" fill="none" /></>,
  cal: <><rect x="4" y="5" width="16" height="15" rx="2" fill="none" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  more: <><circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
};

// key = route you navigate to (rename to match your App.jsx tabs)
const TOOLS = [
  { key: "note", label: "ノート", icon: "note", tone: "t-red" },
  { key: "vocab", label: "単語帳", icon: "vocab", tone: "t-blue" },
  { key: "card", label: "暗記カード", icon: "card", tone: "t-purple" },
  { key: "quiz", label: "問題集", icon: "quiz", tone: "t-crim" },
  { key: "exam", label: "模試", icon: "exam", tone: "t-teal" },
  { key: "listen", label: "リスニング", icon: "listen", tone: "t-orange" },
  { key: "calendar", label: "カレンダー", icon: "cal", tone: "t-green" },
  { key: "more", label: "その他", icon: "more", tone: "t-gray" },
];

const NAV = [
  { key: "home", label: "ホーム", icon: <><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></> },
  { key: "timer", label: "タイマー", icon: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></> },
  { key: "records", label: "記録", icon: <path d="M4 20V9M10 20V4M16 20v-8M22 20H2" /> },
  { key: "analysis", label: "分析", icon: <><path d="M12 3a9 9 0 109 9h-9z" /><path d="M12 3v9h9" /></> },
  { key: "profile", label: "マイページ", icon: <path d="M7 5c-1.5 1.4-2.5 3.6-2.5 6 0 4 3 7.5 7.5 7.5s7.5-3.5 7.5-7.5c0-2.4-1-4.6-2.5-6" />, dot: true },
];

const DEMO_WEEK = [
  { label: "月", minutes: 95 }, { label: "火", minutes: 120 }, { label: "水", minutes: 60 },
  { label: "木", minutes: 150 }, { label: "金", minutes: 110 }, { label: "土", minutes: 80 },
  { label: "今日", minutes: 90, today: true },
];
const DEMO_PLAN = [
  { name: "数学：関数とグラフ", min: "120分", done: true },
  { name: "英語：長文読解", min: "90分", done: true },
  { name: "化学：理論化学", min: "60分", done: false },
  { name: "現代文：小説読解", min: "60分", done: false },
  { name: "単語学習（英単語）", min: "30分", done: true },
];

export default function Home({
  profile,
  week = DEMO_WEEK,
  weekAvg = "101分",
  plan = DEMO_PLAN,
  goal = { current: 90, target: 180 },
  onOpen = () => {},
  current = "home",
} = {}) {
  const p = {
    name: "ヒカリ", level: 24, expPct: 63,
    totalMain: "128", totalH: "時間", totalMin: "45", totalUnit: "分",
    totalSub: "（先月比 +18時間）",
    streak: 21, streakSub: "（自己ベスト更新中！）",
    ...(profile || {}),
  };
  const planDone = plan.filter((x) => x.done).length;
  const maxMin = Math.max(...week.map((d) => d.minutes), 1);
  const remain = Math.max(0, goal.target - goal.current);

  return (
    <div className="oxh">
      <div className="oxh-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
      <img className="oxh-hero" src={heroUrl} alt="" />
      <div className="oxh-bag"><img src={bagUrl} alt="" /></div>
      <div className="oxh-shaker"><img src={shakerUrl} alt="" /></div>
      <div className="oxh-brand">ORIEX {HS}</div>

      <div className="oxh-wrap">
        {/* top bar */}
        <div className="oxh-topbar">
          <button className="oxh-tbtn" onClick={() => onOpen("notices")}>
            <i><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 004 0" /></svg></i>
            <span className="oxh-badge">3</span>お知らせ
          </button>
          <button className="oxh-tbtn" onClick={() => onOpen("gift")}>
            <i><svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M4 13h16M12 9v11M12 9c-2-4-6-3-6-1s4 1 6 1 8 1 6-1-4-3-6 1" /></svg></i>
            <span className="oxh-badge">1</span>ギフト
          </button>
          <button className="oxh-tbtn" onClick={() => onOpen("settings")}>
            <i><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1L14.5 3h-5l-.4 2.4a7 7 0 00-1.7 1l-2.3-1-2 3.4L3 11a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1l.4 2.4h5l.4-2.4a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z" /></svg></i>
            設定
          </button>
        </div>

        {/* profile card */}
        <div className="oxh-pcard">
          <div className="oxh-pcard-top">
            <img className="oxh-pcard-av" src={avatarUrl} alt="" />
            <div style={{ flex: 1 }}>
              <div className="oxh-pcard-name">
                {p.name}
                <svg viewBox="0 0 24 24"><path d="M4 20l4-1L19 8l-3-3L5 16z" /></svg>
                {HS}
              </div>
            </div>
          </div>
          <div className="oxh-lvrow">
            <span className="oxh-lv">Lv. {p.level}</span>
            <small>EXP {p.expPct}%</small>
          </div>
          <div className="oxh-exp"><i style={{ width: `${p.expPct}%` }} /></div>
          <div className="oxh-pstats">
            <div className="oxh-pstat">
              <span>累計学習時間</span>
              <div>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M12 2h0M9 2h6" /></svg>
                <b>{p.totalMain}<small>{p.totalH}</small>{p.totalMin}<small>{p.totalUnit}</small></b>
              </div>
              <span className="oxh-sub">{p.totalSub}</span>
            </div>
            <div className="oxh-pstat">
              <span>連続学習日数</span>
              <div><b>🔥{p.streak}<small>日</small></b></div>
              <span className="oxh-sub">{p.streakSub}</span>
            </div>
          </div>
        </div>

        {/* today card */}
        <div className="oxh-today">
          <div className="oxh-today-l">
            <div className="oxh-today-h">{HS}きょうの学習 ✨</div>
            <div className="oxh-today-goal"><span className="oxh-tag">目標</span>{goal.target}分<i className="oxh-today-line" /></div>
            <div className="oxh-today-big">{goal.current} <small>/ {goal.target} 分</small></div>
            <div className="oxh-today-note">目標達成まであと {remain}分！</div>
          </div>
          <button className="oxh-today-btn" onClick={() => onOpen("timer")}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /></svg>
            タイマーを<br />はじめる »
          </button>
        </div>

        {/* greeting */}
        <div className="oxh-greet" onClick={() => onOpen("diary")}>
          <img src={chibiUrl} alt="" />
          <div className="oxh-greet-t">
            <b>おはよう、{p.name}！☀️</b>
            <p>今日もコツコツ積み上げて、理想の自分に近づこう！✨</p>
          </div>
          <span className="oxh-chev">»</span>
        </div>

        {/* two cards */}
        <div className="oxh-grid2">
          <div className="oxh-lcard">
            <div className="oxh-lcard-h">
              <svg viewBox="0 0 24 24"><path d="M4 19V9M9 19V5M14 19v-7M19 19V8" stroke="#e01f2b" strokeWidth="2.2" strokeLinecap="round" /></svg>
              7日間の学習記録<span className="oxh-more" onClick={() => onOpen("records")}>詳細</span>
            </div>
            <div className="oxh-chart">
              {week.map((d) => (
                <div className={`oxh-bar${d.today ? " oxh-bar--today" : ""}`} key={d.label}>
                  <span className="oxh-bar-val">{d.minutes}</span>
                  <i style={{ height: `${Math.round((d.minutes / maxMin) * 100)}%` }} />
                  <span className="oxh-bar-lbl">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="oxh-chart-avg">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="none" stroke="#241d1b" strokeWidth="2" /><path d="M12 9v4l3 2" fill="none" stroke="#241d1b" strokeWidth="2" /></svg>
              7日間の平均 <b>{weekAvg}</b>
            </div>
          </div>

          <div className="oxh-lcard">
            <div className="oxh-lcard-h">
              <svg viewBox="0 0 24 24"><path d="M4 19V9M9 19V5M14 19v-7M19 19V8" stroke="#e01f2b" strokeWidth="2.2" strokeLinecap="round" /></svg>
              今週の予定<span className="oxh-more" onClick={() => onOpen("plans")}>詳細</span>
            </div>
            <div className="oxh-plan">
              {plan.map((it) => (
                <div className={`oxh-pl${it.done ? " oxh-pl--done" : ""}`} key={it.name}>
                  <span className={`oxh-pl-box${it.done ? " oxh-pl-box--on" : ""}`}>
                    {it.done && <svg viewBox="0 0 24 24" className="oxh-ck"><path d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="oxh-pl-name">{it.name}</span>
                  <span className="oxh-pl-min">{it.min}</span>
                </div>
              ))}
            </div>
            <div className="oxh-plan-foot">👑 達成状況 {planDone} / {plan.length}</div>
          </div>
        </div>

        {/* tools */}
        <div className="oxh-tools-h">✨ 学習ツール</div>
        <div className="oxh-tools">
          {TOOLS.map((t) => (
            <button className="oxh-tool" key={t.label} onClick={() => onOpen(t.key)}>
              <span className={`oxh-tool-ico ${t.tone}`}>
                <svg viewBox="0 0 24 24">{TOOL_ICONS[t.icon]}</svg>
              </span>
              <span className="oxh-tool-lbl">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* bottom nav */}
      <nav className="oxh-nav" aria-label="メインナビ">
        {NAV.map((n) => (
          <button key={n.key} className={n.key === current ? "oxh-on" : ""} onClick={() => onOpen(n.key)}>
            {n.dot && <span className="oxh-dot" />}
            <svg viewBox="0 0 24 24">{n.icon}</svg>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
