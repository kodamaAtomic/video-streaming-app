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


































































MIT License## ライセンス- 本番環境では適切なセキュリティ設定を行ってください- サムネイル生成にはFFmpegが必要です- 大きな動画ファイルのアップロードには時間がかかる場合があります## 注意事項```npm run dev```bash### ウォッチモード```npm test```bash### テスト実行## 開発```└── dist/│   └── thumbnails/│   ├── videos/├── storage/│   └── js/│   ├── css/│   ├── index.html├── client/│   └── types/│   ├── services/│   │   └── controllers/│   │   ├── routes/│   │   ├── app.ts│   ├── server/├── src/video-streaming-app/```## ディレクトリ構造- `GET /api/thumbnails/:filename` - サムネイル画像取得### サムネイル関連- `POST /api/videos/upload` - 動画アップロード- `DELETE /api/videos/:id` - 動画削除- `GET /api/videos/:id/stream` - 動画ストリーミング- `GET /api/videos/:id` - 特定動画の情報取得- `GET /api/videos` - 全動画の一覧取得### 動画関連## API エンドポイント- WebM- FLV- WMV- MOV- MKV- AVI- MP4## 対応動画形式5. 不要な動画は「Delete」ボタンで削除可能# このディレクトリを保持するための空ファイル