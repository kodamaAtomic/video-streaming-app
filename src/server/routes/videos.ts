import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import VideoController from '../../controllers/videoController';

const router = Router();
const videoController = new VideoController();

console.log('Setting up video routes...');

// ストレージディレクトリの確保
const videoStorageDir = path.join(__dirname, '../../storage/videos');
if (!fs.existsSync(videoStorageDir)) {
  fs.mkdirSync(videoStorageDir, { recursive: true });
  console.log(`Created video storage directory: ${videoStorageDir}`);
}

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`Upload destination: ${videoStorageDir}`);
    cb(null, videoStorageDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`Upload filename: ${filename}`);
    cb(null, filename);
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
      console.log(`File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`File rejected: ${file.originalname}`);
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// ルート定義（デバッグログ付き）
router.get('/', (req, res, next) => {
  console.log('GET /api/videos');
  videoController.getAllVideos(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  console.log(`GET /api/videos/${req.params.id}`);
  videoController.getVideoById(req, res).catch(next);
});

router.get('/:id/stream', (req, res, next) => {
  console.log(`GET /api/videos/${req.params.id}/stream`);
  videoController.streamVideo(req, res).catch(next);
});

router.post('/upload', upload.single('video'), (req, res, next) => {
  console.log('POST /api/videos/upload');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  videoController.uploadVideo(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  console.log(`DELETE /api/videos/${req.params.id}`);
  videoController.deleteVideo(req, res).catch(next);
});

console.log('Video routes setup complete');

export { router as videoRoutes };