# Video Streaming App

ローカル動画フォルダをブラウザから閲覧・再生できるモダンな動画ビューアーアプリケーションです。

## ✨ 主な機能

### 🎬 **動画管理・再生**
- **動画ファイルの自動検出とサムネイル生成** - FFmpegによる高品質サムネイル
- **ブラウザでの動画ストリーミング再生** - HTML5ビデオによる軽快な再生
- **モーダルプレイヤー** - フルスクリーン対応のポップアップ再生

### 📁 **フォルダ管理**
- **フォルダ選択機能** - ブラウザダイアログでフォルダを選択
- **登録フォルダ機能** - よく使うフォルダを登録・管理
- **クロスプラットフォーム対応** - Windows/macOS/Linux対応
- **サーバー参照フォルダ切り替え** - 登録済みフォルダからワンクリック切り替え

### ⌨️ **キーボードショートカット**
#### **グリッドナビゲーション**
- `←` `→` `↑` `↓` - サムネイル間の移動
- `Enter` - 選択中の動画を再生

#### **ビデオプレイヤー操作**
- `Space` / `K` - 再生・一時停止
- `←` `→` - 5秒スキップ（戻る・進む）
- `J` `L` - 10秒スキップ（戻る・進む）
- `M` - ミュート・ミュート解除
- `Escape` - プレイヤーを閉じる

### 🎨 **UI・UX**
- **ダークテーマ** - 目に優しいモダンデザイン
- **レスポンシブデザイン** - モバイル・タブレット対応
- **サムネイル表示数切り替え** - 24/48/96個表示
- **キーボードナビゲーション** - 完全キーボード操作対応
- **視覚的フィードバック** - 選択状態・操作状態の明確な表示

### � **ファイル管理**
- **動画ファイルアップロード** - ドラッグ&ドロップ対応
- **動画削除機能** - ファイル・サムネイルの完全削除
- **リアルタイムプレビュー** - アップロード即座にサムネイル表示

## 技術スタック

### バックエンド
- **Node.js + Express** - サーバーフレームワーク
- **TypeScript** - 型安全な開発
- **FFmpeg** - サムネイル生成とメディア処理
- **Multer** - ファイルアップロード処理
- **fluent-ffmpeg** - FFmpeg操作ライブラリ

### フロントエンド
- **Vanilla JavaScript** - モダンJS（ES6+）
- **HTML5 Video API** - ビデオストリーミング
- **CSS Grid/Flexbox** - レスポンシブレイアウト
- **CSS Variables** - ダイナミックテーマ

### 開発・ビルド
- **TypeScript Compiler** - サーバーサイドビルド
- **カスタムビルドスクリプト** - クライアントファイル管理

## セットアップ

### 前提条件
- Node.js (v16以上)
- FFmpeg がシステムにインストールされていること

### インストール

1. リポジトリのクローン
   ```bash
   git clone <repository-url>
   cd video-streaming-app
   ```

2. 依存関係のインストール
   ```bash
   npm install
   ```

3. プロジェクトのビルド
   ```bash
   npm run build
   ```

### 起動

#### 開発モード
```bash
npm run dev
```

#### 本番モード
```bash
npm run build
npm start
```

アプリケーションは http://localhost:3000 で起動します。

## 📖 使用方法

### 🚀 基本操作

1. **ブラウザアクセス**: http://localhost:3000 にアクセス
2. **フォルダ選択**: 「📁 フォルダを選択」でローカルフォルダを選択
3. **フォルダ登録**: よく使うフォルダは「現在のフォルダを登録」で保存
4. **動画閲覧**: サムネイル表示された動画を確認
5. **動画再生**: サムネイルクリックまたは`Enter`キーで再生
6. **動画アップロード**: 「ビデオをアップロード」でファイル追加

### ⌨️ キーボード操作

#### **サムネイルグリッド**
- **`←` `→` `↑` `↓`** : サムネイル選択移動
- **`Enter`** : 選択中の動画を再生開始
- **`1` `2` `3`** : グリッドサイズ切り替え（24/48/96件）

#### **ビデオプレイヤー**
- **`Space` / `K`** : 再生・一時停止
- **`←` `→`** : 5秒戻る・進む
- **`J` `L`** : 10秒戻る・進む  
- **`M`** : ミュート・ミュート解除
- **`Escape`** : プレイヤーを閉じる

