# Screens

The dist drives navigation from a single screen-key array. The exact array found
in `legacy-dist/index.html` is:

```
start, stageMap, review, wordbook, customApp, recordHub, attendanceStamp,
scheduleCalendar, bookLogApp, studyDiaryApp, noteApp, plaza, chat, friendsList,
announcementsList, stats, factoryApp, friendProfile, myPage, settingsApp,
weeklyTaskAdmin, weeklyPlan, recordsTimeline, teacherCheck
```

Best-guess mapping to user-facing areas (verify against the running app):

| key | likely screen | maps to feature folder |
|-----|---------------|------------------------|
| `start` | ホーム / 起動画面 | (home — inline in App.jsx) |
| `stageMap` | ステージ / マップ | (game/stage — not yet scoped) |
| `review` | 復習 | `vocabulary` (local) |
| `wordbook` | 単語帳 | `vocabulary` |
| `customApp` | 先生からの問題 / オリジナル問題 | `factory` or a teacher-problems feature |
| `recordHub` | 記録ハブ | `records` |
| `attendanceStamp` | 現論会登校スタンプ | `records` |
| `scheduleCalendar` | 予定カレンダー | `records` |
| `bookLogApp` | 参考書ログ | `books` |
| `studyDiaryApp` | 勉強記録 / 日記 | `studyDiary` |
| `noteApp` | メモ | `records` |
| `plaza` | ひろば | `friends` / social |
| `chat` | DM / チャット | `dm` |
| `friendsList` | フレンド一覧 | `friends` |
| `announcementsList` | お知らせ一覧 | (announcements — not yet scoped) |
| `stats` | 統計 | `profile` |
| `factoryApp` | FACTORY | `factory` |
| `friendProfile` | 他人のプロフィール | `profile` |
| `myPage` | マイページ | `profile` |
| `settingsApp` | 設定 | `settings` |
| `weeklyTaskAdmin` | 週課題（先生側） | `plans` |
| `weeklyPlan` | 週計画（生徒側） | `plans` |
| `recordsTimeline` | 記録タイムライン | `records` |
| `teacherCheck` | 先生チェック | `plans` / teacher tooling |

The bottom-nav in this scaffold (`src/App.jsx`) exposes a simplified 9-tab subset
(ホーム / 記録 / 先生からの問題 / タイマー / 参考書 / プロフィール / フレンド・DM /
ハムスターのへや / FACTORY). Expand it toward the full list above as features land.

Note: the **hamster room** and **timer** did not appear as top-level keys in this
array — in v6.9 they were likely reached from within other screens. They are still
first-class features in the rebuild.
