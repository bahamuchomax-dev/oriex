# Security notes

## Vocabulary data (customVocabulary / customSeen)

- `public/data/customVocabulary` is **read-only** for normal users. The app reads
  it with `getDocs` (limit 200) and never writes to it.
- The legacy `seenBy` approach is **not used**. Per-user "seen" state is stored
  separately at `users/{uid}/customSeen/{wordId}`.
- A student may write **only their own** `users/{uid}/customSeen` docs.
- Writes to `customVocabulary` itself should be restricted to teachers/admins.

### Suggested Firestore rules (illustrative, adapt before deploying)

```
match /public/data/customVocabulary/{wordId} {
  allow read: if request.auth != null;
  allow write: if isTeacherOrAdmin();   // never normal students
}
match /users/{uid}/customSeen/{wordId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

## review / userVocab

- These remain in **localStorage** (`oriex_review_{uid}`, `oriex_userVocab_{uid}`)
  and are intentionally NOT stored in Firestore.
