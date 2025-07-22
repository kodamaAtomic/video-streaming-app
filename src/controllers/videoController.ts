import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import VideoService from '../services/videoService';
import { ApiResponse } from '../types';

export class VideoController {
  private videoService: VideoService;

  constructor() {
    this.videoService = new VideoService();
  }

  async getAllVideos(req: Request, res: Response): Promise<void> {
    try {
      const videos = await this.videoService.getAllVideos();
      const response: ApiResponse = {
        success: true,
        data: videos
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch videos',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  async getVideoById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const video = await this.videoService.getVideoById(id);
      
      if (!video) {
        const response: ApiResponse = {
          success: false,
          message: 'Video not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: video
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch video',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        const response: ApiResponse = {
          success: false,
          message: 'No file uploaded'
        };
        res.status(400).json(response);
        return;
      }

      const video = await this.videoService.addVideo(req.file);
      const response: ApiResponse = {
        success: true,
        data: video,
        message: 'Video uploaded successfully'
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to upload video',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
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

      const videoPath = video.path;
      
      // ファイルの存在確認
      if (!fs.existsSync(videoPath)) {
        res.status(404).json({
          success: false,
          message: 'Video file not found'
        });
        return;
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // 範囲リクエストの処理
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // 通常のレスポンス
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('Video streaming error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream video'
      });
    }
  }

  async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.videoService.deleteVideo(id);
      
      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Video not found or failed to delete'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Video deleted successfully'
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete video',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }
}

export default VideoController;