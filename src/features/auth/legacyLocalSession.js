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
    // Don't clobber a richer profile legacy already cached/synced.
    if (window.localStorage.getItem(profileKey) == null) {
      const minimal = {
        uid,
        shortId: (profile && profile.shortId) || "",
        name: (profile && profile.name) || "",
      };
      window.localStorage.setItem(profileKey, JSON.stringify(minimal));
    }
    return true;
  } catch {
    return false;
  }
}
