import {
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { refs } from "../../firebase/firestorePaths.js";

/**
 * Subscribe to a single DM thread's messages. Call ONLY when the DM screen is
 * open, and call the returned unsubscribe when it closes. Do NOT open these for
 * every friend at login.
 *
 * Uses orderBy("createdAt","asc") + limit(100) to bound reads.
 *
 * @returns unsubscribe()
 */
export function subscribeMessages(myUid, friendUid, onChange, onError) {
  const q = query(
    refs.chatMessagesCol(myUid, friendUid),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(msgs);
    },
    (err) => onError?.(err)
  );
}

/**
 * Send a message in the DM thread. Empty/whitespace text is rejected.
 *
 * FUTURE (unread badges): when sending, also bump a denormalized inbox doc, e.g.
 *   users/{friendUid}/dmInbox/{myUid} = { lastMessage, updatedAt, unreadCount++ }
 * so the friend list can show unread state without per-thread listeners. Not
 * implemented in this stage on purpose.
 */
export async function sendMessage(myUid, friendUid, text) {
  const body = (text || "").trim();
  if (!body) return false;
  await addDoc(refs.chatMessagesCol(myUid, friendUid), {
    text: body,
    senderId: myUid,
    createdAt: serverTimestamp(),
  });
  return true;
}
