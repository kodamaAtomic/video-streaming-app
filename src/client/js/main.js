// メイン制御用のJavaScript

// グローバル変数（名前空間を使用して衝突回避）
const VideoApp = {
    elements: {
        thumbnailGrid: null,
        videoPlayer: null,
        videoModal: null,
        modalTitle: null,
        uploadInput: null,
        uploadProgress: null
    },
    
    currentGridSize: 24,
    currentVideos: [],
    
    // 初期化
    init() {
        console.log('🚀 VideoApp initializing...');
        this.elements.thumbnailGrid = document.getElementById('thumbnail-grid');
        this.elements.videoPlayer = document.getElementById('video-player');
        this.elements.videoModal = document.getElementById('video-modal');
        this.elements.modalTitle = document.getElementById('modal-video-title');
        this.elements.uploadInput = document.getElementById('video-upload');
        this.elements.uploadProgress = document.getElementById('upload-progress');
        
        // DOM要素の存在確認
        this.checkElements();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // 初期データ読み込み
        this.fetchThumbnails();
    },
    
    // DOM要素の存在確認
    checkElements() {
        const required = ['thumbnailGrid', 'videoPlayer', 'videoModal'];
        required.forEach(key => {
            if (!this.elements[key]) {
                console.error(`❌ Required element not found: ${key}`);
            } else {
                console.log(`✅ Element found: ${key}`);
            }
        });
    },
    
    // イベントリスナーの設定
    setupEventListeners() {
        // ビューサイズ切り替えボタン
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(e.target.dataset.count);
                this.changeGridSize(count);
            });
        });
        
        // モーダルの外側クリックで閉じる
        this.elements.videoModal.addEventListener('click', (e) => {
            if (e.target === this.elements.videoModal) {
                this.closeVideoPlayer();
            }
        });
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.videoModal.style.display === 'block') {
                this.closeVideoPlayer();
            }
        });
    },
    
    // グリッドサイズ変更
    changeGridSize(count) {
        console.log(`🔄 Changing grid size to: ${count}`);
        
        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.count) === count) {
                btn.classList.add('active');
            }
        });
        
        // グリッドクラスを更新
        this.elements.thumbnailGrid.className = `grid-${count}`;
        this.currentGridSize = count;
        
        // 表示するビデオ数を制限
        this.displayThumbnails(this.currentVideos.slice(0, count));
    },
    
    // サムネイル取得
    async fetchThumbnails() {
        try {
            console.log('🔍 Fetching thumbnails...');
            
            const response = await fetch('/api/videos');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📋 API Response:', result);
            
            if (result.success && result.data) {
                const videosWithThumbnails = result.data.filter(video => video.thumbnailUrl);
                this.currentVideos = videosWithThumbnails;
                
                // 現在のグリッドサイズに応じて表示
                this.displayThumbnails(videosWithThumbnails.slice(0, this.currentGridSize));
            } else {
                this.elements.thumbnailGrid.innerHTML = '<p>ビデオの取得に失敗しました。</p>';
            }
        } catch (error) {
            console.error('❌ Error fetching thumbnails:', error);
            this.elements.thumbnailGrid.innerHTML = '<p>エラーが発生しました。</p>';
        }
    },
    
    // サムネイル表示
    displayThumbnails(videos) {
        if (!this.elements.thumbnailGrid) {
            console.error('❌ thumbnail-grid element not found!');
            return;
        }
        
        this.elements.thumbnailGrid.innerHTML = '';
        
        if (videos.length === 0) {
            this.elements.thumbnailGrid.innerHTML = '<p>サムネイルはありません。</p>';
            return;
        }
        
        videos.forEach((video, index) => {
            this.createThumbnailElement(video, index);
        });
        
        console.log(`📊 Displayed ${videos.length} thumbnails in ${this.currentGridSize} grid mode`);
    },
    
    // サムネイル要素作成
    createThumbnailElement(video, index) {
        console.log(`🖼️ Creating thumbnail ${index + 1}: ${video.thumbnailUrl}`);
        
        const thumbnailElement = document.createElement('div');
        thumbnailElement.className = 'thumbnail';
        thumbnailElement.style.position = 'relative';
        
        // 画像要素
        const img = document.createElement('img');
        img.src = video.thumbnailUrl;
        img.alt = video.title;
        img.style.display = 'block';
        
        // タイトル要素
        const title = document.createElement('p');
        title.textContent = video.title;
        
        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            this.deleteVideo(video.id);
        };
        
        // 画像ロードイベント
        img.onload = () => {
            console.log(`✅ Thumbnail loaded: ${video.thumbnailUrl}`);
        };
        
        img.onerror = () => {
            console.error(`❌ Failed to load thumbnail: ${video.thumbnailUrl}`);
            const placeholder = document.createElement('div');
            placeholder.className = 'thumbnail-placeholder';
            placeholder.textContent = 'サムネイル読み込み失敗';
            img.parentNode.replaceChild(placeholder, img);
        };
        
        // 要素組み立て
        thumbnailElement.appendChild(img);
        thumbnailElement.appendChild(title);
        thumbnailElement.appendChild(deleteButton);
        
        // クリックイベント（モーダルで再生）
        thumbnailElement.addEventListener('click', () => {
            this.openVideoPlayer(video);
        });
        
        this.elements.thumbnailGrid.appendChild(thumbnailElement);
    },
    
    // ビデオプレイヤーを開く
    openVideoPlayer(video) {
        console.log(`▶️ Opening video player for: ${video.title}`);
        
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = video.title;
        }
        
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.src = `/api/videos/${video.id}/stream`;
        }
        
        if (this.elements.videoModal) {
            this.elements.videoModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // スクロール無効化
        }
    },
    
    // ビデオプレイヤーを閉じる
    closeVideoPlayer() {
        console.log('🔒 Closing video player');
        
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.pause();
            this.elements.videoPlayer.src = '';
        }
        
        if (this.elements.videoModal) {
            this.elements.videoModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // スクロール有効化
        }
    },
    
    // ビデオ削除
    async deleteVideo(videoId) {
        if (!confirm('このビデオを削除しますか？')) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting video: ${videoId}`);
            
            const response = await fetch(`/api/videos/${videoId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Video deleted successfully');
                this.fetchThumbnails(); // 再読み込み
            } else {
                console.error('❌ Failed to delete video:', result.message);
                alert(`削除に失敗しました: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Error deleting video:', error);
            alert(`エラーが発生しました: ${error.message}`);
        }
    },
    
    // ビデオアップロード
    async uploadVideo() {
        if (!this.elements.uploadInput || !this.elements.uploadInput.files[0]) {
            alert('ファイルを選択してください');
            return;
        }
        
        const formData = new FormData();
        formData.append('video', this.elements.uploadInput.files[0]);
        
        if (this.elements.uploadProgress) {
            this.elements.uploadProgress.innerHTML = 'アップロード中...';
        }
        
        try {
            const response = await fetch('/api/videos/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (this.elements.uploadProgress) {
                    this.elements.uploadProgress.innerHTML = 'アップロード完了！';
                }
                this.fetchThumbnails(); // 再読み込み
                this.elements.uploadInput.value = ''; // クリア
            } else {
                if (this.elements.uploadProgress) {
                    this.elements.uploadProgress.innerHTML = `エラー: ${result.message}`;
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (this.elements.uploadProgress) {
                this.elements.uploadProgress.innerHTML = `エラー: ${error.message}`;
            }
        }
    }
};

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    VideoApp.init();
});

// グローバル関数として公開
window.uploadVideo = () => VideoApp.uploadVideo();
window.debugFetchThumbnails = () => VideoApp.fetchThumbnails();
window.closeVideoPlayer = () => VideoApp.closeVideoPlayer();
window.runThumbnailTests = () => {
    console.log('🧪 Running thumbnail tests...');
    // テスト関数をここに実装
};