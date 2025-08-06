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

// ルート定義
router.get('/', videoController.getAllVideos.bind(videoController));
router.get('/:id', videoController.getVideoById.bind(videoController));
router.get('/:id/stream', videoController.streamVideo.bind(videoController));
// 既存のルートに加えて、サムネイル一覧エンドポイントを追加
router.get('/thumbnails/all', videoController.getAllThumbnails.bind(videoController));
router.post('/upload', upload.single('video'), videoController.uploadVideo.bind(videoController));
router.delete('/:id', videoController.deleteVideo.bind(videoController));
// フォルダ変更エンドポイントを追加
router.post('/change-folder', videoController.changeVideoFolder.bind(videoController));

export { router as videoRoutes };