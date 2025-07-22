import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import fsSynce from 'fs';
import { ThumbnailOptions } from '../types';

// FFmpegパスの設定と確認
console.log('=== FFmpeg Setup ===');
console.log('ffmpeg-static path:', ffmpegStatic);

if (ffmpegStatic) {
  // ffmpeg-staticを使用
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log(`FFmpeg path set to: ${ffmpegStatic}`);
  console.log(`FFmpeg exists: ${fsSynce.existsSync(ffmpegStatic)}`);
} else {
  // システムFFmpegを試す
  console.warn('ffmpeg-static not found, trying system FFmpeg');
  
  // システムパスを試す
  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg'
  ];
  
  let systemFFmpeg: string | null = null;
  for (const systemPath of systemPaths) {
    if (fsSynce.existsSync(systemPath)) {
      systemFFmpeg = systemPath;
      break;
    }
  }
  
  if (systemFFmpeg) {
    ffmpeg.setFfmpegPath(systemFFmpeg);
    console.log(`System FFmpeg found: ${systemFFmpeg}`);
  } else {
    console.error('No FFmpeg found! Please install FFmpeg.');
  }
}

// FFprobeパスも設定（必要に応じて）
try {
  const ffprobePath = ffmpegStatic ? ffmpegStatic.replace('ffmpeg', 'ffprobe') : 'ffprobe';
  ffmpeg.setFfprobePath(ffprobePath);
  console.log(`FFprobe path set to: ${ffprobePath}`);
} catch (error) {
  console.warn('FFprobe path setting failed:', error);
}

console.log('==================');

export class ThumbnailGenerator {
  private readonly thumbnailDir: string;

  constructor(thumbnailDir: string = path.join(__dirname, '../../storage/thumbnails')) {
    this.thumbnailDir = thumbnailDir;
    this.ensureThumbnailDir();
  }

  private async ensureThumbnailDir(): Promise<void> {
    try {
      await fs.access(this.thumbnailDir);
      console.log(`Thumbnail directory exists: ${this.thumbnailDir}`);
    } catch {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
      console.log(`Created thumbnail directory: ${this.thumbnailDir}`);
    }
  }

  async generateThumbnail(
    videoPath: string,
    videoId: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const {
      timemarks = ['25%'],
      size = '320x240',
      filename = `${videoId}_thumbnail.png`
    } = options;

    const thumbnailPath = path.join(this.thumbnailDir, filename);

    console.log(`Generating thumbnail...`);
    console.log(`Video path: ${videoPath}`);
    console.log(`Thumbnail path: ${thumbnailPath}`);
    console.log(`Thumbnail directory: ${this.thumbnailDir}`);

    // ディレクトリの存在確認
    if (!fsSynce.existsSync(this.thumbnailDir)) {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
      console.log(`Created thumbnail directory: ${this.thumbnailDir}`);
    }

    // 動画ファイルの存在確認
    if (!fsSynce.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Thumbnail generation timeout (30 seconds)'));
      }, 30000);

      ffmpeg(videoPath)
        .screenshots({
          timemarks,
          size,
          filename,
          folder: this.thumbnailDir
        })
        .on('start', (commandLine: string) => {
          console.log(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress: any) => {
          console.log(`Thumbnail progress: ${progress.percent}%`);
        })
        .on('end', () => {
          clearTimeout(timeout);
          console.log(`Thumbnail generated successfully: ${thumbnailPath}`);
          
          // ファイルが実際に作成されたか確認
          if (fsSynce.existsSync(thumbnailPath)) {
            resolve(thumbnailPath);
          } else {
            reject(new Error(`Thumbnail file was not created: ${thumbnailPath}`));
          }
        })
        .on('error', (error: any) => {
          clearTimeout(timeout);
          console.error('FFmpeg error:', error);
          const errorMessage = error && error.message ? error.message : String(error);
          reject(new Error('Error generating thumbnail: ' + errorMessage));
        });
    });
  }

  async generateMultipleThumbnails(
    videoPath: string,
    videoId: string,
    count: number = 5
  ): Promise<string[]> {
    const timemarks = Array.from({ length: count }, (_, i) => 
      `${Math.round((100 / (count + 1)) * (i + 1))}%`
    );

    const thumbnailPaths: string[] = [];

    for (let i = 0; i < count; i++) {
      const filename = `${videoId}_thumbnail_${i + 1}.png`;
      try {
        const thumbnailPath = await this.generateThumbnail(videoPath, videoId, {
          timemarks: [timemarks[i]],
          filename
        });
        thumbnailPaths.push(thumbnailPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to generate thumbnail ${i + 1}:`, errorMessage);
      }
    }

    return thumbnailPaths;
  }

  async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          console.error('FFprobe error:', err);
          reject(err);
        } else {
          console.log('Video metadata extracted successfully');
          resolve(metadata);
        }
      });
    });
  }

  // デバッグ用メソッド - 正しいAPIを使用
  async testFFmpegInstallation(): Promise<{ success: boolean; path?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        // 簡単なテスト用コマンドを実行
        ffmpeg()
          .input('testsrc2=duration=1:size=320x240:rate=1')
          .inputFormat('lavfi')
          .output('/dev/null')
          .outputFormat('null')
          .on('end', () => {
            resolve({ 
              success: true, 
              path: ffmpegStatic || 'system'
            });
          })
          .on('error', (err: any) => {
            resolve({ 
              success: false, 
              error: err.message || String(err)
            });
          })
          .run();
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  async getFFmpegInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // 利用可能なフォーマットを取得
        ffmpeg.getAvailableFormats((err: any, formats: any) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              staticPath: ffmpegStatic,
              staticExists: ffmpegStatic ? fsSynce.existsSync(ffmpegStatic) : false,
              availableFormats: Object.keys(formats).length,
              supportsMp4: 'mp4' in formats,
              supportsWebm: 'webm' in formats
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async testFFmpeg(): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        ffmpeg()
          .input('testsrc2=duration=1:size=320x240:rate=1')
          .inputFormat('lavfi')
          .output('/dev/null')
          .outputFormat('null')
          .on('end', () => {
            console.log('FFmpeg test successful');
            resolve(true);
          })
          .on('error', (err: any) => {
            console.error('FFmpeg test failed:', err);
            resolve(false);
          })
          .run();
      });
    } catch (error) {
      console.error('FFmpeg test error:', error);
      return false;
    }
  }

  // シンプルなFFmpegテスト
  async simpleFFmpegTest(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.testFFmpegInstallation();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default ThumbnailGenerator;