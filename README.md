# Video Streaming App

ローカル動画ストレージをブラウザからサムネイル表示・再生できるシステムです。

## 機能

- 動画ファイルの自動検出とサムネイル生成
- ブラウザでの動画ストリーミング再生
- 動画ファイルのアップロード
- レスポンシブデザイン
- 動画ファイルの削除

## 技術スタック

### バックエンド
- Node.js + Express
- TypeScript
- FFmpeg (サムネイル生成)
- Multer (ファイルアップロード)

### フロントエンド
- Vanilla JavaScript
- HTML5 Video API
- CSS Grid/Flexbox

## セットアップ

### 前提条件
- Node.js (v16以上)
- FFmpeg がシステムにインストールされていること

### インストール

1. 依存関係のインストール
   ```bash
   npm install
   ```

2. プロジェクトのビルド
   ```bash
   npm run build
   ```

3. 動画フォルダの作成
   ```bash
   mkdir -p storage/videos
   mkdir -p storage/thumbnails
   ```

4. 既存の動画ファイルを `storage/videos` に配置（任意）

### 起動

#### 開発モード
```bash
npm run dev
```

#### 本番モード
```bash
npm run build
npm run serve
```

アプリケーションは http://localhost:3000 で起動します。

## 使用方法

1. ブラウザで http://localhost:3000 にアクセス
2. 既存の動画があれば自動的にサムネイル付きで表示されます
3. 新しい動画をアップロードするには「Upload Videos」ボタンを使用
4. サムネイルをクリックして動画を再生
5. 不要な動画は「Delete」ボタンで削除可能

## 対応動画形式

- MP4
- AVI
- MKV
- MOV
- WMV
- FLV
- WebM

## API エンドポイント

### 動画関連
- `GET /api/videos` - 全動画の一覧取得
- `GET /api/videos/:id` - 特定動画の情報取得
- `GET /api/videos/:id/stream` - 動画ストリーミング
- `DELETE /api/videos/:id` - 動画削除
- `POST /api/videos/upload` - 動画アップロード

### サムネイル関連
- `GET /api/thumbnails/:filename` - サムネイル画像取得

## ディレクトリ構造

```
video-streaming-app/
├── src/
│   ├── server/
│   │   ├── app.ts
│   │   ├── routes/
│   │   └── controllers/
│   ├── services/
│   └── types/
├── client/
│   ├── index.html
│   ├── css/
│   └── js/
├── storage/
│   ├── videos/
│   └── thumbnails/
└── dist/
```

## 開発

### テスト実行
```bash
npm test
```

### ウォッチモード
```bash
npm run dev
```

## システムサービスとして登録

### macOS (launchd)

1. plistファイルを作成
```bash
sudo nano /Library/LaunchDaemons/com.video-streaming-app.plist
```

2. 以下の内容を追加
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.video-streaming-app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/tok/video-streaming-app/dist/server/app.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/tok/video-streaming-app</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/video-streaming-app.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/video-streaming-app.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3000</string>
    </dict>
</dict>
</plist>
```

3. サービスの登録と開始
```bash
sudo launchctl load /Library/LaunchDaemons/com.video-streaming-app.plist
sudo launchctl start com.video-streaming-app
```

4. サービスの確認
```bash
sudo launchctl list | grep video-streaming-app
```

5. サービスの停止
```bash
sudo launchctl stop com.video-streaming-app
sudo launchctl unload /Library/LaunchDaemons/com.video-streaming-app.plist
```

### Linux (systemd)

1. サービスファイルを作成
```bash
sudo nano /etc/systemd/system/video-streaming-app.service
```

2. 以下の内容を追加
```ini
[Unit]
Description=Video Streaming App
After=network.target

[Service]
Type=simple
User=tok
WorkingDirectory=/home/tok/video-streaming-app
ExecStart=/usr/bin/node dist/server/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

3. サービスの有効化と開始
```bash
sudo systemctl daemon-reload
sudo systemctl enable video-streaming-app.service
sudo systemctl start video-streaming-app.service
```

4. サービスの状態確認
```bash
sudo systemctl status video-streaming-app.service
```

5. ログの確認
```bash
sudo journalctl -u video-streaming-app.service -f
```

### PM2を使用した管理（推奨）

1. PM2のインストール
```bash
npm install -g pm2
```

2. PM2設定ファイルの作成
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'video-streaming-app',
    script: 'dist/server/app.js',
    cwd: '/Users/tok/video-streaming-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: 'logs/app.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

3. PM2でアプリケーションを起動
```bash
# ログディレクトリの作成
mkdir -p logs

# アプリケーションの起動
pm2 start ecosystem.config.js

# システム起動時の自動起動設定
pm2 startup
pm2 save
```

4. PM2管理コマンド
```bash
# 状態確認
pm2 status

# ログ確認
pm2 logs video-streaming-app

# 再起動
pm2 restart video-streaming-app

# 停止
pm2 stop video-streaming-app

# 削除
pm2 delete video-streaming-app
```

## 環境変数設定

本番環境用の`.env`ファイルを作成：

```bash
# .env
NODE_ENV=production
PORT=3000
VIDEO_STORAGE_PATH=/Users/tok/video-streaming-app/storage/videos
THUMBNAIL_STORAGE_PATH=/Users/tok/video-streaming-app/storage/thumbnails
MAX_FILE_SIZE=500MB
```

## セキュリティ設定

### Nginx リバースプロキシ設定（推奨）

1. Nginxの設定ファイル
```nginx
# /etc/nginx/sites-available/video-streaming-app
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /storage/ {
        alias /Users/tok/video-streaming-app/storage/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

2. 設定の有効化
```bash
sudo ln -s /etc/nginx/sites-available/video-streaming-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 監視とメンテナンス

### ログローテーション設定

```bash
# /etc/logrotate.d/video-streaming-app
/var/log/video-streaming-app*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 tok tok
    postrotate
        sudo launchctl stop com.video-streaming-app
        sudo launchctl start com.video-streaming-app
    endscript
}
```

### バックアップスクリプト

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/video-streaming-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 動画ファイルのバックアップ
rsync -av /Users/tok/video-streaming-app/storage/ $BACKUP_DIR/storage_$DATE/

# 古いバックアップの削除（30日以上前）
find $BACKUP_DIR -type d -name "storage_*" -mtime +30 -exec rm -rf {} \;
```

## 注意事項

- 大きな動画ファイルのアップロードには時間がかかる場合があります
- サムネイル生成にはFFmpegが必要です
- 本番環境では適切なセキュリティ設定を行ってください
- 定期的なディスク容量の監視を推奨します
- セキュリティアップデートの適用を定期的に行ってください

## トラブルシューティング

### よくある問題

1. **FFmpegが見つからない**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install epel-release
sudo yum install ffmpeg
```

2. **ポートが使用中**
```bash
# ポートを使用しているプロセスを確認
lsof -ti:3000

# プロセスを終了
kill -9 $(lsof -ti:3000)
```

3. **権限エラー**
```bash
# ストレージディレクトリの権限を修正
sudo chown -R tok:tok storage/
chmod -R 755 storage/
```

## ライセンス

MIT License