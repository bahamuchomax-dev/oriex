# DM

One-to-one chat at `chats/{pairId}/messages` (pairId = sorted uids).

- `dmApi.js`
  - `subscribeMessages(myUid, friendUid, onChange, onError)` → `onSnapshot` with
    `orderBy("createdAt","asc")` + `limit(100)`. Returns the unsubscribe fn.
  - `sendMessage(myUid, friendUid, text)` → rejects empty text; writes
    `{ text, senderId, createdAt }`.
- `index.jsx` — `DMChat`: subscribes on mount, unsubscribes on unmount, so a
  thread is listened to ONLY while open. We never open a listener per friend at
  login.

**Unread badges:** not implemented. Future plan = a denormalized inbox at
`users/{uid}/dmInbox/{friendUid}` bumped on send (see comment in `dmApi.js`).
