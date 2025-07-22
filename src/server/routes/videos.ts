import { Router } from 'express';
import { VideoController } from '../controllers/videoController';

const router = Router();
const videoController = new VideoController();

router.get('/videos', videoController.getVideos);
router.get('/videos/:id', videoController.getVideoById);

export default router;