// Timer helpers. The running timer keeps seconds in local state / localStorage
// only — Firestore is written just once, on "finish & save".

export function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// Whole minutes (floor) for display.
export function secondsToMinutes(totalSeconds) {
  return Math.floor(Math.max(0, totalSeconds) / 60);
}

// Minutes to actually save: floor, but round anything >0 and <1min up to 1.
export function minutesToSave(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s === 0) return 0;
  const m = Math.floor(s / 60);
  return m < 1 ? 1 : m;
}

export function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/* ---------- local temp persistence (so leaving the screen doesn't lose time) ----------
 * Stored shape: { bookId, memo, accumSeconds, running, lastStart }
 * elapsed = accumSeconds + (running ? (now - lastStart)/1000 : 0)
 * Key is uid-scoped and lives in the oriex_ namespace. This is temp state only —
 * NOT the vocab review/userVocab stores.
 */
const keyFor = (uid) => `oriex_timer_${uid || "anon"}`;

export function loadTimerState(uid) {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return null;
    return {
      bookId: s.bookId ?? "",
      memo: typeof s.memo === "string" ? s.memo : "",
      accumSeconds: Number(s.accumSeconds) || 0,
      running: !!s.running,
      lastStart: Number(s.lastStart) || null,
    };
  } catch {
    return null;
  }
}

export function saveTimerState(uid, state) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}

export function clearTimerState(uid) {
  try {
    localStorage.removeItem(keyFor(uid));
  } catch {
    // ignore
  }
}

// Compute current elapsed seconds from a persisted/working state object.
export function elapsedSeconds(state) {
  if (!state) return 0;
  const base = Number(state.accumSeconds) || 0;
  if (state.running && state.lastStart) {
    return base + Math.max(0, (Date.now() - state.lastStart) / 1000);
  }
  return base;
}
