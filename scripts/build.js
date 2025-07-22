const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️ Building Video Streaming App...');

// 1. クリーンアップ
console.log('🧹 Cleaning up...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('client')) {
    fs.rmSync('client', { recursive: true, force: true });
  }
} catch (error) {
  console.warn('Warning during cleanup:', error.message);
}

// 2. TypeScriptビルド
console.log('🔧 Building TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript build completed');
} catch (error) {
  console.error('❌ TypeScript build failed:', error.message);
  process.exit(1);
}

// 3. クライアントファイルのコピー
console.log('📁 Copying client files...');

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Source directory does not exist: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// src/clientの内容をclientにコピー
const srcClientDir = path.join(__dirname, '../src/client');
const destClientDir = path.join(__dirname, '../client');

if (fs.existsSync(srcClientDir)) {
  copyDirectory(srcClientDir, destClientDir);
  console.log('✅ Client files copied successfully');
} else {
  console.warn('⚠️ src/client directory not found');
}

// 4. 必要なディレクトリを作成
console.log('📁 Creating storage directories...');
const storageDirs = [
  'dist/storage',
  'dist/storage/videos',
  'dist/storage/thumbnails'
];

storageDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${dir}`);
  }
});

console.log('🎉 Build completed successfully!');
console.log('');
console.log('📁 Directory structure:');
console.log('├── dist/          (TypeScript compiled)');
console.log('├── client/        (Client files)');
console.log('└── dist/storage/  (Video & thumbnail storage)');