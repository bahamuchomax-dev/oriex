/* Review history repository (localStorage today, Firestore-ready).
 *
 * React Review is NOT in production yet (main.js still boots the legacy app;
 * App.jsx is not the production entry). This repository is the safe persistence
 * seam for when the React Review screen is wired in. Screens call
 * loadHistory()/recordGrade()/clearHistory() and never touch storage directly.
 *
 * SAFETY (React migration phase 3 — Review):
 *   - Writes are pinned to the current user via assertOwnUid; a client-passed
 *     uid that differs from the signed-in user is ignored, never trusted. If no
 *     owner can be resolved, nothing is saved or deleted.
 *   - An optional free-text `note` is sanitized with sanitizePlainText before
 *     it is persisted: HTML tags and dangerous schemes (javascript:, etc.) are
 *     stripped, control characters removed, and the value is clamped to
 *     REVIEW_NOTE_MAX_LENGTH. A whitespace-only note is stored as "" (empty).
 *   - History is keyed by wordKey() so the same English term under a different
 *     category/stage is a distinct card (matches Review.jsx).
 *   - React renders all stored values as plain {text}; this layer never builds
 *     HTML and the screen must never use a raw-HTML sink.
 *
 * NOT done here (by design this phase):
 *   - No backend writes / realtime listeners. localStorage only. When this
 *     moves to Firestore, keep the same load/record/clear surface, scope reads
 *     to the current uid, front them with readCache, and never read other
 *     users' review history. See docs/REACT_MIGRATION_PLAN.md.
 */
import { readJSON, writeJSON } from "./localStore.js";
import { lsKey } from "./paths.js";
import { assertOwnUid } from "../firebase/authz.js";
import { sanitizePlainText } from "../security/sanitizeText.js";
import { wordKey } from "../../lib/wordKey.js";

/* Max length for the optional free-text review note. Kept here so the
 * repository clamp is the source of truth; any screen input maxLength should
 * import this same constant so the two never drift. */
export const REVIEW_NOTE_MAX_LENGTH = 200;

/* Load the review-history map for the current user: wordKey -> entry. */
export function loadHistory(uid) {
  const owner = assertOwnUid(uid);
  if (!owner) return {};
  const map = readJSON(lsKey.reviewHistory(owner), {});
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

/* Record a grade for one card. Returns { ok, key?, entry?, error? }.
 * Refuses to write without a resolvable owner or a valid card key. */
export function recordGrade(uid, card, opts = {}) {
  const owner = assertOwnUid(uid); // 書き込みは現在ユーザーに固定
  if (!owner) return { ok: false, error: "サインインが必要です。" };

  const key = wordKey(card);
  if (!key) return { ok: false, error: "無効なカードです。" };

  // XSS / storage hygiene: never persist raw user HTML. Strip tags + dangerous
  // schemes, drop control chars, trim, clamp. Empty / whitespace-only -> "".
  const note = sanitizePlainText(opts.note ?? "", {
    maxLength: REVIEW_NOTE_MAX_LENGTH,
    trim: true,
  });

  const entry = {
    wrong: !!opts.wrong,
    note,
    category: card && card.category != null ? card.category : null,
    stage: card && card.stage != null ? card.stage : null,
    updatedAt: Date.now(),
  };

  const map = loadHistory(owner);
  map[key] = entry;
  if (!writeJSON(lsKey.reviewHistory(owner), map)) {
    return { ok: false, error: "保存に失敗しました。空き容量を確認してください。" };
  }
  return { ok: true, key, entry };
}

/* Clear the current user's review history. Refuses without an owner. */
export function clearHistory(uid) {
  const owner = assertOwnUid(uid);
  if (!owner) return false;
  return writeJSON(lsKey.reviewHistory(owner), {});
}
