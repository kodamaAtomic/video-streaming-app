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
        
        // フォルダ操作ボタン
        const folderSelectBtn = document.getElementById('folder-select-btn');
        const folderChangeBtn = document.getElementById('folder-change-btn');

        if (folderSelectBtn) {
            folderSelectBtn.addEventListener('click', () => this.selectVideoFolder());
        }

        if (folderChangeBtn) {
            folderChangeBtn.addEventListener('click', () => this.changeVideoFolder());
        }
        
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
        img.alt = video.title || video.originalName;
        img.style.display = 'block';
        
        // タイトル要素
        const title = document.createElement('p');
        title.textContent = video.title || video.originalName;
        
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
    },

    // サーバー側の参照フォルダを切り替える機能
    async changeVideoFolder() {
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const folderStatus = document.getElementById('folder-status');
        
        if (!selectedFolderPath || !folderStatus) {
            console.error('Folder controls not found');
            return;
        }

        console.log('=== Debug changeVideoFolder ===');
        console.log('realFolderPath:', selectedFolderPath.dataset.realFolderPath);

        // 実際のフォルダパスがある場合（ローカルフォルダ選択）
        const realFolderPath = selectedFolderPath.dataset.realFolderPath;
        if (realFolderPath) {
            try {
                folderStatus.innerHTML = '<span style="color: blue;">🔄 サーバー参照フォルダを変更中...</span>';
                
                const response = await fetch('/api/videos/change-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        mode: 'local-folder',
                        folderPath: realFolderPath 
                    })
                });

                const result = await response.json();

                if (result.success) {
                    folderStatus.innerHTML = '<span style="color: green;">✅ サーバー参照フォルダが変更されました</span>';
                    console.log('Server folder changed successfully to:', result.data.newFolderPath);
                    
                    // サムネイルを再読み込み
                    await this.fetchThumbnails();
                    
                    setTimeout(() => {
                        folderStatus.innerHTML = '';
                    }, 3000);
                } else {
                    folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
                }
            } catch (error) {
                console.error('Server folder change error:', error);
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
            }
            return;
        }

        // フォルダパスが設定されていない場合
        folderStatus.innerHTML = '<span style="color: red;">❌ フォルダが選択されていません</span>';
    },

    // サーバー参照フォルダ選択ダイアログ機能
    async selectVideoFolder() {
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const changeFolderBtn = document.getElementById('change-folder-btn');
        const folderStatus = document.getElementById('folder-status');

        // 既存のデータをクリア
        selectedFolderPath.dataset.realFolderPath = '';

        try {
            folderStatus.innerHTML = '<span style="color: blue;">📁 フォルダ選択ダイアログを起動中...</span>';
            
            // File System Access APIをサポートしているかチェック
            if ('showDirectoryPicker' in window) {
                console.log('🔄 Using File System Access API (Modern browsers)');
                const directoryHandle = await window.showDirectoryPicker();
                
                // フォルダ名を取得
                const folderName = directoryHandle.name;
                
                // よくあるパス候補から選択する方式
                folderStatus.innerHTML = '<span style="color: blue;">📂 フォルダの場所を選択してください...</span>';
                
                const userPath = await this.selectFolderLocation(folderName);

                if (userPath) {
                    // フォルダとして設定
                    selectedFolderPath.textContent = `📁 選択済み: ${userPath}`;
                    selectedFolderPath.dataset.realFolderPath = userPath;
                    folderStatus.innerHTML = '<span style="color: green;">✅ フォルダが選択されました</span>';
                    
                    changeFolderBtn.textContent = 'サーバー参照フォルダに設定';
                    changeFolderBtn.disabled = false;
                } else {
                    folderStatus.innerHTML = '<span style="color: orange;">⚠️ フォルダパスの選択がキャンセルされました</span>';
                }
                
            } else {
                // フォールバック: input[type="file"]を使用（webkitdirectory）
                console.log('🔄 Falling back to webkitdirectory (Legacy browsers)');
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.webkitdirectory = true;
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                
                fileInput.addEventListener('change', async (event) => {
                    const files = Array.from(event.target.files);

                    if (files.length > 0) {
                        // 最初のファイルからフォルダパスを抽出
                        const firstFile = files[0];
                        const relativePath = firstFile.webkitRelativePath;
                        const pathParts = relativePath.split('/');
                        const folderName = pathParts[0];
                        
                        console.log('Relative path:', relativePath);
                        console.log('Folder name:', folderName);
                        
                        // フォルダ場所選択
                        const userPath = await this.selectFolderLocation(folderName);
                        
                        if (userPath) {
                            selectedFolderPath.textContent = `📁 選択済み: ${userPath}`;
                            selectedFolderPath.dataset.realFolderPath = userPath;
                            
                            changeFolderBtn.disabled = false;
                            changeFolderBtn.textContent = 'サーバー参照フォルダに設定';
                            folderStatus.innerHTML = '<span style="color: green;">✅ フォルダが選択されました</span>';
                        } else {
                            folderStatus.innerHTML = '<span style="color: orange;">⚠️ フォルダパスの選択がキャンセルされました</span>';
                        }
                    } else {
                        folderStatus.innerHTML = '<span style="color: orange;">フォルダが選択されませんでした</span>';
                    }
                    
                    document.body.removeChild(fileInput);
                });
                
                document.body.appendChild(fileInput);
                fileInput.click();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                folderStatus.innerHTML = '<span style="color: orange;">フォルダ選択がキャンセルされました</span>';
            } else {
                console.error('Folder selection error:', error);
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
            }
        }
    },

    // フォルダの場所を選択する（クロスプラットフォーム対応）
    async selectFolderLocation(folderName) {
        const platform = this.detectPlatform();
        const currentUser = this.getCurrentUser();
        const candidates = this.generatePlatformSpecificCandidates(folderName, currentUser, platform);

        let message = `フォルダ "${folderName}" の場所を選択してください:\n\n`;
        candidates.forEach((candidate, index) => {
            message += `${index + 1}. ${candidate.name} (${candidate.path})\n`;
        });
        message += `\n該当しない場合は「キャンセル」を押してフルパスを手動入力してください。`;

        const choice = prompt(message + '\n\n番号を入力してください (1-5):');
        
        if (choice && choice >= '1' && choice <= candidates.length.toString()) {
            const selectedIndex = parseInt(choice) - 1;
            return candidates[selectedIndex].path;
        } else if (choice === null) {
            // キャンセル
            return null;
        } else {
            // 手動入力
            const defaultPath = candidates[0]?.path || this.getDefaultPath(folderName, currentUser, platform);
            return prompt(
                `フォルダ "${folderName}" のフルパスを入力してください:\n\n例:\n${this.getExamplePaths(folderName, currentUser, platform)}`, 
                defaultPath
            );
        }
    },

    // プラットフォーム検出
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('win')) {
            return 'windows';
        } else if (userAgent.includes('mac')) {
            return 'macos';
        } else if (userAgent.includes('linux')) {
            return 'linux';
        } else {
            return 'unknown';
        }
    },

    // プラットフォーム固有の候補生成
    generatePlatformSpecificCandidates(folderName, currentUser, platform) {
        const candidates = [];
        
        switch (platform) {
            case 'windows':
                candidates.push(
                    { name: 'デスクトップ', path: `C:\\Users\\${currentUser}\\Desktop\\${folderName}` },
                    { name: 'ダウンロード', path: `C:\\Users\\${currentUser}\\Downloads\\${folderName}` },
                    { name: 'ドキュメント', path: `C:\\Users\\${currentUser}\\Documents\\${folderName}` },
                    { name: 'ビデオ', path: `C:\\Users\\${currentUser}\\Videos\\${folderName}` },
                    { name: 'ピクチャ', path: `C:\\Users\\${currentUser}\\Pictures\\${folderName}` }
                );
                break;
                
            case 'linux':
                candidates.push(
                    { name: 'デスクトップ', path: `/home/${currentUser}/Desktop/${folderName}` },
                    { name: 'ダウンロード', path: `/home/${currentUser}/Downloads/${folderName}` },
                    { name: 'ドキュメント', path: `/home/${currentUser}/Documents/${folderName}` },
                    { name: 'ビデオ', path: `/home/${currentUser}/Videos/${folderName}` },
                    { name: 'ピクチャ', path: `/home/${currentUser}/Pictures/${folderName}` }
                );
                break;
                
            case 'macos':
            default:
                candidates.push(
                    { name: 'デスクトップ', path: `/Users/${currentUser}/Desktop/${folderName}` },
                    { name: 'ダウンロード', path: `/Users/${currentUser}/Downloads/${folderName}` },
                    { name: 'ドキュメント', path: `/Users/${currentUser}/Documents/${folderName}` },
                    { name: 'ムービー', path: `/Users/${currentUser}/Movies/${folderName}` },
                    { name: 'ピクチャ', path: `/Users/${currentUser}/Pictures/${folderName}` }
                );
                break;
        }
        
        return candidates;
    },

    // デフォルトパス取得
    getDefaultPath(folderName, currentUser, platform) {
        switch (platform) {
            case 'windows':
                return `C:\\Users\\${currentUser}\\Desktop\\${folderName}`;
            case 'linux':
                return `/home/${currentUser}/Desktop/${folderName}`;
            case 'macos':
            default:
                return `/Users/${currentUser}/Desktop/${folderName}`;
        }
    },

    // 例示パス生成
    getExamplePaths(folderName, currentUser, platform) {
        switch (platform) {
            case 'windows':
                return `C:\\Users\\${currentUser}\\Desktop\\${folderName}\nC:\\Users\\${currentUser}\\Downloads\\${folderName}\nD:\\Videos\\${folderName}`;
            case 'linux':
                return `/home/${currentUser}/Desktop/${folderName}\n/home/${currentUser}/Downloads/${folderName}\n/media/${currentUser}/Videos/${folderName}`;
            case 'macos':
            default:
                return `/Users/${currentUser}/Desktop/${folderName}\n/Users/${currentUser}/Downloads/${folderName}\n/Volumes/ExternalDrive/${folderName}`;
        }
    },

    // パス候補を生成（クロスプラットフォーム対応）
    generatePathCandidates(folderName) {
        const platform = this.detectPlatform();
        const currentUser = this.getCurrentUser();
        const candidates = [];
        
        switch (platform) {
            case 'windows':
                const windowsDirs = ['Desktop', 'Downloads', 'Documents', 'Videos', 'Pictures'];
                windowsDirs.forEach(dir => {
                    candidates.push(`C:\\Users\\${currentUser}\\${dir}\\${folderName}`);
                });
                // 他のドライブも候補に
                candidates.push(`D:\\${folderName}`);
                candidates.push(`E:\\${folderName}`);
                break;
                
            case 'linux':
                const linuxDirs = ['Desktop', 'Downloads', 'Documents', 'Videos', 'Pictures'];
                linuxDirs.forEach(dir => {
                    candidates.push(`/home/${currentUser}/${dir}/${folderName}`);
                });
                // 一般的なLinuxディレクトリ
                candidates.push(`/media/${currentUser}/${folderName}`);
                candidates.push(`/mnt/${folderName}`);
                candidates.push(`/opt/${folderName}`);
                break;
                
            case 'macos':
            default:
                const macosDirs = ['Desktop', 'Downloads', 'Documents', 'Movies', 'Pictures'];
                macosDirs.forEach(dir => {
                    candidates.push(`/Users/${currentUser}/${dir}/${folderName}`);
                });
                // macOS特有のディレクトリ
                candidates.push(`/Volumes/${folderName}`);
                candidates.push(`/Applications/${folderName}`);
                candidates.push(`/tmp/${folderName}`);
                break;
        }
        
        return candidates;
    },

    // 現在のユーザー名を推測（クロスプラットフォーム対応）
    getCurrentUser() {
        const platform = this.detectPlatform();
        
        // プラットフォーム別のデフォルトユーザー名
        switch (platform) {
            case 'windows':
                return 'User'; // Windowsの一般的なユーザー名
            case 'linux':
                return 'user'; // Linuxの一般的なユーザー名
            case 'macos':
            default:
                return 'tok'; // macOSのデフォルト（実際の環境に合わせて調整）
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
window.changeVideoFolder = () => VideoApp.changeVideoFolder();
window.selectVideoFolder = () => VideoApp.selectVideoFolder();
window.runThumbnailTests = () => {
    console.log('🧪 Running thumbnail tests...');
    // テスト関数をここに実装
};