# 🎙️ Voice Diary システム

自宅ラボ環境で動作する音声日記システム。WebRTCによる音声録音、AI文字起こし、要約機能を持つWebアプリケーション。

## 📋 目次

- [システム概要](#システム概要)
- [技術スタック](#技術スタック)
- [機能一覧](#機能一覧)
- [セットアップ](#セットアップ)
- [AI API設定](#ai-api設定)
- [開発環境での実行](#開発環境での実行)
- [本番環境デプロイ](#本番環境デプロイ)
- [API仕様](#api仕様)
- [トラブルシューティング](#トラブルシューティング)

## 🚀 システム概要

音声録音から文字起こし、要約までを自動化する日記システム。完全HTTPS環境で動作し、プライバシーを重視した設計。

### 主な特徴

- 🎤 **WebRTC音声録音**: ブラウザで直接録音（WebM形式）
- 🤖 **AI文字起こし**: OpenAI Whisper / Google Cloud Speech-to-Text
- 📝 **AI要約**: OpenAI GPT / Claude API
- 🏷️ **タグ管理**: JSONB検索による高速タグ機能
- 📱 **レスポンシブUI**: PC/タブレット/スマートフォン対応
- 🔐 **セキュア**: HTTPS + プライベートCA証明書

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **MediaRecorder API** (音声録音)

### バックエンド
- **FastAPI** (Python)
- **PostgreSQL** (JSONB対応)
- **SQLAlchemy** (ORM)

### AI サービス
- **OpenAI Whisper API** (文字起こし)
- **OpenAI GPT-4o-mini** (要約)
- **Claude API** (要約 - オプション)
- **Google Cloud Speech-to-Text** (文字起こし - オプション)

### インフラ
- **Docker Compose**
- **Nginx Proxy Manager** (リバースプロキシ)
- **Pi-hole** (DNS)

## ✨ 機能一覧

### 基本機能（実装済み）
- ✅ 音声録音・再生（WebM形式）
- ✅ 文字起こし（AI API統合）
- ✅ 要約生成（AI API統合）
- ✅ 日記エントリCRUD
- ✅ タグ管理（オートコンプリート・検索）
- ✅ カレンダー表示（月間・日別）
- ✅ 検索機能（全文検索）
- ✅ レスポンシブデザイン

### 拡張機能（今後実装予定）
- 🔄 WebAuthn認証（パスキー）
- ⚙️ 設定画面UI
- 📊 統計・分析機能
- 📤 データエクスポート

## 🔧 セットアップ

### 前提条件

- Docker & Docker Compose
- Node.js 18+ (開発時)
- Python 3.11+ (開発時)

### リポジトリクローン

```bash
git clone <repository-url>
cd voice-diary
```

### 環境変数設定

`.env` ファイルを作成：

```bash
# データベース設定
DATABASE_URL=postgresql://voicediaryuser:voicediarypass@voice-diary-db-dev:5432/voicediary

# セキュリティ
SECRET_KEY=your-super-secret-key-change-in-production

# 環境設定
ENVIRONMENT=development

# AI API設定（使用するAPIを選択）
TRANSCRIBE_API=openai    # openai, google, claude, local, mock
SUMMARY_API=openai       # openai, claude, local, mock

# OpenAI API設定
OPENAI_API_KEY=sk-your-openai-api-key-here
TRANSCRIBE_MODEL=whisper-1
SUMMARY_MODEL=gpt-4o-mini

# Google Cloud設定（オプション）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Claude API設定（オプション）
CLAUDE_API_KEY=your-claude-api-key
```

## 🤖 AI API設定

### 1. OpenAI API（推奨）

最もコスト効率が良い選択肢：

```bash
# 1. OpenAI APIキー取得
# https://platform.openai.com/api-keys

# 2. 環境変数設定
export OPENAI_API_KEY="sk-your-api-key-here"

# 3. compose.dev.yaml設定
TRANSCRIBE_API=openai
SUMMARY_API=openai
TRANSCRIBE_MODEL=whisper-1
SUMMARY_MODEL=gpt-4o-mini
```

**コスト試算**（月間100分の音声想定）：
- 文字起こし: $0.60/月
- 要約: $0.015/月
- **合計: $0.615/月**

### 2. Google Cloud Speech-to-Text

高精度な日本語文字起こし：

```bash
# 1. Google Cloud プロジェクト作成・認証設定
# 2. Speech-to-Text API有効化
# 3. サービスアカウントキー作成

# 4. 環境変数設定
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
TRANSCRIBE_API=google
```

### 3. Claude API

高品質な要約生成：

```bash
# 1. Anthropic APIキー取得
# 2. 環境変数設定
export CLAUDE_API_KEY="your-claude-key"
SUMMARY_API=claude
SUMMARY_MODEL=claude-3-haiku
```

### 4. モック設定（開発・テスト用）

```bash
TRANSCRIBE_API=mock
SUMMARY_API=mock
```

## 🏃 開発環境での実行

### 1. 開発環境起動

```bash
# Docker Compose起動
docker compose -f compose.dev.yaml up -d

# ログ確認
docker compose -f compose.dev.yaml logs -f
```

### 2. データベース初期化

```bash
# マイグレーション実行
docker compose -f compose.dev.yaml exec voice-diary-api-dev alembic upgrade head
```

### 3. アクセス確認

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

### 4. 開発環境停止

```bash
docker compose -f compose.dev.yaml down
```

## 🌐 本番環境デプロイ

### ホームラボ環境統合

```bash
# 1. 本番用ディレクトリ配置
sudo mkdir -p /opt/homelab/apps/voice-diary
sudo cp -r . /opt/homelab/apps/voice-diary/

# 2. 本番用compose.yaml作成
cp compose.dev.yaml /opt/homelab/apps/voice-diary/compose.yaml

# 3. 本番環境用設定変更
# - ENVIRONMENT=production
# - 実際のシークレットキー設定
# - AI APIキー設定

# 4. 起動
cd /opt/homelab/apps
docker compose up -d voice-diary-web voice-diary-api voice-diary-db
```

### DNS・SSL設定

```bash
# 1. Pi-hole DNS レコード追加
# Domain: diary.homelab.local
# IP: 192.168.25.20

# 2. Nginx Proxy Manager設定
# Domain: diary.homelab.local
# Forward to: voice-diary-web:3000
# SSL: *.homelab.local証明書

# 3. アクセス確認
# https://diary.homelab.local
```

## 📡 API仕様

### 主要エンドポイント

```bash
# 音声アップロード
POST /api/audio/upload

# 文字起こし
POST /api/transcribe
GET  /api/transcribe/{task_id}

# 要約
POST /api/summarize
GET  /api/summarize/{task_id}

# 日記CRUD
GET    /api/diary/
POST   /api/diary/
GET    /api/diary/{id}
PUT    /api/diary/{id}
DELETE /api/diary/{id}

# タグ管理
GET /api/tags
GET /api/diary/by-tag/{tag_name}

# 検索
GET /api/search?q={query}

# ヘルスチェック
GET /api/health
```

### APIドキュメント

開発環境起動後、以下でSwagger UIにアクセス：
- http://localhost:8000/docs

## 🧪 使用方法

### 1. 音声録音

1. トップページ（/）にアクセス
2. 🎤 録音ボタンをクリック
3. ブラウザの音声許可を承認
4. 録音開始（最大10分）
5. ⏹️ 停止ボタンで録音終了

### 2. 自動処理

録音完了後、自動的に：
1. 文字起こし実行（進捗表示）
2. 要約生成（進捗表示）
3. タイトル自動生成
4. 日記エントリ作成

### 3. 日記管理

- **/diary**: 一覧表示・編集・削除
- **/diary/[id]**: 詳細表示・編集
- **/tags**: タグ一覧・タグ別記事
- **/calendar**: カレンダー表示

## 🔍 トラブルシューティング

### よくある問題

#### 1. 音声録音ができない

```bash
# 確認事項
- HTTPS環境でアクセスしているか
- ブラウザの音声許可が有効か
- マイクが正常に動作するか
```

#### 2. AI API エラー

```bash
# API キーの確認
docker compose -f compose.dev.yaml exec voice-diary-api-dev env | grep API_KEY

# ログ確認
docker compose -f compose.dev.yaml logs voice-diary-api-dev

# APIクォータ確認
# OpenAI: https://platform.openai.com/usage
```

#### 3. データベース接続エラー

```bash
# データベースコンテナ確認
docker compose -f compose.dev.yaml ps voice-diary-db-dev

# データベース接続テスト
docker compose -f compose.dev.yaml exec voice-diary-db-dev psql -U voicediaryuser -d voicediary
```

#### 4. ファイルアップロード エラー

```bash
# アップロードディレクトリ確認
ls -la volumes/uploads/

# 権限確認
docker compose -f compose.dev.yaml exec voice-diary-api-dev ls -la /app/uploads
```

### ログ確認

```bash
# 全サービスログ
docker compose -f compose.dev.yaml logs -f

# 特定サービスログ
docker compose -f compose.dev.yaml logs -f voice-diary-api-dev
docker compose -f compose.dev.yaml logs -f voice-diary-web-dev
```

### パフォーマンス確認

```bash
# リソース使用量
docker stats

# ディスク使用量
du -sh volumes/
```

## 📈 監視・メンテナンス

### ヘルスチェック

```bash
# API ヘルスチェック
curl http://localhost:8000/api/health

# フロントエンド確認
curl http://localhost:3000
```

### ログローテーション

```bash
# Docker ログ設定（compose.yaml）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### バックアップ

```bash
# データベースバックアップ
docker compose -f compose.dev.yaml exec voice-diary-db-dev pg_dump -U voicediaryuser voicediary > backup_$(date +%Y%m%d).sql

# 音声ファイルバックアップ
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz volumes/uploads/
```

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 📞 サポート

問題が発生した場合：

1. [Issues](../../issues) で既存の問題を確認
2. 新しい Issue を作成
3. 詳細な環境情報とログを含めて報告

---

**Voice Diary システム** - Homelab 環境での音声日記管理