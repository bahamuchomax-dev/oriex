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
    };
  } catch {
    return null;
  }
}

/** An avatar image URL only when it's a real image (URL/dataURL); else null. */
export function accountAvatarImg(acct) {
  const a = acct && acct.avatar;
  return typeof a === "string" && /^(https?:|data:image)/.test(a) ? a : null;
}
