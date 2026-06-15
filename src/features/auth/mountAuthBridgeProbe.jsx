import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AuthBridgeProbe from "./AuthBridgeProbe.jsx";

/* ============================================================
 * mountAuthBridgeProbe — lazy entry for the opt-in auth-bridge probe
 * ------------------------------------------------------------
 * Loaded ONLY by src/main.js when ?oriexAuthBridge=1 is set (see
 * authBridgeRoute.js). The probe UI is rendered into a SEPARATE fixed overlay
 * container, leaving #root free for the legacy app to self-mount into when the
 * probe starts it. Dynamic import keeps React + the probe out of normal startup.
 * Idempotent; never throws to the caller's .then().
 * ============================================================ */

export function mountAuthBridgeProbe() {
  if (typeof document === "undefined") return null;

  // Ensure #root exists for the legacy app to self-mount into later.
  if (!document.getElementById("root")) {
    const r = document.createElement("div");
    r.id = "root";
    document.body.appendChild(r);
  }

  // Separate overlay host for the probe UI — does NOT occupy #root.
  let host = document.getElementById("oriex-bridge-probe");
  if (!host) {
    host = document.createElement("div");
    host.id = "oriex-bridge-probe";
    document.body.appendChild(host);
  }

  const root = createRoot(host);
  root.render(
    <StrictMode>
      <AuthBridgeProbe />
    </StrictMode>,
  );
  return root;
}
