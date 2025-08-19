/**
 * フォルダ選択機能のユニットテスト
 * Windows/macOS/Linux での統一フォルダ選択機能をテスト
 */

// テスト用のモックDOM環境を設定
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.eventListener    // WSL環境かどうかを判定
    isWSLEnvironment() {
        return this.testPlatform === 'linux'; // テスト用は単純化
    },

    // モーダル状態をリセット
    resetModalState() {
        global.mockDOM.getElementById('dialog-status').textContent = '';
        global.mockDOM.getElementById('manual-status').textContent = '';
        global.mockDOM.getElementById('manual-path-input').value = '';
        global.mockDOM.getElementById('path-suggestions').classList.remove('show');
        global.mockDOM.getElementById('confirm-selection-btn').disabled = true;
        
        this.selectedFolderPath = null;
    },);
    }
    
    getElementById(id) {
        if (!this.elements.has(id)) {
            const element = {
                id: id,
                textContent: '',
                innerHTML: '',
                value: '',
                disabled: false,
                style: { display: 'block' },
                className: '',
                dataset: {},
                classList: {
                    add: function(className) {
                        const classes = (this.className || '').split(' ').filter(c => c);
                        if (!classes.includes(className)) {
                            classes.push(className);
                        }
                        this.className = classes.join(' ');
                    },
                    remove: function(className) {
                        const classes = (this.className || '').split(' ').filter(c => c && c !== className);
                        this.className = classes.join(' ');
                    },
                    contains: function(className) {
                        return (this.className || '').split(' ').includes(className);
                    }
                },
                addEventListener: (event, handler) => {
                    const key = `${id}:${event}`;
                    this.eventListeners.set(key, handler);
                },
                removeEventListener: (event) => {
                    const key = `${id}:${event}`;
                    this.eventListeners.delete(key);
                },
                replaceWith: (newElement) => {
                    this.elements.set(id, newElement);
                    return newElement;
                },
                cloneNode: () => {
                    return { ...element };
                },
                appendChild: () => {},
                removeChild: () => {},
                click: () => {}
            };
            this.elements.set(id, element);
        }
        return this.elements.get(id);
    }
    
    createElement(tagName) {
        return {
            tagName: tagName.toUpperCase(),
            innerHTML: '',
            textContent: '',
            className: '',
            style: { display: 'none' },
            addEventListener: () => {},
            click: () => {}
        };
    }
}

// テスト用のVideoAppクラス
class TestVideoApp {
    constructor() {
        this.selectedFolderPath = null;
        this.selectedDirectoryHandle = null;
        this.selectedFiles = null;
    }
    
    // プラットフォーム検出（テスト用）
    detectPlatform() {
        return this.testPlatform || 'linux';
    }
    
    // プラットフォーム表示名を取得
    getPlatformDisplayName(platform) {
        switch (platform) {
            case 'windows':
                return 'Windows';
            case 'macos':
                return 'macOS';
            case 'linux':
                return 'Linux';
            default:
                return '不明';
        }
    }
    
    // 現在のユーザー名を取得（テスト用）
    getCurrentUser() {
        return 'testuser';
    }
    
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
    }
    
    // デフォルトパス取得
    getDefaultPath(folderName, currentUser, platform) {
        const candidates = this.generatePlatformSpecificCandidates(folderName, currentUser, platform);
        return candidates.length > 0 ? candidates[0].path : '';
    }
    
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
    }
    
    // 手動パス入力を処理（WSL対応版）
    handleManualPathInput() {
        const inputPath = this.testManualInput || '';
        
        if (inputPath === '') {
            this.selectedFolderPath = null;
            return false;
        }
        
        // WSL環境でのパスアクセス権限制約を考慮し、手動入力時は検証をスキップ
        this.selectedFolderPath = inputPath;
        return true;
    },

    // WSL環境かどうかを判定
    isWSLEnvironment() {
        return this.testPlatform === 'linux'; // テスト用は単純化
    },
        global.mockDOM.getElementById('dialog-status').textContent = '';
        global.mockDOM.getElementById('manual-status').textContent = '';
        global.mockDOM.getElementById('manual-path-input').value = '';
        global.mockDOM.getElementById('path-suggestions').classList.remove('show');
        global.mockDOM.getElementById('confirm-selection-btn').disabled = true;
        
        this.selectedFolderPath = null;
    }
    
    // フォルダ選択モーダルを表示
    showFolderSelectionModal() {
        const modal = global.mockDOM.getElementById('folder-selection-modal');
        const platformDisplay = global.mockDOM.getElementById('platform-display');
        
        const platform = this.detectPlatform();
        const platformName = this.getPlatformDisplayName(platform);
        platformDisplay.textContent = `🖥️ 検出されたOS: ${platformName}`;
        
        this.resetModalState();
        modal.style.display = 'block';
        
        return true; // テスト用
    }
}

