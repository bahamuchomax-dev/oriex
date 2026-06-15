# Profile

User profile stored at `users/{uid}/profile/main`.

- `profileApi.js` — `loadOrCreateProfile(uid)`, `saveProfile(uid, patch, current)`,
  plus the `AVATARS` / `COLORS` choices. Save also mirrors a minimal public card
  to `public/data/customApp/{uid}` (merge) for ranking / search.
- `index.jsx` — MyPage: single profile card + edit/logout entry.
- `ProfileEdit.jsx` — edits name / comment / color / avatar; writes only on save,
  and stamps `updatedAt`.
- `copyUserId.js` — pure helper to copy the current user's OWN uid to the
  clipboard. `isCopyableUid(uid)` / `copyUserId(uid, clipboard?)`. Read-only and
  uid-only: never touches tokens, custom claims, role/admin/isTeacher, any
  credential, or Firestore; never throws.

`Profile.jsx` shows the read-only `ID: <uid>` line with a **コピー** (copy)
button (uid only). The button appears only for a real, signed-in uid.

> **Live visibility caveat:** the React Profile screen is part of the migration
> scaffold and is **not yet mounted** — `src/main.js` still boots the legacy
> bundle (see `src/App.jsx`). So this copy button is migration prep; it becomes
> user-visible when the React shell goes live. Surfacing a UID copy in the
> *current* live app would require editing the frozen legacy bundle, which is out
> of scope (no broad legacy rewrite). The legacy app already has its own Friend
> ID copy button.

**Status (stage 1):** load/create/display/edit/save implemented; read-only UID
display + copy (scaffold).

Still TODO (later stages): unify all profile pieces into one card with
edit-only-via-edit-screen, background photo, reduce-colors polish, and making the
background reflect for other viewers.
