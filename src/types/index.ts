export interface VideoMetadata {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  thumbnailPath?: string;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThumbnailOptions {
  timemarks?: string[];
  count?: number;
  size?: string;
  filename?: string;
}

export interface VideoStreamRange {
  start: number;
  end: number;
  contentLength: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 登録フォルダ情報
export interface RegisteredFolder {
  id: string;      // 一意ID（パスのハッシュ等）
  path: string;    // 絶対パス
  name: string;    // 表示名（省略時はフォルダ名）
  createdAt: Date; // 登録日時
}