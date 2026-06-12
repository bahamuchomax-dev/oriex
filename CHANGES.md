# 差分移植メモ（古いsrc → 現在版に近づける作業）

`npm run build` 通過済み。既存の動作・データ構造は保持。

## 1. UI修正（src/App.tsx）
- **先生からの問題カード**（見出し「先生のオリジナル問題」/サブ「◯問が配布されています！」/空状態）
  と **「配布中の問題」カード**（見出し/空状態）の白文字を、`isLight` 判定でライト時に濃色化。
  ボタン文字はアクセント色背景上なので白のまま維持。
- **Factory**：和訳・例文・「登録済み単語」ラベル・復習リスト追加ボタン（未追加時のアイコン/枠/背景）
  をライト時に視認可能化。英単語は元々 `theme.text` で対応済み。
- **復習画面の上余白**：この古いsrcの復習ラッパーは `paddingTop: calc(safe-area + 16px)` のような
  二重計上を**持っておらず**、既に詰まった状態。＝現在版で報告された余白バグはこの旧srcには無いため**変更不要**。

## 2. セキュリティ Phase 1
- `src/constants.tsx`：`ADMIN_PASSCODE` の実値（旧管理者合言葉）を削除し無効化センチネルに置換。
- `src/App.tsx`：
  - 合言葉による教師自己昇格を廃止（`teacherFlag = profile?.isTeacher || false`）。
  - 登録時の招待コード回避を廃止（常に招待コード必須）。
  - 無効化された「先生用コード」入力欄を非表示（`false &&`、コードは保持）。
  - `saveLocal` が `profile` キャッシュから `password` を除去。
  - 新パスワード未入力時は `password` を書き込まない（空上書き回帰の防止、merge保持）。
  - Anthropic ブラウザ直叩きを停止（既存フォールバックに固定）。
  - 明示ログアウト時に PII 系 localStorage と Anthropic キーを削除。
- `src/components.tsx`：AIペットの Anthropic 直叩きを停止（「未設定」メッセージにフォールバック）。
- `SECURITY_NOTES.md` / `firestore.rules.example`：Phase 2（Auth移行・Custom Claims・XP/taskProgress
  の関数化・サーバープロキシ）の設計とルール案。**未実装**（壊さないため設計のみ・TODOコメント設置）。

## 3. 3Dハムスター統合（新規追加）
- `src/components/hamster/HamsterCanvas.tsx`：`<canvas>` を mount し
  `window.OriexHamu3D(canvas, {isLight, mood, sc})` を呼び、unmount で `dispose()`。
  THREE未読込/初期化失敗時は `onError` 経由でフォールバックへ（アプリは落ちない）。
- `src/components/hamster/HamsterRoom.tsx`：3D失敗時はハムスターアイコン＋簡易プレースホルダーを表示。
- `src/App.tsx`：`{screen === "petRoom" && <HamsterRoom .../>}` を追加。
  ※旧srcの petRoom（育成）画面は描画本体が無い空画面だったため、既存UIの削除・改変なしで新規追加。
  env には `isLight` と `mood`（`profile?.petAffection`）を渡す。
- 読み込み順：`index.html` の `three.min.js`(classic) → `main.tsx` で `hamsterScene.js` を副作用import
  → App が `window.OriexHamu3D` を実行時に呼ぶ。

## 注意 / 未完了（※下部「仕上げ修正」で多くが解消済み）
- ログイン認証自体（匿名認証＋password比較）は**未変更**（Phase 2、壊さないため）。`SECURITY_NOTES.md` 参照。
- 重複キー警告（`activeRoomBg`/`ownedRoomBgs`/`bottom`）は**仕上げ修正で整理済み → 現在ゼロ**。
- Anthropic 直叩きは**仕上げ修正で完全削除済み**（`dist`/`src` に該当文字列なし）。
- PWA manifest の競合（旧 "ORITAN" Blob マニフェスト）は**仕上げ修正で解消済み**（静的 Oriex manifest に統一）。
- 3DハムスターはpetRoomへ**統合済み**。実機描画（WebGL・Firebase連携）はこの環境では未検証（ビルド/配信/配線は検証済み）。
- env に渡す `mood`/`sc` は最小限。デプロイ版がより多くの状態（部屋背景・カメラ等）を渡している場合は、
  その情報を頂ければ追加できます（現状は安全側でデフォルトに委譲）。

