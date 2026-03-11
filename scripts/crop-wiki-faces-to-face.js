/**
 * Re-crops all images in assets/torcha-wiki-faces/ using face detection,
 * so the face is centered in the frame (like s1–s44 castaway images).
 * Uses face-api.js (SSD Mobilenetv1) + sharp.
 *
 * Prerequisites:
 *   npm install
 *   node scripts/ensure-face-weights.js   (once)
 * Usage: node scripts/crop-wiki-faces-to-face.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');

const SHARP = require('sharp');
const WEIGHTS_DIR = path.join(__dirname, 'weights');
const FACES_DIR = path.join(__dirname, '..', 'assets', 'torcha-wiki-faces');

/** Square output, 15% tighter around the face */
const OUT_SIZE = 400;
const OUT_W = OUT_SIZE;
const OUT_H = OUT_SIZE;
/** Scale crop region around detected face; 0.85 = 15% tighter on the face */
const FACE_PADDING = 2.2 * 0.85;
/** If no face found, fallback: center crop from top (like original logic) */
const FALLBACK_TOP_RATIO = 0.08;
const FALLBACK_HEIGHT_RATIO = 0.55;

function getAllJpegs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) getAllJpegs(full, acc);
    else if (e.name.toLowerCase().endsWith('.jpg')) acc.push(full);
  }
  return acc;
}

/**
 * Compute crop region: square centered on face, 15% tighter (FACE_PADDING * 0.85).
 * Returns { left, top, width, height } in image coords, clamped to img dimensions.
 */
function getCropFromFace(faceBox, imgWidth, imgHeight) {
  const x = faceBox.x;
  const y = faceBox.y;
  const w = faceBox.width;
  const h = faceBox.height;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pad = Math.max(w, h) * FACE_PADDING;
  const cropW = pad;
  const cropH = pad;
  let left = Math.round(cx - cropW / 2);
  let top = Math.round(cy - cropH / 2);
  left = Math.max(0, Math.min(left, imgWidth - cropW));
  top = Math.max(0, Math.min(top, imgHeight - cropH));
  const width = Math.round(Math.min(cropW, imgWidth - left));
  const height = Math.round(Math.min(cropH, imgHeight - top));
  return { left, top, width, height };
}

function getFallbackCrop(imgWidth, imgHeight) {
  const side = Math.min(imgWidth, imgHeight);
  const top = Math.floor(imgHeight * FALLBACK_TOP_RATIO);
  const left = Math.max(0, Math.floor((imgWidth - side) / 2));
  const height = Math.min(side, imgHeight - top);
  const width = Math.min(side, imgWidth - left);
  return { left, top, width, height };
}

async function cropWithSharp(inputPath, outputPath, crop, imgWidth, imgHeight) {
  const sameFile = path.resolve(inputPath) === path.resolve(outputPath);
  const dest = sameFile ? inputPath + '.tmp-crop.jpg' : outputPath;
  await SHARP(inputPath)
    .extract({
      left: Math.max(0, crop.left),
      top: Math.max(0, crop.top),
      width: Math.min(crop.width, imgWidth - crop.left),
      height: Math.min(crop.height, imgHeight - crop.top),
    })
    .resize(OUT_W, OUT_H, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toFile(dest);
  if (sameFile) {
    fs.renameSync(dest, inputPath);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (!fs.existsSync(WEIGHTS_DIR) || !fs.existsSync(path.join(WEIGHTS_DIR, 'ssd_mobilenetv1_model-weights_manifest.json'))) {
    console.error('Weights not found. Run: node scripts/ensure-face-weights.js');
    process.exit(1);
  }

  const faceapi = require('face-api.js');
  const canvas = require('canvas');
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_DIR);
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });

  const files = getAllJpegs(FACES_DIR);
  const toProcess = limit ? files.slice(0, limit) : files;
  console.log('Face-cropping ' + toProcess.length + ' images in ' + FACES_DIR + (dryRun ? ' [dry-run]' : '') + '\n');

  let ok = 0;
  let fallback = 0;
  let fail = 0;

  for (const imgPath of toProcess) {
    const rel = path.relative(path.join(__dirname, '..'), imgPath);
    try {
      const meta = await SHARP(imgPath).metadata();
      const imgW = meta.width || 400;
      const imgH = meta.height || 600;

      const img = await canvas.loadImage(imgPath);
      const detections = await faceapi.detectAllFaces(img, options);

      let crop;
      if (detections.length > 0) {
        const getBox = (d) => (d && (d.detection && d.detection.box)) ? d.detection.box : (d && d.box) ? d.box : null;
        const withBox = detections.map((d) => ({ d, box: getBox(d) })).filter((x) => x.box);
        if (withBox.length === 0) {
          crop = getFallbackCrop(imgW, imgH);
          fallback++;
        } else {
          const bySize = withBox.slice().sort((a, b) => (b.box.width * b.box.height) - (a.box.width * a.box.height));
          const box = bySize[0].box;
          crop = getCropFromFace({ x: box.x, y: box.y, width: box.width, height: box.height }, imgW, imgH);
          ok++;
        }
      } else {
        crop = getFallbackCrop(imgW, imgH);
        fallback++;
      }

      if (!dryRun) await cropWithSharp(imgPath, imgPath, crop, imgW, imgH);
      console.log((dryRun ? '[dry-run] ' : '') + (detections.length > 0 ? 'face ' : 'fallback ') + rel);
    } catch (err) {
      console.warn('FAIL ' + rel + ': ' + err.message);
      fail++;
    }
  }

  console.log('\nDone. Face: ' + ok + ', Fallback: ' + fallback + ', Fail: ' + fail);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
