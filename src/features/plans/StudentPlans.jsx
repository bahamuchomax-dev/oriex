import { useEffect, useState, useRef } from "react";
import { subscribeMyPlans, saveStudentProgress } from "./plansApi.js";
import { clampPercent, computeOverall } from "./planUtils.js";

// Student plans screen: live subscription to MY weeklyPlans + progress editing.
export default function StudentPlans({ uid }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setPlans([]);
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeMyPlans(
      uid,
      (list) => {
        setPlans(list);
        setLoading(false);
      },
      (e) => {
        console.error("subscribeMyPlans failed", e);
        setLoading(false);
      }
    );
    return unsub; // unsubscribe on unmount
  }, [uid]);

  if (loading) {
    return (
      <div className="ox-empty plan-empty">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <section className="student-plans-panel">
      <div className="plans-section-head">
        <span className="section-chip">Student</span>
        <h3>届いた計画</h3>
        <p>スライダーで進捗を調整してから保存します。表示だけでは書き込みません。</p>
      </div>
      {plans.length === 0 ? (
        <div className="ox-empty plan-empty">
          <p>まだ届いている計画はありません。</p>
          <p className="ox-empty-sub">先生から週計画が届くと、ここに教材ごとに表示されます。</p>
        </div>
      ) : (
        <ul className="plan-list student-plan-list">
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
    <li className="plan-card student-plan-card">
      <div className="student-plan-hero">
        <div>
          <span className="plan-kicker">先生からの計画</span>
          <strong>{plan.teacherName || "先生"}</strong>
          <small>{plan.weekId} · 期限 {plan.dueDate}</small>
        </div>
        <div className="plan-score">
          <strong>{overall}%</strong>
          <span>進捗</span>
        </div>
      </div>

      <div className="progress-line plan-total-line">
        <span>全体進捗</span>
        <span className="bar"><span className="bar-fill" style={{ width: `${overall}%` }} /></span>
        <span className="pct">{overall}%</span>
      </div>

      <ul className="plan-item-list student-plan-items">
        {items.map((it) => (
          <li key={it.itemId} className="plan-item-edit student-plan-item">
            <div className="plan-item-head">
              <strong>{it.bookTitle}</strong>
              <span className="book-sub">
                {it.subject || "教科未設定"}{it.level ? ` / ${it.level}` : ""}
              </span>
              {(it.taskText || it.target) && (
                <small>{it.taskText} {it.target && `· ${it.target}`}</small>
              )}
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

      <div className="student-plan-footer">
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
