import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ModernAuthShell from "./ModernAuthShell.jsx";

/* ============================================================
 * mountModernAuth — lazy entry for the opt-in Firebase Auth shell
 * ------------------------------------------------------------
 * Loaded ONLY by src/main.js when the modern auth shell is explicitly enabled
 * (see modernAuthRoute.js). Because main.js imports this with a dynamic
 * import(), React + the shell land in a separate lazy chunk and never touch
 * normal startup. Idempotent; never throws to the caller's .then().
 * ============================================================ */

export function mountModernAuth(opts = {}) {
  if (typeof document === "undefined") return null;
  const host =
    document.getElementById(opts.id || "root") ||
    (() => {
      const el = document.createElement("div");
      el.id = "root";
      document.body.appendChild(el);
      return el;
    })();
  // This opt-in screen owns the mount node; clear anything already there.
  try {
    while (host.firstChild) host.removeChild(host.firstChild);
  } catch {
    /* ignore */
  }
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <ModernAuthShell />
    </StrictMode>,
  );
  return root;
}
