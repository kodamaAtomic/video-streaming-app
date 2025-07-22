import { Request, Response } from 'express';
import { getThumbnails, getThumbnailById } from '../services/thumbnailGenerator';

class ThumbnailController {
    public async getThumbnails(req: Request, res: Response): Promise<void> {
        try {
            const thumbnails = await getThumbnails();
            res.status(200).json(thumbnails);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving thumbnails', error });
        }
    }

    public async getThumbnailById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const thumbnail = await getThumbnailById(id);
            if (thumbnail) {
                res.status(200).json(thumbnail);
            } else {
                res.status(404).json({ message: 'Thumbnail not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving thumbnail', error });
        }
    }
}

export default new ThumbnailController();