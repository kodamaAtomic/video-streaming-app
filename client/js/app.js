class VideoStreamingApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.videos = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadVideos();
    }

    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadBtn');
        const videoUpload = document.getElementById('videoUpload');
        const closePlayer = document.getElementById('closePlayer');

        uploadBtn.addEventListener('click', () => this.handleUpload());
        videoUpload.addEventListener('change', (e) => this.handleFileSelect(e));
        closePlayer.addEventListener('click', () => this.closeVideoPlayer());
    }

    async loadVideos() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/videos`);
            const result = await response.json();
            
            if (result.success) {
                this.videos = result.data;
                this.renderVideoGrid();
            } else {
                this.showError('Failed to load videos: ' + result.message);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos. Please check your connection.');
        }
    }

    renderVideoGrid() {
        const grid = document.getElementById('videoGrid');
        
        if (this.videos.length === 0) {
            grid.innerHTML = '<div class="loading">No videos found. Upload some videos to get started!</div>';
            return;
        }

        grid.innerHTML = this.videos.map(video => this.createVideoCard(video)).join('');
        
        // Add click event listeners
        grid.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    const videoId = card.dataset.videoId;
                    this.playVideo(videoId);
                }
            });
        });

        // Add delete event listeners
        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = btn.dataset.videoId;
                this.deleteVideo(videoId);
            });
        });
    }

    createVideoCard(video) {
        const thumbnailUrl = video.thumbnailPath 
            ? `/api/thumbnails/${path.basename(video.thumbnailPath)}`
            : null;

        const fileSize = this.formatFileSize(video.size);
        const uploadDate = new Date(video.createdAt).toLocaleDateString();

        return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    ${thumbnailUrl 
                        ? `<img src="${thumbnailUrl}" alt="Thumbnail for ${video.originalName}" onerror="this.style.display='none'; this.parentNode.innerHTML='No Thumbnail';">` 
                        : 'No Thumbnail'
                    }
                </div>
                <div class="video-card-info">
                    <div class="video-title">${this.escapeHtml(video.originalName)}</div>
                    <div class="video-details">
                        <span class="video-size">${fileSize}</span>
                        <span class="upload-date">${uploadDate}</span>
                    </div>
                    <button class="delete-btn" data-video-id="${video.id}">Delete</button>
                </div>
            </div>
        `;
    }

    async playVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        const player = document.getElementById('videoPlayer');
        const playerContainer = document.getElementById('videoPlayerContainer');
        const videoTitle = document.getElementById('videoTitle');

        player.src = `${this.apiBaseUrl}/videos/${videoId}/stream`;
        videoTitle.textContent = video.originalName;
        playerContainer.style.display = 'block';
        
        // Scroll to player
        playerContainer.scrollIntoView({ behavior: 'smooth' });
    }

    closeVideoPlayer() {
        const player = document.getElementById('videoPlayer');
        const playerContainer = document.getElementById('videoPlayerContainer');
        
        player.pause();
        player.src = '';
        playerContainer.style.display = 'none';
    }

    async deleteVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/videos/${videoId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadVideos(); // Reload the video list
                this.showSuccess('Video deleted successfully');
            } else {
                this.showError('Failed to delete video: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showError('Failed to delete video. Please try again.');
        }
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            document.getElementById('uploadBtn').textContent = `Upload ${files.length} video(s)`;
        } else {
            document.getElementById('uploadBtn').textContent = 'Upload Videos';
        }
    }

    async handleUpload() {
        const fileInput = document.getElementById('videoUpload');
        const files = fileInput.files;

        if (files.length === 0) {
            this.showError('Please select at least one video file');
            return;
        }

        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                uploadBtn.textContent = `Uploading ${i + 1}/${files.length}...`;
                await this.uploadSingleFile(file);
            }

            fileInput.value = '';
            uploadBtn.textContent = 'Upload Videos';
            uploadBtn.disabled = false;
            
            await this.loadVideos();
            this.showSuccess(`Successfully uploaded ${files.length} video(s)`);
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Upload failed: ' + error.message);
            uploadBtn.textContent = 'Upload Videos';
            uploadBtn.disabled = false;
        }
    }

    async uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch(`${this.apiBaseUrl}/videos/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed for ${file.name}`);
        }

        return response.json();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Helper function to get basename (since we don't have Node.js path module in browser)
const path = {
    basename: (filePath) => {
        return filePath.split('/').pop() || filePath.split('\\').pop();
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoStreamingApp();
});