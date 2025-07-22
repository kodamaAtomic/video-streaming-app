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
      console.log(`Generating thumbnail for: ${metadata.filename}`);
      const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(
        metadata.path,
        metadata.id
      );
      metadata.thumbnailPath = thumbnailPath;
      console.log(`Thumbnail generated: ${thumbnailPath}`);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${metadata.filename}:`, error);
      // サムネイル生成に失敗してもビデオメタデータは保持
      metadata.thumbnailPath = undefined;
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
    // ファイルパスを正しく設定（file.pathを使用）
    const videoPath = file.path;

    console.log(`Adding video: ${file.originalname}`);
    console.log(`File path: ${videoPath}`);
    console.log(`Video ID: ${videoId}`);

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
    console.log(`Video added successfully: ${metadata.originalName}`);
    return metadata;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const video = this.videos.get(id);
    if (!video) {
      console.log(`Video not found in memory: ${id}`);
      return false;
    }

    console.log(`Attempting to delete video: ${video.originalName}`);
    console.log(`Video path: ${video.path}`);

    try {
      // ファイルの存在確認
      if (fsSynce.existsSync(video.path)) {
        await fs.unlink(video.path);
        console.log(`Video file deleted: ${video.path}`);
      } else {
        console.warn(`Video file not found: ${video.path}`);
      }
      
      // サムネイル削除
      if (video.thumbnailPath && fsSynce.existsSync(video.thumbnailPath)) {
        await fs.unlink(video.thumbnailPath);
        console.log(`Thumbnail deleted: ${video.thumbnailPath}`);
      } else {
        console.warn(`Thumbnail not found: ${video.thumbnailPath}`);
      }

      this.videos.delete(id);
      console.log(`Video metadata removed from memory: ${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete video ${id}:`, error);
      return false;
    }
  }

  // デバッグ用メソッドを追加
  async debugVideoInfo(id: string): Promise<void> {
    const video = this.videos.get(id);
    if (video) {
      console.log('=== Video Debug Info ===');
      console.log('ID:', video.id);
      console.log('Filename:', video.filename);
      console.log('Original Name:', video.originalName);
      console.log('Path:', video.path);
      console.log('Path exists:', fsSynce.existsSync(video.path));
      console.log('Thumbnail Path:', video.thumbnailPath);
      console.log('Thumbnail exists:', video.thumbnailPath ? fsSynce.existsSync(video.thumbnailPath) : 'No thumbnail path');
      console.log('========================');
    }
  }
}