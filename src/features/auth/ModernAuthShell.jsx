import { useEffect, useState } from "react";
import { signUpWithInviteCode, loginWithFriendId, logout } from "./modernAuthApi.js";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { safeAuthErrorMessage, normalizeFriendId, validateFriendIdFormat } from "./friendIdAuth.js";
import { validateInviteCode } from "./inviteCode.js";
import { CUTOVER_TITLE, CUTOVER_LINES, SIGNUP_NEW_FRIEND_ID_NOTE } from "./cutoverCopy.js";
import { copyUserId, isCopyableUid } from "../profile/copyUserId.js";
import OriexMark from "./OriexMark.jsx";
import SignupIconPicker from "./SignupIconPicker.jsx";
import { APP_VERSION_LABEL } from "../../appVersion.js";
import "./authScreen.css";

/* ============================================================
 * ModernAuthShell — Firebase Auth login/signup, in Oriex app style
 * ------------------------------------------------------------
 * The DEFAULT login experience: real Firebase Auth drives the UI via
 * onAuthStateChanged. This file is UI/appearance only — no password is written
 * to Firestore, no other user's profile/main is read, no password is compared
 * client-side, and nothing (password/token/user object) is ever logged. Errors
 * are shown via safeAuthErrorMessage only. The internal user ID (uid) is NOT
 * shown to normal users — it appears only behind the explicit ?oriexAuthDebug=1
 * support flag.
 * ============================================================ */

// Support-only: reveal the internal uid (for "tell us your ID" diagnostics).
// Pure read of the URL; never throws; off unless ?oriexAuthDebug=1 is present.
function isAuthDebugEnabled() {
  try {
    if (typeof window === "undefined" || !window.location) return false;
    return new URLSearchParams(window.location.search).get("oriexAuthDebug") === "1";
  } catch {
    return false;
  }
}

