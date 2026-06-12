# Books

参考書: shelf (`public/data/bookShelf`) + logs (`public/data/bookLogs`).
The source of truth for which textbooks exist; plans (next stage) and timer pick
from here.

- `booksApi.js`
  - `loadBookShelf()` → all books (1 getDocs). Called only when the screen opens.
  - `loadBookLogsForBook(bookId)` → `where(bookId==) limit(100)`, client-side sort
    (no composite index needed for this stage).
  - `loadBookOptions()` → `[{ bookId, title, subject, level }]` for the plans picker.
  - `addBook(data, owner)` → 1 setDoc (auto id). Save-only.
  - `addBookLog(data, user)` → 1 addDoc. Save-only.
  - `createBookLogFromTimer(session, user)` → **timer-stage stub**: turns a finished
    timer session into a book log.
- `index.jsx` — shelf list, add-book form, per-book log list, add-log form.

**Status (stage 4):** implemented (minimal). Realtime not used; reads only on open.
