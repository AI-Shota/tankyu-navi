# 探究ナビ — AIアドバイス連携版（Netlify）

> **公開用ソース一式**。既存の探究ナビのノート風UI、5言語、ナビィ、開花アニメーションを維持しています。

## この中に入っているもの

- `public/index.html` — サイト本体（CSSとJavaScriptはHTML内に組み込み済み）
- `public/assets/` — ナビィ等の素材
- `netlify/functions/advice.mjs` — Groqへの安全なサーバー側中継
- `netlify.toml` — 公開フォルダとFunctionsフォルダの指定
- `tests/advice.test.mjs` — API中継の自動テスト

`index.html` 単体をダブルクリックして開いた場合、入力・ノート保存・チェック・外部AI向けプロンプトは使えますが、Groqへの通信はできません。**APIを動かすにはNetlify Functionsの公開とキー設定が必要**です。

## 大人の運用管理者向け（必読）

Groq Services Agreementの年齢条件は18歳以上です。学校などの成人管理者が契約主体となり、18歳未満の利用者に提供することが許されるかサービス規約・データ保護条件を確認してください。**本人の年齢を偽って契約したり、他人のアカウントを借りたりしないでください。**

### 公開の方法

Netlify のドラッグ＆ドロップで `public` の内容だけを上書きすると、静的ページしか公開されません。Netlify Functionsも一緒に公開するには、**Git連携でこのプロジェクトのルートを公開する**か、Netlify CLI のFunctions対応デプロイを利用してください。既存の `tankyu-navi` サイトに紐づけてデプロイすれば、URLはそのままにできます。

- Netlifyの既存サイト管理画面 → `Project configuration` → `Developer settings` → `Continuous deployment` → `Repository` から、管理者が連携設定できます。
- Netlifyのサイト環境変数で、管理者が `GROQ_API_KEY` を設定します。**キーの文字列を生徒・チャット・Git・HTMLに貼り付けないこと。** `netlify.toml` には書かないでください。
- 変数がFunctions実行時に利用できる設定か確認し、公開を再実行してください。
- 公開後 `https://（サイトのドメイン）/api/advice` を開くと、設定済みなら `{ "available": true }` が返ります（これは稼働中の保証ではありません）。
- ホームからテーマを登録し、AIアドバイスを押して実際の通信を確認してください。

### 未設定と制限時

- 未設定：AI欄で利用できないことを5言語で案内
- 上限：1日上限と短時間の制限を区別して案内
- 接続エラー：「ほかのAIに頼む」へ誘導（この機能はAPI不要）

### 本番運用前の検討

公開サイトのAIエンドポイントはログイン不要で利用できるため、**無関係な第三者による大量呼び出しを防ぐ追加対策**（WAF、レート制限、必要に応じたユーザー認証など）と予算上限の確認を管理者が行ってください。キーをHTMLに隠すだけでは保護になりません。

## テスト

`node --test tests/advice.test.mjs`

Groqの本物のAPIキーを使わなくても、通信成功、キー未設定、入力検証、上限到達、上流エラーを模擬確認できます。

## 出典

- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/legal/services-agreement
- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/functions/environment-variables/
