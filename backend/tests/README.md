# Voice Diary Backend Tests

## テスト概要

このディレクトリには、音声日記システムのバックエンドAPIの包括的なテストスイートが含まれています。

## テスト構成

### テストファイル
- `conftest.py` - テスト設定とfixture定義
- `test_models.py` - データベースモデルのユニットテスト
- `test_services.py` - サービスクラスのユニットテスト  
- `test_api.py` - APIエンドポイントの統合テスト

### テストカテゴリ
- **Unit Tests** (`@pytest.mark.unit`) - 個別コンポーネントのテスト
- **Integration Tests** (`@pytest.mark.integration`) - APIエンドポイントのテスト
- **Database Tests** (`@pytest.mark.database`) - データベース操作のテスト
- **Audio Tests** (`@pytest.mark.audio`) - 音声処理のテスト

## テスト実行方法

### 前提条件
1. PostgreSQLが起動していること
2. テスト用データベース権限があること

### 依存関係のインストール
```bash
cd backend
pip install -r requirements.txt
```

### 全テスト実行
```bash
# 全テスト実行
pytest

# 詳細出力で実行
pytest -v

# カバレッジレポート付きで実行
pytest --cov=app --cov-report=html
```

### 特定のテストカテゴリ実行
```bash
# ユニットテストのみ
pytest -m unit

# 統合テストのみ
pytest -m integration

# データベーステストのみ
pytest -m database

# 音声テストのみ
pytest -m audio
```

### 特定のテストファイル実行
```bash
# モデルテストのみ
pytest tests/test_models.py

# サービステストのみ
pytest tests/test_services.py

# APIテストのみ
pytest tests/test_api.py
```

### 並列実行（高速化）
```bash
# pytest-xdistを使用した並列実行
pip install pytest-xdist
pytest -n auto
```

## テストデータベース設定

### 自動設定
テストは自動的に専用のテストデータベースを作成・削除します：
- データベース名: `voicediary_test`
- テスト後に自動クリーンアップ

### 手動設定（必要な場合）
```sql
-- PostgreSQLで手動作成する場合
CREATE DATABASE voicediary_test;
GRANT ALL PRIVILEGES ON DATABASE voicediary_test TO voicediaryuser;
```

## 主要テスト項目

### データベースモデル (`test_models.py`)
- DiaryEntry CRUD操作
- JSONB フィールド（tags, emotions）の操作
- タイムスタンプ自動設定
- ステータス管理
- UserSettings キー・バリュー操作

### サービスクラス (`test_services.py`)
- TranscriptionService
  - モック文字起こし
  - WebM→WAV変換
  - OpenAI API統合（モック）
- SummaryService
  - モック要約生成
  - タイトル自動生成
  - OpenAI/Claude API統合（モック）

### APIエンドポイント (`test_api.py`)
- ヘルスチェック (`/`, `/api/health`)
- 音声アップロード (`/api/audio/upload`)
- 文字起こし (`/api/transcribe`, `/api/transcribe/{task_id}`)
- 要約処理 (`/api/summarize`, `/api/summarize/{task_id}`)
- 日記CRUD (`/api/diary/`)
- 検索・タグ (`/api/search`, `/api/tags`, `/api/diary/by-tag/{tag}`)
- エラーハンドリング
- ページネーション

## カバレッジ目標

- **最小カバレッジ**: 80%
- **目標カバレッジ**: 90%以上

```bash
# カバレッジレポート生成
pytest --cov=app --cov-report=html
# htmlcov/index.html でレポート確認
```

## CI/CD統合

### GitHub Actions例
```yaml
- name: Run tests
  run: |
    cd backend
    pytest --cov=app --cov-report=xml --cov-fail-under=80
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: backend/coverage.xml
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   ```
   解決: PostgreSQLが起動していることを確認
   docker compose up -d voice-diary-db-dev
   ```

2. **テストデータベース権限エラー**
   ```sql
   -- PostgreSQLで権限を付与
   GRANT CREATE ON SCHEMA public TO voicediaryuser;
   GRANT ALL PRIVILEGES ON DATABASE voicediary_test TO voicediaryuser;
   ```

3. **音声ファイル変換エラー**
   ```
   解決: pydub + ffmpegが必要（音声テストをスキップする場合は問題なし）
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   ```

4. **非同期テストエラー**
   ```
   解決: pytest-asyncio設定確認
   pytest.ini の asyncio_mode = auto 設定
   ```

### デバッグ用コマンド
```bash
# 詳細エラー出力
pytest --tb=long

# 警告も表示
pytest --disable-warnings=False

# 特定のテストをデバッグ
pytest tests/test_api.py::TestDiaryEndpoints::test_create_diary_entry -v -s
```

## 開発者向け情報

### 新しいテスト追加時
1. 適切なマーカーを設定 (`@pytest.mark.unit` など)
2. 必要なfixtureを使用
3. アサーションは具体的に記述
4. エラーケースも含める
5. 日本語データでのテストも実施

### Fixture活用
- `diary_entry_factory` - テスト用日記エントリ作成
- `user_settings_factory` - テスト用設定作成
- `sample_audio_file` - テスト用音声ファイル
- `temp_upload_dir` - 一時アップロードディレクトリ
- `mock_*_service` - 外部API呼び出しのモック

## 性能テスト

```bash
# 実行時間測定
pytest --durations=10

# 遅いテストのみ実行
pytest -m slow
```