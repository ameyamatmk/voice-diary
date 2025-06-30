from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# リクエストスキーマ
class TranscribeRequest(BaseModel):
    file_id: str

class SummarizeRequest(BaseModel):
    text: str
    entry_id: Optional[str] = None  # 日記エントリIDを追加

class DiaryEntryCreate(BaseModel):
    title: Optional[str] = None
    file_id: str
    tags: Optional[List[str]] = []

class DiaryEntryUpdate(BaseModel):
    title: Optional[str] = None
    transcription: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None

# レスポンススキーマ
class DiaryEntryResponse(BaseModel):
    id: UUID
    title: Optional[str]
    recorded_at: datetime
    audio_file_path: Optional[str]
    file_id: Optional[str]
    transcription: Optional[str]
    summary: Optional[str]
    tags: Optional[List[str]]
    emotions: Optional[Dict[str, Any]]
    transcribe_model: Optional[str]
    summary_model: Optional[str]
    transcription_status: str
    summary_status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DiaryEntryListResponse(BaseModel):
    entries: List[DiaryEntryResponse]
    total: int
    page: int
    size: int
    has_next: bool

class TranscribeResponse(BaseModel):
    task_id: str
    file_id: str
    status: str
    message: str

class TranscribeResultResponse(BaseModel):
    task_id: str
    status: str
    transcription: Optional[str] = None
    confidence: Optional[float] = None
    completed_at: Optional[datetime] = None

class SummarizeResponse(BaseModel):
    task_id: str
    text: str
    status: str
    message: str

class SummarizeResultResponse(BaseModel):
    task_id: str
    status: str
    summary: Optional[str] = None
    completed_at: Optional[datetime] = None

# 認証関連スキーマ
class UserCreate(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    email: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

class WebAuthnRegistrationStartRequest(BaseModel):
    username: str
    display_name: Optional[str] = None

class WebAuthnRegistrationStartResponse(BaseModel):
    challenge: str
    user_id: str
    rp_id: str
    rp_name: str
    options: Dict[str, Any]

class WebAuthnRegistrationCompleteRequest(BaseModel):
    credential_id: str
    attestation_object: str
    client_data_json: str
    user_id: str
    device_name: Optional[str] = None

class WebAuthnRegistrationCompleteResponse(BaseModel):
    success: bool
    user_id: UUID
    message: str

class WebAuthnAuthenticationStartRequest(BaseModel):
    username: Optional[str] = None

class WebAuthnAuthenticationStartResponse(BaseModel):
    challenge: str
    options: Dict[str, Any]

class WebAuthnAuthenticationCompleteRequest(BaseModel):
    credential_id: str
    authenticator_data: str
    client_data_json: str
    signature: str

class WebAuthnAuthenticationCompleteResponse(BaseModel):
    success: bool
    user: Optional[UserResponse] = None
    access_token: Optional[str] = None
    message: str

class CurrentUserResponse(BaseModel):
    user: UserResponse
    authenticated: bool