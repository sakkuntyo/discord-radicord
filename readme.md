# 英語音声で読み上げてくれるBot

[招待リンク](https://discord.com/api/oauth2/authorize?client_id=724967155803619398&permissions=3145856&scope=bot)

## 目的

- 話している時に気になった英語をさっと読み上げさせたい

## 動作環境

- ubuntu 18.04
  - nodejs 10.16.3
    - discord.js
  - Google cloud SDK (CLI)
    - 以下のgcloudコマンドでトークンが取得できる様にしておく必要があります。

```
$ gcloud auth application-default print-access-token
```

## 動き概要

1. Discordでボイスチャンネルに入っている人から!peroで始まるメッセージを受け取る
2. Google Cloud Text to Speech APIを呼び出し、音声データ(base64形式)を取得
3. 音声データをbase64デコードし、再生

## 使い方

### 読み上げる

```
!pero <読み上げさせたいメッセージ>
```

### ボイスチャンネルから退出

注意：これをしないと退出しません

```
!pero disc
```

## 起動方法

```
# nodejsのインストール
$ git clone https://github.com/creationix/nvm ~/.nvm
$ source ~/.nvm/nvm.sh
$ echo "source ~/.nvm/nvm.sh" >> ~/.bashrc
$ nvm install 10.16.3
$ nvm use 10.16.3

# このアプリの起動
$ git clone https://github.com/sakkuntyo/discord-pero
$ cd discord-pero
$ sed "s/<discordtoken>/ここにdiscordのトークンを入れる/g" -i settings.json
$ npm install
$ npm start

# デーモンにしたい場合、pm2を使う
$ npm install -g pm2
$ pm2 start index pero
## OSの起動と同時に起動
$ pm2 startup
## 現在のpm2 listの状態を保存
$ pm2 save
```

## [Discord Developer Portal](https://discordapp.com/developers/)でする事

### 1.アプリケーション作成

### 2.Bot設定ページのBUILD-A-BOTにある Add Bot ボタンを押下

今後このページからBot設定を行う

### 3.OAuth2設定ページから招待リンクを作成してBotをチャンネルに追加する

- 必要なスコープ
  - bot
- 必要な権限
  - View Audiot Log
  - Connect
  - Speak

### 4.tokenはBot設定ページの Click to Reveal Token をクリックして表示される物を使用する

