# Teacher / Student Weekly Plan E2E Manual

## 現在のロール判定

Oriex v7.22 の現状では、先生/生徒ロールは次で判定する。

```txt
users/{uid}/profile/main.isTeacher === true
```

- `true`: 先生
- `false` または未設定: 生徒

現在のUIには、先生化ボタン、ロール切替UI、管理者画面はない。
そのため、先生アカウントを作るには Firestore 上で `isTeacher: true` を手動設定する。

## 必要なFirestore path

### 先生プロフィール

```txt
users/{teacherUid}/profile/main
```

最小フィールド:

```js
{
  uid: "{teacherUid}",
  name: "E2E先生",
  isTeacher: true,
  shortId: "TEACH1",
  avatar: "先",
  xp: 0,
  streak: 0,
  comment: "",
  color: "#fbf8f3",
  updatedAt: Timestamp
}
```

### 生徒プロフィール

```txt
users/{studentUid}/profile/main
```

最小フィールド:

```js
{
  uid: "{studentUid}",
  name: "E2E生徒",
  isTeacher: false,
  shortId: "STUD1",
  avatar: "生",
  xp: 0,
  streak: 0,
  comment: "",
  color: "#fbf8f3",
  updatedAt: Timestamp
}
```

`Timestamp` は Firestore Console で手動入力する場合の表現。
コードから作成する場合は `serverTimestamp()` を使う。

### 公開カード

フレンド検索や表示用に、必要なら以下も作る。

```txt
public/data/customApp/{teacherUid}
public/data/customApp/{studentUid}
```

先生の例:

```js
{
  uid: "{teacherUid}",
  name: "E2E先生",
  avatar: "先",
  shortId: "TEACH1",
  updatedAt: Timestamp
}
```

生徒の例:

```js
{
  uid: "{studentUid}",
  name: "E2E生徒",
  avatar: "生",
  shortId: "STUD1",
  updatedAt: Timestamp
}
```

## フレンド登録に必要なデータ

先生側で生徒一覧に出すには、先生の friends に生徒が必要。

```txt
users/{teacherUid}/friends/{studentUid}
```

```js
{
  uid: "{studentUid}",
  displayName: "E2E生徒",
  avatar: "生",
  addedAt: Timestamp
}
```

逆方向も作っておくと、生徒側から先生を確認しやすい。

```txt
users/{studentUid}/friends/{teacherUid}
```

```js
{
  uid: "{teacherUid}",
  displayName: "E2E先生",
  avatar: "先",
  addedAt: Timestamp
}
```

## 参考書本棚に必要なデータ

先生側の週計画送信フォームは `public/data/bookShelf` から参考書候補を読む。

```txt
public/data/bookShelf/{bookId}
```

最小フィールド:

