# Firestore structure

Path **segments** recovered from the dist: `users`, `public`, `chats`,
`profile`, `main`, `friends`, `messages`, `studyDiary`, `customSeen`, `data`,
`customApp`, `teacherIndex`, `customVocabulary`, `bookLogs`, `bookShelf`,
`sharedApps`.

Assembled into the paths below. Confirmed = the full path is strongly implied by
the literals; Guess = plausible but unverified. See `src/firebase/firestorePaths.js`.

## Project

- Firebase project: **genro-b74de**
- Config (already public in the dist): see `.env.example`.

## Per-user (`users/{uid}/...`)

| path | purpose | confidence |
|------|---------|------------|
| `users/{uid}` | user root doc | Confirmed |
| `users/{uid}/profile/main` | profile (icon, name, comment, frame, bg color/photo, stats) | Confirmed |
| `users/{uid}/friends/{friendUid}` | friend entries | Confirmed |
| `users/{uid}/studyDiary/{id}` | study diary entries | Confirmed |
| `users/{uid}/customSeen/{id}` | which custom-vocab items the user has seen | Confirmed |
| `users/{uid}/plans/{id}` | weekly plans (student side) | **Guess** — could live under `public`; verify |

## Public / shared (`public/data/...`)

| path | purpose | confidence |
|------|---------|------------|
| `public/data/customApp` | teacher problems / custom apps | Confirmed |
| `public/data/teacherIndex` | index of teachers | Confirmed |
| `public/data/customVocabulary` | shared custom vocabulary | Confirmed |
| `public/data/bookLogs` | 参考書ログ | Confirmed |
| `public/data/bookShelf` | 参考書本棚 | Confirmed |
| `public/data/sharedApps` | shared apps | Confirmed |

## Direct messages (`chats/...`)

| path | purpose | confidence |
|------|---------|------------|
| `chats/{pairId}` | conversation doc | Confirmed |
| `chats/{pairId}/messages/{id}` | messages | Confirmed |

`pairId` is a deterministic id built from the two user ids (sorted + joined) —
see `pairId()` in `firestorePaths.js`. The exact join string in v6.9 is
**unconfirmed**; confirm before reading existing chats so ids line up.

## Cost / behavior constraints (carry over from v6.x)

- `review` and `userVocab` were moved to **localStorage** — do NOT read/write them
  in Firestore.
- The `seenBy` write-back on `public/data/customVocabulary` was **removed on
  purpose** — do not reintroduce it. Per-user seen state goes in
  `users/{uid}/customSeen`.
- Prefer narrow `onSnapshot` (single doc) over broad collection listeners to keep
  read counts down — relevant especially for plans.
