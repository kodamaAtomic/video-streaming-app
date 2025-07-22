import { Request, Response } from 'express';
import VideoService from '../services/videoService';

class VideoController {
    private videoService: VideoService;

    constructor() {
        this.videoService = new VideoService();
    }

    public async getVideos(req: Request, res: Response): Promise<void> {
        try {
            const videos = await this.videoService.getAllVideos();
            res.status(200).json(videos);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving videos', error });
        }
    }

    public async getVideoById(req: Request, res: Response): Promise<void> {
        const videoId = req.params.id;
        try {
            const video = await this.videoService.getVideoById(videoId);
            if (video) {
                res.status(200).json(video);
            } else {
                res.status(404).json({ message: 'Video not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving video', error });
        }
    }
}

export default VideoController;