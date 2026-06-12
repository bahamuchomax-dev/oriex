# Oriex セキュリティメモ（Phase 1 実施 / Phase 2 設計）

このファイルは「古いsrcを現在版に近づける」作業のうち、**安全に直せたもの（Phase 1）**と、
**壊さずには実装できないため設計だけ残すもの（Phase 2）**を記録します。

---

## Phase 1：今回コードに反映した修正（ビルド確認済み）

| # | 問題 | 対応 | 場所 |
|---|------|------|------|
| 1 | 管理者合言葉（旧ADMIN_PASSCODEの実値）がクライアントに直書き | 実値を削除し無効化用センチネルに置換 | `src/constants.tsx` `ADMIN_PASSCODE` |
| 2 | 合言葉入力で教師権限を自己付与できる | 付与ロジックを廃止（既存 `profile.isTeacher` のみ継承） | `src/App.tsx` `teacherFlag` |
| 3 | 合言葉で招待コードを回避して登録できる | 招待コードを常に必須に | `src/App.tsx` 登録ゲート |
| 4 | 無効化された「先生用コード」入力欄が残存し誤解を招く | UIを非表示（`false &&`、コードは保持） | `src/App.tsx` 登録フォーム |
| 5 | 平文 password を localStorage にキャッシュ | `saveLocal` で `profile` の `password` を除去 | `src/App.tsx` `saveLocal` |
| 6 | 上記により編集時に空 password で上書きされる回帰 | 新パスワード未入力時は `password` を書き込まない（merge保持） | `src/App.tsx` プロフィール保存 |
| 7 | Anthropic APIキーをブラウザに置き直叩き | ブラウザ直叩きを停止（既存フォールバックに固定） | `src/App.tsx`, `src/components.tsx` |
| 8 | 共有端末でログアウト後も個人情報が残る | 明示ログアウト時に PII 系 localStorage と APIキーを削除 | `src/App.tsx` `handleLogout` |

これらは既存のログイン・登録・育成・問題・復習・Factory の動作を壊しません
（ログイン認証自体のロジックは変更していません）。

---

## Phase 2：壊さずには実装できないため「設計のみ」記載（未実装・TODO）

現状のログインは **匿名認証（`signInAnonymously`）＋ Firestore の profile に保存した
平文 password をクライアントで比較** する方式です。これは Critical ですが、いきなり
置き換えるとログインが壊れるため、本作業では**変更していません**（コードに TODO コメントを設置）。

### 2-1. Firebase Authentication（Email/Password）への移行
- 新規登録: `createUserWithEmailAndPassword(auth, email, password)`
- ログイン: `signInWithEmailAndPassword(auth, email, password)`
- ユーザー識別: `auth.currentUser.uid`（= `request.auth.uid`）を正とする
- `profile.password` フィールドは**廃止**（移行後に削除）
- 既存ユーザー移行: 旧 `profile.password` を使って一度だけ Auth ユーザーを作成 →
  以降は Auth を正とする（移行スクリプト or 初回ログイン時マイグレーション）

### 2-2. 教師/管理者権限
- **Custom Claims**（`request.auth.token.role` = `student|teacher|admin`）で管理
- 付与は Cloud Functions（Admin SDK の `setCustomUserClaims`）からのみ
- クライアントは表示制御に `role` を使ってよいが、**保護の実体は Firestore Rules**
- すぐ Custom Claims を入れられない場合の暫定: Rules で「`isTeacher` の自己昇格禁止」
  （下記 `firestore.rules.example` 参照）

### 2-3. XP / taskProgress / 重要書き込みの関数化
- 現状、`totalExp` / `clearedStages` / `taskProgress.done` 等をクライアント計算でそのまま書き込み。
- 推奨: 書き込みを `lib/writes.ts` 等に関数化し、呼び出し元を一元化（追跡可能に）。
- Rules で `uid` 一致・型・範囲・増分上限を強制（下記ルール例）。
- 理想は XP 付与を Cloud Functions に移し、クライアントは「学習イベント」だけ送る。

### 2-4. Anthropic をサーバー経由に
- Cloud Function（鍵はサーバー環境変数）にプロキシし、認証・回数制限・入力サイズ制限。
- フロントは関数を呼ぶだけ。`anthropic-dangerous-direct-browser-access` は使わない。

---

## Firestore Rules
別ファイル `firestore.rules.example` に暫定版・理想版の案を記載しています。
**実データ構造に合わせて調整し、十分にテストしてから適用してください（要検証）。**

---

## Firestore ルールの適用タイミング（重要）

ルール例は用途別に3ファイルあります。

| ファイル | 用途 | いつ適用するか |
|---|---|---|
| `firestore.rules.phase1.example` | **現行ログインを壊さない暫定** | 今すぐ適用可（匿名認証＋`profile.password` のまま）。`password` 書き込みは許可、自己昇格は禁止、本人データ保護・XP/uid 検証を入れる。 |
| `firestore.rules.phase2.example` | **Auth 移行後の理想** | Firebase Auth（Email/Password）＋ Custom Claims に移行してから適用。`password` 書き込み禁止・教師/管理者を `role` で判定。 |
| `firestore.rules.example` | 参考（Phase 2 とほぼ同等の理想形） | 冒頭の注意書き参照。Phase 2 と同様、移行前の本番適用は不可。 |

**注意：現行コードはまだ `profile.password` 比較でログインしています。**
`firestore.rules.phase2.example` / `firestore.rules.example` は `password` フィールドの
書き込みを禁止しているため、**Auth 移行前にそのまま本番適用すると新規登録・ログインが壊れます。**
先に `firestore.rules.phase1.example` を適用し、その後 Phase 2 認証移行を行ってから
`firestore.rules.phase2.example` に差し替えてください。

## Anthropic 直叩きコードの完全削除（追加対応）
`generateAIDistractors`（App.tsx）と AIペット `sendMessage`（components.tsx）から
Anthropic への `fetch` を**コードごと完全に削除**しました（`apiKey=""` のダミーも除去）。
ビルド後のJSにも `api.anthropic.com` / `x-api-key` / `anthropic-dangerous-direct-browser-access`
は残りません。設定画面の APIキー入力欄と `anthropicApiKey` state も削除しました。
- 復習4択の誤答はローカル生成のみ。
- AIペットは「APIキー未設定」メッセージを返すのみ。
- **TODO（将来）**: サーバー（Cloud Function）経由で AI 機能を復活させる場合は、鍵を
  サーバー環境変数に置き、フロントは関数を呼ぶだけにする。`handleLogout` は引き続き
  レガシーな `genron_anthropicApiKey` を localStorage から削除します。
