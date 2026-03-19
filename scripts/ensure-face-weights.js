/**
 * Downloads face-api.js SSD Mobilenetv1 weights to scripts/weights/ if missing.
 * Required once before running crop-wiki-faces-to-face.js.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const WEIGHTS_DIR = path.join(__dirname, 'weights');
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(url + ' → ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(WEIGHTS_DIR)) fs.mkdirSync(WEIGHTS_DIR, { recursive: true });
  for (const file of FILES) {
    const outPath = path.join(WEIGHTS_DIR, file);
    if (fs.existsSync(outPath)) {
      console.log('OK (cached) ' + file);
      continue;
    }
    console.log('Downloading ' + file + '...');
    const buf = await get(BASE + '/' + file);
    fs.writeFileSync(outPath, buf);
    console.log('Saved ' + file);
  }
  console.log('Weights ready in ' + WEIGHTS_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
