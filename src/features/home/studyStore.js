/* ============================================================
 * studyStore — the single source of truth for the new home + its feature views.
 * localStorage-backed (no backend); a tiny pub/sub so screens re-render on change.
 * A study TIMER records sessions here; the home dashboard, 分析, カレンダー, 記録,
 * and the coin balance all READ from here, so the app behaves like one connected
 * study tracker. Demo-seeded once (then persisted) so dashboards are alive on first
 * open. Browser-only; every storage access is wrapped in try/catch.
 * ============================================================ */
import { useSyncExternalStore } from "react";

const KEY = "oxhStudy";
const DAY = 86400000;

export const SUBJECTS = [
  { key: "math", label: "数学", color: "#e8273c" },
  { key: "english", label: "英語", color: "#3f8dff" },
  { key: "science", label: "理科", color: "#9a6bff" },
  { key: "japanese", label: "国語", color: "#2bd47e" },
  { key: "social", label: "社会", color: "#ffb020" },
  { key: "other", label: "その他", color: "#7c8aa0" },
];
const SUBJECT_MAP = SUBJECTS.reduce((m, s) => ((m[s.key] = s), m), {});
export function subjectInfo(key) {
  return SUBJECT_MAP[key] || SUBJECTS[SUBJECTS.length - 1];
}

// ---- date helpers (browser Date is fine here) ------------------------------
export function dateKey(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${da}`;
}
export function todayKey() {
  return dateKey(Date.now());
}
export function fmtMinutes(min) {
  const v = Math.max(0, Math.round(min || 0));
  const h = Math.floor(v / 60);
  const m = v % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// ---- seed: ~21 days of plausible sessions (deterministic, no RNG) -----------
function seed() {
  // Start EMPTY so the home reflects the user's REAL recorded activity, not demo
  // data. Sessions accrue as they use the timer; the 累計/連続/レベル/7日 stats and the
  // レジェンド (10h) goal are then all based on real study. (Reset via 設定 to clear an
  // already-seeded store from an earlier build.)
  return { sessions: [], goalMin: 180, coins: 0, realMinutes: 0, level1At: Date.now() };
}

function normalize(o) {
  return {
    sessions: Array.isArray(o.sessions) ? o.sessions.filter((s) => s && s.ts && s.minutes) : [],
    goalMin: typeof o.goalMin === "number" ? o.goalMin : 180,
    coins: typeof o.coins === "number" ? o.coins : 0,
    level1At: o.level1At || Date.now(),
    realMinutes: typeof o.realMinutes === "number" ? o.realMinutes : 0,
  };
}

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.sessions)) return normalize(o);
    }
  } catch {
    /* ignore */
  }
  return seed();
}

let state = load();
const subs = new Set();

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
function emit() {
  persist();
  subs.forEach((fn) => {
    try {
      fn(state);
    } catch {
      /* ignore */
    }
  });
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function getState() {
  return state;
}

// ---- mutations -------------------------------------------------------------
function coinsForMinutes(min) {
  return Math.max(1, Math.round(min / 5)); // ~1 coin / 5 min studied
}
/** Record a finished study session. Returns the new state. */
export function addSession({ minutes, subject } = {}) {
  const m = Math.max(1, Math.round(minutes || 0));
  const s = { id: Date.now(), ts: Date.now(), minutes: m, subject: subject || "other" };
  state = {
    ...state,
    sessions: [s, ...state.sessions],
    coins: state.coins + coinsForMinutes(m),
    realMinutes: (state.realMinutes || 0) + m,
  };
  emit();
  return state;
}
export function addCoins(n) {
  state = { ...state, coins: Math.max(0, state.coins + (n || 0)) };
  emit();
  return state;
}
export function spendCoins(n) {
  state = { ...state, coins: Math.max(0, state.coins - (n || 0)) };
  emit();
  return state;
}
export function setGoal(min) {
  state = { ...state, goalMin: Math.max(15, Math.round(min || 0)) };
  emit();
  return state;
}

// ---- selectors -------------------------------------------------------------
export function minutesByDay(st = state) {
  const m = {};
  for (const s of st.sessions) {
    const k = dateKey(s.ts);
    m[k] = (m[k] || 0) + s.minutes;
  }
  return m;
}
export function todayMinutes(st = state) {
  return minutesByDay(st)[todayKey()] || 0;
}
export function weekSeries(st = state) {
  const m = minutesByDay(st);
  const now = Date.now();
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const ts = now - i * DAY;
    const k = dateKey(ts);
    out.push({ dateKey: k, minutes: m[k] || 0, today: i === 0, dow: new Date(ts).getDay() });
  }
  return out;
}
export function totalMinutes(st = state) {
  return st.sessions.reduce((a, s) => a + s.minutes, 0);
}
export function streakDays(st = state) {
  const m = minutesByDay(st);
  let n = 0;
  let i = (m[todayKey()] || 0) > 0 ? 0 : 1; // allow "not yet today" to keep yesterday's streak
  for (; ; i += 1) {
    const k = dateKey(Date.now() - i * DAY);
    if ((m[k] || 0) > 0) n += 1;
    else break;
  }
  return n;
}
export function subjectBreakdown(st = state) {
  const by = {};
  for (const s of st.sessions) by[s.subject] = (by[s.subject] || 0) + s.minutes;
  const total = totalMinutes(st) || 1;
  return SUBJECTS.map((su) => ({
    ...su,
    minutes: by[su.key] || 0,
    pct: Math.round(((by[su.key] || 0) / total) * 100),
  }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
/** Sessions for a given Y/M (month 0-based), grouped by dateKey -> {minutes, subjects[]}. */
export function monthMap(year, month, st = state) {
  const out = {};
  for (const s of st.sessions) {
    const d = new Date(s.ts);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const k = dateKey(s.ts);
    if (!out[k]) out[k] = { minutes: 0, subjects: new Set() };
    out[k].minutes += s.minutes;
    out[k].subjects.add(s.subject);
  }
  return out;
}
export function sessionsOn(dKey, st = state) {
  return st.sessions.filter((s) => dateKey(s.ts) === dKey).sort((a, b) => b.ts - a.ts);
}
export function recentSessions(limit = 30, st = state) {
  return [...st.sessions].sort((a, b) => b.ts - a.ts).slice(0, limit);
}
export function level(st = state) {
  const t = totalMinutes(st);
  const lvl = Math.floor(t / 600) + 1; // a level every 10h
  const into = t - (lvl - 1) * 600;
  return { level: lvl, xp: t, xpPct: Math.round((into / 600) * 100) };
}

// ---- React hook ------------------------------------------------------------
export function useStudy() {
  return useSyncExternalStore(subscribe, getState, getState);
}
