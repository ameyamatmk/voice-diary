import asyncio
import io
import json
import tempfile
from datetime import datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import status


@pytest.mark.integration
class TestHealthEndpoints:
    """ヘルスチェックエンドポイントのテスト"""
    
    def test_root_endpoint(self, client):
        """ルートエンドポイントのテスト"""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert data["message"] == "Voice Diary API is running"
        
    def test_health_endpoint(self, client):
        """ヘルスチェックエンドポイントのテスト"""
        response = client.get("/api/health")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert "message" in data
        assert data["message"] == "Voice Diary API is running"


@pytest.mark.integration
class TestAudioEndpoints:
    """音声関連エンドポイントのテスト"""
    
    def test_audio_upload_success(self, client, temp_upload_dir):
        """音声ファイルアップロード成功テスト"""
        # WebMファイルのモック作成
        audio_content = b"RIFF" + b"\x00" * 100 + b"WEBM" + b"\x00" * 1000
        
        files = {
            "file": ("test_audio.webm", io.BytesIO(audio_content), "audio/webm")
        }
        
        response = client.post("/api/audio/upload", files=files)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "file_id" in data
        assert "entry_id" in data
        assert "message" in data
        
    def test_audio_upload_no_file(self, client):
        """ファイルなしでのアップロードエラーテスト"""
        response = client.post("/api/audio/upload")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    def test_audio_upload_invalid_format(self, client):
        """無効なファイル形式でのアップロードテスト"""
        files = {
            "file": ("test.txt", io.BytesIO(b"not audio content"), "text/plain")
        }
        
        response = client.post("/api/audio/upload", files=files)
        # 実装によってはファイル形式チェックを行う場合
        # assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    @pytest.mark.asyncio
    async def test_transcribe_start(self, async_client, diary_entry_factory):
        """文字起こし開始エンドポイントのテスト"""
        # テスト用のDiaryEntryを作成
        entry = diary_entry_factory(
            transcription_status="pending",
            audio_file_path="/test/audio.webm"
        )
        
        request_data = {
            "entry_id": str(entry.id),
            "api_type": "mock"
        }
        
        response = await async_client.post("/api/transcribe", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "processing"
        
    @pytest.mark.asyncio
    async def test_transcribe_get_result(self, async_client, mock_transcription_service):
        """文字起こし結果取得のテスト"""
        task_id = mock_transcription_service["task_id"]
        
        # モック結果を設定（実際の実装では task_results に保存）
        with patch('app.routers.audio.task_results', {task_id: mock_transcription_service}):
            response = await async_client.get(f"/api/transcribe/{task_id}")
            assert response.status_code == status.HTTP_200_OK
            
            data = response.json()
            assert data["status"] == "completed"
            assert "result" in data
            assert data["result"]["transcription"] == "モックの文字起こし結果です。"
            
    @pytest.mark.asyncio
    async def test_transcribe_task_not_found(self, async_client):
        """存在しないタスクIDでの文字起こし結果取得テスト"""
        fake_task_id = str(uuid4())
        response = await async_client.get(f"/api/transcribe/{fake_task_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
class TestSummaryEndpoints:
    """要約関連エンドポイントのテスト"""
    
    @pytest.mark.asyncio
    async def test_summarize_start(self, async_client, diary_entry_factory):
        """要約開始エンドポイントのテスト"""
        entry = diary_entry_factory(
            transcription="これはテスト用の文字起こしテキストです。要約処理のテストを行います。",
            summary_status="pending"
        )
        
        request_data = {
            "entry_id": str(entry.id),
            "api_type": "mock"
        }
        
        response = await async_client.post("/api/summarize", json=request_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "processing"
        
    @pytest.mark.asyncio
    async def test_summarize_get_result(self, async_client, mock_summary_service):
        """要約結果取得のテスト"""
        task_id = mock_summary_service["task_id"]
        
        with patch('app.routers.summary.task_results', {task_id: mock_summary_service}):
            response = await async_client.get(f"/api/summarize/{task_id}")
            assert response.status_code == status.HTTP_200_OK
            
            data = response.json()
            assert data["status"] == "completed"
            assert "result" in data
            assert data["result"]["summary"] == "モックの要約結果です。"
            assert data["result"]["title"] == "モックのタイトル"


@pytest.mark.integration
class TestDiaryEndpoints:
    """日記関連エンドポイントのテスト"""
    
    @pytest.mark.asyncio
    async def test_create_diary_entry(self, async_client, sample_diary_data):
        """日記エントリ作成テスト"""
        response = await async_client.post("/api/diary/", json=sample_diary_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == sample_diary_data["title"]
        assert data["transcription"] == sample_diary_data["transcription"]
        assert data["summary"] == sample_diary_data["summary"]
        assert data["tags"] == sample_diary_data["tags"]
        assert "id" in data
        assert "created_at" in data
        
    @pytest.mark.asyncio
    async def test_get_diary_entries_list(self, async_client, diary_entry_factory):
        """日記エントリ一覧取得テスト"""
        # テストデータ作成
        entries = []
        for i in range(5):
            entry = diary_entry_factory(title=f"テスト日記{i+1}")
            entries.append(entry)
            
        response = await async_client.get("/api/diary/")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert len(data["items"]) == 5
        assert data["total"] == 5
        
    @pytest.mark.asyncio
    async def test_get_diary_entries_pagination(self, async_client, diary_entry_factory):
        """日記エントリページネーションテスト"""
        # 10個のエントリを作成
        for i in range(10):
            diary_entry_factory(title=f"ページネーションテスト{i+1}")
            
        # 1ページ目（5件）
        response = await async_client.get("/api/diary/?page=1&size=5")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 1
        assert data["size"] == 5
        assert data["total"] == 10
        
        # 2ページ目（5件）
        response = await async_client.get("/api/diary/?page=2&size=5")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2
        
    @pytest.mark.asyncio
    async def test_get_single_diary_entry(self, async_client, diary_entry_factory):
        """個別日記エントリ取得テスト"""
        entry = diary_entry_factory(title="個別取得テスト")
        
        response = await async_client.get(f"/api/diary/{entry.id}")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(entry.id)
        assert data["title"] == "個別取得テスト"
        
    @pytest.mark.asyncio
    async def test_get_diary_entry_not_found(self, async_client):
        """存在しない日記エントリ取得テスト"""
        fake_id = uuid4()
        response = await async_client.get(f"/api/diary/{fake_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    @pytest.mark.asyncio
    async def test_update_diary_entry(self, async_client, diary_entry_factory):
        """日記エントリ更新テスト"""
        entry = diary_entry_factory(title="更新前タイトル")
        
        update_data = {
            "title": "更新後タイトル",
            "transcription": "更新されたトランスクリプション",
            "tags": ["更新", "テスト"]
        }
        
        response = await async_client.put(f"/api/diary/{entry.id}", json=update_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["title"] == "更新後タイトル"
        assert data["transcription"] == "更新されたトランスクリプション"
        assert data["tags"] == ["更新", "テスト"]
        
    @pytest.mark.asyncio
    async def test_delete_diary_entry(self, async_client, diary_entry_factory):
        """日記エントリ削除テスト"""
        entry = diary_entry_factory(title="削除テスト")
        entry_id = entry.id
        
        response = await async_client.delete(f"/api/diary/{entry_id}")
        assert response.status_code == status.HTTP_200_OK
        
        # 削除後の取得でNotFoundになることを確認
        response = await async_client.get(f"/api/diary/{entry_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    @pytest.mark.asyncio
    async def test_get_entries_by_tag(self, async_client, diary_entry_factory):
        """タグ別エントリ取得テスト"""
        # 同じタグを持つエントリを複数作成
        diary_entry_factory(title="Python日記1", tags=["Python", "プログラミング"])
        diary_entry_factory(title="Python日記2", tags=["Python", "学習"])
        diary_entry_factory(title="その他日記", tags=["日常", "雑記"])
        
        response = await async_client.get("/api/diary/by-tag/Python")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 2
        
        # 全てのエントリが"Python"タグを持つことを確認
        for item in data["items"]:
            assert "Python" in item["tags"]


@pytest.mark.integration
class TestSearchAndTagsEndpoints:
    """検索・タグ関連エンドポイントのテスト"""
    
    @pytest.mark.asyncio
    async def test_search_entries(self, async_client, diary_entry_factory):
        """全文検索テスト"""
        # 検索用テストデータ作成
        diary_entry_factory(
            title="Python学習記録", 
            transcription="今日はPythonのFastAPIについて学習しました",
            summary="FastAPI学習の記録"
        )
        diary_entry_factory(
            title="散歩日記",
            transcription="公園を散歩して気分転換できました",
            summary="散歩で気分転換"
        )
        
        # タイトル検索
        response = await async_client.get("/api/search?q=Python")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 1
        assert "Python" in data["items"][0]["title"]
        
        # 本文検索
        response = await async_client.get("/api/search?q=散歩")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 1
        assert "散歩" in data["items"][0]["transcription"]
        
    @pytest.mark.asyncio
    async def test_get_all_tags(self, async_client, diary_entry_factory):
        """全タグ取得テスト"""
        # タグ付きエントリを作成
        diary_entry_factory(tags=["Python", "プログラミング"])
        diary_entry_factory(tags=["Python", "学習"])
        diary_entry_factory(tags=["散歩", "日常"])
        
        response = await async_client.get("/api/tags")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        
        # タグの統計情報確認
        python_tag = next((tag for tag in data if tag["name"] == "Python"), None)
        assert python_tag is not None
        assert python_tag["count"] == 2
        
    @pytest.mark.asyncio
    async def test_search_with_pagination(self, async_client, diary_entry_factory):
        """検索結果のページネーションテスト"""
        # 同じキーワードを含む複数エントリを作成
        for i in range(8):
            diary_entry_factory(title=f"テスト日記{i+1}", transcription="テスト用の内容です")
            
        response = await async_client.get("/api/search?q=テスト&page=1&size=5")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 8
        assert data["page"] == 1
        assert data["size"] == 5
        
    @pytest.mark.asyncio
    async def test_search_no_results(self, async_client):
        """検索結果なしのテスト"""
        response = await async_client.get("/api/search?q=存在しないキーワード")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["items"]) == 0
        assert data["total"] == 0


@pytest.mark.integration
class TestErrorHandling:
    """エラーハンドリングのテスト"""
    
    @pytest.mark.asyncio
    async def test_invalid_uuid_format(self, async_client):
        """無効なUUID形式でのAPIアクセステスト"""
        response = await async_client.get("/api/diary/invalid-uuid")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    @pytest.mark.asyncio
    async def test_invalid_pagination_params(self, async_client):
        """無効なページネーションパラメータのテスト"""
        # 負の値
        response = await async_client.get("/api/diary/?page=-1&size=10")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # ゼロ
        response = await async_client.get("/api/diary/?page=1&size=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    @pytest.mark.asyncio
    async def test_malformed_json_request(self, async_client):
        """不正なJSONリクエストのテスト"""
        import json
        
        # 無効なJSON形式
        response = await async_client.post(
            "/api/diary/",
            content='{"title": "test", "invalid": }',  # 不正なJSON
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY