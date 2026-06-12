// Settings (v7.22-style, SAFE). Consolidated, read-mostly settings/info screen.
// No auth changes, no Firestore writes, no storage migration here — this is a
// tidy entry point that links to the existing edit flow and shows app info.

const APP_VERSION = "v7.22";

export default function Settings({ profile, navigate, onSignOut }) {
  const name = profile?.name || "ゲスト";
  const role = profile?.isTeacher ? "先生" : "生徒";

  return (
    <section className="settings-screen ox-screen">
      <div className="hamster-titlebar">
        <button className="btn-link" onClick={() => navigate?.("profile")}>‹ マイ</button>
        <h2 className="ox-screen-title" style={{ margin: 0 }}>設定</h2>
        <span />
      </div>

      <div className="ox-card settings-account">
        <div className="settings-account-avatar" aria-hidden="true">{profile?.avatar || "🙂"}</div>
        <div className="settings-account-text">
          <strong>{name}</strong>
          <small>{role}モード</small>
        </div>
        <button className="ox-button-soft" onClick={() => navigate?.("profile")}>
          編集
        </button>
      </div>

      <ul className="ox-card-list settings-list">
        <li className="ox-card settings-row">
          <span className="settings-row-label">ハムスターの名前</span>
          <span className="settings-row-value">{profile?.hamsterName || "ハムスター"}</span>
        </li>
        <li className="ox-card settings-row">
          <span className="settings-row-label">ハムスターのへや</span>
          <button className="btn-link" onClick={() => navigate?.("hamster")}>ひらく ›</button>
        </li>
        <li className="ox-card settings-row">
          <span className="settings-row-label">記録</span>
          <button className="btn-link" onClick={() => navigate?.("records")}>ひらく ›</button>
        </li>
        <li className="ox-card settings-row">
          <span className="settings-row-label">バージョン</span>
          <span className="settings-row-value">{APP_VERSION}</span>
        </li>
        <li className="ox-card settings-row">
          <span className="settings-row-label">データの保存</span>
          <span className="settings-row-value">復習・マイワードは端末内に保存</span>
        </li>
      </ul>

      <p className="settings-note">
        通知・テーマなどの詳細設定は次フェーズで追加予定です。
      </p>

      <button className="ox-button-danger big" style={{ marginTop: 8 }} onClick={onSignOut}>
        ログアウト
      </button>
    </section>
  );
}
