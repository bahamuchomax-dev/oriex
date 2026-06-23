import { getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

// Default avatar choices (kept tiny on purpose — emoji are good enough for stage 1).
export const AVATARS = ["🐹", "🐱", "🐶", "🦊", "🐻", "🐼", "🐧", "🦉", "🐰", "🐯"];

// A small, deliberately limited color palette (matches the "reduce colors" goal).
export const COLORS = [
  { key: "cream", label: "クリーム", value: "#fbf8f3" },
  { key: "orange", label: "オレンジ", value: "#c88040" },
  { key: "purple", label: "パープル", value: "#9060b8" },
  { key: "green", label: "グリーン", value: "#208050" },
  { key: "teal", label: "ティール", value: "#14b8a6" },
  { key: "rose", label: "ローズ", value: "#ef4444" },
];

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function defaultProfile(uid) {
  return {
    uid,
    name: "ゲスト" + uid.slice(0, 4),
    avatar: AVATARS[0],
    xp: 0,
    streak: 0,
    isTeacher: false,
    comment: "",
    color: COLORS[0].value,
    bgImage: null,
    shortId: shortId(),
  };
}

const PROFILE_CACHE_MS = 5 * 60_000;
const profileCache = new Map();

function fresh(entry) {
  return entry && Date.now() - entry.at < PROFILE_CACHE_MS;
}

function remember(uid, profile) {
  profileCache.set(uid, { at: Date.now(), profile });
  return profile;
}

/**
 * Read the profile. If it doesn't exist, create an initial one and return it.
 * Reads: 1 (getDoc). Writes: 0 if it exists, 1 if it had to be created.
 */
export async function loadOrCreateProfile(uid) {
  const cached = profileCache.get(uid);
  if (fresh(cached)) return cached.profile;
  const ref = refs.profileMain(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return remember(uid, { id: snap.id, ...snap.data() });
  }
  const initial = defaultProfile(uid);
  await setDoc(ref, {
    ...initial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Also seed the public card so the user is searchable/rankable from the start.
  await syncCustomApp(uid, initial);
  return remember(uid, initial);
}

/**
 * Save the editable subset of the profile. Only call this on an explicit save
 * (never on every keystroke). Writes: 2 (profile/main + public customApp card).
 *
 * @param uid
 * @param patch  partial profile fields to merge (name, comment, color, avatar, ...)
 * @param current  the current full profile (used to build the public card)
 */
export async function saveProfile(uid, patch, current) {
  const ref = refs.profileMain(uid);
  await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });

  const merged = { ...current, ...patch };
  await syncCustomApp(uid, merged);
  return remember(uid, merged);
}

/**
 * Reflect minimal public info to public/data/customApp/{uid} for ranking / user
 * search. Merge so we never clobber other fields (e.g. an existing shortId is
 * preserved if we don't pass one). Called only from profile save / initial create.
 */
async function syncCustomApp(uid, p) {
  const publicCard = {
    uid,
    name: p.name ?? "",
    avatar: p.avatar ?? "",
    color: p.color ?? "",
    comment: p.comment ?? "",
    xp: p.xp ?? 0,
    streak: p.streak ?? 0,
    level: p.level ?? Math.floor(((p.xp ?? p.totalMinutes ?? p.studyMinutes ?? 0) || 0) / 600) + 1,
    totalMinutes: p.totalMinutes ?? p.studyMinutes ?? 0,
    coins: p.coins ?? 0,
    updatedAt: serverTimestamp(),
  };
  if (p.shortId) publicCard.shortId = p.shortId; // keep/seed; merge preserves otherwise
  await setDoc(refs.customAppUser(uid), publicCard, { merge: true });
}
