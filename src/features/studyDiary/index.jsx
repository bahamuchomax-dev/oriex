import { useEffect, useState, useCallback } from "react";
import { EMPTY_WEEK, loadWeek, saveWeek } from "./studyDiaryApi.js";
import {
  mondayOf,
  shiftWeeks,
  weekIdFromDate,
  weekRangeLabel,
} from "./weekId.js";

const DAY_KEYS = [
  ["mon", "月"], ["tue", "火"], ["wed", "水"], ["thu", "木"],
  ["fri", "金"], ["sat", "土"], ["sun", "日"],
];

// save status: "idle" | "dirty" | "saving" | "saved" | "error"
export default function StudyDiary({ uid }) {
  const [refDate, setRefDate] = useState(() => mondayOf(new Date()));
  const weekId = weekIdFromDate(refDate);

  const [form, setForm] = useState({ ...EMPTY_WEEK, days: { ...EMPTY_WEEK.days } });
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");

  // Load the selected week (1 getDoc). Re-runs only when the week changes.
  useEffect(() => {
    let active = true;
    if (!uid) return;
    setLoading(true);
    setStatus("idle");
    loadWeek(uid, weekId)
      .then(({ data, exists }) => {
        if (!active) return;
        setForm(data);
        setExists(exists);
      })
      .catch((e) => active && (console.error("loadWeek failed", e), setStatus("error")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [uid, weekId]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("dirty");
  }, []);

  const setDay = useCallback((dayKey, value) => {
    setForm((f) => ({ ...f, days: { ...f.days, [dayKey]: value } }));
    setStatus("dirty");
  }, []);

  async function handleSave() {
    setStatus("saving");
    try {
      await saveWeek(uid, weekId, form, !exists); // createdAt only when new
      setExists(true);
      setStatus("saved");
    } catch (e) {
      console.error("saveWeek failed", e);
      setStatus("error");
    }
  }

  function goWeek(n) { setRefDate((d) => mondayOf(shiftWeeks(d, n))); }
  function goThisWeek() { setRefDate(mondayOf(new Date())); }

  return (
    <div>
      {/* Week switcher */}
      <div className="week-bar">
        <button className="btn-secondary" onClick={() => goWeek(-1)}>← 前週</button>
        <div className="week-current">
          <div className="week-id">{weekId}</div>
          <div className="week-range">{weekRangeLabel(refDate)}</div>
        </div>
        <button className="btn-secondary" onClick={() => goWeek(1)}>次週 →</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <button className="btn-link" onClick={goThisWeek}>今週へ戻る</button>
      </div>

      <SaveStatus status={status} />

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>
      ) : (
        <>
          <TextField label="今週の目標" value={form.goal} onChange={(v) => setField("goal", v)} area />
          <TextField label="計画" value={form.plan} onChange={(v) => setField("plan", v)} area />
          <TextField label="実績" value={form.actual} onChange={(v) => setField("actual", v)} area />
          <TextField label="勉強時間" value={form.studyTime} onChange={(v) => setField("studyTime", v)} />
          <TextField label="達成度" value={form.achievement} onChange={(v) => setField("achievement", v)} />
          <TextField label="振り返り" value={form.reflection} onChange={(v) => setField("reflection", v)} area />
          <TextField label="コーチコメント" value={form.coachComment} onChange={(v) => setField("coachComment", v)} area />

          <div className="field">
            <span>曜日別メモ</span>
            <div className="day-grid">
              {DAY_KEYS.map(([k, label]) => (
                <label key={k} className="day-cell">
                  <span className="day-label">{label}</span>
                  <input
                    value={form.days[k] ?? ""}
                    onChange={(e) => setDay(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={status === "saving"}
            >
              {status === "saving" ? "保存中…" : "保存"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SaveStatus({ status }) {
  if (status === "dirty") return <p className="save-msg warn">未保存の変更があります</p>;
  if (status === "saving") return <p className="save-msg">保存中...</p>;
  if (status === "saved") return <p className="save-msg ok">保存しました</p>;
  if (status === "error") return <p className="save-msg err">保存に失敗しました</p>;
  return null;
}

function TextField({ label, value, onChange, area }) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea rows={2} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
