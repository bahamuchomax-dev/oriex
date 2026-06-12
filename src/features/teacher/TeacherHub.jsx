export default function TeacherHub({ profile, isTeacher, navigate }) {
  const name = profile?.name ?? "ゲスト";

  const cards = isTeacher
    ? [
        {
          title: "週計画を送る",
          label: "Weekly Plan",
          body: "生徒ごとに参考書ベースの計画を送信します。",
          icon: "計",
          action: () => navigate?.("plans"),
          tone: "blue",
        },
        {
          title: "先生のオリジナル問題",
          label: "Original",
          body: "問題配信は今後のフェーズで接続します。今回は安全な導線のみです。",
          icon: "問",
          action: null,
          tone: "rose",
        },
        {
          title: "配信単語",
          label: "Vocabulary",
          body: "customVocabularyは読み取り方針を維持し、本体への書き込みは追加していません。",
          icon: "単",
          action: () => navigate?.("vocab"),
          tone: "amber",
        },
        {
          title: "配信ハブ",
          label: "Delivery",
          body: "週計画、単語、問題の入口をまとめたv7.22風のハブです。",
          icon: "配",
          action: null,
          tone: "violet",
        },
      ]
    : [
        {
          title: "先生からの問題",
          label: "Questions",
          body: "配信された問題は今後ここに表示します。",
          icon: "問",
          action: null,
          tone: "rose",
        },
        {
          title: "週計画",
          label: "Weekly Plan",
          body: "先生から届いた週計画と進捗を確認します。",
          icon: "計",
          action: () => navigate?.("plans"),
          tone: "blue",
        },
        {
          title: "配信単語",
          label: "Vocabulary",
          body: "単語帳の共有単語と既読管理を確認します。",
          icon: "単",
          action: () => navigate?.("vocab"),
          tone: "amber",
        },
        {
          title: "Factory",
          label: "Create",
          body: "自分の単語作成と復習導線へ移動します。",
          icon: "F",
          action: () => navigate?.("factory"),
          tone: "violet",
        },
      ];

  return (
    <section className="teacher-hub-screen">
      <div className="teacher-hub-hero">
        <span className="section-chip">Teacher Delivery</span>
        <h2>{isTeacher ? "先生ハブ" : "先生からの配信"}</h2>
        <p>{name} さん向けの週計画、配信問題、配信単語の入口です。</p>
      </div>

      <div className="teacher-hub-grid">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            className={`teacher-hub-card tone-${card.tone}`}
            onClick={card.action ?? undefined}
            aria-disabled={!card.action}
          >
            <span className="teacher-hub-icon" aria-hidden="true">{card.icon}</span>
            <span className="teacher-hub-label">{card.label}</span>
            <strong>{card.title}</strong>
            <span>{card.body}</span>
          </button>
        ))}
      </div>

      <div className="teacher-delivery-note">
        現行の weeklyPlans / sentPlans、customSeen、localStorage 方針を維持したまま、導線だけ整理しています。
      </div>
    </section>
  );
}
