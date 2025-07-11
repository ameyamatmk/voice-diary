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
- ✅ 文字起こし（モック実装・AI API統合準備完了）
- ✅ 要約生成（モック実装・AI API統合準備完了）
- ✅ 日記エントリCRUD
- ✅ タグ管理（オートコンプリート・JSONB検索）
- ✅ カレンダー表示（月間・日別）
- ✅ 検索機能（全文検索）
- ✅ レスポンシブデザイン
- ✅ リアルタイム処理進捗表示

### AI機能（実装済み）
- ✅ 実際のAI API統合（OpenAI/Google/Claude）
- ✅ 設定画面UI（/settings）
- ✅ 動的API切り替え機能

### 拡張機能（今後実装予定）
- 🔐 WebAuthn認証（パスキー）
- 📊 統計・分析機能
- 📤 データエクスポート

## 🔧 セットアップ

### 前提条件

- Docker & Docker Compose
- Node.js 18+ (開発時)
- Python 3.11+ (開発時)

### 🏗️ アーキテクチャ概要

本システムは**統一Docker構成**を採用：

- **開発環境**: ホットリロード + ボリュームマウント
- **本番環境**: 同一構成で安定動作
- **環境変数**: `.env`ファイルによる設定管理

### リポジトリクローン

```bash
git clone <repository-url>
cd voice-diary
```

### 環境変数設定

`.env.example` から `.env` ファイルを作成：

```bash
# .env.example をコピー
cp .env.example .env

# エディタで .env を編集
nano .env
# または
vim .env
```

`.env` ファイルで必要な設定を行います：

```bash
# 最低限必要な設定
SECRET_KEY=your-super-secret-key-change-in-production

# AI API設定（使用したいAPIのコメントアウトを解除）
TRANSCRIBE_API=openai    # openai, google, claude, local, mock
SUMMARY_API=openai       # openai, claude, local, mock

# OpenAI APIキー（使用する場合）
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🔑 AI API設定

音声日記システムは複数のAIサービスに対応しています。**使用したいAPIキーを取得して設定してください**。

### 📋 必要なAPIキー一覧

| APIサービス | APIキー | 用途 | 月間コスト（100分想定） |
|------------|---------|------|----------------------|
| **OpenAI** | `OPENAI_API_KEY` | 文字起こし + 要約 | **$0.615** |
| **Claude** | `CLAUDE_API_KEY` | 要約のみ | $0.04 |
| **Google Cloud** | `GOOGLE_APPLICATION_CREDENTIALS` | 文字起こしのみ | $2.4 |

### 🎯 推奨設定パターン

#### **Pattern 1: 最もコスパが良い（推奨）**
```bash
# OpenAI APIのみ使用
OPENAI_API_KEY=sk-proj-your-openai-key-here
TRANSCRIBE_API=openai
SUMMARY_API=openai
TRANSCRIBE_MODEL=whisper-1
SUMMARY_MODEL=gpt-4o-mini
```
**月間コスト**: ~$0.615 | **特徴**: 高精度・多言語対応

#### **Pattern 2: 高品質重視**
```bash
# OpenAI + Claude組み合わせ
OPENAI_API_KEY=sk-proj-your-openai-key-here
CLAUDE_API_KEY=sk-ant-your-claude-key-here
TRANSCRIBE_API=openai
SUMMARY_API=claude
TRANSCRIBE_MODEL=whisper-1
SUMMARY_MODEL=claude-3-sonnet
```
**月間コスト**: ~$0.75 | **特徴**: 高品質要約・自然な文章

#### **Pattern 3: 日本語特化**
```bash
# Google Cloud + OpenAI組み合わせ  
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-cloud-key.json
OPENAI_API_KEY=sk-proj-your-openai-key-here
TRANSCRIBE_API=google
SUMMARY_API=openai
SUMMARY_MODEL=gpt-4o-mini
```
**月間コスト**: ~$2.415 | **特徴**: 日本語文字起こし最高精度

#### **Pattern 4: 開発・テスト用**
```bash
# モック設定（無料）
TRANSCRIBE_API=mock
SUMMARY_API=mock
```
**月間コスト**: 無料 | **特徴**: ダミーデータでシステムテスト

### 🔧 APIキー取得手順

#### **1. OpenAI API（推奨）**
1. https://platform.openai.com/ にアクセス
2. アカウント作成・ログイン
3. 「API Keys」→「Create new secret key」
4. `sk-proj-`で始まるキーをコピー
5. .envファイルに設定：
   ```bash
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```

#### **2. Claude API（高品質要約）**
1. https://console.anthropic.com/ にアクセス
2. アカウント作成・ログイン  
3. 「API Keys」→「Create Key」
4. `sk-ant-`で始まるキーをコピー
5. .envファイルに設定：
   ```bash
   CLAUDE_API_KEY=sk-ant-your-actual-key-here
   ```

#### **3. Google Cloud Speech（日本語特化）**
1. https://console.cloud.google.com/ にアクセス
2. プロジェクト作成
3. Speech-to-Text API を有効化
4. 「IAM」→「サービスアカウント」→「キーを作成」
5. JSONファイルをダウンロード
6. ファイルを配置して.envに設定：
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-cloud-key.json
   ```

