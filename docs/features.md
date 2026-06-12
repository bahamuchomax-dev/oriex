# Features & rebuild notes

What v6.9 appears to do, by area, plus what needs rebuilding. Behavior is
inferred from string literals + the change requests against v6.9; treat as a
guide, not a spec.

## Auth
- Firebase Authentication; a `uid` flows through everything (profile, friends,
  diary, customSeen, plans).
- **Rebuild:** auth context + gate; expose `uid` to features.

## Profile (`users/{uid}/profile/main`)
- Fields: icon, name, one-line comment, frame, background color/photo, stats
  (XP, streak, etc.).
- Known issues / goals: unify the scattered pieces into a **single profile card**;
  edit only via a dedicated edit screen; remove the my-page top-right settings
  entry; make frame / comment non-editable by direct tap; reduce the color
  palette; ensure background color/photo actually applies (and persists, and is
  visible to others).
- **Rebuild:** profile read/write + unified card + edit screen.

## Friends (`users/{uid}/friends`)
- Friend list.
- Known bug: deleted / withdrawn / nonexistent users linger in the list when the
  friend doc exists but the target `profile`/`customApp` is gone.
- **Rebuild:** when rendering, skip friends whose target profile/customApp is
  missing; optionally offer to prune orphaned friend docs. Don't break DM.

## DM (`chats/{pairId}/messages`)
- One-to-one chat keyed by a deterministic pair id.
- **Rebuild:** keep independent from the friends list so friend cleanup can't
  break chat. Confirm the exact `pairId` format first.

## Study diary (`users/{uid}/studyDiary`)
- Study records / weekly reflections (e.g. 今週のよかった点, 例文（任意）).
- **Rebuild:** CRUD over the studyDiary collection.

## Plans (`weeklyPlan` / `weeklyTaskAdmin` / `teacherCheck`)
- Teachers send weekly plans to students.
- Goals: student side reflects promptly (single-doc `onSnapshot`); due date =
  **next week's Friday** from the send date; textbooks selectable **only** from
  registered `bookLogs`/`bookShelf`; show **per-student overall progress %**.
- **Rebuild:** plan model + teacher send UI + student view + progress rollup.

## Timer
- Study timer; in the rebuild it should let the user pick a textbook on start and
  attach the book name to the saved record (so it shows in the record timeline and
  book log). A second, per-book timer lives in the books "記録を追加" flow.
- **Rebuild:** timer + book selection + record write.

## Books (`public/data/bookLogs`, `public/data/bookShelf`)
- 参考書ログ + 参考書本棚. The source of truth for which textbooks exist; plans
  and timer pick from here.
- **Rebuild:** books CRUD + a shared "pick a registered book" component.

## Vocabulary (review / wordbook / マイワード)
- `review` and `userVocab` are **local** (localStorage), migrated off Firestore in
  v6.8. `wordbook` is the study UI.
- **Rebuild:** wire the local stores (already scaffolded) into the study UI.

## Custom vocabulary (`public/data/customVocabulary`, `users/{uid}/customSeen`)
- Shared vocab set; per-user "seen" tracked under `customSeen`.
- Constraint: the `seenBy` write-back was **removed on purpose** — keep it out.

## Hamster room (three.js)
- A real 3D room (`window.OriexHamu3D` lives in `legacy-dist/index.html`).
- Goals: confirmation dialog before a **tutorial** (操作 / ごはん / あそぶ /
  なでる・ドラッグ / 回し車 / 睡眠 / 名前決め); **naming** the hamster (persisted,
  e.g. `oriex_hamu`); a self-**grooming** idle behavior (a groom state already
  exists in the engine).
- **Rebuild:** port/reuse the three.js engine, add the dialog/tutorial/naming/groom.

## Factory (`factoryApp` / `customApp`)
- FACTORY workflow: 問題発見 → 原因分析 → 解決策.
- Goal: improve text contrast on the content area.
- **Rebuild:** factory flow UI.

## Records (`recordHub`, `attendanceStamp`, `scheduleCalendar`, `noteApp`, `recordsTimeline`)
- Records hub with tabs: 勉強時間記録 / 現論会登校スタンプ / 予定カレンダー /
  メモ / 記録タイムライン.
- Goal: slightly clearer tab borders (subtle, not flashy).
- **Rebuild:** tabbed records hub.

## Settings (`settingsApp`)
- App settings; should be the consolidated home for edit/settings entry points
  (e.g. those removed from the my-page top-right).

---

## Not yet scoped (seen in dist, no feature folder yet)
- `stageMap` (ステージ/マップ) and the `oriex_run_*` mini-game.
- `announcementsList` (お知らせ).
- `plaza` (ひろば) — social feed; may fold into `friends`.
- XP system itself (cross-cutting): how XP is earned (word study, review, teacher
  problems, study records), de-duplicated, persisted, and reconciled across
  profile / customApp / ranking. Rebuild this **after** the feature it depends on
  exist, as a single source of truth.
