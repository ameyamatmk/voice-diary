from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Voice Diary API", version="0.1.0")

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
async def upload_audio(file: UploadFile = File(...)):
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
    
    return {
        "file_id": file_id,
        "filename": filename,
        "file_path": str(file_path),
        "file_size": len(file_content),
        "upload_time": datetime.now().isoformat(),
        "message": "音声ファイルのアップロードが完了しました"
    }

class TranscribeRequest(BaseModel):
    file_id: str

@app.post("/api/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    # モック文字起こし機能（TODO: 実際のWhisper APIに置き換え）
    return {
        "task_id": str(uuid.uuid4()),
        "file_id": request.file_id,
        "status": "processing",
        "message": "文字起こし処理を開始しました"
    }

@app.get("/api/transcribe/{task_id}")
async def get_transcription_result(task_id: str):
    # モック文字起こし結果（TODO: 実際の処理結果に置き換え）
    return {
        "task_id": task_id,
        "status": "completed",
        "transcription": "これはモック文字起こし結果です。実際の音声から生成された文字起こしテキストがここに表示されます。",
        "confidence": 0.95,
        "completed_at": datetime.now().isoformat()
    }

class SummarizeRequest(BaseModel):
    text: str

@app.post("/api/summarize")
async def summarize_text(request: SummarizeRequest):
    # モック要約機能（TODO: 実際のLLM APIに置き換え）
    return {
        "task_id": str(uuid.uuid4()),
        "text": request.text,
        "status": "processing",
        "message": "要約処理を開始しました"
    }

@app.get("/api/summarize/{task_id}")
async def get_summary_result(task_id: str):
    # モック要約結果（TODO: 実際の処理結果に置き換え）
    return {
        "task_id": task_id,
        "status": "completed",
        "summary": "本日の主な出来事や感想を簡潔にまとめた要約文がここに表示されます。",
        "completed_at": datetime.now().isoformat()
    }