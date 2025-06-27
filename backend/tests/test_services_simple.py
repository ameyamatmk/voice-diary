import asyncio
import os
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.transcription import TranscriptionService
from app.services.summary import SummaryService


@pytest.mark.unit
@pytest.mark.audio
class TestTranscriptionServiceSimple:
    """TranscriptionServiceの簡単なテスト"""
    
    def test_init_service(self):
        """サービスの初期化テスト"""
        # 環境変数を設定
        os.environ["TRANSCRIBE_API"] = "mock"
        service = TranscriptionService()
        assert service is not None
        assert service.api_type == "mock"
        
    @pytest.mark.asyncio
    async def test_mock_transcribe(self):
        """モック文字起こしのテスト"""
        os.environ["TRANSCRIBE_API"] = "mock"
        service = TranscriptionService()
        
        # モック処理の実行
        result = await service._mock_transcribe()
        
        assert result is not None
        assert "transcription" in result
        assert "confidence" in result
        assert "model" in result
        assert "language" in result
        assert result["model"] == "mock-whisper-v1"
        assert isinstance(result["confidence"], float)
        assert 0.0 <= result["confidence"] <= 1.0
        assert result["language"] == "ja"
        
    @pytest.mark.asyncio
    async def test_transcribe_audio_mock_mode(self):
        """音声文字起こし（モック）のテスト"""
        os.environ["TRANSCRIBE_API"] = "mock"
        service = TranscriptionService()
        
        with tempfile.NamedTemporaryFile(suffix=".webm") as temp_file:
            temp_file.write(b"dummy audio content")
            temp_file.flush()
            
            # モック処理実行
            result = await service.transcribe_audio(temp_file.name)
            
            assert result is not None
            assert "transcription" in result
            assert result["model"] == "mock-whisper-v1"
            assert result["language"] == "ja"


@pytest.mark.unit
class TestSummaryServiceSimple:
    """SummaryServiceの簡単なテスト"""
    
    def test_init_service(self):
        """サービス初期化テスト"""
        os.environ["SUMMARY_API"] = "mock"
        service = SummaryService()
        assert service is not None
        assert service.api_type == "mock"
        
    @pytest.mark.asyncio
    async def test_mock_summarize(self):
        """モック要約のテスト"""
        os.environ["SUMMARY_API"] = "mock"
        service = SummaryService()
        
        test_text = "これはテスト用の長いテキストです。" * 10
        result = await service._mock_summarize(test_text)
        
        assert result is not None
        assert "summary" in result
        assert "title" in result
        assert "model" in result
        assert "tokens_used" in result
        assert result["model"] == "mock-gpt-4o-mini"
        assert isinstance(result["tokens_used"], int)
        
    @pytest.mark.asyncio
    async def test_summarize_text_mock_mode(self):
        """テキスト要約（モック）のテスト"""
        os.environ["SUMMARY_API"] = "mock"
        service = SummaryService()
        
        test_text = "今日は良い天気でした。公園で散歩をして、コーヒーを飲みました。"
        result = await service.summarize_text(test_text)
        
        assert result is not None
        assert "summary" in result
        assert "title" in result
        assert result["model"] == "mock-gpt-4o-mini"
        
    @pytest.mark.asyncio
    async def test_summarize_with_empty_text(self):
        """空のテキストでの要約テスト"""
        os.environ["SUMMARY_API"] = "mock"
        service = SummaryService()
        
        result = await service.summarize_text("")
        
        assert result is not None
        assert "summary" in result
        assert "title" in result
        
    @pytest.mark.asyncio
    async def test_api_error_handling(self):
        """API呼び出しエラーのハンドリングテスト"""
        os.environ["SUMMARY_API"] = "invalid_api"
        service = SummaryService()
        
        # 無効なAPIタイプでのテスト
        with pytest.raises(ValueError, match="Unsupported summary API"):
            await service.summarize_text("テストテキスト")
            
    @pytest.mark.asyncio
    async def test_concurrent_summarization(self):
        """並行要約処理のテスト"""
        os.environ["SUMMARY_API"] = "mock"
        service = SummaryService()
        
        texts = [
            "第一のテストテキストです。",
            "第二のテストテキストです。", 
            "第三のテストテキストです。"
        ]
        
        # 並行実行
        tasks = [service.summarize_text(text) for text in texts]
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 3
        for result in results:
            assert "summary" in result
            assert "title" in result
            assert result["model"] == "mock-gpt-4o-mini"