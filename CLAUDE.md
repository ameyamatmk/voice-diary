# 音声日記システム実装指示書

## プロジェクト概要

自宅ラボ環境（Proxmox VE + Docker）に音声日記システムを構築する。音声録音、AI文字起こし、要約機能を持つWebアプリケーションを開発し、完全HTTPS環境で運用する。

## 技術要件

### システム構成
- **フロントエンド**: Next.js 14 App Router + TypeScript (React.jsから変更)
- **バックエンド**: FastAPI (Python)
- **データベース**: PostgreSQL
- **音声処理**: OpenAI Whisper (ローカル) または Whisper API
- **要約生成**: Ollama (ローカルLLM) または OpenAI API
- **デプロイ**: Docker Compose
- **リバースプロキシ**: 既存Nginx Proxy Manager統合

### インフラ統合要件
- **ドメイン**: `diary.homelab.local`
- **SSL証明書**: 既存`*.homelab.local`ワイルドカード証明書使用
- **DNS**: 既存Pi-hole統合
- **ネットワーク**: 既存`homelab-net` Docker network使用
- **配置先**: `/opt/homelab/apps/voice-diary/`

## 機能要件

### 必須機能
1. **音声録音**
   - ブラウザWebRTC API使用（MediaRecorder API）
   - WebM形式での録音・保存
   - 録音品質：ブラウザデフォルト設定
   - リアルタイム音声レベル表示（開発中・動作調整要）
   - 録音時間制限（最大10分）
   - 録音の一時停止・再開機能

2. **文字起こし・要約**
   - 音声ファイルのテキスト変換（日本語特化API使用）
   - 非同期処理（バックグラウンドで実行、進捗表示）
   - **タイトル自動生成**: 要約結果の最初の20文字から自動生成
   - **リアルタイム更新**: 処理中エントリの3秒間隔自動UI更新
   - 精度指標表示
   - 手動テキスト編集機能
   - 要約の再生成機能

3. **データ管理**
   - 日記エントリの一覧表示（ページネーション対応）
   - 日記エントリの編集・削除機能
   - タグ付け機能（自由入力 + オートコンプリート）
   - **データ永続化**: 音声アップロード時に自動エントリ作成、処理結果をデータベースに保存
   - WebAuthn認証（パスキー対応・Phase 2実装予定）

### UI/UX・デザイン要件
- **レスポンシブデザイン**: PC・タブレット・スマートフォン対応
- **PWA対応**: オフライン機能、ホーム画面追加
- **アクセシビリティ**: WCAG 2.1 AA準拠
- **テーマ**: ダーク・ライトモード切り替え
- **音声UI特化**: 録音状態の直感的な視覚フィードバック

### デザインシステム・スタイリング仕様

#### **カラーパレット**
```css
/* ライトモード */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-primary: #3b82f6;
  --accent-secondary: #1d4ed8;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --recording: #dc2626;
  --border: #e2e8f0;
  --shadow: rgba(0, 0, 0, 0.1);
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
    --accent-primary: #3b82f6;
    --accent-secondary: #60a5fa;
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --recording: #dc2626;
    --border: #475569;
    --shadow: rgba(0, 0, 0, 0.3);
  }
}
```

#### **音声録音UI特化デザイン**
```typescript
// 録音ボタンのデザイン仕様
interface RecordingButtonProps {
  state: 'idle' | 'recording' | 'paused' | 'processing';
}

// 状態別スタイル
const recordingStyles = {
  idle: "bg-accent-primary hover:bg-accent-secondary",
  recording: "bg-recording animate-pulse shadow-lg shadow-recording/50",
  paused: "bg-warning",
  processing: "bg-accent-primary animate-spin"
};

// 音声レベル表示
const audioLevelBars = "h-8 w-2 bg-success rounded-full transition-all duration-75";
```

#### **レイアウト・コンポーネント設計**
```typescript
// メインレイアウト
interface LayoutProps {
  header: "sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border";
  main: "container mx-auto px-4 py-6 max-w-4xl";
  footer: "mt-auto py-4 text-center text-text-muted";
}

// 音声録音エリア
interface RecordingAreaProps {
  container: "bg-bg-secondary rounded-2xl p-8 shadow-lg border border-border";
  waveform: "h-24 w-full bg-bg-tertiary rounded-lg mb-6";
  controls: "flex items-center justify-center gap-4";
  timer: "text-2xl font-mono text-text-primary";
}

// 日記一覧カード
interface DiaryCardProps {
  card: "bg-bg-primary rounded-xl p-6 shadow-md border border-border hover:shadow-lg transition-all";
  title: "text-xl font-semibold text-text-primary mb-2";
  meta: "flex items-center gap-4 text-sm text-text-muted mb-3";
  content: "text-text-secondary line-clamp-3";
  tags: "flex flex-wrap gap-2 mt-4";
  tag: "px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm";
}
```

#### **アニメーション・インタラクション**
```css
/* 録音中のパルスアニメーション */
@keyframes recording-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

/* 音声レベル表示アニメーション */
@keyframes audio-level {
  0%, 100% { height: 0.5rem; }
  50% { height: 2rem; }
}

/* ローディングスピナー */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ページ遷移 */
.page-transition {
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}

/* ホバー効果 */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--shadow);
}
```

#### **Typography（フォント）**
```css
/* フォントファミリー */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
  --font-japanese: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
}

/* フォントスケール */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
```

#### **モバイル最適化**
```css
/* タッチターゲット最小サイズ */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* スワイプジェスチャ対応 */
.swipeable {
  touch-action: pan-x;
  user-select: none;
}

/* モバイル録音UI */
@media (max-width: 768px) {
  .recording-area {
    padding: 1.5rem;
    margin: 0 1rem;
  }
  
  .recording-button {
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }
  
  .audio-controls {
    gap: 1rem;
    flex-direction: column;
  }
}
```

#### **アクセシビリティ対応**
```css
/* フォーカス表示 */
.focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  :root {
    --border: #000000;
    --text-muted: var(--text-secondary);
  }
}

/* 動きを抑える設定 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### **実装ライブラリ・ツール指定**
```typescript
// 推奨UI実装スタック
{
  "styling": "Tailwind CSS v3.4+",
  "components": "Headless UI + Tailwind",
  "icons": "Lucide React (音声関連: Mic, Square, Play, Pause, Volume2)",
  "animations": "Framer Motion（必要に応じて）",
  "waveform": "wavesurfer.js または react-audio-visualize",
  "audio": "Web Audio API + MediaRecorder API"
}
```

### 推奨機能（優先度順）
- **感情分析**: テキストからの感情スコア
- **カレンダー表示**: 月間カレンダーでエントリ表示
- **統計表示**: 文字数、録音時間等の統計
- **エクスポート機能**: JSONエクスポート（データ移行用、優先度低）
- **検索機能**: 日付・キーワード検索（タグで代替可能、優先度低）

## 技術仕様

### フロントエンド仕様
```typescript
// 主要コンポーネント構成
- RecordingInterface: 音声録音UI
- DiaryList: 日記一覧表示
- DiaryDetail: 個別日記詳細・編集
- Settings: 設定画面（API選択等）
- Dashboard: 統計・サマリー表示
```

### バックエンドAPI仕様
```python
# 主要エンドポイント
POST /api/diary/             # 新規日記作成
GET  /api/diary/             # 日記一覧取得（ページネーション対応）
GET  /api/diary/{id}         # 個別日記取得
PUT  /api/diary/{id}         # 日記更新
DELETE /api/diary/{id}       # 日記削除
POST /api/audio/upload       # 音声ファイルアップロード
POST /api/transcribe         # 文字起こし実行（非同期）
GET  /api/transcribe/{task_id} # 文字起こし進捗・結果取得
POST /api/summarize          # 要約生成（非同期）
GET  /api/summarize/{task_id}  # 要約進捗・結果取得
GET  /api/settings           # 設定取得
PUT  /api/settings           # 設定更新
GET  /api/models/transcribe  # 利用可能な文字起こしモデル一覧
GET  /api/models/summarize   # 利用可能な要約モデル一覧
GET  /api/tags               # タグ一覧取得（オートコンプリート用）
GET  /api/health             # ヘルスチェック（Uptime Kuma統合用）

