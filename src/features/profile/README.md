# Profile

User profile stored at `users/{uid}/profile/main`.

- `profileApi.js` — `loadOrCreateProfile(uid)`, `saveProfile(uid, patch, current)`,
  plus the `AVATARS` / `COLORS` choices. Save also mirrors a minimal public card
  to `public/data/customApp/{uid}` (merge) for ranking / search.
- `index.jsx` — MyPage: single profile card + edit/logout entry.
- `ProfileEdit.jsx` — edits name / comment / color / avatar; writes only on save,
  and stamps `updatedAt`.

**Status (stage 1):** load/create/display/edit/save implemented.

Still TODO (later stages): unify all profile pieces into one card with
edit-only-via-edit-screen, background photo, reduce-colors polish, and making the
background reflect for other viewers.
