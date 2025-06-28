from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text
from datetime import datetime, timezone, timedelta
from pathlib import Path
import json

from ..database import get_db
from ..models import DiaryEntry
from ..schemas import (
    DiaryEntryCreate, DiaryEntryUpdate, DiaryEntryResponse, 
    DiaryEntryListResponse
)

router = APIRouter(tags=["diary"])

# JST (UTC+9) タイムゾーン定義
JST = timezone(timedelta(hours=9))


@router.post("/diary/", response_model=DiaryEntryResponse)
async def create_diary_entry(entry: DiaryEntryCreate, db: Session = Depends(get_db)):
    """新しい日記エントリを作成"""
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


@router.get("/diary/", response_model=DiaryEntryListResponse)
async def get_diary_entries(page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    """ページネーション付きで日記エントリを取得"""
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


@router.get("/diary/{entry_id}", response_model=DiaryEntryResponse)
async def get_diary_entry(entry_id: str, db: Session = Depends(get_db)):
    """個別の日記エントリを取得"""
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="日記エントリが見つかりません")
    
    return entry


@router.put("/diary/{entry_id}", response_model=DiaryEntryResponse)
async def update_diary_entry(entry_id: str, entry_update: DiaryEntryUpdate, db: Session = Depends(get_db)):
    """日記エントリを更新"""
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


@router.delete("/diary/{entry_id}")
async def delete_diary_entry(entry_id: str, db: Session = Depends(get_db)):
    """日記エントリを削除"""
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="日記エントリが見つかりません")
    
    # 関連する音声ファイルも削除
    if entry.audio_file_path and Path(entry.audio_file_path).exists():
        Path(entry.audio_file_path).unlink()
    
    db.delete(entry)
    db.commit()
    
    return {"message": "日記エントリが削除されました"}


@router.get("/diary/by-tag/{tag_name}")
async def get_diary_entries_by_tag(tag_name: str, page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    """指定されたタグを含む日記エントリを取得"""
    offset = (page - 1) * size
    
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


@router.get("/search")
async def search_diary_entries(q: str, page: int = 1, size: int = 10, db: Session = Depends(get_db)):
    """日記エントリの全文検索"""
    # 日記本文での全文検索
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="検索クエリが空です")
    
    search_query = q.strip()
    offset = (page - 1) * size
    
    # タイトル、文字起こし、要約から検索（LIKE演算子を使用してシンプルに実装）
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


@router.get("/tags")
async def get_tags(db: Session = Depends(get_db)):
    """全日記エントリからタグを収集"""
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