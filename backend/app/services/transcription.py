import os
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
import tempfile

import openai
from google.cloud import speech
from pydub import AudioSegment
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import async_session_factory
from ..models import UserSettings


class TranscriptionService:
    def __init__(self):
        # 初期設定（環境変数から）
        self.api_type = os.getenv("TRANSCRIBE_API", "mock")
        self.model = os.getenv("TRANSCRIBE_MODEL", "whisper-1")
        self.openai_client = None
        self.google_client = None
        self._setup_clients()
    
    def _setup_clients(self):
        """APIクライアントをセットアップ"""
        # OpenAI API設定
        if self.api_type == "openai":
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required for OpenAI transcription")
            self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        # Google Cloud設定
        elif self.api_type == "google":
            credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if not credentials_path:
                raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is required for Google transcription")
            self.google_client = speech.SpeechClient()
    
    async def _get_settings_from_db(self) -> Dict[str, Any]:
        """データベースから設定を取得"""
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(UserSettings))
                settings_rows = result.fetchall()
                
                settings = {}
                for row in settings_rows:
                    setting = row[0]
                    settings[setting.key] = setting.value
                
                return settings
        except Exception:
            # DB接続エラーの場合は環境変数を使用
            return {}
    
    async def _update_config(self):
        """設定を更新"""
        db_settings = await self._get_settings_from_db()
        
        # データベース設定が存在する場合は優先
        if "transcribe_api" in db_settings:
            self.api_type = db_settings["transcribe_api"]
        if "transcribe_model" in db_settings:
            self.model = db_settings["transcribe_model"]
        
        # クライアントを再セットアップ
        self._setup_clients()
    
    async def transcribe_audio(self, audio_file_path: str) -> Dict[str, Any]:
        """
        音声ファイルを文字起こしする
        
        Args:
            audio_file_path: 音声ファイルのパス
            
        Returns:
            Dict: {
                "transcription": str,
                "confidence": float,
                "model": str,
                "language": str
            }
        """
        # 設定を最新に更新
        await self._update_config()
        
        if self.api_type == "mock":
            return await self._mock_transcribe()
        elif self.api_type == "openai":
            return await self._openai_transcribe(audio_file_path)
        elif self.api_type == "google":
            return await self._google_transcribe(audio_file_path)
        else:
            raise ValueError(f"Unsupported transcription API: {self.api_type}")
    
    async def _mock_transcribe(self) -> Dict[str, Any]:
        """モック文字起こし（開発用）"""
        await asyncio.sleep(2)  # 実際のAPI呼び出しをシミュレート
        return {
            "transcription": "これはモック文字起こし結果です。実際の音声から生成された文字起こしテキストがここに表示されます。本日は充実した一日でした。朝から晩まで様々な活動に取り組み、多くのことを学ぶことができました。",
            "confidence": 0.95,
            "model": "mock-whisper-v1",
            "language": "ja"
        }
    
    async def _openai_transcribe(self, audio_file_path: str) -> Dict[str, Any]:
        """OpenAI Whisper APIを使用した文字起こし"""
        try:
            # WebMファイルをWAVに変換（OpenAI APIはWebMを直接サポートしていない場合があるため）
            audio_path = Path(audio_file_path)
            if audio_path.suffix.lower() == '.webm':
                wav_path = await self._convert_webm_to_wav(audio_file_path)
            else:
                wav_path = audio_file_path
            
            # OpenAI Whisper APIで文字起こし
            with open(wav_path, "rb") as audio_file:
                transcript = await self.openai_client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    language="ja",  # 日本語を指定
                    response_format="verbose_json"
                )
            
            # 一時ファイルを削除
            if wav_path != audio_file_path and Path(wav_path).exists():
                Path(wav_path).unlink()
            
            return {
                "transcription": transcript.text,
                "confidence": getattr(transcript, 'confidence', 0.9),  # Whisperは信頼度を返さない場合があるので仮の値
                "model": self.model,
                "language": transcript.language or "ja"
            }
            
        except Exception as e:
            raise Exception(f"OpenAI transcription failed: {str(e)}")
    
    async def _google_transcribe(self, audio_file_path: str) -> Dict[str, Any]:
        """Google Cloud Speech-to-Text APIを使用した文字起こし"""
        try:
            # WebMファイルをWAVに変換
            audio_path = Path(audio_file_path)
            if audio_path.suffix.lower() == '.webm':
                wav_path = await self._convert_webm_to_wav(audio_file_path)
            else:
                wav_path = audio_file_path
            
            # 音声ファイルを読み込み
            with open(wav_path, "rb") as audio_file:
                content = audio_file.read()
            
            # Google Cloud Speech-to-Text API設定
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="ja-JP",
                model="latest_long",  # 長時間音声用
                use_enhanced=True,    # 高精度モード
                enable_automatic_punctuation=True  # 自動句読点
            )
            
            # 文字起こし実行
            response = self.google_client.recognize(config=config, audio=audio)
            
            # 一時ファイルを削除
            if wav_path != audio_file_path and Path(wav_path).exists():
                Path(wav_path).unlink()
            
            if not response.results:
                return {
                    "transcription": "",
                    "confidence": 0.0,
                    "model": "google-speech-to-text",
                    "language": "ja"
                }
            
            # 最も信頼度の高い結果を使用
            best_result = response.results[0]
            best_alternative = best_result.alternatives[0]
            
            return {
                "transcription": best_alternative.transcript,
                "confidence": best_alternative.confidence,
                "model": "google-speech-to-text",
                "language": "ja"
            }
            
        except Exception as e:
            raise Exception(f"Google transcription failed: {str(e)}")
    
    async def _convert_webm_to_wav(self, webm_path: str) -> str:
        """WebMファイルをWAVに変換"""
        try:
            # pydubを使用してWebMをWAVに変換
            audio = AudioSegment.from_file(webm_path, format="webm")
            
            # 16kHz, モノラル, 16bitに正規化（音声認識API用の標準設定）
            audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            
            # 一時ファイルとして保存
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                audio.export(temp_wav.name, format="wav")
                return temp_wav.name
                
        except Exception as e:
            raise Exception(f"Audio conversion failed: {str(e)}")


# シングルトンインスタンス
transcription_service = TranscriptionService()