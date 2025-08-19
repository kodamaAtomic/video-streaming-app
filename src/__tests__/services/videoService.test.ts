import VideoService from '../../services/videoService';
import ThumbnailGenerator from '../../services/thumbnailGenerator';
import fs from 'fs';
import path from 'path';
import { VideoMetadata } from '../../types';

// Mock the modules
jest.mock('../../services/thumbnailGenerator');
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
  extname: jest.fn((fileName) => {
    const ext = fileName.toLowerCase();
    if (ext.includes('.avi')) return '.avi';
    if (ext.includes('.mov')) return '.mov';
    if (ext.includes('.mkv')) return '.mkv';
    if (ext.includes('.webm')) return '.webm';
    return '.mp4';
  }),
  basename: jest.fn((fileName) => 'test.mp4'),
  resolve: jest.fn((filePath) => `/resolved/${filePath}`),
  dirname: jest.fn((filePath) => '/test')
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as any;

describe('VideoService', () => {
  let videoService: VideoService;
  let mockThumbnailGenerator: jest.Mocked<ThumbnailGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.readdirSync.mockReturnValue(['test.mp4', 'test2.avi'] as any);
    mockFs.statSync.mockReturnValue({
      size: 1024000,
      mtime: new Date('2023-01-01'),
      isDirectory: () => false
    } as any);

    // Create video service with test directory
    videoService = new VideoService('/test/videos');
  });

  describe('constructor', () => {
    it('should initialize with default video directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      const service = new VideoService();
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    it('should initialize with custom video directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      const customDir = '/custom/videos';
      const service = new VideoService(customDir);
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    it('should create video directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      new VideoService('/new/videos');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/videos', { recursive: true });
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for video files', () => {
      const service = videoService as any; // Access private method
      expect(service.getMimeType('test.mp4')).toBe('video/mp4');
      expect(service.getMimeType('test.avi')).toBe('video/x-msvideo');
      expect(service.getMimeType('test.mov')).toBe('video/quicktime');
      expect(service.getMimeType('test.mkv')).toBe('video/x-matroska');
      expect(service.getMimeType('test.webm')).toBe('video/webm');
    });

    it('should return default MIME type for unknown extensions', () => {
      const service = videoService as any;
      expect(service.getMimeType('test.unknown')).toBe('video/mp4');
    });
  });

  describe('getAllVideos', () => {
    it('should return all loaded videos', async () => {
      const videos = await videoService.getAllVideos();
      expect(Array.isArray(videos)).toBe(true);
    });
  });

  describe('getVideoById', () => {
    it('should return video if it exists', async () => {
      // Add a mock video to the internal map
      const mockVideo: VideoMetadata = {
        id: 'test',
        filename: 'test.mp4',
        originalName: 'test.mp4',
        path: '/test/videos/test.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailPath: '/test/thumbnails/test.jpg'
      };

      (videoService as any).videos.set('test', mockVideo);
      const result = await videoService.getVideoById('test');
      expect(result).toEqual(mockVideo);
    });

    it('should return undefined if video does not exist', async () => {
      const result = await videoService.getVideoById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('addVideo', () => {
    it('should throw error if no file provided', async () => {
      await expect(videoService.addVideo(undefined)).rejects.toThrow('No file provided');
    });

    it('should add video successfully with file', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'video',
        originalname: 'test-video.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 1024000,
        destination: '/uploads',
        filename: 'test-video-123.mp4',
        path: '/uploads/test-video-123.mp4',
        buffer: Buffer.from(''),
        stream: {} as any
      };

      const result = await videoService.addVideo(mockFile);
      
      expect(result).toBeDefined();
      expect(result.originalName).toBe('test-video.mp4');
      expect(result.filename).toBe('test-video-123.mp4');
      expect(result.size).toBe(1024000);
      expect(result.mimetype).toBe('video/mp4');
    });
  });

  describe('deleteVideo', () => {
    it('should return false if video does not exist', async () => {
      const result = await videoService.deleteVideo('nonexistent');
      expect(result).toBe(false);
    });

    it('should delete video and thumbnail successfully', async () => {
      // Add a mock video
      const mockVideo: VideoMetadata = {
        id: 'test',
        filename: 'test.mp4',
        originalName: 'test.mp4',
        path: '/test/videos/test.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailPath: '/test/thumbnails/test.jpg'
      };

      (videoService as any).videos.set('test', mockVideo);
      
      mockFs.existsSync.mockReturnValue(true);
      
      const result = await videoService.deleteVideo('test');
      
      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/videos/test.mp4');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/thumbnails/test.jpg');
    });

    it('should handle deletion errors gracefully', async () => {
      const mockVideo: VideoMetadata = {
        id: 'test',
        filename: 'test.mp4',
        originalName: 'test.mp4',
        path: '/test/videos/test.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailPath: undefined
      };

      (videoService as any).videos.set('test', mockVideo);
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = await videoService.deleteVideo('test');
      expect(result).toBe(false);
    });
  });

  describe('changeVideoDirectory', () => {
    it('should throw error if directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(videoService.changeVideoDirectory('/nonexistent'))
        .rejects.toThrow('Directory does not exist: /nonexistent');
    });

    it('should throw error if path is not a directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false
      } as any);

      await expect(videoService.changeVideoDirectory('/file.txt'))
        .rejects.toThrow('Path is not a directory: /file.txt');
    });

    it('should change directory successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true
      } as any);
      mockFs.readdirSync.mockReturnValue([]);

      await videoService.changeVideoDirectory('/new/videos');
      
      expect(mockFs.existsSync).toHaveBeenCalledWith('/new/videos');
      expect(mockFs.statSync).toHaveBeenCalledWith('/new/videos');
    });
  });

  describe('Registered Folders', () => {
    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue('[]');
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    describe('getRegisteredFolders', () => {
      it('should return empty array if file does not exist', async () => {
        mockFs.existsSync.mockReturnValue(false);
        const folders = await videoService.getRegisteredFolders();
        expect(folders).toEqual([]);
      });

      it('should return parsed folders from file', async () => {
        const mockFolders = [
          { id: '123', path: '/test', name: 'Test Folder', createdAt: '2025-01-01T00:00:00.000Z' }
        ];
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockFolders));
        
        const folders = await videoService.getRegisteredFolders();
        expect(folders).toEqual(mockFolders);
      });
    });

    describe('addRegisteredFolder', () => {
      it('should throw error if folder path is empty', async () => {
        await expect(videoService.addRegisteredFolder(''))
          .rejects.toThrow('Folder path is required');
      });

      it('should throw error if folder does not exist', async () => {
        mockFs.existsSync.mockReturnValue(false);
        
        await expect(videoService.addRegisteredFolder('/nonexistent'))
          .rejects.toThrow('Folder does not exist:');
      });

      it('should throw error if path is not a directory', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => false
        } as any);

        await expect(videoService.addRegisteredFolder('/file.txt'))
          .rejects.toThrow('Path is not a directory:');
      });

      it('should add folder successfully', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true
        } as any);
        
        const result = await videoService.addRegisteredFolder('/test/folder', 'Test Folder');
        
        expect(result).toBeDefined();
        expect(result.name).toBe('Test Folder');
        expect(result.path).toContain('/test/folder');
      });
    });

    describe('removeRegisteredFolder', () => {
      it('should throw error if ID is empty', async () => {
        await expect(videoService.removeRegisteredFolder(''))
          .rejects.toThrow('Folder ID is required');
      });

      it('should throw error if folder not found', async () => {
        mockFs.readFileSync.mockReturnValue('[]');
        
        await expect(videoService.removeRegisteredFolder('nonexistent'))
          .rejects.toThrow('Folder not found');
      });
    });

    describe('setRegisteredFolder', () => {
      it('should throw error if ID is empty', async () => {
        await expect(videoService.setRegisteredFolder(''))
          .rejects.toThrow('Folder ID is required');
      });

      it('should throw error if folder not found', async () => {
        mockFs.readFileSync.mockReturnValue('[]');
        
        await expect(videoService.setRegisteredFolder('nonexistent'))
          .rejects.toThrow('Registered folder not found');
      });

      it('should throw error if registered folder no longer exists', async () => {
        const mockFolders = [
          { id: '123', path: '/test', name: 'Test Folder', createdAt: new Date() }
        ];
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockFolders));
        mockFs.existsSync.mockReturnValueOnce(true) // for reading file
          .mockReturnValueOnce(false); // for checking folder existence
        
        await expect(videoService.setRegisteredFolder('123'))
          .rejects.toThrow('Registered folder no longer exists:');
      });
    });
  });
});