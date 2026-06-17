/* ============================================================
 * realAccount — read the logged-in user's cached identity so the new home shows
 * the REAL account (name + avatar), not demo placeholders. The auth cutover seeds
 * this at localStorage `genron_uid` + `genron_profile_{uid}` (see
 * src/features/auth/legacyLocalSession.js). Pure read; returns null when there is
 * no session (e.g. the ?oriexHome=1 preview with no login) so callers fall back to
 * demo. Browser-only; never throws.
 * ============================================================ */
const PREFIX = "genron_";

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(PREFIX + key) || "null");
  } catch {
    return null;
  }
}

/** The cached account identity, or null if not signed in. */
export function getAccount() {
  try {
    const uid = readJson("uid");
    if (!uid || typeof uid !== "string") return null;
    const p = readJson("profile_" + uid);
    if (!p || typeof p !== "object") return null;
    return {
      uid,
      name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : null,
      avatar: typeof p.avatar === "string" && p.avatar ? p.avatar : null,
      color: typeof p.color === "string" && p.color ? p.color : null,
      shortId: typeof p.shortId === "string" ? p.shortId : null,
      isTeacher: p.isTeacher === true,
    };
  } catch {
    return null;
  }
}

/** True iff the cached account is a teacher. UX gate only (lets teachers switch to
 *  the new home anytime); real teacher authority stays on custom claims + Rules. */
export function isTeacher() {
  const a = getAccount();
  return !!(a && a.isTeacher);
}

/** An avatar image URL only when it's a real image (URL/dataURL); else null. */
export function accountAvatarImg(acct) {
  const a = acct && acct.avatar;
  return typeof a === "string" && /^(https?:|data:image)/.test(a) ? a : null;
}

// Legacy day key, matching oxHelpers' __oxStudy exactly (JST-shifted YYYY/M/D).
function legacyDayKey(ts) {
  const t = new Date(ts);
  const i = new Date(t.getTime() + (t.getTimezoneOffset() + 540) * 60000);
  return i.getFullYear() + "/" + (i.getMonth() + 1) + "/" + i.getDate();
}

/**
 * The user's REAL study history from the legacy per-day cache
 * (`oriex_local_study_minutes_{uid}` = { "YYYY/M/D": minutes }, written by
 * __oxStudy). Returns all-time total, the last-7-days series, and the current
 * streak — or null when there is no cached history (fall back to the new-home store).
 */
export function getRealStudy(acct) {
  try {
    const uid = (acct && acct.uid) || "local";
    const raw = window.localStorage.getItem("oriex_local_study_minutes_" + uid);
    const map = raw ? JSON.parse(raw) : null;
    if (!map || typeof map !== "object") return null;
    let total = 0;
    for (const k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) total += Number(map[k]) || 0;
    }
    if (total <= 0) return null;
    const DAY = 86400000;
    const now = Date.now();
    const week = [];
    for (let i = 6; i >= 0; i -= 1) {
      const ts = now - i * DAY;
      week.push({ dow: new Date(ts).getDay(), minutes: Number(map[legacyDayKey(ts)]) || 0, today: i === 0 });
    }
    let streak = 0;
    let i = (Number(map[legacyDayKey(now)]) || 0) > 0 ? 0 : 1;
    for (; ; i += 1) {
      if ((Number(map[legacyDayKey(now - i * DAY)]) || 0) > 0) streak += 1;
      else break;
    }
    return { total, week, streak };
  } catch {
    return null;
  }
}
