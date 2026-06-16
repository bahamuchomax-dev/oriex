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

import { db } from "../../firebase/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { assertSafePayload } from "./modernAuthApi.js";

// The legacy app's `artifacts/{appId}` namespace (a public, non-secret id).
export const LEGACY_APP_ID = "gen-ron-kai-app-v1";

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
    return {
      ok: true,
      created: false,
      shortId: typeof d.shortId === "string" ? d.shortId : "",
      name: typeof d.name === "string" ? d.name : "",
      avatar: typeof d.avatar === "string" ? d.avatar : "",
      color: typeof d.color === "string" ? d.color : "",
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
  try {
    const modernSnap = await getDoc(doc(db, "users", uid, "profile", "main"));
    if (modernSnap.exists()) {
      const d = modernSnap.data() || {};
      if (typeof d.shortId === "string") shortId = d.shortId;
      if (typeof d.name === "string") name = d.name;
      // `avatar` is a character key OR a photo data URL (legacy renders <img src>)
      if (typeof d.avatar === "string") avatar = d.avatar;
      if (typeof d.color === "string") color = d.color;
    }
  } catch {
    /* ignore — proceed with a minimal profile */
  }

  const safeName = name || shortId || "";
  const base = {
    shortId,
    name: safeName,
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
  return { ok: true, created: true, shortId, name: safeName, avatar, color, isTeacher: false };
}
