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
        const uploadSelectedBtn = document.getElementById('upload-selected-btn');
        const localFolderBtn = document.getElementById('local-folder-btn');
        const localFolderInput = document.getElementById('local-folder-input');

        if (folderSelectBtn) {
            folderSelectBtn.addEventListener('click', () => this.selectVideoFolder());
        }

        if (folderChangeBtn) {
            folderChangeBtn.addEventListener('click', () => this.changeVideoFolder());
        }

        if (uploadSelectedBtn) {
            uploadSelectedBtn.addEventListener('click', () => this.uploadSelectedFiles());
        }

        if (localFolderBtn) {
            localFolderBtn.addEventListener('click', () => this.selectLocalFolder());
        }

        if (localFolderInput) {
            localFolderInput.addEventListener('change', (e) => this.handleLocalFolderSelection(e));
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
        console.log(`🖼️ Creating thumbnail ${index + 1}: ${video.thumbnailUrl || 'Browser file'}`);
        
        const thumbnailElement = document.createElement('div');
        thumbnailElement.className = 'thumbnail';
        thumbnailElement.style.position = 'relative';
        
        // ブラウザ選択ファイルの場合
        if (video.isBrowserFile) {
            // プレースホルダー画像
            const placeholder = document.createElement('div');
            placeholder.className = 'thumbnail-placeholder browser-file';
            placeholder.style.cssText = `
                width: 100%;
                height: 120px;
                background: linear-gradient(135deg, #6c757d, #495057);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                border-radius: 8px;
                cursor: pointer;
            `;
            placeholder.innerHTML = '🎬<br>ブラウザ<br>ファイル';
            
            // タイトル要素
            const title = document.createElement('p');
            title.textContent = video.originalName;
            title.style.cssText = `
                margin: 8px 0;
                font-size: 12px;
                color: var(--text-primary);
                text-align: center;
                word-break: break-all;
            `;
            
            // ファイル情報
            const fileInfo = document.createElement('p');
            const sizeInMB = (video.size / (1024 * 1024)).toFixed(1);
            fileInfo.textContent = `${sizeInMB} MB`;
            fileInfo.style.cssText = `
                margin: 4px 0;
                font-size: 10px;
                color: var(--text-muted);
                text-align: center;
            `;
            
            thumbnailElement.appendChild(placeholder);
            thumbnailElement.appendChild(title);
            thumbnailElement.appendChild(fileInfo);
            
            // クリックイベント（ブラウザファイルは再生不可の通知）
            thumbnailElement.addEventListener('click', () => {
                alert('ブラウザで選択されたファイルは直接再生できません。\nサーバーにアップロードしてから再生してください。');
            });
            
        } else {
            // 通常のサーバーファイル
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
        }
        
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

    // フォルダ変更機能（ワークフォルダとして設定）
    async changeVideoFolder() {
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const folderStatus = document.getElementById('folder-status');
        
        if (!selectedFolderPath || !folderStatus) {
            console.error('Folder controls not found');
            return;
        }

        console.log('=== Debug changeVideoFolder ===');
        console.log('folderHandle:', selectedFolderPath.dataset.folderHandle);
        console.log('fallbackFiles:', selectedFolderPath.dataset.fallbackFiles);
        console.log('folderPath:', selectedFolderPath.dataset.folderPath);
        console.log('realFolderPath:', selectedFolderPath.dataset.realFolderPath);

        // 実際のフォルダパスがある場合（ローカルフォルダ選択）
        const realFolderPath = selectedFolderPath.dataset.realFolderPath;
        if (realFolderPath) {
            try {
                folderStatus.innerHTML = '<span style="color: blue;">🔄 ワークフォルダを変更中...</span>';
                
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
                    folderStatus.innerHTML = '<span style="color: green;">✅ ワークフォルダが変更されました</span>';
                    console.log('Work folder changed successfully to:', result.data.newFolderPath);
                    
                    // アップロードボタンを非表示
                    const uploadBtn = document.getElementById('upload-selected-btn');
                    if (uploadBtn) {
                        uploadBtn.style.display = 'none';
                    }
                    
                    // サムネイルを再読み込み
                    await this.fetchThumbnails();
                    
                    setTimeout(() => {
                        folderStatus.innerHTML = '';
                    }, 3000);
                } else {
                    folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
                }
            } catch (error) {
                console.error('Work folder change error:', error);
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
            }
            return;
        }

        // ブラウザで選択されたフォルダの場合（アップロードモード）
        if (selectedFolderPath.dataset.folderHandle === 'browser-directory') {
            try {
                folderStatus.innerHTML = '<span style="color: blue;">ブラウザ選択フォルダを処理中...</span>';
                
                const videoFiles = JSON.parse(selectedFolderPath.dataset.videoFiles || '[]');
                console.log('Processing browser directory with files:', videoFiles);
                
                // アップロードボタンを表示
                const uploadBtn = document.getElementById('upload-selected-btn');
                if (uploadBtn) {
                    uploadBtn.style.display = 'inline-block';
                    uploadBtn.disabled = false;
                }
                
                const response = await fetch('/api/videos/change-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        mode: 'browser-selection',
                        videoFiles: videoFiles 
                    })
                });

                const result = await response.json();

                if (result.success) {
                    folderStatus.innerHTML = '<span style="color: green;">✅ ブラウザ選択フォルダの処理完了<br>📤 「選択ファイルをアップロード」ボタンでファイルを転送できます</span>';
                    console.log('Browser folder processed successfully:', result.data);
                    
                    // サムネイル情報を直接更新（ブラウザ選択モードでは既にファイル情報があるため）
                    await this.updateThumbnailsFromBrowserFiles(videoFiles);
                    
                    setTimeout(() => {
                        folderStatus.innerHTML = '';
                    }, 5000);
                } else {
                    folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
                }
            } catch (error) {
                console.error('Browser folder change error:', error);
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
            }
            return;
        }

        // フォールバックファイル選択の場合
        if (selectedFolderPath.dataset.fallbackFiles) {
            try {
                folderStatus.innerHTML = '<span style="color: blue;">選択されたファイルを処理中...</span>';
                
                const fallbackFiles = JSON.parse(selectedFolderPath.dataset.fallbackFiles);
                
                // アップロードボタンを表示
                const uploadBtn = document.getElementById('upload-selected-btn');
                if (uploadBtn) {
                    uploadBtn.style.display = 'inline-block';
                    uploadBtn.disabled = false;
                }
                
                const response = await fetch('/api/videos/change-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        mode: 'fallback-files',
                        videoFiles: fallbackFiles 
                    })
                });

                const result = await response.json();

                if (result.success) {
                    folderStatus.innerHTML = '<span style="color: green;">✅ ファイル選択の処理完了<br>📤 「選択ファイルをアップロード」ボタンでファイルを転送できます</span>';
                    console.log('Fallback files processed successfully:', result.data);
                    
                    // サムネイル情報を直接更新
                    await this.updateThumbnailsFromBrowserFiles(fallbackFiles);
                    
                    setTimeout(() => {
                        folderStatus.innerHTML = '';
                    }, 5000);
                } else {
                    folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
                }
            } catch (error) {
                console.error('Fallback files change error:', error);
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
            }
            return;
        }

        // 従来のサーバーフォルダパス処理
        const folderPath = selectedFolderPath.dataset.folderPath;
        if (!folderPath) {
            folderStatus.innerHTML = '<span style="color: red;">フォルダが選択されていません</span>';
            return;
        }

        try {
            folderStatus.innerHTML = '<span style="color: blue;">フォルダを変更中...</span>';
            
            const response = await fetch('/api/videos/change-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderPath })
            });

            const result = await response.json();

            if (result.success) {
                folderStatus.innerHTML = '<span style="color: green;">✅ フォルダ変更完了</span>';
                console.log('Folder changed successfully to:', result.data.newFolderPath);
                
                // サムネイルを再読み込み
                await this.fetchThumbnails();
                
                setTimeout(() => {
                    folderStatus.innerHTML = '';
                }, 3000);
            } else {
                folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
            }
        } catch (error) {
            console.error('Change folder error:', error);
            folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
        }
    },

    // 選択されたファイルをサーバーにアップロード
    async uploadSelectedFiles() {
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const folderStatus = document.getElementById('folder-status');
        
        if (!selectedFolderPath || !folderStatus) {
            console.error('Folder controls not found');
            return;
        }

        let filesToUpload = [];
        let fileObjects = [];

        try {
            // ブラウザ選択フォルダの場合（File System Access API）
            if (selectedFolderPath.dataset.folderHandle === 'browser-directory') {
                const directoryHandle = window.selectedDirectoryHandle;
                
                if (!directoryHandle) {
                    folderStatus.innerHTML = '<span style="color: red;">❌ フォルダが再選択されていません。フォルダを再選択してください。</span>';
                    return;
                }
                
                folderStatus.innerHTML = '<span style="color: blue;">🔄 File System Access APIからファイルを取得中...</span>';
                
                // File System Access APIからファイルオブジェクトを取得
                for await (const [name, handle] of directoryHandle.entries()) {
                    if (handle.kind === 'file') {
                        const ext = name.toLowerCase().split('.').pop();
                        if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
                            const file = await handle.getFile();
                            fileObjects.push(file);
                        }
                    }
                }
            }
            // フォールバックファイル選択の場合
            else if (selectedFolderPath.dataset.fallbackFiles) {
                // webkitdirectoryの場合、ファイルオブジェクトは既に保存されていない
                // ユーザーに再選択を促す
                folderStatus.innerHTML = '<span style="color: orange;">⚠️ フォールバックモードでは再度ファイルを選択してください</span>';
                this.showFallbackFileUploader();
                return;
            }

            if (fileObjects.length === 0) {
                folderStatus.innerHTML = '<span style="color: orange;">アップロード可能なビデオファイルが見つかりませんでした</span>';
                return;
            }

            folderStatus.innerHTML = `<span style="color: blue;">📤 ${fileObjects.length}個のファイルをアップロード中...</span>`;
            
            let successCount = 0;
            let errorCount = 0;

            for (const [index, file] of fileObjects.entries()) {
                try {
                    folderStatus.innerHTML = `<span style="color: blue;">📤 ファイル ${index + 1}/${fileObjects.length}: ${file.name} をアップロード中...</span>`;
                    
                    const formData = new FormData();
                    formData.append('video', file);
                    
                    const response = await fetch('/api/videos/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        successCount++;
                        console.log(`✅ Uploaded: ${file.name}`);
                    } else {
                        errorCount++;
                        console.error(`❌ Failed to upload: ${file.name}`, result.message);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error uploading: ${file.name}`, error);
                }
            }

            // 結果表示
            if (errorCount === 0) {
                folderStatus.innerHTML = `<span style="color: green;">✅ 全ての${successCount}個のファイルのアップロードが完了しました</span>`;
            } else {
                folderStatus.innerHTML = `<span style="color: orange;">⚠️ ${successCount}個成功、${errorCount}個失敗でアップロードが完了しました</span>`;
            }

            // サムネイルを再読み込み
            await this.fetchThumbnails();
            
            setTimeout(() => {
                folderStatus.innerHTML = '';
            }, 5000);

        } catch (error) {
            console.error('Upload selected files error:', error);
            folderStatus.innerHTML = `<span style="color: red;">❌ アップロードエラー: ${error.message}</span>`;
        }
    },

    // フォールバックファイルアップローダー
    showFallbackFileUploader() {
        const folderStatus = document.getElementById('folder-status');
        
        // 隠しファイル入力を作成
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.webkitdirectory = true;
        fileInput.multiple = true;
        fileInput.accept = 'video/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files);
            const videoFiles = files.filter(file => {
                const ext = file.name.toLowerCase().split('.').pop();
                return ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext);
            });

            if (videoFiles.length > 0) {
                folderStatus.innerHTML = `<span style="color: blue;">📤 ${videoFiles.length}個のファイルをアップロード中...</span>`;
                
                let successCount = 0;
                let errorCount = 0;

                for (const [index, file] of videoFiles.entries()) {
                    try {
                        folderStatus.innerHTML = `<span style="color: blue;">📤 ファイル ${index + 1}/${videoFiles.length}: ${file.name} をアップロード中...</span>`;
                        
                        const formData = new FormData();
                        formData.append('video', file);
                        
                        const response = await fetch('/api/videos/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            successCount++;
                            console.log(`✅ Uploaded: ${file.name}`);
                        } else {
                            errorCount++;
                            console.error(`❌ Failed to upload: ${file.name}`, result.message);
                        }
                    } catch (error) {
                        errorCount++;
                        console.error(`❌ Error uploading: ${file.name}`, error);
                    }
                }

                // 結果表示
                if (errorCount === 0) {
                    folderStatus.innerHTML = `<span style="color: green;">✅ 全ての${successCount}個のファイルのアップロードが完了しました</span>`;
                } else {
                    folderStatus.innerHTML = `<span style="color: orange;">⚠️ ${successCount}個成功、${errorCount}個失敗でアップロードが完了しました</span>`;
                }

                // サムネイルを再読み込み
                await this.fetchThumbnails();
                
                setTimeout(() => {
                    folderStatus.innerHTML = '';
                }, 5000);
            } else {
                folderStatus.innerHTML = '<span style="color: orange;">選択されたフォルダにビデオファイルが見つかりませんでした</span>';
            }
            
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    },

    // ブラウザで選択されたファイル情報からサムネイル表示を更新
    async updateThumbnailsFromBrowserFiles(videoFiles) {
        const thumbnailGrid = this.elements.thumbnailGrid;
        if (!thumbnailGrid) return;

        // ローディング表示
        thumbnailGrid.innerHTML = '<p>ブラウザ選択ファイルを処理中...</p>';

        try {
            // ビデオファイル情報を表示用に変換
            const videoItems = videoFiles.map((file, index) => {
                return {
                    id: `browser-${index}`,
                    originalName: file.name,
                    size: file.size,
                    uploadDate: new Date(file.lastModified),
                    thumbnailUrl: null, // ブラウザ選択ではサムネイル生成不可
                    isBrowserFile: true
                };
            });

            this.displayThumbnails(videoItems);
            
            console.log(`Displayed ${videoFiles.length} browser-selected video files`);
        } catch (error) {
            console.error('Error updating browser files display:', error);
            thumbnailGrid.innerHTML = '<p>ファイル表示エラー</p>';
        }
    },

    // フォルダ選択ダイアログ機能
    async selectVideoFolder() {
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const changeFolderBtn = document.getElementById('change-folder-btn');
        const folderStatus = document.getElementById('folder-status');

        // 既存のデータをクリア
        selectedFolderPath.dataset.folderHandle = '';
        selectedFolderPath.dataset.fallbackFiles = '';
        selectedFolderPath.dataset.folderPath = '';
        selectedFolderPath.dataset.videoFiles = '';
        selectedFolderPath.dataset.realFolderPath = '';

        try {
            folderStatus.innerHTML = '<span style="color: blue;">📁 フォルダ選択方法を確認中...</span>';
            
            // File System Access APIをサポートしているかチェック
            if ('showDirectoryPicker' in window) {
                console.log('🔄 Using File System Access API (Modern browsers)');
                const directoryHandle = await window.showDirectoryPicker();
                
                // ディレクトリハンドルから実際のパスを取得を試行
                const folderName = directoryHandle.name;
                
                // ローカルフォルダの実際のパスを取得しようと試行
                let realFolderPath = '';
                try {
                    // デスクトップアプリかElectronの場合、パスが取得できる可能性がある
                    if (window.electronAPI && window.electronAPI.getFolderPath) {
                        realFolderPath = await window.electronAPI.getFolderPath(directoryHandle);
                    } else {
                        // ブラウザ版では制限のため、パス情報の取得を試行
                        if (directoryHandle.name && directoryHandle.name.startsWith('/')) {
                            realFolderPath = directoryHandle.name;
                        }
                    }
                } catch (pathError) {
                    console.log('Path extraction not available in browser environment');
                }

                if (realFolderPath) {
                    // ローカルフォルダとして設定
                    selectedFolderPath.textContent = `📁 ワークフォルダ: ${realFolderPath}`;
                    selectedFolderPath.dataset.realFolderPath = realFolderPath;
                    folderStatus.innerHTML = '<span style="color: green;">✅ ローカルフォルダが選択されました（ワークフォルダモード）</span>';
                    
                    changeFolderBtn.textContent = 'ワークフォルダに設定';
                } else {
                    // ブラウザファイルアクセスモード
                    selectedFolderPath.textContent = `📂 ブラウザ選択: ${folderName}`;
                    
                    // DirectoryHandleはグローバル変数に保存（シリアライズできないため）
                    window.selectedDirectoryHandle = directoryHandle;
                    
                    // ファイル一覧を取得してサーバーに送信する方法に変更
                    await this.handleDirectorySelection(directoryHandle);
                    
                    folderStatus.innerHTML = '<span style="color: green;">✅ ブラウザフォルダが選択されました（アップロードモード）</span>';
                    changeFolderBtn.textContent = 'フォルダ処理';
                }
                
                changeFolderBtn.disabled = false;
                
            } else {
                // フォールバック: input[type="file"]を使用
                console.log('🔄 Falling back to input file method (Legacy browsers)');
                this.showFallbackFolderSelector();
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

    // Directory Handleを処理
    async handleDirectorySelection(directoryHandle) {
        try {
            const videoFiles = [];
            
            // ディレクトリ内のファイルを列挙
            for await (const [name, handle] of directoryHandle.entries()) {
                if (handle.kind === 'file') {
                    // ビデオファイルかチェック
                    const ext = name.toLowerCase().split('.').pop();
                    if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
                        const file = await handle.getFile();
                        videoFiles.push({
                            name: file.name,
                            size: file.size,
                            lastModified: file.lastModified,
                            type: file.type
                        });
                    }
                }
            }

            console.log(`Found ${videoFiles.length} video files in selected directory`);
            
            // 選択されたフォルダの情報を保存
            const selectedFolderPath = document.getElementById('selected-folder-path');
            selectedFolderPath.dataset.videoFiles = JSON.stringify(videoFiles);
            selectedFolderPath.dataset.folderHandle = 'browser-directory';
            
            console.log('Set folderHandle to:', selectedFolderPath.dataset.folderHandle);
            console.log('Video files data:', selectedFolderPath.dataset.videoFiles);
            
        } catch (error) {
            console.error('Error processing directory:', error);
            throw error;
        }
    },

    // フォールバック: ファイル選択
    showFallbackFolderSelector() {
        const folderStatus = document.getElementById('folder-status');
        
        // 隠しファイル入力を作成
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.webkitdirectory = true;
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
            const files = Array.from(event.target.files);
            const videoFiles = files.filter(file => {
                const ext = file.name.toLowerCase().split('.').pop();
                return ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(ext);
            });

            if (videoFiles.length > 0) {
                const folderPath = videoFiles[0].webkitRelativePath.split('/')[0];
                const selectedFolderPath = document.getElementById('selected-folder-path');
                const changeFolderBtn = document.getElementById('change-folder-btn');
                
                selectedFolderPath.textContent = `選択済み: ${folderPath} (${videoFiles.length}個のビデオ)`;
                selectedFolderPath.dataset.folderPath = folderPath;
                selectedFolderPath.dataset.fallbackFiles = JSON.stringify(videoFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    lastModified: f.lastModified,
                    type: f.type,
                    path: f.webkitRelativePath
                })));
                
                console.log('Fallback folder selection set:');
                console.log('- folderPath:', selectedFolderPath.dataset.folderPath);
                console.log('- fallbackFiles:', selectedFolderPath.dataset.fallbackFiles);
                
                changeFolderBtn.disabled = false;
                folderStatus.innerHTML = '<span style="color: green;">✅ フォルダが選択されました（フォールバックモード）</span>';
            } else {
                folderStatus.innerHTML = '<span style="color: orange;">選択されたフォルダにビデオファイルが見つかりませんでした</span>';
            }
            
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    },

    // ローカルフォルダ選択ダイアログを開く
    selectLocalFolder() {
        const localFolderInput = document.getElementById('local-folder-input');
        if (localFolderInput) {
            localFolderInput.click();
        }
    },

    // ローカルフォルダ選択の処理
    async handleLocalFolderSelection(event) {
        const files = Array.from(event.target.files);
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const folderStatus = document.getElementById('folder-status');
        const changeFolderBtn = document.getElementById('change-folder-btn');
        
        if (!selectedFolderPath || !folderStatus) {
            console.error('Local folder selection controls not found');
            return;
        }
        
        if (files.length === 0) {
            folderStatus.innerHTML = '<span style="color: red;">❌ フォルダが選択されませんでした</span>';
            return;
        }
        
        try {
            folderStatus.innerHTML = '<span style="color: blue;">🔄 ローカルフォルダを処理中...</span>';
            
            // 最初のファイルからフォルダパスを抽出
            const firstFile = files[0];
            const relativePath = firstFile.webkitRelativePath;
            const pathParts = relativePath.split('/');
            const folderName = pathParts[0];
            
            console.log('Relative path:', relativePath);
            console.log('Folder name:', folderName);
            
            // 複数のパス候補を生成
            const pathCandidates = this.generatePathCandidates(folderName);
            
            // サーバーで各候補を試行
            let successfulPath = null;
            
            for (const candidatePath of pathCandidates) {
                console.log(`Trying path: ${candidatePath}`);
                
                try {
                    const response = await fetch('/api/videos/change-folder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            mode: 'local-folder',
                            folderPath: candidatePath 
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        successfulPath = candidatePath;
                        console.log(`✅ Found working path: ${candidatePath}`);
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Path failed: ${candidatePath}`);
                }
            }

            if (successfulPath) {
                // UI更新
                selectedFolderPath.textContent = `📁 ワークフォルダ: ${successfulPath}`;
                selectedFolderPath.dataset.realFolderPath = successfulPath;
                
                // 既存のデータをクリア
                selectedFolderPath.dataset.folderHandle = '';
                selectedFolderPath.dataset.fallbackFiles = '';
                selectedFolderPath.dataset.folderPath = '';
                selectedFolderPath.dataset.videoFiles = '';
                
                folderStatus.innerHTML = '<span style="color: green;">✅ ワークフォルダが設定されました</span>';
                console.log('Work folder set successfully to:', successfulPath);
                
                // アップロードボタンを非表示
                const uploadBtn = document.getElementById('upload-selected-btn');
                if (uploadBtn) {
                    uploadBtn.style.display = 'none';
                }
                
                // フォルダ変更ボタンを無効化（既に設定済みのため）
                if (changeFolderBtn) {
                    changeFolderBtn.disabled = true;
                    changeFolderBtn.textContent = '設定済み';
                }
                
                // 入力フィールドをリセット
                event.target.value = '';
                
                // サムネイルを再読み込み
                await this.fetchThumbnails();
                
                setTimeout(() => {
                    folderStatus.innerHTML = '';
                }, 3000);
            } else {
                // 自動推測が失敗した場合、手動入力を促す
                folderStatus.innerHTML = '<span style="color: orange;">⚠️ パスの自動推測に失敗しました</span>';
                
                const userPath = prompt(
                    `フォルダ "${folderName}" の完全なパスを入力してください:\n\n例:\n/Users/yourname/Desktop/${folderName}\n/Users/yourname/Downloads/${folderName}\n/Users/yourname/Documents/${folderName}`, 
                    `/Users/${this.getCurrentUser()}/${folderName}`
                );
                
                if (userPath) {
                    const response = await fetch('/api/videos/change-folder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            mode: 'local-folder',
                            folderPath: userPath 
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        selectedFolderPath.textContent = `📁 ワークフォルダ: ${userPath}`;
                        selectedFolderPath.dataset.realFolderPath = userPath;
                        folderStatus.innerHTML = '<span style="color: green;">✅ ワークフォルダが設定されました</span>';
                        await this.fetchThumbnails();
                    } else {
                        folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${result.message}</span>`;
                    }
                } else {
                    folderStatus.innerHTML = '<span style="color: orange;">⚠️ パス入力がキャンセルされました</span>';
                }
            }
        } catch (error) {
            console.error('Local folder selection error:', error);
            folderStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
        }
    },

    // パス候補を生成
    generatePathCandidates(folderName) {
        const currentUser = this.getCurrentUser();
        const candidates = [];
        
        // macOSの一般的なディレクトリでの候補
        const commonDirs = ['Desktop', 'Downloads', 'Documents', 'Movies', 'Videos', 'Pictures'];
        
        commonDirs.forEach(dir => {
            candidates.push(`/Users/${currentUser}/${dir}/${folderName}`);
        });
        
        // ルートディレクトリの候補
        candidates.push(`/${folderName}`);
        
        // Applicationsフォルダの候補
        candidates.push(`/Applications/${folderName}`);
        
        // その他の一般的な場所
        candidates.push(`/tmp/${folderName}`);
        candidates.push(`/var/tmp/${folderName}`);
        
        return candidates;
    },

    // 現在のユーザー名を推測
    getCurrentUser() {
        // ブラウザでは環境変数にアクセスできないため、一般的な値を返す
        return 'tok'; // デフォルトユーザー名（実際の環境に合わせて調整）
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
window.selectLocalFolder = () => VideoApp.selectLocalFolder();
window.runThumbnailTests = () => {
    console.log('🧪 Running thumbnail tests...');
    // テスト関数をここに実装
};