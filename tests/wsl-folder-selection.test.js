/**
 * WSL対応フォルダ選択機能のテスト
 * 手動パス入力時の検証スキップをテスト
 */

// テスト用の簡易VideoAppクラス
class WSLTestVideoApp {
    constructor() {
        this.selectedFolderPath = null;
        this.testPlatform = 'linux';
        this.testManualInput = '';
    }
    
    // プラットフォーム検出
    detectPlatform() {
        return this.testPlatform || 'linux';
    }
    
    // WSL環境かどうかを判定
    isWSLEnvironment() {
        return this.detectPlatform() === 'linux';
    }
    
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
    }
    
    // 現在のユーザー名を取得
    getCurrentUser() {
        return 'testuser';
    }
    
    // プラットフォーム固有の候補生成（WSL対応版）
    generatePlatformSpecificCandidates(folderName, currentUser, platform) {
        const candidates = [];
        
        switch (platform) {
            case 'linux':
                // 基本的なLinux候補
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
                
            case 'windows':
                candidates.push(
                    { name: 'デスクトップ', path: `C:\\Users\\${currentUser}\\Desktop\\${folderName}` },
                    { name: 'ダウンロード', path: `C:\\Users\\${currentUser}\\Downloads\\${folderName}` }
                );
                break;
        }
        
        return candidates;
    }
    
    // 手動パス入力を処理（WSL対応版 - 検証スキップ）
    handleManualPathInput(inputPath) {
        this.testManualInput = inputPath;
        
        if (inputPath === '') {
            this.selectedFolderPath = null;
            return { success: false, message: 'パスが空です' };
        }
        
        // WSL環境でのパスアクセス権限制約を考慮し、手動入力時は検証をスキップ
        this.selectedFolderPath = inputPath;
        return { success: true, message: 'パスが入力されました (検証スキップ)' };
    }
    
    // 従来のパス検証（参考用）
    validateFolderPath(path) {
        if (!path) return false;
        
        const platform = this.detectPlatform();
        
        switch (platform) {
            case 'windows':
                return /^[A-Za-z]:\\/.test(path) || /^\\\\/.test(path);
            case 'linux':
            case 'macos':
            default:
                return /^\//.test(path);
        }
    }
}

// WSL対応テスト実行
function runWSLFolderSelectionTests() {
    console.log('🧪 WSL対応フォルダ選択機能テストを開始...\n');
    
    const testApp = new WSLTestVideoApp();
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
    
    // WSL環境検出テスト
    test('WSL環境検出', () => {
        testApp.testPlatform = 'linux';
        assert(testApp.isWSLEnvironment() === true, 'Linux platform should be detected as WSL environment');
        assert(testApp.getPlatformDisplayName('linux') === 'Linux (WSL)', 'Should show WSL in platform name');
    });
    
    // WSL用パス候補生成テスト
    test('WSL用パス候補生成', () => {
        testApp.testPlatform = 'linux';
        const candidates = testApp.generatePlatformSpecificCandidates('TestFolder', 'testuser', 'linux');
        
        // 基本のLinux候補（5個）+ WSL Windows候補（5個）= 10個
        assert(candidates.length === 10, `Should generate 10 candidates for WSL (got ${candidates.length})`);
        
        // Linux候補の確認
        assert(candidates[0].name === 'デスクトップ', 'First candidate should be Linux Desktop');
        assert(candidates[0].path === '/home/testuser/Desktop/TestFolder', 'Linux Desktop path should be correct');
        
        // WSL Windows候補の確認
        const wslCandidate = candidates.find(c => c.name === 'Windows デスクトップ');
        assert(wslCandidate !== undefined, 'Should include Windows Desktop candidate');
        assert(wslCandidate.path === '/mnt/c/Users/testuser/Desktop/TestFolder', 'WSL Windows path should be correct');
        
        const dDriveCandidate = candidates.find(c => c.name === 'D ドライブ');
        assert(dDriveCandidate !== undefined, 'Should include D drive candidate');
        assert(dDriveCandidate.path === '/mnt/d/TestFolder', 'D drive path should be correct');
    });
    
    // 手動入力処理テスト（検証スキップ）
    test('手動パス入力 - 有効なLinuxパス', () => {
        const result = testApp.handleManualPathInput('/home/testuser/Videos');
        assert(result.success === true, 'Valid Linux path should be accepted');
        assert(testApp.selectedFolderPath === '/home/testuser/Videos', 'Selected path should be set correctly');
        assert(result.message.includes('検証スキップ'), 'Message should indicate validation was skipped');
    });
    
    test('手動パス入力 - WSL Windowsパス', () => {
        const result = testApp.handleManualPathInput('/mnt/c/Users/testuser/Videos');
        assert(result.success === true, 'WSL Windows path should be accepted');
        assert(testApp.selectedFolderPath === '/mnt/c/Users/testuser/Videos', 'WSL path should be set correctly');
    });
    
    test('手動パス入力 - 通常なら無効なパス', () => {
        // 通常の検証なら失敗するパスでも、WSL対応版では受け入れる
        const result = testApp.handleManualPathInput('C:\\InvalidWindowsPath\\OnLinux');
        assert(result.success === true, 'Even invalid format should be accepted in WSL mode');
        assert(testApp.selectedFolderPath === 'C:\\InvalidWindowsPath\\OnLinux', 'Invalid path should still be set');
    });
    
    test('手動パス入力 - 相対パス', () => {
        const result = testApp.handleManualPathInput('./relative/path');
        assert(result.success === true, 'Relative path should be accepted in WSL mode');
        assert(testApp.selectedFolderPath === './relative/path', 'Relative path should be set');
    });
    
    test('手動パス入力 - 空のパス', () => {
        const result = testApp.handleManualPathInput('');
        assert(result.success === false, 'Empty path should be rejected');
        assert(testApp.selectedFolderPath === null, 'Selected path should be null for empty input');
    });
    
    test('手動パス入力 - スペースのみのパス', () => {
        const result = testApp.handleManualPathInput('   ');
        assert(result.success === false, 'Whitespace-only path should be rejected');
        assert(testApp.selectedFolderPath === null, 'Selected path should be null for whitespace');
    });
    
    // 従来の検証機能が依然として動作することを確認
    test('従来のパス検証は依然として動作', () => {
        testApp.testPlatform = 'linux';
        assert(testApp.validateFolderPath('/valid/linux/path') === true, 'Traditional validation should still work for valid paths');
        assert(testApp.validateFolderPath('invalid-relative-path') === false, 'Traditional validation should still reject invalid paths');
        
        testApp.testPlatform = 'windows';
        assert(testApp.validateFolderPath('C:\\Valid\\Windows\\Path') === true, 'Windows validation should work');
        assert(testApp.validateFolderPath('/unix/path/on/windows') === false, 'Unix path on Windows should fail validation');
    });
    
    // テスト結果を表示
    console.log(`\\n📊 WSLテスト結果: ${passedTests}/${testCount} パス`);
    
    if (passedTests === testCount) {
        console.log('🎉 すべてのWSL対応テストがパスしました！');
        console.log('✅ 手動パス入力時の検証スキップが正常に動作しています');
    } else {
        console.log(`❌ ${testCount - passedTests} 個のテストが失敗しました`);
    }
    
    return { total: testCount, passed: passedTests, failed: testCount - passedTests };
}

// Node.js環境で実行する場合
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runWSLFolderSelectionTests, WSLTestVideoApp };
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
    window.runWSLFolderSelectionTests = runWSLFolderSelectionTests;
}

// 直接実行する場合
if (typeof require !== 'undefined' && require.main === module) {
    runWSLFolderSelectionTests();
}