# 認証関連
POST /api/auth/register      # WebAuthn登録開始
POST /api/auth/register/verify # WebAuthn登録完了
POST /api/auth/login         # WebAuthn認証開始
POST /api/auth/login/verify  # WebAuthn認証完了
POST /api/auth/logout        # ログアウト
```

### 処理フロー・エラーハンドリング
```python
# 音声→テキスト→要約の非同期処理フロー（実装済み）
1. 音声アップロード → DiaryEntry自動作成 + task_id返却
2. 文字起こし開始 → 進捗API で状況確認（3秒間隔自動更新）
3. 完了後、要約処理開始 → 進捗API で状況確認
4. 要約完了時 → タイトル自動生成 + DiaryEntryに全結果保存
5. UI自動更新 → 処理完了で監視停止

# 開発環境用モック処理
- 文字起こし: 2秒後に固定モックテキスト返却
- 要約: 4秒後にモック要約 + タイトル生成
- フロントエンド: 3秒間隔でAPI監視・UI更新

# エラーハンドリング方針
- API制限エラー：リトライ機構 + ユーザー通知
- ファイルサイズ超過：アップロード前チェック（50MB制限）
- 音声フォーマット不正：自動変換試行
- ネットワークエラー：オフライン対応 + 同期機能
```

### データベーススキーマ
```sql
-- 日記エントリテーブル（実装済み）
diary_entries:
  - id (UUID, PRIMARY KEY)
  - title (VARCHAR)  -- 要約から自動生成または手動入力
  - recorded_at (TIMESTAMP WITH TIME ZONE)  -- JST保存
  - audio_file_path (VARCHAR)
  - file_id (VARCHAR)  -- アップロード時のファイルID
  - transcription (TEXT)
  - summary (TEXT)
  - tags (JSONB)
  - emotions (JSONB)
  - transcribe_model (VARCHAR)  -- 使用した文字起こしモデル
  - summary_model (VARCHAR)     -- 使用した要約モデル
  - transcription_status (VARCHAR)  -- pending, processing, completed, failed
  - summary_status (VARCHAR)        -- pending, processing, completed, failed
  - transcription_task_id (VARCHAR) -- 非同期処理追跡用
  - summary_task_id (VARCHAR)       -- 非同期処理追跡用
  - created_at (TIMESTAMP WITH TIME ZONE)  -- JST保存
  - updated_at (TIMESTAMP WITH TIME ZONE)  -- JST保存

-- 設定テーブル
user_settings:
  - key (VARCHAR, PRIMARY KEY)
  - value (JSONB)
  - updated_at (TIMESTAMP WITH TIME ZONE)  -- JST保存
  
-- 設定例
-- transcribe_api: "openai" | "google" | "amazon" | "local"
-- transcribe_model: "whisper-1" | "ja-JP" | "large-v2" 
-- summary_api: "openai" | "claude" | "local"
-- summary_model: "gpt-4o-mini" | "claude-3-haiku" | "llama2:7b"

-- WebAuthn認証テーブル（Phase 2実装予定）
webauthn_credentials:
  - id (UUID, PRIMARY KEY)
  - user_id (VARCHAR)
  - credential_id (BYTEA)
  - public_key (BYTEA)
  - sign_count (INTEGER)
  - created_at (TIMESTAMP WITH TIME ZONE)  -- JST保存
