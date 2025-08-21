import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { VideoMetadata, RegisteredFolder } from '../types';
import ThumbnailGenerator from './thumbnailGenerator';

export default class VideoService {
  private videoDir: string;
  private readonly thumbnailGenerator: ThumbnailGenerator;
  private videos: Map<string, VideoMetadata> = new Map();
  private readonly registeredFoldersFile: string;
  private transcodeProcesses: Map<string, any> = new Map(); // FFmpegプロセス管理
  private backgroundThumbnailProgress: {
    isGenerating: boolean;
    total: number;
    completed: number;
    currentVideo?: string;
  };
  private isGeneratingThumbnails = false; // 重複実行防止フラグ
  private isChangingDirectory = false; // ディレクトリ変更中フラグ
  private cancelThumbnailGeneration = false; // サムネイル生成キャンセルフラグ
  private existingThumbnails = new Map<string, string>(); // サムネイル保持用（videoId -> thumbnailPath）

  constructor(videoDir?: string) {
    this.videoDir = videoDir || path.join(__dirname, '../storage/videos');
    this.thumbnailGenerator = new ThumbnailGenerator(path.join(__dirname, '../storage/thumbnails'));
    this.registeredFoldersFile = path.join(__dirname, '../storage/registeredFolders.json');
    this.backgroundThumbnailProgress = {
      isGenerating: false,
      total: 0,
      completed: 0,
      currentVideo: undefined
    };
    this.isGeneratingThumbnails = false; // ロックフラグを初期化
    this.isChangingDirectory = false; // ディレクトリ変更ロックを初期化
    this.cancelThumbnailGeneration = false; // キャンセルフラグを初期化
    this.existingThumbnails = new Map(); // 既存サムネイル保持用を初期化
    console.log(`Video directory set to: ${this.videoDir}`);
    console.log(`Current __dirname: ${__dirname}`);
    this.initializeVideoDir();
    this.loadVideos();
  }

