// Seed the legacy app's localStorage "fast-start" cache so it boots already
// logged-in (legacy reads its cached profile on startup: `let b=_i("profile"); if
// (b) { ...enter app... }`). This makes the cutover handoff robust on RELOAD,
// where legacy's own Firebase-Auth restoration timing previously left it on the
// old login gate.
//
// App-side localStorage interop — NOT a legacy bundle edit, NO Firestore, NO
// password, NO logging. It mirrors legacy's key format exactly:
//   __oxPk(k) = "genron_" + ((k==="profile"||k==="history") ? k+"_"+(__oxUid||"anon") : k)
// and legacy stores JSON.stringify(value).

const PREFIX = "genron_";

/** Mirror legacy `__oxPk`: per-user namespacing for "profile"/"history". */
function legacyKey(key, uid) {
  const ns = key === "profile" || key === "history";
  return PREFIX + (ns ? key + "_" + (uid || "anon") : key);
}

/**
 * Seed legacy's cached `uid` and (minimal, no-password) `profile` so it boots
 * logged-in. Does NOT overwrite a profile legacy may have already synced. Returns
 * true if it seeded, false otherwise. Never throws.
 * @param {string} uid
 * @param {{ shortId?: string, name?: string }} [profile]
 * @returns {boolean}
 */
export function seedLegacyLocalSession(uid, profile) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (!uid || typeof uid !== "string") return false;
  try {
    window.localStorage.setItem(legacyKey("uid", uid), JSON.stringify(uid));

    const profileKey = legacyKey("profile", uid);
    const p = profile || {};
    const raw = window.localStorage.getItem(profileKey);
    if (raw == null) {
      // Fresh fast-start cache (no password). Mirror the icon (avatar/color) and
      // the teacher flag from the server profile so a RELOAD shows the right
      // identity/role immediately. isTeacher here is a DISPLAY mirror only — real
      // teacher access is gated by the custom claim + Firestore Rules, so this
      // (client-editable) cache can never grant authority.
      const minimal = {
        uid,
        shortId: p.shortId || "",
        name: p.name || "",
      };
      if (p.avatar) minimal.avatar = p.avatar;
      if (p.color) minimal.color = p.color;
      if (typeof p.isTeacher === "boolean") minimal.isTeacher = p.isTeacher;
      window.localStorage.setItem(profileKey, JSON.stringify(minimal));
    } else {
      // Existing cache: refresh the AUTHORITATIVE identity fields (name / avatar /
      // color / isTeacher) from the server profile so a reload shows the CURRENT
      // account — fixes a stale cached name (e.g. reverting to an old "ユウキ") and a
      // teacher reverting to "user". shortId and any richer synced fields
      // (totalExp, etc.) are preserved (never clobbered).
      let existing = {};
      try {
        existing = JSON.parse(raw) || {};
      } catch {
        existing = {};
      }
      let changed = false;
      if (p.name && existing.name !== p.name) {
        existing.name = p.name;
        changed = true;
      }
      if (p.avatar && existing.avatar !== p.avatar) {
        existing.avatar = p.avatar;
        changed = true;
      }
      if (p.color && existing.color !== p.color) {
        existing.color = p.color;
        changed = true;
      }
      if (typeof p.isTeacher === "boolean") {
        if (existing.isTeacher !== p.isTeacher) {
          existing.isTeacher = p.isTeacher;
          changed = true;
        }
      } else if (existing.isTeacher) {
        // No authoritative value provided (e.g. an upstream fetch error) but the
        // cache still flags teacher — clear it defensively so a demoted teacher
        // doesn't keep seeing teacher UI from a stale fast-start cache.
        delete existing.isTeacher;
        changed = true;
      }
      if (changed) window.localStorage.setItem(profileKey, JSON.stringify(existing));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the legacy fast-start session keys on logout so a subsequent reload does
 * NOT fast-start as the signed-out user. Removes only the session keys (the cached
 * uid + that uid's profile); Firestore stays the source of truth. Never throws.
 * @param {string} [uid]
 * @returns {boolean}
 */
export function clearLegacyLocalSession(uid) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.removeItem(legacyKey("uid", uid));
    if (uid && typeof uid === "string") {
      window.localStorage.removeItem(legacyKey("profile", uid));
    }
    return true;
  } catch {
    return false;
  }
}
