/* ============================================================
 * Oriex - application entry point
 * ------------------------------------------------------------
 * IMPORT ORDER MATTERS. The legacy app bundle expects several globals to
 * already exist on `window`, so we install them first, then run the bundle
 * (which self-mounts into <div id="root">).
 *
 * This entry intentionally stays plain `.js` and contains no JSX. If GitHub
 * Pages is accidentally configured to serve the repository root instead of
 * the built `dist/` artifact, browsers can still load this file as a module
 * and start the legacy app.
 * ============================================================ */

const VITE_ENV = import.meta.env || {};
const APP_BASE_URL = VITE_ENV.BASE_URL || "./";

// Unified app version: expose it on window BEFORE the legacy app loads so the
// legacy home shows the current version (it reads window.__OX_APP_VERSION) instead
// of its old hard-coded "v7.36". Same value as the modern login version label.
import { APP_VERSION_LABEL } from "./appVersion.js";
try {
  if (typeof window !== "undefined") window.__OX_APP_VERSION = APP_VERSION_LABEL;
} catch {
  /* ignore */
}

// Opt-in "研鑽 (Kensan)" skin for the ORIGINAL (legacy) UI — a gated test theme.
// Pure CSS (src/styles/skin-kensan.css), inert unless <body class="ox-skin">. We
// add the class when enabled by ?oriexSkin=1 or localStorage.oriexSkin==="1"; a
// toggle (oxUiPatches) flips it live. A normal visit (flag absent) is untouched.
try {
  let skinOn = false;
  try {
    skinOn = !!(window.localStorage && window.localStorage.getItem("oriexSkin") === "1");
  } catch {
    /* ignore */
  }
  try {
    if (window.location && /[?&]oriexSkin=1(?:&|$)/.test(String(window.location.search || ""))) {
      skinOn = true;
      window.localStorage.setItem("oriexSkin", "1");
    }
  } catch {
    /* ignore */
  }
  if (skinOn) {
    // Load the opt-in skin's CSS only when it's actually enabled (Vite emits it as its
    // own hashed chunk). On a normal visit the skin <link> is no longer in index.html,
    // so its rules stop bloating the render-blocking entry stylesheet for everyone.
    import("./styles/skin-kensan.css").catch(() => {});
    if (document.body) document.body.classList.add("ox-skin");
  }
} catch {
  /* ignore */
}

// Opt-in Firestore READ METER (diagnostic). No-op unless ?oxReadMeter=1 /
// #ox-read-meter / localStorage.oxReadMeter==="1". The ~10KB module is kept OFF the
// entry/login critical path: we check the flag SYNCHRONOUSLY (so a flagged dev
// session still installs the wrapper before the first Firestore read, which happens
// later in the lazy cutover/firebase chunk) and only THEN dynamic-import it. When
// off, nothing is downloaded. Console: __oxReads.table() / .snapshot() / .reset().
try {
  let meterOn = false;
  try {
    const s = String((window.location && window.location.search) || "");
    const h = String((window.location && window.location.hash) || "");
    meterOn =
      /[?&]oxReadMeter=1(?:&|$)/.test(s) ||
      h === "#ox-read-meter" ||
      !!(window.localStorage && window.localStorage.getItem("oxReadMeter") === "1");
  } catch {
    /* ignore */
  }
  if (meterOn) {
    import("./services/diagnostics/readMeter.js")
      .then((m) => m.installReadMeter({ force: true }))
      .catch(() => {});
  }
} catch {
  /* ignore */
}

function staticSourceAssetBaseUrl() {
  if (typeof document !== "undefined") {
    const entry = document.querySelector('script[type="module"][src$="/src/main.js"], script[type="module"][src$="./src/main.js"]');
    if (entry && entry.src) return new URL("../public/", entry.src).href;
  }
  if (typeof window !== "undefined" && window.location) {
    return new URL("./public/", window.location.href).href;
  }
  return "./public/";
}

