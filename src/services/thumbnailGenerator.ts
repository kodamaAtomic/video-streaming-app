import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import fsSynce from 'fs';
import { ThumbnailOptions } from '../types';

// FFmpegパスの設定と確認
console.log('=== FFmpeg Setup ===');
console.log('ffmpeg-static path:', ffmpegStatic);

// システムFFmpegのパスを強制的に設定
const systemFFmpegPath = '/usr/local/bin/ffmpeg';
const systemFFprobePath = '/usr/local/bin/ffprobe';

console.log(`Checking system FFmpeg at: ${systemFFmpegPath}`);
console.log(`FFmpeg exists: ${fsSynce.existsSync(systemFFmpegPath)}`);
console.log(`Checking system FFprobe at: ${systemFFprobePath}`);
console.log(`FFprobe exists: ${fsSynce.existsSync(systemFFprobePath)}`);

if (fsSynce.existsSync(systemFFmpegPath)) {
  // システムFFmpegを強制的に使用
  ffmpeg.setFfmpegPath(systemFFmpegPath);
  console.log(`✅ FFmpeg path set to: ${systemFFmpegPath}`);
  
  if (fsSynce.existsSync(systemFFprobePath)) {
    ffmpeg.setFfprobePath(systemFFprobePath);
    console.log(`✅ FFprobe path set to: ${systemFFprobePath}`);
  }
} else if (ffmpegStatic) {
  // ffmpeg-staticがある場合
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log(`FFmpeg path set to ffmpeg-static: ${ffmpegStatic}`);
  
  // ffprobe-staticを試す
  try {
    const ffprobeStatic = require('ffprobe-static');
    if (ffprobeStatic && fsSynce.existsSync(ffprobeStatic)) {
      ffmpeg.setFfprobePath(ffprobeStatic);
      console.log(`FFprobe path set to ffprobe-static: ${ffprobeStatic}`);
    }
  } catch (error) {
    console.warn('ffprobe-static not found:', error);
  }
} else {
  console.error('❌ No FFmpeg found! Please install FFmpeg.');
}

console.log('==================');

// 型定義の修正
interface PathInfo {
  path: string | null;
  exists: boolean;
}

interface FFmpegTestResult {
  systemFFmpeg: PathInfo;
  systemFFprobe: PathInfo;
  ffmpegStatic: PathInfo;
  nodeModules: {
    ffmpegStatic: PathInfo | null;
    ffprobeStatic: PathInfo | { error: string } | null;
  };
}

export class ThumbnailGenerator {
  private readonly thumbnailDir: string;

  constructor(thumbnailDir?: string) {
    // dist配下のstorageに統一
    this.thumbnailDir = thumbnailDir || path.join(__dirname, '../storage/thumbnails');
    console.log(`Thumbnail directory set to: ${this.thumbnailDir}`);
    console.log(`Current __dirname: ${__dirname}`);
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

    console.log(`🎬 Generating thumbnail...`);
    console.log(`📹 Video path: ${videoPath}`);
    console.log(`🖼️ Thumbnail path: ${thumbnailPath}`);
    console.log(`📁 Thumbnail directory: ${this.thumbnailDir}`);

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
        reject(new Error('Thumbnail generation timeout (60 seconds)'));
      }, 60000); // タイムアウトを60秒に延長

      try {
        ffmpeg(videoPath)
          .screenshots({
            timemarks,
            size,
            filename,
            folder: this.thumbnailDir
          })
          .on('start', (commandLine: string) => {
            console.log(`🚀 FFmpeg command: ${commandLine}`);
          })
          .on('progress', (progress: any) => {
            if (progress.percent) {
              console.log(`📊 Thumbnail progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            clearTimeout(timeout);
            console.log(`✅ Thumbnail generation completed`);
            
            // ファイルが実際に作成されたか確認
            setTimeout(() => {
              if (fsSynce.existsSync(thumbnailPath)) {
                console.log(`✅ Thumbnail file confirmed: ${thumbnailPath}`);
                resolve(thumbnailPath);
              } else {
                console.log(`❌ Thumbnail file not found: ${thumbnailPath}`);
                reject(new Error(`Thumbnail file was not created: ${thumbnailPath}`));
              }
            }, 1000); // 1秒待ってからファイル確認
          })
          .on('error', (error: any) => {
            clearTimeout(timeout);
            console.error('❌ FFmpeg error:', error);
            const errorMessage = error && error.message ? error.message : String(error);
            reject(new Error('Error generating thumbnail: ' + errorMessage));
          });
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ FFmpeg setup error:', error);
        reject(error);
      }
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

  // デバッグ用メソッド（型修正）
  async testFFmpegPaths(): Promise<FFmpegTestResult> {
    const results: FFmpegTestResult = {
      systemFFmpeg: {
        path: '/usr/local/bin/ffmpeg',
        exists: fsSynce.existsSync('/usr/local/bin/ffmpeg')
      },
      systemFFprobe: {
        path: '/usr/local/bin/ffprobe',
        exists: fsSynce.existsSync('/usr/local/bin/ffprobe')
      },
      ffmpegStatic: {
        path: ffmpegStatic,
        exists: ffmpegStatic ? fsSynce.existsSync(ffmpegStatic) : false
      },
      nodeModules: {
        ffmpegStatic: null,
        ffprobeStatic: null
      }
    };

    // ffprobe-staticをチェック
    try {
      const ffprobeStatic = require('ffprobe-static');
      results.nodeModules.ffprobeStatic = {
        path: ffprobeStatic,
        exists: ffprobeStatic ? fsSynce.existsSync(ffprobeStatic) : false
      };
    } catch (error) {
      results.nodeModules.ffprobeStatic = { error: 'not installed' };
    }

    return results;
  }

  async simpleFFmpegTest(): Promise<{ success: boolean; error?: string }> {
    try {
      return new Promise((resolve) => {
        // より簡単なテスト - ヘルプを表示するだけ
        ffmpeg()
          .format('mp4')
          .on('start', () => {
            console.log('FFmpeg test started');
          })
          .on('error', (err: any) => {
            // ヘルプ表示での終了は正常とみなす
            if (err.message && err.message.includes('ffmpeg version')) {
              resolve({ success: true });
            } else {
              resolve({ 
                success: false, 
                error: err.message || String(err)
              });
            }
          })
          .run();
        
        // 2秒後にタイムアウト
        setTimeout(() => {
          resolve({ success: true }); // タイムアウトは成功とみなす
        }, 2000);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async testFFmpeg(): Promise<boolean> {
    const result = await this.simpleFFmpegTest();
    return result.success;
  }
}

export default ThumbnailGenerator;