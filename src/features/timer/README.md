# Timer

Book-specific study timer that records study time to `public/data/bookLogs`.

## Features
- Pick a textbook from the shelf (`loadBookOptions()`), optional study memo.
- Start / pause / resume / reset / 終了して記録 (finish & save).
- Large elapsed display, updated every second.
- Saves in whole minutes; anything >0 and <1 min is confirmed then rounded to 1.
- Working state (seconds/memo/selected book) is kept in localStorage
  (`oriex_timer_{uid}`) so leaving the screen doesn't lose progress. This is temp
  state only — NOT the review/userVocab stores.

## Firestore reads
- `loadBookOptions()` (book shelf) — only when the screen opens. No `onSnapshot`,
  no login-time read.

## Firestore writes
- Exactly ONE `addDoc` to `bookLogs`, via `createBookLogFromTimer(session, user)`,
  and only on "終了して記録". **Never writes per second** — the running timer touches
  only local state / localStorage.

## bookLogs integration
- Uses `createBookLogFromTimer()` from `books/booksApi.js`, which builds
  `{ bookId, bookTitle, subject, minutes, memo, studiedAt, uid, userName, ... }`,
  so entries appear in the 参考書 log list in the same shape as manual logs.

## Error handling
- No uid → save blocked with a message. Start without a book → message. Load
  failure → error state. 0 min → blocked. Double-save prevented (button disabled
  while saving). Interval is always cleared on pause/unmount.

## Not implemented (intentionally this stage)
- XP integration (separate future TODO), notifications, guaranteed background
  timing, multiple concurrent timers, auto-reflecting time into plans progress.
