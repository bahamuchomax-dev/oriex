import { useEffect, useRef, useState } from "react";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { shouldMountLegacy } from "./authBridgeController.js";
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
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("checking"); // checking | signin | starting | mounted | error
  const startedRef = useRef(false);

  useEffect(
    () =>
      subscribeAuth(
        (u) => setUser(u),
        () => setReady(true),
      ),
    [],
  );

  useEffect(() => {
    if (!ready) {
      setPhase("checking");
      return;
    }
    // Fall back to the authoritative current user: a RESTORED persisted session
    // must hand off even if our subscription didn't deliver the user to state.
    const effectiveUser = user || currentAuthUser();
    if (!effectiveUser) {
      setPhase("signin");
      return;
    }
    if (!shouldMountLegacy({ ready, hasUser: true, alreadyMounted: startedRef.current })) {
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    setPhase("starting");
    handoffToLegacy(effectiveUser)
      .then(() => {
        if (!cancelled) setPhase("mounted");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

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

  // Signed out → modern login/signup. onAuthed makes the handoff start as soon as
  // the embedded shell signs in, even if our own onAuthStateChanged is slow for an
  // in-session login (which previously left the cutover stuck on the shell).
  return (
    <Overlay>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <ModernAuthShell onAuthed={(u) => setUser(u)} />
      </div>
    </Overlay>
  );
}