### ⚙️ 設定画面での変更

APIキー設定後、Webブラウザの設定画面で簡単に切り替え可能：

1. http://localhost:3000/settings にアクセス
2. 使用したいAPI・モデルを選択
3. 「保存」をクリック
4. 即座に反映（リアルタイム切り替え）

### 💡 設定のコツ

- **開発段階**: モック設定でシステム確認
- **本格運用**: OpenAI APIキーのみでスタート
- **高品質化**: 必要に応じてClaude追加
- **コスト管理**: OpenAI使用量ダッシュボードで監視

## 🏃 開発環境での実行

### 1. 環境変数ファイル作成

```bash
# .env.example から .env を作成
cp .env.example .env

# .env ファイルを編集（必要に応じてAPIキーを設定）
nano .env
```

### 2. 開発環境起動

```bash
# 開発環境で起動（ホットリロード有効）
docker compose up -d

# ログ確認
docker compose logs -f
```

### 3. データベース初期化

データベースは起動時に自動作成されます（SQLAlchemy auto-migration）。

### 4. アクセス確認

- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

### 5. 開発環境停止

```bash
docker compose down
```

## 🌐 本番環境デプロイ

### ホームラボ環境統合

```bash
# 1. 本番用ディレクトリ配置
sudo mkdir -p /opt/homelab/apps/voice-diary
sudo cp -r . /opt/homelab/apps/voice-diary/

# 2. 本番用環境変数設定
cd /opt/homelab/apps/voice-diary
cp .env.example .env

# 3. .env ファイル編集（本番用設定）
# - SECRET_KEY=実際のシークレットキー
# - AI APIキー設定
# - データベースパスワード変更（推奨）

# 4. 本番環境で起動
docker compose up -d

# 5. データベース初期化は自動実行されます
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

### 1. AI API設定（初回のみ）

1. `/settings` にアクセス
2. 使用したいAPIプロバイダーを選択
3. 適切なモデルを選択
4. 「保存」ボタンをクリック
5. 設定完了！

### 2. 音声録音

1. トップページ（/）にアクセス
2. 🎤 録音ボタンをクリック
3. ブラウザの音声許可を承認
4. 録音開始（最大10分）
5. ⏹️ 停止ボタンで録音終了

### 3. 自動AI処理

録音完了後、設定に応じて自動実行：
1. **文字起こし**（OpenAI Whisper / Google Cloud）
2. **要約生成**（OpenAI GPT / Claude）
3. **タイトル自動生成**（要約から抽出）
4. **日記エントリ作成**（全結果を保存）

### 4. 日記管理

- **/**: 音声録音画面
- **/diary**: 一覧表示・編集・削除
- **/diary/[id]**: 詳細表示・編集
- **/tags**: タグ一覧・タグ別記事
- **/calendar**: カレンダー表示
- **/settings**: AI設定・モデル選択

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
docker compose exec voice-diary-api env | grep API_KEY

# ログ確認
docker compose logs voice-diary-api

# APIクォータ確認
# OpenAI: https://platform.openai.com/usage
```

#### 3. データベース接続エラー

```bash
# データベースコンテナ確認
docker compose ps voice-diary-db

# データベース接続テスト
docker compose exec voice-diary-db psql -U voicediaryuser -d voicediary
```

#### 4. ファイルアップロード エラー

```bash
# アップロードディレクトリ確認
ls -la volumes/uploads/

# 権限確認
docker compose exec voice-diary-api ls -la /app/uploads
```

### ログ確認

```bash
# 全サービスログ
docker compose logs -f

# 特定サービスログ
docker compose logs -f voice-diary-api
docker compose logs -f voice-diary-web
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
docker compose exec voice-diary-db pg_dump -U voicediaryuser voicediary > backup_$(date +%Y%m%d).sql

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
