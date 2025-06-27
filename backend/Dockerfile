FROM python:3.11-slim

WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# requirements.txtをコピー（キャッシュ効率化）
COPY requirements.txt .

# Python依存関係をインストール
RUN pip install --no-cache-dir -r requirements.txt

# アップロードディレクトリを作成
RUN mkdir -p /app/uploads

# ポート8000を開放
EXPOSE 8000

# 開発サーバーを起動（ホットリロード有効）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]