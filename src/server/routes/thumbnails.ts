import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  // dist配下のstorageに統一
  const thumbnailPath = path.join(__dirname, '../storage/thumbnails', filename);
  
  console.log(`Thumbnail requested: ${filename}`);
  console.log(`Thumbnail path: ${thumbnailPath}`);
  console.log(`Path exists: ${fs.existsSync(thumbnailPath)}`);
  
  // ファイルの存在確認
  if (!fs.existsSync(thumbnailPath)) {
    console.log(`Thumbnail not found: ${thumbnailPath}`);
    return res.status(404).json({
      success: false,
      message: 'Thumbnail not found',
      path: thumbnailPath
    });
  }

  // 適切なContent-Typeを設定
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400' // 24時間キャッシュ
  });

  console.log(`Serving thumbnail: ${thumbnailPath}`);

  // ファイルストリーミング
  const fileStream = fs.createReadStream(thumbnailPath);
  fileStream.pipe(res);
});

// デバッグ用エンドポイント
router.get('/debug/list', (req, res) => {
  const thumbnailDir = path.join(__dirname, '../storage/thumbnails');
  
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