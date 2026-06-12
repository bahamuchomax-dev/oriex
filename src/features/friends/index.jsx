import { useEffect, useState, useCallback } from "react";
import { loadFriends, addFriend, cleanupOrphans } from "./friendsApi.js";
import DMChat from "../dm/index.jsx";

// Friends screen: list + add form + DM. Receives uid and the current user's
// profile (used as the "my card" snapshot when adding friends).
export default function Friends({ uid, profile }) {
  const [friends, setFriends] = useState([]);
  const [orphanUids, setOrphanUids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "add"
  const [selected, setSelected] = useState(null); // friend object -> opens DM

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { friends, orphanUids } = await loadFriends(uid);
      setFriends(friends);
      setOrphanUids(orphanUids);
    } catch (e) {
      console.error("loadFriends failed", e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  // DM view takes over the screen when a friend is selected.
  if (selected) {
    return (
      <DMChat myUid={uid} friend={selected} onBack={() => setSelected(null)} />
    );
  }

  if (view === "add") {
    return (
      <AddFriendForm
        uid={uid}
        profile={profile}
        onDone={async () => { await refresh(); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  return (
    <section>
      <div className="row-between">
        <h2 style={{ margin: 0 }}>フレンド</h2>
        <button className="btn-primary" onClick={() => setView("add")}>＋ 追加</button>
      </div>

      {orphanUids.length > 0 && (
        <div className="notice">
          表示できないフレンドが {orphanUids.length} 件あります（削除済みユーザー）。
          <button
            className="btn-link"
            onClick={async () => {
              await cleanupOrphans(uid, orphanUids);
              await refresh();
            }}
          >
            整理する
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>
      ) : friends.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>まだフレンドがいません。</p>
      ) : (
        <ul className="friend-list">
          {friends.map((f) => (
            <li key={f.uid}>
              <button className="friend-row" onClick={() => setSelected(f)}>
                <span className="friend-avatar" aria-hidden="true">{f.avatar}</span>
                <span className="friend-text">
                  <span className="friend-name">{f.name}</span>
                  <span className="friend-sub">
                    {f.lastMessage ? f.lastMessage : (f.comment || "")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddFriendForm({ uid, profile, onDone, onCancel }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  async function handleAdd() {
    const raw = input.trim();
    if (!raw) return;
    setBusy(true);
    setMsg(null);
    try {
      await addFriend(uid, { name: profile?.name, avatar: profile?.avatar }, raw);
      setMsg({ ok: true, text: "フレンドを追加しました" });
      setTimeout(onDone, 600);
    } catch (e) {
      setMsg({ ok: false, text: e.codeText || "追加に失敗しました" });
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>フレンドを追加</h2>
      <label className="field">
        <span>相手の ID（shortId）または uid</span>
        <input
          value={input}
          placeholder="例: ABC123"
          onChange={(e) => setInput(e.target.value)}
        />
      </label>
      {msg && (
        <p style={{ color: msg.ok ? "var(--good)" : "var(--danger)", fontSize: 13 }}>
          {msg.text}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" onClick={handleAdd} disabled={busy || !input.trim()}>
          {busy ? "追加中…" : "追加"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
      </div>
    </section>
  );
}
