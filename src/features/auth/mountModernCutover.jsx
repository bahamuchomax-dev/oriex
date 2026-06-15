import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ModernCutoverBridge from "./ModernCutoverBridge.jsx";

/* ============================================================
 * mountModernCutover — lazy entry for the opt-in cutover bridge
 * ------------------------------------------------------------
 * Loaded ONLY by src/main.js when ?oriexModernCutover=1 is set (see
 * cutoverRoute.js). The bridge UI renders into a SEPARATE host
 * (#oriex-modern-cutover), leaving #root free for the legacy app to self-mount
 * into during the handoff. Once handed off, the bridge renders nothing, so only
 * the real legacy app is visible. Dynamic import keeps React + the bridge out of
 * normal startup. Idempotent; never throws to the caller's .then().
 * ============================================================ */

export function mountModernCutover() {
  if (typeof document === "undefined") return null;

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
