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
  const [errorText, setErrorText] = useState("");

  const refreshSent = useCallback(async () => {
    try {
      setSent(await loadSentPlans(uid));
    } catch (e) {
      console.error("loadSentPlans failed", e);
      setErrorText(planErrorText(e, "送信履歴の読み込みに失敗しました。"));
    }
  }, [uid]);

  // Reads happen only when this screen opens.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorText("");
      try {
        const [{ friends }, opts] = await Promise.all([loadFriends(uid), loadBookOptions()]);
        if (!active) return;
        setStudents(friends);
        setBookOptions(opts);
        await refreshSent();
      } catch (e) {
        console.error("teacher plans init failed", e);
        if (active) setErrorText(planErrorText(e, "週計画の準備に失敗しました。"));
      } finally {
        active && setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, refreshSent]);

  if (loading) {
    return (
      <div className="ox-empty plan-empty">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <section className="teacher-plans-panel">
      <div className="plans-section-head">
        <span className="section-chip">Teacher</span>
        <h3>送信ボード</h3>
        <p>現行の weeklyPlans / sentPlans 形式のまま、見た目だけv7.22風に整理しています。</p>
      </div>
      {errorText && <p className="plan-message err">{errorText}</p>}
      <SendForm
        teacher={teacher}
        students={students}
        bookOptions={bookOptions}
        onSent={refreshSent}
      />
      <div className="plans-section-head compact">
        <span className="section-chip">History</span>
        <h3>送信履歴</h3>
      </div>
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
    if (!student) {
      setMsg({ ok: false, text: "選択した生徒を確認できませんでした。もう一度選び直してください。" });
      return;
    }
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
      setMsg({ ok: false, text: planErrorText(e, "送信に失敗しました") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="plan-send-card">
      <div className="plan-mini-stats">
        <div className="plan-mini-stat">
          <span>生徒</span>
          <strong>{students.length}</strong>
        </div>
        <div className="plan-mini-stat">
          <span>参考書</span>
          <strong>{bookOptions.length}</strong>
        </div>
        <div className="plan-mini-stat">
          <span>追加教材</span>
          <strong>{items.length}</strong>
        </div>
      </div>

      <div className="plan-form-grid">
        <label className="field">
          <span>生徒を選ぶ</span>
          <select value={studentUid} onChange={(e) => setStudentUid(e.target.value)}>
            <option value="">— 選択 —</option>
            {students.map((s) => (
              <option key={s.uid} value={s.uid}>{s.name}</option>
            ))}
          </select>
        </label>
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
      </div>

      {students.length === 0 && (
        <p className="plan-help">フレンドがいません。先に「フレンド」から生徒を追加してください。</p>
      )}
      {bookOptions.length === 0 && (
        <p className="plan-help">参考書が未登録です。先に「参考書」から登録してください。</p>
      )}

      <div className="plan-form-grid">
        <label className="field">
          <span>課題内容</span>
          <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="例: 第3章を解く" />
        </label>
        <label className="field">
          <span>目標（ページ / 内容）</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例: p.40-72" />
        </label>
      </div>
      <button className="btn-secondary plan-add-btn" onClick={addItem} disabled={bookIdx === ""}>
        ＋ この教材を追加
      </button>

      {items.length > 0 && (
        <ul className="plan-compose-list">
          {items.map((it) => (
            <li key={it.itemId} className="plan-compose-item">
              <div>
                <strong>{it.bookTitle}</strong>
                <span>{it.subject || "教科未設定"}{it.level ? ` / ${it.level}` : ""}</span>
                {(it.taskText || it.target) && <small>{it.taskText} {it.target && `· ${it.target}`}</small>}
              </div>
              <button className="btn-link" onClick={() => removeItem(it.itemId)}>削除</button>
            </li>
          ))}
        </ul>
      )}

      <div className="plan-send-footer">
        <span>期限（送信時）: 次週金曜 = {getNextWeekFriday(new Date())}</span>
        {msg && <span className={`plan-message ${msg.ok ? "ok" : "err"}`}>{msg.text}</span>}
      </div>
      {msg && <p className={`plan-message mobile ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
      <button className="btn-primary plan-send-btn" onClick={handleSend} disabled={busy || !studentUid || items.length === 0}>
        {busy ? "送信中..." : "計画を送信"}
      </button>
    </div>
  );
}

function SentHistory({ sent }) {
  if (sent.length === 0) {
    return (
      <div className="ox-empty plan-empty">
        <p>まだ送信した計画はありません。</p>
        <p className="ox-empty-sub">生徒と教材を選ぶと、ここに進捗つきで履歴が表示されます。</p>
      </div>
    );
  }
  return (
    <ul className="plan-list sent-plan-list">
      {sent.map((p) => {
        // Always recompute from items so display is correct even if summaries are stale/missing.
        const overall = computeOverall(p.items);
        const books = computeBookProgress(p.items);
        return (
          <li key={p.id} className="plan-card sent-plan-card">
            <div className="sent-plan-head">
              <div>
                <span className="plan-kicker">送信先</span>
                <strong>{p.studentName || p.studentUid}</strong>
                <small>{p.weekId} · 期限 {p.dueDate}</small>
              </div>
              <div className="plan-score">
                <strong>{overall}%</strong>
                <span>全体</span>
              </div>
            </div>
            <div className="progress-line plan-total-line">
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
            <div className="plan-card-foot">教材数 {p.items?.length ?? 0}</div>
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

function planErrorText(error, fallback) {
  if (error?.code === "permission-denied") {
    return `${fallback} Firestoreの権限を確認してください。`;
  }
  return fallback;
}
