import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

class ThumbnailGenerator {
    private videoStoragePath: string;
    private thumbnailStoragePath: string;

    constructor() {
        this.videoStoragePath = path.join(__dirname, '../../../../../storage/videos');
        this.thumbnailStoragePath = path.join(__dirname, '../../../../../storage/thumbnails');
    }

    public async generateThumbnail(videoFileName: string): Promise<string> {
        const videoFilePath = path.join(this.videoStoragePath, videoFileName);
        const thumbnailFileName = `${path.parse(videoFileName).name}.jpg`;
        const thumbnailFilePath = path.join(this.thumbnailStoragePath, thumbnailFileName);

        if (!fs.existsSync(videoFilePath)) {
            throw new Error('Video file does not exist');
        }

        const command = `ffmpeg -i "${videoFilePath}" -ss 00:00:01.000 -vframes 1 "${thumbnailFilePath}"`;
        
        try {
            await execPromise(command);
            return thumbnailFileName;
        } catch (error) {
            throw new Error('Error generating thumbnail: ' + error.message);
        }
    }
}

export default ThumbnailGenerator;