import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ModernCutoverBridge from "./ModernCutoverBridge.jsx";
import { showCutoverVeil } from "./cutoverVeil.js";

/* ============================================================
 * mountModernCutover — lazy entry for the default cutover bridge
 * ------------------------------------------------------------
 * Loaded by src/main.js as the default login (the ?oriexModernCutover=1 flag is
 * a no-op alias). The bridge UI renders into a SEPARATE host
 * (#oriex-modern-cutover), leaving #root free for the legacy app to self-mount
 * into during the handoff. Once handed off, the bridge renders nothing, so only
 * the real legacy app is visible. Dynamic import keeps React + the bridge out of
 * normal startup. Idempotent; never throws to the caller's .then().
 * ============================================================ */

export function mountModernCutover() {
  if (typeof document === "undefined") return null;

  // Raise the branded cutover veil IMMEDIATELY — before the legacy bundle is
  // imported and on every controlled reload — so the legacy app can never paint
  // its OLD login before the bridge takes over. The bridge removes it once the
  // target UI is ready. Only the cutover path runs this; ?oriexLegacyFallback=1
  // never mounts here, so legacy still shows there.
  showCutoverVeil();

  // Ensure #root exists for the legacy app to self-mount into during handoff.
  if (!document.getElementById("root")) {
    const r = document.createElement("div");
    r.id = "root";
    document.body.appendChild(r);
  }

  // Separate host for the bridge UI — does NOT occupy #root.
  let host = document.getElementById("oriex-modern-cutover");
  if (!host) {
    host = document.createElement("div");
    host.id = "oriex-modern-cutover";
    document.body.appendChild(host);
  }

  const root = createRoot(host);
  root.render(
    <StrictMode>
      <ModernCutoverBridge />
    </StrictMode>,
  );
  return root;
}
