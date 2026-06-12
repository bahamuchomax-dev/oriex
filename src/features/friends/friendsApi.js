import {
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

/**
 * Resolve a user's current display card, preferring the public customApp card,
 * falling back to the private profile/main. Returns null if NEITHER exists
 * (treated as a deleted / withdrawn user).
 *
 * Reads: 1 (customApp hit) or 2 (customApp miss -> profile fallback).
 */
export async function resolveUserCard(uid) {
  const pubSnap = await getDoc(refs.customAppUser(uid));
  if (pubSnap.exists()) {
    const d = pubSnap.data();
    return { uid, name: d.name, avatar: d.avatar, comment: d.comment ?? "", source: "customApp" };
  }
  const profSnap = await getDoc(refs.profileMain(uid));
  if (profSnap.exists()) {
    const d = profSnap.data();
    return { uid, name: d.name, avatar: d.avatar, comment: d.comment ?? "", source: "profile" };
  }
  return null; // deleted / nonexistent
}

/**
 * Load the friend list, excluding deleted users.
 *
 * For each friend doc we resolve the *current* card (so renamed users show their
 * new name). If the target has neither profile nor customApp, it is omitted.
 *
 * Reads: 1 (friends collection) + 1–2 per friend. Acceptable for a friend list;
 * a denormalized inbox can remove the per-friend reads later.
 *
 * @returns { friends: [...], orphanUids: [...] }
 */
export async function loadFriends(uid) {
  const snap = await getDocs(refs.friendsCol(uid));
  const friends = [];
  const orphanUids = [];

  // Resolve in parallel but keep it bounded by the friend count.
  const entries = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  const cards = await Promise.all(entries.map((e) => resolveUserCard(e.data.uid ?? e.id)));

  entries.forEach((e, i) => {
    const card = cards[i];
    const fUid = e.data.uid ?? e.id;
    if (!card) {
      orphanUids.push(fUid); // friend doc exists but the user is gone
      return;
    }
    friends.push({
      uid: fUid,
      // Prefer the latest card; fall back to the snapshot stored on the friend doc.
      name: card.name ?? e.data.displayName ?? "（名前なし）",
      avatar: card.avatar ?? e.data.avatar ?? "🙂",
      comment: card.comment ?? "",
      // lastMessage only shows if it was denormalized onto the friend doc; we
      // don't fetch messages here (no per-friend listeners at list time).
      lastMessage: e.data.lastMessage ?? null,
    });
  });

  return { friends, orphanUids };
}

/**
 * Find a public card by shortId. Uses a server-side query (where + limit 1),
 * NOT a full-collection scan.
 */
export async function findByShortId(shortIdInput) {
  const q = query(
    refs.customAppCol(),
    where("shortId", "==", shortIdInput),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.data().uid ?? d.id, ...d.data() };
}

/**
 * Add a friend by shortId OR raw uid.
 * - shortId is tried first (query); if not found, the input is treated as a uid.
 * - Cannot add yourself; no duplicate; target must actually exist.
 * - Writes minimal info to BOTH users' friend collections.
 *
 * @returns the resolved friend uid
 * @throws Error with a `.codeText` for UI messaging
 */
export async function addFriend(myUid, myCard, input) {
  const raw = (input || "").trim();
  if (!raw) throw withCode(new Error("empty"), "入力が空です");

  // 1) resolve target uid
  let targetUid = null;
  const byShort = await findByShortId(raw);
  if (byShort) {
    targetUid = byShort.uid;
  } else {
    // treat as uid; confirm it exists
    const card = await resolveUserCard(raw);
    if (card) targetUid = raw;
  }
  if (!targetUid) throw withCode(new Error("notfound"), "ユーザーが見つかりませんでした");
  if (targetUid === myUid) throw withCode(new Error("self"), "自分自身は追加できません");

  // 2) duplicate check
  const existing = await getDoc(refs.friendDoc(myUid, targetUid));
  if (existing.exists()) throw withCode(new Error("dup"), "すでにフレンドです");

  // 3) snapshot the two cards for the stored friend docs
  const targetCard = byShort
    ? { name: byShort.name, avatar: byShort.avatar }
    : await resolveUserCard(targetUid);

  // 4) write both directions (minimal info; display prefers live card at render)
  await setDoc(refs.friendDoc(myUid, targetUid), {
    uid: targetUid,
    addedAt: serverTimestamp(),
    displayName: targetCard?.name ?? "",
    avatar: targetCard?.avatar ?? "",
  });
  await setDoc(refs.friendDoc(targetUid, myUid), {
    uid: myUid,
    addedAt: serverTimestamp(),
    displayName: myCard?.name ?? "",
    avatar: myCard?.avatar ?? "",
  });

  return targetUid;
}

/**
 * Delete ONLY orphaned friend docs (targets with no profile/customApp) on my
 * side. Never touches the other user's data and never deletes chat messages.
 * Bounded by the orphan count. Not run automatically.
 */
export async function cleanupOrphans(uid, orphanUids) {
  for (const fUid of orphanUids) {
    await deleteDoc(refs.friendDoc(uid, fUid));
  }
  return orphanUids.length;
}

function withCode(err, codeText) {
  err.codeText = codeText;
  return err;
}
