const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDirectory = path.join(projectRoot, 'public');

const possibleWorkerFiles = [
  path.join(
    projectRoot,
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.min.js'
  ),
  path.join(
    projectRoot,
    'node_modules',
    'pdfjs-dist',
    'build',
    'pdf.worker.min.js'
  )
];

const sourceWorker = possibleWorkerFiles.find(filePath =>
  fs.existsSync(filePath)
);

if (!sourceWorker) {
  console.error('PDF.js worker was not found.');

  possibleWorkerFiles.forEach(filePath => {
    console.error(`Checked: ${filePath}`);
  });

  process.exit(1);
}

fs.mkdirSync(publicDirectory, {
  recursive: true
});

const targetWorker = path.join(
  publicDirectory,
  'pdf.worker.min.js'
);

fs.copyFileSync(
  sourceWorker,
  targetWorker
);

const targetInfo = fs.statSync(targetWorker);

if (!targetInfo.isFile() || targetInfo.size === 0) {
  console.error('The copied PDF.js worker is empty.');
  process.exit(1);
}

console.log('PDF.js worker copied successfully.');
console.log(`Source: ${sourceWorker}`);
console.log(`Target: ${targetWorker}`);
console.log(`Size: ${targetInfo.size} bytes`);
