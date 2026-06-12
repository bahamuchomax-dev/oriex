# Records

Records hub with a tab scaffold:
勉強時間記録 / 現論会登校スタンプ / 予定カレンダー / メモ / 記録タイムライン.

- `index.jsx` — tab bar + panel. Only **勉強時間記録** is implemented (renders
  `studyDiary`); the others show an "未実装" placeholder.

Tabs have a light border + an active-state highlight (intentionally subtle).
Receives `uid` from `App.jsx`.

**Status (stage 3):** tab scaffold + studyDiary tab done; other tabs pending.
