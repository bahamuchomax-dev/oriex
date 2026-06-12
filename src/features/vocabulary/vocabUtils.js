// Small helpers shared by the vocabulary tabs. Defensive by design: old
// localStorage data may lack ids or fields, so we normalize on load.

export function newId() {
  return "v_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Ensure an array of items each has a stable id and string fields.
export function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      ...x,
      id: x.id || newId(),
      word: typeof x.word === "string" ? x.word : "",
      meaning: typeof x.meaning === "string" ? x.meaning : "",
      example: typeof x.example === "string" ? x.example : "",
      note: typeof x.note === "string" ? x.note : "",
    }));
}

// Case-insensitive duplicate check by word.
export function hasWord(list, word) {
  const w = (word || "").trim().toLowerCase();
  if (!w) return false;
  return list.some((it) => (it.word || "").trim().toLowerCase() === w);
}

// Build a review item from any word-like source object.
export function toReviewItem(src) {
  const now = new Date().toISOString();
  return {
    id: newId(),
    word: src.word ?? "",
    meaning: src.meaning ?? "",
    example: src.example ?? "",
    note: src.note ?? "",
    status: "learning", // "learning" | "known"
    addedAt: now,
    lastReviewedAt: null,
    reviewCount: 0,
  };
}
