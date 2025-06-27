import os
import asyncio
from typing import Dict, Any

import openai
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import async_session_factory
from ..models import UserSettings


class SummaryService:
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
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required for OpenAI summary")
            self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        # Claude API設定
        elif self.api_type == "claude":
            claude_api_key = os.getenv("CLAUDE_API_KEY")
            if not claude_api_key:
                raise ValueError("CLAUDE_API_KEY environment variable is required for Claude summary")
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
            # DB接続エラーの場合は環境変数を使用
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
    
    async def summarize_text(self, text: str) -> Dict[str, Any]:
        """
        テキストを要約する
        
        Args:
            text: 要約対象のテキスト
            
        Returns:
            Dict: {
                "summary": str,
                "title": str,
                "model": str,
                "tokens_used": int
            }
        """
        # 設定を最新に更新
        await self._update_config()
        
        if self.api_type == "mock":
            return await self._mock_summarize(text)
        elif self.api_type == "openai":
            return await self._openai_summarize(text)
        elif self.api_type == "claude":
            return await self._claude_summarize(text)
        else:
            raise ValueError(f"Unsupported summary API: {self.api_type}")
    
    async def _mock_summarize(self, text: str) -> Dict[str, Any]:
        """モック要約（開発用）"""
        await asyncio.sleep(4)  # 実際のAPI呼び出しをシミュレート
        
        summary = "今日は充実した一日でした。様々な活動を通じて多くの学びを得ることができ、個人的な成長を感じています。明日もこの調子で頑張りたいと思います。"
        title = summary[:20] + "..." if len(summary) > 20 else summary
        
        return {
            "summary": summary,
            "title": title,
            "model": "mock-gpt-4o-mini",
            "tokens_used": 150
        }
    
    async def _openai_summarize(self, text: str) -> Dict[str, Any]:
        """OpenAI GPT APIを使用した要約"""
        try:
            # システムプロンプト（日本語音声日記専用）
            system_prompt = """あなたは日本語の音声日記を要約する専門AIです。以下の指示に従って要約を作成してください：

1. 簡潔で読みやすい日本語で要約する
2. 感情や体験の本質を捉える
3. 3-5文程度でまとめる
4. 敬語は使わず、親しみやすい文体で
5. 重要な出来事や気づきを重視する"""

            user_prompt = f"以下の音声から文字起こしされたテキストを要約してください：\n\n{text}"
            
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            summary = response.choices[0].message.content.strip()
            
            # タイトル生成（要約の最初の部分から）
            title = summary[:20] + "..." if len(summary) > 20 else summary
            
            return {
                "summary": summary,
                "title": title,
                "model": self.model,
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }
            
        except Exception as e:
            raise Exception(f"OpenAI summary failed: {str(e)}")
    
    async def _claude_summarize(self, text: str) -> Dict[str, Any]:
        """Claude APIを使用した要約"""
        try:
            # Claude用プロンプト
            prompt = f"""あなたは日本語の音声日記を要約する専門AIです。以下の音声から文字起こしされたテキストを要約してください：

テキスト：
{text}

要件：
- 簡潔で読みやすい日本語で要約する
- 感情や体験の本質を捉える
- 3-5文程度でまとめる
- 敬語は使わず、親しみやすい文体で
- 重要な出来事や気づきを重視する

要約："""

            response = await self.claude_client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            summary = response.content[0].text.strip()
            
            # タイトル生成（要約の最初の部分から）
            title = summary[:20] + "..." if len(summary) > 20 else summary
            
            return {
                "summary": summary,
                "title": title,
                "model": self.model,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens if response.usage else 0
            }
            
        except Exception as e:
            raise Exception(f"Claude summary failed: {str(e)}")


# シングルトンインスタンス
summary_service = SummaryService()