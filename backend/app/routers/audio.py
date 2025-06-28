from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

from ..database import get_db
from ..models import DiaryEntry
from ..schemas import TranscribeRequest, TranscribeResponse, TranscribeResultResponse
from ..services.transcription import transcription_service

router = APIRouter(tags=["audio"])

# JST (UTC+9) タイムゾーン定義
JST = timezone(timedelta(hours=9))

# アップロードディレクトリ設定
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/audio/upload")
async def upload_audio(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """音声ファイルをアップロードし、日記エントリを自動作成"""
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


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest, db: Session = Depends(get_db)):
    """文字起こし処理を開始"""
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


@router.get("/transcribe/{task_id}", response_model=TranscribeResultResponse)
async def get_transcription_result(task_id: str, db: Session = Depends(get_db)):
    """文字起こし結果を取得"""
    # task_idに対応するDiaryEntryを見つける
    entry = db.query(DiaryEntry).filter(DiaryEntry.transcription_task_id == task_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="対応するタスクが見つかりません")
    
    # 既に完了している場合は結果を返す
    if entry.transcription_status == "completed":
        return {
            "task_id": task_id,
            "status": "completed",
            "transcription": entry.transcription,
            "confidence": 0.95,  # 実際の信頼度は別途保存が必要
            "completed_at": entry.updated_at.isoformat()
        }
    
    # 処理中の場合、実際に文字起こしを実行
    if entry.transcription_status == "processing":
        try:
            # 音声ファイルの存在確認
            if not entry.audio_file_path or not Path(entry.audio_file_path).exists():
                entry.transcription_status = "failed"
                db.commit()
                raise HTTPException(status_code=404, detail="音声ファイルが見つかりません")
            
            # AI サービスで文字起こし実行
            result = await transcription_service.transcribe_audio(entry.audio_file_path)
            
            # 結果をDiaryEntryに保存
            entry.transcription = result["transcription"]
            entry.transcription_status = "completed"
            entry.transcribe_model = result["model"]
            entry.updated_at = datetime.now(JST)
            
            db.commit()
            
            return {
                "task_id": task_id,
                "status": "completed",
                "transcription": result["transcription"],
                "confidence": result["confidence"],
                "completed_at": datetime.now(JST).isoformat()
            }
            
        except Exception as e:
            # エラーが発生した場合
            entry.transcription_status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=f"文字起こし処理でエラーが発生しました: {str(e)}")
    
    # その他のステータス（pending, failed）
    return {
        "task_id": task_id,
        "status": entry.transcription_status,
        "transcription": entry.transcription,
        "confidence": 0.0,
        "completed_at": entry.updated_at.isoformat() if entry.updated_at else None
    }