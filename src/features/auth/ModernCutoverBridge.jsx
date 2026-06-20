import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeAuth, currentAuthUser } from "./modernAuthState.js";
import { handoffToLegacy } from "./legacyHandoff.js";
import { clearLegacyLocalSession } from "./legacyLocalSession.js";
import {
  consumeCutoverReloadMarker,
  reloadForCutoverRelogin,
  consumeCutoverLogoutMarker,
  reloadForCutoverLogout,
} from "./cutoverReload.js";
import { logout } from "./modernAuthApi.js";
import { installCutoverLogoutShield } from "./cutoverLogoutShield.js";
import { silenceLegacyPermissionDenied } from "./cutoverLogoutSilencer.js";
import ModernAuthShell from "./ModernAuthShell.jsx";
import OriexMark from "./OriexMark.jsx";
import { showCutoverVeil, hideCutoverVeil } from "./cutoverVeil.js";
import { APP_VERSION_LABEL } from "../../appVersion.js";
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
        <OriexMark />
        <h1 className="ox-auth-title">Oriex</h1>
        <div className="ox-auth-spinner" aria-hidden="true" />
        <p role="status">{message}</p>
        <p className="ox-auth-version">{APP_VERSION_LABEL}</p>
      </div>
    </div>
  );
}

export default function ModernCutoverBridge() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  // checking | signin | starting | revealing | mounted | error
  // "revealing": handoff finished (legacy imported); keep the branded cover up a
  // brief, BOUNDED moment so the legacy home paints BEHIND it — then drop the
  // cover. This prevents the old legacy login/home from flashing on reveal.
  const [phase, setPhase] = useState("checking");
  // Modern logout confirmation dialog (replaces legacy's window.confirm, which our
  // shield suppresses by intercepting the logout press). Shown over the legacy
  // home; only an explicit confirm performs the sign-out.
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const lastUidRef = useRef(null);
  // Guards the cutover sign-out so a pointerdown+click pair triggers it once;
  // reset on the next signed-out resolution so a later cycle can log out again.
  const loggingOutRef = useRef(false);
  // Guards the one-time clean logout reload (driven by the auth observer on
  // auth -> null after a handoff). Separate from loggingOutRef so the reload
  // fires whether WE signed out (shield) or legacy signed out itself.
  const logoutReloadStartedRef = useRef(false);
  // True once a handoff has completed in THIS page lifecycle. The legacy bundle
  // self-mounts on its first import and its import is cached, so a second handoff
  // (post-logout re-login) cannot re-mount it — we reload once instead. Resets on a
  // real page reload (component unmounts), so each lifecycle reloads at most once.
  const handedOffOnceRef = useRef(false);

  // Consume any one-time reload marker left by a prior cutover re-login reload, so a
  // later logout→re-login cycle in a NEW lifecycle can reload again if needed.
  useEffect(() => {
    consumeCutoverReloadMarker();
    consumeCutoverLogoutMarker();
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
        // Don't reveal the instant the import resolves — the legacy app has not
        // painted home yet, so dropping the cover now flashes its old screen.
        // Hold the branded cover through a short settle (see the effect below).
        if (aliveRef.current) setPhase("revealing");
      })
      .catch(() => {
        if (aliveRef.current) setPhase("error");
      });
  }, []);

  // Reveal settle: once handoff is done, keep the cover up for two animation
  // frames + a short, BOUNDED timeout so the legacy home can paint behind it,
  // then drop the cover (phase "mounted" → renders nothing, legacy owns #root).
  // Bounded by design — never an infinite loader.
  useEffect(() => {
    if (phase !== "revealing") return undefined;
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    const reveal = () => {
      if (aliveRef.current) setPhase("mounted");
    };
    const w = typeof window !== "undefined" ? window : null;
    if (w && typeof w.requestAnimationFrame === "function") {
      raf1 = w.requestAnimationFrame(() => {
        raf2 = w.requestAnimationFrame(() => {
          timer = w.setTimeout(reveal, 150);
        });
      });
    } else {
      timer = setTimeout(reveal, 150);
    }
    return () => {
      if (w && typeof w.cancelAnimationFrame === "function") {
        if (raf1) w.cancelAnimationFrame(raf1);
        if (raf2) w.cancelAnimationFrame(raf2);
      }
      if (timer) clearTimeout(timer);
    };
  }, [phase]);

  // Auth observer: source of truth for restore + later changes. On any user,
  // start the handoff immediately.
  useEffect(() => {
    aliveRef.current = true;
    const unsub = subscribeAuth(
      (u) => {
        setUser(u);
        if (u) {
          startHandoff(u);
        } else if (startedRef.current && !logoutReloadStartedRef.current) {
          // Signed out AFTER a handoff — by our shield's signOut OR by legacy's
          // own logout button (which we can't reliably identify in the minified
          // bundle). Legacy still owns #root with live Firestore listeners that
          // now throw permission-denied and would repaint the OLD login. Cover
          // SYNCHRONOUSLY here (in the auth callback, before any paint) and do a
          // one-time controlled reload to a clean modern boot (auth null -> modern
          // login, legacy never imported). This runs only AFTER sign-out has
          // persisted, so the fresh boot is genuinely logged out, and fires on the
          // real logout regardless of which control legacy used.
          logoutReloadStartedRef.current = true;
          // Contain the benign legacy permission-denied snapshot log for the brief
          // window before the reload navigates away (scoped + temporary).
          silenceLegacyPermissionDenied();
          showCutoverVeil();
          try {
            if (typeof window !== "undefined") window.__oxUid = undefined;
          } catch {
            /* ignore */
          }
          clearLegacyLocalSession(lastUidRef.current);
          // false (no sessionStorage) -> the in-page logout effect transitions to
          // the modern login as a fallback.
          reloadForCutoverLogout();
        }
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
    loggingOutRef.current = false; // allow a fresh logout on the next cycle
    logoutReloadStartedRef.current = false; // allow the clean reload next cycle
    setPhase("signin");
  }, [user]);

  // Legacy flash guard (visual-only): while the cutover is mid-transition, hide
  // #root so the legacy app can't paint its OLD login underneath the branded
  // overlay — covering EVERY transition phase (auth resolving, signin, starting/
  // revealing handoff, controlled reload, logout). The class is removed the moment
  // the legacy HOME is ready (signed in + "mounted"), so the real app shows. Only
  // the cutover bridge sets this; the emergency ?oriexLegacyFallback=1 path never
  // mounts the bridge, so legacy still shows there.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const el = document.documentElement;
    const homeReady = phase === "mounted" && !!user;

    // 1) Hide legacy under #root + lock zoom while the auth/transition UI is up.
    el.classList.toggle("ox-cutover-covering", !homeReady);
    el.classList.toggle("ox-auth-nozoom", !homeReady);

    // 2) iOS Safari pinch-zoom guard — scoped to the auth/transition screen only
    //    (removed once the legacy home is ready, so the app zooms normally after).
    const stopGesture = (e) => {
      try {
        e.preventDefault();
      } catch {
        /* ignore */
      }
    };
    const GESTURES = ["gesturestart", "gesturechange", "gestureend"];
    if (!homeReady) {
      GESTURES.forEach((n) => document.addEventListener(n, stopGesture, { passive: false }));
    }

    // 3) Veil control: keep the out-of-#root veil up during transitions; drop it
    //    when the modern login (React overlay) is the target UI, or — bounded by
    //    two frames + a short timeout — once the legacy home has painted.
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    const w = typeof window !== "undefined" ? window : null;
    if (homeReady) {
      if (w && typeof w.requestAnimationFrame === "function") {
        raf1 = w.requestAnimationFrame(() => {
          raf2 = w.requestAnimationFrame(() => {
            timer = w.setTimeout(hideCutoverVeil, 100);
          });
        });
      } else {
        timer = setTimeout(hideCutoverVeil, 100);
      }
    } else if (phase === "signin") {
      hideCutoverVeil();
    } else {
      showCutoverVeil();
    }

    return () => {
      GESTURES.forEach((n) => document.removeEventListener(n, stopGesture));
      if (w && typeof w.cancelAnimationFrame === "function") {
        if (raf1) w.cancelAnimationFrame(raf1);
        if (raf2) w.cancelAnimationFrame(raf2);
      }
      if (timer) clearTimeout(timer);
      el.classList.remove("ox-cutover-covering");
      el.classList.remove("ox-auth-nozoom");
    };
  }, [phase, user]);

  // Logout INTENT, the cutover way: the capture-phase shield has already cancelled
  // the legacy logout press (so legacy's own handler + its window.confirm never
  // run). Instead of signing out immediately, OPEN the modern confirmation dialog
  // over the legacy home. Only an explicit confirm performs the sign-out.
  const onLogoutIntent = useCallback(() => {
    if (loggingOutRef.current) return; // a sign-out is already in flight
    setConfirmingLogout(true);
  }, []);

  // Dismiss the confirmation — stay on the legacy home, nothing signed out.
  const cancelLogout = useCallback(() => setConfirmingLogout(false), []);

  // Confirmed: run the cutover sign-out. Raise the veil, clear the safe legacy
  // fast-start keys (genron_uid + genron_profile_<uid>) and the uid global, then
  // MODERN Firebase sign-out. The auth observer then runs the one-time clean
  // reload once auth is null (after sign-out persisted) so the page boots into the
  // modern login (legacy never imported, no permission-denied repaint). Never logs
  // credentials. Idempotent.
  const confirmLogout = useCallback(() => {
    setConfirmingLogout(false);
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    // Contain the one benign legacy permission-denied snapshot log during the
    // signOut -> reload window (legacy listeners can't be detached). Scoped + temporary.
    silenceLegacyPermissionDenied();
    showCutoverVeil();
    try {
      if (typeof window !== "undefined") window.__oxUid = undefined;
    } catch {
      /* ignore */
    }
    clearLegacyLocalSession(lastUidRef.current);
    // Sign out, then immediately do the one-time clean reload. We reload from HERE
    // (not only from the auth observer) because when legacy signs out on its own
    // instance the modern observer may not fire promptly — leaving legacy's
    // onSnapshot listeners retrying permission-denied in a flood. Reloading right
    // after sign-out persists boots a clean modern login (legacy never imported),
    // which stops the listeners entirely. Veil stays up across the reload; the
    // observer remains a backstop. Never log credentials.
    logout()
      .catch(() => {
        /* swallow — nothing sensitive to surface */
      })
      .finally(() => {
        reloadForCutoverLogout();
      });
  }, []);

  // Install the capture-phase logout shield ONLY while the legacy home is
  // mounted in cutover mode. It cancels a legacy logout press before legacy's own
  // handler runs (so the old login never renders) and calls onLogoutIntent. The
  // shield is removed when the home isn't mounted, and is never installed on the
  // emergency ?oriexLegacyFallback=1 path (that route never mounts this bridge).
  useEffect(() => {
    const homeReady = phase === "mounted" && !!user;
    if (!homeReady) return undefined;
    return installCutoverLogoutShield({ onLogoutIntent });
  }, [phase, user, onLogoutIntent]);

  // Logout cover (visual-only): after a handoff, the instant Firebase Auth drops
  // to null (the user signed out), render a branded cover in THIS render rather
  // than null. Otherwise there is one painted frame — auth is null but the logout
  // effect below hasn't run yet, so phase is still "mounted" and we'd render null
  // — in which legacy repaints its OLD login underneath. The cover is fixed and
  // sits on top (max z-index), so legacy's login can't flash even if it repaints
  // in the same frame. The effect then clears session state and moves to "signin".
  // Bounded: this branch is only reachable while signed out, so logout failure
  // (user stays present) never leaves an infinite cover.
  if (startedRef.current && !user) {
    return (
      <Overlay>
        <BrandedLoader message="ログアウトしています…" />
      </Overlay>
    );
  }

  // Logout confirmation: shown OVER the legacy home (dimmed backdrop). Replaces
  // legacy's suppressed window.confirm. Lives inside the cutover host, so the
  // shield's modern-UI skip ignores these buttons.
  if (confirmingLogout && user) {
    return (
      <div
        className="ox-auth ox-auth-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="ログアウトの確認"
      >
        <div className="ox-auth-card" style={{ textAlign: "center" }}>
          <OriexMark />
          <h2 className="ox-auth-title" style={{ fontSize: 20, marginBottom: 4 }}>
            ログアウトしますか？
          </h2>
          <p className="ox-auth-subtitle">またのご利用をお待ちしています。</p>
          <div className="ox-auth-modal-actions">
            <button type="button" className="ox-auth-primary" onClick={confirmLogout}>
              ログアウト
            </button>
            <button type="button" className="ox-auth-switch-btn" onClick={cancelLogout}>
              キャンセル
            </button>
          </div>
          <p className="ox-auth-version">{APP_VERSION_LABEL}</p>
        </div>
      </div>
    );
  }

  // Legacy now owns #root — render nothing so only the real app shows.
  if (phase === "mounted") return null;

  if (phase === "error") {
    return (
      <Overlay>
        <div className="ox-auth">
          <div className="ox-auth-card ox-auth-loading">
            <OriexMark />
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

  // Handoff done, legacy painting behind the cover — keep the SAME branded cover
  // up briefly (see the reveal-settle effect) so the old legacy screen can't flash.
  if (phase === "revealing") {
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