```js
{
  id: "{bookId}",
  title: "E2E確認 参考書",
  subject: "英語",
  level: "test",
  ownerUid: "{teacherUid}",
  ownerName: "E2E先生",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## ブラウザE2E確認手順

### 事前準備

1. ブラウザAでOriexを開く。
2. ゲストログインする。
3. マイページでUIDまたはプロフィールIDを控える。
4. このUIDを `teacherUid` とする。
5. Firestoreで `users/{teacherUid}/profile/main.isTeacher` を `true` にする。
6. 別ブラウザ、別Chromeプロファイル、またはシークレットでOriexを開く。
7. ゲストログインする。
8. このUIDを `studentUid` とする。
9. Firestoreで生徒プロフィール、公開カード、friends、bookShelf を整える。
10. 先生側ブラウザをリロードする。

同じブラウザの通常タブだけだと匿名ログイン状態が共有されることがあるため、先生/生徒は別プロファイルで確認する。

## 先生側操作手順

1. 先生アカウントでログインする。
2. ホームから「配信」または「週計画」を開く。
3. 先生向けの「週計画を送る」画面になっていることを確認する。
4. 生徒セレクトに `E2E生徒` が表示されることを確認する。
5. 参考書セレクトに `E2E確認 参考書` が表示されることを確認する。
6. 課題内容を入力する。
7. 目標を入力する。
8. 「この教材を追加」を押す。
9. 「計画を送信」を押す。
10. 送信成功メッセージを確認する。
11. 送信履歴に生徒名、教材、進捗0%が表示されることを確認する。

送信後に作られる想定path:

```txt
users/{studentUid}/weeklyPlans/{planId}
users/{teacherUid}/sentPlans/{planId}
```

## 生徒側操作手順

1. 生徒アカウントでログインする。
2. ホームから「週計画」を開く。
3. `届いた計画` に先生から送られた計画が表示されることを確認する。
4. 教材名、課題内容、目標、期限が表示されることを確認する。
5. 進捗スライダーまたは数値入力で進捗を変更する。
6. 「進捗を保存」を押す。
7. 「保存しました」が表示されることを確認する。

保存時に更新される想定path:

```txt
users/{studentUid}/weeklyPlans/{planId}
```

加えて、可能なら先生側ミラーも更新される。

```txt
users/{teacherUid}/sentPlans/{planId}
```

## 先生側の進捗確認手順

1. 先生側ブラウザで週計画画面を開き直す。
2. 送信履歴を確認する。
3. 生徒側で保存した進捗率が表示されることを確認する。
4. 表示が古い場合は画面を再読み込みする。

現状、先生側履歴はリアルタイム購読ではなく `loadSentPlans()` の読み込みなので、再表示またはリロードで確認する。

## 既存UIだけで確認できる範囲

- ゲストログイン
- 生徒として週計画画面を開く
- `weeklyPlans` があれば生徒側表示を確認する
- 生徒側で進捗保存する
- 先生ロール設定済みアカウントなら週計画送信UIを開く
- friends と bookShelf があれば、先生側から計画送信する

## 既存UIだけでは確認できない範囲

- 通常UIから任意ユーザーを先生化すること
- ロールを安全に切り替えること
- 管理者が先生アカウントを承認すること
- 先生/生徒アカウントを明示的に作り分けること
- Firestore rules をUIから検証、変更すること

## 確認後に削除するテストデータ

E2E確認後、必要に応じて以下を削除する。

```txt
users/{teacherUid}/sentPlans/{planId}
users/{studentUid}/weeklyPlans/{planId}
users/{teacherUid}/friends/{studentUid}
users/{studentUid}/friends/{teacherUid}
public/data/bookShelf/{bookId}
public/data/customApp/{teacherUid}
public/data/customApp/{studentUid}
```

テスト専用匿名ユーザーなら、以下も削除候補。

```txt
users/{teacherUid}/profile/main
users/{studentUid}/profile/main
```

## 注意点

- `review / userVocab` は localStorage のまま維持する。
- `seenBy` 書き戻しは禁止。
- `customVocabulary` 本体へ生徒操作で書き込まない。
- `weeklyPlans / sentPlans` モデルを置き換えない。
- `plans` データモデルを変更しない。
- Firestore rules phase2 はまだ適用しない。
- 認証方式はまだ変更しない。
- `legacy-dist` は編集しない。
- 先生側 `sentPlans` はリアルタイムではなく再読み込み確認が基本。

## まだ未実装のこと

- 先生化UI
- ロール切替UI
- 管理者画面
- 先生アカウント承認フロー
- Firestore rules phase2
- 認証方式変更
- `weeklyPlans / sentPlans` に代わる新データモデル

## 今後「先生化UI」を作る場合の安全方針

まだ実装しない。

将来作る場合は、次の方針が安全。

- 生徒本人が自由に `isTeacher: true` にできるUIは作らない。
- 管理者承認、招待コード、または固定許可リスト方式にする。
- `profile/main.isTeacher` の更新権限は Firestore rules 側でも制限する。
- 先生化処理は明示的な管理導線に限定する。
- 既存の `weeklyPlans / sentPlans` は維持する。
- 先生化UIと週計画データモデル変更を同時に行わない。
