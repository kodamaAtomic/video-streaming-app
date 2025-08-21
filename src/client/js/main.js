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
    
    // キーボードナビゲーション用の状態
    selectedThumbnailIndex: -1,
    isPlayerMode: false,
    
    // 2区間リピート機能の状態
    repeatState: {
        startTime: null,    // 開始点（秒）
        endTime: null,      // 終了点（秒）
        isActive: false,    // リピートモード有効/無効
        settingMode: 'none' // 'none', 'setting-start', 'setting-end'
    },
    
    // キーボードヘルプ用の状態
    helpKeydownHandler: null,
    
    // 新機能: 再生回数、ソート、フィルタの状態
    playCountData: {}, // {videoId: playCount} - 現在のフォルダの再生回数
    folderPlayCounts: {}, // {folderId: {videoId: playCount}} - フォルダ別再生回数
    currentFolderId: null, // 現在のフォルダID
    currentSort: 'name',
    currentSortOrder: 'asc',
    currentFilter: '',
    filteredVideos: [],
    
    // 新機能: Favorite機能の状態
    favoriteData: {}, // {videoId: boolean} - 現在のフォルダのFavorite状態
    folderFavorites: {}, // {folderId: {videoId: boolean}} - フォルダ別Favorite状態
    currentTab: 'all', // 'all' または 'favorites'
    
    // サムネイル生成状態
    thumbnailGeneration: {
        isRunning: false,
        currentJob: null,
        stats: { successful: 0, failed: 0, total: 0 }
    },
    
    // 初期化
    async init() {
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
        
        // 再生回数データの読み込み
        this.loadPlayCountData();
        
        // Favoriteデータの読み込み
        this.loadFavoriteData();
        
        // 登録フォルダUI初期化
        this.initRegisteredFoldersUI();
        
        // 初期データ読み込み（最後に実行）
        try {
            console.log('🔍 Starting initial data fetch...');
            await this.fetchThumbnails();
            console.log('✅ Initial data fetch completed');
        } catch (error) {
            console.error('❌ Initial data fetch failed:', error);
            this.elements.thumbnailGrid.innerHTML = '<p>初期データの読み込みに失敗しました。フォルダを選択してください。</p>';
        }
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
        
        // キーボードショートカット
        this.setupKeyboardShortcuts();
        
        // 新機能のイベントリスナー
        this.setupSortFilterListeners();
        
        // タブ切り替えのイベントリスナー
        this.setupTabListeners();
    },
    
    // ソート・フィルタ機能のイベントリスナー設定
    setupSortFilterListeners() {
        // ソート選択
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applySortAndFilter();
            });
        }
        
        // ソート順序切り替え
        const sortOrderBtn = document.getElementById('sort-order-btn');
        if (sortOrderBtn) {
            sortOrderBtn.addEventListener('click', () => {
                this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
                sortOrderBtn.textContent = this.currentSortOrder === 'asc' ? '昇順 ↑' : '降順 ↓';
                sortOrderBtn.setAttribute('data-order', this.currentSortOrder);
                this.applySortAndFilter();
            });
        }
        
        // フィルタ入力
        const filterInput = document.getElementById('filter-input');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                this.currentFilter = e.target.value;
                this.applySortAndFilter();
            });
        }
        
        // フィルタクリア
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                const filterInput = document.getElementById('filter-input');
                if (filterInput) {
                    filterInput.value = '';
                    this.currentFilter = '';
                    this.applySortAndFilter();
                }
            });
        }
    },
    
    // タブ切り替え機能のイベントリスナー設定
    setupTabListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    },
    
    // タブ切り替え処理
    switchTab(tab) {
        console.log(`🔄 Switching to tab: ${tab}`);
        this.currentTab = tab;
        
        // タブボタンのアクティブ状態を更新
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // 表示を更新
        this.applySortAndFilter();
    },
    
    // キーボードショートカットの設定
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 入力フィールドにフォーカスがある場合はショートカットを無効化
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            // ?キーは常にヘルプ表示（どのモードでも）
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                e.preventDefault();
                this.toggleKeyboardHelp();
                return;
            }
            
            // プレイヤーモード（モーダル表示中）
            if (this.isPlayerMode && this.elements.videoModal.style.display === 'block') {
                this.handlePlayerShortcuts(e);
            } else {
                // グリッドナビゲーションモード
                this.handleGridShortcuts(e);
            }
        });
    },
    
    // グリッドナビゲーション用ショートカット
    handleGridShortcuts(e) {
        const currentVideos = this.getCurrentDisplayedVideos();
        if (currentVideos.length === 0) return;
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                this.moveSelection(1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveSelection(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.moveSelection(this.getGridColumns());
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.moveSelection(-this.getGridColumns());
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedThumbnailIndex >= 0 && this.selectedThumbnailIndex < currentVideos.length) {
                    this.openVideoPlayer(currentVideos[this.selectedThumbnailIndex]);
                }
                break;
        }
    },
    
    // プレイヤー用ショートカット
    handlePlayerShortcuts(e) {
        const video = this.elements.videoPlayer;
        if (!video) return;
        
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.handleRepeatSetting();
                break;
            case 'k':
            case 'K':
                e.preventDefault();
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.resetRepeatSection();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 5);
                break;
            case 'ArrowRight':
                e.preventDefault();
                video.currentTime = Math.min(video.duration, video.currentTime + 5);
                break;
            case 'j':
            case 'J':
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 10);
                break;
            case 'l':
            case 'L':
                e.preventDefault();
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                video.muted = !video.muted;
                console.log(`🔊 Video ${video.muted ? 'muted' : 'unmuted'}`);
                break;
            case 'Escape':
                e.preventDefault();
                this.closeVideoPlayer();
                break;
        }
    },
    
    // 現在表示中の動画一覧を取得
    getCurrentDisplayedVideos() {
        return this.currentVideos.slice(0, this.currentGridSize);
    },
    
    // グリッドの列数を計算
    getGridColumns() {
        // CSS Grid の列数に基づいて計算
        if (this.currentGridSize === 24) return 6;      // 6x4
        if (this.currentGridSize === 48) return 8;      // 8x6
        if (this.currentGridSize === 96) return 12;     // 12x8
        return 6; // デフォルト
    },
    
    // 選択位置を移動
    moveSelection(delta) {
        const currentVideos = this.getCurrentDisplayedVideos();
        if (currentVideos.length === 0) return;
        
        // 初回選択
        if (this.selectedThumbnailIndex < 0) {
            this.selectedThumbnailIndex = 0;
        } else {
            // 新しい位置を計算
            const newIndex = this.selectedThumbnailIndex + delta;
            this.selectedThumbnailIndex = Math.max(0, Math.min(currentVideos.length - 1, newIndex));
        }
        
        this.updateThumbnailSelection();
    },
    
    // サムネイル選択状態を更新
    updateThumbnailSelection() {
        // すべてのサムネイルから選択状態を除去
        const thumbnails = this.elements.thumbnailGrid.querySelectorAll('.thumbnail');
        thumbnails.forEach(thumb => thumb.classList.remove('selected'));
        
        // 現在選択中のサムネイルにクラスを追加
        if (this.selectedThumbnailIndex >= 0 && this.selectedThumbnailIndex < thumbnails.length) {
            thumbnails[this.selectedThumbnailIndex].classList.add('selected');
            // スクロールして表示
            thumbnails[this.selectedThumbnailIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
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
        
        // 選択状態をリセット
        this.selectedThumbnailIndex = -1;
        
        // フィルタされた動画を考慮して表示更新
        const videosToShow = this.filteredVideos.length > 0 ? this.filteredVideos : this.currentVideos;
        this.displayThumbnails(videosToShow.slice(0, count));
    },
    
    // サムネイル取得
    async fetchThumbnails() {
        try {
            console.log('🔍 Fetching thumbnails...');
            
            const response = await fetch('/api/videos');
            console.log('🔍 Response received:', response.status, response.statusText);
            
            if (!response.ok) {
                // フォルダが選択されていない場合の404エラーを特別に処理
                if (response.status === 404) {
                    console.log('📁 No folder selected - showing initial message');
                    this.elements.thumbnailGrid.innerHTML = '<p>動画フォルダを選択してください。</p>';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📋 API Response:', result);
            
            if (result.success) {
                // データが空の場合
                if (!result.data || result.data.length === 0) {
                    console.log('📁 No videos found in current folder');
                    this.elements.thumbnailGrid.innerHTML = '<p>現在のフォルダに動画ファイルがありません。</p>';
                    // currentVideosも空にリセット
                    this.currentVideos = [];
                    this.filteredVideos = [];
                    return;
                }
                
                // すべてのビデオを currentVideos に保存（サムネイル生成チェック用）
                this.currentVideos = result.data;
                console.log('🔍 All videos loaded:', this.currentVideos.length);
                
                // 表示用にはサムネイルがあるものまたはTSファイルのみフィルタ
                const videosWithThumbnails = result.data.filter(video => video.thumbnailUrl || video.isTs);
                console.log('🔍 Videos with thumbnails for display:', videosWithThumbnails.length);
                
                // 現在のフォルダ情報を取得して再生回数データを設定
                await this.updateCurrentFolderInfo();

                // 新機能: フィルタされた動画リストをリセット
                this.filteredVideos = [];
                
                // フォルダ変更直後の場合：サムネイルがない場合でも全ての動画を一時表示
                if (videosWithThumbnails.length === 0 && result.data.length > 0) {
                    console.log('🔍 No thumbnails found, displaying all videos temporarily for folder change');
                    console.log('🔍 Displaying all videos because no thumbnails found:', result.data.length);
                    this.applySortAndFilterWithVideos(result.data);
                } else if (videosWithThumbnails.length > 0) {
                    console.log('🔍 Displaying videos with thumbnails:', videosWithThumbnails.length);
                    // ソートとフィルタを適用（表示用のビデオのみ）
                    this.applySortAndFilterWithVideos(videosWithThumbnails);
                } else {
                    console.log('🔍 No videos to display at all');
                    this.elements.thumbnailGrid.innerHTML = '<p>表示する動画がありません。</p>';
                }
            } else {
                console.log('❌ API response indicates failure:', result);
                this.elements.thumbnailGrid.innerHTML = '<p>ビデオの取得に失敗しました。</p>';
            }
        } catch (error) {
            console.error('❌ Error fetching thumbnails:', error);
            console.error('❌ Error stack:', error.stack);
            
            // ネットワークエラーかサーバーエラーかを判定
            if (error.message.includes('Failed to fetch')) {
                this.elements.thumbnailGrid.innerHTML = '<p>サーバーに接続できません。サーバーが起動しているか確認してください。</p>';
            } else {
                this.elements.thumbnailGrid.innerHTML = '<p>動画フォルダを選択してください。</p>';
            }
        }
    },
    
    // フォルダ変更後に全てのビデオをロードしてからサムネイル生成をチェック
    async fetchAllVideosAndCheckGeneration() {
        console.log('🔍 fetchAllVideosAndCheckGeneration called');
        
        try {
            // まず全ての動画を取得して表示
            const response = await fetch('/api/videos');
            const result = await response.json();
            
            if (result && result.success && Array.isArray(result.data)) {
                console.log(`✅ Loaded ${result.data.length} videos for display`);
                
                // 全ての動画を即座に表示（サムネイルなしでも）
                this.currentVideos = result.data;
                this.applySortAndFilterWithVideos(result.data);
                
                // サムネイルの生成状況をチェック（TSファイルを除く通常の動画で、かつサムネイルがないもの）
                const videosWithoutThumbnails = result.data.filter(video => 
                    !video.isTs && !video.thumbnailUrl
                );
                
                console.log(`🔍 Found ${videosWithoutThumbnails.length} videos without thumbnails (excluding TS files)`);
                
                if (videosWithoutThumbnails.length > 0) {
                    // プログレスバーを表示
                    this.showProgressBar();
                    this.updateProgressBar(0, `${videosWithoutThumbnails.length}個のサムネイルを生成中...`);
                    
                    // サムネイル生成を開始
                    this.startThumbnailGenerationWithProgress(videosWithoutThumbnails);
                } else {
                    console.log('✅ All videos already have thumbnails or are TS files');
                    // プログレスバーが表示されている場合は非表示にする
                    this.hideProgressBar();
                }
            } else {
                console.log('❌ API response indicates failure:', result);
                this.elements.thumbnailGrid.innerHTML = '<p>ビデオの取得に失敗しました。</p>';
            }
        } catch (error) {
            console.error('❌ Error fetching videos for generation check:', error);
            this.elements.thumbnailGrid.innerHTML = '<p>動画フォルダを選択してください。</p>';
        }
    },
    
    // サムネイル表示
    displayThumbnails(videos) {
        console.log('🎬 displayThumbnails called with:', videos ? videos.length : 0, 'videos');
        
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
        
        // 初回表示時に最初のサムネイルを選択状態にする
        if (videos.length > 0 && this.selectedThumbnailIndex < 0) {
            this.selectedThumbnailIndex = 0;
            // 少し遅延してから選択状態を適用（DOM更新完了後）
            setTimeout(() => this.updateThumbnailSelection(), 100);
        }
        
        console.log(`📊 Displayed ${videos.length} thumbnails in ${this.currentGridSize} grid mode`);
    },
    
    // サムネイル要素作成
    createThumbnailElement(video, index) {
        console.log(`🖼️ Creating thumbnail ${index + 1}: ${video.thumbnailUrl}`);
        
        const thumbnailElement = document.createElement('div');
        thumbnailElement.className = 'thumbnail';
        thumbnailElement.style.position = 'relative';
        
        // 画像コンテナ（16:9アスペクト比維持用）
        const imageContainer = document.createElement('div');
        imageContainer.className = 'thumbnail-image-container';
        
        // サムネイル画像または生成中プレースホルダー
        if (!video.thumbnailUrl && !video.isTs) {
            // サムネイルなしの場合は通常のプレースホルダーを表示（自動生成なし）
            this.createThumbnailPlaceholder(imageContainer, video);
        } else {
            // 画像要素を作成
            const img = document.createElement('img');
            
            // TSファイルの場合は専用ロゴを表示
            if (video.isTs) {
                img.src = '/assets/ts-logo.svg';
                img.alt = 'TS Video File';
                thumbnailElement.classList.add('ts-file');
            } else {
                img.src = video.thumbnailUrl;
                img.alt = video.title || video.originalName;
            }
            
            img.style.display = 'block';
            
            // 画像ロードイベント
            img.onload = () => {
                console.log(`✅ Thumbnail loaded: ${video.thumbnailUrl}`);
            };
            
            img.onerror = () => {
                console.error(`❌ Failed to load thumbnail: ${video.thumbnailUrl}`);
                const placeholder = document.createElement('div');
                placeholder.className = 'thumbnail-placeholder';
                placeholder.textContent = 'サムネイル読み込み失敗';
                imageContainer.replaceChild(placeholder, img);
            };
            
            imageContainer.appendChild(img);
        }
        
        // 再生回数オーバーレイ
        const playCountOverlay = document.createElement('div');
        playCountOverlay.className = 'play-count-overlay';
        const playCount = this.getPlayCount(video.id);
        playCountOverlay.textContent = playCount.toString();
        
        // Favoriteアイコンオーバーレイ
        const favoriteOverlay = document.createElement('div');
        favoriteOverlay.className = 'favorite-overlay';
        const isFavorited = this.isFavorite(video.id);
        favoriteOverlay.classList.add(isFavorited ? 'favorited' : 'not-favorited');
        favoriteOverlay.textContent = isFavorited ? '⭐' : '☆';
        favoriteOverlay.title = isFavorited ? 'お気に入りから削除' : 'お気に入りに追加';
        
        // Favoriteクリックイベント
        favoriteOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(video.id);
        });
        
        // オーバーレイを画像コンテナに追加
        imageContainer.appendChild(playCountOverlay);
        imageContainer.appendChild(favoriteOverlay);
        
        // サムネイル要素にdata-video-id属性を追加
        thumbnailElement.setAttribute('data-video-id', video.id);
        
        // タイトル要素
        const title = document.createElement('p');
        title.textContent = video.title || video.originalName;
        
        // 要素組み立て
        thumbnailElement.appendChild(imageContainer);
        thumbnailElement.appendChild(title);
        
        // クリックイベント（モーダルで再生）
        thumbnailElement.addEventListener('click', () => {
            // クリックされたサムネイルを選択状態にする
            this.selectedThumbnailIndex = index;
            this.updateThumbnailSelection();
            
            if (video.isTs && !video.isTranscoding) {
                // TSファイルの場合はトランスコード確認ダイアログを表示
                window.showTranscodeDialog(video);
            } else if (!video.isTs && video.thumbnailUrl) {
                // 通常のビデオファイルで、かつサムネイルが存在する場合は再生
                this.incrementPlayCount(video.id);
                this.openVideoPlayer(video);
            }
            // サムネイルなし or トランスコード中の場合は何もしない
        });
        
        this.elements.thumbnailGrid.appendChild(thumbnailElement);
    },
    
    // サムネイル生成中のプレースホルダーを作成
    createThumbnailGeneratingPlaceholder(imageContainer, video) {
        const placeholder = document.createElement('div');
        placeholder.className = 'thumbnail-generating-placeholder';
        placeholder.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #2c2c2c, #404040);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            text-align: center;
            border-radius: 4px;
            position: relative;
        `;
        
        // 生成中アイコンとテキスト
        const iconElement = document.createElement('div');
        iconElement.style.cssText = `
            font-size: 24px;
            margin-bottom: 8px;
            animation: spin 2s linear infinite;
        `;
        iconElement.textContent = '⚙️';
        
        const textElement = document.createElement('div');
        textElement.style.cssText = `
            font-size: 12px;
            color: #cccccc;
            margin-bottom: 10px;
        `;
        textElement.textContent = 'サムネイル生成中...';
        
        // プログレスバー
        const progressBar = document.createElement('div');
        progressBar.className = 'thumbnail-progress-bar';
        progressBar.style.cssText = `
            width: 80%;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.className = 'thumbnail-progress-fill';
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 2px;
            transition: width 0.3s ease;
            animation: indeterminate 2s ease-in-out infinite;
        `;
        
        progressBar.appendChild(progressFill);
        
        placeholder.appendChild(iconElement);
        placeholder.appendChild(textElement);
        placeholder.appendChild(progressBar);
        
        imageContainer.appendChild(placeholder);
        
        // CSS アニメーションを追加
        if (!document.getElementById('thumbnail-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'thumbnail-progress-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes indeterminate {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { transform: translateX(0%); width: 60%; }
                    100% { transform: translateX(100%); width: 30%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // サムネイル生成を自動開始（少し遅延してから）
        setTimeout(() => this.startThumbnailGeneration(video), 500);
    },
    
    // 個別動画のサムネイル生成を開始
    async startThumbnailGeneration(video) {
        try {
            console.log(`🎬 Starting thumbnail generation for: ${video.title || video.originalName}`);
            
            // 個別サムネイル生成APIを呼び出し
            const response = await fetch(`/api/videos/thumbnails/generate/${video.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Thumbnail generated successfully for: ${video.title || video.originalName}`);
                
                // サムネイル生成成功時は該当要素を更新
                this.updateThumbnailAfterGeneration(video.id, result.data.thumbnailUrl);
            } else {
                console.error(`❌ Thumbnail generation failed for: ${video.title || video.originalName}`, result.message);
                this.updateThumbnailGenerationFailed(video.id, result.message);
            }
        } catch (error) {
            console.error(`❌ Error generating thumbnail for: ${video.title || video.originalName}`, error);
            this.updateThumbnailGenerationFailed(video.id, error.message);
        }
    },
    
    // サムネイル生成完了時の更新処理
    updateThumbnailAfterGeneration(videoId, thumbnailUrl) {
        const thumbnailElement = document.querySelector(`[data-video-id="${videoId}"]`);
        if (!thumbnailElement) {
            console.warn(`⚠️ Thumbnail element not found for video ID: ${videoId}`);
            return;
        }
        
        const imageContainer = thumbnailElement.querySelector('.thumbnail-image-container');
        if (!imageContainer) {
            console.warn(`⚠️ Image container not found for video ID: ${videoId}`);
            return;
        }
        
        // プレースホルダーを削除
        const placeholder = imageContainer.querySelector('.thumbnail-generating-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // 新しい画像要素を作成
        const img = document.createElement('img');
        img.src = thumbnailUrl;
        img.alt = 'Generated Thumbnail';
        img.style.display = 'block';
        
        img.onload = () => {
            console.log(`✅ New thumbnail loaded for video ID: ${videoId}`);
        };
        
        img.onerror = () => {
            console.error(`❌ Failed to load generated thumbnail: ${thumbnailUrl}`);
            this.updateThumbnailGenerationFailed(videoId, 'サムネイル画像の読み込みに失敗');
        };
        
        // 画像をコンテナに追加
        imageContainer.appendChild(img);
        
        // currentVideosのデータも更新
        const videoIndex = this.currentVideos.findIndex(v => v.id === videoId);
        if (videoIndex !== -1) {
            this.currentVideos[videoIndex].thumbnailUrl = thumbnailUrl;
        }
        
        // filteredVideosのデータも更新
        const filteredIndex = this.filteredVideos.findIndex(v => v.id === videoId);
        if (filteredIndex !== -1) {
            this.filteredVideos[filteredIndex].thumbnailUrl = thumbnailUrl;
        }
        
        console.log(`🎉 Thumbnail successfully updated for video ID: ${videoId}`);
    },
    
    // サムネイル生成失敗時の更新処理
    updateThumbnailGenerationFailed(videoId, errorMessage) {
        const thumbnailElement = document.querySelector(`[data-video-id="${videoId}"]`);
        if (!thumbnailElement) {
            return;
        }
        
        const imageContainer = thumbnailElement.querySelector('.thumbnail-image-container');
        if (!imageContainer) {
            return;
        }
        
        // プレースホルダーの内容を変更
        const placeholder = imageContainer.querySelector('.thumbnail-generating-placeholder');
        if (placeholder) {
            placeholder.style.background = 'linear-gradient(135deg, #d32f2f, #f44336)';
            
            const iconElement = placeholder.querySelector('div');
            if (iconElement) {
                iconElement.textContent = '❌';
                iconElement.style.animation = 'none';
            }
            
            const textElement = placeholder.querySelectorAll('div')[1];
            if (textElement) {
                textElement.textContent = '生成失敗';
            }
            
            const progressBar = placeholder.querySelector('.thumbnail-progress-bar');
            if (progressBar) {
                progressBar.remove();
            }
            
            // エラーメッセージを追加
            const errorElement = document.createElement('div');
            errorElement.style.cssText = `
                font-size: 10px;
                color: #ffcccb;
                margin-top: 5px;
                text-align: center;
            `;
            errorElement.textContent = errorMessage || 'エラーが発生しました';
            placeholder.appendChild(errorElement);
        }
        
        console.error(`❌ Thumbnail generation failed for video ID: ${videoId}`, errorMessage);
    },
    
    // サムネイルなしの動画をチェックして一括生成を開始
    checkAndStartBulkThumbnailGeneration() {
        console.log('🔍 checkAndStartBulkThumbnailGeneration called');
        console.log('🔍 Current videos count:', this.currentVideos.length);
        
        if (!this.currentVideos || this.currentVideos.length === 0) {
            console.log('⚠️ No current videos loaded, skipping thumbnail generation check');
            return;
        }
        
        // サムネイルがない通常の動画ファイル（TSファイルを除く）を検索
        const videosWithoutThumbnails = this.currentVideos.filter(video => {
            const hasNoThumbnail = !video.thumbnailUrl;
            const isNotTs = !video.isTs;
            console.log(`🔍 Video: ${video.originalName}, hasNoThumbnail: ${hasNoThumbnail}, isNotTs: ${isNotTs}`);
            return hasNoThumbnail && isNotTs;
        });
        
        console.log(`🔍 Found ${videosWithoutThumbnails.length} videos without thumbnails`);
        videosWithoutThumbnails.forEach(video => {
            console.log(`🔍 Video without thumbnail: ${video.originalName}`);
        });
        
        if (videosWithoutThumbnails.length > 0) {
            console.log('🎬 Starting bulk thumbnail generation...');
            this.showBulkThumbnailProgress(videosWithoutThumbnails.length);
            this.startBulkThumbnailGeneration(videosWithoutThumbnails);
        } else {
            console.log('✅ All videos already have thumbnails');
        }
    },

    // フォルダ変更時：fetchThumbnailsより前にサムネイル生成チェック
    async checkAndStartBulkThumbnailGenerationBeforeFetch() {
        console.log('🔍 checkAndStartBulkThumbnailGenerationBeforeFetch called');
        
        try {
            // APIから動画リストを直接取得
            const response = await fetch('/api/videos');
            const result = await response.json();
            
            if (!result.success || !result.data) {
                console.log('⚠️ Failed to fetch videos for thumbnail check');
                return false; // サムネイル生成が不要/失敗
            }
            
            const videos = result.data;
            console.log(`🔍 Got ${videos.length} videos from API`);
            
            // サムネイルがない通常の動画ファイル（TSファイルを除く）を検索
            const videosWithoutThumbnails = videos.filter(video => {
                const hasNoThumbnail = !video.thumbnailUrl;
                const isNotTs = !video.isTs;
                return hasNoThumbnail && isNotTs;
            });
            
            console.log(`🔍 Found ${videosWithoutThumbnails.length} videos without thumbnails (before fetch)`);
            
            if (videosWithoutThumbnails.length > 0) {
                console.log('🎬 Starting background thumbnail monitoring...');
                this.showBulkThumbnailProgress(videosWithoutThumbnails.length);
                
                // プログレス監視を開始（待機しない）
                this.startThumbnailProgressMonitoring();
                return true; // プログレス監視開始
            } else {
                console.log('✅ All videos already have thumbnails (before fetch)');
                return false; // サムネイル生成が不要
            }
        } catch (error) {
            console.error('❌ Error in checkAndStartBulkThumbnailGenerationBeforeFetch:', error);
            return false;
        }
    },
    
    // ビデオ一覧ペイン全体にプログレス表示
    showBulkThumbnailProgress(totalVideos) {
        // 専用のプログレスコンテナを表示
        const progressContainer = document.getElementById('thumbnail-progress-container');
        const progressCurrent = document.getElementById('progress-current');
        const progressTotal = document.getElementById('progress-total');
        const progressText = document.getElementById('progress-text');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        if (progressTotal) {
            progressTotal.textContent = totalVideos;
        }
        
        if (progressCurrent) {
            progressCurrent.textContent = '0';
        }
        
        if (progressText) {
            progressText.textContent = 'サムネイルを生成中...';
        }
        
        // サムネイルグリッドは非表示にする
        this.elements.thumbnailGrid.style.display = 'none';
    },
    
    // 一括サムネイル生成の実行
    async startBulkThumbnailGeneration(videos) {
        let completedCount = 0;
        const totalCount = videos.length;
        
        // 各動画のサムネイルを順次生成
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            
            try {
                console.log(`🎬 Generating thumbnail ${i + 1}/${totalCount}: ${video.originalName}`);
                
                // 個別サムネイル生成APIを呼び出し
                const response = await fetch(`/api/videos/thumbnails/generate/${video.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log(`✅ Thumbnail generated: ${video.originalName}`);
                    completedCount++;
                    
                    // currentVideosのデータを更新
                    const videoIndex = this.currentVideos.findIndex(v => v.id === video.id);
                    if (videoIndex !== -1) {
                        this.currentVideos[videoIndex].thumbnailUrl = result.data.thumbnailUrl;
                    }
                } else {
                    console.error(`❌ Thumbnail generation failed: ${video.originalName}`, result.message);
                    completedCount++; // 失敗してもカウントを進める
                }
                
                // プログレス更新
                this.updateBulkProgress(completedCount, totalCount);
                
                // 少し間隔を空ける（サーバー負荷軽減）
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Error generating thumbnail for ${video.originalName}:`, error);
                completedCount++;
                this.updateBulkProgress(completedCount, totalCount);
            }
        }
        
        // すべて完了したらサムネイル一覧を再表示
        console.log('🎉 Bulk thumbnail generation completed');
        
        // プログレスコンテナを隠してサムネイルグリッドを再表示
        const progressContainer = document.getElementById('thumbnail-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        this.elements.thumbnailGrid.style.display = 'grid';
        
        setTimeout(() => {
            this.applySortAndFilter(); // 通常のサムネイル一覧を再表示
        }, 1500);
    },

    // サムネイル生成を同期的に実行し、完了まで待機
    async startBulkThumbnailGenerationAndWait(videos) {
        return new Promise(async (resolve) => {
            let completedCount = 0;
            const totalCount = videos.length;
            
            // 各動画のサムネイルを順次生成
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                
                try {
                    console.log(`🎬 Generating thumbnail ${i + 1}/${totalCount}: ${video.originalName}`);
                    
                    // 個別サムネイル生成APIを呼び出し
                    const response = await fetch(`/api/videos/thumbnails/generate/${video.id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log(`✅ Thumbnail generated: ${video.originalName}`);
                        completedCount++;
                        
                        // currentVideosのデータを更新
                        const videoIndex = this.currentVideos.findIndex(v => v.id === video.id);
                        if (videoIndex !== -1) {
                            this.currentVideos[videoIndex].thumbnailUrl = result.data.thumbnailUrl;
                        }
                    } else {
                        console.error(`❌ Thumbnail generation failed: ${video.originalName}`, result.message);
                        completedCount++; // 失敗してもカウントを進める
                    }
                    
                    // プログレス更新
                    this.updateBulkProgress(completedCount, totalCount);
                    
                    // 少し間隔を空ける（サーバー負荷軽減）
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Error generating thumbnail for ${video.originalName}:`, error);
                    completedCount++;
                    this.updateBulkProgress(completedCount, totalCount);
                }
            }
            
            // すべて完了
            console.log('🎉 Bulk thumbnail generation completed and waited');
            resolve();
        });
    },
    
    // プログレス更新
    updateBulkProgress(completed, total) {
        const percentage = Math.round((completed / total) * 100);
        
        const currentElement = document.getElementById('progress-current');
        const fillElement = document.getElementById('bulk-progress-fill');
        const percentageElement = document.getElementById('bulk-progress-percentage');
        
        if (currentElement) currentElement.textContent = completed;
        if (fillElement) fillElement.style.width = `${percentage}%`;
        if (percentageElement) percentageElement.textContent = `${percentage}%`;
        
        console.log(`📊 Bulk progress: ${completed}/${total} (${percentage}%)`);
    },

    // 新しいプログレス更新メソッド（バックグラウンド監視用）
    updateBulkThumbnailProgress(current, total) {
        console.log(`📊 updateBulkThumbnailProgress: ${current}/${total}`);
        
        const progressBar = document.getElementById('bulk-progress-fill');
        const progressText = document.getElementById('progress-current');
        const progressPercentage = document.getElementById('bulk-progress-percentage');
        
        if (progressBar) {
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            progressBar.style.width = `${percentage}%`;
            
            if (progressPercentage) {
                progressPercentage.textContent = `${percentage}%`;
            }
        }
        
        if (progressText) {
            progressText.textContent = `${current}`;
        }
    },

    // バックグラウンドサムネイル進捗監視を開始
    startThumbnailProgressMonitoring() {
        if (this.progressMonitoringInterval) {
            clearInterval(this.progressMonitoringInterval);
        }

        console.log('🔄 Starting thumbnail progress monitoring...');
        
        this.progressMonitoringInterval = setInterval(async () => {
            try {
                console.log('📡 Polling thumbnail progress...');
                const response = await fetch('/api/videos/thumbnails/progress');
                const result = await response.json();
                
                console.log('📊 Progress response:', result);
                
                if (result.success && result.data) {
                    const progress = result.data;
                    console.log(`📊 Background progress: ${progress.completed}/${progress.total} (active: ${progress.active})`);
                    
                    // プログレスバーを更新
                    this.updateBulkThumbnailProgress(progress.completed, progress.total);
                    
                    // 完了チェック
                    if (progress.completed >= progress.total && !progress.active) {
                        console.log('✅ Background thumbnail generation completed!');
                        this.stopThumbnailProgressMonitoring();
                        this.hideBulkThumbnailProgress();
                        
                        // 動画リストを更新して新しいサムネイルを反映
                        console.log('🔄 Refreshing video list...');
                        await this.fetchVideos();
                    }
                } else {
                    console.warn('⚠️ Invalid progress response:', result);
                }
            } catch (error) {
                console.error('❌ Error monitoring thumbnail progress:', error);
                this.stopThumbnailProgressMonitoring();
            }
        }, 1000); // 1秒間隔でポーリング
    },

    // プログレス監視を停止
    stopThumbnailProgressMonitoring() {
        if (this.progressMonitoringInterval) {
            clearInterval(this.progressMonitoringInterval);
            this.progressMonitoringInterval = null;
            console.log('🛑 Stopped thumbnail progress monitoring');
        }
    },

    // プログレス表示を非表示にする
    hideBulkThumbnailProgress() {
        console.log('🙈 Hiding bulk thumbnail progress');
        
        // プログレスコンテナを隠してサムネイルグリッドを再表示
        const progressContainer = document.getElementById('thumbnail-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        this.elements.thumbnailGrid.style.display = 'grid';
        
        this.applySortAndFilter(); // 通常のサムネイル一覧を再表示
    },
    
    // サムネイルなし用の通常プレースホルダーを作成
    createThumbnailPlaceholder(imageContainer, video) {
        const placeholder = document.createElement('div');
        placeholder.className = 'thumbnail-placeholder';
        placeholder.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #404040, #606060);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            text-align: center;
            border-radius: 4px;
        `;
        
        const iconElement = document.createElement('div');
        iconElement.style.cssText = `
            font-size: 24px;
            margin-bottom: 8px;
        `;
        iconElement.textContent = '🎬';
        
        const textElement = document.createElement('div');
        textElement.style.cssText = `
            font-size: 12px;
            color: #cccccc;
        `;
        textElement.textContent = 'サムネイルなし';
        
        placeholder.appendChild(iconElement);
        placeholder.appendChild(textElement);
        imageContainer.appendChild(placeholder);
    },
    
    // ビデオプレイヤーを開く
    openVideoPlayer(video) {
        console.log(`▶️ Opening video player for: ${video.title}`);
        
        // プレイヤーモードに切り替え
        this.isPlayerMode = true;
        
        // リピート状態をリセット
        this.resetRepeatSection();
        
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = video.title;
        }
        
        if (this.elements.videoPlayer) {
            // URLエンコードを適用して特殊文字を安全に処理
            const encodedVideoId = encodeURIComponent(video.id);
            this.elements.videoPlayer.src = `/api/videos/${encodedVideoId}/stream`;
            console.log(`🎬 Setting video src: /api/videos/${encodedVideoId}/stream`);
        }
        
        if (this.elements.videoModal) {
            this.elements.videoModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // スクロール無効化
        }
    },
    
    // 再生回数を取得
    getPlayCount(videoId) {
        return this.playCountData[videoId] || 0;
    },
    
    // 再生回数を増加
    incrementPlayCount(videoId) {
        this.playCountData[videoId] = this.getPlayCount(videoId) + 1;
        console.log(`📊 Play count for ${videoId}: ${this.playCountData[videoId]} (Folder: ${this.currentFolderId})`);
        
        // フォルダ別データも更新
        if (this.currentFolderId) {
            if (!this.folderPlayCounts[this.currentFolderId]) {
                this.folderPlayCounts[this.currentFolderId] = {};
            }
            this.folderPlayCounts[this.currentFolderId][videoId] = this.playCountData[videoId];
            
            // 永続化
            this.savePlayCountData();
        }
        
        // UIを更新（再生回数オーバーレイの更新）
        this.updatePlayCountDisplay(videoId);
    },
    
    // 再生回数データの読み込み
    loadPlayCountData() {
        try {
            const stored = localStorage.getItem('video-app-play-counts');
            if (stored) {
                this.folderPlayCounts = JSON.parse(stored);
                console.log('📊 Loaded play count data:', this.folderPlayCounts);
            }
        } catch (error) {
            console.error('❌ Error loading play count data:', error);
            this.folderPlayCounts = {};
        }
    },
    
    // 再生回数データの保存
    savePlayCountData() {
        try {
            localStorage.setItem('video-app-play-counts', JSON.stringify(this.folderPlayCounts));
            console.log('💾 Saved play count data for folder:', this.currentFolderId);
        } catch (error) {
            console.error('❌ Error saving play count data:', error);
        }
    },
    
    // Favoriteデータの読み込み
    loadFavoriteData() {
        try {
            const stored = localStorage.getItem('video-app-favorites');
            if (stored) {
                this.folderFavorites = JSON.parse(stored);
                console.log('⭐ Loaded favorite data:', this.folderFavorites);
            }
        } catch (error) {
            console.error('❌ Error loading favorite data:', error);
            this.folderFavorites = {};
        }
    },
    
    // Favoriteデータの保存
    saveFavoriteData() {
        try {
            localStorage.setItem('video-app-favorites', JSON.stringify(this.folderFavorites));
            console.log('💾 Saved favorite data for folder:', this.currentFolderId);
        } catch (error) {
            console.error('❌ Error saving favorite data:', error);
        }
    },
    
    // フォルダ変更時のFavoriteデータ切り替え
    switchFavoriteData(folderId) {
        // 現在のフォルダのデータを保存
        if (this.currentFolderId && Object.keys(this.favoriteData).length > 0) {
            this.folderFavorites[this.currentFolderId] = { ...this.favoriteData };
            this.saveFavoriteData();
        }
        
        // 新しいフォルダのデータを読み込み
        this.favoriteData = folderId && this.folderFavorites[folderId] 
            ? { ...this.folderFavorites[folderId] } 
            : {};
        
        console.log(`📁 Switched favorite data to folder: ${folderId}`, this.favoriteData);
    },
    
    // 動画がFavoriteかチェック
    isFavorite(videoId) {
        return !!this.favoriteData[videoId];
    },
    
    // Favorite状態をトグル
    toggleFavorite(videoId) {
        console.log(`⭐ Toggling favorite for video: ${videoId}`);
        
        // 現在のフォルダが設定されていない場合は何もしない
        if (!this.currentFolderId) {
            console.warn('⚠️ No current folder set, cannot toggle favorite');
            return false;
        }
        
        this.favoriteData[videoId] = !this.favoriteData[videoId];
        
        // 保存
        this.folderFavorites[this.currentFolderId] = { ...this.favoriteData };
        this.saveFavoriteData();
        
        // UI更新
        this.updateFavoriteDisplay(videoId);
        
        // Favoriteタブ表示中の場合、表示を更新
        if (this.currentTab === 'favorites') {
            this.applySortAndFilter();
        }
        
        return this.favoriteData[videoId];
    },
    
    // FavoriteアイコンのUI更新
    updateFavoriteDisplay(videoId) {
        const thumbnail = document.querySelector(`[data-video-id="${videoId}"]`);
        if (!thumbnail) return;
        
        const favoriteOverlay = thumbnail.querySelector('.favorite-overlay');
        if (!favoriteOverlay) return;
        
        const isFavorited = this.isFavorite(videoId);
        favoriteOverlay.classList.toggle('favorited', isFavorited);
        favoriteOverlay.classList.toggle('not-favorited', !isFavorited);
        favoriteOverlay.textContent = isFavorited ? '⭐' : '☆';
        favoriteOverlay.title = isFavorited ? 'お気に入りから削除' : 'お気に入りに追加';
    },
    
    // フォルダ変更時の再生回数データ切り替え
    switchPlayCountData(folderId) {
        // 現在のフォルダのデータを保存
        if (this.currentFolderId && Object.keys(this.playCountData).length > 0) {
            this.folderPlayCounts[this.currentFolderId] = { ...this.playCountData };
            this.savePlayCountData();
        }
        
        // 新しいフォルダのデータを読み込み
        this.currentFolderId = folderId;
        this.playCountData = folderId && this.folderPlayCounts[folderId] 
            ? { ...this.folderPlayCounts[folderId] } 
            : {};
        
        // Favoriteデータも切り替え
        this.switchFavoriteData(folderId);
        
        console.log(`📁 Switched play count data to folder: ${folderId}`, this.playCountData);
    },
    
    // 現在のフォルダ情報を更新
    async updateCurrentFolderInfo() {
        try {
            // データがない場合は何もしない
            if (!this.currentVideos || this.currentVideos.length === 0) {
                console.log('📁 No videos loaded, skipping folder info update');
                return;
            }
            
            // 登録フォルダ一覧を取得して現在のフォルダを特定
            const response = await fetch('/api/videos/folders');
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                // 現在のサーバー参照フォルダパスを取得
                const debugResponse = await fetch('/api/debug/files');
                const debugResult = await debugResponse.json();
                
                if (debugResult.success && debugResult.data.currentFolder) {
                    const currentPath = debugResult.data.currentFolder;
                    
                    // 登録フォルダの中から一致するものを探す
                    const matchingFolder = result.data.find(folder => folder.path === currentPath);
                    
                    if (matchingFolder) {
                        // 登録フォルダが見つかった場合
                        this.switchPlayCountData(matchingFolder.id);
                        console.log(`📁 Found matching registered folder: ${matchingFolder.name} (${matchingFolder.id})`);
                    } else {
                        // 登録フォルダではない場合、パスベースのIDを生成
                        const localFolderId = `local-${btoa(currentPath).replace(/[+/=]/g, '')}`;
                        this.switchPlayCountData(localFolderId);
                        console.log(`📁 Using local folder ID: ${localFolderId} for path: ${currentPath}`);
                    }
                }
            } else {
                console.log('📁 No registered folders found, using default folder handling');
            }
        } catch (error) {
            console.error('❌ Error updating current folder info:', error);
            // エラーが発生しても続行する（フォルダ情報の更新は必須ではない）
        }
    },
    
    // 再生回数表示を更新
    updatePlayCountDisplay(videoId) {
        const thumbnails = this.elements.thumbnailGrid.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumbnail, index) => {
            const displayedVideos = this.getCurrentDisplayedVideos();
            if (index < displayedVideos.length && displayedVideos[index].id === videoId) {
                const overlay = thumbnail.querySelector('.play-count-overlay');
                if (overlay) {
                    overlay.textContent = this.getPlayCount(videoId).toString();
                }
            }
        });
    },
    
    // ソートとフィルタを適用
    applySortAndFilterWithVideos(videos) {
        console.log('🔍 applySortAndFilterWithVideos called with:', videos.length, 'videos');
        
        if (!videos || videos.length === 0) {
            console.log('⚠️ No videos to display');
            this.elements.thumbnailGrid.innerHTML = '<p>表示する動画がありません。</p>';
            return;
        }
        
        let sortedVideos = [...videos];

        // ソート条件の適用
        if (this.currentSort === 'name') {
            sortedVideos.sort((a, b) => {
                const aName = a.originalName || a.title || '';
                const bName = b.originalName || b.title || '';
                const comparison = aName.localeCompare(bName, 'ja', {numeric: true, sensitivity: 'base'});
                return this.currentSortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (this.currentSort === 'date') {
            sortedVideos.sort((a, b) => {
                const aDate = new Date(a.updatedAt || a.createdAt || 0);
                const bDate = new Date(b.updatedAt || b.createdAt || 0);
                const comparison = aDate - bDate;
                return this.currentSortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (this.currentSort === 'size') {
            sortedVideos.sort((a, b) => {
                const comparison = (a.size || 0) - (b.size || 0);
                return this.currentSortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (this.currentSort === 'duration') {
            sortedVideos.sort((a, b) => {
                const comparison = (a.duration || 0) - (b.duration || 0);
                return this.currentSortOrder === 'asc' ? comparison : -comparison;
            });
        } else if (this.currentSort === 'plays') {
            sortedVideos.sort((a, b) => {
                const aPlays = this.playCountData[a.id] || 0;
                const bPlays = this.playCountData[b.id] || 0;
                const comparison = aPlays - bPlays;
                return this.currentSortOrder === 'asc' ? comparison : -comparison;
            });
        }

        // フィルター条件の適用
        let filteredVideos = sortedVideos;
        
        // Favoriteタブの場合はFavorite動画のみに絞り込み
        if (this.currentTab === 'favorites') {
            filteredVideos = filteredVideos.filter(video => {
                return this.isFavorite(video.id);
            });
            console.log(`🌟 Filtered to favorites: ${filteredVideos.length} videos`);
        }
        
        // テキスト検索フィルター
        if (this.currentFilter.trim()) {
            const searchLower = this.currentFilter.toLowerCase();
            filteredVideos = filteredVideos.filter(video => {
                const name = (video.originalName || video.title || '').toLowerCase();
                const filename = (video.filename || '').toLowerCase();
                return name.includes(searchLower) || filename.includes(searchLower);
            });
        }

        this.filteredVideos = filteredVideos;
        console.log('🔍 Final filtered videos count:', filteredVideos.length);
        
        // 直接サムネイルを表示
        this.displayThumbnails(filteredVideos);
    },

    applySortAndFilter() {
        console.log('🔍 applySortAndFilter called, delegating to applySortAndFilterWithVideos with thumbnails');
        const videosWithThumbnails = this.currentVideos.filter(video => video.thumbnailUrl || video.isTs);
        console.log(`🔍 Filtering from ${this.currentVideos.length} total videos to ${videosWithThumbnails.length} with thumbnails`);
        this.applySortAndFilterWithVideos(videosWithThumbnails);
    },
    
    // 現在表示中の動画一覧を取得（フィルタ済み）
    getCurrentDisplayedVideos() {
        const videosToShow = this.filteredVideos.length > 0 ? this.filteredVideos : this.currentVideos;
        return videosToShow.slice(0, this.currentGridSize);
    },
    
    // ビデオプレイヤーを閉じる
    closeVideoPlayer() {
        console.log('🔒 Closing video player');
        
        // プレイヤーモード終了
        this.isPlayerMode = false;
        
        // リピート状態をリセット
        this.resetRepeatSection();
        
        // キーボードヘルプが表示されている場合は非表示
        this.hideKeyboardHelp();
        
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.pause();
            this.elements.videoPlayer.src = '';
        }
        
        if (this.elements.videoModal) {
            this.elements.videoModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // スクロール有効化
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
                    
                    // ローカルフォルダの場合はフォルダパスをIDとして使用
                    const localFolderId = `local-${btoa(realFolderPath).replace(/[+/=]/g, '')}`;
                    this.switchPlayCountData(localFolderId);
                    
                    // 1. サムネイル生成チェックを先に実行し、完了まで待機
                    console.log('📋 Step 1: Starting thumbnail generation check');
                    const thumbnailGenerationNeeded = await this.checkAndStartBulkThumbnailGenerationBeforeFetch();
                    
                    // 2. サムネイル生成が必要だった場合は完了を待つ
                    if (thumbnailGenerationNeeded) {
                        console.log('⏳ Step 2: Waiting for thumbnail generation to complete');
                        await this.startBulkThumbnailGenerationAndWait();
                    }
                    
                    // 3. サムネイルを取得・表示
                    console.log('📺 Step 3: Fetching and displaying thumbnails');
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

    // サーバー参照フォルダ選択ダイアログ機能（新しい統一UI）
    async selectVideoFolder() {
        this.showFolderSelectionModal();
    },

    // フォルダ選択モーダルを表示
    showFolderSelectionModal() {
        const modal = document.getElementById('folder-selection-modal');
        const platformDisplay = document.getElementById('platform-display');
        
        // プラットフォーム情報を表示
        const platform = this.detectPlatform();
        const platformName = this.getPlatformDisplayName(platform);
        platformDisplay.textContent = `🖥️ 検出されたOS: ${platformName}`;
        
        // モーダル状態をリセット
        this.resetModalState();
        
        // イベントリスナーを設定
        this.setupModalEventListeners();
        
        // モーダルを表示
        modal.style.display = 'block';
    },

    // プラットフォーム表示名を取得
    getPlatformDisplayName(platform) {
        switch (platform) {
            case 'windows':
                return 'Windows';
            case 'macos':
                return 'macOS';
            case 'linux':
                const isWSL = this.isWSLEnvironment();
                return isWSL ? 'Linux (WSL)' : 'Linux';
            default:
                return '不明';
        }
    },

    // モーダル状態をリセット
    resetModalState() {
        // ステータスメッセージをクリア
        document.getElementById('dialog-status').textContent = '';
        document.getElementById('manual-status').textContent = '';
        document.getElementById('manual-path-input').value = '';
        document.getElementById('path-suggestions').classList.remove('show');
        document.getElementById('confirm-selection-btn').disabled = true;
        
        // モーダル全体の選択状態をリセット
        this.selectedFolderPath = null;
    },

    // モーダルのイベントリスナーを設定
    setupModalEventListeners() {
        // 重複登録を防ぐため、既存のリスナーを削除
        document.getElementById('dialog-select-btn').replaceWith(
            document.getElementById('dialog-select-btn').cloneNode(true)
        );
        document.getElementById('browse-suggested-btn').replaceWith(
            document.getElementById('browse-suggested-btn').cloneNode(true)
        );
        document.getElementById('manual-path-input').replaceWith(
            document.getElementById('manual-path-input').cloneNode(true)
        );
        document.getElementById('confirm-selection-btn').replaceWith(
            document.getElementById('confirm-selection-btn').cloneNode(true)
        );
        
        // ダイアログ選択ボタン
        document.getElementById('dialog-select-btn').addEventListener('click', 
            () => this.handleDialogSelection());
        
        // パス候補表示ボタン
        document.getElementById('browse-suggested-btn').addEventListener('click', 
            () => this.showPathSuggestions());
        
        // 手動入力フィールド
        const manualInput = document.getElementById('manual-path-input');
        manualInput.addEventListener('input', () => this.handleManualPathInput());
        manualInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleManualPathInput();
            }
        });
        
        // 選択確定ボタン
        document.getElementById('confirm-selection-btn').addEventListener('click', 
            () => this.confirmFolderSelection());
    },

    // ダイアログでフォルダ選択
    async handleDialogSelection() {
        const statusElement = document.getElementById('dialog-status');
        
        try {
            statusElement.textContent = '📁 ダイアログを起動中...';
            statusElement.className = 'status-message info';
            
            // File System Access APIをサポートしているかチェック
            if ('showDirectoryPicker' in window) {
                console.log('🔄 Using File System Access API (Modern browsers)');
                const directoryHandle = await window.showDirectoryPicker();
                
                // フォルダ名とパスを取得（推定）
                const folderName = directoryHandle.name;
                const platform = this.detectPlatform();
                const currentUser = this.getCurrentUser();
                
                // プラットフォーム別のデフォルトパス候補を生成
                const candidates = this.generatePlatformSpecificCandidates(folderName, currentUser, platform);
                const suggestedPath = candidates.length > 0 ? candidates[0].path : 
                    this.getDefaultPath(folderName, currentUser, platform);
                
                this.selectedFolderPath = suggestedPath;
                this.selectedDirectoryHandle = directoryHandle;
                
                statusElement.textContent = `✅ ダイアログで「${folderName}」が選択されました`;
                statusElement.className = 'status-message success';
                
                document.getElementById('manual-path-input').value = suggestedPath;
                document.getElementById('confirm-selection-btn').disabled = false;
                
            } else {
                // フォールバック: input[type="file"]を使用（webkitdirectory）
                console.log('🔄 Falling back to webkitdirectory (Legacy browsers)');
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.webkitdirectory = true;
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                
                fileInput.addEventListener('change', (event) => {
                    const files = Array.from(event.target.files);
                    
                    if (files.length > 0) {
                        // 最初のファイルからフォルダパスを抽出
                        const firstFile = files[0];
                        const relativePath = firstFile.webkitRelativePath;
                        const pathParts = relativePath.split('/');
                        const folderName = pathParts[0];
                        
                        // プラットフォーム別のパス候補を生成
                        const platform = this.detectPlatform();
                        const currentUser = this.getCurrentUser();
                        const candidates = this.generatePlatformSpecificCandidates(folderName, currentUser, platform);
                        const suggestedPath = candidates.length > 0 ? candidates[0].path : 
                            this.getDefaultPath(folderName, currentUser, platform);
                        
                        this.selectedFolderPath = suggestedPath;
                        this.selectedFiles = files;
                        
                        statusElement.textContent = `✅ 「${folderName}」フォルダが選択されました（${files.length}ファイル）`;
                        statusElement.className = 'status-message success';
                        
                        document.getElementById('manual-path-input').value = suggestedPath;
                        document.getElementById('confirm-selection-btn').disabled = false;
                    } else {
                        statusElement.textContent = '⚠️ フォルダが選択されませんでした';
                        statusElement.className = 'status-message warning';
                    }
                    
                    document.body.removeChild(fileInput);
                });
                
                document.body.appendChild(fileInput);
                fileInput.click();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                statusElement.textContent = '❌ フォルダ選択がキャンセルされました';
                statusElement.className = 'status-message warning';
            } else {
                console.error('Folder selection error:', error);
                statusElement.textContent = `❌ エラー: ${error.message}`;
                statusElement.className = 'status-message error';
            }
        }
    },

    // パス候補を表示
    showPathSuggestions() {
        const suggestionsContainer = document.getElementById('path-suggestions');
        const manualInput = document.getElementById('manual-path-input');
        
        const platform = this.detectPlatform();
        const currentUser = this.getCurrentUser();
        
        // 現在の入力値からフォルダ名を推測
        let folderName = 'Videos';
        const inputValue = manualInput.value.trim();
        if (inputValue) {
            const parts = inputValue.split(/[\/\\]/);
            folderName = parts[parts.length - 1] || parts[parts.length - 2] || 'Videos';
        }
        
        const candidates = this.generatePlatformSpecificCandidates(folderName, currentUser, platform);
        
        // 候補を表示
        suggestionsContainer.innerHTML = '';
        
        candidates.forEach(candidate => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            item.innerHTML = `
                <div class="suggestion-label">${candidate.name}</div>
                <div class="suggestion-path">${candidate.path}</div>
            `;
            
            item.addEventListener('click', () => {
                manualInput.value = candidate.path;
                this.handleManualPathInput();
                suggestionsContainer.classList.remove('show');
            });
            
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.classList.add('show');
    },

    // 手動パス入力を処理
    handleManualPathInput() {
        const manualInput = document.getElementById('manual-path-input');
        const statusElement = document.getElementById('manual-status');
        const confirmBtn = document.getElementById('confirm-selection-btn');
        
        const inputPath = manualInput.value.trim();
        
        if (inputPath === '') {
            statusElement.textContent = '';
            statusElement.className = '';
            confirmBtn.disabled = true;
            this.selectedFolderPath = null;
            return;
        }
        
        // WSL環境でのパスアクセス権限制約を考慮し、手動入力時は検証をスキップ
        // ユーザーが入力したパスをそのまま受け入れる
        this.selectedFolderPath = inputPath;
        statusElement.textContent = '✅ パスが入力されました (検証スキップ)';
        statusElement.className = 'status-message success';
        confirmBtn.disabled = false;
    },

    // フォルダパスを検証
    validateFolderPath(path) {
        if (!path) return false;
        
        const platform = this.detectPlatform();
        
        switch (platform) {
            case 'windows':
                // Windows形式のパス検証（例：C:\Users\username\folder）
                return /^[A-Za-z]:\\/.test(path) || /^\\\\/.test(path);
            case 'linux':
            case 'macos':
            default:
                // Unix系形式のパス検証（例：/home/username/folder）
                return /^\//.test(path);
        }
    },

    // フォルダ選択を確定
    async confirmFolderSelection() {
        if (!this.selectedFolderPath) {
            return;
        }
        
        // メインUIを更新
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const changeFolderBtn = document.getElementById('change-folder-btn');
        const folderStatus = document.getElementById('folder-status');
        
        selectedFolderPath.textContent = `📁 選択済み: ${this.selectedFolderPath}`;
        selectedFolderPath.dataset.realFolderPath = this.selectedFolderPath;
        
        changeFolderBtn.disabled = false;
        changeFolderBtn.textContent = 'サーバー参照フォルダに設定';
        folderStatus.innerHTML = '<span style="color: green;">✅ フォルダが選択されました</span>';
        
        // モーダルを閉じる
        this.closeFolderSelectionModal();
    },

    // フォルダ選択モーダルを閉じる
    closeFolderSelectionModal() {
        const modal = document.getElementById('folder-selection-modal');
        modal.style.display = 'none';
        
        // 状態をクリア
        this.selectedFolderPath = null;
        this.selectedDirectoryHandle = null;
        this.selectedFiles = null;
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

    // WSL環境かどうかを判定
    isWSLEnvironment() {
        // User Agentや環境変数からWSLを推測する簡易判定
        const userAgent = navigator.userAgent.toLowerCase();
        
        // WSLでよくある特徴：
        // 1. LinuxベースだがWindows環境で動作
        // 2. /mnt/c などのマウントポイントが存在する可能性
        
        // 簡易的な判定として、Linuxプラットフォームで特定のパターンをチェック
        if (this.detectPlatform() === 'linux') {
            // より具体的なWSL判定はサーバーサイドで行うか、
            // または実際のファイルシステムチェックが必要
            // ここでは保守的にtrueを返してWSL候補を表示
            return true;
        }
        
        return false;
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
                
                // WSL環境用の Windows パスも追加
                if (this.isWSLEnvironment()) {
                    candidates.push(
                        { name: 'Windows デスクトップ', path: `/mnt/c/Users/${currentUser}/Desktop/${folderName}` },
                        { name: 'Windows ダウンロード', path: `/mnt/c/Users/${currentUser}/Downloads/${folderName}` },
                        { name: 'Windows ドキュメント', path: `/mnt/c/Users/${currentUser}/Documents/${folderName}` },
                        { name: 'Windows ビデオ', path: `/mnt/c/Users/${currentUser}/Videos/${folderName}` },
                        { name: 'D ドライブ', path: `/mnt/d/${folderName}` }
                    );
                }
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
    },

    // ===== 登録フォルダ管理機能 =====
    
    // 登録フォルダUI初期化
    initRegisteredFoldersUI() {
        const applyBtn = document.getElementById('apply-registered-btn');
        const registerBtn = document.getElementById('register-current-btn');
        const removeBtn = document.getElementById('remove-registered-btn');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyRegisteredFolder());
        }
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.registerCurrentFolder());
        }
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeRegisteredFolder());
        }
        
        // 登録フォルダ一覧を読み込み
        this.fetchRegisteredFolders();
    },

    // 登録フォルダ一覧取得
    async fetchRegisteredFolders() {
        try {
            console.log('🔍 Fetching registered folders...');
            const response = await fetch('/api/videos/folders');
            console.log('📡 Response status:', response.status);
            
            const result = await response.json();
            console.log('📋 API Response:', result);
            
            if (result.success && Array.isArray(result.data)) {
                console.log(`✅ Found ${result.data.length} registered folders`);
                this.renderRegisteredFolders(result.data);
            } else {
                console.error('❌ Failed to fetch registered folders:', result.message);
                const registeredStatus = document.getElementById('registered-status');
                if (registeredStatus) {
                    registeredStatus.innerHTML = `<span style="color: orange;">⚠️ 登録フォルダの取得に失敗: ${result.message || 'Unknown error'}</span>`;
                }
            }
        } catch (error) {
            console.error('❌ Error fetching registered folders:', error);
            const registeredStatus = document.getElementById('registered-status');
            if (registeredStatus) {
                registeredStatus.innerHTML = `<span style="color: red;">❌ 通信エラー: ${error.message}</span>`;
            }
        }
    },

    // 登録フォルダ一覧表示
    renderRegisteredFolders(folders) {
        console.log('🎨 Rendering registered folders:', folders);
        const select = document.getElementById('registered-folders-select');
        if (!select) {
            console.error('❌ registered-folders-select element not found!');
            return;
        }
        
        // 既存オプションをクリア
        select.innerHTML = '<option value="">フォルダを選択してください</option>';
        
        // 登録フォルダをオプションとして追加
        if (folders.length === 0) {
            console.log('📂 No registered folders found');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "登録されたフォルダがありません";
            option.disabled = true;
            select.appendChild(option);
        } else {
            folders.forEach(folder => {
                console.log(`📁 Adding folder option: ${folder.name} (${folder.path})`);
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = `${folder.name} (${folder.path})`;
                select.appendChild(option);
            });
        }
    },

    // 現在のフォルダを登録
    async registerCurrentFolder() {
        console.log('📝 Starting folder registration...');
        const selectedFolderPath = document.getElementById('selected-folder-path');
        const registeredStatus = document.getElementById('registered-status');
        
        console.log('🔍 Checking selected folder element:', selectedFolderPath);
        console.log('🔍 Current dataset:', selectedFolderPath?.dataset);
        
        if (!selectedFolderPath || !selectedFolderPath.dataset.realFolderPath) {
            console.log('❌ No folder selected');
            alert('まずフォルダを選択してください');
            return;
        }
        
        const folderPath = selectedFolderPath.dataset.realFolderPath;
        console.log('📁 Folder path to register:', folderPath);
        
        const folderName = prompt('表示名を入力してください（空の場合はフォルダ名を使用）:');
        
        // キャンセルされた場合は処理を中止
        if (folderName === null) {
            console.log('📝 Registration cancelled by user');
            return;
        }
        
        const payload = {
            path: folderPath,
            name: folderName || undefined
        };
        
        console.log('🚀 Sending registration request:', payload);
        
        try {
            registeredStatus.innerHTML = '<span style="color: blue;">📁 フォルダを登録中...</span>';
            
            const response = await fetch('/api/videos/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('📡 Registration response status:', response.status);
            const result = await response.json();
            console.log('📋 Registration response:', result);
            
            if (result.success) {
                registeredStatus.innerHTML = '<span style="color: green;">✅ フォルダが登録されました</span>';
                console.log('✅ Registration successful');
                
                // 登録フォルダ一覧を更新
                await this.fetchRegisteredFolders();
                
                setTimeout(() => {
                    registeredStatus.innerHTML = '';
                }, 3000);
            } else {
                console.error('❌ Registration failed:', result.message);
                registeredStatus.innerHTML = `<span style="color: red;">❌ 登録失敗: ${result.message}</span>`;
            }
        } catch (error) {
            console.error('❌ Error registering folder:', error);
            registeredStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
        }
    },

    // 登録フォルダを適用
    async applyRegisteredFolder() {
        const select = document.getElementById('registered-folders-select');
        const registeredStatus = document.getElementById('registered-status');
        
        if (!select || !select.value) {
            alert('登録フォルダを選択してください');
            return;
        }
        
        const folderId = select.value;
        
        try {
            registeredStatus.innerHTML = '<span style="color: blue;">🔄 フォルダを切り替え中...</span>';
            
            const response = await fetch('/api/videos/change-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: 'registered',
                    folderId: folderId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                registeredStatus.innerHTML = '<span style="color: green;">✅ フォルダが切り替えられました</span>';
                
                // 再生回数データを切り替え
                this.switchPlayCountData(folderId);
                
                // サムネイル生成チェックを先に実行
                await this.checkAndStartBulkThumbnailGenerationBeforeFetch();
                
                // サムネイル一覧を更新
                await this.fetchThumbnails();
                
                setTimeout(() => {
                    registeredStatus.innerHTML = '';
                }, 3000);
            } else {
                registeredStatus.innerHTML = `<span style="color: red;">❌ 切り替え失敗: ${result.message}</span>`;
            }
        } catch (error) {
            console.error('Error applying registered folder:', error);
            registeredStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
        }
    },

    // 登録フォルダを削除
    async removeRegisteredFolder() {
        const select = document.getElementById('registered-folders-select');
        const registeredStatus = document.getElementById('registered-status');
        
        if (!select || !select.value) {
            alert('削除する登録フォルダを選択してください');
            return;
        }
        
        const folderId = select.value;
        const selectedOption = select.options[select.selectedIndex];
        const folderName = selectedOption.textContent;
        
        if (!confirm(`「${folderName}」を登録から削除しますか？`)) {
            return;
        }
        
        try {
            registeredStatus.innerHTML = '<span style="color: blue;">🗑️ フォルダ登録を削除中...</span>';
            
            const response = await fetch(`/api/videos/folders/${folderId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                registeredStatus.innerHTML = '<span style="color: green;">✅ フォルダ登録が削除されました</span>';
                
                // 登録フォルダ一覧を更新
                await this.fetchRegisteredFolders();
                
                setTimeout(() => {
                    registeredStatus.innerHTML = '';
                }, 3000);
            } else {
                registeredStatus.innerHTML = `<span style="color: red;">❌ 削除失敗: ${result.message}</span>`;
            }
        } catch (error) {
            console.error('Error removing registered folder:', error);
            registeredStatus.innerHTML = `<span style="color: red;">❌ エラー: ${error.message}</span>`;
        }
    },
    
    // 2区間リピート機能 - 区間設定処理
    handleRepeatSetting() {
        const video = this.elements.videoPlayer;
        if (!video) return;
        
        const currentTime = video.currentTime;
        
        switch (this.repeatState.settingMode) {
            case 'none':
                // 開始点設定モード
                this.repeatState.startTime = currentTime;
                this.repeatState.settingMode = 'setting-start';
                this.showRepeatStatus(`🔴 リピート開始点設定: ${this.formatTime(currentTime)}`);
                console.log(`🔴 Repeat start time set: ${currentTime.toFixed(2)}s`);
                break;
                
            case 'setting-start':
                // 終了点設定とリピート開始
                this.repeatState.endTime = currentTime;
                this.repeatState.settingMode = 'setting-end';
                this.repeatState.isActive = true;
                
                // 開始点より前の場合は入れ替え
                if (this.repeatState.endTime < this.repeatState.startTime) {
                    [this.repeatState.startTime, this.repeatState.endTime] = [this.repeatState.endTime, this.repeatState.startTime];
                }
                
                this.showRepeatStatus(`🔁 リピート設定完了: ${this.formatTime(this.repeatState.startTime)} ～ ${this.formatTime(this.repeatState.endTime)}`);
                console.log(`🔁 Repeat section set: ${this.repeatState.startTime.toFixed(2)}s - ${this.repeatState.endTime.toFixed(2)}s`);
                
                // リピートイベントリスナーを設定
                this.setupRepeatListener();
                break;
                
            case 'setting-end':
                // 新しい区間設定開始（既存区間をリセット）
                this.resetRepeatSection();
                this.handleRepeatSetting(); // 再帰呼び出しで新しい設定開始
                break;
        }
    },
    
    // リピート区間リセット
    resetRepeatSection() {
        this.repeatState.startTime = null;
        this.repeatState.endTime = null;
        this.repeatState.isActive = false;
        this.repeatState.settingMode = 'none';
        
        // リピートイベントリスナーを削除
        this.removeRepeatListener();
        
        this.showRepeatStatus('🔄 リピート区間をリセットしました');
        console.log('🔄 Repeat section reset');
    },
    
    // リピートリスナー設定
    setupRepeatListener() {
        const video = this.elements.videoPlayer;
        if (!video) return;
        
        // 既存のリスナーがあれば削除
        this.removeRepeatListener();
        
        // 新しいリスナーを設定
        this.repeatListener = () => {
            if (this.repeatState.isActive && 
                this.repeatState.startTime !== null && 
                this.repeatState.endTime !== null) {
                
                if (video.currentTime >= this.repeatState.endTime) {
                    video.currentTime = this.repeatState.startTime;
                    console.log(`🔁 Repeat jump: ${this.repeatState.endTime.toFixed(2)}s -> ${this.repeatState.startTime.toFixed(2)}s`);
                }
            }
        };
        
        video.addEventListener('timeupdate', this.repeatListener);
    },
    
    // リピートリスナー削除
    removeRepeatListener() {
        const video = this.elements.videoPlayer;
        if (video && this.repeatListener) {
            video.removeEventListener('timeupdate', this.repeatListener);
            this.repeatListener = null;
        }
    },
    
    // 時間フォーマット（mm:ss形式）
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    // リピート状態表示
    showRepeatStatus(message) {
        // 既存の状態表示要素があるか確認
        let statusElement = document.getElementById('repeat-status');
        
        if (!statusElement) {
            // 状態表示要素を作成
            statusElement = document.createElement('div');
            statusElement.id = 'repeat-status';
            statusElement.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 1001;
                max-width: 300px;
                word-wrap: break-word;
            `;
            this.elements.videoModal.appendChild(statusElement);
        }
        
        statusElement.textContent = message;
        statusElement.style.display = 'block';
        
        // 3秒後に非表示
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        }, 3000);
    },
    
    // キーボードヘルプの表示・非表示切り替え
    toggleKeyboardHelp() {
        let helpOverlay = document.getElementById('keyboard-help-overlay');
        
        if (helpOverlay && helpOverlay.style.display === 'flex') {
            // すでに表示されている場合は非表示
            helpOverlay.style.display = 'none';
            document.body.style.overflow = this.isPlayerMode ? 'hidden' : 'auto';
        } else {
            // 表示されていない場合は表示
            this.showKeyboardHelp();
        }
    },
    
    // キーボードヘルプオーバーレイを表示
    showKeyboardHelp() {
        // 既存のヘルプオーバーレイを削除
        this.hideKeyboardHelp();
        
        // ヘルプオーバーレイを作成
        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboard-help-overlay';
        helpOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // ヘルプコンテンツを作成
        const helpContent = document.createElement('div');
        helpContent.style.cssText = `
            background: #1a1a1a;
            color: #ffffff;
            border-radius: 12px;
            padding: 30px 40px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
        `;
        
        const currentMode = this.isPlayerMode && this.elements.videoModal.style.display === 'block' ? 'player' : 'grid';
        
        helpContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="color: #4CAF50; margin: 0 0 10px 0; font-size: 24px;">⌨️ キーボードショートカット</h2>
                <p style="margin: 0; color: #aaa; font-size: 14px;">現在のモード: ${currentMode === 'player' ? 'ビデオプレイヤー' : 'グリッドナビゲーション'}</p>
            </div>
            
            ${currentMode === 'player' ? `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2196F3; margin-bottom: 15px; font-size: 18px;">🎬 ビデオプレイヤー</h3>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px 20px; align-items: center;">
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">K</kbd>
                    <span>再生・一時停止</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Space</kbd>
                    <span>2区間リピート設定</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">C</kbd>
                    <span>リピート区間リセット</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">←</kbd>
                    <span>5秒戻る</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">→</kbd>
                    <span>5秒進む</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">J</kbd>
                    <span>10秒戻る</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">L</kbd>
                    <span>10秒進む</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">M</kbd>
                    <span>ミュート・ミュート解除</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Escape</kbd>
                    <span>プレイヤーを閉じる</span>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #FF9800; margin-bottom: 15px; font-size: 18px;">🔁 2区間リピート機能</h3>
                <div style="background: #2a2a2a; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                    <p style="margin: 0 0 10px 0;"><strong>1.</strong> 開始点で <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Space</kbd> を押す</p>
                    <p style="margin: 0 0 10px 0;"><strong>2.</strong> 終了点で再度 <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Space</kbd> を押す</p>
                    <p style="margin: 0 0 10px 0;"><strong>3.</strong> 区間が自動的にリピート再生される</p>
                    <p style="margin: 0;"><strong>4.</strong> <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">C</kbd> でリピート解除</p>
                </div>
            </div>
            ` : `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2196F3; margin-bottom: 15px; font-size: 18px;">🎯 グリッドナビゲーション</h3>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px 20px; align-items: center;">
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">↑ ↓ ← →</kbd>
                    <span>サムネイル間の移動</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Enter</kbd>
                    <span>選択中の動画を再生</span>
                    
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">1 / 2 / 3</kbd>
                    <span>グリッドサイズ切り替え (24/48/96)</span>
                </div>
            </div>
            `}
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #9C27B0; margin-bottom: 15px; font-size: 18px;">💡 共通操作</h3>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px 20px; align-items: center;">
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">?</kbd>
                    <span>このヘルプを表示・非表示</span>
                </div>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333;">
                <p style="margin: 0; color: #aaa; font-size: 14px;">
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">?</kbd> または 
                    <kbd style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Escape</kbd> でこのヘルプを閉じる
                </p>
            </div>
        `;
        
        helpOverlay.appendChild(helpContent);
        document.body.appendChild(helpOverlay);
        document.body.style.overflow = 'hidden';
        
        // クリックまたはEscapeで閉じる
        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                this.hideKeyboardHelp();
            }
        });
        
        // キーダウンハンドラーを作成してプロパティに保存
        this.helpKeydownHandler = (e) => {
            const helpOverlay = document.getElementById('keyboard-help-overlay');
            if (helpOverlay && helpOverlay.style.display !== 'none') {
                if (e.key === 'Escape' || e.key === '?' || (e.key === '/' && e.shiftKey)) {
                    e.preventDefault();
                    this.hideKeyboardHelp();
                }
            }
        };
        
        // イベントリスナーを追加
        document.addEventListener('keydown', this.helpKeydownHandler);
    },
    
    // キーボードヘルプを非表示
    hideKeyboardHelp() {
        const helpOverlay = document.getElementById('keyboard-help-overlay');
        if (helpOverlay) {
            helpOverlay.remove();
        }
        
        // イベントリスナーを削除
        if (this.helpKeydownHandler) {
            document.removeEventListener('keydown', this.helpKeydownHandler);
            this.helpKeydownHandler = null;
        }
        
        // オーバーフローを元に戻す
        document.body.style.overflow = this.isPlayerMode ? 'hidden' : 'auto';
    },

    // 並列サムネイル生成の実行
    async generateThumbnailsBatch() {
        if (this.thumbnailGeneration.isRunning) {
            alert('サムネイル生成は既に実行中です');
            return;
        }

        try {
            this.thumbnailGeneration.isRunning = true;
            this.showThumbnailGenerationStatus('開始中...', { successful: 0, failed: 0, total: 0 });

            const response = await fetch('/api/videos/thumbnails/batch-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    skipExisting: true,
                    maxConcurrency: undefined // サーバー側で自動決定
                })
            });

            const result = await response.json();

            if (result.success) {
                this.thumbnailGeneration.stats = result.data;
                this.showThumbnailGenerationStatus('完了', result.data);
                
                // サムネイルを再読み込み
                setTimeout(() => {
                    this.fetchThumbnails();
                    this.hideThumbnailGenerationStatus();
                }, 2000);
            } else {
                throw new Error(result.message || 'サムネイル生成に失敗しました');
            }
        } catch (error) {
            console.error('Batch thumbnail generation error:', error);
            this.showThumbnailGenerationStatus(`エラー: ${error.message}`, null);
            
            setTimeout(() => {
                this.hideThumbnailGenerationStatus();
            }, 5000);
        } finally {
            this.thumbnailGeneration.isRunning = false;
        }
    },

    // 超高速サムネイル生成の実行
    async generateThumbnailsUltraFast() {
        if (this.thumbnailGeneration.isRunning) {
            alert('サムネイル生成は既に実行中です');
            return;
        }

        try {
            this.thumbnailGeneration.isRunning = true;
            this.showThumbnailGenerationStatus('⚡ 超高速モード開始中...', { successful: 0, failed: 0, total: 0 });

            const response = await fetch('/api/videos/thumbnails/ultra-fast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.thumbnailGeneration.stats = result.data;
                this.showThumbnailGenerationStatus('⚡ 超高速生成完了', result.data);
                
                // サムネイルを再読み込み
                setTimeout(() => {
                    this.fetchThumbnails();
                    this.hideThumbnailGenerationStatus();
                }, 2000);
            } else {
                throw new Error(result.message || '超高速サムネイル生成に失敗しました');
            }
        } catch (error) {
            console.error('Ultra-fast thumbnail generation error:', error);
            this.showThumbnailGenerationStatus(`❌ エラー: ${error.message}`, null);
            
            setTimeout(() => {
                this.hideThumbnailGenerationStatus();
            }, 5000);
        } finally {
            this.thumbnailGeneration.isRunning = false;
        }
    },

    // プログレッシブサムネイル生成の実行
    async generateThumbnailsProgressive() {
        if (this.thumbnailGeneration.isRunning) {
            alert('サムネイル生成は既に実行中です');
            return;
        }

        try {
            this.thumbnailGeneration.isRunning = true;
            this.showThumbnailGenerationStatus('🎯 プログレッシブモード開始中...', { successful: 0, failed: 0, total: 0 });

            const response = await fetch('/api/videos/thumbnails/progressive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.thumbnailGeneration.stats = result.data;
                this.showThumbnailGenerationStatus('🎯 プログレッシブ生成完了', result.data);
                
                // サムネイルを再読み込み
                setTimeout(() => {
                    this.fetchThumbnails();
                    this.hideThumbnailGenerationStatus();
                }, 2000);
            } else {
                throw new Error(result.message || 'プログレッシブサムネイル生成に失敗しました');
            }
        } catch (error) {
            console.error('Progressive thumbnail generation error:', error);
            this.showThumbnailGenerationStatus(`❌ エラー: ${error.message}`, null);
            
            setTimeout(() => {
                this.hideThumbnailGenerationStatus();
            }, 5000);
        } finally {
            this.thumbnailGeneration.isRunning = false;
        }
    },

    // サムネイル生成ステータスの表示
    showThumbnailGenerationStatus(status, stats) {
        let statusEl = document.getElementById('thumbnail-generation-status');
        
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'thumbnail-generation-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: monospace;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                min-width: 300px;
            `;
            document.body.appendChild(statusEl);
        }

        let content = `🎬 サムネイル生成: ${status}`;
        
        if (stats) {
            content += `\n`;
            content += `✅ 成功: ${stats.successful}\n`;
            content += `❌ 失敗: ${stats.failed}\n`;
            content += `📊 合計: ${stats.total}`;
            
            if (stats.stats) {
                content += `\n\n⚙️ 設定:`;
                content += `\n  最大並列数: ${stats.stats.maxConcurrency}`;
                content += `\n  実行中: ${stats.stats.activeJobs}`;
            }
        }

        statusEl.innerHTML = content.replace(/\n/g, '<br>');
    },

    // サムネイル生成ステータスの非表示
    hideThumbnailGenerationStatus() {
        const statusEl = document.getElementById('thumbnail-generation-status');
        if (statusEl) {
            statusEl.remove();
        }
    },

    // サムネイル生成統計情報の取得
    async getThumbnailStats() {
        try {
            const response = await fetch('/api/videos/thumbnails/stats');
            const result = await response.json();

            if (result.success) {
                console.log('Thumbnail generation stats:', result.data);
                
                // 統計情報を美しく表示
                const stats = result.data;
                let statsMessage = `📊 サムネイル生成統計\n\n`;
                statsMessage += `⚙️ 最大並列数: ${stats.maxConcurrency}\n`;
                statsMessage += `🔄 実行中ジョブ: ${stats.activeJobs}\n`;
                statsMessage += `📁 保存先: ${stats.thumbnailDir}\n\n`;
                
                if (stats.gpuCapabilities) {
                    statsMessage += `🎮 GPU機能:\n`;
                    statsMessage += `  NVENC (NVIDIA): ${stats.gpuCapabilities.nvenc ? '✅' : '❌'}\n`;
                    statsMessage += `  VAAPI (Intel/AMD): ${stats.gpuCapabilities.vaapi ? '✅' : '❌'}\n`;
                    statsMessage += `  QSV (Intel): ${stats.gpuCapabilities.qsv ? '✅' : '❌'}\n`;
                    statsMessage += `  GPU利用可能: ${stats.gpuCapabilities.available ? '✅' : '❌'}\n`;
                }
                
                alert(statsMessage);
                return result.data;
            }
        } catch (error) {
            console.error('Error getting thumbnail stats:', error);
            alert('統計情報の取得に失敗しました');
        }
        return null;
    }
};

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Service Worker の登録
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
                
                // PWAインストールプロンプト
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                    console.log('💡 PWA install prompt available');
                    e.preventDefault();
                    deferredPrompt = e;
                    
                    // インストールボタンを表示（オプション）
                    const installButton = document.createElement('button');
                    installButton.textContent = '📱 アプリをインストール';
                    installButton.className = 'btn btn-primary';
                    installButton.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        z-index: 1000;
                        border-radius: 25px;
                        box-shadow: 0 4px 20px rgba(0, 123, 255, 0.3);
                    `;
                    
                    installButton.addEventListener('click', async () => {
                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            const { outcome } = await deferredPrompt.userChoice;
                            console.log('PWA install outcome:', outcome);
                            deferredPrompt = null;
                            installButton.remove();
                        }
                    });
                    
                    document.body.appendChild(installButton);
                    
                    // 30秒後に自動で非表示
                    setTimeout(() => {
                        if (installButton.parentNode) {
                            installButton.remove();
                        }
                    }, 30000);
                });
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }

        await VideoApp.init();
        console.log('✅ VideoApp initialization completed');
    } catch (error) {
        console.error('❌ VideoApp initialization failed:', error);
    }
});

// グローバル関数として公開
window.uploadVideo = () => VideoApp.uploadVideo();
window.debugFetchThumbnails = () => VideoApp.fetchThumbnails();
window.generateThumbnailsBatch = () => VideoApp.generateThumbnailsBatch();
window.generateThumbnailsUltraFast = () => VideoApp.generateThumbnailsUltraFast();
window.generateThumbnailsProgressive = () => VideoApp.generateThumbnailsProgressive();
window.getThumbnailStats = () => VideoApp.getThumbnailStats();
window.closeVideoPlayer = () => VideoApp.closeVideoPlayer();
window.changeVideoFolder = () => VideoApp.changeVideoFolder();
window.selectVideoFolder = () => VideoApp.selectVideoFolder();
window.closeFolderSelectionModal = () => VideoApp.closeFolderSelectionModal();
window.runThumbnailTests = () => {
    console.log('🧪 Running thumbnail tests...');
    // テスト関数をここに実装
};

    // アコーディオン機能の実装
let isAdvancedFeaturesExpanded = false;

window.toggleAdvancedFeatures = () => {
    const content = document.getElementById('advanced-features-content');
    const arrow = document.getElementById('accordion-arrow');
    const header = document.querySelector('.accordion-header');
    
    if (!content || !arrow || !header) {
        console.error('Required accordion elements not found');
        return;
    }
    
    isAdvancedFeaturesExpanded = !isAdvancedFeaturesExpanded;
    
    if (isAdvancedFeaturesExpanded) {
        // 展開
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        arrow.textContent = '▲';
        header.classList.add('expanded');
    } else {
        // 折りたたみ
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        arrow.textContent = '▼';
        header.classList.remove('expanded');
    }
};

// TSトランスコード確認ダイアログを表示
window.showTranscodeDialog = (video) => {
    const dialog = document.createElement('div');
    dialog.className = 'transcode-dialog';
    
    dialog.innerHTML = `
        <div class="transcode-dialog-content">
            <h3>🔄 TSファイルのトランスコード</h3>
            <p><strong>ファイル名:</strong> ${video.originalName}</p>
            <p>このTSファイルをMP4形式に変換しますか？<br>
               変換には時間がかかる場合があります。</p>
            <div class="transcode-dialog-buttons">
                <button class="btn-secondary" onclick="closeTranscodeDialog()">キャンセル</button>
                <button class="btn-primary" onclick="startTranscode('${video.id}')">変換開始</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // ESCキーで閉じる
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeTranscodeDialog();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeTranscodeDialog();
        }
    });
};

