import { Request, Response } from 'express';
import VideoService from '../services/videoService';
import path from 'path';

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

      const fs = require('fs');
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
}