export default function ModernAuthShell({ onAuthed } = {}) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  // forgot-password: the Friend ID the user submitted, so we can show reset guidance.
  const [forgotShownFor, setForgotShownFor] = useState("");
  const [friendId, setFriendId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // Account icon chosen on signup. `avatar` is either a character key OR a small
  // cropped photo data URL (the legacy app renders avatar as <img src>). `color`
  // is the background.
  const [icon, setIcon] = useState({ avatar: "", color: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [generatedFriendId, setGeneratedFriendId] = useState("");
  const debug = isAuthDebugEnabled();

  useEffect(() => {
    // Ongoing source of truth: restores a persisted session on mount (reload)
    // and reflects every later change. Registered once; cleaned up on unmount.
    // Never log the user object. Notify a host (e.g. the cutover bridge) of ANY
    // signed-in user — including a RESTORED persisted session, not only a fresh
    // login — so it never dead-ends on the signed-in shell.
    const unsub = subscribeAuth(
      (u) => {
        setUser(u);
        if (u && onAuthed) onAuthed(u);
      },
      () => setReady(true),
    );
    return unsub;
  }, []);

  const onSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        // Friend ID accounts use a NON-deliverable internal email, so Firebase's
        // email password-reset cannot be used. The reset is done by the teacher /
        // admin (Admin SDK). Validate the Friend ID and show how to get it reset.
        const fid = normalizeFriendId(friendId);
        if (!validateFriendIdFormat(fid)) {
          setError("Friend ID は6文字で入力してください。");
          return;
        }
        setForgotShownFor(fid);
        return;
      }
      if (mode === "signup") {
        // Test-student shortcut: typing the name "デバッグ123" makes a throwaway
        // test student WITHOUT an invite code (a real account, named デバッグ生徒).
        const isDebug = name.trim() === "デバッグ123";
        // Specific, safe feedback before hitting Firebase. The invite code is a
        // TEST-ONLY gate; it is never written to Firestore and never logged.
        if (!isDebug && !validateInviteCode(inviteCode)) {
          setError("招待コードが正しくありません");
          return;
        }
        // Firebase requires ≥ 6 chars; pre-check so we don't round-trip a 400.
        if (!password || password.length < 6) {
          setError("パスワードは6文字以上にしてください。");
          return;
        }
        const { shortId } = await signUpWithInviteCode({
          inviteCode,
          password,
          name: isDebug ? "デバッグ生徒" : name,
          avatar: icon.avatar,
          color: icon.color,
          debug: isDebug,
        });
        setGeneratedFriendId(shortId); // a Friend ID is GENERATED, not typed
      } else {
        await loginWithFriendId({ friendId, password });
      }
      setPassword(""); // never retain the password in state after use
      // Transition immediately from the authoritative current user — do NOT wait
      // for onAuthStateChanged to re-fire (that only updated the UI on reload).
      const authed = currentAuthUser();
      setUser(authed);
      // Notify a host (e.g. the cutover bridge) of the in-session sign-in, since
      // its own onAuthStateChanged may not fire promptly for an in-session login.
      if (onAuthed) onAuthed(authed);
    } catch (err) {
      // Only a safe, curated message — never the raw error/password/token. The
      // wording is mode-aware so a signup failure never shows login text.
      setError(safeAuthErrorMessage(err, mode === "signup" ? "signup" : "login"));
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
      <div className="ox-auth">
        <div className="ox-auth-card ox-auth-loading">
          <OriexMark />
          <p>読み込み中…</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Rarely seen in the cutover flow (it hands off to the app immediately). A
    // calm confirmation — no debug-style "logged in" label, and the internal id
    // is shown only behind the support flag.
    return (
      <div className="ox-auth">
        <div className="ox-auth-card ox-auth-welcome">
          <OriexMark />
          <h2>ようこそ Oriex へ</h2>
          {generatedFriendId ? (
            <div className="ox-auth-friendid" style={{ marginTop: 12, textAlign: "left" }}>
              あなたの Friend ID：<strong>{generatedFriendId}</strong>
              <br />
              次回のログインに使います。お控えください。
            </div>
          ) : (
            <p>アプリを開いています…</p>
          )}
          {debug && (
            <div className="ox-auth-debug">
              ID: {user.uid}
              {isCopyableUid(user.uid) && (
                <button
                  type="button"
                  className="ox-auth-switch-btn"
                  onClick={onCopyId}
                  aria-label="ユーザーIDをコピー"
                  style={{ width: "auto", display: "inline-block", marginLeft: 8, padding: "4px 10px" }}
                >
                  {idCopied ? "コピーしました" : "コピー"}
                </button>
              )}
            </div>
          )}
          <button
            className="ox-auth-primary"
            onClick={onLogout}
            disabled={busy}
            style={{ marginTop: 16 }}
          >
            ログアウト
          </button>
          {error && <p className="ox-auth-error">{error}</p>}
          <p className="ox-auth-version">{APP_VERSION_LABEL}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ox-auth">
      <form className="ox-auth-card" onSubmit={onSubmit}>
        <div className="ox-auth-brand">
          <img
            className="ox-auth-wordmark"
            src={`${import.meta.env.BASE_URL}oriex-wordmark.png`}
            alt="Oriex"
            draggable="false"
          />
          <p className="ox-auth-subtitle">{mode === "signup" ? "新しく始める" : "ログイン"}</p>
        </div>

        <section className="ox-auth-notice" aria-label="ログイン方式の変更について">
          <strong>{CUTOVER_TITLE}</strong>
          {CUTOVER_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        <div className="ox-auth-form">
          {(mode === "login" || mode === "forgot") && (
            <label className="ox-auth-field">
              <span className="ox-auth-label">Friend ID</span>
              <input
                className="ox-auth-input"
                value={friendId}
                onChange={(e) => setFriendId(e.target.value.toUpperCase())}
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="6文字のID"
                style={{ textTransform: "uppercase" }}
              />
            </label>
          )}

          {mode === "forgot" && !forgotShownFor && (
            <p className="ox-auth-hint" style={{ marginTop: 0 }}>
              パスワードのリセットは先生（管理者）が行います。あなたの Friend ID を入力して「リセット方法を確認」を押してください。
            </p>
          )}
          {mode === "forgot" && forgotShownFor && (
            <div className="ox-auth-notice">
              <strong>パスワードのリセット手順</strong>
              <p>
                先生に Friend ID「<b>{forgotShownFor}</b>」を伝えて、パスワードのリセットを依頼してください。先生がリセットすると、新しいパスワードでログインできます。
              </p>
            </div>
          )}

          {mode === "signup" && (
            <label className="ox-auth-field">
              <span className="ox-auth-label">招待コード</span>
              <input
                className="ox-auth-input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="招待コードを入力"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                style={{ textTransform: "uppercase" }}
              />
              <small className="ox-auth-hint">登録には招待コードが必要です。</small>
            </label>
          )}

          {mode === "signup" && (
            <p className="ox-auth-hint" style={{ marginTop: 0 }}>
              {SIGNUP_NEW_FRIEND_ID_NOTE}
            </p>
          )}

          {mode === "signup" && (
            <label className="ox-auth-field">
              <span className="ox-auth-label">表示名（任意）</span>
              <input
                className="ox-auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
              />
            </label>
          )}

          {mode === "signup" && (
            <div className="ox-auth-field">
              <span className="ox-auth-label">アイコン</span>
              <SignupIconPicker onChange={setIcon} />
            </div>
          )}

          {mode !== "forgot" && (
            <label className="ox-auth-field">
              <span className="ox-auth-label">パスワード</span>
              <input
                className="ox-auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>
          )}

          {!(mode === "forgot" && forgotShownFor) && (
            <button className="ox-auth-primary" type="submit" disabled={busy}>
              {mode === "signup" ? "登録する" : mode === "forgot" ? "リセット方法を確認" : "ログイン"}
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="ox-auth-error">
            {error}
          </p>
        )}

        <div className="ox-auth-switch">
          {mode === "forgot" ? (
            <button
              type="button"
              className="ox-auth-switch-btn"
              onClick={() => {
                setError("");
                setForgotShownFor("");
                setMode("login");
              }}
            >
              ログインに戻る
            </button>
          ) : (
            <>
              <span className="ox-auth-switch-label">
                {mode === "signup" ? "アカウントをお持ちですか？" : "はじめての方はこちら"}
              </span>
              <button
                type="button"
                className="ox-auth-switch-btn"
                onClick={() => {
                  setError("");
                  setMode(mode === "signup" ? "login" : "signup");
                }}
              >
                {mode === "signup" ? "ログインに戻る" : "新しく始める"}
              </button>
              {mode === "login" && (
                <button
                  type="button"
                  className="ox-auth-forgot-link"
                  onClick={() => {
                    setError("");
                    setForgotShownFor("");
                    setMode("forgot");
                  }}
                >
                  パスワードを忘れた方
                </button>
              )}
            </>
          )}
        </div>

        <p className="ox-auth-version">{APP_VERSION_LABEL}</p>
      </form>
    </div>
  );
}
