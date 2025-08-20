import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VideoMetadata, RegisteredFolder } from '../types';
import ThumbnailGenerator from './thumbnailGenerator';

export default class VideoService {
  private videoDir: string;
  private readonly thumbnailGenerator: ThumbnailGenerator;
  private videos: Map<string, VideoMetadata> = new Map();
  private readonly registeredFoldersFile: string;

  constructor(videoDir?: string) {
    this.videoDir = videoDir || path.join(__dirname, '../storage/videos');
    this.thumbnailGenerator = new ThumbnailGenerator(path.join(__dirname, '../storage/thumbnails'));
    this.registeredFoldersFile = path.join(__dirname, '../storage/registeredFolders.json');
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

  private generateVideoId(filename: string): string {
    return path.parse(filename).name;
  }

  private async loadVideos(): Promise<void> {
    try {
      const files = fs.readdirSync(this.videoDir);
      
      // 通常のビデオファイルとTSファイルを分別
      const videoFiles = files.filter(file => 
        ['.mp4', '.avi', '.mov', '.mkv', '.webm'].some(ext => 
          file.toLowerCase().endsWith(ext)
        )
      );
      
      const tsFiles = files.filter(file => 
        file.toLowerCase().endsWith('.ts')
      );

      console.log(`Found ${videoFiles.length} video files and ${tsFiles.length} TS files in ${this.videoDir}`);
      
      // ビデオメタデータの生成（並列処理なし）
      const videoMetadatas: VideoMetadata[] = [];
      
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

          videoMetadatas.push(metadata);
          this.videos.set(videoId, metadata);
          console.log(`Loaded video metadata: ${file}`);
        } catch (error) {
          console.error(`Error loading video ${file}:`, error);
        }
      }

      // TSファイルのメタデータ生成
      for (const tsFile of tsFiles) {
        try {
          // 同名のMP4ファイルが存在するかチェック
          const baseName = path.basename(tsFile, '.ts');
          const mp4Exists = videoFiles.some(videoFile => 
            path.basename(videoFile, path.extname(videoFile)) === baseName
          );

          if (!mp4Exists) {
            const tsPath = path.join(this.videoDir, tsFile);
            const stats = fs.statSync(tsPath);
            const videoId = this.generateVideoId(tsFile);

            const metadata: VideoMetadata = {
              id: videoId,
              filename: tsFile,
              originalName: tsFile,
              path: tsPath,
              size: stats.size,
              mimetype: 'video/mp2t',
              thumbnailPath: '', // TSロゴサムネイルは後で設定
              uploadDate: stats.mtime,
              createdAt: stats.mtime,
              updatedAt: stats.mtime,
              timestamp: stats.mtime.toISOString(),
              playCount: 0,
              isFavorite: false,
              isTranscoding: false,
              isTs: true // TSファイルフラグ
            };

            this.videos.set(videoId, metadata);
            console.log(`Loaded TS file metadata: ${tsFile}`);
          } else {
            console.log(`Skipping TS file ${tsFile} - MP4 version exists`);
          }
        } catch (error) {
          console.error(`Error loading TS file ${tsFile}:`, error);
        }
      }

      // サムネイル生成を並列実行（TSファイルは除外）
      if (videoMetadatas.length > 0) {
        const nonTsVideos = videoMetadatas.filter(video => !video.path.toLowerCase().endsWith('.ts'));
        console.log(`🚀 Starting parallel thumbnail generation for ${nonTsVideos.length} videos (${videoMetadatas.length - nonTsVideos.length} TS files skipped)`);
        
        // TSファイル以外のみをサムネイル生成対象とする
        const thumbnailJobs = nonTsVideos.map(video => ({
          videoPath: video.path,
          videoId: video.id
        }));

        const result = await this.thumbnailGenerator.generateThumbnailsConcurrent(thumbnailJobs, {
          skipExisting: true,
          optimizeSettings: true
        });

        // サムネイルパスを更新
        result.successful.forEach(thumbnailPath => {
          const filename = path.basename(thumbnailPath);
          const videoId = filename.replace('_thumbnail.png', '');
          const video = this.videos.get(videoId);
          if (video) {
            video.thumbnailPath = thumbnailPath;
            console.log(`✅ Thumbnail linked: ${video.originalName}`);
          }
        });

        // エラー情報をログ出力
        result.failed.forEach(({ videoId, error }) => {
          console.error(`❌ Thumbnail generation failed for ${videoId}: ${error}`);
        });

        console.log(`🏁 Thumbnail generation completed: ${result.successful.length} successful, ${result.failed.length} failed`);
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
      // キャッシュ機能付きのサムネイル生成を使用
      const thumbnailPath = await this.thumbnailGenerator.generateThumbnailWithCache(
        video.path, 
        video.id
      );
      video.thumbnailPath = thumbnailPath;
      console.log(`Ensured thumbnail for ${video.originalName}: ${thumbnailPath}`);
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

  // フォルダ全体のサムネイル生成（高速化版）
  async generateThumbnailsForCurrentFolder(options?: {
    skipExisting?: boolean;
    maxConcurrency?: number;
  }): Promise<{ successful: number; failed: number }> {
    const result = await this.thumbnailGenerator.generateThumbnailsForFolder(this.videoDir, {
      skipExisting: options?.skipExisting ?? true,
      maxConcurrency: options?.maxConcurrency ?? undefined,
      optimizeSettings: true
    });

    // サムネイルパスを更新
    result.successful.forEach(thumbnailPath => {
      const filename = path.basename(thumbnailPath);
      const videoId = filename.replace('_thumbnail.png', '');
      const video = this.videos.get(videoId);
      if (video) {
        video.thumbnailPath = thumbnailPath;
      }
    });

    return { 
      successful: result.successful.length, 
      failed: result.failed.length 
    };
  }

  // サムネイル生成の統計情報取得
  getThumbnailStats(): {
    maxConcurrency: number;
    activeJobs: number;
    thumbnailDir: string;
    gpuCapabilities: any;
  } {
    return this.thumbnailGenerator.getStats();
  }

  // 超高速サムネイル生成
  async generateThumbnailsUltraFast(): Promise<{ successful: number; failed: number }> {
    const videos = Array.from(this.videos.values()).map(video => ({
      videoPath: video.path,
      videoId: video.id
    }));

    const result = await this.thumbnailGenerator.generateThumbnailsUltraFast(videos);

    // サムネイルパスを更新
    result.successful.forEach(thumbnailPath => {
      const filename = path.basename(thumbnailPath);
      const videoId = filename.replace('_thumbnail.png', '');
      const video = this.videos.get(videoId);
      if (video) {
        video.thumbnailPath = thumbnailPath;
      }
    });

    return { 
      successful: result.successful.length, 
      failed: result.failed.length 
    };
  }

  // プログレッシブサムネイル生成
  async generateThumbnailsProgressive(): Promise<{ successful: number; failed: number }> {
    const videos = Array.from(this.videos.values()).map(video => ({
      videoPath: video.path,
      videoId: video.id
    }));

    const result = await this.thumbnailGenerator.generateProgressiveThumbnails(videos);

    // サムネイルパスを更新
    result.successful.forEach(thumbnailPath => {
      const filename = path.basename(thumbnailPath);
      const videoId = filename.replace('_thumbnail.png', '');
      const video = this.videos.get(videoId);
      if (video) {
        video.thumbnailPath = thumbnailPath;
      }
    });

    return { 
      successful: result.successful.length, 
      failed: result.failed.length 
    };
  }

  // ===== 登録フォルダ管理機能 =====
  
  private readRegisteredFolders(): RegisteredFolder[] {
    try {
      if (!fs.existsSync(this.registeredFoldersFile)) {
        return [];
      }
      const content = fs.readFileSync(this.registeredFoldersFile, 'utf8');
      return JSON.parse(content) as RegisteredFolder[];
    } catch (error) {
      console.error('Failed to read registered folders:', error);
      return [];
    }
  }

  private writeRegisteredFolders(folders: RegisteredFolder[]): void {
    try {
      const dir = path.dirname(this.registeredFoldersFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.registeredFoldersFile, JSON.stringify(folders, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to write registered folders:', error);
    }
  }

  private generateFolderId(folderPath: string): string {
    return crypto.createHash('md5').update(path.resolve(folderPath)).digest('hex');
  }

  async getRegisteredFolders(): Promise<RegisteredFolder[]> {
    return this.readRegisteredFolders();
  }

  async addRegisteredFolder(folderPath: string, name?: string): Promise<RegisteredFolder> {
    if (!folderPath) {
      throw new Error('Folder path is required');
    }

    const resolvedPath = path.resolve(folderPath);
    
    // フォルダの存在確認
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Folder does not exist: ${resolvedPath}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`);
    }

    const folders = this.readRegisteredFolders();
    const id = this.generateFolderId(resolvedPath);
    const displayName = name || path.basename(resolvedPath);

    // 既存チェック（同じパスがあれば更新）
    const existingIndex = folders.findIndex(f => f.id === id);
    const newFolder: RegisteredFolder = {
      id,
      path: resolvedPath,
      name: displayName,
      createdAt: new Date()
    };

    if (existingIndex >= 0) {
      folders[existingIndex] = { ...folders[existingIndex], name: displayName };
    } else {
      folders.push(newFolder);
    }

    this.writeRegisteredFolders(folders);
    return newFolder;
  }

  async removeRegisteredFolder(id: string): Promise<void> {
    if (!id) {
      throw new Error('Folder ID is required');
    }

    const folders = this.readRegisteredFolders();
    const filteredFolders = folders.filter(f => f.id !== id);
    
    if (folders.length === filteredFolders.length) {
      throw new Error('Folder not found');
    }

    this.writeRegisteredFolders(filteredFolders);
  }

  async setRegisteredFolder(id: string): Promise<RegisteredFolder> {
    if (!id) {
      throw new Error('Folder ID is required');
    }

    const folders = this.readRegisteredFolders();
    const folder = folders.find(f => f.id === id);
    
    if (!folder) {
      throw new Error('Registered folder not found');
    }

    // フォルダの存在確認
    if (!fs.existsSync(folder.path)) {
      throw new Error(`Registered folder no longer exists: ${folder.path}`);
    }

    await this.changeVideoDirectory(folder.path);
    return folder;
  }

  // TSファイルのトランスコード開始
  async startTranscode(videoId: string): Promise<{ jobId: string }> {
    const video = this.videos.get(videoId);
    if (!video || !video.isTs) {
      throw new Error('TS video not found');
    }

    if (video.isTranscoding) {
      throw new Error('Video is already being transcoded');
    }

    console.log(`🔄 Starting transcode for: ${video.originalName}`);

    // トランスコード状態を更新
    video.isTranscoding = true;
    video.transcodeProgress = 0;

    const jobId = crypto.createHash('md5').update(`${videoId}-${Date.now()}`).digest('hex');

    // 簡易版：バックグラウンドでトランスコードを開始
    this.performTranscode(videoId, jobId).catch(error => {
      console.error(`Transcode failed for ${videoId}:`, error);
      // エラー時は状態をリセット
      if (this.videos.has(videoId)) {
        const failedVideo = this.videos.get(videoId)!;
        failedVideo.isTranscoding = false;
        failedVideo.transcodeProgress = 0;
      }
    });

    return { jobId };
  }

  // トランスコード進捗状況の取得
  async getTranscodeProgress(jobId: string): Promise<{ progress: number; status: string }> {
    // 簡易版：全てのビデオから進行中のものを検索
    for (const video of this.videos.values()) {
      if (video.isTranscoding) {
        return {
          progress: video.transcodeProgress || 0,
          status: 'transcoding'
        };
      }
    }

    return {
      progress: 100,
      status: 'completed'
    };
  }

  // 実際のトランスコード処理（プライベートメソッド）
  private async performTranscode(videoId: string, jobId: string): Promise<void> {
    const video = this.videos.get(videoId);
    if (!video || !video.isTs) {
      throw new Error('Video not found');
    }

    const inputPath = video.path;
    const outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, '.ts') + '.mp4');

    console.log(`📹 Transcoding ${inputPath} -> ${outputPath}`);

    try {
      // WSL環境対応のFFmpeg設定（CPU専用、固定品質）
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = require('ffmpeg-static');
      
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
      }

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v', 'libx264',      // H.264 video codec
            '-preset', 'fast',      // エンコード速度優先
            '-crf', '23',           // 固定品質
            '-c:a', 'aac',          // AAC audio codec
            '-b:a', '128k',         // 音声ビットレート
            '-movflags', '+faststart', // Web最適化
            '-y'                    // 上書き許可
          ])
          .on('start', (commandLine: string) => {
            console.log(`🚀 FFmpeg command: ${commandLine}`);
          })
          .on('progress', (progress: any) => {
            const percent = Math.round(progress.percent || 0);
            console.log(`📊 Transcode progress: ${percent}%`);
            
            // 進捗を更新
            if (this.videos.has(videoId)) {
              this.videos.get(videoId)!.transcodeProgress = percent;
            }
          })
          .on('end', () => {
            console.log('✅ Transcode completed successfully');
            resolve();
          })
          .on('error', (error: any) => {
            console.error('❌ Transcode error:', error);
            reject(error);
          })
          .save(outputPath);
      });

      // トランスコード完了後の処理
      const video = this.videos.get(videoId)!;
      video.isTranscoding = false;
      video.transcodeProgress = 100;

      console.log(`✅ Transcode completed: ${outputPath}`);

      // ビデオリストを再読み込み（新しいMP4ファイルを認識させる）
      setTimeout(() => {
        this.loadVideos();
      }, 1000);

    } catch (error) {
      console.error(`❌ Transcode failed for ${videoId}:`, error);
      
      // エラー時の状態リセット
      const video = this.videos.get(videoId);
      if (video) {
        video.isTranscoding = false;
        video.transcodeProgress = 0;
      }

      throw error;
    }
  }
}
