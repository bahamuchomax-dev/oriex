// Bridge helper: ensure a modern-auth user has the legacy-path profile the legacy
// app reads, so legacy adopts the Firebase Auth session and enters the app instead
// of showing its old registration/login gate.
//
// ROOT CAUSE this fixes: modern signup writes the profile to the TOP-LEVEL
// `users/{uid}/profile/main`, but the legacy app reads
// `artifacts/gen-ron-kai-app-v1/users/{uid}/profile/main`. With nothing at the
// legacy path, legacy treats the user as new and shows registration (rejecting its
// old invite code). Writing a minimal profile at the legacy path makes legacy's
// existing auth listener load it and enter the real app — NO legacy bundle edit.
//
// Strictly the signed-in user's OWN docs (isSelf — rules already allow it; no rules
// change). Writes NO password / authority / answer field (assertSafePayload), reads
// NO password, compares no password, logs nothing.

import { db } from "../../firebase/db.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { assertSafePayload } from "./modernAuthApi.js";

// The legacy app's `artifacts/{appId}` namespace (a public, non-secret id).
export const LEGACY_APP_ID = "gen-ron-kai-app-v1";

const PUBLIC_NUMBER_FIELDS = ["xp", "streak", "level", "totalMinutes", "studyMinutes", "coins"];

function publicProfileFields(src = {}) {
  const out = {};
  if (typeof src.comment === "string") out.comment = src.comment;
  // 志望校 (target school): a non-secret display string the legacy app shows on the
  // own profile (artifacts profile/main) and friend profile (artifacts customApp card).
  if (typeof src.targetSchool === "string" && src.targetSchool) out.targetSchool = src.targetSchool;
  for (const key of PUBLIC_NUMBER_FIELDS) {
    if (src[key] == null || src[key] === "") continue;
    if (Number.isFinite(Number(src[key]))) out[key] = Number(src[key]);
  }
  return out;
}

/**
 * Also write the user's OWN legacy DIRECTORY CARD at
 * artifacts/{appId}/public/data/customApp/{uid}. Without it, Friend ID search
 * (`where("shortId","==", id)`) and the connections/leaderboard list cannot FIND
 * a newly-registered user — they only had a private profile/main, never the
 * public lookup card. Rules allow a self write to this card (isSelf(cardUid)), so
 * no rules change. Non-secret card fields only (no password/authority/answer).
 */
async function ensureLegacyCard(uid, { shortId, name, avatar, color, ...publicFields } = {}) {
  if (!uid || !shortId) return; // no Friend ID yet → nothing to index
  try {
    const cardRef = doc(db, "artifacts", LEGACY_APP_ID, "public", "data", "customApp", uid);
    const card = {
      ...publicProfileFields(publicFields),
      shortId,
      uid,
      name: name || shortId,
      updatedAt: serverTimestamp(),
    };
    if (avatar) card.avatar = avatar;
    if (color) card.color = color;
    await setDoc(cardRef, assertSafePayload(card), { merge: true });
  } catch {
    /* non-fatal: the private profile still exists; card is a lookup convenience */
  }
}

/**
 * Ensure the signed-in user's OWN legacy-path profile exists. Idempotent: if it is
 * already present, does nothing. If missing, copies `shortId`/`name` from the
 * user's own modern top-level profile (no password) and writes a minimal profile
 * (no password) at the legacy path.
 * @param {string} uid  the signed-in user's own uid
 * @returns {Promise<{ ok: boolean, created?: boolean, reason?: string }>}
 */
