const fs = require('fs');
const path = require('path');

const directories = [
  'storage',
  'storage/videos',
  'storage/thumbnails',
  'dist'
];

console.log('Initializing project directories...');

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory exists: ${dir}`);
  }
});

console.log('Project initialization complete!');