import TeacherPlans from "./TeacherPlans.jsx";
import StudentPlans from "./StudentPlans.jsx";

// Branch by role: teachers get the send UI + history, students get their live
// plans + progress editing.
export default function Plans({ uid, profile, isTeacher, navigate }) {
  const roleTitle = isTeacher ? "週計画を送る" : "先生からの週計画";
  const roleBody = isTeacher
    ? "参考書本棚から教材を選び、生徒ごとの週計画を送信します。"
    : "先生から届いた計画を確認し、教材ごとの進捗だけを保存します。";

  return (
    <section className="plans-screen">
      <div className={`plans-hero ${isTeacher ? "teacher" : "student"}`}>
        <span className="section-chip">Weekly Plan</span>
        <h2>{roleTitle}</h2>
        <p>{roleBody}</p>
      </div>

      <div className="plans-route-grid">
        <button type="button" className="plans-route-card" onClick={() => navigate?.("teacher")}>
          <span>配</span>
          <strong>先生ハブ</strong>
          <small>配信問題・配信単語の入口</small>
        </button>
        <button type="button" className="plans-route-card" onClick={() => navigate?.("books")}>
          <span>本</span>
          <strong>参考書</strong>
          <small>本棚と参考書ログ</small>
        </button>
        <button type="button" className="plans-route-card" onClick={() => navigate?.("vocab")}>
          <span>単</span>
          <strong>配信単語</strong>
          <small>customVocabularyを確認</small>
        </button>
      </div>

      {isTeacher ? (
        <TeacherPlans uid={uid} profile={profile} />
      ) : (
        <StudentPlans uid={uid} />
      )}
    </section>
  );
}
