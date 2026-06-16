# ストレージ監査 — オンライン(Firestore) vs ローカル (STORAGE_AUDIT)

ライブアプリ（凍結 `src/legacy/oriex-app.bundle.js`）が、何を **オンライン (Firestore)** に保存し、何を **端末ローカル (localStorage / IndexedDB)** に置いているかの監査。目的は (a) 同期したいデータが確実にオンラインか確認、(b) ローカルで十分な箇所はローカルに留め、Firestore 読み取りを増やさないこと。読み取り実測は `?oxReadMeter=1` → `__oxReads.table()`（`src/services/diagnostics/readMeter.js`）。

最終更新: 2026-06-17。

## 結論（ユーザー要望: アイコン/カスタマイズ/進行状況/参考書/記録/フレンドはオンライン）

**6カテゴリすべて Firestore に保存されており、要望どおりオンライン同期されています。** localStorage は端末固有の設定・キャッシュ・ゲーム状態のみで、適切です。

| カテゴリ | 保存先 | 保存パス / キー | 判定 |
|---|---|---|---|
| アイコン (avatar) | **Firestore** | `artifacts/{appId}/users/{uid}/profile/main.avatar`（＋公開カード `public/data/customApp/{uid}`） | オンライン ✓ |
| カスタマイズ (テーマ/色/カバー) | **Firestore** ＋ ローカルキャッシュ | `profile/main.themeId` / `.color` / `.coverImage`（テーマは `localStorage["theme"]` にも即時キャッシュ） | オンライン ✓ |
| 進行状況 (EXP/ステージ) | **Firestore** | `profile/main.totalExp`、`progress`（完了ステージ） | オンライン ✓ |
| 参考書 (bookLogs) | **Firestore** | `users/{uid}/bookLogs/*` | オンライン ✓ |
| 記録 (records) | **Firestore** | `users/{uid}/records/*` | オンライン ✓ |
| フレンド (friends) | **Firestore** | `users/{uid}/friends/{friendUid}`（双方向書き込み） | オンライン ✓ |

> テーマだけは「localStorage 即時反映 ＋ Firestore へ merge 保存」の二段構え（line 211: `wt("theme",id)` ＋ `setDoc(profile/main,{themeId},{merge})`）。起動時は localStorage で即描画し、Firestore が正本。端末間で同期されます。

## 端末ローカル（localStorage）— これは同期しないのが適切

| 用途 | キー（接頭辞） |
|---|---|
| ランゲーム成績/実績 | `oriex_run_best_*`, `oriex_run_plays`, `oriex_run_dodged`, `oriex_run_collection`, `oriex_run_ach`, `oriex_run_diff` |
| ハムスター状態/チュートリアル | `oriex_hamu_*`, `oriex_hamu_tut_done_*` |
| 学習タイマー/目標 | `oriex_timer`, `oriex_goal` |
| 音設定 | `oriex_speak_on1`, `oriex_bgm_on1`, `genron_se` |
| 既読/通知フラグ | `genron_readAnnouncements`, `oritan_readTimelineLogs`, `genron_notifVocabAdd`, `genron_notifChatUnread`, `oritan_wt_seen_*`, `genron_announcementDismissed` |
| UI状態 | `genron_lastCategory`, `genron_theme`(テーマの即時キャッシュ), `genron_debugUnlock` |
| 復習フォルダ/割当 | `oriex_review_folders`, `oriex_review_assign`, `oriex_review_*` |
| 語彙キャッシュ | `oritan_vocab_cache` |
| 移行フラグ | `oriex_review_migrated_*`, `oriex_userVocab_migrated_*` |

これらは「この端末のUI状態・キャッシュ・ローカルゲーム」であり、同期不要。Firestore 読み取りを増やさないために**ローカルのままが正解**。

## 端末ローカル（IndexedDB）— 設計上の例外

- **ホーム背景の写真**（`homePhotoStorage.js` / `oxHelpers.js` の `__oxBg`）は IndexedDB に**端末ローカル**保存（`oriex_theme_bg_settings_*` は位置/不透明度設定）。大容量画像のため Firestore に置かずローカル。**端末間で同期されない**のは仕様。複数端末で同じ背景写真を使いたい場合のみ、これは要検討（Storage 課金/帯域とのトレードオフ）。プロフィールの `coverImage` は別物で Firestore 保存（オンライン）。

## 読み取り削減メモ（今後）

- 静的データ（参考書カタログ、ランキングカード、アプリ設定）は IndexedDB 永続キャッシュ（`src/firebase/firebase.js` の `persistentLocalCache`）で再訪時ほぼ0読み取り。
- 実測は read meter（`?oxReadMeter=1`）で `users/bookLogs` 等の内訳を見て、重い画面をピンポイントで削る。
- `bookShelf` の 1セッション最大120読み取りは凍結バンドル内の `limit` 由来。削減は React 移行 or 外科的編集（要・実機検証）で。
