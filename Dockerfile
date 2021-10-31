#事前準備
# settings.jsonにトークンを埋め込みましょう

FROM node:14

# アプリケーションディレクトリを作成する
WORKDIR /usr/src/app

# アプリケーションの依存関係をインストールする
# ワイルドカードを使用して、package.json と package-lock.json の両方が確実にコピーされるようにします。
# 可能であれば (npm@5+)
COPY package*.json ./

RUN npm install
# 本番用にコードを作成している場合
# RUN npm install --only=production

# アプリケーションのソースをバンドルする
COPY . .

RUN chmod 744 ./startup.sh
RUN npm install -g pm2

CMD [ "pm2", "--no-daemon", "start", "index.js" ]

