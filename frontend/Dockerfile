FROM node:18-alpine

WORKDIR /app

# package.jsonをコピー（キャッシュ効率化）
COPY package.json ./

# 依存関係をインストール
RUN npm install

# ポート3000を開放
EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "dev"]