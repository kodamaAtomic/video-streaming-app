import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export class ThumbnailController {
  async getThumbnail(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      const thumbnailPath = path.join(__dirname, '../../storage/thumbnails', filename);
      
      // ファイルの存在確認
      if (!fs.existsSync(thumbnailPath)) {
        res.status(404).json({
          success: false,
          message: 'Thumbnail not found'
        });
        return;
      }

      // 適切なContent-Typeを設定
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400' // 24時間キャッシュ
      });

      // ファイルストリーミング
      const fileStream = fs.createReadStream(thumbnailPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Thumbnail serving error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve thumbnail'
      });
    }
  }
}

export default ThumbnailController;