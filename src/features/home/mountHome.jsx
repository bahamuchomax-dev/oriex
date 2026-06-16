import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "./Home.jsx";

/* ============================================================
 * mountHomePreview — lazy entry for the opt-in new home
 * ------------------------------------------------------------
 * Loaded ONLY by src/main.js when the new home is explicitly enabled
 * (see homePreviewRoute.js). main.js imports this with a dynamic import(), so
 * React + the home land in a separate lazy chunk and never touch normal
 * startup. Idempotent; never throws to the caller's .then().
 * ============================================================ */

export function mountHomePreview(opts = {}) {
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
      <Home
        current="home"
        onOpen={(key) => {
          // Standalone preview: no router yet. Log taps so you can see wiring.
          // When this becomes the real home, replace with your navigate(key).
          try { console.debug("[oriex home] open:", key); } catch { /* ignore */ }
        }}
      />
    </StrictMode>,
  );
  return root;
}