```

## Docker構成

### ディレクトリ構造
```
/opt/homelab/apps/voice-diary/
├── compose.yaml              # Docker Compose v2推奨ファイル名
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   └── models/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── public/
├── nginx/
│   └── nginx.conf
└── volumes/
    ├── postgres/
    ├── uploads/
    └── models/
```

### Docker Compose統合
```yaml
# /opt/homelab/apps/compose.yaml（メインファイル）
include:
  - voice-diary/compose.yaml
  - nook/compose.yaml
  # 他のアプリケーション

# これにより apps/ ディレクトリ全体を統合管理可能
```

### Docker Compose設定
- **voice-diary-web**: React フロントエンド
- **voice-diary-api**: FastAPI バックエンド
- **voice-diary-db**: PostgreSQL データベース
- **voice-diary-nginx**: 内部ルーティング（必要に応じて）

## AI/ML設定オプション

### 文字起こしAPI選択肢（日本語性能重視）
```python
# Option 1: Google Cloud Speech-to-Text（推奨）
# 日本語特化、高精度、リアルタイム対応
gcp_credentials_path = "path/to/credentials.json"
gcp_language_code = "ja-JP"

# Option 2: OpenAI Whisper API
# マルチリンガル対応、コスト効率良
openai_api_key = "sk-..."
openai_model = "whisper-1"

# Option 3: Amazon Transcribe
# AWS環境統合時に選択
aws_region = "ap-northeast-1"
aws_language_code = "ja-JP"

# Option 4: ローカルWhisper
# 完全無料、プライバシー重視
whisper_model = "large-v2"  # 日本語性能最高
```

### 要約設定
```python
# Option 1: ローカルWhisper
whisper_model = "medium"  # tiny, base, small, medium, large

# Option 2: OpenAI Whisper API
openai_api_key = "sk-..."
```

### 要約設定（モデル選択可能）
```python
# Option 1: OpenAI API（複数モデル対応）
openai_models = {
    "gpt-3.5-turbo": {"cost": 0.002, "quality": "標準"},
    "gpt-4o-mini": {"cost": 0.0003, "quality": "高品質・低コスト"},
    "gpt-4o": {"cost": 0.03, "quality": "最高品質"}
}

# Option 2: Claude API
claude_models = {
    "claude-3-haiku": {"cost": 0.0008, "quality": "高速・低コスト"},
    "claude-3-sonnet": {"cost": 0.003, "quality": "バランス型"},
    "claude-3-opus": {"cost": 0.015, "quality": "最高品質"}
}

# Option 3: ローカルLLM (Ollama)
ollama_models = ["llama2:7b", "gemma:7b", "qwen:7b"]
ollama_url = "http://ollama:11434"

# 設定でモデル切り替え可能に
```

## 性能・制限要件

### ファイル・リソース制限
- **音声ファイル**: 最大50MB、最大10分
- **同時録音**: 1セッション
- **同時処理**: 文字起こし2並列、要約3並列
- **レート制限**: 1時間あたり30回のAPI呼び出し
- **ストレージ**: 音声ファイル1GB、データベース100MB

### 応答時間要件
- **API応答**: 500ms以内
- **文字起こし**: 10分音声で2分以内
- **要約生成**: 30秒以内
- **ページロード**: 初回3秒以内、再訪問1秒以内

## セキュリティ・プライバシー要件

### 認証・アクセス制御
- **WebAuthn（パスキー）認証実装**
  - Windows PC: PIN/Windows Hello
  - Android: 指紋認証/顔認証
  - フォールバック: パスワード認証
- **セッション管理**: JWT + HTTP-only Cookie
- **CSRF保護**: CSRF トークン実装

### データ保護
- **ファイルアップロード**: サイズ・形式・内容検証
- **入力検証**: XSS、SQLインジェクション対策
- **API制限**: レート制限 + IP制限（必要に応じて）
- **ログ制限**: 個人情報をログに記録しない

### プライバシー考慮
- **データ保持期間**: 設定可能（デフォルト1年）
- **完全削除**: 論理削除 + 物理削除オプション
- **API キー**: 環境変数での管理

### WebAuthn実装詳細
```typescript
// フロントエンド実装例
// 登録フロー
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: new Uint8Array(32),
    rp: { name: "Voice Diary", id: "diary.homelab.local" },
    user: { id: userId, name: "user", displayName: "User" },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // 内蔵認証器優先
      userVerification: "required"
    }
  }
});

