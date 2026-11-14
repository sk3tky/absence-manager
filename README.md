# 欠課管理アプリ セットアップ

## 構成
- `index.html` … フロントエンド（GitHub Pagesに置く）
- `Code.gs` … バックエンド（Googleスプレッドシートに紐づくGAS）

## まず試す（ローカルモード）
`index.html` の `CFG` が空のままブラウザで開くと、その端末の localStorage だけで動作します（共有・認証なし）。

## 本番（家族共有）
1. Googleスプレッドシートを新規作成 → 拡張機能 → Apps Script に `Code.gs` を貼り付け
2. スクリプトプロパティを設定
   - `CLIENT_ID` … 手順3で発行するクライアントID
   - `ALLOWED_EMAILS` … 許可するGmailアドレスをカンマ区切り
3. Google Cloud Console で OAuth クライアントID（ウェブアプリ）を発行し、承認済みJavaScript生成元に GitHub Pages のURL（例: `https://<user>.github.io`）を登録
4. GASを「ウェブアプリ」としてデプロイ（実行ユーザー: 自分 / アクセス: 全員）。発行されたURLを控える
5. `index.html` の `CFG.GAS_URL` と `CFG.CLIENT_ID` を設定し、GitHubにpush → Pages有効化

## 補足
- 初回のみGoogleログイン。以降はIDトークンのキャッシュ（localStorage）とGoogleの自動選択で自動ログインします。
- 保存はシート単位の全置換（最後に保存した内容が優先）。家族数名の利用想定です。
- 欠課は登録時点の科目で確定します。登録後に時間割や変則時間割を変更しても過去の欠課の科目は変わりません。
