import fs from 'fs';
import path from 'path';
import { VideoMetadata } from '../types';
import ThumbnailGenerator from './thumbnailGenerator';

export default class VideoService {
  private videoDir: string;
  private readonly thumbnailGenerator: ThumbnailGenerator;
  private videos: Map<string, VideoMetadata> = new Map();

  constructor(videoDir?: string) {
    this.videoDir = videoDir || path.join(__dirname, '../storage/videos');
    this.thumbnailGenerator = new ThumbnailGenerator(path.join(__dirname, '../storage/thumbnails'));
    console.log(`Video directory set to: ${this.videoDir}`);
    console.log(`Current __dirname: ${__dirname}`);
    this.initializeVideoDir();
    this.loadVideos();
  }

  private initializeVideoDir(): void {
    if (!fs.existsSync(this.videoDir)) {
      fs.mkdirSync(this.videoDir, { recursive: true });
      console.log(`Created video directory: ${this.videoDir}`);
    }
  }

  private async loadVideos(): Promise<void> {
    try {
      const files = fs.readdirSync(this.videoDir);
      const videoFiles = files.filter(file => 
        ['.mp4', '.avi', '.mov', '.mkv', '.webm'].some(ext => 
          file.toLowerCase().endsWith(ext)
        )
      );

      console.log(`Found ${videoFiles.length} video files in ${this.videoDir}`);
      
      for (const file of videoFiles) {
        try {
          const videoPath = path.join(this.videoDir, file);
          const stats = fs.statSync(videoPath);
          const videoId = path.parse(file).name;
          
          const metadata: VideoMetadata = {
            id: videoId,
            filename: file,
            originalName: file,
            path: videoPath,
            size: stats.size,
            mimetype: this.getMimeType(file),
            uploadDate: stats.mtime,
            createdAt: stats.mtime,
            updatedAt: stats.mtime,
            thumbnailPath: undefined
          };

          await this.ensureThumbnail(metadata);
          
          this.videos.set(videoId, metadata);
          console.log(`Loaded video: ${file}`);
        } catch (error) {
          console.error(`Error loading video ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm'
    };
    return mimeTypes[ext] || 'video/mp4';
  }

  async getAllVideos(): Promise<VideoMetadata[]> {
    return Array.from(this.videos.values());
  }

  async getVideoById(id: string): Promise<VideoMetadata | undefined> {
    return this.videos.get(id);
  }

  async ensureThumbnail(video: VideoMetadata): Promise<void> {
    try {
      const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(
        video.path, 
        video.id
      );
      video.thumbnailPath = thumbnailPath;
      console.log(`Generated thumbnail for ${video.originalName}: ${thumbnailPath}`);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${video.originalName}:`, error);
      video.thumbnailPath = undefined;
    }
  }

  async addVideo(file: Express.Multer.File | undefined): Promise<VideoMetadata> {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Adding video: ${file.originalname}`);
    console.log(`File path: ${file.path}`);
    
    const videoId = path.parse(file.filename).name;
    
    const metadata: VideoMetadata = {
      id: videoId,
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      thumbnailPath: undefined
    };

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
      if (fs.existsSync(video.path)) {
        fs.unlinkSync(video.path);
        console.log(`Deleted video file: ${video.path}`);
      } else {
        console.log(`Video file not found: ${video.path}`);
      }

      if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
        fs.unlinkSync(video.thumbnailPath);
        console.log(`Deleted thumbnail: ${video.thumbnailPath}`);
      }

      this.videos.delete(id);
      console.log(`Video ${id} successfully removed from memory`);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete video ${id}:`, error);
      return false;
    }
  }

  async debugVideoInfo(id: string): Promise<void> {
    const video = this.videos.get(id);
    if (video) {
      console.log('=== Video Debug Info ===');
      console.log('ID:', video.id);
      console.log('Filename:', video.filename);
      console.log('Original Name:', video.originalName);
      console.log('Path:', video.path);
      console.log('Path exists:', fs.existsSync(video.path));
      console.log('Thumbnail Path:', video.thumbnailPath);
      console.log('Thumbnail exists:', video.thumbnailPath ? fs.existsSync(video.thumbnailPath) : 'No thumbnail path');
      console.log('========================');
    }
  }

  async changeVideoDirectory(newPath: string): Promise<void> {
    if (!fs.existsSync(newPath)) {
      throw new Error(`Directory does not exist: ${newPath}`);
    }

    const stats = fs.statSync(newPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${newPath}`);
    }

    console.log(`Changing video directory from ${this.videoDir} to ${newPath}`);
    this.videoDir = newPath;
    
    console.log(`Video directory changed to: ${this.videoDir}`);
    
    this.videos.clear();
    await this.loadVideos();
  }
}
