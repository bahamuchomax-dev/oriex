# Oriex — source project (Vite + React + TypeScript)

## 1. 概要

学習管理 PWA「Oriex」の**編集可能なソースプロジェクト**です。
アップロードされた元 `src`（React + TypeScript）を Vite プロジェクトとして整備し、
そこに最近の修正（UI・セキュリティ・3Dハムスター統合・PWA整理）を移植した
**現在の最終状態**です。`npm install / dev / build` が通ります。

生徒 / 先生 / 管理者向けの機能（ログイン、XP、学習計画、問題配信、復習、Factory、
参考書ログ、育成=3Dハムスター 等）を含みます。Firebase / Firestore / PWA 構成。

## 2. 起動方法

```bash
npm install
cp .env.example .env     # Firebase Web APIキーを設定（下記）
npm run dev              # http://localhost:5173
```

### .env（Firebase APIキー）
`src/firebase.ts` は `VITE_FIREBASE_API_KEY`（無ければ `REACT_APP_FIREBASE_API_KEY`）
を読みます。`.env.example` をコピーして `.env` を作成してください。
※ Firebase の Web APIキーは公開クライアント識別子で、秘密情報ではありません。

## 3. ビルド方法

```bash
npm run build            # dist/ に本番ビルド
npm run preview          # dist/ をローカル配信して確認
```

## 4. ディレクトリ構成

```text
.
├─ index.html                 # 最小エントリ。meta/フォント + three.min.js(classic)
│                             #  + PWA manifest/icon の静的リンク + #root + /src/main.tsx
├─ vite.config.ts             # base:'./'（GitHub Pages サブパス対応）, @vitejs/plugin-react
├─ tailwind.config.js / postcss.config.js
├─ tsconfig.json              # strict:false（既存コードをそのまま通すため）
├─ .env.example
├─ firestore.rules.example            # 理想形（注意書きあり）
├─ firestore.rules.phase1.example     # 現行ログインを壊さない暫定ルール
├─ firestore.rules.phase2.example     # Auth 移行後の安全な理想ルール
├─ SECURITY_NOTES.md / CHANGES.md
├─ public/                    # そのまま dist/ 直下へコピー
│  ├─ three.min.js  sw.js  manifest.webmanifest  icon-180/192/512.png  .nojekyll
└─ src/
   ├─ main.tsx                # createRoot(<App/>) + ハムスター副作用import + index.css
   ├─ App.tsx                 # アプリ本体（画面・ロジック）
   ├─ components.tsx          # 共通/画面コンポーネント群
   ├─ constants.tsx           # 定数・設定
   ├─ icons.tsx               # アイコン定義
   ├─ vocab.tsx               # 単語データ
   ├─ firebase.ts             # Firebase初期化（db/auth/appId）
   ├─ index.css               # @tailwind + .rx-* カスタムCSS
   ├─ components/hamster/
   │  ├─ HamsterCanvas.tsx    # <canvas> に window.OriexHamu3D を描画、失敗時フォールバック
   │  └─ HamsterRoom.tsx      # petRoom（育成）画面用ラッパー。3D失敗時は2D簡易表示
   └─ lib/hamster/
      ├─ hamsterScene.js      # 3Dハムスター window.OriexHamu3D（three.js r149）
      └─ README.md
```

## 5. 反映済みの主な修正

- **3Dハムスター統合**：`petRoom`（育成）画面に `HamsterRoom` / `HamsterCanvas` を追加。
  `window.OriexHamu3D(canvas, {isLight, mood})` を呼び、unmount で `dispose()`。
  3D 初期化失敗時はアイコン＋簡易プレースホルダーにフォールバック（アプリは落ちない）。
- **UI修正**：先生からの問題カード／配布中の問題カード／Factory（和訳・例文・ラベル・
  復習リスト追加ボタン）で、ライトモード時の白文字を濃色化し可読性を確保。
- **セキュリティ Phase 1**：
  - 管理者合言葉（旧 `ADMIN_PASSCODE` の実値）をソースから削除・無効化。
  - 合言葉による教師自己昇格を廃止／登録時の招待コード回避を廃止／無効化された
    「先生用コード」入力欄を非表示。
  - localStorage の profile キャッシュから `password` を除去（空上書き回帰も防止）。
  - 明示ログアウト時に個人情報系 localStorage と旧 APIキーを削除。
- **Anthropic 直叩き削除**：`generateAIDistractors`（App.tsx）と AIペット
  `sendMessage`（components.tsx）から Anthropic `fetch` を**コードごと完全削除**。
  設定画面の APIキー入力欄・`anthropicApiKey` state も削除。`dist`/`src` に
  `api.anthropic.com` 等は残っていません。
- **PWA manifest/icon 整理**：`index.html` に静的 `manifest`/`apple-touch-icon`/`icon`
  リンクを追加し、実行時 Blob マニフェスト（旧 "ORITAN"・存在しないアイコン参照）を削除。
  PWA アプリ名は `Oriex` に統一（`public/manifest.webmanifest`）。アイコン参照はすべて
  実在ファイル（`icon-180/192/512.png`）かつ相対パス。
- **重複キー警告の整理**：`activeRoomBg`/`ownedRoomBgs`（App.tsx・同値）と `bottom`
  （components.tsx・後勝ち値を維持）の重複を解消。ビルド時の重複キー警告はゼロ。

## 6. まだ未完了の注意点

- **ログイン認証本体は未変更**：現状はまだ **匿名認証（`signInAnonymously`）＋
  Firestore `profile.password` 比較**でログインしています（壊さないため Phase 1 では触れていない）。
- **Phase 2 の Firebase Auth 移行は未実装**：Email/Password 認証＋Custom Claims への
  移行は設計のみ（`SECURITY_NOTES.md`）。`firestore.rules.phase2.example` /
  `firestore.rules.example` は `password` 書き込みを禁止するため、**移行前に本番適用すると
  登録・ログインが壊れます**。まず `firestore.rules.phase1.example` を使ってください。
- **3DハムスターのWebGL実描画・Firebase 実連携は未検証**：この環境ではビルド・配信・
  配線まで確認済みですが、実機での 3D 描画やデータ連携は未検証です。
- ビルド時の重複キー警告は解消済みですが、`tsconfig` は `strict:false`（既存コード互換のため）。

## 7. GitHub Pages で公開する場合の注意

- `vite.config.ts` は `base: './'` で、アイコン・manifest・SW はすべて**相対パス**です
  （サブパス配信 `https://<user>.github.io/<repo>/` でも壊れません）。
- ログイン画面アイコンは `import.meta.env.BASE_URL` 基準で解決します。
- 公開手順の例：`npm run build` → `dist/` を Pages に配置（`dist/.nojekyll` 同梱済み）。
- `public/sw.js` は相対 `sw.js` を登録します。更新時は `sw.js` 内の `VERSION` を上げると
  旧キャッシュが破棄されます。

## Firebase / データ互換性
projectId `genro-b74de` / appId `gen-ron-kai-app-v1` / コレクション名・フィールド名は
未変更。既存ユーザーのデータはそのまま読めます。
