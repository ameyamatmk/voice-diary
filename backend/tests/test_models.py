import pytest
from datetime import datetime, timezone
from uuid import uuid4

from app.models import DiaryEntry, UserSettings


@pytest.mark.unit
@pytest.mark.database
class TestDiaryEntry:
    """DiaryEntryモデルのテスト"""
    
    def test_create_diary_entry_minimal(self, test_session):
        """最小限のデータでDiaryEntryを作成"""
        entry = DiaryEntry(
            title="テスト日記",
            transcription="テスト文字起こし"
        )
        test_session.add(entry)
        test_session.commit()
        
        assert entry.id is not None
        assert entry.title == "テスト日記"
        assert entry.transcription == "テスト文字起こし"
        assert entry.created_at is not None
        assert entry.updated_at is not None
        assert entry.recorded_at is not None
        
    def test_create_diary_entry_full(self, test_session):
        """全データでDiaryEntryを作成"""
        entry_id = uuid4()
        recorded_at = datetime.now(timezone.utc)
        
        entry = DiaryEntry(
            id=entry_id,
            title="完全テスト日記",
            recorded_at=recorded_at,
            audio_file_path="/test/audio.webm",
            file_id="test-file-123",
            transcription="完全テスト文字起こし",
            summary="完全テスト要約",
            tags=["テスト", "完全版", "日本語"],
            emotions={"positive": 0.8, "negative": 0.1, "neutral": 0.1},
            transcribe_model="whisper-1",
            summary_model="gpt-4o-mini",
            transcription_status="completed",
            summary_status="completed",
            transcription_task_id="trans-123",
            summary_task_id="sum-456"
        )
        test_session.add(entry)
        test_session.commit()
        
        # データベースから再取得して確認
        saved_entry = test_session.query(DiaryEntry).filter_by(id=entry_id).first()
        assert saved_entry is not None
        assert saved_entry.title == "完全テスト日記"
        assert saved_entry.recorded_at == recorded_at
        assert saved_entry.audio_file_path == "/test/audio.webm"
        assert saved_entry.file_id == "test-file-123"
        assert saved_entry.transcription == "完全テスト文字起こし"
        assert saved_entry.summary == "完全テスト要約"
        assert saved_entry.tags == ["テスト", "完全版", "日本語"]
        assert saved_entry.emotions == {"positive": 0.8, "negative": 0.1, "neutral": 0.1}
        assert saved_entry.transcribe_model == "whisper-1"
        assert saved_entry.summary_model == "gpt-4o-mini"
        assert saved_entry.transcription_status == "completed"
        assert saved_entry.summary_status == "completed"
        assert saved_entry.transcription_task_id == "trans-123"
        assert saved_entry.summary_task_id == "sum-456"
        
    def test_diary_entry_timestamps(self, test_session):
        """タイムスタンプの自動設定をテスト"""
        entry = DiaryEntry(title="タイムスタンプテスト")
        test_session.add(entry)
        test_session.commit()
        
        assert entry.created_at is not None
        assert entry.updated_at is not None
        assert entry.recorded_at is not None
        
        # updated_atの更新をテスト
        original_updated_at = entry.updated_at
        entry.title = "更新されたタイトル"
        test_session.commit()
        
        assert entry.updated_at > original_updated_at
        
    def test_diary_entry_jsonb_tags(self, test_session):
        """JSONBタグフィールドのテスト"""
        entry = DiaryEntry(
            title="タグテスト",
            tags=["Python", "FastAPI", "テスト", "日本語タグ"]
        )
        test_session.add(entry)
        test_session.commit()
        
        # タグ検索のテスト（SQLAlchemyのJSONB操作）
        found_entries = test_session.query(DiaryEntry).filter(
            DiaryEntry.tags.op('@>')('["Python"]')
        ).all()
        
        assert len(found_entries) == 1
        assert found_entries[0].id == entry.id
        
        # 日本語タグ検索
        found_entries = test_session.query(DiaryEntry).filter(
            DiaryEntry.tags.op('@>')('["日本語タグ"]')
        ).all()
        
        assert len(found_entries) == 1
        
    def test_diary_entry_emotions_jsonb(self, test_session):
        """感情データのJSONBテスト"""
        emotions_data = {
            "positive": 0.7,
            "negative": 0.2, 
            "neutral": 0.1,
            "confidence": 0.85
        }
        
        entry = DiaryEntry(
            title="感情テスト",
            emotions=emotions_data
        )
        test_session.add(entry)
        test_session.commit()
        
        # JSONBデータの取得確認
        saved_entry = test_session.query(DiaryEntry).filter_by(id=entry.id).first()
        assert saved_entry.emotions == emotions_data
        assert saved_entry.emotions["positive"] == 0.7
        
    def test_diary_entry_status_fields(self, test_session):
        """ステータスフィールドの各値をテスト"""
        statuses = ["pending", "processing", "completed", "failed"]
        
        for status in statuses:
            entry = DiaryEntry(
                title=f"ステータステスト_{status}",
                transcription_status=status,
                summary_status=status
            )
            test_session.add(entry)
            
        test_session.commit()
        
        # 各ステータスのエントリが正しく保存されているか確認
        for status in statuses:
            entries = test_session.query(DiaryEntry).filter_by(
                transcription_status=status
            ).all()
            assert len(entries) == 1
            assert entries[0].summary_status == status