// 認証フロー  
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array(32),
    allowCredentials: [{ id: credentialId, type: "public-key" }],
    userVerification: "required"
  }
});
```

```python
# バックエンド実装例
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response

# 登録オプション生成
registration_options = generate_registration_options(
    rp_id="diary.homelab.local",
    rp_name="Voice Diary",
    user_id=user_id,
    user_name="user",
    user_display_name="User"
)

# 認証検証
verification = verify_authentication_response(
    credential=credential,
    expected_challenge=challenge,
    expected_origin="https://diary.homelab.local",
    expected_rp_id="diary.homelab.local"
)
```

## 開発・デプロイ指針

### 開発環境要件
- **ホットリロード**: フロントエンド・バックエンド双方対応
- **開発用認証**: パスワード認証でのバイパス機能（Phase 1では認証なし）
- **モックAPI**: 文字起こし・要約のダミー応答（実装済み）
- **ローカルDB**: PostgreSQL Docker コンテナ
- **Docker開発環境**: WSL2環境でのDocker Compose開発環境構築済み

### 開発環境構成（実装済み）
```yaml
# compose.dev.yaml - 開発専用Docker Compose設定
services:
  voice-diary-web-dev:    # Next.js開発サーバー（ポート3000）
  voice-diary-api-dev:    # FastAPI開発サーバー（ポート8000）
  voice-diary-db-dev:     # PostgreSQL開発DB（ポート5432）

# 開発環境固有設定
volumes:
  - ホットリロード対応（./frontend:/app, ./backend:/app）
  - node_modules分離でパフォーマンス最適化
  - ./volumes/uploads: 音声ファイル保存
  - ./volumes/postgres: DB永続化

environment:
  - TRANSCRIBE_API=mock (開発環境はモック)
  - SUMMARY_API=mock
  - DATABASE_URL=postgresql://voicediaryuser:voicediarypass@voice-diary-db-dev:5432/voicediary
```

### 環境変数設定
```bash
# 必須設定
DATABASE_URL=postgresql://user:pass@voice-diary-db:5432/voicediary
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production

# API設定（選択式）
# OpenAI
OPENAI_API_KEY=sk-...
TRANSCRIBE_API=openai
SUMMARY_API=openai
TRANSCRIBE_MODEL=whisper-1
SUMMARY_MODEL=gpt-4o-mini

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcp.json
TRANSCRIBE_API=google
SUMMARY_API=openai

# ローカルLLM
OLLAMA_URL=http://ollama:11434
TRANSCRIBE_API=local
SUMMARY_API=local
```

### 初期セットアップ手順
```bash
# 1. データベース初期化
docker compose exec voice-diary-api alembic upgrade head

# 2. 管理者ユーザー作成（WebAuthn登録用）
docker compose exec voice-diary-api python -m app.init_admin

# 3. 初期設定の確認
curl https://diary.homelab.local/api/health
```

### ログ・モニタリング
- **ログレベル**: INFO（本番）、DEBUG（開発）
- **ログ形式**: JSON構造化ログ
- **メトリクス**: 処理時間、API使用量、エラー率
- **アラート**: API制限到達、処理失敗率5%超過

### 既存環境統合手順
```bash
# 1. アプリケーション配置・起動
cd /opt/homelab/apps
docker compose up -d voice-diary-web voice-diary-api voice-diary-db

# 2. 初期セットアップ実行
docker compose exec voice-diary-api alembic upgrade head
docker compose exec voice-diary-api python -m app.init_admin