// テスト実行
function runFolderSelectionTests() {
    console.log('🧪 フォルダ選択機能テストを開始...\n');
    
    // モックDOM環境を設定
    global.mockDOM = new MockDOM();
    global.document = global.mockDOM;
    
    const testApp = new TestVideoApp();
    let testCount = 0;
    let passedTests = 0;
    
    // テストヘルパー関数
    function test(description, testFunction) {
        testCount++;
        try {
            testFunction();
            console.log(`✅ Test ${testCount}: ${description}`);
            passedTests++;
        } catch (error) {
            console.log(`❌ Test ${testCount}: ${description}`);
            console.log(`   Error: ${error.message}`);
        }
    }
    
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }
    
    // プラットフォーム検出テスト
    test('プラットフォーム検出 - Linux', () => {
        testApp.testPlatform = 'linux';
        assert(testApp.detectPlatform() === 'linux', 'Linux platform should be detected');
        assert(testApp.getPlatformDisplayName('linux') === 'Linux', 'Linux display name should be correct');
    });
    
    test('プラットフォーム検出 - Windows', () => {
        testApp.testPlatform = 'windows';
        assert(testApp.detectPlatform() === 'windows', 'Windows platform should be detected');
        assert(testApp.getPlatformDisplayName('windows') === 'Windows', 'Windows display name should be correct');
    });
    
    test('プラットフォーム検出 - macOS', () => {
        testApp.testPlatform = 'macos';
        assert(testApp.detectPlatform() === 'macos', 'macOS platform should be detected');
        assert(testApp.getPlatformDisplayName('macos') === 'macOS', 'macOS display name should be correct');
    });
    
    // パス候補生成テスト
    test('Linux用パス候補生成', () => {
        testApp.testPlatform = 'linux';
        const candidates = testApp.generatePlatformSpecificCandidates('TestFolder', 'testuser', 'linux');
        
        assert(candidates.length === 5, 'Should generate 5 candidates for Linux');
        assert(candidates[0].name === 'デスクトップ', 'First candidate should be Desktop');
        assert(candidates[0].path === '/home/testuser/Desktop/TestFolder', 'Desktop path should be correct');
        assert(candidates[1].name === 'ダウンロード', 'Second candidate should be Downloads');
        assert(candidates[1].path === '/home/testuser/Downloads/TestFolder', 'Downloads path should be correct');
    });
    
    test('Windows用パス候補生成', () => {
        testApp.testPlatform = 'windows';
        const candidates = testApp.generatePlatformSpecificCandidates('TestFolder', 'testuser', 'windows');
        
        assert(candidates.length === 5, 'Should generate 5 candidates for Windows');
        assert(candidates[0].name === 'デスクトップ', 'First candidate should be Desktop');
        assert(candidates[0].path === 'C:\\Users\\testuser\\Desktop\\TestFolder', 'Desktop path should be correct');
        assert(candidates[1].name === 'ダウンロード', 'Second candidate should be Downloads');
        assert(candidates[1].path === 'C:\\Users\\testuser\\Downloads\\TestFolder', 'Downloads path should be correct');
    });
    
    test('macOS用パス候補生成', () => {
        testApp.testPlatform = 'macos';
        const candidates = testApp.generatePlatformSpecificCandidates('TestFolder', 'testuser', 'macos');
        
        assert(candidates.length === 5, 'Should generate 5 candidates for macOS');
        assert(candidates[0].name === 'デスクトップ', 'First candidate should be Desktop');
        assert(candidates[0].path === '/Users/testuser/Desktop/TestFolder', 'Desktop path should be correct');
        assert(candidates[1].name === 'ダウンロード', 'Second candidate should be Downloads');
        assert(candidates[1].path === '/Users/testuser/Downloads/TestFolder', 'Downloads path should be correct');
    });
    
    // パス検証テスト
    test('Linuxパス検証', () => {
        testApp.testPlatform = 'linux';
        assert(testApp.validateFolderPath('/home/user/folder') === true, 'Valid Linux path should pass');
        assert(testApp.validateFolderPath('/opt/folder') === true, 'Valid root Linux path should pass');
        assert(testApp.validateFolderPath('relative/folder') === false, 'Relative path should fail');
        assert(testApp.validateFolderPath('C:\\\\Users\\\\user') === false, 'Windows path on Linux should fail');
    });
    
    test('Windowsパス検証', () => {
        testApp.testPlatform = 'windows';
        assert(testApp.validateFolderPath('C:\\Users\\user\\folder') === true, 'Valid Windows path should pass');
        assert(testApp.validateFolderPath('D:\\folder') === true, 'Valid drive Windows path should pass');
        assert(testApp.validateFolderPath('\\\\server\\share') === true, 'Valid UNC path should pass');
        assert(testApp.validateFolderPath('relative\\folder') === false, 'Relative Windows path should fail');
        assert(testApp.validateFolderPath('/home/user') === false, 'Unix path on Windows should fail');
    });
    
    test('macOSパス検証', () => {
        testApp.testPlatform = 'macos';
        assert(testApp.validateFolderPath('/Users/user/folder') === true, 'Valid macOS path should pass');
        assert(testApp.validateFolderPath('/Applications/folder') === true, 'Valid Applications path should pass');
        assert(testApp.validateFolderPath('relative/folder') === false, 'Relative path should fail');
        assert(testApp.validateFolderPath('C:\\\\Users\\\\user') === false, 'Windows path on macOS should fail');
    });
    
    // モーダル表示テスト
    test('フォルダ選択モーダル表示', () => {
        testApp.testPlatform = 'linux';
        const result = testApp.showFolderSelectionModal();
        
        assert(result === true, 'Modal should show successfully');
        
        const modal = global.mockDOM.getElementById('folder-selection-modal');
        assert(modal.style.display === 'block', 'Modal should be visible');
        
        const platformDisplay = global.mockDOM.getElementById('platform-display');
        assert(platformDisplay.textContent === '🖥️ 検出されたOS: Linux', 'Platform should be displayed correctly');
        
        const confirmBtn = global.mockDOM.getElementById('confirm-selection-btn');
        assert(confirmBtn.disabled === true, 'Confirm button should be disabled initially');
    });
    
    // デフォルトパス取得テスト
    test('デフォルトパス取得', () => {
        testApp.testPlatform = 'linux';
        const defaultPath = testApp.getDefaultPath('TestFolder', 'testuser', 'linux');
        assert(defaultPath === '/home/testuser/Desktop/TestFolder', 'Default path should be first candidate');
        
        testApp.testPlatform = 'windows';
        const windowsPath = testApp.getDefaultPath('TestFolder', 'testuser', 'windows');
        assert(windowsPath === 'C:\\Users\\testuser\\Desktop\\TestFolder', 'Windows default path should be correct');
    });
    
    // テスト結果を表示
    console.log(`\\n📊 テスト結果: ${passedTests}/${testCount} パス`);
    
    if (passedTests === testCount) {
        console.log('🎉 すべてのテストがパスしました！');
    } else {
        console.log(`❌ ${testCount - passedTests} 個のテストが失敗しました`);
    }
    
    return { total: testCount, passed: passedTests, failed: testCount - passedTests };
}

// Node.js環境で実行する場合
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runFolderSelectionTests, TestVideoApp, MockDOM };
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
    window.runFolderSelectionTests = runFolderSelectionTests;
}

// 直接実行する場合
if (typeof require !== 'undefined' && require.main === module) {
    runFolderSelectionTests();
}
