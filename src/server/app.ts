import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// デバッグログ
console.log('Starting server...');
console.log('Current directory:', __dirname);

// 必要なディレクトリを作成
const requiredDirs = [
  path.join(__dirname, '../../storage'),
  path.join(__dirname, '../../storage/videos'),
  path.join(__dirname, '../../storage/thumbnails'),
  path.join(__dirname, '../../client')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// セキュリティとパフォーマンスミドルウェア
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../../client')));
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

// JSONパーサー
app.use(express.json());

// ルートの動的インポート（エラー回避）
app.get('/api/videos', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Video service is starting...'
  });
});

// メインページ
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../../client/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <html>
        <head><title>Video Streaming App</title></head>
        <body>
          <h1>Video Streaming App</h1>
          <p>Setting up... Please wait.</p>
          <p>Index file path: ${indexPath}</p>
        </body>
      </html>
    `);
  }
});

// エラーハンドリング
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

// 404ハンドリング
app.use((req, res) => {
  console.log('404 - Not found:', req.path);
  res.status(404).json({
    success: false,
    message: 'Not Found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Client directory: ${path.join(__dirname, '../../client')}`);
  console.log(`📁 Storage directory: ${path.join(__dirname, '../../storage')}`);
});

export default app;