# 3. Pi-hole DNS設定
Pi-hole管理画面 → Local DNS → DNS Records
Domain: diary.homelab.local
IP: 192.168.25.20

# 4. NPM Proxy Host設定  
NPM管理画面 → Proxy Hosts → Add
Domain: diary.homelab.local
Forward to: voice-diary-web:3000
SSL: *.homelab.local証明書

# 5. Flame Dashboard追加
Flame管理画面 → Settings → Applications
Name: Voice Diary
URL: https://diary.homelab.local
Icon: mdi:microphone
Category: アプリケーション

# 6. Uptime Kuma監視追加
Monitor Type: HTTP(s)
URL: https://diary.homelab.local/api/health
```

### テスト要件
- ユニットテスト（重要な処理）
- 音声録音・再生テスト
- 文字起こし精度テスト
- レスポンシブデザイン確認

### 監視統合
- 既存Uptime Kumaに監視対象追加
- ヘルスチェックエンドポイント実装

## 運用考慮事項

### メンテナンス
- ログローテーション
- 一時ファイル削除（音声変換用WAV等）
- モデル更新手順

### 拡張性
- 複数ユーザー対応準備（DB設計のみ、UI/認証は単純化）
- 音声品質向上（ノイズ除去等）
- モバイルアプリ化検討（PWA拡張）

**注**: ホームラボ全体のバックアップ戦略で対応するため、アプリ個別のバックアップ機能は実装しない

## 開発環境での技術実装詳細

### 実装済み技術スタック
```typescript
// フロントエンド実装詳細
- Next.js 14.2.18 (App Router)
- TypeScript 5.6.3
- Tailwind CSS 3.4.1 (カスタムCSS変数対応)
- Lucide React (アイコン)
- MediaRecorder API (音声録音)

// バックエンド実装詳細  
- FastAPI 0.115.6
- SQLAlchemy 2.0.36 (ORM)
- PostgreSQL 15-alpine
- Pydantic v2 (スキーマ)
- CORS対応

// Docker環境
- Docker Compose v2形式
- 開発用ホットリロード対応
- ボリューム分離でパフォーマンス最適化
```

### 実装された主要機能
```python
# 非同期処理フロー
1. WebRTC録音 → WebMファイル
2. FormData経由でアップロード
3. DiaryEntry自動作成（UUID, JST timestamp）
4. Task ID生成 → 非同期処理開始
5. Frontend 3秒間隔監視
6. モック処理（2秒後文字起こし、4秒後要約）
7. 結果をDiaryEntryに保存
8. タイトル自動生成（要約の先頭20文字）
9. UI自動更新・監視停止

# APIエンドポイント（実装済み）
POST /api/audio/upload       → file_id + entry_id返却
POST /api/transcribe         → task_id返却  
GET  /api/transcribe/{task_id} → 結果 + DB保存
POST /api/summarize          → task_id返却
GET  /api/summarize/{task_id}  → 結果 + DB保存 + タイトル生成
GET  /api/diary/             → ページネーション対応一覧
GET  /api/diary/{id}         → 個別取得
PUT  /api/diary/{id}         → 編集・更新
DELETE /api/diary/{id}       → 削除（音声ファイルも削除）
```

### 開発中に解決した課題
```bash
# 技術的課題と解決
1. 音声レベル表示: RMS計算実装→動作調整要
2. タイムゾーン問題: TIMESTAMP without time zone → with time zone + JST対応
3. データ永続化: モック結果をDiaryEntryテーブルに保存
4. リアルタイム更新: 3秒間隔自動監視・UI更新
5. 状態初期化エラー: useState依存関係修正
6. PostCSS設定: ES6→CommonJS形式変更
```

## 実装優先度

### Phase 1（最優先）✅ **実装完了**
- 基本的な音声録音・再生（WebM形式）
- シンプルな文字起こし（モック実装）
- 基本的なCRUD機能
- **追加実装機能**:
  - タイトル自動生成
  - リアルタイムUI更新
  - データ永続化
  - タイムゾーン対応（JST）

### Phase 2
- 要約機能実装（モック完了 → 実際のAPI統合）
- 文字起こし機能実装（モック完了 → 実際のAPI統合）
- UI/UX改善（音声レベル表示修正等）
- タグ管理機能強化
- WebAuthn認証実装

### Phase 3（優先度低）
- 検索機能
- エクスポート機能
- 高度な分析機能
- ローカルLLM統合
- 性能最適化

## コスト試算

### 文字起こしAPI比較（月間100分想定）
- **Google Cloud Speech-to-Text**: $0.024/分 × 100分 = $2.4/月
- **OpenAI Whisper API**: $0.006/分 × 100分 = $0.6/月 ⭐コスト優秀
- **Amazon Transcribe**: $0.024/分 × 100分 = $2.4/月

### 要約API比較（月間50回想定、平均1000トークン）
```
OpenAI:
├── GPT-3.5-turbo: $0.002/1K × 50 = $0.1/月
├── GPT-4o-mini: $0.0003/1K × 50 = $0.015/月 ⭐超高コスパ
└── GPT-4o: $0.03/1K × 50 = $1.5/月

