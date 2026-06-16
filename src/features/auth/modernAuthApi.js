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

import { auth, db } from "../../firebase/firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
async function writeOwnProfile(uid, { shortId, name, avatar, color }) {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : shortId;
  const icon = { avatar, color };

  const profile = assertSafePayload(
    withIconFields({ shortId, name: safeName, updatedAt: serverTimestamp() }, icon),
  );
  await setDoc(doc(db, "users", uid, "profile", "main"), profile, { merge: true });

  // Public, non-secret lookup/display card (friend search / leaderboard).
  const card = assertSafePayload(
    withIconFields({ shortId, uid, name: safeName, updatedAt: serverTimestamp() }, icon),
  );
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
export async function signUpWithInviteCode({ inviteCode, password, name, avatar, color } = {}) {
  if (!validateInviteCode(inviteCode)) throw new Error("invalid-invite-code");

  const shortId = generateFriendId();
  const email = makeInternalAuthEmailFromFriendId(shortId);

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await writeOwnProfile(uid, { shortId, name, avatar, color });
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

/** Sign the current user out of Firebase Auth. */
export async function logout() {
  await signOut(auth);
}