// Styles are linked from index.html. Do not import CSS here: repository-root
// GitHub Pages serves source files without Vite transforms, and raw CSS module
// imports would stop startup before the legacy app mounts.

// Legacy globals + DOM relabels the bundle relies on (window.__oxBg/__oxPbg/__oxAv/
// __oxStudy, window.OriexHamu3D, nav "マイ"→"マイページ" relabels). These are
// POST-LOGIN-ONLY — the signed-out login screen never uses them — so they are NO
// LONGER static-imported into the entry chunk. That used to put ~120KB of source
// plus 5 setIntervals and 2 document-wide MutationObservers on the LOGIN paint path
// for nothing. They are now loaded right before the legacy bundle in BOTH boot
// funnels: startLegacyApp() below (fallback paths) and features/auth/legacyHandoff.js
// (the default post-auth handoff). Order matters — the bundle calls
// window.__oxStudy()/OriexHamu3D (some sites unguarded), so the globals must exist
// before it self-mounts; both funnels guarantee that.

// Hidden diagnostic route. The embedded-AI device probe is NOT part of the
// normal app: it opens ONLY when the URL explicitly asks for it
// (?oriexProbe=embedded-ai or #embedded-ai-probe). This import is the tiny URL
// matcher only — it pulls in no React, no panel, and no AI code, so normal
// startup and the initial bundle are unaffected.
import { isEmbeddedAiProbeUrl } from "./features/embeddedAi/embeddedAiProbeRoute.js";
import { isEmbeddedAiPocUrl } from "./features/embeddedAi/embeddedAiPocRoute.js";
// Opt-in modern Firebase Auth shell gate. Tiny pure matcher (no React/Firebase),
// so normal startup and the initial bundle are unaffected when it is disabled.
import { isModernAuthEnabled } from "./features/auth/modernAuthRoute.js";
// Opt-in developer probe for the modern-auth → legacy handoff (NOT a feature,
// NOT the default login). Tiny pure matcher; off unless explicitly requested.
import { isAuthBridgeEnabled } from "./features/auth/authBridgeRoute.js";
// The modern Firebase Auth cutover is now the DEFAULT login. The explicit
// ?oriexModernCutover=1 flag is a no-op alias that falls through to this default.
// Emergency admin/dev fallback to the OLD legacy app (unsafe plaintext login) —
// reachable ONLY via this explicit flag. Tiny pure matcher; off unless requested.
import { isLegacyFallbackEnabled } from "./features/auth/legacyFallbackRoute.js";
// Opt-in preview of the new React home (NOT the default). Tiny pure matcher
// (no React / no home code), so importing it never affects normal startup or
// the initial bundle. Enabled only by ?oriexHome=1 / #oriex-home / localStorage.
import { isHomePreviewEnabled } from "./features/home/homePreviewRoute.js";
// Branded cutover veil. Dependency-free + idempotent (only reads BASE_URL, returns early
// if already shown), so importing it statically into the ENTRY chunk costs ~nothing but
// lets the default login paint its branded #fbf8f3 + icon cover the instant the entry
// chunk runs — instead of waiting for the whole firebase/React/firestore batch behind the
// lazy mountModernCutover import to download + instantiate before its own veil call.
import { showCutoverVeil } from "./features/auth/cutoverVeil.js";

// The application. Currently the original production build. Screens are being
// peeled out of here into src/features/*. The legacy bundle self-mounts the
// React app into <div id="root"> when loaded; the globals above are installed
// first (static imports), so load order is preserved.
function startLegacyApp() {
  // Establish the legacy globals + DOM relabels BEFORE the bundle self-mounts (these
  // used to be eager entry-chunk imports; moved here to keep the login paint lean).
  // Awaited so window.__oxStudy/__oxBg/__oxAv/OriexHamu3D and the nav relabels exist
  // before the bundle — some bundle call sites are unguarded. Warming a global is
  // best-effort; a failure there must not stop the app from loading.
  return Promise.all([
    import("./services/oxHelpers.js"),
    import("./features/hamster/oriexHamu3D.js"),
    import("./services/oxUiPatches.js").then((m) => m.installUiPatches()),
  ])
    .catch(() => {})
    .then(() => import("./legacy/oriex-app.bundle.js"))
    .catch((err) => console.warn("[oriex] legacy app failed to load", err));
}

