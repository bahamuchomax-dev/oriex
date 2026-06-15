import { useEffect, useState } from "react";
import { signUpWithInviteCode, loginWithFriendId, logout } from "./modernAuthApi.js";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { safeAuthErrorMessage } from "./friendIdAuth.js";
import { validateInviteCode, DEV_INVITE_CODE } from "./inviteCode.js";
import { copyUserId, isCopyableUid } from "../profile/copyUserId.js";

/* ============================================================
 * ModernAuthShell — opt-in Firebase Auth login/signup shell
 * ------------------------------------------------------------
 * Mounted ONLY behind the opt-in flag (see modernAuthRoute.js); it is NOT the
 * default served login and does not touch the legacy bundle. Real Firebase Auth
 * drives the UI via onAuthStateChanged. No password is written to Firestore, no
 * other user's profile/main is read, and nothing (password/token/user object) is
 * ever logged. Errors are shown via safeAuthErrorMessage only.
 * ============================================================ */

export default function ModernAuthShell() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [friendId, setFriendId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [generatedFriendId, setGeneratedFriendId] = useState("");

  useEffect(() => {
    // Ongoing source of truth: restores a persisted session on mount (reload)
    // and reflects every later change. Registered once; cleaned up on unmount.
    // Never log the user object.
    const unsub = subscribeAuth(
      (u) => setUser(u),
      () => setReady(true),
    );
    return unsub;
  }, []);

  const onSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        // Specific, safe feedback before hitting Firebase. The invite code is a
        // TEST-ONLY gate; it is never written to Firestore and never logged.
        if (!validateInviteCode(inviteCode)) {
          setError("招待コードが正しくありません");
          return;
        }
        const { shortId } = await signUpWithInviteCode({ inviteCode, password, name });
        setGeneratedFriendId(shortId); // a Friend ID is GENERATED, not typed
      } else {
        await loginWithFriendId({ friendId, password });
      }
      setPassword(""); // never retain the password in state after use
      // Transition immediately from the authoritative current user — do NOT wait
      // for onAuthStateChanged to re-fire (that only updated the UI on reload).
      setUser(currentAuthUser());
    } catch (err) {
      // Only a safe, curated message — never the raw error/password/token.
      setError(safeAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setError("");
    setBusy(true);
    try {
      await logout();
      // Reflect signed-out state immediately, without waiting for the observer.
      setUser(null);
    } catch (err) {
      setError(safeAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCopyId = async () => {
    if (user && (await copyUserId(user.uid))) {
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 1500);
    }
  };

  if (!ready) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
          <p>読み込み中…</p>
        </main>
      </div>
    );
  }

  if (user) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
          <div className="feature-placeholder" style={{ textAlign: "center", maxWidth: 360 }}>
            <h2 style={{ color: "var(--accent)" }}>ログイン中</h2>
            {generatedFriendId && (
              <p style={{ fontSize: 14 }}>
                あなたのフレンドID:{" "}
                <strong style={{ fontFamily: "monospace" }}>{generatedFriendId}</strong>
                <br />
                次回のログインに使います。お控えください。
              </p>
            )}
            <div className="rx-pid">
              ID: {user.uid}
              {isCopyableUid(user.uid) && (
                <button
                  type="button"
                  className="rx-mini"
                  onClick={onCopyId}
                  aria-label="ユーザーIDをコピー"
                  style={{ marginLeft: 8 }}
                >
                  {idCopied ? "コピーしました" : "コピー"}
                </button>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              お問い合わせの際はこのIDをお伝えください。
            </p>
            <button className="btn-primary" onClick={onLogout} disabled={busy}>
              ログアウト
            </button>
            {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
        <form className="feature-placeholder" style={{ maxWidth: 360, width: "100%" }} onSubmit={onSubmit}>
          <h2 style={{ color: "var(--accent)", textAlign: "center" }}>
            Oriex {mode === "signup" ? "新規登録" : "ログイン"}
          </h2>
          {mode === "login" && (
            <label>
              フレンドID
              <input
                className="rx-tf"
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                autoComplete="username"
                placeholder="例: 2N7422"
              />
            </label>
          )}
          {mode === "signup" && (
            <label>
              招待コード
              <input
                className="rx-tf"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="招待コードを入力"
              />
              <small style={{ display: "block", color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                ※テスト用招待コード（開発のみ・機密ではありません）：<code>{DEV_INVITE_CODE}</code>
                。本番では別の招待方式に置き換えます。
              </small>
            </label>
          )}
          {mode === "signup" && (
            <label>
              表示名（任意）
              <input
                className="rx-tf"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
              />
            </label>
          )}
          <label>
            パスワード
            <input
              className="rx-tf"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {mode === "signup" ? "登録する" : "ログイン"}
          </button>
          <button
            type="button"
            className="rx-mini"
            onClick={() => {
              setError("");
              setMode(mode === "signup" ? "login" : "signup");
            }}
          >
            {mode === "signup" ? "ログインに切り替え" : "新規登録に切り替え"}
          </button>
          {error && (
            <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
