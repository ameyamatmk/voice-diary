from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from .models import Base
from .routers import audio, summary, diary, settings

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

# ルーター登録
app.include_router(audio.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(diary.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Voice Diary API is running"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Voice Diary API is running"}