import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import fsSynce from 'fs';
import { ThumbnailOptions } from '../types';

// FFmpegのパスを設定
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export class ThumbnailGenerator {
  private readonly thumbnailDir: string;

  constructor(thumbnailDir: string = path.join(__dirname, '../../storage/thumbnails')) {
    this.thumbnailDir = thumbnailDir;
    this.ensureThumbnailDir();
  }

  private async ensureThumbnailDir(): Promise<void> {
    try {
      await fs.access(this.thumbnailDir);
    } catch {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
      console.log(`Created thumbnail directory: ${this.thumbnailDir}`);
    }
  }

  async generateThumbnail(
    videoPath: string,
    videoId: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const {
      timemarks = ['25%'],
      size = '320x240',
      filename = `${videoId}_thumbnail.png`
    } = options;

    const thumbnailPath = path.join(this.thumbnailDir, filename);

    // ディレクトリの存在確認
    if (!fsSynce.existsSync(this.thumbnailDir)) {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
    }

    // 動画ファイルの存在確認
    if (!fsSynce.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timemarks,
          size,
          filename,
          folder: this.thumbnailDir
        })
        .on('end', () => {
          console.log(`Thumbnail generated: ${thumbnailPath}`);
          resolve(thumbnailPath);
        })
        .on('error', (error: unknown) => {
          console.error('Thumbnail generation error:', error);
          // エラー型の修正
          const errorMessage = error instanceof Error ? error.message : String(error);
          reject(new Error('Error generating thumbnail: ' + errorMessage));
        });
    });
  }

  async generateMultipleThumbnails(
    videoPath: string,
    videoId: string,
    count: number = 5
  ): Promise<string[]> {
    const timemarks = Array.from({ length: count }, (_, i) => 
      `${Math.round((100 / (count + 1)) * (i + 1))}%`
    );

    const thumbnailPaths: string[] = [];

    for (let i = 0; i < count; i++) {
      const filename = `${videoId}_thumbnail_${i + 1}.png`;
      try {
        const thumbnailPath = await this.generateThumbnail(videoPath, videoId, {
          timemarks: [timemarks[i]],
          filename
        });
        thumbnailPaths.push(thumbnailPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to generate thumbnail ${i + 1}:`, errorMessage);
      }
    }

    return thumbnailPaths;
  }

  async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }
}

export default ThumbnailGenerator;