// DEFAULT login path: modern Firebase Auth cutover — login/signup, ensure the
// user's own legacy profile, seed the legacy local session, then import the
// (unedited) legacy app and show Oriex home. Separate lazy chunk; on any failure
// it falls back to the legacy app so a normal visit is never left blank.
function startModernCutover() {
  // Paint the branded veil NOW, from the entry chunk — before the lazy cutover chunk
  // (and its firebase/React/firestore static graph) has even downloaded.
  showCutoverVeil();
  return import("./features/auth/mountModernCutover.jsx")
    .then((mod) => {
      if (typeof mod.mountModernCutover === "function") mod.mountModernCutover();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] modern cutover failed to load", err);
      startLegacyApp();
    });
}

// Home variant 2 — でんじゃらすじーさん (localStorage.oriexHome="2", unlocked by the
// JIISAN code in 設定). Provisional: it mounts the SAME React home as トランセンド but
// with the じーさん main character (variant: "jiisan"), via the shared mountHome chunk.
function isHome2Enabled() {
  try {
    return !!(typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("oriexHome") === "2");
  } catch {
    return false;
  }
}

const oriexLocation = typeof window !== "undefined" ? window.location : null;

if (oriexLocation && isHome2Enabled()) {
  // でんじゃらすじーさん: same home as トランセンド with the じーさん character.
  import("./features/home/mountHome.jsx")
    .then((mod) => {
      if (typeof mod.mountHomePreview === "function") mod.mountHomePreview({ variant: "jiisan" });
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] home2 (jiisan) failed to load", err);
      startLegacyApp();
    });
} else if (oriexLocation && isHomePreviewEnabled(oriexLocation)) {
  // Opt-in NEW React home (?oriexHome=1 / #oriex-home / localStorage). Separate
  // lazy chunk; never on a normal visit. Falls back to legacy on any failure so
  // a normal visit is never left blank.
  import("./features/home/mountHome.jsx")
    .then((mod) => {
      if (typeof mod.mountHomePreview === "function") mod.mountHomePreview();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] new home failed to load", err);
      startLegacyApp();
    });
} else if (oriexLocation && isLegacyFallbackEnabled(oriexLocation)) {
  // ⚠️ EMERGENCY admin/dev fallback (?oriexLegacyFallback=1) to the OLD legacy app,
  // which still has the unsafe plaintext login. Temporary, NOT a recommended user
  // path; remove once the legacy login is retired. Changes no Firestore Rules.
  startLegacyApp();
} else if (oriexLocation && isAuthBridgeEnabled(oriexLocation)) {
  // Opt-in developer probe (?oriexAuthBridge=1). Mounts the bridge probe instead
  // of the normal app; it signs in via modern auth then starts legacy to observe
  // session adoption. Separate lazy chunk; on any failure, fall back to legacy so
  // a normal visit (flag absent) is never affected.
  import("./features/auth/mountAuthBridgeProbe.jsx")
    .then((mod) => {
      if (typeof mod.mountAuthBridgeProbe === "function") mod.mountAuthBridgeProbe();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] auth bridge probe failed to load", err);
      startLegacyApp();
    });
} else if (oriexLocation && isModernAuthEnabled(oriexLocation)) {
  // Opt-in modern Firebase Auth shell (preparatory; NOT the default login).
  // Enabled only by ?oriexModernAuth=1 / #modern-auth / localStorage opt-in.
  // Separate lazy chunk; on any failure, fall back to the legacy app so a normal
  // visit (flag absent) is never affected.
  import("./features/auth/mountModernAuth.jsx")
    .then((mod) => {
      if (typeof mod.mountModernAuth === "function") mod.mountModernAuth();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] modern auth shell failed to load", err);
      startLegacyApp();
    });
} else if (oriexLocation && isEmbeddedAiPocUrl(oriexLocation)) {
  // Hidden WebGPU PoC route (phase 3A). Separate lazy chunk; never on a normal
  // visit. Falls back to the normal app on failure (no white screen).
  import("./features/embeddedAi/mountPoc.jsx")
    .then((mod) => {
      if (typeof mod.mountEmbeddedAiPoc === "function") mod.mountEmbeddedAiPoc();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] embedded AI PoC failed to load", err);
      startLegacyApp();
    });
} else if (oriexLocation && isEmbeddedAiProbeUrl(oriexLocation)) {
  // Diagnostic-only route: mount the device probe instead of the normal app.
  // The probe panel + React are a separate lazy chunk, so they never load on a
  // normal visit. On any failure, fall back to the normal app (no white screen).
  import("./features/embeddedAi/mountProbe.jsx")
    .then((mod) => {
      if (typeof mod.mountEmbeddedAiProbe === "function") mod.mountEmbeddedAiProbe();
      else startLegacyApp();
    })
    .catch((err) => {
      console.warn("[oriex] embedded AI probe failed to load", err);
      startLegacyApp();
    });
} else {
  // DEFAULT: the modern Firebase Auth cutover (includes the explicit
  // ?oriexModernCutover=1 flag, which simply falls through to here). The old
  // legacy plaintext login is no longer the default — use ?oriexLegacyFallback=1
  // for emergency admin/dev access only.
  startModernCutover();
}

