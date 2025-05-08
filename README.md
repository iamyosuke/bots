# Daily Bible Verse Bot 📖

Google Gemini APIを使用して、毎日の聖書の一節をDiscordに自動投稿するBotです。

## 機能

- 毎朝9時（JST）に自動投稿
- AIが生成した聖書の一節を投稿
- 聖句の内容に加えて、簡潔な解説も提供
- 完全無料で運用可能（Gemini API + GitHub Actions + Discord Webhook）

## セットアップ方法

1. このリポジトリをフォーク
2. 以下の環境変数をGitHub Secretsに設定:
   - `GEMINI_API_KEY`: Google Cloud Consoleで取得したGemini APIキー
   - `DISCORD_WEBHOOK_URL`: Discordチャンネルで作成したWebhook URL

## 必要な権限・設定

### Google Gemini API
1. [Google AI Studio](https://aistudio.google.com/)でアカウント作成
2. APIキーを取得

### Discord
1. サーバーの設定 → 連携サービス → Webhookを作成
2. Webhook URLをコピー

## 技術スタック

- Node.js 20+
- Google Generative AI (Gemini)
- GitHub Actions
- Discord Webhook

## ローカルでの実行方法

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
export GEMINI_API_KEY='your-api-key'
export DISCORD_WEBHOOK_URL='your-webhook-url'

# スクリプトの実行
npm start
```

## ライセンス

MIT

## 注意事項

- Gemini APIの無料利用枠には制限があります
- GitHub Actionsの月間実行時間にも制限があります（無料アカウントの場合） 