import fs from 'fs';
import path from 'path';

class VideoService {
    private videoDirectory: string;

    constructor() {
        this.videoDirectory = path.join(__dirname, '../../storage/videos');
    }

    public getVideos(): string[] {
        return fs.readdirSync(this.videoDirectory).filter(file => {
            return file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.avi');
        });
    }

    public getVideoMetadata(videoFile: string): { name: string; size: number; } | null {
        const videoPath = path.join(this.videoDirectory, videoFile);
        if (fs.existsSync(videoPath)) {
            const stats = fs.statSync(videoPath);
            return {
                name: videoFile,
                size: stats.size
            };
        }
        return null;
    }
}

export default new VideoService();