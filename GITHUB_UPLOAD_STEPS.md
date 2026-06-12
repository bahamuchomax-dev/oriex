# GitHubアップロード手順

このZIPはGitHubに上げる用です。`node_modules` と `dist` は含めていません。

## 1. ZIPを解凍

`oriex-github-upload.zip` を解凍してください。

中の `oriex` フォルダをGitHub Desktopで開きます。

## 2. GitHub Desktopで開く

GitHub Desktop → File → Add local repository → 解凍した `oriex` フォルダを選択。

Gitリポジトリではないと言われたら、`create a repository` を押してください。

## 3. コミットして公開

Summary:

```text
Set up Oriex source project
```

`Commit to main` → `Publish repository` を押してください。

## 4. GitHub Pages設定

GitHubのリポジトリ画面 → Settings → Pages → Source を `GitHub Actions` にしてください。

## 5. Firebase API KeyをSecretに登録

GitHubのリポジトリ画面 → Settings → Secrets and variables → Actions → New repository secret

Name:

```text
VITE_FIREBASE_API_KEY
```

Valueには、ローカルの `.env` に入れているFirebase API Keyを入れてください。

`.env` はGitHubに上げないでください。

## 6. Actionsを確認

push後、GitHub → Actions で `Deploy to GitHub Pages` が成功するか確認してください。

成功後、Settings → Pages に公開URLが出ます。