window.closeTranscodeDialog = () => {
    const dialog = document.querySelector('.transcode-dialog');
    if (dialog) {
        dialog.remove();
    }
};

// プログレス表示ダイアログを表示
window.showTranscodeProgress = (jobId) => {
    const dialog = document.createElement('div');
    dialog.className = 'transcode-progress-dialog';
    
    dialog.innerHTML = `
        <div class="transcode-progress-content">
            <h3>🔄 トランスコード進行中</h3>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill-${jobId}" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="progress-text-${jobId}">0%</div>
            </div>
            <div class="progress-status" id="progress-status-${jobId}">準備中...</div>
            <div class="progress-buttons">
                <button class="btn-danger" id="progress-cancel-btn-${jobId}" onclick="cancelTranscode('${jobId}')">中断</button>
                <button class="btn-secondary" id="progress-close-btn-${jobId}" onclick="closeProgressDialog('${jobId}')" disabled>閉じる</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // プログレス監視開始
    startProgressMonitoring(jobId);
};

// プログレス監視機能
window.startProgressMonitoring = (jobId) => {
    let isCancelled = false; // 中断状態を追跡
    let intervalId = null; // インターバルIDを保存
    
    const checkProgress = async () => {
        // 中断された場合は監視を完全に停止
        if (isCancelled) {
            if (intervalId) {
                clearTimeout(intervalId);
                intervalId = null;
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/videos/transcode/progress/${jobId}`);
            const result = await response.json();
            
            if (result.success) {
                const { progress, status } = result.data;
                
                // プログレスバー更新（中断されていない場合のみ）
                const progressFill = document.getElementById(`progress-fill-${jobId}`);
                const progressText = document.getElementById(`progress-text-${jobId}`);
                const progressStatus = document.getElementById(`progress-status-${jobId}`);
                const closeBtn = document.getElementById(`progress-close-btn-${jobId}`);
                const cancelBtn = document.getElementById(`progress-cancel-btn-${jobId}`);
                
                // 中断されている場合は更新を停止
                if (isCancelled) return;
                
                if (progressFill && progressText && progressStatus) {
                    // 通常のプログレス更新
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${Math.round(progress)}%`;
                    
                    // ステータス更新
                    if (status === 'completed') {
                        progressStatus.textContent = '✅ 完了しました！';
                        closeBtn.disabled = false;
                        closeBtn.textContent = '閉じる';
                        if (cancelBtn) cancelBtn.style.display = 'none';
                        
                        // ビデオリストを再読み込み
                        setTimeout(() => {
                            VideoApp.fetchThumbnails();
                        }, 1000);
                        
                        return; // 監視終了
                    } else if (status === 'error') {
                        progressStatus.textContent = '❌ エラーが発生しました';
                        closeBtn.disabled = false;
                        closeBtn.textContent = '閉じる';
                        if (cancelBtn) cancelBtn.style.display = 'none';
                        return; // 監視終了
                    } else if (status === 'cancelled') {
                        // サーバー側から中断状態が返された場合も監視停止
                        isCancelled = true;
                        return; // 監視終了
                    } else {
                        progressStatus.textContent = '🔄 変換中...';
                    }
                }
            }
        } catch (error) {
            // 中断されている場合はエラーログも出力しない
            if (!isCancelled) {
                console.error('Progress check error:', error);
                const progressStatus = document.getElementById(`progress-status-${jobId}`);
                if (progressStatus) {
                    progressStatus.textContent = '❌ 進捗取得エラー';
                }
            }
        }
        
        // 中断されていない場合のみ次のチェックをスケジュール
        if (!isCancelled) {
            intervalId = setTimeout(checkProgress, 2000);
        }
    };
    
    // 最初のチェック
    checkProgress();
    
    // 中断状態を外部から設定できるように関数を追加
    window[`setCancelledStatus_${jobId}`] = () => {
        isCancelled = true;
        if (intervalId) {
            clearTimeout(intervalId);
            intervalId = null;
        }
        console.log(`🛑 Progress monitoring stopped for job: ${jobId}`);
    };
};

// プログレスダイアログを閉じる
window.closeProgressDialog = (jobId) => {
    const dialog = document.querySelector('.transcode-progress-dialog');
    if (dialog) {
        dialog.remove();
    }
};

// トランスコード中断機能
window.cancelTranscode = async (jobId) => {
    try {
        // 確認ダイアログを表示
        const confirmed = confirm('トランスコードを中断しますか？\n作成中のMP4ファイルは削除されます。');
        if (!confirmed) return;

        console.log(`🛑 Cancelling transcode: ${jobId}`);

        // プログレス監視を即座に停止（API呼び出し前に停止）
        if (typeof window[`setCancelledStatus_${jobId}`] === 'function') {
            window[`setCancelledStatus_${jobId}`]();
        }

        // 中断ボタンを無効化
        const cancelBtn = document.getElementById(`progress-cancel-btn-${jobId}`);
        const progressStatus = document.getElementById(`progress-status-${jobId}`);
        const progressFill = document.getElementById(`progress-fill-${jobId}`);
        const progressText = document.getElementById(`progress-text-${jobId}`);
        
        // 即座に0%表示にして赤色に変更
        if (progressFill) {
            progressFill.classList.add('cancelled');
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '0%';
        }
        
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.textContent = '中断中...';
        }
        
        if (progressStatus) {
            progressStatus.textContent = '🛑 中断処理中...';
        }

        // 中断API呼び出し
        const response = await fetch(`/api/videos/transcode/cancel/${jobId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Transcode cancelled successfully');
            
            // ステータス更新（0%で停止を明記）
            if (progressStatus) {
                progressStatus.textContent = '⏹️ 中断されました';
            }
            
            // 閉じるボタンを有効化
            const closeBtn = document.getElementById(`progress-close-btn-${jobId}`);
            if (closeBtn) {
                closeBtn.disabled = false;
            }
            
            // キャンセルボタンを非表示
            if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }
            
            // ビデオリストを再読み込み（TSサムネイルを復元）
            setTimeout(() => {
                VideoApp.fetchThumbnails();
            }, 1000);
            
        } else {
            throw new Error(result.message || 'Failed to cancel transcode');
        }

    } catch (error) {
        console.error('Cancel transcode error:', error);
        
        // エラー時の処理
        const progressStatus = document.getElementById(`progress-status-${jobId}`);
        const cancelBtn = document.getElementById(`progress-cancel-btn-${jobId}`);
        
        if (progressStatus) {
            progressStatus.textContent = '❌ 中断に失敗しました';
        }
        
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.textContent = '中断';
        }
        
        alert(`中断エラー: ${error.message}`);
    }
};

