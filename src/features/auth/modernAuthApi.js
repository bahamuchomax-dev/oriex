// Modern Firebase Auth operations for the opt-in login shell.
//
// SECURITY CONTRACT (see AUTH_RECOVERY_PLAN.md / FIREBASE_AUTH_IMPLEMENTATION_SEQUENCE.md):
//   - Firebase Auth owns passwords. The password is passed ONLY to the Firebase
//     Auth SDK; it is never written to Firestore and never logged.
//   - Login derives the internal email deterministically from the Friend ID and
//     calls signInWithEmailAndPassword. It NEVER reads another user's
//     profile/main, never queries profile/main by Friend ID, and never compares
//     a password on the client. (This module imports no Firestore READ primitive.)
//   - Firestore writes are owner-only (the authenticated user's own docs) and are
//     run through assertSafePayload(), which rejects any credential / authority /
//     answer field — so no plaintext credential can ever be written.

import { auth } from "../../firebase/firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  normalizeFriendId,
  validateFriendIdFormat,
  makeInternalAuthEmailFromFriendId,
  generateFriendId,
} from "./friendIdAuth.js";
import { validateInviteCode } from "./inviteCode.js";

// Fields a client may write to its own profile / public card. Anything else —
// and in particular any credential / authority / answer field — is rejected.
export const ALLOWED_PROFILE_FIELDS = ["shortId", "uid", "name", "createdAt", "updatedAt"];
const FORBIDDEN_FIELDS = [
  "password", "passwordHash", "pass", "pin", "secret", "credential", "token",
  "role", "admin", "teacher", "isTeacher", "teacherId", "claims", "permissions",
  "answer", "correctAnswer", "explanation", "solution", "answerKey", "answers",
];

/** Throw if a Firestore payload carries any forbidden (credential/authority/answer) field. */
export function assertSafePayload(data) {
  for (const key of Object.keys(data || {})) {
    if (FORBIDDEN_FIELDS.includes(key)) {
      throw new Error("unsafe field in Firestore payload: " + key);
    }
  }
  return data;
}

// Optional non-secret icon fields chosen at signup. `avatar` is either a
// character key OR a small pre-resized JPEG data URL (see iconImage.js) — the
// legacy app renders it as <img src={avatar}>. Both stay well under Firestore's
// document size limit. Neither is a credential/authority/answer field, so
// assertSafePayload accepts them. Only included when actually set.
function withIconFields(base, { avatar, color } = {}) {
  const out = { ...base };
  if (typeof avatar === "string" && avatar) out.avatar = avatar;
  if (typeof color === "string" && color) out.color = color;
  return out;
}

// Write the authenticated user's OWN profile + public directory card. No
// password, no authority, no answers — guarded by assertSafePayload.
async function writeOwnProfile(uid, { shortId, name, avatar, color, targetSchool }) {
  const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
    import("../../firebase/db.js"),
    import("firebase/firestore"),
  ]);
  const safeName = typeof name === "string" && name.trim() ? name.trim() : shortId;
  const icon = { avatar, color };
  const ts = typeof targetSchool === "string" && targetSchool.trim() ? targetSchool.trim() : "";

  const profileBase = withIconFields({ shortId, name: safeName, updatedAt: serverTimestamp() }, icon);
  if (ts) profileBase.targetSchool = ts;
  const profile = assertSafePayload(profileBase);
  await setDoc(doc(db, "users", uid, "profile", "main"), profile, { merge: true });

  const cardBase = withIconFields({ shortId, uid, name: safeName, updatedAt: serverTimestamp() }, icon);
  if (ts) cardBase.targetSchool = ts;
  const card = assertSafePayload(cardBase);
  await setDoc(doc(db, "public", "data", "customApp", uid), card, { merge: true });
}

/**
 * Sign up with an INVITE CODE + password. The Friend ID is GENERATED (a new user
 * does not type one); the gate is the invite code. Creates a real Firebase Auth
 * user keyed by the deterministic internal email derived from the generated
 * Friend ID, then writes the owner's profile (NO password, NO invite code).
 *
 * The invite code is validated but NEVER written to Firestore and NEVER logged.
 * @returns {Promise<{ uid: string, shortId: string }>}
 */
export async function signUpWithInviteCode({ inviteCode, password, name, avatar, color, targetSchool, debug = false } = {}) {
  // `debug` is the test-student shortcut (name === "デバッグ123"): it skips the
  // invite-code gate so a throwaway test account can be made without a code. It
  // still creates a real Firebase user keyed by a generated Friend ID — nothing
  // special is written to Firestore, so it is an ordinary (test) student.
  if (!debug && !validateInviteCode(inviteCode)) throw new Error("invalid-invite-code");

  const shortId = generateFriendId();
  const email = makeInternalAuthEmailFromFriendId(shortId);

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await writeOwnProfile(uid, { shortId, name, avatar, color, targetSchool });
  return { uid, shortId };
}

/**
 * Log in with a Friend ID + password via Firebase Auth. Derives the internal
 * email deterministically — no profile/main read, no password comparison.
 * @returns {Promise<{ uid: string }>}
 */
export async function loginWithFriendId({ friendId, password } = {}) {
  const shortId = normalizeFriendId(friendId);
  if (!validateFriendIdFormat(shortId)) throw new Error("invalid-friend-id-format");
  const email = makeInternalAuthEmailFromFriendId(shortId);

  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid };
}

/**
 * Change the CURRENT user's own password through Firebase Auth (the only place a
 * password actually lives now). Firebase requires a recent login for this, so we
 * reauthenticate with the current password first, then updatePassword.
 *
 * IMPORTANT: the legacy in-app "password change" wrote a plaintext `password`
 * field to Firestore, which modern login (signInWithEmailAndPassword) never
 * reads — so those changes never took effect. This is the correct, reflected
 * path. Nothing is written to Firestore and no password is logged.
 *
 * NOTE: this changes the SIGNED-IN user's own password only. Changing ANOTHER
 * user's password (admin action) cannot be done from the client SDK — use the
 * Admin SDK (scripts/migrateUser.mjs <FriendID> --password <pw>) or a callable
 * admin Cloud Function.
 *
 * @returns {Promise<{ uid: string }>}
 */
export async function changePassword({ currentPassword, newPassword } = {}) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("not-signed-in");
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new Error("weak-password");
  }
  // Reauthenticate (Firebase rejects updatePassword without a recent login).
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  return { uid: user.uid };
}

/** Sign the current user out of Firebase Auth. */
export async function logout() {
  await signOut(auth);
}
