import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { handoffToLegacy } from "./legacyHandoff.js";
import { clearLegacyLocalSession } from "./legacyLocalSession.js";
import { consumeCutoverReloadMarker, reloadForCutoverRelogin } from "./cutoverReload.js";
import ModernAuthShell from "./ModernAuthShell.jsx";
import "./authScreen.css";

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
        background: "var(--bg, #fbf8f3)",
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}

// Calm, branded waiting state — replaces the bare debug-style text. UI only.
function BrandedLoader({ message }) {
  return (
    <div className="ox-auth">
      <div className="ox-auth-card ox-auth-loading">
        <div className="ox-auth-logo">O</div>
        <h1 className="ox-auth-title">Oriex</h1>
        <div className="ox-auth-spinner" aria-hidden="true" />
        <p role="status">{message}</p>
      </div>
    </div>
  );
}

export default function ModernCutoverBridge() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState("checking"); // checking | signin | starting | mounted | error
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const lastUidRef = useRef(null);
  // True once a handoff has completed in THIS page lifecycle. The legacy bundle
  // self-mounts on its first import and its import is cached, so a second handoff
  // (post-logout re-login) cannot re-mount it — we reload once instead. Resets on a
  // real page reload (component unmounts), so each lifecycle reloads at most once.
  const handedOffOnceRef = useRef(false);

  // Consume any one-time reload marker left by a prior cutover re-login reload, so a
  // later logout→re-login cycle in a NEW lifecycle can reload again if needed.
  useEffect(() => {
    consumeCutoverReloadMarker();
  }, []);

  // The single, IDEMPOTENT handoff trigger. Called from EVERY path that can yield a
  // signed-in user — mount/restore, the auth observer, AND the embedded shell's
  // onAuthed (fresh login) — so a fresh in-session login hands off immediately and
  // never dead-ends on the signed-in shell, without depending on an effect re-run.
  const startHandoff = useCallback((u) => {
    if (!u || startedRef.current) return;
    startedRef.current = true;
    setPhase("starting");

    // Second-cycle re-login (cutover login → home → logout → modern login →
    // re-login) within the SAME page lifecycle: legacy was already imported and
    // self-mounted, and its cached import is a no-op, so handoffToLegacy cannot
    // bring it back to home — it would leave the OLD legacy login visible. The
    // verified path home is a fresh boot with the persisted session, so reload the
    // same URL ONCE (guarded against loops). The reload re-runs this bridge cold,
    // where handedOffOnceRef is false again and the normal import path reaches home.
    if (handedOffOnceRef.current && reloadForCutoverRelogin()) return;

    handoffToLegacy(u)
      .then(() => {
        handedOffOnceRef.current = true;
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

  // Logout handling: after a handoff, legacy owns #root and its own logout button
  // signs out Firebase Auth and would show the OLD legacy login. Detect that
  // sign-out here, clear the bridge/legacy session, and return to the MODERN login
  // (its overlay covers legacy). A subsequent modern login re-runs the handoff.
  useEffect(() => {
    if (user) {
      lastUidRef.current = user.uid;
      return;
    }
    if (!startedRef.current) return; // never handed off — resolution effect shows login
    if (typeof window !== "undefined") {
      try {
        window.__oxUid = undefined;
      } catch {
        /* ignore */
      }
    }
    clearLegacyLocalSession(lastUidRef.current);
    lastUidRef.current = null;
    startedRef.current = false; // allow a fresh handoff on the next login
    setPhase("signin");
  }, [user]);

  // Legacy now owns #root — render nothing so only the real app shows.
  if (phase === "mounted") return null;

  if (phase === "error") {
    return (
      <Overlay>
        <div className="ox-auth">
          <div className="ox-auth-card ox-auth-loading">
            <div className="ox-auth-logo">O</div>
            <h1 className="ox-auth-title">Oriex</h1>
            <p className="ox-auth-error" role="alert" style={{ marginTop: 14, textAlign: "left" }}>
              うまく開けませんでした。お手数ですが、ページを再読み込みしてください。
            </p>
          </div>
        </div>
      </Overlay>
    );
  }

  if (phase === "checking") {
    // Keep the "checking login state" wording; present it as a calm Oriex splash.
    return (
      <Overlay>
        <BrandedLoader message="ログイン状態を確認中…" />
      </Overlay>
    );
  }

  if (phase === "starting") {
    return (
      <Overlay>
        <BrandedLoader message="Oriex を準備しています…" />
      </Overlay>
    );
  }

  // Signed out → modern login/signup. onAuthed starts the handoff the instant the
  // embedded shell signs in (fresh login) — deterministically, not via an effect
  // re-run — so the signed-in shell is never the final state. The shell renders
  // its own full-bleed Oriex-style login, so no extra wrapper is needed.
  return (
    <Overlay>
      <ModernAuthShell
        onAuthed={(u) => {
          setUser(u);
          startHandoff(u);
        }}
      />
    </Overlay>
  );
}
