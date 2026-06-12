# Vocabulary

単語帳 / 復習 / マイワード. **localStorage only — never Firestore.**

- `localReviewStore.js` — `loadReview/saveReview/clearReview` (key `oriex_review_{uid}`).
- `localUserVocabStore.js` — `loadUserVocab/saveUserVocab/clearUserVocab`
  (key `oriex_userVocab_{uid}`). Keys are unchanged.
- `vocabUtils.js` — `newId`, `normalizeList` (defensive: adds ids / coerces fields),
  `hasWord` (dedupe), `toReviewItem`.
- `vocabData.js` — `WORDBOOK` source for the 単語帳 tab. Empty for now (no fixed
  dataset, and this stage uses no Firestore), so the tab shows a natural empty
  state. LATER: populate from `public/data/customVocabulary` (read-only, on open)
  without restoring the `seenBy` write-back.
- `WordbookTab.jsx` — list + search + subject filter + 復習/マイワード追加 (with
  "追加済み" state). Empty-state when no data.
- `ReviewTab.jsx` — review list, 未習得/習得済み filter, 覚えた/もう一度/削除, quiz
  (hide meaning) mode. Saves to localStorage on each explicit action.
- `MyWordsTab.jsx` — add/edit/delete personal words + 復習に追加. Save only on
  explicit buttons (no per-keystroke writes).
- `index.jsx` — hosts the three tabs.

**Status (stage 6):** implemented. review/userVocab stay in localStorage.

## customVocabulary (stage 7)

- `customVocabularyApi.js`
  - `loadCustomVocabulary()` — `getDocs(public/data/customVocabulary)` with
    `limit(200)`, client-side sort. Read-only; **never** writes a `seenBy` field
    or modifies customVocabulary. No `onSnapshot`.
  - `loadCustomSeen(uid)` — reads the user's own `users/{uid}/customSeen` → Set of
    wordIds (empty if no uid).
  - `markCustomSeen(uid, word)` / `unmarkCustomSeen(uid, wordId)` — write/delete
    ONLY `users/{uid}/customSeen/{wordId}`.
- `WordbookTab.jsx` reads customVocabulary + customSeen **only when the tab mounts**
  (not at login). Data priority: customVocabulary → WORDBOOK → empty. Seen toggle
  appears only for customVocabulary words when signed in. Adding to 復習 / マイワード
  still goes to localStorage only.
