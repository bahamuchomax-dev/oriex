// Home screen. Summary header + cards to the main areas.
// Receives `profile` and `navigate(key)` from App.jsx.

const CARDS = [
  { key: "records", label: "記録", icon: "📝" },
  { key: "plans", label: "週計画", icon: "🗓" },
  { key: "vocab", label: "単語学習", icon: "🔤" },
  { key: "teacher", label: "先生からの問題", icon: "❓" },
  { key: "timer", label: "タイマー", icon: "⏱" },
  { key: "books", label: "参考書", icon: "📚" },
  { key: "friends", label: "フレンド", icon: "💬" },
  { key: "hamster", label: "ハムスターのへや", icon: "🐹" },
  { key: "factory", label: "FACTORY", icon: "🏭" },
  { key: "profile", label: "プロフィール", icon: "👤" },
];

export default function Home({ profile, navigate }) {
  const name = profile?.name ?? "ゲスト";
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const role = profile?.isTeacher ? "先生" : "生徒";

  return (
    <section>
      <div className="home-summary">
        <div className="home-greeting">
          こんにちは、<strong>{name}</strong> さん
          <span className="role-pill">{role}</span>
        </div>
        <div className="home-metrics">
          <div className="metric"><strong>{xp}</strong><span>XP</span></div>
          <div className="metric"><strong>{streak}</strong><span>連続日数</span></div>
        </div>
      </div>

      <div className="card-grid">
        {CARDS.map((c) => (
          <button key={c.key} className="nav-card" onClick={() => navigate(c.key)}>
            <span className="nav-card-icon" aria-hidden="true">{c.icon}</span>
            <span className="nav-card-label">{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
