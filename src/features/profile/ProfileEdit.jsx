import { useState } from "react";
import { AVATARS, COLORS, saveProfile } from "./profileApi.js";

// Simple profile editor. Edits name / comment / color / avatar and writes to
// Firestore ONLY when "保存" is pressed (no per-keystroke writes).
export default function ProfileEdit({ profile, uid, onSaved, onCancel }) {
  const [name, setName] = useState(profile.name ?? "");
  const [comment, setComment] = useState(profile.comment ?? "");
  const [color, setColor] = useState(profile.color ?? COLORS[0].value);
  const [avatar, setAvatar] = useState(profile.avatar ?? AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const patch = { name: name.trim() || profile.name, comment, color, avatar };
      const merged = await saveProfile(uid, patch, profile);
      onSaved?.(merged);
    } catch (e) {
      setErr(e);
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>プロフィール編集</h2>

      <label className="field">
        <span>名前</span>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="field">
        <span>一言コメント</span>
        <input value={comment} maxLength={40} onChange={(e) => setComment(e.target.value)} />
      </label>

      <div className="field">
        <span>アイコン</span>
        <div className="choice-row">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={"choice-emoji" + (a === avatar ? " selected" : "")}
              onClick={() => setAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>プロフィールカラー</span>
        <div className="choice-row">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              title={c.label}
              aria-label={c.label}
              className={"choice-color" + (c.value === color ? " selected" : "")}
              style={{ background: c.value }}
              onClick={() => setColor(c.value)}
            />
          ))}
        </div>
      </div>

      {err && (
        <p style={{ color: "var(--danger)", fontSize: 13 }}>
          保存に失敗しました（{err.code || "error"}）。
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          キャンセル
        </button>
      </div>
    </section>
  );
}
