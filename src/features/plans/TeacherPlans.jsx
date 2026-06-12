import { useEffect, useState, useCallback } from "react";
import { loadFriends } from "../friends/friendsApi.js";
import { loadBookOptions } from "../books/booksApi.js";
import { sendPlan, loadSentPlans } from "./plansApi.js";
import { newItemId, getNextWeekFriday, computeOverall, computeBookProgress } from "./planUtils.js";

// Teacher plans screen: a send form + sent history with progress.
export default function TeacherPlans({ uid, profile }) {
  const teacher = { uid, name: profile?.name ?? "" };
  const [students, setStudents] = useState([]);
  const [bookOptions, setBookOptions] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshSent = useCallback(async () => {
    try { setSent(await loadSentPlans(uid)); }
    catch (e) { console.error("loadSentPlans failed", e); }
  }, [uid]);

  // Reads happen only when this screen opens.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [{ friends }, opts] = await Promise.all([loadFriends(uid), loadBookOptions()]);
        if (!active) return;
        setStudents(friends);
        setBookOptions(opts);
        await refreshSent();
      } catch (e) {
        console.error("teacher plans init failed", e);
      } finally {
        active && setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [uid, refreshSent]);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>;

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>週計画（先生）</h2>
      <SendForm
        teacher={teacher}
        students={students}
        bookOptions={bookOptions}
        onSent={refreshSent}
      />
      <h3 style={{ marginTop: 24 }}>送信履歴</h3>
      <SentHistory sent={sent} />
    </section>
  );
}

function SendForm({ teacher, students, bookOptions, onSent }) {
  const [studentUid, setStudentUid] = useState("");
  const [items, setItems] = useState([]);
  const [bookIdx, setBookIdx] = useState("");
  const [taskText, setTaskText] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function addItem() {
    if (bookIdx === "") return;
    const b = bookOptions[Number(bookIdx)];
    if (!b) return;
    setItems((prev) => [
      ...prev,
      {
        itemId: newItemId(),
        bookId: b.bookId,
        bookTitle: b.title,
        subject: b.subject,
        level: b.level,
        taskText: taskText.trim(),
        target: target.trim(),
        progressPercent: 0,
      },
    ]);
    setTaskText("");
    setTarget("");
    setBookIdx("");
  }

  function removeItem(itemId) {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId));
  }

  async function handleSend() {
    if (!studentUid || items.length === 0) {
      setMsg({ ok: false, text: "生徒と教材を選んでください" });
      return;
    }
    const student = students.find((s) => s.uid === studentUid);
    setBusy(true);
    setMsg(null);
    try {
      await sendPlan({ teacher, student: { uid: student.uid, name: student.name }, items });
      setItems([]);
      setStudentUid("");
      setMsg({ ok: true, text: "計画を送信しました" });
      onSent?.();
    } catch (e) {
      console.error("sendPlan failed", e);
      setMsg({ ok: false, text: "送信に失敗しました" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-form">
      <label className="field">
        <span>生徒を選ぶ</span>
        <select value={studentUid} onChange={(e) => setStudentUid(e.target.value)}>
          <option value="">— 選択 —</option>
          {students.map((s) => (
            <option key={s.uid} value={s.uid}>{s.name}</option>
          ))}
        </select>
      </label>
      {students.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          フレンドがいません。先に「フレンド」から生徒を追加してください。
        </p>
      )}

      <div className="field">
        <span>教材を追加（参考書本棚から）</span>
        <select value={bookIdx} onChange={(e) => setBookIdx(e.target.value)}>
          <option value="">— 参考書を選択 —</option>
          {bookOptions.map((b, i) => (
            <option key={b.bookId} value={i}>
              {b.title}{b.subject ? `（${b.subject}）` : ""}{b.level ? ` / ${b.level}` : ""}
            </option>
          ))}
        </select>
      </div>
      {bookOptions.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          参考書が未登録です。先に「参考書」から登録してください。
        </p>
      )}
      <label className="field">
        <span>課題内容</span>
        <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="例: 第3章を解く" />
      </label>
      <label className="field">
        <span>目標（ページ / 内容）</span>
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例: p.40-72" />
      </label>
      <button className="btn-secondary" onClick={addItem} disabled={bookIdx === ""}>
        ＋ この教材を追加
      </button>

      {items.length > 0 && (
        <ul className="plan-item-list" style={{ marginTop: 12 }}>
          {items.map((it) => (
            <li key={it.itemId} className="plan-item">
              <div>
                <strong>{it.bookTitle}</strong>
                <span className="book-sub"> {it.taskText} {it.target && `· ${it.target}`}</span>
              </div>
              <button className="btn-link" onClick={() => removeItem(it.itemId)}>削除</button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        期限（送信時）: 次週金曜 = {getNextWeekFriday(new Date())}
      </p>
      {msg && (
        <p style={{ color: msg.ok ? "var(--good)" : "var(--danger)", fontSize: 13 }}>{msg.text}</p>
      )}
      <button className="btn-primary" onClick={handleSend} disabled={busy || !studentUid || items.length === 0}>
        {busy ? "送信中…" : "計画を送信"}
      </button>
    </div>
  );
}

function SentHistory({ sent }) {
  if (sent.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>まだ送信した計画はありません。</p>;
  }
  return (
    <ul className="plan-list">
      {sent.map((p) => {
        // Always recompute from items so display is correct even if summaries are stale/missing.
        const overall = computeOverall(p.items);
        const books = computeBookProgress(p.items);
        return (
          <li key={p.id} className="plan-card">
            <div className="row-between">
              <strong>{p.studentName || p.studentUid}</strong>
              <span className="book-sub">{p.weekId} · 期限 {p.dueDate}</span>
            </div>
            <div className="progress-line">
              <span>全体進捗</span>
              <ProgressBar value={overall} />
              <span className="pct">{overall}%</span>
            </div>
            <div className="book-progress">
              {books.map((b) => (
                <div className="progress-line sub" key={b.bookId || b.bookTitle}>
                  <span className="book-name">{b.bookTitle}</span>
                  <ProgressBar value={b.progressPercent} />
                  <span className="pct">{b.progressPercent}%</span>
                </div>
              ))}
            </div>
            <div className="book-sub">教材数 {p.items?.length ?? 0}</div>
          </li>
        );
      })}
    </ul>
  );
}

function ProgressBar({ value }) {
  return (
    <span className="bar"><span className="bar-fill" style={{ width: `${value}%` }} /></span>
  );
}
