from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
import uuid
from datetime import datetime, timezone, timedelta
from .database import Base

# JST (UTC+9) タイムゾーン定義
JST = timezone(timedelta(hours=9))

class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    
    # 基本情報
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=True)
    recorded_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(JST))
    
    # ファイル情報
    audio_file_path = Column(String(500), nullable=True)
    file_id = Column(String(100), nullable=True)  # アップロード時のfile_id
    
    # AI処理結果
    transcription = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    
    # タグと感情分析
    tags = Column(JSON, nullable=True, default=list)
    emotions = Column(JSON, nullable=True)
    
    # 使用したモデル情報
    transcribe_model = Column(String(100), nullable=True)
    summary_model = Column(String(100), nullable=True)
    
    # 処理状態
    transcription_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    summary_status = Column(String(50), default="pending")
    
    # タスクID（非同期処理追跡用）
    transcription_task_id = Column(String(100), nullable=True)
    summary_task_id = Column(String(100), nullable=True)
    
    # タイムスタンプ
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(JST))
    updated_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(JST), onupdate=lambda: datetime.now(JST))

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(JST), onupdate=lambda: datetime.now(JST))