window.startTranscode = async (videoId) => {
    try {
        console.log(`🔄 Starting transcode for video: ${videoId}`);
        
        // ダイアログを閉じる
        closeTranscodeDialog();
        
        // トランスコード開始API呼び出し
        const response = await fetch('/api/videos/transcode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoId })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Transcode job started: ${result.jobId}`);
            // プログレス監視を開始
            VideoApp.monitorTranscodeProgress(result.jobId, videoId);
        } else {
            throw new Error(result.message || 'Failed to start transcode');
        }

    } catch (error) {
        console.error('Start transcode error:', error);
        alert(`トランスコード開始エラー: ${error.message}`);
    }
};

// 新しいプログレスバー機能
VideoApp.showProgressBar = function() {
    const progressContainer = document.getElementById('thumbnail-progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
};

VideoApp.hideProgressBar = function() {
    const progressContainer = document.getElementById('thumbnail-progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
};

VideoApp.updateProgressBar = function(percentage, text = '', details = '') {
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressText = document.getElementById('progress-text');
    const progressDetails = document.getElementById('progress-details');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
    
    if (progressText && text) {
        progressText.textContent = text;
    }
    
    if (progressDetails && details) {
        progressDetails.textContent = details;
    }
};

VideoApp.startThumbnailGenerationWithProgress = async function(videosWithoutThumbnails) {
    console.log(`🎬 Starting thumbnail generation for ${videosWithoutThumbnails.length} videos`);
    
    let completedCount = 0;
    const totalCount = videosWithoutThumbnails.length;
    
    try {
        // 一括生成APIを呼び出し
        const response = await fetch('/api/videos/thumbnails/batch-generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoIds: videosWithoutThumbnails.map(v => v.id)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // プログレス監視を開始
            this.monitorThumbnailProgress(totalCount);
        } else {
            throw new Error(result.message || 'サムネイル生成の開始に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ Error starting thumbnail generation:', error);
        this.hideProgressBar();
        alert(`サムネイル生成エラー: ${error.message}`);
    }
};

VideoApp.monitorThumbnailProgress = async function(totalCount) {
    let completedCount = 0;
    let lastUpdate = Date.now();
    
    const checkProgress = async () => {
        try {
            // サムネイル統計を取得
            const response = await fetch('/api/videos/thumbnails/stats');
            const stats = await response.json();
            
            if (stats.success) {
                const currentThumbnailCount = stats.data.totalThumbnails;
                const totalVideoCount = stats.data.totalVideos;
                const progress = Math.min((currentThumbnailCount / totalVideoCount) * 100, 100);
                
                this.updateProgressBar(
                    progress,
                    `サムネイルを生成中... (${currentThumbnailCount}/${totalVideoCount})`,
                    `処理速度: ${Math.round((currentThumbnailCount - completedCount) / ((Date.now() - lastUpdate) / 1000))}個/秒`
                );
                
                completedCount = currentThumbnailCount;
                lastUpdate = Date.now();
                
                // 完了チェック
                if (progress >= 100 || currentThumbnailCount >= totalVideoCount) {
                    this.updateProgressBar(100, 'サムネイル生成完了！', '');
                    setTimeout(() => {
                        this.hideProgressBar();
                        // 動画リストを再読み込み
                        this.fetchThumbnails();
                    }, 2000);
                    return;
                }
            }
            
            // 5秒後に再チェック
            setTimeout(checkProgress, 5000);
            
        } catch (error) {
            console.error('❌ Error checking thumbnail progress:', error);
            // エラーが発生してもプログレス監視を続行
            setTimeout(checkProgress, 5000);
        }
    };
    
    // 初回実行
    setTimeout(checkProgress, 2000);
};

// 初期化時にアコーディオンを折りたたんだ状態にする
document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('advanced-features-content');
    if (content && !content.classList.contains('collapsed')) {
        content.classList.add('collapsed');
    }
});

// Service Worker 登録 (PWA対応)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            console.log('📦 Registering Service Worker...');
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            
            console.log('✅ Service Worker registered successfully:', registration.scope);
            
            // アップデート検知
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Service Worker update found');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🆕 New content is available, please refresh.');
                        // 必要に応じてユーザーに更新を通知
                        if (confirm('新しいバージョンが利用可能です。ページを更新しますか？')) {
                            window.location.reload();
                        }
                    }
                });
            });
            
            // Service Worker メッセージリスナー
            navigator.serviceWorker.addEventListener('message', event => {
                console.log('📩 Message from Service Worker:', event.data);
            });
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    });
}

