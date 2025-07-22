import fs from 'fs/promises';
import fsSynce from 'fs';
import path from 'path';
import { VideoMetadata } from '../types';
import ThumbnailGenerator from './thumbnailGenerator';

export default class VideoService {
  private readonly videoDir: string;
  private readonly thumbnailGenerator: ThumbnailGenerator;
  private videos: Map<string, VideoMetadata> = new Map();

  constructor(videoDir: string = path.join(__dirname, '../../storage/videos')) {
    this.videoDir = videoDir;
    this.thumbnailGenerator = new ThumbnailGenerator();
    this.initializeVideoDir();
    this.loadVideos();
  }

  private async initializeVideoDir(): Promise<void> {
    try {
      await fs.access(this.videoDir);
    } catch {
      await fs.mkdir(this.videoDir, { recursive: true });
      console.log(`Created video directory: ${this.videoDir}`);
    }
  }

  private async loadVideos(): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      if (!fsSynce.existsSync(this.videoDir)) {
        await fs.mkdir(this.videoDir, { recursive: true });
        console.log('No videos directory found, created empty directory');
        return;
      }

      const files = await fs.readdir(this.videoDir);
      const videoFiles = files.filter(file => 
        /\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i.test(file)
      );

      console.log(`Found ${videoFiles.length} video files`);

      for (const file of videoFiles) {
        const videoPath = path.join(this.videoDir, file);
        const stats = await fs.stat(videoPath);
        
        const videoId = this.generateVideoId(file);
        const metadata: VideoMetadata = {
          id: videoId,
          filename: file,
          originalName: file,
          path: videoPath,
          size: stats.size,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        };

        // サムネイルが存在しない場合は生成
        await this.ensureThumbnail(metadata);
        
        this.videos.set(videoId, metadata);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  }

  private generateVideoId(filename: string): string {
    return Buffer.from(filename + Date.now()).toString('base64').replace(/[+/=]/g, '');
  }

  private async ensureThumbnail(metadata: VideoMetadata): Promise<void> {
    try {
      const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(
        metadata.path,
        metadata.id
      );
      metadata.thumbnailPath = thumbnailPath;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${metadata.filename}:`, error);
    }
  }

  async getAllVideos(): Promise<VideoMetadata[]> {
    return Array.from(this.videos.values());
  }

  async getVideoById(id: string): Promise<VideoMetadata | null> {
    return this.videos.get(id) || null;
  }

  async addVideo(file: Express.Multer.File): Promise<VideoMetadata> {
    const videoId = this.generateVideoId(file.originalname + Date.now());
    const videoPath = path.join(this.videoDir, file.filename);

    const metadata: VideoMetadata = {
      id: videoId,
      filename: file.filename,
      originalName: file.originalname,
      path: videoPath,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // サムネイル生成
    await this.ensureThumbnail(metadata);

    this.videos.set(videoId, metadata);
    return metadata;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const video = this.videos.get(id);
    if (!video) return false;

    try {
      // 動画ファイル削除
      await fs.unlink(video.path);
      
      // サムネイル削除
      if (video.thumbnailPath) {
        await fs.unlink(video.thumbnailPath);
      }

      this.videos.delete(id);
      return true;
    } catch (error) {
      console.error(`Failed to delete video ${id}:`, error);
      return false;
    }
  }
}