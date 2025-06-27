from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os

# データベースURL（環境変数から取得）
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://voicediaryuser:voicediarypass@voice-diary-db:5432/voicediary")

# 同期エンジン（Alembic等で使用）
engine = create_engine(DATABASE_URL)

# 非同期エンジン（非同期処理で使用）
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL)

# セッションメーカー作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 非同期セッションメーカー作成
async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False
)

# ベースクラス作成
Base = declarative_base()

# データベースセッション依存性（同期）
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# データベースセッション依存性（非同期）
async def get_async_db():
    async with async_session_factory() as session:
        yield session