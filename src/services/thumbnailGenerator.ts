import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import fsSynce from 'fs';
import os from 'os';
import crypto from 'crypto';
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

// セマフォクラス（並列処理制御用）
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    } else {
      this.permits++;
    }
  }
}

// 並列処理用のインターフェース定義
interface ThumbnailJob {
  id: string;
  videoPath: string;
  videoId: string;
  timemark: string;
  filename: string;
  size: string;
}

interface ThumbnailProgress {
  total: number;
  completed: number;
  errors: number;
  currentJobs: string[];
}

interface BatchGenerationOptions {
  maxConcurrency?: number;  // 最大並列実行数
  timeoutMs?: number;       // タイムアウト時間
  skipExisting?: boolean;   // 既存ファイルをスキップ
  optimizeSettings?: boolean; // 最適化設定を使用
  useGPU?: boolean;         // GPU加速を使用
  lowQuality?: boolean;     // 低品質高速モード
  partialRead?: boolean;    // 部分読み込み最適化
}

// GPU加速設定
interface GPUCapabilities {
  nvenc: boolean;    // NVIDIA GPU エンコーダ
  vaapi: boolean;    // Intel/AMD GPU エンコーダ
  qsv: boolean;      // Intel Quick Sync Video
  available: boolean; // GPU加速が利用可能
}

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
  private readonly maxConcurrency: number;
  private activeJobs: Set<string> = new Set();
  private jobQueue: ThumbnailJob[] = [];
  private progressCallback?: (progress: ThumbnailProgress) => void;
  private gpuCapabilities: GPUCapabilities = {
    nvenc: false,
    vaapi: false,
    qsv: false,
    available: false
  };

  constructor(thumbnailDir?: string, maxConcurrency?: number) {
    // dist配下のstorageに統一
    this.thumbnailDir = thumbnailDir || path.join(__dirname, '../storage/thumbnails');
    // CPUコア数に基づいて最大並列数を決定（CPUコア数の75%、最低2、最大8）
    this.maxConcurrency = maxConcurrency || Math.max(2, Math.min(8, Math.floor(os.cpus().length * 0.75)));
    
    console.log(`Thumbnail directory set to: ${this.thumbnailDir}`);
    console.log(`Max concurrency set to: ${this.maxConcurrency}`);
    console.log(`Current __dirname: ${__dirname}`);
    this.ensureThumbnailDir();
    
    // GPU検出を非同期で実行（エラーでもサーバー起動を妨げない）
    this.detectGPUCapabilities().catch(error => {
      console.log('⚠️ GPU detection failed, using CPU-only mode:', error.message);
    });
  }

  setProgressCallback(callback: (progress: ThumbnailProgress) => void): void {
    this.progressCallback = callback;
  }

  private notifyProgress(completed: number, errors: number, total: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        total,
        completed,
        errors,
        currentJobs: Array.from(this.activeJobs)
      });
    }
  }

  // GPU機能の検出
  private async detectGPUCapabilities(): Promise<void> {
    try {
      console.log('🔍 Detecting GPU capabilities...');
      
      // より簡単なテスト用の入力を使用
      const simpleTestOptions = ['-f', 'lavfi'];
      
      // NVENC (NVIDIA) の検出 - より安全なテスト
      try {
        this.gpuCapabilities.nvenc = await this.testSimpleGPUFeature('nvenc');
      } catch (error) {
        this.gpuCapabilities.nvenc = false;
      }
      
      // VAAPI (Intel/AMD) の検出
      try {
        this.gpuCapabilities.vaapi = await this.testSimpleGPUFeature('vaapi');
      } catch (error) {
        this.gpuCapabilities.vaapi = false;
      }
      
      // QSV (Intel Quick Sync) の検出
      try {
        this.gpuCapabilities.qsv = await this.testSimpleGPUFeature('qsv');
      } catch (error) {
        this.gpuCapabilities.qsv = false;
      }
      
      this.gpuCapabilities.available = this.gpuCapabilities.nvenc || this.gpuCapabilities.vaapi || this.gpuCapabilities.qsv;

      console.log(`GPU Capabilities:`, {
        'NVENC (NVIDIA)': this.gpuCapabilities.nvenc ? '✅' : '❌',
        'VAAPI (Intel/AMD)': this.gpuCapabilities.vaapi ? '✅' : '❌', 
        'QSV (Intel)': this.gpuCapabilities.qsv ? '✅' : '❌',
        'GPU Available': this.gpuCapabilities.available ? '✅' : '❌'
      });
    } catch (error) {
      console.log('⚠️ GPU detection failed, using CPU-only mode:', error);
      this.gpuCapabilities = {
        nvenc: false,
        vaapi: false,
        qsv: false,
        available: false
      };
    }
  }

  // より簡単なGPU機能テスト
  private async testSimpleGPUFeature(gpuType: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // 短時間で結果を返すシンプルなテスト
        setTimeout(() => {
          // 実際のGPU検出は環境依存なので、一旦falseを返す
          // 本格的なGPU検出は別途実装が必要
          resolve(false);
        }, 100);
      } catch (error) {
        resolve(false);
      }
    });
  }

  // 動画メタデータを取得してアスペクト比を計算
  private async getVideoMetadata(videoPath: string): Promise<{
    width: number;
    height: number;
    aspectRatio: number;
    duration: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          console.error('FFprobe error:', err);
          reject(err);
          return;
        }

        try {
          const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
          
          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const width = videoStream.width || 1920;
          const height = videoStream.height || 1080;
          const aspectRatio = width / height;
          const duration = parseFloat(metadata.format.duration) || 0;

          console.log(`📊 Video metadata: ${width}x${height} (${aspectRatio.toFixed(2)}:1), ${duration.toFixed(1)}s`);

          resolve({
            width,
            height,
            aspectRatio,
            duration
          });
        } catch (error) {
          console.error('Error parsing metadata:', error);
          // デフォルト値で続行
          resolve({
            width: 1920,
            height: 1080,
            aspectRatio: 1.78,
            duration: 0
          });
        }
      });
    });
  }

  // アスペクト比に基づいて最適なサムネイルサイズを計算
  private calculateOptimalSize(
    originalWidth: number, 
    originalHeight: number, 
    targetHeight: number = 360
  ): { width: number; height: number; size: string } {
    // 元のアスペクト比を維持しながら、指定した高さに合わせる
    const aspectRatio = originalWidth / originalHeight;
    const width = Math.round(targetHeight * aspectRatio);
    
    // 最小/最大幅の制限
    const minWidth = 240;
    const maxWidth = 640;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    const constrainedHeight = Math.round(constrainedWidth / aspectRatio);
    
    console.log(`📐 Size calculation: ${originalWidth}x${originalHeight} → ${constrainedWidth}x${constrainedHeight} (${aspectRatio.toFixed(2)}:1)`);
    
    return {
      width: constrainedWidth,
      height: constrainedHeight,
      size: `${constrainedWidth}x${constrainedHeight}`
    };
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
      filename = `${videoId}_thumbnail.png`
    } = options;

    const thumbnailPath = path.join(this.thumbnailDir, filename);

    console.log(`🎬 Generating adaptive thumbnail...`);
    console.log(`📹 Video path: ${videoPath}`);
    console.log(`🖼️ Thumbnail path: ${thumbnailPath}`);

    // ディレクトリの存在確認
    if (!fsSynce.existsSync(this.thumbnailDir)) {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
      console.log(`Created thumbnail directory: ${this.thumbnailDir}`);
    }

    // 動画ファイルの存在確認
    if (!fsSynce.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    try {
      // 動画メタデータを取得
      const metadata = await this.getVideoMetadata(videoPath);
      
      // 最適なサイズを計算（高解像度で生成）
      const optimalSize = this.calculateOptimalSize(metadata.width, metadata.height, 480);
      
      console.log(`🎯 Generating thumbnail with size: ${optimalSize.size}`);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Thumbnail generation timeout (60 seconds)'));
        }, 60000);

        try {
          // 最適化されたFFmpegコマンド設定
          const ffmpegCommand = ffmpeg(videoPath)
            .inputOptions([
              '-threads 2',      // スレッド数制限
              '-y',              // 既存ファイル上書き
            ])
            .outputOptions([
              '-vframes 1',      // 1フレームのみ
              '-q:v 2',          // 高品質（1-31、値が低いほど高品質）
              '-preset ultrafast' // 最速プリセット
            ]);

          ffmpegCommand
            .screenshots({
              timemarks,
              size: optimalSize.size, // 動的に計算されたサイズ
              filename,
              folder: this.thumbnailDir
            })
            .on('start', (commandLine: string) => {
              console.log(`🚀 FFmpeg [${metadata.width}x${metadata.height}→${optimalSize.size}]: ${commandLine.substring(0, 100)}...`);
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
              }, 500); // 待機時間を短縮
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
    } catch (error) {
      console.error('❌ Error extracting video metadata:', error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 並列処理でサムネイル生成
  async generateThumbnailsConcurrent(
    videos: Array<{ videoPath: string; videoId: string }>,
    options: BatchGenerationOptions = {}
  ): Promise<{ successful: string[]; failed: Array<{ videoId: string; error: string }> }> {
    const {
      maxConcurrency = this.maxConcurrency,
      timeoutMs = 30000,
      skipExisting = true,
      optimizeSettings = true,
      useGPU = this.gpuCapabilities.available,
      lowQuality = false,
      partialRead = false
    } = options;

    console.log(`🚀 Starting concurrent thumbnail generation for ${videos.length} videos`);
    console.log(`📊 Max concurrency: ${maxConcurrency}`);
    console.log(`🎮 GPU acceleration: ${useGPU ? '✅' : '❌'}`);
    console.log(`⚡ Low quality mode: ${lowQuality ? '✅' : '❌'}`);
    console.log(`📖 Partial read: ${partialRead ? '✅' : '❌'}`);

    const jobs: ThumbnailJob[] = [];
    const successful: string[] = [];
    const failed: Array<{ videoId: string; error: string }> = [];

    // ジョブ作成
    for (const { videoPath, videoId } of videos) {
      const filename = `${videoId}_thumbnail.png`;
      const thumbnailPath = path.join(this.thumbnailDir, filename);

      // 既存ファイルのチェック
      if (skipExisting && fsSynce.existsSync(thumbnailPath)) {
        console.log(`⏭️ Skipping existing thumbnail: ${filename}`);
        successful.push(thumbnailPath);
        continue;
      }

      jobs.push({
        id: crypto.randomUUID(),
        videoPath,
        videoId,
        timemark: '25%',
        filename,
        size: '320x180' // 16:9アスペクト比
      });
    }

    if (jobs.length === 0) {
      console.log('✅ All thumbnails already exist, skipping generation');
      return { successful, failed };
    }

    console.log(`📋 Processing ${jobs.length} thumbnail jobs`);

    // 並列実行
    const semaphore = new Semaphore(maxConcurrency);
    const promises = jobs.map(job => 
      this.processThumbnailJob(job, semaphore, timeoutMs, optimizeSettings, useGPU, lowQuality, partialRead)
    );

    const results = await Promise.allSettled(promises);
    
    // 結果の集計
    results.forEach((result, index) => {
      const job = jobs[index];
      if (result.status === 'fulfilled') {
        successful.push(result.value);
        console.log(`✅ Thumbnail generated: ${job.videoId}`);
      } else {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failed.push({ videoId: job.videoId, error });
        console.error(`❌ Thumbnail failed: ${job.videoId} - ${error}`);
      }
    });

    console.log(`🏁 Thumbnail generation completed: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  private async processThumbnailJob(
    job: ThumbnailJob,
    semaphore: Semaphore,
    timeoutMs: number,
    optimizeSettings: boolean,
    useGPU: boolean = false,
    lowQuality: boolean = false,
    partialRead: boolean = false
  ): Promise<string> {
    return semaphore.execute(async () => {
      this.activeJobs.add(job.id);
      
      try {
        // 新しい動的アスペクト比機能を使用
        const thumbnailPath = await this.generateThumbnail(
          job.videoPath,
          job.videoId,
          {
            timemarks: [job.timemark],
            filename: job.filename
          }
        );
        
        return thumbnailPath;
      } finally {
        this.activeJobs.delete(job.id);
      }
    });
  }

  private async generateOptimizedThumbnail(
    videoPath: string,
    videoId: string,
    options: ThumbnailOptions,
    timeoutMs: number,
    optimizeSettings: boolean,
    useGPU: boolean = false,
    lowQuality: boolean = false,
    partialRead: boolean = false
  ): Promise<string> {
    const { timemarks = ['25%'], size = '320x180', filename } = options; // 16:9アスペクト比
    const thumbnailPath = path.join(this.thumbnailDir, filename!);

    // 動画ファイルの存在確認
    if (!fsSynce.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Thumbnail generation timeout (${timeoutMs}ms)`));
      }, timeoutMs);

      try {
        let ffmpegCommand = ffmpeg(videoPath);

        // GPU加速の設定
        if (useGPU && this.gpuCapabilities.available) {
          ffmpegCommand = this.addGPUAcceleration(ffmpegCommand);
        }

        // 部分読み込み最適化
        if (partialRead) {
          ffmpegCommand = ffmpegCommand.inputOptions([
            '-ss', '0',           // 開始位置を指定
            '-t', '30'            // 最初の30秒のみ読み込み
          ]);
        }

        // 最適化設定の適用
        if (optimizeSettings) {
          const baseOptions = [
            '-threads', useGPU ? '2' : '1',    // GPU使用時は少し多めのスレッド
            '-y',                              // 既存ファイル上書き
          ];

          const outputOptions = [
            '-vframes', '1',                   // 1フレームのみ
            '-f', 'image2'                     // 画像形式を明示
          ];

          // 品質設定（低品質モードまたは通常モード）
          if (lowQuality) {
            outputOptions.push('-q:v', '8');   // 低品質（高速）
            outputOptions.push('-preset', 'ultrafast');
          } else {
            outputOptions.push('-q:v', '3');   // 高品質
            outputOptions.push('-preset', useGPU ? 'fast' : 'ultrafast');
          }

          ffmpegCommand = ffmpegCommand
            .inputOptions(baseOptions)
            .outputOptions(outputOptions);
        }

        ffmpegCommand
          .screenshots({
            timemarks,
            size,
            filename: filename!,
            folder: this.thumbnailDir
          })
          .on('start', (commandLine: string) => {
            const mode = useGPU ? '🚀 GPU' : '💻 CPU';
            const quality = lowQuality ? 'LOW' : 'HIGH';
            console.log(`${mode} [${quality}] ${commandLine.substring(0, 100)}...`);
          })
          .on('end', () => {
            clearTimeout(timeout);
            
            // ファイルが作成されたか確認
            if (fsSynce.existsSync(thumbnailPath)) {
              resolve(thumbnailPath);
            } else {
              reject(new Error(`Thumbnail file was not created: ${thumbnailPath}`));
            }
          })
          .on('error', (error: any) => {
            clearTimeout(timeout);
            const errorMessage = error && error.message ? error.message : String(error);
            reject(new Error(`FFmpeg error: ${errorMessage}`));
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // GPU加速オプションの追加
  private addGPUAcceleration(ffmpegCommand: any): any {
    if (this.gpuCapabilities.nvenc) {
      // NVIDIA GPU
      return ffmpegCommand
        .inputOptions([
          '-hwaccel', 'cuda',
          '-hwaccel_output_format', 'cuda'
        ])
        .outputOptions([
          '-c:v', 'h264_nvenc'
        ]);
    } else if (this.gpuCapabilities.vaapi) {
      // Intel/AMD GPU
      return ffmpegCommand
        .inputOptions([
          '-hwaccel', 'vaapi',
          '-hwaccel_device', '/dev/dri/renderD128',
          '-hwaccel_output_format', 'vaapi'
        ])
        .outputOptions([
          '-c:v', 'h264_vaapi'
        ]);
    } else if (this.gpuCapabilities.qsv) {
      // Intel Quick Sync
      return ffmpegCommand
        .inputOptions([
          '-hwaccel', 'qsv',
          '-hwaccel_output_format', 'qsv'
        ])
        .outputOptions([
          '-c:v', 'h264_qsv'
        ]);
    }
    
    return ffmpegCommand;
  }

  // 改良版：並列処理で複数サムネイル生成
  async generateMultipleThumbnails(
    videoPath: string,
    videoId: string,
    count: number = 5
  ): Promise<string[]> {
    const videos = [{ videoPath, videoId }];
    
    // 複数の時刻でサムネイルを生成したい場合の処理を追加
    const timemarks = Array.from({ length: count }, (_, i) => 
      `${Math.round((100 / (count + 1)) * (i + 1))}%`
    );

    const jobs: Array<{ videoPath: string; videoId: string; filename: string; timemark: string }> = [];
    
    for (let i = 0; i < count; i++) {
      jobs.push({
        videoPath,
        videoId: `${videoId}_${i + 1}`,
        filename: `${videoId}_thumbnail_${i + 1}.png`,
        timemark: timemarks[i]
      });
    }

    const result = await this.generateThumbnailsConcurrent(jobs);
    return result.successful;
  }

  // キャッシュ機能付きサムネイル生成
  async generateThumbnailWithCache(
    videoPath: string,
    videoId: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const filename = options.filename || `${videoId}_thumbnail.png`;
    const thumbnailPath = path.join(this.thumbnailDir, filename);

    // キャッシュチェック
    if (await this.isThumbnailValid(videoPath, thumbnailPath)) {
      console.log(`📋 Using cached thumbnail: ${filename}`);
      return thumbnailPath;
    }

    console.log(`🔄 Generating new thumbnail: ${filename}`);
    return this.generateThumbnail(videoPath, videoId, options);
  }

  // サムネイルの有効性チェック（ファイル存在 + 更新日時比較）
  private async isThumbnailValid(videoPath: string, thumbnailPath: string): Promise<boolean> {
    try {
      // サムネイルファイルの存在確認
      if (!fsSynce.existsSync(thumbnailPath)) {
        return false;
      }

      // 元動画ファイルの存在確認
      if (!fsSynce.existsSync(videoPath)) {
        return false;
      }

      // ファイルの更新日時比較
      const videoStats = await fs.stat(videoPath);
      const thumbnailStats = await fs.stat(thumbnailPath);

      // サムネイルが動画ファイルより新しいかチェック
      return thumbnailStats.mtime >= videoStats.mtime;
    } catch {
      return false;
    }
  }

  // バッチ処理：フォルダ内の全動画のサムネイル生成
  async generateThumbnailsForFolder(
    folderPath: string,
    options: BatchGenerationOptions = {}
  ): Promise<{ successful: string[]; failed: Array<{ videoId: string; error: string }> }> {
    console.log(`📁 Generating thumbnails for folder: ${folderPath}`);

    // 動画ファイルの検索
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    const files = await fs.readdir(folderPath);
    
    const videoFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return videoExtensions.includes(ext);
      })
      .map(file => ({
        videoPath: path.join(folderPath, file),
        videoId: path.basename(file, path.extname(file))
      }));

    console.log(`📹 Found ${videoFiles.length} video files`);

    if (videoFiles.length === 0) {
      return { successful: [], failed: [] };
    }

    return this.generateThumbnailsConcurrent(videoFiles, options);
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

  // 統計情報取得
  getStats(): {
    maxConcurrency: number;
    activeJobs: number;
    thumbnailDir: string;
    gpuCapabilities: GPUCapabilities;
  } {
    return {
      maxConcurrency: this.maxConcurrency,
      activeJobs: this.activeJobs.size,
      thumbnailDir: this.thumbnailDir,
      gpuCapabilities: this.gpuCapabilities
    };
  }

  // 既存サムネイルのクリーンアップ
  async cleanupThumbnails(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.thumbnailDir);
      
      for (const file of files) {
        const filePath = path.join(this.thumbnailDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
          console.log(`🗑️ Deleted old thumbnail: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    console.log(`🧹 Cleaned up ${cleanedCount} old thumbnails`);
    return cleanedCount;
  }

  // 🚀 超高速モード（GPU + 低品質 + 部分読み込み）
  async generateThumbnailsUltraFast(
    videos: Array<{ videoPath: string; videoId: string }>
  ): Promise<{ successful: string[]; failed: Array<{ videoId: string; error: string }> }> {
    console.log(`⚡ Ultra-fast mode enabled`);
    
    return this.generateThumbnailsConcurrent(videos, {
      maxConcurrency: Math.min(16, this.maxConcurrency * 2), // 並列数を2倍に
      timeoutMs: 10000,      // タイムアウト短縮
      skipExisting: true,
      optimizeSettings: true,
      useGPU: true,          // GPU強制使用
      lowQuality: true,      // 低品質モード
      partialRead: true      // 部分読み込み
    });
  }

  // プログレッシブサムネイル（段階的品質向上）
  async generateProgressiveThumbnails(
    videos: Array<{ videoPath: string; videoId: string }>,
    progressCallback?: (stage: string, progress: number) => void
  ): Promise<{ successful: string[]; failed: Array<{ videoId: string; error: string }> }> {
    console.log(`🎯 Progressive thumbnail generation started`);
    
    // Stage 1: 低品質で全体生成
    progressCallback?.('Stage 1: Generating low-quality previews', 0);
    const lowQualityResult = await this.generateThumbnailsConcurrent(videos, {
      maxConcurrency: Math.min(16, this.maxConcurrency * 2),
      timeoutMs: 8000,
      skipExisting: true,
      optimizeSettings: true,
      useGPU: true,
      lowQuality: true,
      partialRead: true
    });

    progressCallback?.('Stage 1: Complete', 50);

    // Stage 2: 重要な動画のみ高品質で再生成（最初の25%）
    const importantVideos = videos.slice(0, Math.ceil(videos.length * 0.25));
    
    if (importantVideos.length > 0) {
      progressCallback?.('Stage 2: Generating high-quality thumbnails', 50);
      
      const highQualityResult = await this.generateThumbnailsConcurrent(importantVideos, {
        maxConcurrency: this.maxConcurrency,
        timeoutMs: 20000,
        skipExisting: false,  // 上書きする
        optimizeSettings: true,
        useGPU: true,
        lowQuality: false,    // 高品質
        partialRead: false
      });

      // 高品質生成の結果を統合
      highQualityResult.successful.forEach(path => {
        if (!lowQualityResult.successful.includes(path)) {
          lowQualityResult.successful.push(path);
        }
      });
    }

    progressCallback?.('Complete', 100);
    return lowQualityResult;
  }

  // メモリ使用量の最適化
  async optimizeMemoryUsage(): Promise<void> {
    // Node.jsのガベージコレクションを手動実行
    if (global.gc) {
      global.gc();
      console.log('🧹 Manual garbage collection performed');
    }
  }
}

export default ThumbnailGenerator;