// オンライン/オフライン状態の監視
window.addEventListener('online', () => {
    console.log('🌐 Back online!');
    document.body.classList.remove('offline');
    
    // オンライン復帰時にデータを再取得
    if (typeof VideoApp !== 'undefined' && VideoApp.fetchThumbnails) {
        VideoApp.fetchThumbnails();
    }
});

window.addEventListener('offline', () => {
    console.log('📱 Gone offline!');
    document.body.classList.add('offline');
});

// タッチ操作の最適化
if ('ontouchstart' in window) {
    console.log('📱 Touch device detected, optimizing for touch');
    document.body.classList.add('touch-device');
    
    // iOS Safari のバウンス効果を無効化
    document.body.addEventListener('touchstart', {}, { passive: true });
    document.body.addEventListener('touchend', {}, { passive: true });
    document.body.addEventListener('touchmove', (e) => {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }, { passive: false });
}

// デバイス向き変更の検知
window.addEventListener('orientationchange', () => {
    console.log('📱 Orientation changed');
    setTimeout(() => {
        // レイアウトの再計算
        if (typeof VideoApp !== 'undefined' && VideoApp.applySortAndFilter) {
            VideoApp.applySortAndFilter();
        }
    }, 500);
});

// バックグラウンド同期サポート
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('🔄 Background Sync is supported');
}

// Web Share API サポート（モバイルでの共有機能）
if (navigator.share) {
    console.log('📤 Web Share API is supported');
    
    // 共有ボタンの機能を追加（必要に応じて）
    window.shareVideo = async (videoData) => {
        try {
            await navigator.share({
                title: videoData.title || 'Video',
                text: 'ビデオを共有します',
                url: window.location.origin + '/video/' + videoData.id
            });
            console.log('📤 Video shared successfully');
        } catch (error) {
            console.log('📤 Share cancelled or failed:', error);
        }
    };
}