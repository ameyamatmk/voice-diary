from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

from .database import engine, get_db
from .models import Base, DiaryEntry
from .schemas import (
    TranscribeRequest, SummarizeRequest, DiaryEntryCreate, DiaryEntryUpdate,
    DiaryEntryResponse, DiaryEntryListResponse, TranscribeResponse, 
    TranscribeResultResponse, SummarizeResponse, SummarizeResultResponse
)

app = FastAPI(title="Voice Diary API", version="0.1.0")

# JST (UTC+9) タイムゾーン定義
JST = timezone(timedelta(hours=9))

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
    timestamp = datetime.now(JST).strftime("%Y%m%d_%H%M%S")
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
        "upload_time": datetime.now(JST).isoformat(),
        "message": "音声ファイルのアップロードが完了しました"
    }

@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest, db: Session = Depends(get_db)):
    # file_idに対応するDiaryEntryを見つける
    entry = db.query(DiaryEntry).filter(DiaryEntry.file_id == request.file_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="対応する日記エントリが見つかりません")
    
    # タスクIDを生成してDiaryEntryに保存
    task_id = str(uuid.uuid4())
    entry.transcription_task_id = task_id
    entry.transcription_status = "processing"
    
    db.commit()
    
    return {
        "task_id": task_id,
        "file_id": request.file_id,
        "status": "processing",
        "message": "文字起こし処理を開始しました"
    }

@app.get("/api/transcribe/{task_id}", response_model=TranscribeResultResponse)
async def get_transcription_result(task_id: str, db: Session = Depends(get_db)):
    # task_idに対応するDiaryEntryを見つける
    entry = db.query(DiaryEntry).filter(DiaryEntry.transcription_task_id == task_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="対応するタスクが見つかりません")
    
    # モック文字起こし結果を生成してDiaryEntryに保存
    mock_transcription = "これはモック文字起こし結果です。実際の音声から生成された文字起こしテキストがここに表示されます。本日は充実した一日でした。朝から晩まで様々な活動に取り組み、多くのことを学ぶことができました。"
    
    entry.transcription = mock_transcription
    entry.transcription_status = "completed"
    entry.transcribe_model = "mock-whisper-v1"
    entry.updated_at = datetime.now(JST)
    
    db.commit()
    
    return {
        "task_id": task_id,
        "status": "completed",
        "transcription": mock_transcription,
        "confidence": 0.95,
        "completed_at": datetime.now(JST).isoformat()
    }

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest, db: Session = Depends(get_db)):
    # entry_idが指定されている場合、対応するDiaryEntryを見つける
    entry = None
    if request.entry_id:
        entry = db.query(DiaryEntry).filter(DiaryEntry.id == request.entry_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="対応する日記エントリが見つかりません")
    
    # タスクIDを生成
    task_id = str(uuid.uuid4())
    
    # DiaryEntryがある場合はタスクIDを保存
    if entry:
        entry.summary_task_id = task_id
        entry.summary_status = "processing"
        db.commit()
    
    return {
        "task_id": task_id,
        "text": request.text,
        "status": "processing",
        "message": "要約処理を開始しました"
    }

@app.get("/api/summarize/{task_id}", response_model=SummarizeResultResponse)
async def get_summary_result(task_id: str, db: Session = Depends(get_db)):
    # task_idに対応するDiaryEntryを見つける
    entry = db.query(DiaryEntry).filter(DiaryEntry.summary_task_id == task_id).first()
    if not entry:
        # DiaryEntryが見つからない場合でも、モック結果を返す（スタンドアロン要約の場合）
        return {
            "task_id": task_id,
            "status": "completed",
            "summary": "本日の主な出来事や感想を簡潔にまとめた要約文がここに表示されます。",
            "completed_at": datetime.now(JST).isoformat()
        }
    
    # モック要約結果を生成してDiaryEntryに保存
    mock_summary = "今日は充実した一日でした。様々な活動を通じて多くの学びを得ることができ、個人的な成長を感じています。明日もこの調子で頑張りたいと思います。"
    
    # タイトルも自動生成（要約の最初の部分から）
    auto_title = mock_summary[:20] + "..." if len(mock_summary) > 20 else mock_summary
    
    entry.summary = mock_summary
    entry.summary_status = "completed"
    entry.summary_model = "mock-gpt-4o-mini"
    
    # タイトルが未設定の場合は自動生成
    if not entry.title:
        entry.title = auto_title
    
    entry.updated_at = datetime.now(JST)
    
    db.commit()
    
    return {
        "task_id": task_id,
        "status": "completed",
        "summary": mock_summary,
        "completed_at": datetime.now(JST).isoformat()
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

@app.get("/api/search")
async def search_diary_entries(q: str, page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    # 日記本文での全文検索
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="検索クエリが空です")
    
    search_query = q.strip()
    offset = (page - 1) * size
    
    # タイトル、文字起こし、要約から検索（LIKE演算子を使用してシンプルに実装）
    from sqlalchemy import or_, and_
    
    search_filter = or_(
        DiaryEntry.title.ilike(f"%{search_query}%"),
        DiaryEntry.transcription.ilike(f"%{search_query}%"),
        DiaryEntry.summary.ilike(f"%{search_query}%")
    )
    
    # 完了したエントリのみ検索対象にする
    completion_filter = and_(
        DiaryEntry.transcription_status == "completed",
        DiaryEntry.summary_status == "completed"
    )
    
    entries = db.query(DiaryEntry).filter(
        and_(search_filter, completion_filter)
    ).order_by(DiaryEntry.recorded_at.desc()).offset(offset).limit(size).all()
    
    total = db.query(DiaryEntry).filter(
        and_(search_filter, completion_filter)
    ).count()
    
    has_next = offset + size < total
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "size": size,
        "has_next": has_next,
        "query": search_query
    }

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
    
    entry.updated_at = datetime.now(JST)
    
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

@app.get("/api/tags")
async def get_tags(db: Session = Depends(get_db)):
    # 全日記エントリからタグを収集
    entries = db.query(DiaryEntry).filter(DiaryEntry.tags.isnot(None)).all()
    
    tag_counts = {}
    for entry in entries:
        if entry.tags:
            for tag in entry.tags:
                if tag.strip():  # 空文字除外
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # 使用回数降順でソート
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "tags": [{"name": tag, "count": count} for tag, count in sorted_tags]
    }

@app.get("/api/diary/by-tag/{tag_name}")
async def get_diary_entries_by_tag(tag_name: str, page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    # 指定されたタグを含む日記エントリを取得
    offset = (page - 1) * size
    
    # JSONB検索クエリを使用
    from sqlalchemy import text
    import json
    
    # JSONエンコードでエスケープを確実に行う
    tag_array_json = json.dumps([tag_name])
    
    entries = db.query(DiaryEntry).filter(
        text("tags @> :tag_array")
    ).params(
        tag_array=tag_array_json
    ).order_by(DiaryEntry.recorded_at.desc()).offset(offset).limit(size).all()
    
    total = db.query(DiaryEntry).filter(
        text("tags @> :tag_array")
    ).params(
        tag_array=tag_array_json
    ).count()
    
    has_next = offset + size < total
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "size": size,
        "has_next": has_next,
        "tag_name": tag_name
    }