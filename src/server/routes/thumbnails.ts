import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const thumbnailPath = path.join(__dirname, '../../storage/thumbnails', filename);
  
  console.log(`🖼️ Thumbnail requested: ${filename}`);
  console.log(`📍 Thumbnail path: ${thumbnailPath}`);
  console.log(`✅ Path exists: ${fs.existsSync(thumbnailPath)}`);
  
  // ファイルの存在確認
  if (!fs.existsSync(thumbnailPath)) {
    console.log(`❌ Thumbnail not found: ${thumbnailPath}`);
    return res.status(404).json({
      success: false,
      message: 'Thumbnail not found',
      path: thumbnailPath
    });
  }

  // ファイル情報を取得
  const stat = fs.statSync(thumbnailPath);
  console.log(`📊 File size: ${stat.size} bytes`);

  // 適切なContent-Typeを設定（より厳密に）
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'image/png'; // デフォルト
  
  switch (ext) {
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.webp':
      contentType = 'image/webp';
      break;
  }

  // レスポンスヘッダーを設定
  res.set({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400' // 24時間キャッシュ
  });

  console.log(`✅ Serving thumbnail: ${thumbnailPath}`);

  // ファイルストリーミング
  const fileStream = fs.createReadStream(thumbnailPath);
  fileStream.on('error', (err) => {
    console.error(`❌ File stream error:`, err);
    res.status(500).json({ error: 'Failed to read thumbnail file' });
  });
  fileStream.pipe(res);
});

// デバッグ用エンドポイント
router.get('/debug/list', (req, res) => {
  const thumbnailDir = path.join(__dirname, '../../storage/thumbnails');
  
  if (!fs.existsSync(thumbnailDir)) {
    return res.json({
      success: false,
      message: 'Thumbnail directory does not exist',
      path: thumbnailDir
    });
  }

  const files = fs.readdirSync(thumbnailDir);
  res.json({
    success: true,
    thumbnailDir,
    files,
    count: files.length
  });
});

export { router as thumbnailRoutes };