from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# データベースURL（環境変数から取得）
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://voicediaryuser:voicediarypass@voice-diary-db-dev:5432/voicediary")

# SQLAlchemyエンジン作成
engine = create_engine(DATABASE_URL)

# セッションメーカー作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ベースクラス作成
Base = declarative_base()

# データベースセッション依存性
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()