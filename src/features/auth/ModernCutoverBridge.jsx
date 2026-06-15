import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { handoffToLegacy } from "./legacyHandoff.js";
import ModernAuthShell from "./ModernAuthShell.jsx";

/* ============================================================
 * ModernCutoverBridge — opt-in cutover: modern Firebase Auth → real legacy app
 * ------------------------------------------------------------
 * Mounted ONLY behind ?oriexModernCutover=1 (see cutoverRoute.js). NOT the default
 * login. It WAITS for Firebase Auth state to restore; signed-out it shows the
 * modern login/signup; once a user exists it hands off into the legacy app
 * (handoffToLegacy: set window.__oxUid, ensure the user's OWN legacy-path profile,
 * import the legacy bundle) and then renders nothing so the legacy app owns #root —
 * NO debug overlay. The plaintext login is never used, no password is
 * read/compared/written, and nothing sensitive is logged.
 *
 * See MODERN_AUTH_CUTOVER_PLAN.md. The developer probe (?oriexAuthBridge=1) remains
 * available separately for diagnosis.
 * ============================================================ */

function Overlay({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483600,
        background: "var(--bg, #ffffff)",
        display: "grid",
        placeItems: "center",
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}

export default function ModernCutoverBridge() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState("checking"); // checking | signin | starting | mounted | error
  const startedRef = useRef(false);
  const aliveRef = useRef(true);

  // The single, IDEMPOTENT handoff trigger. Called from EVERY path that can yield a
  // signed-in user — mount/restore, the auth observer, AND the embedded shell's
  // onAuthed (fresh login) — so a fresh in-session login hands off immediately and
  // never dead-ends on the signed-in shell, without depending on an effect re-run.
  const startHandoff = useCallback((u) => {
    if (!u || startedRef.current) return;
    startedRef.current = true;
    setPhase("starting");
    handoffToLegacy(u)
      .then(() => {
        if (aliveRef.current) setPhase("mounted");
      })
      .catch(() => {
        if (aliveRef.current) setPhase("error");
      });
  }, []);

  // Auth observer: source of truth for restore + later changes. On any user,
  // start the handoff immediately.
  useEffect(() => {
    aliveRef.current = true;
    const unsub = subscribeAuth(
      (u) => {
        setUser(u);
        if (u) startHandoff(u);
      },
      () => setReady(true),
    );
    return () => {
      aliveRef.current = false;
      unsub();
    };
  }, [startHandoff]);

  // Once auth has resolved: a persisted user (from state OR the authoritative
  // current user) hands off; otherwise show login. Does not touch the phase once
  // the handoff has started (startHandoff owns it then).
  useEffect(() => {
    if (startedRef.current) return;
    if (!ready) {
      setPhase("checking");
      return;
    }
    const effectiveUser = user || currentAuthUser();
    if (!effectiveUser) {
      setPhase("signin");
      return;
    }
    startHandoff(effectiveUser);
  }, [ready, user, startHandoff]);

  // Legacy now owns #root — render nothing so only the real app shows.
  if (phase === "mounted") return null;

  if (phase === "error") {
    return (
      <Overlay>
        <p style={{ color: "var(--danger, #c0392b)", fontSize: 14, textAlign: "center" }}>
          ログインの引き継ぎに失敗しました。ページを再読み込みしてください。
        </p>
      </Overlay>
    );
  }

  if (phase === "checking") {
    return (
      <Overlay>
        <p>ログイン状態を確認中...</p>
      </Overlay>
    );
  }

  if (phase === "starting") {
    return (
      <Overlay>
        <p>アプリを起動中...</p>
      </Overlay>
    );
  }

  // Signed out → modern login/signup. onAuthed starts the handoff the instant the
  // embedded shell signs in (fresh login) — deterministically, not via an effect
  // re-run — so the signed-in shell is never the final state.
  return (
    <Overlay>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <ModernAuthShell
          onAuthed={(u) => {
            setUser(u);
            startHandoff(u);
          }}
        />
      </div>
    </Overlay>
  );
}