@pytest.mark.unit
@pytest.mark.database  
class TestUserSettings:
    """UserSettingsモデルのテスト"""
    
    def test_create_user_setting(self, test_session):
        """ユーザー設定の作成テスト"""
        setting_value = {
            "transcribe_api": "openai",
            "transcribe_model": "whisper-1",
            "summary_api": "openai",
            "summary_model": "gpt-4o-mini"
        }
        
        setting = UserSettings(
            key="api_config",
            value=setting_value
        )
        test_session.add(setting)
        test_session.commit()
        
        # データベースから確認
        saved_setting = test_session.query(UserSettings).filter_by(key="api_config").first()
        assert saved_setting is not None
        assert saved_setting.value == setting_value
        assert saved_setting.updated_at is not None
        
    def test_update_user_setting(self, test_session):
        """ユーザー設定の更新テスト"""
        original_value = {"theme": "light"}
        setting = UserSettings(key="ui_config", value=original_value)
        test_session.add(setting)
        test_session.commit()
        
        original_updated_at = setting.updated_at
        
        # 設定を更新
        new_value = {"theme": "dark", "language": "ja"}
        setting.value = new_value
        test_session.commit()
        
        # 更新確認
        assert setting.value == new_value
        assert setting.updated_at > original_updated_at
        
    def test_jsonb_query_operations(self, test_session):
        """JSONB値での検索操作テスト"""
        # 複数の設定を作成
        settings_data = [
            ("user1_config", {"theme": "dark", "notifications": True}),
            ("user2_config", {"theme": "light", "notifications": False}),
            ("api_config", {"provider": "openai", "model": "gpt-4"})
        ]
        
        for key, value in settings_data:
            setting = UserSettings(key=key, value=value)
            test_session.add(setting)
        test_session.commit()
        
        # JSONBクエリテスト - theme: "dark"の設定を検索
        dark_theme_settings = test_session.query(UserSettings).filter(
            UserSettings.value.op('@>')('{"theme": "dark"}')
        ).all()
        
        assert len(dark_theme_settings) == 1
        assert dark_theme_settings[0].key == "user1_config"
        
        # JSONBクエリテスト - providerキーが存在する設定を検索
        provider_settings = test_session.query(UserSettings).filter(
            UserSettings.value.op('?')('provider')
        ).all()
        
        assert len(provider_settings) == 1
        assert provider_settings[0].key == "api_config"