# JLPT Trainer フロントエンド

[English](README.md) | **日本語** | [Tiếng Việt](README.vi.md)

Vue 3（Composition API）、TypeScript、Vite で構築した JLPT Trainer の学習画面です。別リポジトリの [ASP.NET Core バックエンド](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.ja.md)に接続します。

## ローカルでの実行

フロントエンドには Node.js 20.19 以降、または 22.12 以降が必要です。API にはバックエンドの README に記載されている .NET SDK が必要です。

1. API 用のターミナルを別に開きます。PostgreSQL と JWT を設定し、マイグレーションを適用した後、HTTPS プロファイルで API をポート `7017` に起動します。以下の `cd` コマンドは、バックエンドが `Project3/backend`、このリポジトリが `Project3/frontend/jlpt-trainer-fe-vue` にある構成を前提としています。[バックエンドの実行手順](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.ja.md#ローカルでの実行)

   ```powershell
   cd ..\..\backend
   dotnet run --project src\JlptTrainer.Api --launch-profile https
   ```

2. フロントエンドのディレクトリで、依存パッケージをインストールして Vite を起動します。

   ```powershell
   npm ci
   npm run dev
   ```

`http://localhost:5173` を開きます。Vite が `/api` へのリクエストを `https://localhost:7017` に転送するため、ローカル開発では API の既存の CORS 設定を使えます。

## コマンド

- `npm run dev` は開発サーバーを起動します。
- `npm run typecheck` は TypeScript と Vue の単一ファイルコンポーネントを型チェックします。
- `npm test` は HTTP クライアントの回帰テストを実行します。
- `npm run build` は型チェックを実行し、本番用の成果物を `dist/` に出力します。
- `npm run preview` はビルド結果をローカルでプレビューします。

## ソース構成

```text
src/
  app/              アプリとルーター
  features/
    auth/            認証 API、セッション状態、アカウント関連画面
    vocab/           語彙 API、型定義、語彙一覧画面
    review/          復習カード API、復習予定のカードを表示する画面
  shared/
    api/             HTTP クライアントとエラー処理
    types/           共通の型とバックエンドの列挙型
  styles/            アプリ全体の CSS
```

新しい機能は `features/<機能名>` に配置し、必要に応じて `api/`、`pages/`、`types.ts` を追加します。

## カードの復習

ログイン後、語彙一覧で **Thêm vào bộ ôn**（復習に追加）を選び、**Ôn tập**（復習）を開きます。**Hiện đáp án**（答えを表示）を選んで覚え具合を評価すると、サーバーが次の復習時刻を計算します。1 回の読み込みで、復習時期を迎えた語彙・漢字・文法のカードを最大 20 枚表示します。

語彙一覧は `GET /api/auth/me` で教材管理権限を取得します。**Thêm từ**（語彙を追加）と **Xóa**（削除）は教材管理者に表示されます。[教材管理権限の設定](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.ja.md#教材の管理)

## パスワードの変更・再設定

語彙一覧の上部で **Đổi mật khẩu**（パスワードを変更）を選びます。現在のパスワード、新しいパスワード、確認用のパスワードを入力し、保存後は新しいパスワードでログインします。既存のセッションは、次に認証が必要な API を呼び出したときに無効になります。

ログインできない場合は、ログイン画面で **Quên mật khẩu?**（パスワードをお忘れですか？）を選びます。Gmail SMTP の設定が済んでいれば、登録済みのメールアドレスに再設定リンクが送信されます。[Gmail の設定とマイグレーション](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.ja.md#gmail-でパスワードを再設定)

## API の設定

`VITE_API_BASE_URL` の既定値は `/api` です。デプロイ時は `/api` 用のリバースプロキシを設定するか、ビルド前にこの変数へ API の URL を指定してください。設定例は `.env.example` にあります。トークンやシークレットは Vite の環境変数に入れないでください。

セッション情報は localStorage の `jlpt_token` と `jlpt_user` に保存します。認証が必要なリクエストで `401` が返ると、アプリはセッションを消去してログイン画面を表示します。