### 📁 フォルダ管理機能

#### **フォルダ選択**
1. 「📁 フォルダを選択」をクリック
2. ブラウザのフォルダ選択ダイアログが起動
3. OS別のパス候補から選択または手動入力
4. 「サーバー参照フォルダに設定」で切り替え

#### **フォルダ登録**
1. フォルダを選択済み状態で「現在のフォルダを登録」
2. 表示名を入力（省略可）
3. 「登録済みフォルダ」リストに追加される
4. 次回からは「適用」ボタンで即座に切り替え可能

#### **登録フォルダ管理**
- **一覧表示**: 登録済みフォルダをセレクトボックスで表示
- **適用**: 選択したフォルダを作業フォルダに設定
- **削除**: 不要な登録フォルダを削除

### 🎨 UI機能

- **サムネイル選択**: 現在選択中のサムネイルが青枠でハイライト
- **モーダルプレイヤー**: サムネイルクリックでポップアップ再生
- **レスポンシブ**: デスクトップ・タブレット・スマホ対応
- **ダークテーマ**: 目に優しい暗色インターフェース

## 対応動画形式

- **MP4** - 推奨形式
- **AVI** - Windows標準
- **MKV** - 高品質動画
- **MOV** - Apple形式
- **WMV** - Windows Media
- **FLV** - Flash Video
- **WebM** - Web最適化

## 🔌 API エンドポイント

### 動画管理
- `GET /api/videos` - 全動画の一覧取得（サムネイルURL含む）
- `GET /api/videos/:id` - 特定動画の詳細情報
- `GET /api/videos/:id/stream` - 動画ストリーミング配信
- `POST /api/videos/upload` - 動画アップロード（サムネイル自動生成）
- `DELETE /api/videos/:id` - 動画とサムネイルの完全削除
- `POST /api/videos/change-folder` - サーバー参照フォルダ変更

### 登録フォルダ管理
- `GET /api/videos/folders` - 登録フォルダ一覧取得
- `POST /api/videos/folders` - フォルダ登録（body: `{path, name?}`）
- `DELETE /api/videos/folders/:id` - 登録フォルダ削除

### サムネイル配信
- `GET /api/thumbnails/:filename` - サムネイル画像の配信

### デバッグ・開発用
- `GET /api/debug/files` - ファイルシステム状態確認
- `GET /api/debug/ffmpeg` - FFmpeg動作確認
- `GET /api/debug/ffmpeg-info` - FFmpeg詳細情報

## ディレクトリ構造

```
video-streaming-app/
├── src/                    # ソースコード
│   ├── server/            # サーバーサイドTypeScript
│   │   ├── app.ts         # メインアプリケーション
│   │   ├── routes/        # APIルーティング
│   │   ├── controllers/   # ビジネスロジック
│   │   └── services/      # サービス層
│   └── client/            # クライアントサイド
│       ├── index.html     # メインHTML
│       ├── css/           # スタイルシート
│       │   └── styles.css # ダークテーマCSS
│       └── js/            # JavaScript
│           └── main.js    # メイン制御ロジック
├── scripts/               # ビルドスクリプト
│   └── build.js          # カスタムビルドツール
├── client/               # ビルド後クライアントファイル
├── dist/                 # ビルド後サーバーファイル
│   ├── server/          # コンパイル済みTypeScript
│   └── storage/         # 動画・サムネイル保存
│       ├── videos/      # 動画ファイル
│       └── thumbnails/  # サムネイル画像
├── package.json          # プロジェクト設定
├── tsconfig.json        # TypeScript設定
└── README.md            # このファイル
```

## 開発

### 利用可能なスクリプト

```bash
# 開発（ビルド + 起動）
npm run dev

# サーバーのみビルド
npm run build:server

# クライアントファイルコピー
npm run copy:client

# 完全ビルド
npm run build

# 本番起動
npm start

# クリーンアップ
npm run clean
```

### 開発フロー

1. **ソースコード編集**: `src/` 以下のファイルを編集
2. **ビルド**: `npm run build` でコンパイル・コピー
3. **テスト**: `npm run dev` で開発サーバー起動
4. **デバッグ**: ブラウザの開発者ツールでログ確認

## システムサービスとして登録

