import { useEffect, useRef, useState } from "react";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import ModernAuthShell from "./ModernAuthShell.jsx";

/* ============================================================
 * AuthBridgeProbe — opt-in probe for the modern-auth → legacy handoff
 * ------------------------------------------------------------
 * Mounted ONLY behind ?oriexAuthBridge=1 (see authBridgeRoute.js). It signs in
 * with the modern Firebase Auth shell, then starts the legacy app and OBSERVES
 * whether legacy adopts the same authenticated user (window.__oxUid). It does not
 * use the legacy plaintext login, does not read/compare any password, does not
 * write to Firestore, and logs nothing sensitive. The uid is a non-secret id and
 * is the only auth value shown.
 *
 * This is a developer feasibility probe, NOT a feature and NOT the default login.
 * See MODERN_AUTH_APP_HANDOFF_SPIKE.md.
 * ============================================================ */

const show = (v) => (v == null ? "—" : String(v)); // uid / boolean only (non-secret)

export default function AuthBridgeProbe() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [legacyState, setLegacyState] = useState("idle"); // idle | starting | started | error
  const [obs, setObs] = useState(null);
  const startedRef = useRef(false);

  useEffect(
    () =>
      subscribeAuth(
        (u) => setUser(u),
        () => setReady(true),
      ),
    [],
  );

  const startLegacy = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const authUid = (currentAuthUser() && currentAuthUser().uid) || (user && user.uid) || null;
    const oxUidBefore = (typeof window !== "undefined" && window.__oxUid) || null;
    setLegacyState("starting");
    try {
      // Import (not edit) the legacy bundle; it self-mounts into #root.
      await import("../../legacy/oriex-app.bundle.js");
    } catch {
      setLegacyState("error");
      return;
    }
    setLegacyState("started");
    // Observe after the legacy app has had a moment to boot + run onAuthStateChanged.
    window.setTimeout(() => {
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
  };

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

  // Signed in → show observations + the "start legacy" control (legacy fills #root
  // beneath this fixed banner once started).
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
      {!ready && <p>読み込み中…</p>}

      {ready && !user && (
        <p style={{ margin: "0 0 8px" }}>
          まず下のモダン認証でログイン/新規登録してください。ログイン後にレガシーアプリを起動して、
          同じ Firebase Auth ユーザーを引き継げるか検証します。
        </p>
      )}

      {ready && user && (
        <div>
          <p style={{ margin: "0 0 6px" }}>
            Auth user present: <code>{show(user.uid)}</code>
          </p>
          {legacyState === "idle" && (
            <button type="button" className="btn-primary" onClick={startLegacy}>
              レガシーアプリを起動して検証
            </button>
          )}
          {legacyState === "starting" && <p>レガシーアプリを起動中…</p>}
          {legacyState === "error" && (
            <p style={{ color: "#c0392b" }}>レガシーアプリの読み込みに失敗しました。</p>
          )}
          {obs && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Auth uid: <code>{show(obs.authUid)}</code></li>
              <li>window.__oxUid (before): <code>{show(obs.oxUidBefore)}</code></li>
              <li>window.__oxUid (after): <code>{show(obs.oxUidAfter)}</code></li>
              <li>
                __oxUid == Auth uid?{" "}
                <strong>{obs.oxUidMatchesAuth ? "YES ✅" : "NO ❌"}</strong>
              </li>
              <li>
                旧ログイン画面（passwordフィールド）が出ている?{" "}
                <strong>{obs.legacyPasswordInputPresent ? "YES ⚠️" : "NO ✅"}</strong>
              </li>
            </ul>
          )}
          {legacyState === "started" && !obs && <p>観測中…（数秒お待ちください）</p>}
        </div>
      )}
    </div>
  );

  // Before sign-in, render the modern auth shell so the tester can sign in.
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2147483600 }}>
      {banner}
      {panel}
      {ready && !user && (
        <div style={{ maxHeight: "80vh", overflow: "auto", background: "transparent" }}>
          <ModernAuthShell />
        </div>
      )}
    </div>
  );
}
