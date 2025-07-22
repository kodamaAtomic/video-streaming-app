# Video Streaming App

このプロジェクトは、ローカルの動画ストレージから動画をサムネイル表示し、再生するためのシステムです。以下にプロジェクトの概要と使用方法を示します。

## 概要

- **サーバーサイド**: Expressを使用して構築されており、動画とサムネイルに関連するAPIエンドポイントを提供します。
- **クライアントサイド**: HTML、CSS、JavaScriptを使用して、ユーザーインターフェースを構築しています。動画のリスト表示や再生機能を実装しています。

## ディレクトリ構造

```
video-streaming-app
├── src
│   ├── server
│   │   ├── app.ts
│   │   ├── routes
│   │   │   ├── videos.ts
│   │   │   └── thumbnails.ts
│   │   ├── controllers
│   │   │   ├── videoController.ts
│   │   │   └── thumbnailController.ts
│   │   ├── services
│   │   │   ├── videoService.ts
│   │   │   └── thumbnailGenerator.ts
│   │   └── types
│   │       └── index.ts
│   └── client
│       ├── index.html
│       ├── css
│       │   └── styles.css
│       ├── js
│       │   ├── app.js
│       │   ├── videoPlayer.js
│       │   └── thumbnailGrid.js
│       └── components
│           ├── VideoGrid.js
│           └── VideoPlayer.js
├── storage
│   ├── videos
│   └── thumbnails
├── package.json
├── tsconfig.json
└── README.md
```

## 使用方法

1. **依存関係のインストール**:
   プロジェクトのルートディレクトリで以下のコマンドを実行して、必要な依存関係をインストールします。
   ```
   npm install
   ```

2. **サーバーの起動**:
   サーバーを起動するには、以下のコマンドを実行します。
   ```
   npm start
   ```

3. **クライアントのアクセス**:
   ブラウザを開き、`http://localhost:3000`にアクセスして、アプリケーションを使用します。

## 機能

- 動画のリスト表示
- 動画の再生
- サムネイルの表示

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。