### PM2を使用した管理（推奨）

1. **PM2のインストール**
```bash
npm install -g pm2
```

2. **PM2設定ファイルの作成**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'video-streaming-app',
    script: 'dist/server/app.js',
    cwd: '/path/to/video-streaming-app',
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

3. **PM2でアプリケーションを起動**
```bash
# ログディレクトリの作成
mkdir -p logs

# アプリケーションの起動
pm2 start ecosystem.config.js

# システム起動時の自動起動設定
pm2 startup
pm2 save
```

4. **PM2管理コマンド**
```bash
# 状態確認
pm2 status

# ログ確認
pm2 logs video-streaming-app

# 再起動
pm2 restart video-streaming-app

# 停止
pm2 stop video-streaming-app
```

### systemd サービス（Linux）

1. **サービスファイルを作成**
```bash
sudo nano /etc/systemd/system/video-streaming-app.service
```

2. **設定内容**
```ini
[Unit]
Description=Video Streaming App
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/video-streaming-app
ExecStart=/usr/bin/node dist/server/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

3. **サービスの有効化**
```bash
sudo systemctl daemon-reload
sudo systemctl enable video-streaming-app.service
sudo systemctl start video-streaming-app.service
```

## 本番環境設定

### 環境変数設定

```bash
# .env
NODE_ENV=production
PORT=3000
VIDEO_STORAGE_PATH=./dist/storage/videos
THUMBNAIL_STORAGE_PATH=./dist/storage/thumbnails
MAX_FILE_SIZE=500MB
```

### Nginx リバースプロキシ設定

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
        alias /path/to/video-streaming-app/dist/storage/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
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
    create 644 your-username your-username
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
rsync -av ./dist/storage/ $BACKUP_DIR/storage_$DATE/

# 古いバックアップの削除（30日以上前）
find $BACKUP_DIR -type d -name "storage_*" -mtime +30 -exec rm -rf {} \;
```

## トラブルシューティング

### よくある問題と解決方法

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
chmod -R 755 dist/storage/
```

4. **サムネイル生成エラー**
```bash
# FFmpeg動作確認
curl http://localhost:3000/api/debug/ffmpeg

# ファイル状況確認
curl http://localhost:3000/api/debug/files
```

5. **ビルドエラー**
```bash
# クリーンビルド
npm run clean
npm run build
```

### デバッグ機能

アプリケーション内のデバッグボタンを使用：
- **自己テスト実行**: DOM要素とAPI接続をテスト
- **サムネイル再読み込み**: キャッシュをクリアして再取得

## パフォーマンス最適化

### 推奨設定

- **動画品質**: 1080p以下を推奨
- **ファイルサイズ**: 1GB以下を推奨  
- **同時アップロード**: 5ファイル以下
- **ディスク容量**: 最低10GB以上の空き容量

### キャッシュ設定

- サムネイル: 24時間キャッシュ
- 動画ストリーミング: レンジリクエスト対応
- 静的ファイル: 1年キャッシュ

## セキュリティ

### 推奨事項

- リバースプロキシ（Nginx）の使用
- HTTPS/SSL証明書の設定
- ファイアウォール設定
- 定期的なセキュリティアップデート
- ディスク容量の監視

## ライセンス

MIT License

## 貢献

プルリクエスト、イシューの報告を歓迎します。

## 更新履歴

- **v1.4.0** - キーボードショートカット実装
  - YouTube風のキーボード操作
  - 動画プレイヤー操作（スペース、矢印キー、M、F、L、Escape）
  - グリッドナビゲーション（Tabキー）
  - ミュート/ミュート解除機能

- **v1.3.0** - フォルダ管理機能
  - 登録フォルダの永続化保存
  - フォルダ別動画表示
  - クロスプラットフォーム対応（Windows/macOS/Linux）
  - 登録フォルダのCRUD操作

- **v1.2.0** - 機能拡張
  - サムネイル表示数切り替え（24/48/96）
  - 完全削除機能
  - デバッグ機能の追加

- **v1.1.0** - UI/UX改善
  - ダークテーマの実装
  - モーダルプレイヤー
  - レスポンシブデザイン

- **v1.0.0** - 初回リリース
  - 基本的な動画ストリーミング機能
  - サムネイル生成
  - アップロード機能
