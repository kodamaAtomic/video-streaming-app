import { VideoMetadata, ThumbnailOptions, VideoStreamRange, ApiResponse, RegisteredFolder } from '../../types/index';

describe('Types', () => {
  describe('VideoMetadata', () => {
    it('should have all required properties', () => {
      const video: VideoMetadata = {
        id: 'test-id',
        filename: 'test.mp4',
        originalName: 'original-test.mp4',
        path: '/path/to/video.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(video.id).toBe('test-id');
      expect(video.filename).toBe('test.mp4');
      expect(video.originalName).toBe('original-test.mp4');
      expect(video.path).toBe('/path/to/video.mp4');
      expect(video.size).toBe(1024000);
      expect(video.mimetype).toBe('video/mp4');
      expect(video.uploadDate).toBeInstanceOf(Date);
      expect(video.createdAt).toBeInstanceOf(Date);
      expect(video.updatedAt).toBeInstanceOf(Date);
    });

    it('should support optional properties', () => {
      const video: VideoMetadata = {
        id: 'test-id',
        filename: 'test.mp4',
        originalName: 'original-test.mp4',
        path: '/path/to/video.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
        uploadDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: 120,
        resolution: {
          width: 1920,
          height: 1080
        },
        thumbnailPath: '/path/to/thumbnail.jpg'
      };

      expect(video.duration).toBe(120);
      expect(video.resolution?.width).toBe(1920);
      expect(video.resolution?.height).toBe(1080);
      expect(video.thumbnailPath).toBe('/path/to/thumbnail.jpg');
    });
  });

  describe('ThumbnailOptions', () => {
    it('should have optional properties', () => {
      const options: ThumbnailOptions = {};
      expect(options).toBeDefined();

      const fullOptions: ThumbnailOptions = {
        timemarks: ['10%', '50%', '90%'],
        count: 3,
        size: '320x240',
        filename: 'thumbnail.jpg'
      };

      expect(fullOptions.timemarks).toEqual(['10%', '50%', '90%']);
      expect(fullOptions.count).toBe(3);
      expect(fullOptions.size).toBe('320x240');
      expect(fullOptions.filename).toBe('thumbnail.jpg');
    });
  });

  describe('VideoStreamRange', () => {
    it('should define range properties', () => {
      const range: VideoStreamRange = {
        start: 0,
        end: 1023,
        contentLength: 1024
      };

      expect(range.start).toBe(0);
      expect(range.end).toBe(1023);
      expect(range.contentLength).toBe(1024);
    });
  });

  describe('ApiResponse', () => {
    it('should work with generic types', () => {
      const successResponse: ApiResponse<string> = {
        success: true,
        data: 'test data',
        message: 'Success'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBe('test data');
      expect(successResponse.message).toBe('Success');

      const errorResponse: ApiResponse = {
        success: false,
        error: 'Something went wrong'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Something went wrong');
    });

    it('should work with array data', () => {
      const listResponse: ApiResponse<VideoMetadata[]> = {
        success: true,
        data: [
          {
            id: 'video1',
            filename: 'test1.mp4',
            originalName: 'test1.mp4',
            path: '/videos/test1.mp4',
            size: 1024000,
            mimetype: 'video/mp4',
            uploadDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]
      };

      expect(listResponse.success).toBe(true);
      expect(Array.isArray(listResponse.data)).toBe(true);
      expect(listResponse.data?.[0].id).toBe('video1');
    });
  });

  describe('RegisteredFolder', () => {
    it('should have all required properties', () => {
      const folder: RegisteredFolder = {
        id: 'folder-hash-123',
        path: '/path/to/folder',
        name: 'My Video Folder',
        createdAt: new Date()
      };

      expect(folder.id).toBe('folder-hash-123');
      expect(folder.path).toBe('/path/to/folder');
      expect(folder.name).toBe('My Video Folder');
      expect(folder.createdAt).toBeInstanceOf(Date);
    });
  });
});