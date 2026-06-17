import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StudentAppsScreen from "./StudentAppsScreen.jsx";

/* ============================================================
 * mountStudentApps — show the React StudentAppsScreen IN PLACE of the legacy
 * "先生からの問題 / 配布アプリ" (customApp) student LIST view, so opened teacher items
 * move to 過去 (bug 2-1). Same approach as mountTeacherAdmin: DETECT the legacy
 * screen by its title, hide it, cover with the React overlay; closing clicks the
 * legacy 戻る so navigation stays correct.
 *
 * Student-only by nature: those titles only render for a non-teacher (the teacher
 * sees "配信" + the create form, which we never touch). The "配信" landing with the
 * two toggle buttons is also left legacy — tapping a toggle shows a LIST title,
 * which is when our overlay takes over.
 * ============================================================ */

const TITLES = ["先生からの問題", "配布アプリ"];
const HOST_ID = "ox-student-apps";

let host = null;
let shown = false;
let hiddenLegacy = null;

function findLegacyScreen() {
  try {
    const nodes = document.querySelectorAll("h1,h2,h3");
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (TITLES.indexOf((n.textContent || "").trim()) < 0) continue;
      if (n.closest && n.closest("#" + HOST_ID)) continue; // ignore our overlay
      // walk up to the customApp screen container (the space-y-6 wrapper)
      let p = n;
      for (let h = 0; h < 6 && p; h += 1) {
        const cls = (p.className && typeof p.className === "string" && p.className) || "";
        if (cls.indexOf("space-y-6") >= 0) return p;
        p = p.parentElement;
      }
      return n.parentElement;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clickLegacyBack(container) {
  try {
    const scope = container && container.querySelector ? container : document;
    const btn =
      scope.querySelector('button.rx-back, button[aria-label="戻る"]') ||
      document.querySelector('button.rx-back, button[aria-label="戻る"]');
    if (btn) btn.click();
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
      <StudentAppsScreen onClose={() => clickLegacyBack(hiddenLegacy)} />
    </StrictMode>,
  );
}

function tick() {
  try {
    const legacy = findLegacyScreen();
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
export function installStudentApps() {
  if (typeof document === "undefined" || document.getElementById(HOST_ID)) return;
  try {
    ensureHost();
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
    setInterval(tick, 400);
    tick();
  } catch {
    /* ignore */
  }
}
