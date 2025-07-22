import { Router } from 'express';
import { ThumbnailController } from '../controllers/thumbnailController';

const router = Router();
const thumbnailController = new ThumbnailController();

router.get('/', thumbnailController.getThumbnails.bind(thumbnailController));
router.get('/:id', thumbnailController.getThumbnailById.bind(thumbnailController));

export default router;