const QUICK_ACTIONS = [
  { key: "timer", label: "タイマー", sub: "参考書を選んで記録", icon: "時", tone: "red" },
  { key: "records", label: "記録", sub: "タイムラインを見る", icon: "記", tone: "blue" },
  { key: "books", label: "参考書", sub: "本棚とログ", icon: "本", tone: "green" },
  { key: "teacher", label: "配信", sub: "先生ハブと週計画", icon: "配", tone: "amber" },
];

const PALETTE = [
  { key: "vocab", label: "単語帳", icon: "単", grad: "orange" },
  { key: "vocab", label: "復習", icon: "復", grad: "green" },
  { key: "teacher", label: "配信ハブ", icon: "配", grad: "rose" },
  { key: "factory", label: "FACTORY", icon: "F", grad: "violet" },
  { key: "friends", label: "ひろば", icon: "広", grad: "sky" },
  { key: "hamster", label: "育成", icon: "育", grad: "pink" },
  { key: "profile", label: "マイ", icon: "私", grad: "slate" },
  { key: "records", label: "記録ハブ", icon: "録", grad: "cyan" },
  { key: "plans", label: "週計画", icon: "計", grad: "green" },
  { key: "timer", label: "時間記録", icon: "分", grad: "red" },
];

export default function Home({ profile, navigate }) {
  const name = profile?.name ?? "ゲスト";
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const role = profile?.isTeacher ? "先生" : "生徒";

  return (
    <section className="home-v722">
      <div className="home-hero">
        <div>
          <p className="home-kicker">Oriex</p>
          <h1>{name} さん</h1>
          <p className="home-role">{role}モード</p>
        </div>
        <div className="home-clock-card">
          <span>今日</span>
          <strong>{streak}</strong>
          <small>連続日数</small>
        </div>
      </div>

      <div className="today-study-card">
        <div>
          <span className="section-chip">今日の勉強</span>
          <h2>まずは1セット記録</h2>
          <p>タイマーか手動記録から、参考書ログと記録タイムラインへ残せます。</p>
        </div>
        <button className="today-study-action" onClick={() => navigate("timer")}>
          開始
        </button>
      </div>

      <div className="home-stats-row">
        <div className="mini-stat">
          <span>XP</span>
          <strong>{xp}</strong>
        </div>
        <div className="mini-stat">
          <span>この7日間</span>
          <strong>記録</strong>
        </div>
      </div>

      <div className="quick-grid">
        {QUICK_ACTIONS.map((item) => (
          <button
            key={item.key}
            className={`quick-card tone-${item.tone}`}
            onClick={() => navigate(item.key)}
          >
            <span className="quick-icon" aria-hidden="true">{item.icon}</span>
            <span className="quick-label">{item.label}</span>
            <span className="quick-sub">{item.sub}</span>
          </button>
        ))}
      </div>

      <div className="palette-section">
        <div className="section-head">
          <h2>メニュー</h2>
          <span>v7.22 style</span>
        </div>
        <div className="palette-grid">
          {PALETTE.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              className={`palette-tile grad-${item.grad}`}
              onClick={() => navigate(item.key)}
            >
              <span className="palette-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
