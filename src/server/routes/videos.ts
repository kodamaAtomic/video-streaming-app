import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import VideoController from '../../controllers/videoController';

const router = Router();
const videoController = new VideoController();

// ストレージディレクトリの確保
const videoStorageDir = path.join(__dirname, '../../storage/videos');
if (!fs.existsSync(videoStorageDir)) {
  fs.mkdirSync(videoStorageDir, { recursive: true });
}

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoStorageDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// ルート定義
router.get('/', videoController.getAllVideos.bind(videoController));
router.get('/:id', videoController.getVideoById.bind(videoController));
router.get('/:id/stream', videoController.streamVideo.bind(videoController));
router.post('/upload', upload.single('video'), videoController.uploadVideo.bind(videoController));
router.delete('/:id', videoController.deleteVideo.bind(videoController));

export { router as videoRoutes };