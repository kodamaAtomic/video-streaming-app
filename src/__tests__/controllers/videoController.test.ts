import { Request, Response } from 'express';
import VideoController from '../../controllers/videoController';
import VideoService from '../../services/videoService';
import fs from 'fs';

// Mock dependencies
jest.mock('../../services/videoService');
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  parse: jest.fn((filePath) => ({
    root: '/',
    dir: '/test',
    base: 'test.mp4',
    ext: '.mp4',
    name: 'test'
  })),
  extname: jest.fn((fileName) => '.mp4'),
  basename: jest.fn((fileName) => {
    // Extract filename from path
    const parts = fileName.split('/');
    return parts[parts.length - 1];
  }),
  resolve: jest.fn((filePath) => `/resolved/${filePath}`),
  dirname: jest.fn((filePath) => '/test')
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const MockVideoService = VideoService as jest.MockedClass<typeof VideoService>;

// Mock types
interface MockRequest extends Partial<Request> {
  params?: any;
  body?: any;
  file?: Express.Multer.File;
  headers?: any;
}

interface MockResponse extends Partial<Response> {
  json: jest.Mock;
  status: jest.Mock;
  writeHead: jest.Mock;
  pipe: jest.Mock;
}

describe('VideoController', () => {
  let videoController: VideoController;
  let mockVideoService: jest.Mocked<VideoService>;
  let mockReq: MockRequest;
  let mockRes: MockResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock VideoService
    mockVideoService = new MockVideoService() as jest.Mocked<VideoService>;
    MockVideoService.mockImplementation(() => mockVideoService);
    
    videoController = new VideoController();
    
    // Mock response object
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      writeHead: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
    };
    
    // Mock request object
    mockReq = {
      params: {},
      body: {},
      headers: {}
    };
  });

  describe('getAllVideos', () => {
    it('should return all videos successfully', async () => {
      const mockVideos = [
        {
          id: 'video1',
          originalName: 'test1.mp4',
          filename: 'test1.mp4',
          size: 1024000,
          createdAt: new Date(),
          updatedAt: new Date(),
          thumbnailPath: '/thumbnails/test1.jpg'
        },
        {
          id: 'video2',
          originalName: 'test2.mp4',
          filename: 'test2.mp4',
          size: 2048000,
          createdAt: new Date(),
          updatedAt: new Date(),
          thumbnailPath: null
        }
      ];

      mockVideoService.getAllVideos.mockResolvedValue(mockVideos as any);

      await videoController.getAllVideos(mockReq as Request, mockRes as Response);

      expect(mockVideoService.getAllVideos).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'video1',
            title: 'test1.mp4',
            thumbnailUrl: '/api/thumbnails/test1.jpg'
          }),
          expect.objectContaining({
            id: 'video2',
            title: 'test2.mp4',
            thumbnailUrl: null
          })
        ])
      });
    });

    it('should handle errors when fetching videos', async () => {
      const error = new Error('Database error');
      mockVideoService.getAllVideos.mockRejectedValue(error);

      await videoController.getAllVideos(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch videos',
        error: 'Database error'
      });
    });
  });

  describe('getVideoById', () => {
    it('should return video by ID successfully', async () => {
      const mockVideo = {
        id: 'video1',
        originalName: 'test1.mp4',
        filename: 'test1.mp4',
        path: '/videos/test1.mp4',
        size: 1024000,
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailPath: '/thumbnails/test1.jpg'
      };

      mockReq.params = { id: 'video1' };
      mockVideoService.getVideoById.mockResolvedValue(mockVideo as any);

      await videoController.getVideoById(mockReq as Request, mockRes as Response);

      expect(mockVideoService.getVideoById).toHaveBeenCalledWith('video1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ...mockVideo,
          thumbnailUrl: '/api/thumbnails/test1.jpg'
        })
      });
    });

    it('should return 404 when video not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockVideoService.getVideoById.mockResolvedValue(undefined);

      await videoController.getVideoById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Video not found'
      });
    });

    it('should handle errors when fetching video', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'video1' };
      mockVideoService.getVideoById.mockRejectedValue(error);

      await videoController.getVideoById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch video',
        error: 'Database error'
      });
    });
  });

  describe('uploadVideo', () => {
    it('should upload video successfully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-upload.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024000,
        destination: '/uploads',
        filename: 'test-upload-123.mp4',
        path: '/uploads/test-upload-123.mp4',
        buffer: Buffer.from(''),
        stream: {} as any
      };

      const mockVideo = {
        id: 'upload1',
        originalName: 'test-upload.mp4',
        filename: 'test-upload-123.mp4',
        path: '/uploads/test-upload-123.mp4',
        size: 1024000,
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailPath: '/thumbnails/upload1.jpg'
      };

      mockReq.file = mockFile;
      mockVideoService.addVideo.mockResolvedValue(mockVideo as any);

      await videoController.uploadVideo(mockReq as Request, mockRes as Response);

      expect(mockVideoService.addVideo).toHaveBeenCalledWith(mockFile);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Video uploaded successfully',
        data: expect.objectContaining({
          ...mockVideo,
          thumbnailUrl: '/api/thumbnails/upload1.jpg'
        })
      });
    });

    it('should return error when no file provided', async () => {
      mockReq.file = undefined;

      await videoController.uploadVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No video file provided'
      });
    });

    it('should handle upload errors', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-upload.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024000,
        destination: '/uploads',
        filename: 'test-upload-123.mp4',
        path: '/uploads/test-upload-123.mp4',
        buffer: Buffer.from(''),
        stream: {} as any
      };

      const error = new Error('Upload failed');
      mockReq.file = mockFile;
      mockVideoService.addVideo.mockRejectedValue(error);

      await videoController.uploadVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to upload video',
        error: 'Upload failed'
      });
    });
  });

  describe('deleteVideo', () => {
    it('should delete video successfully', async () => {
      mockReq.params = { id: 'video1' };
      mockVideoService.deleteVideo.mockResolvedValue(true);

      await videoController.deleteVideo(mockReq as Request, mockRes as Response);

      expect(mockVideoService.deleteVideo).toHaveBeenCalledWith('video1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Video deleted successfully'
      });
    });

    it('should return 404 when video not found for deletion', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockVideoService.deleteVideo.mockResolvedValue(false);

      await videoController.deleteVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Video not found'
      });
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockReq.params = { id: 'video1' };
      mockVideoService.deleteVideo.mockRejectedValue(error);

      await videoController.deleteVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete video',
        error: 'Delete failed'
      });
    });
  });

  describe('streamVideo', () => {
    it('should stream video without range header', async () => {
      const mockVideo = {
        id: 'video1',
        path: '/videos/test1.mp4',
        originalName: 'test1.mp4',
        size: 1024000
      };

      mockReq.params = { id: 'video1' };
      mockReq.headers = {};
      
      mockVideoService.getVideoById.mockResolvedValue(mockVideo as any);
      mockFs.statSync.mockReturnValue({ size: 1024000 } as any);
      
      const mockReadStream = { pipe: jest.fn() };
      mockFs.createReadStream = jest.fn().mockReturnValue(mockReadStream);

      await videoController.streamVideo(mockReq as Request, mockRes as Response);

      expect(mockVideoService.getVideoById).toHaveBeenCalledWith('video1');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Length': 1024000,
        'Content-Type': 'video/mp4'
      });
      expect(mockReadStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should handle range requests for partial content', async () => {
      const mockVideo = {
        id: 'video1',
        path: '/videos/test1.mp4',
        originalName: 'test1.mp4',
        size: 1024000
      };

      mockReq.params = { id: 'video1' };
      mockReq.headers = { range: 'bytes=0-1023' };
      
      mockVideoService.getVideoById.mockResolvedValue(mockVideo as any);
      mockFs.statSync.mockReturnValue({ size: 1024000 } as any);
      
      const mockReadStream = { pipe: jest.fn() };
      mockFs.createReadStream = jest.fn().mockReturnValue(mockReadStream);

      await videoController.streamVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.writeHead).toHaveBeenCalledWith(206, {
        'Content-Range': 'bytes 0-1023/1024000',
        'Accept-Ranges': 'bytes',
        'Content-Length': 1024,
        'Content-Type': 'video/mp4'
      });
      expect(mockReadStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should return 404 for non-existent video streaming', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockVideoService.getVideoById.mockResolvedValue(undefined);

      await videoController.streamVideo(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Video not found'
      });
    });
  });

  describe('changeVideoFolder', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    });

    it('should change folder with registered mode', async () => {
      const mockFolder = {
        id: 'folder1',
        path: '/registered/folder',
        name: 'Test Folder',
        createdAt: new Date()
      };

      mockReq.body = {
        mode: 'registered',
        folderId: 'folder1'
      };

      mockVideoService.setRegisteredFolder.mockResolvedValue(mockFolder);

      await videoController.changeVideoFolder(mockReq as Request, mockRes as Response);

      expect(mockVideoService.setRegisteredFolder).toHaveBeenCalledWith('folder1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Video folder changed to registered folder successfully',
        data: { folder: mockFolder, mode: 'registered' }
      });
    });

    it('should change folder with local-folder mode', async () => {
      mockReq.body = {
        mode: 'local-folder',
        folderPath: '/local/videos'
      };

      await videoController.changeVideoFolder(mockReq as Request, mockRes as Response);

      expect(mockFs.existsSync).toHaveBeenCalledWith('/local/videos');
      expect(mockFs.statSync).toHaveBeenCalledWith('/local/videos');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Work folder set successfully',
        data: { newFolderPath: '/local/videos', mode: 'local-folder' }
      });
    });

    it('should handle browser-selection mode', async () => {
      const mockVideoFiles = [
        { name: 'video1.mp4', size: 1024000, lastModified: Date.now(), type: 'video/mp4' },
        { name: 'video2.mp4', size: 2048000, lastModified: Date.now(), type: 'video/mp4' }
      ];

      mockReq.body = {
        mode: 'browser-selection',
        videoFiles: mockVideoFiles
      };

      await videoController.changeVideoFolder(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ブラウザフォルダ選択が正常に処理されました',
        data: {
          mode: 'browser-selection',
          videoCount: 2,
          videos: expect.arrayContaining([
            expect.objectContaining({
              originalName: 'video1.mp4',
              size: 1024000,
              isBrowserFile: true
            })
          ])
        }
      });
    });

    it('should return error for non-existent folder', async () => {
      mockReq.body = {
        mode: 'local-folder',
        folderPath: '/nonexistent'
      };

      mockFs.existsSync.mockReturnValue(false);

      await videoController.changeVideoFolder(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Folder does not exist: /nonexistent'
      });
    });
  });

  describe('Registered Folders', () => {
    describe('getRegisteredFolders', () => {
      it('should return registered folders successfully', async () => {
        const mockFolders = [
          { id: 'folder1', path: '/test1', name: 'Test 1', createdAt: new Date() },
          { id: 'folder2', path: '/test2', name: 'Test 2', createdAt: new Date() }
        ];

        mockVideoService.getRegisteredFolders.mockResolvedValue(mockFolders);

        await videoController.getRegisteredFolders(mockReq as Request, mockRes as Response);

        expect(mockVideoService.getRegisteredFolders).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockFolders
        });
      });
    });

    describe('addRegisteredFolder', () => {
      it('should add registered folder successfully', async () => {
        const mockFolder = {
          id: 'folder1',
          path: '/test/folder',
          name: 'Test Folder',
          createdAt: new Date()
        };

        mockReq.body = {
          path: '/test/folder',
          name: 'Test Folder'
        };

        mockVideoService.addRegisteredFolder.mockResolvedValue(mockFolder);

        await videoController.addRegisteredFolder(mockReq as Request, mockRes as Response);

        expect(mockVideoService.addRegisteredFolder).toHaveBeenCalledWith('/test/folder', 'Test Folder');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Folder registered successfully',
          data: mockFolder
        });
      });

      it('should return error when path is missing', async () => {
        mockReq.body = { name: 'Test Folder' };

        await videoController.addRegisteredFolder(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Folder path is required'
        });
      });
    });

    describe('removeRegisteredFolder', () => {
      it('should remove registered folder successfully', async () => {
        mockReq.params = { id: 'folder1' };
        mockVideoService.removeRegisteredFolder.mockResolvedValue();

        await videoController.removeRegisteredFolder(mockReq as Request, mockRes as Response);

        expect(mockVideoService.removeRegisteredFolder).toHaveBeenCalledWith('folder1');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Folder removed successfully'
        });
      });

      it('should return error when ID is missing', async () => {
        mockReq.params = {};

        await videoController.removeRegisteredFolder(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Folder ID is required'
        });
      });
    });
  });

  describe('getAllThumbnails', () => {
    it('should return thumbnails for videos with thumbnail paths', async () => {
      const mockVideos = [
        {
          id: 'video1',
          originalName: 'test1.mp4',
          createdAt: new Date(),
          thumbnailPath: '/thumbnails/test1.jpg'
        },
        {
          id: 'video2',
          originalName: 'test2.mp4',
          createdAt: new Date(),
          thumbnailPath: null
        },
        {
          id: 'video3',
          originalName: 'test3.mp4',
          createdAt: new Date(),
          thumbnailPath: '/thumbnails/test3.jpg'
        }
      ];

      mockVideoService.getAllVideos.mockResolvedValue(mockVideos as any);

      await videoController.getAllThumbnails(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith([
        {
          videoId: 'video1',
          title: 'test1.mp4',
          url: '/api/thumbnails/test1.jpg',
          createdAt: mockVideos[0].createdAt
        },
        {
          videoId: 'video3',
          title: 'test3.mp4',
          url: '/api/thumbnails/test3.jpg',
          createdAt: mockVideos[2].createdAt
        }
      ]);
    });
  });
});