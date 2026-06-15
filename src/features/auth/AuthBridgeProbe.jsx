import { useEffect, useRef, useState } from "react";
import { subscribeAuth } from "./modernAuthState.js";
import { shouldMountLegacy, bridgeUid } from "./authBridgeController.js";
import ModernAuthShell from "./ModernAuthShell.jsx";

/* ============================================================
 * AuthBridgeProbe — opt-in probe for the modern-auth → legacy handoff
 * ------------------------------------------------------------
 * Mounted ONLY behind ?oriexAuthBridge=1 (see authBridgeRoute.js). It WAITS for
 * Firebase Auth state to be restored, and only once a user exists does it set
 * window.__oxUid = user.uid and start the legacy app (by importing — not editing —
 * the bundle). Legacy's own onAuthStateChanged then adopts that user and loads
 * the user's OWN profile/main, entering the real app without the plaintext login.
 *
 * Waiting for auth restoration fixes the first-load race (legacy used to mount
 * before persistence restored, so it briefly showed the old login until a reload).
 *
 * It does NOT use the legacy plaintext login, reads/compares NO password, does NO
 * Firestore read/write, writes NO password, and logs nothing sensitive (uid is a
 * non-secret id). Developer feasibility probe, NOT a feature / NOT the default
 * login. See MODERN_AUTH_APP_HANDOFF_SPIKE.md.
 * ============================================================ */

const show = (v) => (v == null ? "—" : String(v)); // uid / boolean only (non-secret)

export default function AuthBridgeProbe() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("checking"); // checking | signin | mounting | mounted | error
  const [obs, setObs] = useState(null);
  const mountedRef = useRef(false); // guards against double legacy mount

  useEffect(
    () =>
      subscribeAuth(
        (u) => setUser(u),
        () => setReady(true),
      ),
    [],
  );

  // Once auth is RESOLVED and a user exists, set the uid global and start legacy
  // exactly once. Repeated auth events / re-renders cannot re-mount it.
  useEffect(() => {
    if (!ready) {
      setPhase("checking");
      return;
    }
    if (!user) {
      setPhase("signin");
      return;
    }
    if (!shouldMountLegacy({ ready, hasUser: !!user, alreadyMounted: mountedRef.current })) {
      return;
    }
    mountedRef.current = true;

    let cancelled = false;
    (async () => {
      const authUid = bridgeUid(user);
      const oxUidBefore = (typeof window !== "undefined" && window.__oxUid) || null;
      // Set the uid global BEFORE legacy starts (observed; non-secret).
      if (typeof window !== "undefined" && authUid) window.__oxUid = authUid;

      setPhase("mounting");
      try {
        // Import (not edit) the legacy bundle; it self-mounts into #root.
        await import("../../legacy/oriex-app.bundle.js");
      } catch {
        if (!cancelled) setPhase("error");
        return;
      }
      if (cancelled) return;
      setPhase("mounted");

      // Observe after legacy has had a moment to boot + run onAuthStateChanged.
      window.setTimeout(() => {
        if (cancelled) return;
        const oxUidAfter = (typeof window !== "undefined" && window.__oxUid) || null;
        let legacyPasswordInputPresent = false;
        try {
          const root = document.getElementById("root");
          // existence check only — never reads an input's value
          legacyPasswordInputPresent = !!(root && root.querySelector('input[type="password"]'));
        } catch {
          /* ignore */
        }
        setObs({
          authUid,
          oxUidBefore,
          oxUidAfter,
          oxUidMatchesAuth: !!authUid && oxUidAfter === authUid,
          legacyPasswordInputPresent,
        });
      }, 2000);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const banner = (
    <div
      style={{
        background: "#1d2330",
        color: "#fff",
        padding: "8px 12px",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      <strong>Modern Auth Bridge Probe</strong>
      <span style={{ marginLeft: 8, opacity: 0.8 }}>
        （開発用の検証。既定のログインではありません）
      </span>
    </div>
  );

  const panel = (
    <div
      style={{
        background: "#fff",
        color: "#1d2330",
        padding: "10px 12px",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        borderTop: "1px solid #e2e6ee",
        maxWidth: 520,
      }}
    >
      {phase === "checking" && <p style={{ margin: 0 }}>認証状態を確認中...</p>}

      {phase === "signin" && (
        <p style={{ margin: "0 0 8px" }}>
          ログイン/新規登録してください。認証が確認できたら、自動でレガシーアプリを起動して
          同じ Firebase Auth ユーザーを引き継げるか検証します。
        </p>
      )}

      {(phase === "mounting" || phase === "mounted" || phase === "error") && (
        <div>
          <p style={{ margin: "0 0 6px" }}>
            Auth user present: <strong>YES</strong> — uid <code>{show(user && user.uid)}</code>
          </p>
          {phase === "mounting" && <p>レガシーアプリを起動中…（認証確認後）</p>}
          {phase === "error" && (
            <p style={{ color: "#c0392b" }}>レガシーアプリの読み込みに失敗しました。</p>
          )}
          {phase === "mounted" && !obs && <p>レガシー起動済み。観測中…（数秒お待ちください）</p>}
          {obs && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Auth uid: <code>{show(obs.authUid)}</code></li>
              <li>window.__oxUid (before): <code>{show(obs.oxUidBefore)}</code></li>
              <li>window.__oxUid (after): <code>{show(obs.oxUidAfter)}</code></li>
              <li>
                __oxUid == Auth uid?{" "}
                <strong>{obs.oxUidMatchesAuth ? "YES ✅" : "NO ❌"}</strong>
              </li>
              <li>legacy mounted: <strong>YES ✅</strong></li>
              <li>
                旧ログイン画面（passwordフィールド）が出ている?{" "}
                <strong>{obs.legacyPasswordInputPresent ? "YES ⚠️" : "NO ✅"}</strong>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2147483600 }}>
      {banner}
      {panel}
      {phase === "signin" && (
        <div style={{ maxHeight: "80vh", overflow: "auto", background: "transparent" }}>
          <ModernAuthShell />
        </div>
      )}
    </div>
  );
}
