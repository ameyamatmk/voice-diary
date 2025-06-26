from sqlalchemy import Column, String, Text, DateTime, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, JSONB
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
    tags = Column(JSONB, nullable=True, default=list)
    emotions = Column(JSONB, nullable=True)
    
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

    # インデックス定義
    __table_args__ = (
        # GINインデックス（タグ検索最適化）
        Index('idx_diary_entries_tags_gin', 'tags', postgresql_using='gin'),
        # BTreeインデックス（時系列検索最適化）
        Index('idx_diary_entries_recorded_at_desc', 'recorded_at', postgresql_using='btree'),
        # 複合インデックス（ステータス検索最適化）
        Index('idx_diary_entries_status', 'transcription_status', 'summary_status'),
    )

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(JST), onupdate=lambda: datetime.now(JST))