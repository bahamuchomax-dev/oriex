import { useEffect, useRef, useState, useCallback } from "react";
import { loadBookOptions, createBookLogFromTimer } from "../books/booksApi.js";
import {
  formatHMS,
  minutesToSave,
  secondsToMinutes,
  todayStr,
  loadTimerState,
  saveTimerState,
  clearTimerState,
} from "./timerUtils.js";

// Book-specific study timer. Seconds live in local state / localStorage only;
// Firestore (bookLogs) is written once, on "finish & save".
export default function Timer({ uid, profile, navigate }) {
  const user = { uid, name: profile?.name ?? "" };

  const [options, setOptions] = useState([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [optsError, setOptsError] = useState(null);

  // Working timer state (seeded from any saved temp state).
  const [t, setT] = useState(() => {
    const s = loadTimerState(uid);
    return s || { bookId: "", memo: "", accumSeconds: 0, running: false, lastStart: null };
  });
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const intervalRef = useRef(null);

  // Load book options when the screen opens (never at login). No onSnapshot.
  useEffect(() => {
    let active = true;
    setLoadingOpts(true);
    setOptsError(null);
    loadBookOptions()
      .then((opts) => active && setOptions(opts))
      .catch((e) => { console.error("loadBookOptions failed", e); active && setOptsError(e); })
      .finally(() => active && setLoadingOpts(false));
    return () => { active = false; };
  }, []);

  // Persist working state on every transition (NOT every tick).
  useEffect(() => { saveTimerState(uid, t); }, [uid, t]);

  // 1-second display tick — only while running. Cleaned up on unmount / pause.
  useEffect(() => {
    if (!t.running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [t.running]);

  const elapsed =
    t.running && t.lastStart ? t.accumSeconds + (now - t.lastStart) / 1000 : t.accumSeconds;

  const update = useCallback((patch) => setT((prev) => ({ ...prev, ...patch })), []);

  function start() {
    if (!t.bookId) { setFlash({ type: "warn", text: "参考書を選択してください" }); return; }
    if (t.running) return;
    setFlash(null);
    setNow(Date.now());
    update({ running: true, lastStart: Date.now() });
  }

  function pause() {
    if (!t.running) return;
    const add = t.lastStart ? (Date.now() - t.lastStart) / 1000 : 0;
    update({ running: false, lastStart: null, accumSeconds: t.accumSeconds + add });
  }

  function reset() {
    update({ running: false, lastStart: null, accumSeconds: 0 });
    setFlash(null);
  }

  async function finish() {
    // settle elapsed first
    const total = t.running && t.lastStart
      ? t.accumSeconds + (Date.now() - t.lastStart) / 1000
      : t.accumSeconds;
    const minutes = minutesToSave(total);

    if (minutes === 0) { setFlash({ type: "warn", text: "計測時間がありません" }); return; }
    if (!uid) { setFlash({ type: "err", text: "ログイン情報がありません" }); return; }
    if (total < 60) {
      if (!window.confirm("1分未満です。1分として記録しますか？")) return;
    }
    const book = options.find((b) => b.bookId === t.bookId);
    if (!book) { setFlash({ type: "err", text: "参考書が選択されていません" }); return; }

    setSaving(true);
    setFlash(null);
    try {
      await createBookLogFromTimer(
        {
          bookId: book.bookId,
          bookTitle: book.title,
          subject: book.subject,
          minutes,
          memo: t.memo,
          studiedAt: todayStr(),
        },
        user
      );
      // success: reset elapsed/memo but keep the selected book
      const keptBook = t.bookId;
      const cleared = { bookId: keptBook, memo: "", accumSeconds: 0, running: false, lastStart: null };
      setT(cleared);
      clearTimerState(uid);
      saveTimerState(uid, cleared);
      setFlash({ type: "ok", text: `${minutes}分を記録しました` });
    } catch (e) {
      console.error("createBookLogFromTimer failed", e);
      setFlash({ type: "err", text: "記録の保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ox-screen">
      <h2 className="ox-screen-title">タイマー</h2>

      {/* book picker */}
      {loadingOpts ? (
        <div className="ox-empty"><p>参考書を読み込み中…</p></div>
      ) : optsError ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">⚠️</div>
          <p>参考書の読み込みに失敗しました。</p>
          <p className="ox-empty-sub">通信状態を確認して、もう一度お試しください。</p>
        </div>
      ) : options.length === 0 ? (
        <div className="ox-empty">
          <div className="ox-empty-icon">📚</div>
          <p>先に参考書を登録してください。</p>
          <p className="ox-empty-sub">「参考書」画面で教材を追加すると、ここで計測できます。</p>
          {navigate && (
            <button className="ox-button-primary" style={{ marginTop: 12 }} onClick={() => navigate("books")}>
              参考書を登録する
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="ox-card timer-setup">
            <label className="field">
              <span>参考書</span>
              <select
                value={t.bookId}
                disabled={t.running}
                onChange={(e) => update({ bookId: e.target.value })}
              >
                <option value="">— 選択 —</option>
                {options.map((b) => (
                  <option key={b.bookId} value={b.bookId}>
                    {b.title}{b.subject ? `（${b.subject}）` : ""}{b.level ? ` / ${b.level}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>学習メモ（任意）</span>
              <input value={t.memo} onChange={(e) => update({ memo: e.target.value })} placeholder="例: 第3章" />
            </label>
          </div>

          <div className="ox-card timer-display">
            <div className={"timer-time" + (t.running ? " running" : "")}>{formatHMS(elapsed)}</div>
            <div className="timer-min">{secondsToMinutes(elapsed)} 分</div>
          </div>

          {flash && <div className={"timer-flash " + flash.type}>{flash.text}</div>}

          <div className="timer-controls">
            {!t.running ? (
              <button className="ox-button-primary big" onClick={start}>
                {t.accumSeconds > 0 ? "再開" : "開始"}
              </button>
            ) : (
              <button className="ox-button-soft big" onClick={pause}>一時停止</button>
            )}
            <button className="ox-button-soft" onClick={reset} disabled={t.accumSeconds === 0 && !t.running}>
              リセット
            </button>
          </div>

          <button
            className="ox-button-primary finish-btn"
            onClick={finish}
            disabled={saving || (t.accumSeconds === 0 && !t.running)}
          >
            {saving ? "保存中…" : "終了して記録"}
          </button>
        </>
      )}
    </section>
  );
}
