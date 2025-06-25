from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .database import engine, get_db
from .models import Base, DiaryEntry
from .schemas import (
    TranscribeRequest, SummarizeRequest, DiaryEntryCreate, DiaryEntryUpdate,
    DiaryEntryResponse, DiaryEntryListResponse, TranscribeResponse, 
    TranscribeResultResponse, SummarizeResponse, SummarizeResultResponse
)

app = FastAPI(title="Voice Diary API", version="0.1.0")

# データベーステーブル作成
Base.metadata.create_all(bind=engine)

# CORS設定（開発環境用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アップロードディレクトリ設定
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Voice Diary API is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Voice Diary API is running"}

@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # ファイル形式チェック
    if not file.content_type or not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="音声ファイルのみアップロード可能です")
    
    # ファイルサイズチェック（50MB制限）
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズが50MBを超えています")
    
    # ユニークなファイル名生成
    file_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = ".webm"  # WebRTCからの録音はwebm形式
    filename = f"{timestamp}_{file_id}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # ファイル保存
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ファイル保存エラー: {str(e)}")
    
    # 日記エントリを自動作成
    db_entry = DiaryEntry(
        file_id=file_id,
        audio_file_path=str(file_path),
        transcription_status="pending",
        summary_status="pending"
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return {
        "file_id": file_id,
        "entry_id": str(db_entry.id),
        "filename": filename,
        "file_path": str(file_path),
        "file_size": len(file_content),
        "upload_time": datetime.now().isoformat(),
        "message": "音声ファイルのアップロードが完了しました"
    }

@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    # モック文字起こし機能（TODO: 実際のWhisper APIに置き換え）
    return {
        "task_id": str(uuid.uuid4()),
        "file_id": request.file_id,
        "status": "processing",
        "message": "文字起こし処理を開始しました"
    }

@app.get("/api/transcribe/{task_id}", response_model=TranscribeResultResponse)
async def get_transcription_result(task_id: str):
    # モック文字起こし結果（TODO: 実際の処理結果に置き換え）
    return {
        "task_id": task_id,
        "status": "completed",
        "transcription": "これはモック文字起こし結果です。実際の音声から生成された文字起こしテキストがここに表示されます。",
        "confidence": 0.95,
        "completed_at": datetime.now().isoformat()
    }

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    # モック要約機能（TODO: 実際のLLM APIに置き換え）
    return {
        "task_id": str(uuid.uuid4()),
        "text": request.text,
        "status": "processing",
        "message": "要約処理を開始しました"
    }

@app.get("/api/summarize/{task_id}", response_model=SummarizeResultResponse)
async def get_summary_result(task_id: str):
    # モック要約結果（TODO: 実際の処理結果に置き換え）
    return {
        "task_id": task_id,
        "status": "completed",
        "summary": "本日の主な出来事や感想を簡潔にまとめた要約文がここに表示されます。",
        "completed_at": datetime.now().isoformat()
    }

# 日記エントリCRUD API
@app.post("/api/diary/", response_model=DiaryEntryResponse)
async def create_diary_entry(entry: DiaryEntryCreate, db: Session = Depends(get_db)):
    # 新しい日記エントリを作成
    db_entry = DiaryEntry(
        title=entry.title,
        file_id=entry.file_id,
        tags=entry.tags,
        transcription_status="pending",
        summary_status="pending"
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@app.get("/api/diary/", response_model=DiaryEntryListResponse)
async def get_diary_entries(page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    # ページネーション付きで日記エントリを取得
    offset = (page - 1) * size
    
    entries = db.query(DiaryEntry).order_by(DiaryEntry.recorded_at.desc()).offset(offset).limit(size).all()
    total = db.query(DiaryEntry).count()
    
    has_next = offset + size < total
    
    return DiaryEntryListResponse(
        entries=entries,
        total=total,
        page=page,
        size=size,
        has_next=has_next
    )

@app.get("/api/diary/{entry_id}", response_model=DiaryEntryResponse)
async def get_diary_entry(entry_id: str, db: Session = Depends(get_db)):
    # 個別の日記エントリを取得
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="日記エントリが見つかりません")
    
    return entry

@app.put("/api/diary/{entry_id}", response_model=DiaryEntryResponse)
async def update_diary_entry(entry_id: str, entry_update: DiaryEntryUpdate, db: Session = Depends(get_db)):
    # 日記エントリを更新
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="日記エントリが見つかりません")
    
    # 更新可能なフィールドを更新
    if entry_update.title is not None:
        entry.title = entry_update.title
    if entry_update.transcription is not None:
        entry.transcription = entry_update.transcription
        entry.transcription_status = "completed"
    if entry_update.summary is not None:
        entry.summary = entry_update.summary
        entry.summary_status = "completed"
    if entry_update.tags is not None:
        entry.tags = entry_update.tags
    
    entry.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(entry)
    
    return entry

@app.delete("/api/diary/{entry_id}")
async def delete_diary_entry(entry_id: str, db: Session = Depends(get_db)):
    # 日記エントリを削除
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="日記エントリが見つかりません")
    
    # 関連する音声ファイルも削除
    if entry.audio_file_path and Path(entry.audio_file_path).exists():
        Path(entry.audio_file_path).unlink()
    
    db.delete(entry)
    db.commit()
    
    return {"message": "日記エントリが削除されました"}