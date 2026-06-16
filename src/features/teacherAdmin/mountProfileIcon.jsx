import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ProfileIconEditor from "./ProfileIconEditor.jsx";

/* ============================================================
 * mountProfileIcon — open the React ProfileIconEditor when the user taps the
 * legacy "アイコンを調整" button in profile-edit, INSTEAD of the legacy adjust
 * modal. The React editor bakes the crop into the saved image (consistent
 * everywhere) with inline preview + drag + zoom. We intercept the click in the
 * CAPTURE phase (above the legacy React root) so the old modal never opens.
 * A fixed overlay survives the legacy screen's re-renders (unlike an in-DOM swap).
 * ============================================================ */

const ADJUST = "アイコンを調整";
const HOST_ID = "ox-profile-icon";
let host = null;

function hide() {
  if (host) host.style.display = "none";
}
function show() {
  if (host) host.style.display = "flex";
}

function ensureHost() {
  if (host) return;
  host = document.createElement("div");
  host.id = HOST_ID;
  host.className = "ox-pie-backdrop";
  host.style.display = "none";
  document.body.appendChild(host);
  createRoot(host).render(
    <StrictMode>
      <div className="ox-pie-modal">
        <ProfileIconEditor />
        <button type="button" className="ox-pie-close" onClick={hide}>
          閉じる
        </button>
      </div>
    </StrictMode>,
  );
  host.addEventListener("click", (e) => {
    if (e.target === host) hide();
  });
}

/** Install the interceptor. Idempotent; browser-only. */
export function installProfileIcon() {
  if (typeof document === "undefined") return;
  try {
    ensureHost();
    document.addEventListener(
      "click",
      (e) => {
        try {
          const t = e.target;
          const btn = t && t.closest ? t.closest("button") : null;
          if (!btn || (btn.closest && btn.closest("#" + HOST_ID))) return;
          if ((btn.textContent || "").indexOf(ADJUST) >= 0) {
            e.preventDefault();
            e.stopPropagation();
            show();
          }
        } catch {
          /* ignore */
        }
      },
      true, // capture: runs before the legacy React root handler
    );
  } catch {
    /* ignore */
  }
}
