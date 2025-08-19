import { Request, Response } from 'express';
import VideoService from '../services/videoService';
import { RegisteredFolder } from '../types';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default class VideoController {
  private videoService: VideoService;

  constructor() {
    this.videoService = new VideoService();
  }

  async getAllVideos(req: Request, res: Response): Promise<void> {
    try {
      const videos = await this.videoService.getAllVideos();
      
      // サムネイル情報を含めてレスポンス
      const videosWithThumbnails = videos.map(video => {
        console.log(`Video: ${video.originalName}`);
        console.log(`Thumbnail path: ${video.thumbnailPath}`);
        
        const thumbnailUrl = video.thumbnailPath ? 
          `/api/thumbnails/${path.basename(video.thumbnailPath)}` : null;
        
        console.log(`Generated thumbnail URL: ${thumbnailUrl}`);
        
        return {
          id: video.id,
          title: video.originalName,
          filename: video.filename,
          originalName: video.originalName,
          size: video.size,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
          thumbnailUrl
        };
      });

      res.json({
        success: true,
        data: videosWithThumbnails
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch videos',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // サムネイル一覧専用のメソッドを追加
  async getAllThumbnails(req: Request, res: Response): Promise<void> {
    try {
      const videos = await this.videoService.getAllVideos();
      
      // サムネイル情報のみを返す
      const thumbnails = videos
        .filter(video => video.thumbnailPath) // サムネイルが存在するもののみ
        .map(video => ({
          videoId: video.id,
          title: video.originalName,
          url: `/api/thumbnails/${path.basename(video.thumbnailPath!)}`,
          createdAt: video.createdAt
        }));

      res.json(thumbnails);
    } catch (error) {
      console.error('Error fetching thumbnails:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch thumbnails',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVideoById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const video = await this.videoService.getVideoById(id);

      if (!video) {
        res.status(404).json({
          success: false,
          message: 'Video not found'
        });
        return;
      }

      // サムネイル情報を含めてレスポンス
      const videoWithThumbnail = {
        ...video,
        thumbnailUrl: video.thumbnailPath ? 
          `/api/thumbnails/${path.basename(video.thumbnailPath)}` : null
      };

      res.json({
        success: true,
        data: videoWithThumbnail
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch video',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async streamVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const video = await this.videoService.getVideoById(id);

      if (!video) {
        res.status(404).json({
          success: false,
          message: 'Video not found'
        });
        return;
      }

      const stat = fs.statSync(video.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(video.path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(video.path).pipe(res);
      }
    } catch (error) {
      console.error('Error streaming video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream video',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
        return;
      }

      console.log('Uploading video:', req.file);
      const video = await this.videoService.addVideo(req.file);
      
      // サムネイル情報を含めてレスポンス
      const videoWithThumbnail = {
        ...video,
        thumbnailUrl: video.thumbnailPath ? 
          `/api/thumbnails/${path.basename(video.thumbnailPath)}` : null
      };

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: videoWithThumbnail
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload video',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.videoService.deleteVideo(id);

      if (success) {
        res.json({
          success: true,
          message: 'Video deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async changeVideoFolder(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath, videoFiles, mode, folderId, name } = req.body;
      
      // 登録フォルダモード
      if (mode === 'registered') {
        if (!folderId) {
          res.status(400).json({
            success: false,
            message: 'folderId is required for registered mode'
          });
          return;
        }

        const folder = await this.videoService.setRegisteredFolder(folderId);
        res.json({
          success: true,
          message: 'Video folder changed to registered folder successfully',
          data: { folder, mode: 'registered' }
        });
        return;
      }
      
      // ローカルフォルダ設定モード
      if (mode === 'local-folder') {
        if (!folderPath) {
          res.status(400).json({
            success: false,
            message: 'Folder path is required for local-folder mode'
          });
          return;
        }

        // フォルダの存在確認
        if (!fs.existsSync(folderPath)) {
          res.status(400).json({
            success: false,
            message: `Folder does not exist: ${folderPath}`
          });
          return;
        }

        const stats = fs.statSync(folderPath);
        if (!stats.isDirectory()) {
          res.status(400).json({
            success: false,
            message: `Path is not a directory: ${folderPath}`
          });
          return;
        }

        console.log(`Setting work folder to: ${folderPath}`);
        await (this.videoService as any).changeVideoDirectory(folderPath);

        const response: ApiResponse = {
          success: true,
          message: 'Work folder set successfully',
          data: { newFolderPath: folderPath, mode: 'local-folder' }
        };
        res.json(response);
        return;
      }
      
      // ブラウザからのファイル情報が提供された場合
      if ((mode === 'browser-selection' || mode === 'fallback-files') && videoFiles && Array.isArray(videoFiles)) {
        console.log(`Processing ${mode}: ${videoFiles.length} videos`);
        
        // ファイル情報をログ出力
        videoFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
        });
        
        // ブラウザ選択モードでの処理
        const response: ApiResponse = {
          success: true,
          message: `${mode === 'browser-selection' ? 'ブラウザフォルダ' : 'ファイル'}選択が正常に処理されました`,
          data: { 
            mode: mode,
            videoCount: videoFiles.length,
            videos: videoFiles.map((file, index) => ({
              id: `${mode}-${index}`,
              originalName: file.name,
              size: file.size,
              lastModified: file.lastModified,
              type: file.type,
              isBrowserFile: true
            }))
          }
        };
        res.json(response);
        return;
      }

      // 従来のサーバーフォルダパス処理
      if (!folderPath) {
        res.status(400).json({
          success: false,
          message: 'Folder path or video files are required'
        });
        return;
      }

      if (!fs.existsSync(folderPath)) {
        res.status(400).json({
          success: false,
          message: 'Folder does not exist'
        });
        return;
      }

      const stats = fs.statSync(folderPath);
      if (!stats.isDirectory()) {
        res.status(400).json({
          success: false,
          message: 'Path is not a directory'
        });
        return;
      }

      console.log(`Changing video folder to: ${folderPath}`);
      await (this.videoService as any).changeVideoDirectory(folderPath);

      const response: ApiResponse = {
        success: true,
        message: 'Video folder changed successfully',
        data: { newFolderPath: folderPath }
      };
      res.json(response);
    } catch (error) {
      console.error('Change folder error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to change video folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  // ===== 登録フォルダ管理 =====
  
  async getRegisteredFolders(req: Request, res: Response): Promise<void> {
    try {
      const folders = await this.videoService.getRegisteredFolders();
      res.json({
        success: true,
        data: folders
      });
    } catch (error) {
      console.error('Error getting registered folders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get registered folders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addRegisteredFolder(req: Request, res: Response): Promise<void> {
    try {
      console.log('📝 Adding registered folder request:', req.body);
      const { path: folderPath, name } = req.body;
      
      if (!folderPath) {
        console.error('❌ No folder path provided');
        res.status(400).json({
          success: false,
          message: 'Folder path is required'
        });
        return;
      }

      console.log(`📁 Attempting to register folder: ${folderPath} with name: ${name || 'auto'}`);
      const folder = await this.videoService.addRegisteredFolder(folderPath, name);
      console.log('✅ Folder registered successfully:', folder);
      
      res.json({
        success: true,
        message: 'Folder registered successfully',
        data: folder
      });
    } catch (error) {
      console.error('❌ Error adding registered folder:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to register folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removeRegisteredFolder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
        return;
      }

      await this.videoService.removeRegisteredFolder(id);
      res.json({
        success: true,
        message: 'Folder removed successfully'
      });
    } catch (error) {
      console.error('Error removing registered folder:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to remove folder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 並列サムネイル生成API
  async generateThumbnailsBatch(req: Request, res: Response): Promise<void> {
    try {
      const { skipExisting = true, maxConcurrency } = req.body;
      
      console.log(`📊 Starting batch thumbnail generation`);
      console.log(`Skip existing: ${skipExisting}`);
      console.log(`Max concurrency: ${maxConcurrency || 'auto'}`);

      const result = await this.videoService.generateThumbnailsForCurrentFolder({
        skipExisting,
        maxConcurrency
      });

      res.json({
        success: true,
        message: `Thumbnail generation completed`,
        data: {
          successful: result.successful,
          failed: result.failed,
          total: result.successful + result.failed,
          stats: this.videoService.getThumbnailStats()
        }
      });
    } catch (error) {
      console.error('Error in batch thumbnail generation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate thumbnails',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // サムネイル生成統計情報API
  async getThumbnailStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.videoService.getThumbnailStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting thumbnail stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get thumbnail stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 超高速サムネイル生成API
  async generateThumbnailsUltraFast(req: Request, res: Response): Promise<void> {
    try {
      console.log(`⚡ Starting ultra-fast thumbnail generation`);

      const result = await this.videoService.generateThumbnailsUltraFast();

      res.json({
        success: true,
        message: `Ultra-fast thumbnail generation completed`,
        data: {
          successful: result.successful,
          failed: result.failed,
          total: result.successful + result.failed,
          mode: 'ultra-fast',
          stats: this.videoService.getThumbnailStats()
        }
      });
    } catch (error) {
      console.error('Error in ultra-fast thumbnail generation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate thumbnails in ultra-fast mode',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // プログレッシブサムネイル生成API
  async generateThumbnailsProgressive(req: Request, res: Response): Promise<void> {
    try {
      console.log(`🎯 Starting progressive thumbnail generation`);

      const result = await this.videoService.generateThumbnailsProgressive();

      res.json({
        success: true,
        message: `Progressive thumbnail generation completed`,
        data: {
          successful: result.successful,
          failed: result.failed,
          total: result.successful + result.failed,
          mode: 'progressive',
          stats: this.videoService.getThumbnailStats()
        }
      });
    } catch (error) {
      console.error('Error in progressive thumbnail generation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate thumbnails in progressive mode',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}