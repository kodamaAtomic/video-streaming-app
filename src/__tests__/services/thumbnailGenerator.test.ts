import ThumbnailGenerator from '../../services/thumbnailGenerator';
import fs from 'fs';
import path from 'path';

// Mock external dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn(() => '.mp4'),
  parse: jest.fn(() => ({
    root: '/',
    dir: '/test',
    base: 'test.mp4',
    ext: '.mp4',
    name: 'test'
  }))
}));
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = {
    screenshots: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    run: jest.fn()
  };
  
  const ffmpegConstructor = jest.fn(() => mockFfmpeg);
  Object.defineProperty(ffmpegConstructor, 'ffprobe', {
    value: jest.fn(),
    writable: true
  });
  Object.defineProperty(ffmpegConstructor, 'setFfmpegPath', {
    value: jest.fn(),
    writable: true
  });
  Object.defineProperty(ffmpegConstructor, 'setFfprobePath', {
    value: jest.fn(),
    writable: true
  });
  
  return ffmpegConstructor;
});

jest.mock('ffmpeg-static', () => '/mock/ffmpeg/path', { virtual: true });

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as any;

describe('ThumbnailGenerator', () => {
  let thumbnailGenerator: ThumbnailGenerator;
  const mockThumbnailDir = '/mock/thumbnails';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);

    thumbnailGenerator = new ThumbnailGenerator(mockThumbnailDir);
  });

  describe('constructor', () => {
    it('should initialize with thumbnail directory', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith(mockThumbnailDir);
    });

    it('should create thumbnail directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      new ThumbnailGenerator('/new/thumbnails');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/thumbnails', { recursive: true });
    });
  });

  describe('generateThumbnail', () => {
    const mockVideoPath = '/test/videos/test.mp4';
    const mockVideoId = 'test-video';

    it('should throw error if video file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(thumbnailGenerator.generateThumbnail(mockVideoPath, mockVideoId))
        .rejects.toThrow(`Video file does not exist: ${mockVideoPath}`);
    });

    it('should return existing thumbnail path if thumbnail already exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      const result = await thumbnailGenerator.generateThumbnail(mockVideoPath, mockVideoId);
      
      expect(result).toBe(`${mockThumbnailDir}/${mockVideoId}.jpg`);
    });

    it('should generate new thumbnail if it does not exist', async () => {
      // Mock that video exists but thumbnail doesn't
      mockFs.existsSync
        .mockReturnValueOnce(true) // video exists
        .mockReturnValueOnce(false); // thumbnail doesn't exist

      const ffmpeg = require('fluent-ffmpeg');
      const mockFfmpegInstance = ffmpeg();

      // Mock successful screenshot generation
      mockFfmpegInstance.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await thumbnailGenerator.generateThumbnail(mockVideoPath, mockVideoId);

      expect(mockFfmpegInstance.screenshots).toHaveBeenCalledWith({
        count: 1,
        timemarks: ['10%'],
        filename: `${mockVideoId}.jpg`,
        folder: mockThumbnailDir
      });
      
      expect(result).toBe(`${mockThumbnailDir}/${mockVideoId}.jpg`);
    });

    it('should handle ffmpeg errors gracefully', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // video exists
        .mockReturnValueOnce(false); // thumbnail doesn't exist

      const ffmpeg = require('fluent-ffmpeg');
      const mockFfmpegInstance = ffmpeg();

      // Mock ffmpeg error
      mockFfmpegInstance.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg failed')), 0);
        }
        return mockFfmpegInstance;
      });

      await expect(thumbnailGenerator.generateThumbnail(mockVideoPath, mockVideoId))
        .rejects.toThrow('FFmpeg failed');
    });
  });

  describe('getVideoMetadata', () => {
    const mockVideoPath = '/test/videos/test.mp4';

    it('should extract video metadata successfully', async () => {
      const mockMetadata = {
        format: {
          duration: 120,
          size: 1024000,
          format_name: 'mov,mp4,m4a,3gp,3g2,mj2'
        },
        streams: [
          {
            codec_type: 'video',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1'
          }
        ]
      };

      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
        setTimeout(() => callback(null, mockMetadata), 0);
      });

      const result = await thumbnailGenerator.getVideoMetadata(mockVideoPath);
      
      expect(result).toEqual(mockMetadata);
      expect(ffmpeg.ffprobe).toHaveBeenCalledWith(mockVideoPath, expect.any(Function));
    });

    it('should reject with error if ffprobe fails', async () => {
      const mockError = new Error('FFprobe failed');
      
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe.mockImplementation((path: string, callback: Function) => {
        setTimeout(() => callback(mockError), 0);
      });

      await expect(thumbnailGenerator.getVideoMetadata(mockVideoPath))
        .rejects.toThrow('FFprobe failed');
    });
  });

  describe('testFFmpeg', () => {
    it('should return true when FFmpeg test is successful', async () => {
      // Mock successful FFmpeg test
      const mockTestResult = { success: true };
      thumbnailGenerator.simpleFFmpegTest = jest.fn().mockResolvedValue(mockTestResult);

      const result = await thumbnailGenerator.testFFmpeg();
      expect(result).toBe(true);
    });

    it('should return false when FFmpeg test fails', async () => {
      // Mock failed FFmpeg test
      const mockTestResult = { success: false, error: 'FFmpeg not found' };
      thumbnailGenerator.simpleFFmpegTest = jest.fn().mockResolvedValue(mockTestResult);

      const result = await thumbnailGenerator.testFFmpeg();
      expect(result).toBe(false);
    });
  });

  describe('simpleFFmpegTest', () => {
    it('should resolve with success when FFmpeg works', async () => {
      const ffmpeg = require('fluent-ffmpeg');
      const mockFfmpegInstance = ffmpeg();

      mockFfmpegInstance.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'start') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegInstance;
      });

      // Mock timeout behavior
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay?: number) => {
        if (delay === 2000) {
          setTimeout(callback, 0);
        }
        return null as any;
      });

      const result = await thumbnailGenerator.simpleFFmpegTest();
      expect(result.success).toBe(true);
    });

    it('should handle FFmpeg errors', async () => {
      const ffmpeg = require('fluent-ffmpeg');
      const mockFfmpegInstance = ffmpeg();

      const mockError = new Error('FFmpeg error');
      mockFfmpegInstance.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(mockError), 0);
        }
        return mockFfmpegInstance;
      });

      const result = await thumbnailGenerator.simpleFFmpegTest();
      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg error');
    });

    it('should handle non-Error exceptions', async () => {
      // Mock the entire method to throw a string
      jest.spyOn(thumbnailGenerator, 'simpleFFmpegTest').mockImplementation(() => {
        throw 'String error';
      });

      const result = await thumbnailGenerator.simpleFFmpegTest();
      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('testFFmpegPaths', () => {
    it('should test various FFmpeg installation paths', async () => {
      // Mock existsSync for different paths
      mockFs.existsSync.mockImplementation((filePath: any) => {
        const path = String(filePath);
        if (path === '/usr/local/bin/ffmpeg') return true;
        if (path === '/usr/local/bin/ffprobe') return false;
        return false;
      });

      // Mock require for ffprobe-static
      const mockRequire = jest.fn().mockImplementation((moduleName: string) => {
        if (moduleName === 'ffprobe-static') {
          return '/mock/ffprobe/path';
        }
        throw new Error('Module not found');
      });
      
      // Replace require temporarily
      const originalRequire = require;
      (global as any).require = mockRequire;

      const result = await thumbnailGenerator.testFFmpegPaths();

      expect(result.systemFFmpeg.path).toBe('/usr/local/bin/ffmpeg');
      expect(result.systemFFmpeg.exists).toBe(true);
      expect(result.systemFFprobe.path).toBe('/usr/local/bin/ffprobe');
      expect(result.systemFFprobe.exists).toBe(false);

      // Restore original require
      (global as any).require = originalRequire;
    });
  });
});