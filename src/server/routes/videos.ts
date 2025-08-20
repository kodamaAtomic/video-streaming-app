import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import VideoController from '../../controllers/videoController';

const router = Router();
const videoController = new VideoController();

// ストレージディレクトリの確保（dist/storage/videos に統一）
const videoStorageDir = path.join(__dirname, '../../storage/videos');

// ストレージディレクトリが存在しない場合は作成
if (!fs.existsSync(videoStorageDir)) {
  fs.mkdirSync(videoStorageDir, { recursive: true });
  console.log(`Created video storage directory: ${videoStorageDir}`);
}

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`Upload destination: ${videoStorageDir}`);
    cb(null, videoStorageDir);
  },
  filename: (req, file, cb) => {
    // 元のファイル名を保持し、重複する場合はタイムスタンプを追加
    const originalName = file.originalname;
    const filePath = path.join(videoStorageDir, originalName);
    
    if (fs.existsSync(filePath)) {
      const uniqueSuffix = Date.now();
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext);
      const filename = `${baseName}-${uniqueSuffix}${ext}`;
      console.log(`File exists, using unique filename: ${filename}`);
      cb(null, filename);
    } else {
      console.log(`Using original filename: ${originalName}`);
      cb(null, originalName);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mkv|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// ルート定義（順序重要：より具体的なルートを先に定義）
router.get('/', videoController.getAllVideos.bind(videoController));
// 既存のルートに加えて、サムネイル一覧エンドポイントを追加
router.get('/thumbnails/all', videoController.getAllThumbnails.bind(videoController));

// 登録フォルダ管理エンドポイント（:id より先に定義）
router.get('/folders', videoController.getRegisteredFolders.bind(videoController));
router.post('/folders', videoController.addRegisteredFolder.bind(videoController));
router.delete('/folders/:id', videoController.removeRegisteredFolder.bind(videoController));

// フォルダ変更エンドポイント
router.post('/change-folder', videoController.changeVideoFolder.bind(videoController));

// サムネイル生成エンドポイント
router.post('/thumbnails/batch-generate', videoController.generateThumbnailsBatch.bind(videoController));
router.post('/thumbnails/ultra-fast', videoController.generateThumbnailsUltraFast.bind(videoController));
router.post('/thumbnails/progressive', videoController.generateThumbnailsProgressive.bind(videoController));
router.get('/thumbnails/stats', videoController.getThumbnailStats.bind(videoController));

// 並列サムネイル生成エンドポイント
router.post('/thumbnails/batch-generate', videoController.generateThumbnailsBatch.bind(videoController));
router.get('/thumbnails/stats', videoController.getThumbnailStats.bind(videoController));

// TSトランスコード機能
router.post('/transcode', videoController.startTranscode.bind(videoController));
router.get('/transcode/progress/:jobId', videoController.getTranscodeProgress.bind(videoController));
router.delete('/transcode/cancel/:jobId', videoController.cancelTranscode.bind(videoController));

// システム情報取得
router.get('/system-info', videoController.getSystemInfo.bind(videoController));

// 個別ビデオルート（最後に配置）
router.get('/:id', videoController.getVideoById.bind(videoController));
router.get('/:id/stream', videoController.streamVideo.bind(videoController));
router.post('/upload', upload.single('video'), videoController.uploadVideo.bind(videoController));
router.delete('/:id', videoController.deleteVideo.bind(videoController));

export { router as videoRoutes };