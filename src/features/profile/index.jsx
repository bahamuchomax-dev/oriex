import { useState } from "react";
import ProfileEdit from "./ProfileEdit.jsx";

// MyPage: shows the current profile as a single card, with an "edit" entry that
// opens the edit screen. (Per the broader plan, editing should happen only from
// the edit screen — not by tapping pieces of the card directly.)
export default function Profile({ profile, uid, onProfileSaved, onSignOut }) {
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <section className="feature-placeholder">
        <h2>マイページ</h2>
        <p>プロフィールを読み込み中…</p>
      </section>
    );
  }

  if (editing) {
    return (
      <ProfileEdit
        profile={profile}
        uid={uid}
        onSaved={(p) => {
          onProfileSaved?.(p);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <section>
      <div className="profile-card" style={{ background: profile.color || "var(--surface)" }}>
        <div className="profile-card-inner">
          <div className="avatar-lg" aria-hidden="true">{profile.avatar || "🙂"}</div>
          <div className="profile-name">
            {profile.name}
            {profile.isTeacher && <span className="badge-teacher">先生</span>}
          </div>
          {profile.comment && <div className="profile-comment">{profile.comment}</div>}
          <div className="profile-stats">
            <div><strong>{profile.xp ?? 0}</strong><span>XP</span></div>
            <div><strong>{profile.streak ?? 0}</strong><span>連続日数</span></div>
            {profile.shortId && <div><strong>{profile.shortId}</strong><span>ID</span></div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button className="btn-primary" onClick={() => setEditing(true)}>
          プロフィールを編集
        </button>
        <button className="btn-secondary" onClick={onSignOut}>
          ログアウト
        </button>
      </div>
    </section>
  );
}
