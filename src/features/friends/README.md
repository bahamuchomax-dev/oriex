# Friends

Friend list at `users/{uid}/friends`.

- `friendsApi.js`
  - `loadFriends(uid)` → `{ friends, orphanUids }`. Resolves each friend's *current*
    card (customApp → profile fallback) and **excludes deleted users** (no
    profile and no customApp). Returns orphan uids separately.
  - `findByShortId(shortId)` → server-side `where("shortId","==",…) limit(1)` query
    (no full-collection scan).
  - `addFriend(myUid, myCard, input)` → resolves shortId or raw uid; blocks self /
    duplicates / nonexistent; writes minimal info to BOTH sides.
  - `cleanupOrphans(uid, orphanUids)` → deletes ONLY my orphaned friend docs.
    Never deletes the other user's data or chat messages; not auto-run.
- `index.jsx` — list + add form + opens DM.

**Status (stage 2):** implemented. Display prefers the live card; the stored
snapshot is a fallback only.