  get videoDirectory(): string {
    return this.videoDir;
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
    await this.loadVideoMetadataOnly();
    await this.generateThumbnailsInBackground();
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
    console.log('🔍 VideoService.getAllVideos called');
    console.log(`📊 Current videos map size: ${this.videos.size}`);
    
    const videosArray = Array.from(this.videos.values());
    console.log(`🔄 Converting to array: ${videosArray.length} videos`);
    
    // 各ビデオのサムネイル状況を確認
    videosArray.forEach((video, index) => {
      // サムネイルパスが未設定の場合、既存のサムネイルから復元を試行
      if (!video.thumbnailPath && this.existingThumbnails.has(video.id)) {
        const cachedPath = this.existingThumbnails.get(video.id);
        if (cachedPath && fs.existsSync(cachedPath)) {
          video.thumbnailPath = cachedPath;
          console.log(`  🔄 Restored thumbnail path for ${video.originalName}: ${cachedPath}`);
        }
      }
      
      const thumbnailStatus = video.thumbnailPath ? 
        (fs.existsSync(video.thumbnailPath) ? '✅ exists' : '❌ missing') : 
        '⚪ no path';
      console.log(`  Video ${index + 1}: ${video.originalName} - thumbnail: ${thumbnailStatus}`);
      
      // サムネイルパスが設定されているが実際のファイルが存在しない場合はパスをクリア
      if (video.thumbnailPath && !fs.existsSync(video.thumbnailPath)) {
        console.log(`  🧹 Clearing invalid thumbnail path for ${video.originalName}`);
        video.thumbnailPath = undefined;
      }
    });
    
    console.log('✅ VideoService.getAllVideos completed');
    return videosArray;
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
    // 既にディレクトリ変更中の場合は待機
    if (this.isChangingDirectory) {
      console.log('🛑 Directory change already in progress, skipping duplicate request');
      return;
    }

    if (!fs.existsSync(newPath)) {
      throw new Error(`Directory does not exist: ${newPath}`);
    }

    const stats = fs.statSync(newPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${newPath}`);
    }

    try {
      // ディレクトリ変更ロックを設定
      this.isChangingDirectory = true;

      // サムネイル生成中の場合は完了を待機（キャンセルしない）
      if (this.isGeneratingThumbnails) {
        console.log('⏳ Waiting for current thumbnail generation to complete before changing directory...');
        console.log('📊 Current generation will continue to completion to preserve progress');
        
        // 最大5分待機（大量ファイル処理への対応）
        let waitTime = 0;
        const maxWaitTime = 300000; // 5分
        const checkInterval = 2000; // 2秒

        while (this.isGeneratingThumbnails && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          
          // 進行状況をログに表示（10秒ごと）
          if (waitTime % 10000 === 0) {
            console.log(`⏳ Still waiting for thumbnail generation... (${waitTime/1000}s elapsed)`);
            console.log(`📊 Progress: ${this.backgroundThumbnailProgress.completed}/${this.backgroundThumbnailProgress.total}`);
          }
        }

        if (this.isGeneratingThumbnails) {
          console.log('⚠️ Thumbnail generation taking too long, proceeding with directory change');
          console.log('⚠️ Previous generation may continue in background');
        } else {
          console.log('✅ Previous thumbnail generation completed successfully');
        }
      }

      console.log(`Changing video directory from ${this.videoDir} to ${newPath}`);
      
      // 現在のビデオとサムネイル情報をバックアップ（累積式）
      for (const [videoId, video] of this.videos.entries()) {
        if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
          this.existingThumbnails.set(videoId, video.thumbnailPath);
          console.log(`💾 Backing up thumbnail: ${videoId} -> ${video.thumbnailPath}`);
        }
      }
      
      this.videoDir = newPath;
      
      console.log(`Video directory changed to: ${this.videoDir}`);
      
      // サムネイル生成を非同期で開始
      await this.loadVideosAsync();
    } finally {
      // ディレクトリ変更ロックを解除
      this.isChangingDirectory = false;
      console.log('🔓 Directory change lock released');
    }
  }

  // 非同期でのビデオロード（サムネイル生成を含む）
  private async loadVideosAsync(): Promise<void> {
    try {
      // まずはビデオメタデータのみロード
      await this.loadVideoMetadataOnly();
      
      // サムネイル生成を非同期で開始
      this.generateThumbnailsInBackground();
    } catch (error) {
      console.error('Error in async video loading:', error);
    }
  }

  // ビデオメタデータのみをロード（サムネイル生成なし）
  private async loadVideoMetadataOnly(): Promise<void> {
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
      console.log(`📦 Existing thumbnails to restore: ${this.existingThumbnails.size}`);
      
      // ビデオリストをクリア
      this.videos.clear();
      
      // ビデオメタデータの生成（並列処理なし）
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

          // 既存のサムネイル情報を復元
          console.log(`🔍 Checking thumbnail restoration for ${videoId} (file: ${file})`);
          console.log(`📋 Available backup keys: ${Array.from(this.existingThumbnails.keys()).join(', ')}`);
          
          // バックアップから復元を試行
          if (this.existingThumbnails.has(videoId)) {
            const thumbnailPath = this.existingThumbnails.get(videoId);
            console.log(`📋 Found existing thumbnail path: ${thumbnailPath}`);
            // サムネイルファイルが実際に存在するかチェック
            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
              metadata.thumbnailPath = thumbnailPath;
              console.log(`🔄 Restored thumbnail for ${file}: ${thumbnailPath}`);
            } else {
              console.log(`❌ Thumbnail file does not exist: ${thumbnailPath}`);
            }
          } else {
            // バックアップがない場合、デフォルトパスで直接チェック
            const defaultThumbnailPath = path.join(__dirname, '../storage/thumbnails', `${videoId}_thumbnail.png`);
            if (fs.existsSync(defaultThumbnailPath)) {
              metadata.thumbnailPath = defaultThumbnailPath;
              console.log(`🔍 Found thumbnail at default location for ${file}: ${defaultThumbnailPath}`);
              // 見つかったサムネイルをバックアップに追加
              this.existingThumbnails.set(videoId, defaultThumbnailPath);
            } else {
              console.log(`🆕 No existing thumbnail found for ${videoId}, will generate new one`);
            }
          }

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

      console.log(`📊 Loaded ${this.videos.size} video metadata entries`);
    } catch (error) {
      console.error('Error loading video metadata:', error);
    }
  }

  // バックグラウンドでサムネイル生成を実行
  private async generateThumbnailsInBackground(): Promise<void> {
    // 既に生成中の場合は重複実行を防ぐ
    if (this.isGeneratingThumbnails) {
      console.log('🛑 Thumbnail generation already in progress, skipping duplicate execution');
      return;
    }

    try {
      // ロックを設定
      this.isGeneratingThumbnails = true;
      
      const videoMetadatas = Array.from(this.videos.values());
      const nonTsVideos = videoMetadatas.filter(video => !video.path.toLowerCase().endsWith('.ts'));
      
      if (nonTsVideos.length === 0) {
        console.log('No videos require thumbnail generation');
        return;
      }

      // 既にサムネイルが存在するかチェックして、生成が必要なビデオのみをフィルタリング
      const videosNeedingThumbnails = nonTsVideos.filter(video => {
        if (!video.thumbnailPath) return true;
        
        const thumbnailExists = fs.existsSync(video.thumbnailPath);
        if (thumbnailExists) {
          console.log(`⏭️ Thumbnail already exists: ${video.originalName}`);
          return false;
        }
        return true;
      });

      if (videosNeedingThumbnails.length === 0) {
        console.log('🎉 All videos already have thumbnails, no generation needed');
        // プログレス状態を完了状態に設定
        this.backgroundThumbnailProgress = {
          isGenerating: false,
          total: nonTsVideos.length,
          completed: nonTsVideos.length,
          currentVideo: undefined
        };
        return;
      }

      // プログレス状態を更新
      this.backgroundThumbnailProgress = {
        isGenerating: true,
        total: nonTsVideos.length,
        completed: nonTsVideos.length - videosNeedingThumbnails.length, // 既存のサムネイル数
        currentVideo: undefined
      };

      console.log(`🚀 Starting background thumbnail generation for ${videosNeedingThumbnails.length} videos (${this.backgroundThumbnailProgress.completed} already exist)`);
      
      // サムネイル生成が必要な動画のみを対象とする
      const thumbnailJobs = videosNeedingThumbnails.map(video => ({
        videoPath: video.path,
        videoId: video.id
      }));

      // 進行状況を追跡できるように順次実行に変更
      let completedCount = this.backgroundThumbnailProgress.completed; // 既存のサムネイル数から開始
      const successfulPaths: string[] = [];
      const failedJobs: { videoId: string; error: string }[] = [];

      for (const job of thumbnailJobs) {
        this.backgroundThumbnailProgress.currentVideo = this.videos.get(job.videoId)?.originalName;
        
        try {
          const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(
            job.videoPath, 
            job.videoId
          );
          
          if (thumbnailPath) {
            successfulPaths.push(thumbnailPath);
            const video = this.videos.get(job.videoId);
            if (video) {
              video.thumbnailPath = thumbnailPath;
              console.log(`✅ Thumbnail generated: ${video.originalName}`);
            }
          }
        } catch (error) {
          console.error(`❌ Thumbnail generation failed for ${job.videoId}: ${error}`);
          failedJobs.push({ videoId: job.videoId, error: String(error) });
        }

        completedCount++;
        this.backgroundThumbnailProgress.completed = completedCount;
      }

            // 完了
            console.log(`✅ Background thumbnail generation completed! Generated ${successfulPaths.length} new thumbnails`);
            
            // プログレス状態を完了状態に更新
            this.backgroundThumbnailProgress = {
                isGenerating: false,
                total: nonTsVideos.length,
                completed: nonTsVideos.length,
                currentVideo: undefined
            };
            
            console.log('📊 Final progress state:', this.backgroundThumbnailProgress);      
            console.log(`🏁 Background thumbnail generation finished: ${successfulPaths.length} successful, ${failedJobs.length} failed`);
    } catch (error) {
      console.error('Error in background thumbnail generation:', error);
      // エラー時もプログレス状態をリセット
      this.backgroundThumbnailProgress = {
        isGenerating: false,
        total: 0,
        completed: 0,
        currentVideo: undefined
      };
    } finally {
      // ロックを解除
      this.isGeneratingThumbnails = false;
      console.log('🔓 Thumbnail generation lock released');
    }
  }

  // サムネイル生成の進行状況を取得
  getThumbnailGenerationProgress() {
    // 現在のフォルダでサムネイル生成が進行中でない場合、
    // 実際の状況を確認してから返す
    if (!this.backgroundThumbnailProgress.isGenerating) {
      // 現在のビデオ数とサムネイル数を確認
      const totalVideos = Array.from(this.videos.values()).filter(v => !v.isTs).length;
      
      // 実際にサムネイルファイルが存在するかチェック
      let videosWithThumbnails = 0;
      for (const video of this.videos.values()) {
        if (!video.isTs && video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
          videosWithThumbnails++;
        }
      }
      
      // 実際の状況を反映
      const progress = {
        ...this.backgroundThumbnailProgress,
        total: totalVideos,
        completed: videosWithThumbnails,
        active: this.backgroundThumbnailProgress.isGenerating
      };
      
      console.log(`📊 Current progress check: ${videosWithThumbnails}/${totalVideos} thumbnails exist (active: ${progress.active})`);
      return progress;
    }
    
    // 生成中の場合はactiveフィールドを追加して返す
    return { 
      ...this.backgroundThumbnailProgress,
      active: this.backgroundThumbnailProgress.isGenerating
    };
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
    totalVideos: number;
    totalThumbnails: number;
  } {
    const baseStats = this.thumbnailGenerator.getStats();
    
    // サムネイルファイル数をカウント
    let thumbnailCount = 0;
    try {
      if (fs.existsSync(baseStats.thumbnailDir)) {
        const thumbnailFiles = fs.readdirSync(baseStats.thumbnailDir)
          .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
        thumbnailCount = thumbnailFiles.length;
      }
    } catch (error) {
      console.error('Error counting thumbnails:', error);
    }
    
    return {
      ...baseStats,
      totalVideos: this.videos.size,
      totalThumbnails: thumbnailCount
    };
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

  // トランスコード中断機能
  async cancelTranscode(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 実行中のFFmpegプロセスを停止
      const ffmpegProcess = this.transcodeProcesses.get(jobId);
      if (ffmpegProcess) {
        console.log(`🛑 Cancelling transcode job: ${jobId}`);
        
        // FFmpegプロセスを強制終了
        if (ffmpegProcess.kill) {
          ffmpegProcess.kill('SIGKILL');
        }
        
        // プロセス管理マップから削除
        this.transcodeProcesses.delete(jobId);
      }

      // 実行中のトランスコードを見つけて停止
      const transcodingVideo = Array.from(this.videos.values()).find(v => v.isTranscoding);
      if (transcodingVideo) {
        console.log(`🔄 Resetting video state: ${transcodingVideo.originalName}`);
        
        // 出力ファイルのパスを生成
        const outputPath = path.join(path.dirname(transcodingVideo.path), path.basename(transcodingVideo.path, '.ts') + '.mp4');
        
        // 作成中のMP4ファイルを削除
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
            console.log(`🗑️ Deleted partial MP4 file: ${outputPath}`);
          } catch (deleteError) {
            console.warn(`⚠️ Could not delete partial MP4 file: ${deleteError}`);
          }
        }

        // TSファイルの状態をリセット（プログレスは保持しない）
        transcodingVideo.isTranscoding = false;
        transcodingVideo.transcodeProgress = 0; // 中断時は0にリセット
        
        console.log(`✅ Transcode cancelled for: ${transcodingVideo.originalName}`);
        
        return {
          success: true,
          message: 'Transcode cancelled successfully'
        };
      }

      return {
        success: false,
        message: 'No active transcode job found'
      };

    } catch (error) {
      console.error('❌ Error cancelling transcode:', error);
      return {
        success: false,
        message: 'Failed to cancel transcode'
      };
    }
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
      // プラットフォームとGPU機能に基づいて最適なエンコーダーを選択
      const optimalEncoder = this.thumbnailGenerator.getOptimalEncoderOptions();
      const platformInfo = this.thumbnailGenerator.getPlatformInfo();
      const gpuCapabilities = this.thumbnailGenerator.getGPUCapabilities();

      console.log(`🖥️ Platform: ${platformInfo.platform} (${platformInfo.arch}) - ${platformInfo.cpus} CPUs`);
      console.log(`🎮 GPU Status: VAAPI=${gpuCapabilities.vaapi ? '✅' : '❌'}, NVENC=${gpuCapabilities.nvenc ? '✅' : '❌'}, QSV=${gpuCapabilities.qsv ? '✅' : '❌'}`);
      console.log(`⚡ Selected encoder: ${optimalEncoder.description}`);

      // WSL環境対応のFFmpeg設定
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = require('ffmpeg-static');
      
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
      }

      // エンコーダーオプション構築
      let outputOptions = [
        ...optimalEncoder.video,  // 最適なビデオエンコーダー
        '-c:a', 'aac',           // AAC audio codec
        '-b:a', '128k',          // 音声ビットレート
        '-movflags', '+faststart', // Web最適化
        '-y'                     // 上書き許可
      ];

      // CPU エンコーダーの場合は品質設定を追加
      if (optimalEncoder.description.includes('CPU')) {
        outputOptions.push('-crf', '23');  // 固定品質
      }

      console.log(`🛠️ FFmpeg options: ${outputOptions.join(' ')}`);

      await new Promise<void>((resolve, reject) => {
        const ffmpegProcess = ffmpeg(inputPath)
          .outputOptions(outputOptions)
          .on('start', (commandLine: string) => {
            console.log(`🚀 FFmpeg command: ${commandLine}`);
            // プロセスを管理マップに追加
            this.transcodeProcesses.set(jobId, ffmpegProcess);
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
            // プロセス管理マップから削除
            this.transcodeProcesses.delete(jobId);
            resolve();
          })
          .on('error', (error: any) => {
            console.error('❌ Transcode error:', error);
            // プロセス管理マップから削除
            this.transcodeProcesses.delete(jobId);
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

  // GPU機能とプラットフォーム情報の取得
  getSystemInfo(): { 
    gpu: any; 
    platform: { platform: string; arch: string; cpus: number }; 
    encoder: { video: string[]; description: string } 
  } {
    return {
      gpu: this.thumbnailGenerator.getGPUCapabilities(),
      platform: this.thumbnailGenerator.getPlatformInfo(),
      encoder: this.thumbnailGenerator.getOptimalEncoderOptions()
    };
  }

  // 個別動画のサムネイル生成
  async generateSingleThumbnail(videoId: string): Promise<{ success: boolean; thumbnailUrl?: string; filePath?: string; message?: string }> {
    try {
      const video = this.videos.get(videoId);
      if (!video) {
        return {
          success: false,
          message: 'Video not found'
        };
      }

      console.log(`🎬 Generating thumbnail for: ${video.originalName}`);
      
      // ファイルパスの存在確認
      const videoFilePath = path.join(this.videoDir, video.filename);
      if (!fs.existsSync(videoFilePath)) {
        console.error(`❌ Video file not found: ${videoFilePath}`);
        return {
          success: false,
          message: `Video file not found: ${video.filename}`
        };
      }
      
      const thumbnailPath = await this.thumbnailGenerator.generateThumbnail(
        videoFilePath, 
        video.id
      );

      if (thumbnailPath) {
        // サムネイル情報をビデオメタデータに更新
        const thumbnailFilename = path.basename(thumbnailPath);
        const thumbnailUrl = `/api/thumbnails/${encodeURIComponent(thumbnailFilename)}`;
        
        // VideoMetadata型にthumbnailUrlプロパティを追加
        (video as any).thumbnailUrl = thumbnailUrl;

        console.log(`✅ Thumbnail generated successfully: ${thumbnailUrl}`);

        return {
          success: true,
          thumbnailUrl: thumbnailUrl,
          filePath: thumbnailPath
        };
      } else {
        return {
          success: false,
          message: 'Failed to generate thumbnail'
        };
      }
    } catch (error) {
      console.error(`❌ Error generating thumbnail for ${videoId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
