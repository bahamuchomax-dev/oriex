import { useEffect, useRef, useState } from "react";
import { subscribeMessages, sendMessage } from "./dmApi.js";

// DM screen for one friend. Subscribes to messages on mount and unsubscribes on
// unmount (i.e. only while this screen is open).
export default function DMChat({ myUid, friend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!myUid || !friend?.uid) return;
    const unsub = subscribeMessages(
      myUid,
      friend.uid,
      (msgs) => setMessages(msgs),
      (e) => setErr(e)
    );
    return unsub; // unsubscribe when the DM screen closes
  }, [myUid, friend?.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setErr(null);
    try {
      await sendMessage(myUid, friend.uid, body);
      setText(""); // clear input after sending
    } catch (e) {
      setErr(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="dm-screen">
      <div className="dm-header">
        <button className="btn-back" onClick={onBack}>← 戻る</button>
        <span className="dm-title">{friend.avatar} {friend.name}</span>
      </div>

      <div className="dm-messages">
        {messages.length === 0 && (
          <p className="dm-empty">まだメッセージはありません。</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={"dm-bubble " + (m.senderId === myUid ? "mine" : "theirs")}
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {err && (
        <p style={{ color: "var(--danger)", fontSize: 12, padding: "0 4px" }}>
          通信エラー（{err.code || "error"}）
        </p>
      )}

      <div className="dm-input">
        <input
          value={text}
          placeholder="メッセージを入力"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
        />
        <button className="btn-primary" onClick={handleSend} disabled={sending || !text.trim()}>
          送信
        </button>
      </div>
    </section>
  );
}