export async function ensureLegacyBridgeProfile(uid) {
  if (!uid || typeof uid !== "string") return { ok: false, reason: "no-uid" };

  const legacyRef = doc(db, "artifacts", LEGACY_APP_ID, "users", uid, "profile", "main");
  const legacySnap = await getDoc(legacyRef);
  if (legacySnap.exists()) {
    const d = legacySnap.data() || {};
    let shortId = typeof d.shortId === "string" ? d.shortId : "";
    let name = typeof d.name === "string" ? d.name : "";
    let avatar = typeof d.avatar === "string" ? d.avatar : "";
    let color = typeof d.color === "string" ? d.color : "";
    let publicInfo = publicProfileFields(d);

    // SELF-HEAL the legacy-path profile. A doc created by an earlier/minimal bridge
    // can be MISSING the identity fields the legacy app DISPLAYS — and legacy falls
    // back to "ユウキ" when `name` is empty. The display looks right on first login
    // (driven by the fresh fast-start cache) but REVERTS on reload, which leans on
    // this legacy-path doc. Back-fill any missing name/shortId/icon from the user's
    // OWN modern profile and PERSIST it here, so a reload shows the CURRENT identity.
    // Own doc only; assertSafePayload still forbids any credential/authority field
    // (isTeacher stays admin-provisioned and is never written from the client).
    if (!name || !shortId || !avatar || !color) {
      try {
        const modernSnap = await getDoc(doc(db, "users", uid, "profile", "main"));
        if (modernSnap.exists()) {
          const m = modernSnap.data() || {};
          const patch = {};
          if (!name && typeof m.name === "string" && m.name) {
            name = m.name;
            patch.name = name;
          }
          if (!shortId && typeof m.shortId === "string" && m.shortId) {
            shortId = m.shortId;
            patch.shortId = shortId;
          }
          if (!avatar && typeof m.avatar === "string" && m.avatar) {
            avatar = m.avatar;
            patch.avatar = avatar;
          }
          if (!color && typeof m.color === "string" && m.color) {
            color = m.color;
            patch.color = color;
          }
          publicInfo = { ...publicProfileFields(m), ...publicInfo };
          if (Object.keys(patch).length > 0) {
            patch.updatedAt = serverTimestamp();
            await setDoc(legacyRef, assertSafePayload(patch), { merge: true });
          }
        }
      } catch {
        /* ignore — return whatever the legacy doc already had */
      }
    }

    // Back-fill the public directory card too (Friend ID search / connections),
    // which earlier bridges never wrote — so existing users become findable.
    await ensureLegacyCard(uid, { shortId, name, avatar, color, ...publicInfo });

    return {
      ok: true,
      created: false,
      shortId,
      name,
      avatar,
      color,
      isTeacher: d.isTeacher === true,
    };
  }

  // Carry the Friend ID / display name AND the chosen icon (avatar emoji + color,
  // or a small cropped photo data URL) from the user's own modern profile so the
  // legacy app shows a consistent identity + icon. Read own doc only; never a
  // password. Icon fields are non-secret and optional.
  let shortId = "";
  let name = "";
  let avatar = "";
  let color = "";
  let publicInfo = {};
  try {
    const modernSnap = await getDoc(doc(db, "users", uid, "profile", "main"));
    if (modernSnap.exists()) {
      const d = modernSnap.data() || {};
      if (typeof d.shortId === "string") shortId = d.shortId;
      if (typeof d.name === "string") name = d.name;
      // `avatar` is a character key OR a photo data URL (legacy renders <img src>)
      if (typeof d.avatar === "string") avatar = d.avatar;
      if (typeof d.color === "string") color = d.color;
      publicInfo = publicProfileFields(d);
    }
  } catch {
    /* ignore — proceed with a minimal profile */
  }

  const safeName = name || shortId || "";
  const base = {
    shortId,
    name: safeName,
    ...publicInfo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (avatar) base.avatar = avatar;
  if (color) base.color = color;
  // NOTE: isTeacher is an AUTHORITY field — assertSafePayload forbids writing it
  // here, and teacher accounts are provisioned with it via the admin SDK, so a
  // freshly-bridged user is never a teacher (isTeacher:false).
  const profile = assertSafePayload(base);
  await setDoc(legacyRef, profile, { merge: true });
  // Make the new user findable: write their public directory card (Friend ID
  // search + connections/leaderboard) alongside the private profile.
  await ensureLegacyCard(uid, { shortId, name: safeName, avatar, color, ...publicInfo });
  return { ok: true, created: true, shortId, name: safeName, avatar, color, isTeacher: false };
}
