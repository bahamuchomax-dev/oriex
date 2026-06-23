/* ============================================================
 * vocabDistDot — red 赤ぽっち on the OLD (legacy) home's 単語帳 quick-tool when a
 * teacher has distributed new vocabulary the student hasn't opened yet.
 * ------------------------------------------------------------
 * The NEW v2 home shows this via src/features/home/distributedVocab.js (a badge on
 * its 単語帳 tile). The legacy home is a SEPARATE React render inside the frozen
 * bundle; its rx-quick dot system only lights for plaza/customApp, not wordbook. So
 * we add the same dot here as a cosmetic DOM patch (the friendCover.js pattern) and
 * drive it from the SAME unread source (localStorage oxhVocabSeenAt) so both homes
 * agree and clear together — opening EITHER 単語帳 marks it seen.
 *
 * Reads the distributed words via the shared loader (one lazy getDocs, cached ~60s);
 * never writes a shared doc, never throws (a cosmetic dot must not break the app).
 * ============================================================ */
import {
  loadDistributedVocab,
  unreadVocabCount,
  getVocabSeenAt,
  markVocabSeen,
} from "../features/home/distributedVocab.js";

let unread = 0;
let loaded = false;

/** (Re)load the distributed words and recompute the unread count, then repaint. */
function refreshCount() {
  // Skip the network read while the tab is hidden (PWA backgrounded). A cosmetic dot
  // never needs to poll Firestore in the background — the loader runs again on focus.
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  loadDistributedVocab()
    .then((ws) => {
      if (!Array.isArray(ws)) return; // read failed → keep the last known state
      // First run baseline (mirrors the new home): if the student has never opened
      // 単語帳, treat "now" as the baseline so an existing corpus isn't all "new".
      if (!getVocabSeenAt()) markVocabSeen();
      unread = unreadVocabCount(ws);
      loaded = true;
      paint();
    })
    .catch(() => {});
}

/** The old-home 単語帳 quick-tool: a .rx-q whose label reads 単語帳 (NOT the palette
 *  editor tile, which carries a ＋/− toggle). */
function findWordbookTile() {
  if (typeof document === "undefined" || !document.querySelectorAll) return null;
  const tiles = document.querySelectorAll(".rx-q");
  for (let i = 0; i < tiles.length; i++) {
    const txt = tiles[i].textContent || "";
    if (txt.indexOf("単語帳") !== -1 && txt.indexOf("＋") === -1 && txt.indexOf("−") === -1) {
      return tiles[i];
    }
  }
  return null;
}

function paint() {
  try {
    const tile = findWordbookTile();
    if (!tile) return;
    let dot = tile.querySelector(".ox-vocab-dot");
    if (loaded && unread > 0) {
      if (!dot) {
        dot = document.createElement("span");
        dot.className = "ox-vocab-dot";
        // Match the bundle's own rx-quick dot (top:6px; right:16%; #ff3b30 ring).
        dot.style.cssText =
          "position:absolute;top:6px;right:16%;width:11px;height:11px;border-radius:99px;" +
          "background:#ff3b30;border:2px solid var(--card);z-index:2;pointer-events:none;";
        tile.appendChild(dot);
      }
      if (!tile.__oxVocabBound) {
        // Opening 単語帳 = seen. Capture phase so it runs alongside the bundle's nav.
        tile.addEventListener(
          "click",
          () => {
            markVocabSeen();
            unread = 0;
            const d = tile.querySelector(".ox-vocab-dot");
            if (d) d.remove();
          },
          true,
        );
        tile.__oxVocabBound = true;
      }
    } else if (dot) {
      dot.remove();
    }
  } catch {
    /* cosmetic — never break the app */
  }
}

/** Install the old-home vocab dot. Idempotent; browser-only. */
export function installVocabDistDot() {
  if (typeof document === "undefined") return;
  try {
    refreshCount();
    if (typeof window !== "undefined" && window.MutationObserver) {
      let queued = false;
      const schedule = () => {
        if (queued) return;
        queued = true;
        setTimeout(() => {
          queued = false;
          if (!document.hidden) paint();
        }, 100);
      };
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
    // Backstop repaint (re-applies the dot if React re-rendered the tile away) and a
    // slower re-read to pick up freshly distributed words within a session. The read
    // poll is 15min (the shared loader keeps its own durable 10min cache, so a tick is a cache
    // hit unless genuinely stale) and is visibility-gated in refreshCount — a teacher
    // rarely distributes new words mid-session, so this is ample and far cheaper.
    setInterval(() => { if (!document.hidden) paint(); }, 2000);
    setInterval(refreshCount, 900000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshCount();
    });
  } catch {
    /* ignore */
  }
}
