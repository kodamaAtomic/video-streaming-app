import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { videoRoutes } from './routes/videos';
import { thumbnailRoutes } from './routes/thumbnails';  // 追加

const app = express();
const PORT = process.env.PORT || 3000;

// デバッグログ
console.log('Starting server...');
console.log('Current directory:', __dirname);

// 必要なディレクトリを作成（dist配下に統一）
const requiredDirs = [
  path.join(__dirname, '../storage'),
  path.join(__dirname, '../storage/videos'),
  path.join(__dirname, '../storage/thumbnails'),
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
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// JSONパーサー（ファイルアップロード前に設定）
app.use(express.json());

// デバッグエンドポイント（API ルートより前に配置）
app.get('/api/debug/ffmpeg', async (req, res) => {
  try {
    const ThumbnailGenerator = (await import('../services/thumbnailGenerator')).default;
    const generator = new ThumbnailGenerator();
    const result = await generator.testFFmpeg();
    res.json({ success: result, message: result ? 'FFmpeg working' : 'FFmpeg not working' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// FFmpeg詳細情報エンドポイント
app.get('/api/debug/ffmpeg-info', async (req, res) => {
  try {
    const ThumbnailGenerator = (await import('../services/thumbnailGenerator')).default;
    const generator = new ThumbnailGenerator();
    
    const testResult = await generator.simpleFFmpegTest();
    
    res.json({
      test: testResult,
      ffmpegStatic: require('ffmpeg-static'),
      systemPaths: {
        '/usr/bin/ffmpeg': fs.existsSync('/usr/bin/ffmpeg'),
        '/usr/local/bin/ffmpeg': fs.existsSync('/usr/local/bin/ffmpeg'),
        '/opt/homebrew/bin/ffmpeg': fs.existsSync('/opt/homebrew/bin/ffmpeg')
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// API ルートの登録
app.use('/api/videos', videoRoutes);
app.use('/api/thumbnails', thumbnailRoutes);  // 追加

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

// デバッグ用: すべてのルートをログ出力
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
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

// ルート確認用の追加
console.log('Registered routes:');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        console.log(`${Object.keys(handler.route.methods)} /api/videos${handler.route.path}`);
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:3000`);
  console.log(`📁 Client directory: ${path.join(__dirname, '../../client')}`);
  console.log(`📁 Storage directory: ${path.join(__dirname, '../../storage')}`);
});

export default app;