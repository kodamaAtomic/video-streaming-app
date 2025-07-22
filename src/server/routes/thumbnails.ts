import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const thumbnailPath = path.join(__dirname, '../../storage/thumbnails', filename);
  
  // ファイルの存在確認
  if (!fs.existsSync(thumbnailPath)) {
    return res.status(404).json({
      success: false,
      message: 'Thumbnail not found'
    });
  }

  // 適切なContent-Typeを設定
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400' // 24時間キャッシュ
  });

  // ファイルストリーミング
  const fileStream = fs.createReadStream(thumbnailPath);
  fileStream.pipe(res);
});

export { router as thumbnailRoutes };