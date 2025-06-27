from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Dict, Any
import os

from ..database import get_async_db
from ..models import UserSettings

router = APIRouter()

class SettingsRequest(BaseModel):
    transcribe_api: str
    transcribe_model: str
    summary_api: str
    summary_model: str

class SettingsResponse(BaseModel):
    transcribe_api: str
    transcribe_model: str
    summary_api: str
    summary_model: str

# 設定のデフォルト値
DEFAULT_SETTINGS = {
    "transcribe_api": "mock",
    "transcribe_model": "mock-whisper-v1",
    "summary_api": "mock", 
    "summary_model": "mock-gpt-4o-mini"
}

@router.get("/settings", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_async_db)):
    """現在の設定を取得"""
    try:
        # データベースから設定を取得
        result = await db.execute(select(UserSettings))
        settings_rows = result.fetchall()
        
        # 設定をディクショナリに変換
        settings = {}
        for row in settings_rows:
            setting = row[0]  # UserSettings object
            settings[setting.key] = setting.value
        
        # デフォルト値で補完
        final_settings = DEFAULT_SETTINGS.copy()
        final_settings.update(settings)
        
        return SettingsResponse(**final_settings)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"設定の取得に失敗しました: {str(e)}")

@router.post("/settings")
async def save_settings(settings: SettingsRequest, db: AsyncSession = Depends(get_async_db)):
    """設定を保存"""
    try:
        # 設定をディクショナリに変換
        settings_dict = settings.dict()
        
        # 各設定をデータベースに保存
        for key, value in settings_dict.items():
            # 既存の設定を削除
            await db.execute(delete(UserSettings).where(UserSettings.key == key))
            
            # 新しい設定を追加
            new_setting = UserSettings(key=key, value=value)
            db.add(new_setting)
        
        await db.commit()
        
        # 設定が有効かバリデーション
        await validate_settings(settings_dict)
        
        return {"message": "設定を保存しました"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"設定の保存に失敗しました: {str(e)}")

async def validate_settings(settings: Dict[str, Any]):
    """設定の妥当性をチェック"""
    
    # APIキーの存在チェック
    if settings.get("transcribe_api") == "openai" and not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=400, 
            detail="OpenAI文字起こしを使用するにはOPENAI_API_KEYの設定が必要です"
        )
    
    if settings.get("transcribe_api") == "google" and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        raise HTTPException(
            status_code=400, 
            detail="Google文字起こしを使用するにはGOOGLE_APPLICATION_CREDENTIALSの設定が必要です"
        )
    
    if settings.get("summary_api") == "openai" and not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=400, 
            detail="OpenAI要約を使用するにはOPENAI_API_KEYの設定が必要です"
        )
    
    if settings.get("summary_api") == "claude" and not os.getenv("CLAUDE_API_KEY"):
        raise HTTPException(
            status_code=400, 
            detail="Claude要約を使用するにはCLAUDE_API_KEYの設定が必要です"
        )

@router.get("/settings/validate")
async def validate_current_settings():
    """現在の設定の妥当性をチェック"""
    try:
        issues = []
        
        # 環境変数チェック
        transcribe_api = os.getenv("TRANSCRIBE_API", "mock")
        summary_api = os.getenv("SUMMARY_API", "mock")
        
        if transcribe_api == "openai" and not os.getenv("OPENAI_API_KEY"):
            issues.append("OpenAI文字起こし: APIキーが設定されていません")
        
        if transcribe_api == "google" and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            issues.append("Google文字起こし: 認証ファイルが設定されていません")
        
        if summary_api == "openai" and not os.getenv("OPENAI_API_KEY"):
            issues.append("OpenAI要約: APIキーが設定されていません")
        
        if summary_api == "claude" and not os.getenv("CLAUDE_API_KEY"):
            issues.append("Claude要約: APIキーが設定されていません")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "current_config": {
                "transcribe_api": transcribe_api,
                "summary_api": summary_api
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"設定チェックに失敗しました: {str(e)}")

@router.get("/settings/models")
async def get_available_models():
    """利用可能なモデル一覧を取得"""
    return {
        "transcribe_models": {
            "mock": [{"value": "mock-whisper-v1", "name": "Mock Whisper", "description": "モック用"}],
            "openai": [{"value": "whisper-1", "name": "Whisper-1", "description": "標準モデル"}],
            "google": [{"value": "latest_long", "name": "Latest Long", "description": "長時間音声用"}]
        },
        "summary_models": {
            "mock": [{"value": "mock-gpt-4o-mini", "name": "Mock GPT", "description": "モック用"}],
            "openai": [
                {"value": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "高コスパ・高品質"},
                {"value": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "高速・標準品質"},
                {"value": "gpt-4o", "name": "GPT-4o", "description": "最高品質・高コスト"}
            ],
            "claude": [
                {"value": "claude-3-haiku", "name": "Claude 3 Haiku", "description": "高速・低コスト"},
                {"value": "claude-3-sonnet", "name": "Claude 3 Sonnet", "description": "バランス型"},
                {"value": "claude-3-opus", "name": "Claude 3 Opus", "description": "最高品質"}
            ]
        }
    }