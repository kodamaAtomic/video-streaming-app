export interface Video {
    id: string;
    title: string;
    description: string;
    filePath: string;
    thumbnailPath: string;
    duration: number; // in seconds
}

export interface Thumbnail {
    id: string;
    videoId: string;
    imagePath: string;
    createdAt: Date;
}