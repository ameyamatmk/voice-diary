import asyncio
import os
import tempfile
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import create_database, database_exists, drop_database

from app.database import Base, get_db
from app.main import app
from app.models import DiaryEntry, UserSettings

# テスト用データベースURL
TEST_DATABASE_URL = "postgresql://voicediaryuser:voicediarypass@voice-diary-db:5432/voicediary_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    # テスト用データベース作成
    if database_exists(TEST_DATABASE_URL):
        drop_database(TEST_DATABASE_URL)
    create_database(TEST_DATABASE_URL)
    
    engine = create_engine(TEST_DATABASE_URL)
    
    # テーブル作成
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # クリーンアップ
    engine.dispose()
    drop_database(TEST_DATABASE_URL)


@pytest.fixture
def test_session(test_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def override_get_db(test_session):
    """Override database dependency."""
    def _override_get_db():
        try:
            yield test_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(override_get_db) -> TestClient:
    """Create test client."""
    return TestClient(app)


@pytest_asyncio.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def temp_upload_dir():
    """Create temporary directory for file uploads."""
    with tempfile.TemporaryDirectory() as temp_dir:
        original_upload_dir = os.environ.get("UPLOAD_DIR", "uploads")
        os.environ["UPLOAD_DIR"] = temp_dir
        yield temp_dir
        os.environ["UPLOAD_DIR"] = original_upload_dir


@pytest.fixture
def sample_audio_file():
    """Create sample audio file for testing."""
    import io
    
    # Create a simple WebM-like file content (not real WebM, just for testing)
    content = b"RIFF" + b"\x00" * 100 + b"WEBM" + b"\x00" * 1000
    return io.BytesIO(content)


@pytest.fixture
def sample_diary_data():
    """Sample diary entry data."""
    return {
        "title": "テスト日記",
        "transcription": "これはテスト用の文字起こしです。",
        "summary": "これはテスト用の要約です。",
        "tags": ["テスト", "開発"],
        "emotions": {"positive": 0.7, "negative": 0.2, "neutral": 0.1}
    }


@pytest.fixture
def diary_entry_factory(test_session):
    """Factory for creating diary entries."""
    def _create_diary_entry(**kwargs):
        default_data = {
            "title": "テスト日記",
            "transcription": "テスト文字起こし",
            "summary": "テスト要約",
            "tags": ["テスト"],
            "emotions": {},
            "transcribe_model": "mock",
            "summary_model": "mock",
            "transcription_status": "completed",
            "summary_status": "completed"
        }
        default_data.update(kwargs)
        
        entry = DiaryEntry(**default_data)
        test_session.add(entry)
        test_session.commit()
        test_session.refresh(entry)
        return entry
    
    return _create_diary_entry


@pytest.fixture
def user_settings_factory(test_session):
    """Factory for creating user settings."""
    def _create_user_setting(key: str, value: dict):
        setting = UserSettings(key=key, value=value)
        test_session.add(setting)
        test_session.commit()
        test_session.refresh(setting)
        return setting
    
    return _create_user_setting


@pytest.fixture(autouse=True)
def clean_database(test_session):
    """Clean database after each test."""
    yield
    # テスト後にデータをクリア
    test_session.query(DiaryEntry).delete()
    test_session.query(UserSettings).delete()
    test_session.commit()


@pytest.fixture
def mock_transcription_service():
    """Mock transcription service responses."""
    return {
        "task_id": str(uuid4()),
        "status": "completed",
        "result": {
            "transcription": "モックの文字起こし結果です。",
            "confidence": 0.95,
            "model": "mock"
        }
    }


@pytest.fixture
def mock_summary_service():
    """Mock summary service responses."""
    return {
        "task_id": str(uuid4()),
        "status": "completed", 
        "result": {
            "summary": "モックの要約結果です。",
            "title": "モックのタイトル",
            "model": "mock"
        }
    }