Claude (Anthropic):
├── Claude-3-haiku: $0.0008/1K × 50 = $0.04/月
├── Claude-3-sonnet: $0.003/1K × 50 = $0.15/月
└── Claude-3-opus: $0.015/1K × 50 = $0.75/月
```

### 推奨構成コスト
- **コスト重視**: Whisper API + GPT-4o-mini = $0.615/月
- **品質重視**: Google Cloud + Claude-3-sonnet = $2.55/月
- **バランス**: Whisper API + Claude-3-haiku = $0.64/月

### ローカル環境
- 初期GPU要件: 8GB VRAM推奨
- 追加ストレージ: 5-10GB（モデル）
- **運用コスト**: 電力費のみ

---

## 参考情報：既存ホームラボ環境

### ハードウェア・ネットワーク構成
```
インターネット → ルーター → ASUS PN42 (192.168.25.1)
                           ├── Proxmox VE（ホスト）
                           └── Debian VM（prod-lab: 192.168.25.20）
                               └── Docker環境

ネットワーク範囲: 192.168.25.0/24
Docker Network: homelab-net (external)
```

### 既存サービス
```
基盤サービス (/opt/homelab/infra/):
├── Pi-hole: プライベートDNS + 広告ブロック
├── Nginx Proxy Manager: リバースプロキシ + SSL終端
├── Flame: サービスダッシュボード
└── Uptime Kuma: 監視システム

アクセス方法:
├── https://pihole.homelab.local
├── https://npm.homelab.local  
├── https://dashboard.homelab.local
└── https://uptime-kuma.homelab.local
```

### SSL/DNS基盤
```
証明書管理:
├── mkcert プライベートCA
├── *.homelab.local ワイルドカード証明書
├── 証明書配置: /opt/homelab/shared/certs/
└── Windows・Android端末にCA証明書インストール済み

DNS解決:
├── Pi-hole (192.168.25.20)
├── homelab.localドメイン管理
└── 自動DNS解決設定済み
```

### ディレクトリ構造
```
/opt/homelab/
├── infra/compose.yaml           # 基盤サービス
├── apps/compose.yaml            # アプリケーション（追加予定）
├── shared/
│   ├── certs/                   # SSL証明書
│   └── scripts/                 # 運用スクリプト
└── volumes/                     # データ永続化
    ├── pihole/
    ├── npm/
    └── flame/
```

### 新サービス追加の標準手順
```
1. Docker Compose設定・起動
2. Pi-hole DNS Record追加
   - Domain: [service].homelab.local
   - IP: 192.168.25.20
3. NPM Proxy Host設定
   - Forward to: [container_name]:[port]
   - SSL: *.homelab.local証明書
```