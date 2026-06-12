// Source list for the 単語帳 (wordbook) tab.
//
// There is no bundled/fixed word dataset in the project yet, and this stage must
// NOT read Firestore. So this is intentionally empty and the wordbook tab shows a
// natural empty state rather than fabricated sample words.
//
// LATER: a future stage can populate the wordbook from the shared set at
// public/data/customVocabulary (read-only, on screen open) and/or a teacher's
// assigned set — WITHOUT reintroducing the customVocabulary `seenBy` write-back.
//
// Shape expected by the UI: { id, word, meaning, note, example, subject }
export const WORDBOOK = [];
