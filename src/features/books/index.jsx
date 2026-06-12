import { useEffect, useState, useCallback } from "react";
import {
  loadBookShelf,
  loadBookLogsForBook,
  addBook,
  addBookLog,
} from "./booksApi.js";

// Books screen: shelf list + add-book form + per-book logs + add-log form.
// Reads happen only when this screen opens (never at login). Writes only on save.
export default function Books({ uid, profile }) {
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
    return <BookDetail book={selected} owner={owner} onBack={() => setSelected(null)} />;
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
    <section>
      <div className="row-between">
        <h2 style={{ margin: 0 }}>参考書</h2>
        <button className="btn-primary" onClick={() => setView("addBook")}>＋ 追加</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>
      ) : shelf.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>まだ参考書が登録されていません。</p>
      ) : (
        <ul className="book-list">
          {shelf.map((b) => (
            <li key={b.id}>
              <button className="book-row" onClick={() => setSelected(b)}>
                <span className="book-title">{b.title}</span>
                <span className="book-sub">
                  {[b.subject, b.level].filter(Boolean).join(" · ")}
                </span>
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
    <section>
      <h2 style={{ marginTop: 0 }}>参考書を追加</h2>
      <Field label="参考書名"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="教科"><input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="レベル / メモ"><input value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
      {err && <p style={{ color: "var(--danger)", fontSize: 13 }}>保存に失敗しました</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn-primary" onClick={save} disabled={busy || !title.trim()}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
      </div>
    </section>
  );
}

function BookDetail({ book, owner, onBack }) {
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
    <section>
      <div className="dm-header">
        <button className="btn-back" onClick={onBack}>← 戻る</button>
        <span className="dm-title">{book.title}</span>
      </div>
      <p className="book-sub" style={{ marginTop: 0 }}>
        {[book.subject, book.level].filter(Boolean).join(" · ")}
      </p>

      {adding ? (
        <AddLogForm
          book={book}
          owner={owner}
          onDone={async () => { await refresh(); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="btn-primary" onClick={() => setAdding(true)}>記録を追加</button>
      )}

      <h3 style={{ marginTop: 20, marginBottom: 8 }}>記録</h3>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>まだ記録がありません。</p>
      ) : (
        <ul className="log-list">
          {logs.map((l) => (
            <li key={l.id} className="log-row">
              <span className="log-date">{l.studiedAt}</span>
              <span className="log-min">{l.minutes}分</span>
              {l.memo && <span className="log-memo">{l.memo}</span>}
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

  async function save() {
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
    <div className="inline-form">
      <Field label="学習時間（分）"><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      <Field label="学習日"><input type="date" value={studiedAt} onChange={(e) => setStudiedAt(e.target.value)} /></Field>
      <Field label="メモ"><input value={memo} onChange={(e) => setMemo(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "保存中…" : "保存"}</button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