---

# 仕上げ修正（追加対応）

## 1. PWA / manifest / icon の整理
- `index.html` に静的リンクを追加：
  `<link rel="manifest" href="./manifest.webmanifest" />` / `apple-touch-icon → ./icon-180.png` /
  `icon → ./icon-192.png`。
  ※ 元デプロイ（GitHub Pages サブパス）互換のため、絶対パス `/` ではなく相対 `./` を採用。
- `src/App.tsx` の**実行時 Blob マニフェスト生成 useEffect を削除**。
  これは `name:"ORITAN"` で、存在しない `/apple-touch-icon.png` を参照しており、
  静的な `public/manifest.webmanifest`（`name:"Oriex"`、`icon-192/512`）と競合していた。
- ログイン画面アイコン `APP_ICON_SRC` を、存在しない `/apple-touch-icon.png` から
  実在する `/icon-192.png` に変更（壊れ画像の修正）。
- **PWA アプリ名は `Oriex` に統一**（`public/manifest.webmanifest`）。

### 画面上の "ORITAN" ブランド表記を残した理由
PWA のアプリ名（インストール名）は `Oriex` に統一しましたが、**画面に表示される
プロダクトのブランド名 "ORITAN"**（ログインロゴの `alt`、`✦ ORITAN` のウォーターマーク、
ヘッダーのロゴテキスト、components.tsx のロゴ表示）は**意図的に残しています**。
これは見た目（ブランディング）であり、勝手に変更すると UI が変わってしまうためです。
PWA 名（Oriex）と画面ブランド（ORITAN）は別物として併存させています。
変更が必要であれば指示ください。

## 2. Anthropic 直叩きコードの完全削除
- `generateAIDistractors`（App.tsx）：Anthropic `fetch` をコードごと削除し、
  ローカルの誤答生成のみに。
- `sendMessage`（components.tsx）：Anthropic `fetch` をコードごと削除し、
  既存の「APIキー未設定」メッセージのみ返す。
- 設定画面の APIキー入力欄（AI設定カード）と `anthropicApiKey` state、その localStorage 保存を削除。
- ビルド後JS・srcともに `api.anthropic.com` / `x-api-key` /
  `anthropic-dangerous-direct-browser-access` は**残っていない**ことを確認済み。
- 将来のサーバー経由復活は `SECURITY_NOTES.md` に TODO 記載。

## 3. Firestore ルール例の整理
- 冒頭に「Phase 2 移行後の理想形であり、現行 `profile.password` のまま適用すると
  登録・ログインが壊れる」旨の注意を明記（`firestore.rules.example`）。
- 2分割：
  - `firestore.rules.phase1.example`：現行ログインを壊さない暫定（password 許可・自己昇格禁止・XP/uid 検証）。
  - `firestore.rules.phase2.example`：Auth 移行後の安全版（password 禁止・Custom Claims）。
- 適用タイミングを `SECURITY_NOTES.md` に表で明記。

## 4. 重複キー警告の整理
- `src/App.tsx` の profile 保存オブジェクトで重複していた `activeRoomBg` / `ownedRoomBgs`
  を削除（重複ペアは**完全に同じ値**＝後勝ちでも結果不変）。
- `src/components.tsx` の下端グロー要素で重複していた `bottom` のうち、
  先に書かれていた `bottom: 0` を削除し、**後勝ちで実際に効いていた**
  `bottom: "env(safe-area-inset-bottom, 0px)"` を維持（見た目不変）。
- 修正後 `npm run build` の重複キー警告は**ゼロ**。