// Local AI (Ollama only) UI is temporarily paused. Keep the implementation in
// src/features/localAi, but do not load its chunk or show the floating launcher
// unless this flag is intentionally re-enabled.
import { LOCAL_AI_UI_ENABLED } from "./features/localAi/uiFlag.js";
if (LOCAL_AI_UI_ENABLED) {
  import("./features/localAi/index.jsx")
    .then((mod) => {
      const mount = mod.mountLocalAiSidecar;
      if (typeof mount === "function") mount();
    })
    .catch((err) => console.warn("[oriex] local AI sidecar failed to mount", err));
}

// PWA service worker. Registered exactly once, production only, after the
// window load event, and never allowed to break the app. In repository-root
// static fallback mode `import.meta.env` is absent, so registration is skipped.
if ("serviceWorker" in navigator && VITE_ENV.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${APP_BASE_URL}sw.js`)
      .then(() => console.info("[oriex] service worker registered"))
      .catch((err) => console.warn("[oriex] service worker registration failed", err));
  });
}

// three.js OFF the critical path. The live hamster screen is still rendered by
// the frozen legacy bundle, which calls window.OriexHamu3D() synchronously when
// opened. Warm window.THREE in the background after first paint. Under Vite
// build, BASE_URL points at dist root; under repository-root static fallback,
// three.min.js lives under public/.
import { loadThree } from "./services/loadThree.js";
const preloadThree = () => {
  loadThree({ baseUrl: VITE_ENV.BASE_URL || staticSourceAssetBaseUrl() }).catch(() => {
    /* preload failure is non-fatal; on-demand loaders retry later */
  });
};
if (typeof requestIdleCallback === "function") {
  requestIdleCallback(preloadThree);
} else if (typeof window !== "undefined") {
  window.addEventListener("load", preloadThree);
}

// Voxel "探索" minigame launcher. Adds a small button to the live app that
// mounts the React Three Fiber game into its own overlay root on demand. The
// launcher module is tiny; the heavy game chunk is lazy-loaded only on click,
// so normal startup and the initial bundle are unaffected.
import("./features/voxel/launch.jsx")
  .then((m) => m.mountVoxelLauncher())
  .catch((err) => console.warn("[oriex] voxel launcher failed", err));
