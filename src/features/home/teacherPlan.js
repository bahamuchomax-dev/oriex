/* ============================================================
 * teacherPlan — the 先生からの週計画 for the new home's 今週の予定 card. Subscribes to
 * the student's live Firestore plan via the existing plans API, LAZILY (Firebase is
 * dynamically imported so it stays out of the home's initial chunk) and FULLY
 * gracefully: not signed in / no plan / any error → returns null and the card shows
 * its empty state. Never throws.
 * ============================================================ */
import { useEffect, useState } from "react";
import { getAccount } from "./realAccount.js";

function mapItems(plan) {
  const items = plan && Array.isArray(plan.items) ? plan.items : [];
  if (!items.length) return null;
  return items.map((it) => ({
    name: it.bookTitle || it.taskText || it.subject || "課題",
    min: it.target || "",
    done: (it.progressPercent || 0) >= 100,
  }));
}

/** Live [{name,min,done}] from the teacher's most-recent active plan, or null. */
export function useTeacherPlan() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let unsubAuth = null;
    (async () => {
      try {
        const acct = getAccount();
        if (!acct || !acct.uid) return; // not signed in (e.g. ?oriexHome=1 preview)
        const [plansMod, fb, fbAuth] = await Promise.all([
          import("../plans/plansApi.js"),
          import("../../firebase/firebase.js"),
          import("firebase/auth"),
        ]);
        if (cancelled) return;
        const apply = (list) => {
          const active = (list || []).find((p) => p && p.status === "active") || (list || [])[0];
          setItems(mapItems(active));
        };
        // Wait for Firebase Auth to restore the session, then subscribe with the
        // authenticated uid (the Firestore read is gated by Rules to the student).
        // Home only needs a preview, so use a cached one-shot read instead of a
        // long-lived realtime listener.
        unsubAuth = fbAuth.onAuthStateChanged(fb.auth, async (user) => {
          if (cancelled) return;
          const uid = (user && user.uid) || acct.uid;
          if (!uid) return;
          try {
            const list = await plansMod.loadMyPlans(uid);
            if (!cancelled) apply(list);
          } catch {
            if (!cancelled) setItems(null);
          }
        });
      } catch {
        setItems(null);
      }
    })();
    return () => {
      cancelled = true;
      try { if (unsubAuth) unsubAuth(); } catch { /* ignore */ }
    };
  }, []);
  return items;
}
