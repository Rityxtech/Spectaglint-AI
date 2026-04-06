const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Extension files to include
const extensionFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'offscreen.html',
  'offscreen.js'
];

console.log('Building Spectaglint AI Extension...');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Create ZIP archive
const output = fs.createWriteStream(path.join(outputDir, 'spectaglint-extension.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Best compression
});

output.on('close', () => {
  console.log(`Extension packaged successfully: ${archive.pointer()} bytes`);
  console.log('📦 spectaglint-extension.zip created in dist/');
  console.log('');
  console.log('Installation Instructions:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" (top right toggle)');
  console.log('3. Click "Load unpacked" button');
  console.log('4. Select the extracted spectaglint-extension folder');
  console.log('5. The extension should now be installed and active');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add each file to the archive
extensionFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
    console.log(`✓ Added ${file}`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

archive.finalize();