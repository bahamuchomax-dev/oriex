import { useEffect, useMemo, useState } from "react";
import StudyDiary from "../studyDiary/index.jsx";
import { loadBookLogs } from "../books/booksApi.js";

const TABS = [
  { key: "study", label: "勉強時間記録" },
  { key: "attendance", label: "現論会登校スタンプ" },
  { key: "calendar", label: "予定カレンダー" },
  { key: "notes", label: "メモ" },
  { key: "timeline", label: "記録タイムライン" },
];

export default function Records({ uid }) {
  const [tab, setTab] = useState("study");

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>記録</h2>

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
        {tab === "study" ? (
          <StudyDiary uid={uid} />
        ) : tab === "timeline" ? (
          <RecordsTimeline uid={uid} />
        ) : (
          <div className="feature-placeholder">
            <h2>{TABS.find((t) => t.key === tab)?.label}</h2>
            <p>未実装です。今後のステージで実装します。</p>
          </div>
        )}
      </div>
    </section>
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
    loadBookLogs({ uid, limitCount: 50 })
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

  if (loading) {
    return (
      <div className="ox-empty">
        <p>記録を読み込み中です...</p>
      </div>
    );
  }

  return (
    <div className="records-timeline">
      {error && (
        <div className="records-timeline-alert">
          参考書ログの読み込みに失敗しました。時間をおいてもう一度開いてください。
        </div>
      )}

      {timelineItems.length === 0 ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">📚</div>
          <p>まだ記録がありません。</p>
          <p className="ox-empty-sub">タイマーや参考書ログから記録すると、ここに表示されます。</p>
        </div>
      ) : (
        <ol className="timeline-list">
          {timelineItems.map((item) => (
            <li className="timeline-card" key={item.id}>
              <div className="timeline-card-head">
                <span className="timeline-icon" aria-hidden="true">📚</span>
                <div>
                  <div className="timeline-title">{item.title}</div>
                  <time className="timeline-date" dateTime={item.studiedAt || undefined}>
                    {formatTimelineDate(item)}
                  </time>
                </div>
              </div>

              <div className="timeline-book-title">{item.bookTitle || "参考書"}</div>
              {item.subject && <div className="timeline-subject">{item.subject}</div>}
              <div className="timeline-minutes">学習時間：{item.minutes}分</div>
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
    source: "timer",
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
