import os
import asyncio
from typing import List, Dict, Any
import json

import openai
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import async_session_factory
from ..models import UserSettings, DiaryEntry


class TagSuggestionService:
    def __init__(self):
        # 初期設定（環境変数から）
        self.api_type = os.getenv("SUMMARY_API", "mock")
        self.model = os.getenv("SUMMARY_MODEL", "gpt-4o-mini")
        self.openai_client = None
        self.claude_client = None
        self._setup_clients()
    
    def _setup_clients(self):
        """APIクライアントをセットアップ"""
        # OpenAI API設定
        if self.api_type == "openai":
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if openai_api_key:
                self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        # Claude API設定
        elif self.api_type == "claude":
            claude_api_key = os.getenv("CLAUDE_API_KEY")
            if claude_api_key:
                self.claude_client = anthropic.AsyncAnthropic(api_key=claude_api_key)
    
    async def _get_settings_from_db(self) -> Dict[str, Any]:
        """データベースから設定を取得"""
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(UserSettings))
                settings_rows = result.fetchall()
                
                settings = {}
                for row in settings_rows:
                    setting = row[0]
                    settings[setting.key] = setting.value
                
                return settings
        except Exception:
            return {}
    
    async def _update_config(self):
        """設定を更新"""
        db_settings = await self._get_settings_from_db()
        
        # データベース設定が存在する場合は優先
        if "summary_api" in db_settings:
            self.api_type = db_settings["summary_api"]
        if "summary_model" in db_settings:
            self.model = db_settings["summary_model"]
        
        # クライアントを再セットアップ
        self._setup_clients()
    
    async def get_existing_tags(self) -> List[str]:
        """既存のタグを取得"""
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(DiaryEntry))
                entries = result.fetchall()
                
                tag_counts = {}
                for row in entries:
                    entry = row[0]
                    if entry.tags:
                        for tag in entry.tags:
                            if tag.strip():
                                tag_counts[tag] = tag_counts.get(tag, 0) + 1
                
                # 使用回数降順でソートしてタグ名のみ返す
                sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
                return [tag for tag, count in sorted_tags]
        except Exception:
            return []
    
    async def suggest_tags(self, transcription: str, summary: str) -> List[str]:
        """
        文字起こしと要約からタグを提案する
        
        Args:
            transcription: 文字起こし内容
            summary: 要約内容
            
        Returns:
            List[str]: 提案されたタグのリスト（最大3つ）
        """
        # 設定を最新に更新
        await self._update_config()
        
        # 既存タグを取得
        existing_tags = await self.get_existing_tags()
        
        if self.api_type == "mock":
            return await self._mock_suggest_tags(existing_tags)
        elif self.api_type == "openai" and self.openai_client:
            return await self._openai_suggest_tags(transcription, summary, existing_tags)
        elif self.api_type == "claude" and self.claude_client:
            return await self._claude_suggest_tags(transcription, summary, existing_tags)
        else:
            # APIが利用できない場合は空のリストを返す
            return []
    
    async def _mock_suggest_tags(self, existing_tags: List[str]) -> List[str]:
        """モックタグ提案（開発用）"""
        await asyncio.sleep(1)  # 実際のAPI呼び出しをシミュレート
        
        # 既存タグから適当に選択、または新しいタグを提案
        if len(existing_tags) >= 2:
            return existing_tags[:2] + ["日常"]
        elif len(existing_tags) == 1:
            return existing_tags[:1] + ["日常", "振り返り"]
        else:
            return ["日常", "振り返り", "体験"]
    
    async def _openai_suggest_tags(self, transcription: str, summary: str, existing_tags: List[str]) -> List[str]:
        """OpenAI GPT APIを使用したタグ提案"""
        try:
            # 既存タグを文字列化
            existing_tags_str = ", ".join(existing_tags[:20]) if existing_tags else "なし"
            
            system_prompt = """あなたは日本語の音声日記にタグを付けるAIアシスタントです。

以下のルールに従ってタグを提案してください：
1. 最大3つのタグを提案する
2. 既存タグの中で適切なものがあれば優先的に選択する
3. 既存タグで十分でない場合のみ、新しいタグを提案する
4. タグは簡潔で分かりやすい日本語（1-4文字程度）
5. 感情、活動、場所、人間関係などのカテゴリから選択
6. 出力はJSONフォーマット: {"tags": ["タグ1", "タグ2", "タグ3"]}

既存タグ: """ + existing_tags_str

            user_prompt = f"""以下の日記内容からタグを提案してください：

文字起こし：
{transcription}

要約：
{summary}

適切なタグを最大3つ提案してください。"""
            
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            content = response.choices[0].message.content.strip()
            
            # JSONをパース
            try:
                result = json.loads(content)
                tags = result.get("tags", [])
                return tags[:3]  # 最大3つまで
            except json.JSONDecodeError:
                # JSONパースに失敗した場合は文字列から抽出
                return self._extract_tags_from_text(content)
            
        except Exception as e:
            print(f"OpenAI tag suggestion failed: {str(e)}")
            return []
    
    async def _claude_suggest_tags(self, transcription: str, summary: str, existing_tags: List[str]) -> List[str]:
        """Claude APIを使用したタグ提案"""
        try:
            # 既存タグを文字列化
            existing_tags_str = ", ".join(existing_tags[:20]) if existing_tags else "なし"
            
            prompt = f"""あなたは日本語の音声日記にタグを付けるAIアシスタントです。

以下の日記内容からタグを提案してください：

文字起こし：
{transcription}

要約：
{summary}

既存タグ: {existing_tags_str}

ルール：
1. 最大3つのタグを提案する
2. 既存タグの中で適切なものがあれば優先的に選択する
3. 既存タグで十分でない場合のみ、新しいタグを提案する
4. タグは簡潔で分かりやすい日本語（1-4文字程度）
5. 感情、活動、場所、人間関係などのカテゴリから選択

出力形式：
{{"tags": ["タグ1", "タグ2", "タグ3"]}}"""

            response = await self.claude_client.messages.create(
                model=self.model,
                max_tokens=150,
                temperature=0.3,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            content = response.content[0].text.strip()
            
            # JSONをパース
            try:
                result = json.loads(content)
                tags = result.get("tags", [])
                return tags[:3]  # 最大3つまで
            except json.JSONDecodeError:
                # JSONパースに失敗した場合は文字列から抽出
                return self._extract_tags_from_text(content)
            
        except Exception as e:
            print(f"Claude tag suggestion failed: {str(e)}")
            return []
    
    def _extract_tags_from_text(self, text: str) -> List[str]:
        """テキストからタグを抽出（JSONパース失敗時のフォールバック）"""
        # 簡単なパターンマッチングでタグを抽出
        import re
        
        # "タグ1", "タグ2", "タグ3" のパターンを探す
        patterns = [
            r'"([^"]+)"',  # ダブルクォート内
            r'「([^」]+)」',  # 日本語括弧内
            r'・([^\s・]+)',  # 中点区切り
        ]
        
        tags = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match) <= 10 and match not in tags:  # 重複除去と長さ制限
                    tags.append(match)
                if len(tags) >= 3:
                    break
            if len(tags) >= 3:
                break
        
        return tags[:3]


# シングルトンインスタンス
tag_suggestion_service = TagSuggestionService()