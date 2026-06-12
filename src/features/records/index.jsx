import { useEffect, useMemo, useState } from "react";
import StudyDiary from "../studyDiary/index.jsx";
import { addBookLog, loadBookLogs, loadBookOptions } from "../books/booksApi.js";

const TABS = [
  { key: "hub", label: "記録ハブ" },
  { key: "studyTime", label: "勉強時間記録" },
  { key: "timeline", label: "記録タイムライン" },
  { key: "diary", label: "学習日誌" },
  { key: "calendar", label: "予定" },
];

export default function Records({ uid, profile, navigate }) {
  const [tab, setTab] = useState("hub");

  return (
    <section className="records-screen">
      <div className="records-title-block">
        <p className="home-kicker">Records</p>
        <h2>記録</h2>
        <p>勉強時間、参考書ログ、日誌をまとめて確認できます。</p>
      </div>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={"tab" + (t.key === tab ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tab === "hub" && <RecordHub navigate={navigate} setTab={setTab} />}
        {tab === "studyTime" && <BookLogApp uid={uid} profile={profile} navigate={navigate} />}
        {tab === "timeline" && <RecordsTimeline uid={uid} />}
        {tab === "diary" && <StudyDiary uid={uid} />}
        {tab === "calendar" && (
          <div className="feature-placeholder">
            <h2>予定カレンダー</h2>
            <p>v7.22 の予定・出席まわりは次フェーズで段階的に寄せます。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function RecordHub({ navigate, setTab }) {
  const cards = [
    {
      label: "勉強時間記録",
      sub: "参考書ごとに手動で記録",
      icon: "分",
      action: () => setTab("studyTime"),
      tone: "red",
    },
    {
      label: "記録タイムライン",
      sub: "bookLogsを新しい順に表示",
      icon: "線",
      action: () => setTab("timeline"),
      tone: "blue",
    },
    {
      label: "参考書ログ",
      sub: "本棚と過去ログ",
      icon: "本",
      action: () => navigate?.("books"),
      tone: "green",
    },
    {
      label: "タイマー",
      sub: "終了時だけ1件保存",
      icon: "時",
      action: () => navigate?.("timer"),
      tone: "amber",
    },
    {
      label: "学習日誌",
      sub: "週ごとの振り返り",
      icon: "日",
      action: () => setTab("diary"),
      tone: "violet",
    },
  ];

  return (
    <div className="record-hub-grid">
      {cards.map((card) => (
        <button
          key={card.label}
          className={`record-hub-card tone-${card.tone}`}
          onClick={card.action}
        >
          <span className="record-hub-icon" aria-hidden="true">{card.icon}</span>
          <span className="record-hub-label">{card.label}</span>
          <span className="record-hub-sub">{card.sub}</span>
        </button>
      ))}
    </div>
  );
}

function BookLogApp({ uid, profile, navigate }) {
  const owner = { uid, name: profile?.name ?? "" };
  const [books, setBooks] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState(() => ({
    bookId: "",
    minutes: "30",
    memo: "",
    studiedAt: localDate(),
  }));

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setFlash(null);
      try {
        const [bookOptions, logs] = await Promise.all([
          loadBookOptions(),
          loadBookLogs({ uid, limitCount: 12 }),
        ]);
        if (!active) return;
        setBooks(bookOptions);
        setRecentLogs(logs);
        if (!form.bookId && bookOptions.length > 0) {
          setForm((current) => ({ ...current, bookId: current.bookId || bookOptions[0].bookId }));
        }
      } catch (e) {
        console.error("load book log app failed", e);
        if (active) setFlash({ type: "err", text: "読み込みに失敗しました。" });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [uid]);

  const selectedBook = books.find((book) => book.bookId === form.bookId);
  const minutes = Math.max(0, Number(form.minutes) || 0);

  async function saveLog() {
    if (!selectedBook || minutes <= 0) return;
    setSaving(true);
    setFlash(null);
    try {
      await addBookLog(
        {
          bookId: selectedBook.bookId,
          bookTitle: selectedBook.title,
          subject: selectedBook.subject,
          minutes,
          memo: form.memo,
          studiedAt: form.studiedAt,
        },
        owner
      );
      setForm((current) => ({ ...current, minutes: "30", memo: "", studiedAt: localDate() }));
      setRecentLogs(await loadBookLogs({ uid, limitCount: 12 }));
      setFlash({ type: "ok", text: "勉強時間を記録しました。" });
    } catch (e) {
      console.error("addBookLog failed", e);
      setFlash({ type: "err", text: "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="book-log-app">
      <div className="book-log-hero">
        <div>
          <span className="section-chip">勉強時間記録</span>
          <h3>参考書ごとに勉強時間を記録</h3>
          <p>保存先は Timer と同じ public/data/bookLogs です。</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate?.("timer")}>
          タイマーへ
        </button>
      </div>

      {flash && <p className={`timer-flash ${flash.type}`}>{flash.text}</p>}

      {loading ? (
        <div className="ox-empty">
          <p>読み込み中...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">本</div>
          <p>参考書がまだありません。</p>
          <p className="ox-empty-sub">先に本棚へ参考書を登録してください。</p>
          <button className="ox-button-primary" onClick={() => navigate?.("books")}>
            参考書を登録
          </button>
        </div>
      ) : (
        <>
          <div className="inline-form study-time-form">
            <Field label="参考書">
              <select
                value={form.bookId}
                onChange={(e) => setForm((current) => ({ ...current, bookId: e.target.value }))}
              >
                {books.map((book) => (
                  <option key={book.bookId} value={book.bookId}>
                    {book.title}
                  </option>
                ))}
              </select>
            </Field>

            <div className="study-time-row">
              <Field label="学習日">
                <input
                  type="date"
                  value={form.studiedAt}
                  onChange={(e) => setForm((current) => ({ ...current, studiedAt: e.target.value }))}
                />
              </Field>
              <Field label="学習時間（分）">
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={form.minutes}
                  onChange={(e) => setForm((current) => ({ ...current, minutes: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="メモ">
              <input
                value={form.memo}
                onChange={(e) => setForm((current) => ({ ...current, memo: e.target.value }))}
                placeholder="例：二次関数の復習"
              />
            </Field>

            <button
              className="ox-button-primary finish-btn"
              onClick={saveLog}
              disabled={saving || !selectedBook || minutes <= 0}
            >
              {saving ? "保存中..." : "終了して記録"}
            </button>
          </div>

          <RecentBookLogs logs={recentLogs} />
        </>
      )}
    </div>
  );
}

function RecentBookLogs({ logs }) {
  if (!logs.length) {
    return (
      <div className="ox-empty compact">
        <p>まだ参考書ログはありません。</p>
      </div>
    );
  }

  return (
    <div className="recent-log-panel">
      <div className="section-head">
        <h3>最近の参考書ログ</h3>
        <span>{logs.length}件</span>
      </div>
      <ol className="recent-log-list">
        {logs.map((log) => (
          <li key={log.id} className="recent-log-card">
            <div>
              <strong>{log.bookTitle || "参考書学習"}</strong>
              <span>{[log.subject, formatDateTime(toMillis(log.studiedAt) || toMillis(log.createdAt))].filter(Boolean).join(" / ")}</span>
            </div>
            <b>{Number(log.minutes) || 0}分</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecordsTimeline({ uid }) {
  const [bookLogs, setBookLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setBookLogs([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    loadBookLogs({ uid, limitCount: 80 })
      .then((logs) => { if (active) setBookLogs(logs); })
      .catch((e) => {
        console.error("loadBookLogs failed", e);
        if (active) {
          setBookLogs([]);
          setError(e);
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [uid]);

  const timelineItems = useMemo(() => {
    return bookLogs
      .map(toBookLogTimelineItem)
      .filter((item) => item.dateMs > 0)
      .sort((a, b) => b.dateMs - a.dateMs);
  }, [bookLogs]);

  const totalMinutes = timelineItems.reduce((sum, item) => sum + item.minutes, 0);

  if (loading) {
    return (
      <div className="ox-empty">
        <p>記録を読み込み中です...</p>
      </div>
    );
  }

  return (
    <div className="records-timeline">
      <div className="timeline-summary">
        <div>
          <span>記録数</span>
          <strong>{timelineItems.length}</strong>
        </div>
        <div>
          <span>合計</span>
          <strong>{formatMinutes(totalMinutes)}</strong>
        </div>
      </div>

      {error && (
        <div className="records-timeline-alert">
          参考書ログの読み込みに失敗しました。時間をおいてもう一度開いてください。
        </div>
      )}

      {timelineItems.length === 0 ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">記</div>
          <p>まだ記録がありません。</p>
          <p className="ox-empty-sub">タイマーや勉強時間記録から保存すると、ここに表示されます。</p>
        </div>
      ) : (
        <ol className="timeline-list">
          {timelineItems.map((item) => (
            <li className="timeline-card v722" key={item.id}>
              <div className="timeline-card-head">
                <span className="timeline-icon" aria-hidden="true">本</span>
                <div>
                  <div className="timeline-title">{item.title}</div>
                  <time className="timeline-date" dateTime={item.studiedAt || undefined}>
                    {formatTimelineDate(item)}
                  </time>
                </div>
              </div>

              <div className="timeline-book-title">{item.bookTitle || "参考書名未設定"}</div>
              {item.subject && <div className="timeline-subject">{item.subject}</div>}
              <div className="timeline-minutes">学習時間：{formatMinutes(item.minutes)}</div>
              {item.memo && <div className="timeline-memo">メモ：{item.memo}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function toBookLogTimelineItem(log) {
  const dateMs = toMillis(log.studiedAt) || toMillis(log.createdAt);
  return {
    id: `bookLog-${log.id}`,
    type: "bookLog",
    title: "参考書学習",
    bookTitle: log.bookTitle ?? "",
    subject: log.subject ?? "",
    minutes: Number(log.minutes) || 0,
    memo: log.memo ?? "",
    studiedAt: log.studiedAt ?? null,
    createdAt: log.createdAt ?? null,
    dateMs,
    source: "bookLogs",
  };
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

function formatTimelineDate(item) {
  if (typeof item.studiedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.studiedAt)) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
    }).format(new Date(`${item.studiedAt}T00:00:00`));
  }
  return formatDateTime(item.dateMs);
}

function formatDateTime(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function formatMinutes(minutes) {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours <= 0) return `${mins}分`;
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
}

function localDate() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
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
