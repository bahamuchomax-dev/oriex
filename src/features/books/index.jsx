import { useEffect, useState, useCallback } from "react";
import {
  loadBookShelf,
  loadBookLogsForBook,
  addBook,
  addBookLog,
} from "./booksApi.js";

// Books screen: shelf list + add-book form + per-book logs + add-log form.
// Reads happen only when this screen opens (never at login). Writes only on save.
export default function Books({ uid, profile, navigate }) {
  const owner = { uid, name: profile?.name ?? "" };
  const [shelf, setShelf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("shelf"); // "shelf" | "addBook"
  const [selected, setSelected] = useState(null); // book -> detail

  const refreshShelf = useCallback(async () => {
    setLoading(true);
    try {
      setShelf(await loadBookShelf());
    } catch (e) {
      console.error("loadBookShelf failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshShelf(); }, [refreshShelf]);

  if (selected) {
    return <BookDetail book={selected} owner={owner} navigate={navigate} onBack={() => setSelected(null)} />;
  }

  if (view === "addBook") {
    return (
      <AddBookForm
        owner={owner}
        onDone={async () => { await refreshShelf(); setView("shelf"); }}
        onCancel={() => setView("shelf")}
      />
    );
  }

  return (
    <section className="books-screen">
      <div className="books-hero">
        <div>
          <p className="home-kicker">Book Shelf</p>
          <h2>参考書本棚</h2>
          <p>教材と学習ログをまとめて管理します。</p>
        </div>
        <button className="books-hero-action" onClick={() => setView("addBook")}>追加</button>
      </div>

      {loading ? (
        <div className="ox-empty"><p>参考書を読み込み中...</p></div>
      ) : shelf.length === 0 ? (
        <div className="books-empty">
          <div className="ox-empty-icon">本</div>
          <p>まだ参考書が登録されていません。</p>
          <p className="ox-empty-sub">よく使う教材を登録すると、タイマーや勉強時間記録で選べます。</p>
          <button className="ox-button-primary" onClick={() => setView("addBook")}>参考書を追加</button>
        </div>
      ) : (
        <ul className="book-shelf-grid">
          {shelf.map((b) => (
            <li key={b.id}>
              <button className="book-shelf-card" onClick={() => setSelected(b)}>
                <span className="book-cover" aria-hidden="true">{coverInitial(b.title)}</span>
                <span className="book-card-body">
                  <span className="book-title">{b.title || "無題の参考書"}</span>
                  <span className="book-sub">
                    {[b.subject || "未分類", b.level].filter(Boolean).join(" / ")}
                  </span>
                  <span className="book-meta-line">
                    {b.ownerName ? `${b.ownerName} 登録` : "登録者未設定"}
                    {formatDate(b.createdAt) ? ` / ${formatDate(b.createdAt)}` : ""}
                  </span>
                </span>
                <span className="book-card-arrow">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddBookForm({ owner, onDone, onCancel }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await addBook({ title, subject, level }, owner);
      onDone();
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  }

  return (
    <section className="books-screen">
      <div className="books-hero soft">
        <div>
          <p className="home-kicker">Add Book</p>
          <h2>参考書を追加</h2>
          <p>タイマーや参考書ログで使う教材を登録します。</p>
        </div>
      </div>

      <div className="inline-form books-form">
        <Field label="参考書名"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：数学 基礎問題精講" /></Field>
        <Field label="教科"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例：数学" /></Field>
        <Field label="レベル / メモ"><input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="例：高2 / 二次関数" /></Field>
      {err && <p style={{ color: "var(--danger)", fontSize: 13 }}>保存に失敗しました</p>}
      <div className="books-form-actions">
        <button className="btn-primary" onClick={save} disabled={busy || !title.trim()}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
      </div>
      </div>
    </section>
  );
}

function BookDetail({ book, owner, navigate, onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await loadBookLogsForBook(book.id));
    } catch (e) {
      console.error("loadBookLogsForBook failed", e);
    } finally {
      setLoading(false);
    }
  }, [book.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <section className="book-detail-screen">
      <div className="book-detail-hero">
        <button className="btn-back book-back" onClick={onBack}>← 戻る</button>
        <div className="book-detail-cover">{coverInitial(book.title)}</div>
        <div>
          <p className="home-kicker">Book Log</p>
          <h2>{book.title || "無題の参考書"}</h2>
          <p>{[book.subject || "未分類", book.level].filter(Boolean).join(" / ")}</p>
          <p className="book-detail-meta">
            {book.ownerName ? `${book.ownerName} 登録` : "登録者未設定"}
            {formatDate(book.createdAt) ? ` / ${formatDate(book.createdAt)}` : ""}
          </p>
        </div>
      </div>

      <div className="book-detail-actions">
        <button className="ox-button-primary" onClick={() => setAdding(true)}>手動で記録</button>
        {navigate && <button className="ox-button-soft" onClick={() => navigate("timer")}>タイマーへ</button>}
        {navigate && <button className="ox-button-soft" onClick={() => navigate("records")}>勉強時間記録</button>}
      </div>

      {adding && (
        <AddLogForm
          book={book}
          owner={owner}
          onDone={async () => { await refresh(); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="section-head book-log-head">
        <h3>参考書ログ</h3>
        <span>{logs.length}件</span>
      </div>
      {loading ? (
        <div className="ox-empty"><p>記録を読み込み中...</p></div>
      ) : logs.length === 0 ? (
        <div className="books-empty compact">
          <p>まだ記録がありません。</p>
          <p className="ox-empty-sub">タイマーか手動記録で、この参考書の学習ログを残せます。</p>
        </div>
      ) : (
        <ul className="book-log-card-list">
          {logs.map((l) => (
            <li key={l.id} className="book-log-card">
              <div className="book-log-card-head">
                <span className="book-log-icon">分</span>
                <div>
                  <strong>{formatMinutes(l.minutes)}</strong>
                  <span>{formatLogDate(l.studiedAt || l.createdAt)}</span>
                </div>
              </div>
              <div className="book-log-card-body">
                <span className="vocab-tag">{l.subject || book.subject || "未分類"}</span>
                {formatPages(l) && <span className="vocab-tag">{formatPages(l)}</span>}
                <span className="vocab-tag soft">{logSource(l)}</span>
              </div>
              {l.memo && <p className="book-log-memo">メモ：{l.memo}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddLogForm({ book, owner, onDone, onCancel }) {
  const [minutes, setMinutes] = useState("");
  const [memo, setMemo] = useState("");
  const [studiedAt, setStudiedAt] = useState(() => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  });
  const [busy, setBusy] = useState(false);
  const safeMinutes = Math.max(0, Number(minutes) || 0);

  async function save() {
    if (safeMinutes <= 0) return;
    setBusy(true);
    try {
      await addBookLog(
        { bookId: book.id, bookTitle: book.title, subject: book.subject, minutes, memo, studiedAt },
        owner
      );
      onDone();
    } catch (e) {
      console.error("addBookLog failed", e);
      setBusy(false);
    }
  }

  return (
    <div className="inline-form books-form">
      <Field label="学習時間（分）"><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      <Field label="学習日"><input type="date" value={studiedAt} onChange={(e) => setStudiedAt(e.target.value)} /></Field>
      <Field label="メモ"><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例：二次関数の復習" /></Field>
      <div className="books-form-actions">
        <button className="btn-primary" onClick={save} disabled={busy || safeMinutes <= 0}>{busy ? "保存中…" : "保存"}</button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
      </div>
    </div>
  );
}

function coverInitial(title) {
  const text = (title || "本").trim();
  return text.slice(0, 1).toUpperCase();
}

function formatDate(value) {
  const ms = toMillis(value);
  if (!ms) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date(ms));
}

function formatLogDate(value) {
  const ms = toMillis(value);
  if (!ms && typeof value === "string") return value;
  if (!ms) return "日時未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function formatMinutes(minutes) {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours <= 0) return `${mins}分`;
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
}

function formatPages(log) {
  if (log.rangeText) return log.rangeText;
  if (log.pages) return `${log.pages}p`;
  if (log.currentPage && log.totalPages) return `${log.currentPage}/${log.totalPages}p`;
  if (log.currentPage) return `${log.currentPage}p`;
  return "";
}

function logSource(log) {
  if (log.source === "timer" || log.memo?.includes("タイマー")) return "Timer";
  return "Study Log";
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
