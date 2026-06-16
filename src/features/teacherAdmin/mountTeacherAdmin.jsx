import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TeacherAdminPanel from "./TeacherAdminPanel.jsx";

/* ============================================================
 * mountTeacherAdmin — show the React TeacherAdminPanel IN PLACE of the dark legacy
 * 先生用管理 screen. The legacy screen is in the frozen bundle and a DOM/CSS patch
 * could not make it readable (React kept resetting inline styles), so instead we
 * DETECT it (by its title) and cover it with the clean React overlay; closing the
 * overlay clicks the legacy 終了 so navigation stays correct. Teacher-only by
 * nature: the title only appears on the legacy teacher admin.
 * ============================================================ */

const ADMIN_TITLE = "先生用管理";
const HOST_ID = "ox-teacher-admin";

let host = null;
let shown = false;
let hiddenLegacy = null;

// The legacy admin container, found by its title — but NEVER our own overlay
// (which also renders a "先生用管理" heading).
function findLegacyAdmin() {
  try {
    const nodes = document.querySelectorAll("h1,h2,h3,div,span");
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if ((n.textContent || "").trim() !== ADMIN_TITLE) continue;
      if (n.closest && n.closest("#" + HOST_ID)) continue; // ignore our overlay
      let p = n;
      for (let h = 0; h < 8 && p; h += 1) {
        if (p.style && p.style.position === "absolute") return p;
        p = p.parentElement;
      }
      return n.parentElement;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clickLegacyClose() {
  try {
    const btns = document.querySelectorAll("button");
    for (let i = 0; i < btns.length; i += 1) {
      if ((btns[i].textContent || "").trim() === "終了" && !(btns[i].closest && btns[i].closest("#" + HOST_ID))) {
        btns[i].click();
        return;
      }
    }
  } catch {
    /* ignore */
  }
}

function ensureHost() {
  if (host) return;
  host = document.createElement("div");
  host.id = HOST_ID;
  host.style.display = "none";
  document.body.appendChild(host);
  createRoot(host).render(
    <StrictMode>
      <TeacherAdminPanel onClose={clickLegacyClose} />
    </StrictMode>,
  );
}

function tick() {
  try {
    const legacy = findLegacyAdmin();
    if (legacy) {
      if (legacy !== hiddenLegacy) {
        legacy.style.setProperty("display", "none", "important");
        hiddenLegacy = legacy;
      }
      if (!shown) {
        host.style.display = "block";
        shown = true;
      }
    } else if (shown) {
      host.style.display = "none";
      shown = false;
      hiddenLegacy = null;
    }
  } catch {
    /* ignore */
  }
}

/** Install the detector. Idempotent; browser-only. */
export function installTeacherAdmin() {
  if (typeof document === "undefined") return;
  try {
    ensureHost();
    // A MutationObserver covers the legacy admin the INSTANT it renders (no visible
    // flash of the old dark screen); a coalesced rAF avoids reacting per-mutation.
    if (typeof MutationObserver === "function") {
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(() => {
          queued = false;
          tick();
        }, 0);
      };
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
        characterData: true,
      });
    }
    setInterval(tick, 400); // backstop
    tick();
  } catch {
    /* ignore */
  }
}
