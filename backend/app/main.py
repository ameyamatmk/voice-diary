from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Voice Diary API", version="0.1.0")

# CORS設定（開発環境用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Voice Diary API is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Voice Diary API is running"}