import { useCallback, useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import "./studentApps.css";

/* ============================================================
 * StudentAppsScreen — React replacement for the legacy "先生からの問題 / 配布アプリ"
 * (customApp student view). The legacy screen lists every teacher-distributed item
 * (public/data/sharedApps = {name,url,description}) as a link but NEVER records that
 * a student opened one, so solved items stay under "新しい問題" forever (bug 2-1).
 *
 * This reads the teacher items + the student's OWN done-set
 * (users/{uid}/customProblemStatus, own subtree — rules already allow isSelf), splits
 * them into 新しい / 過去, and on OPEN records done so the item moves to 過去. Reads are
 * scoped to the signed-in uid (own status) + the shared catalog; no full-user reads.
 * ============================================================ */

const APP_ID = "gen-ron-kai-app-v1";

function uid() {
  return auth && auth.currentUser ? auth.currentUser.uid : null;
}

export default function StudentAppsScreen({ onClose }) {
  const [apps, setApps] = useState(null); // null = loading
  const [done, setDone] = useState(() => new Set());
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const u = uid();
    if (!u) return;
    setErr(false);
    try {
      const [appsSnap, doneSnap] = await Promise.all([
        getDocs(collection(db, "artifacts", APP_ID, "public", "data", "sharedApps")),
        getDocs(collection(db, "artifacts", APP_ID, "users", u, "customProblemStatus")),
      ]);
      const list = [];
      appsSnap.forEach((d) => {
        const v = d.data() || {};
        if (v.name || v.url) list.push({ id: d.id, name: v.name || "(無題)", url: v.url || "", description: v.description || "", createdAt: v.createdAt || 0 });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const doneSet = new Set();
      doneSnap.forEach((d) => {
        if ((d.data() || {}).done) doneSet.add(d.id);
      });
      setApps(list);
      setDone(doneSet);
    } catch {
      setErr(true);
      setApps([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (app) => {
    // Open the teacher's link, THEN record "done" so it moves to 過去 (an explicit
    // open is the only write — no per-keystroke / background writes).
    if (app.url) {
      try {
        window.open(app.url, "_blank", "noopener,noreferrer");
      } catch {
        /* ignore */
      }
    }
    const u = uid();
    if (!u) return;
    setDone((prev) => {
      const next = new Set(prev);
      next.add(app.id);
      return next;
    });
    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "users", u, "customProblemStatus", app.id),
        { done: true, at: serverTimestamp() },
        { merge: true },
      );
    } catch {
      /* non-fatal: the local move still happened; it re-syncs on next open */
    }
  };

  const fresh = (apps || []).filter((a) => !done.has(a.id));
  const past = (apps || []).filter((a) => done.has(a.id));

  return (
    <div className="ox-sapps">
      <div className="ox-sapps-head">
        <button type="button" className="ox-sapps-back" onClick={onClose} aria-label="戻る">
          ‹ 戻る
        </button>
        <h2 className="ox-sapps-title">先生からの問題</h2>
      </div>

      {apps === null ? (
        <p className="ox-sapps-note">読み込み中…</p>
      ) : (
        <>
          {err && <p className="ox-sapps-note err">読み込みに失敗しました。通信状況をご確認ください。</p>}

          <section className="ox-sapps-sec">
            <h3 className="ox-sapps-h3">新しい問題 <span>{fresh.length}</span></h3>
            {fresh.length === 0 ? (
              <p className="ox-sapps-empty">新しい問題はありません。</p>
            ) : (
              fresh.map((a) => <AppCard key={a.id} app={a} onOpen={open} done={false} />)
            )}
          </section>

          <section className="ox-sapps-sec">
            <h3 className="ox-sapps-h3">過去の問題 <span>{past.length}</span></h3>
            {past.length === 0 ? (
              <p className="ox-sapps-empty">まだありません。問題を開くとここに移動します。</p>
            ) : (
              past.map((a) => <AppCard key={a.id} app={a} onOpen={open} done />)
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AppCard({ app, onOpen, done }) {
  return (
    <div className={"ox-sapps-card" + (done ? " is-done" : "")}>
      <div className="ox-sapps-card-main">
        <div className="ox-sapps-card-name">
          {app.name}
          {done && <span className="ox-sapps-badge">解答済み</span>}
        </div>
        {app.description && <div className="ox-sapps-card-desc">{app.description}</div>}
      </div>
      <button type="button" className="ox-sapps-open" onClick={() => onOpen(app)} disabled={!app.url}>
        {done ? "もう一度" : "ひらく"}
      </button>
    </div>
  );
}
