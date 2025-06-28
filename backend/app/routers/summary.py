from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models import DiaryEntry
from ..schemas import SummarizeRequest, SummarizeResponse, SummarizeResultResponse
from ..services.summary import summary_service
from ..services.tag_suggestion import tag_suggestion_service

router = APIRouter(tags=["summary"])

# JST (UTC+9) タイムゾーン定義
JST = timezone(timedelta(hours=9))


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest, db: Session = Depends(get_db)):
    """要約処理を開始"""
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


@router.get("/summarize/{task_id}", response_model=SummarizeResultResponse)
async def get_summary_result(task_id: str, db: Session = Depends(get_db)):
    """要約結果を取得"""
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
    
    # 既に完了している場合は結果を返す
    if entry.summary_status == "completed":
        return {
            "task_id": task_id,
            "status": "completed",
            "summary": entry.summary,
            "completed_at": entry.updated_at.isoformat()
        }
    
    # 処理中の場合、実際に要約を実行
    if entry.summary_status == "processing":
        try:
            # 文字起こし結果が必要
            if not entry.transcription:
                entry.summary_status = "failed"
                db.commit()
                raise HTTPException(status_code=400, detail="文字起こし結果がありません。先に文字起こしを完了してください。")
            
            # AI サービスで要約実行
            result = await summary_service.summarize_text(entry.transcription)
            
            # 結果をDiaryEntryに保存
            entry.summary = result["summary"]
            entry.summary_status = "completed"
            entry.summary_model = result["model"]
            
            # タイトルが未設定の場合は自動生成
            if not entry.title:
                entry.title = result["title"]
            
            # 新規録音の場合のみタグ自動提案（タグが未設定かつ要約が初回完了）
            if not entry.tags and entry.transcription and entry.summary:
                try:
                    suggested_tags = await tag_suggestion_service.suggest_tags(
                        entry.transcription, entry.summary
                    )
                    if suggested_tags:
                        entry.tags = suggested_tags
                except Exception as e:
                    print(f"Tag suggestion failed: {str(e)}")
                    # タグ提案の失敗は処理を継続させる
            
            entry.updated_at = datetime.now(JST)
            
            db.commit()
            
            return {
                "task_id": task_id,
                "status": "completed",
                "summary": result["summary"],
                "completed_at": datetime.now(JST).isoformat()
            }
            
        except Exception as e:
            # エラーが発生した場合
            entry.summary_status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=f"要約処理でエラーが発生しました: {str(e)}")
    
    # その他のステータス（pending, failed）
    return {
        "task_id": task_id,
        "status": entry.summary_status,
        "summary": entry.summary,
        "completed_at": entry.updated_at.isoformat() if entry.updated_at else None
    }