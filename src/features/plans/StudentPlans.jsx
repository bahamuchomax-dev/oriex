import { useEffect, useState, useRef } from "react";
import { subscribeMyPlans, saveStudentProgress } from "./plansApi.js";
import { clampPercent, computeOverall } from "./planUtils.js";

// Student plans screen: live subscription to MY weeklyPlans + progress editing.
export default function StudentPlans({ uid }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = subscribeMyPlans(
      uid,
      (list) => { setPlans(list); setLoading(false); },
      (e) => { console.error("subscribeMyPlans failed", e); setLoading(false); }
    );
    return unsub; // unsubscribe on unmount
  }, [uid]);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>読み込み中…</p>;

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>週計画</h2>
      {plans.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>まだ届いている計画はありません。</p>
      ) : (
        <ul className="plan-list">
          {plans.map((p) => <PlanCard key={p.planId} plan={p} />)}
        </ul>
      )}
    </section>
  );
}

function PlanCard({ plan }) {
  const [items, setItems] = useState(plan.items ?? []);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("idle"); // idle|saving|saved|error
  const lastUpdated = useRef(plan.updatedAt);

  // Re-seed from server when the plan changes upstream AND we have no local edits.
  useEffect(() => {
    if (!dirty && plan.updatedAt !== lastUpdated.current) {
      setItems(plan.items ?? []);
      lastUpdated.current = plan.updatedAt;
    }
  }, [plan, dirty]);

  function setItemPercent(itemId, value) {
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, progressPercent: clampPercent(value) } : it))
    );
    setDirty(true);
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    try {
      await saveStudentProgress(plan, items);
      setDirty(false);
      lastUpdated.current = plan.updatedAt;
      setStatus("saved");
    } catch (e) {
      console.error("saveStudentProgress failed", e);
      setStatus("error");
    }
  }

  const overall = computeOverall(items);

  return (
    <li className="plan-card">
      <div className="row-between">
        <strong>{plan.teacherName || "先生"} からの計画</strong>
        <span className="book-sub">{plan.weekId} · 期限 {plan.dueDate}</span>
      </div>
      <div className="progress-line">
        <span>全体進捗</span>
        <span className="bar"><span className="bar-fill" style={{ width: `${overall}%` }} /></span>
        <span className="pct">{overall}%</span>
      </div>

      <ul className="plan-item-list">
        {items.map((it) => (
          <li key={it.itemId} className="plan-item-edit">
            <div className="plan-item-head">
              <strong>{it.bookTitle}</strong>
              <span className="book-sub"> {it.taskText} {it.target && `· ${it.target}`}</span>
            </div>
            <div className="progress-edit">
              <input
                type="range" min="0" max="100" step="5"
                value={it.progressPercent}
                onChange={(e) => setItemPercent(it.itemId, e.target.value)}
              />
              <input
                type="number" min="0" max="100"
                value={it.progressPercent}
                onChange={(e) => setItemPercent(it.itemId, e.target.value)}
                className="pct-input"
              />
              <span>%</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="row-between" style={{ marginTop: 8 }}>
        <span className="save-msg-inline">
          {dirty && status !== "saving" && <span className="warn">未保存</span>}
          {status === "saving" && "保存中..."}
          {status === "saved" && !dirty && <span className="ok">保存しました</span>}
          {status === "error" && <span className="err">保存に失敗しました</span>}
        </span>
        <button className="btn-primary" onClick={save} disabled={!dirty || status === "saving"}>
          進捗を保存
        </button>
      </div>
    </li>
  );
}
