/**
 * Scarica tutte le immagini dei giocatori dagli URL esterni e le salva in
 * assets/torcha-cards-images/. Aggiorna torcha-cards.json con i path locali.
 *
 * Usage: node scripts/download-all-card-images.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CARDS_PATH = path.join(__dirname, '..', 'torcha-cards.json');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'torcha-cards-images');
const LOCAL_PREFIX = 'assets/torcha-cards-images';

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Surv2-Torcha/1' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return get(loc.startsWith('http') ? loc : new URL(loc, url).href).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extensionFromUrl(url) {
  const u = url.split('?')[0].toLowerCase();
  if (u.endsWith('.png')) return '.png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return '.jpg';
  return '.png';
}

function safeFilename(cardId) {
  return (cardId || '').replace(/:/g, '-');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (!fs.existsSync(CARDS_PATH)) {
    console.error('File non trovato:', CARDS_PATH);
    process.exit(1);
  }

  const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  const withExternal = cards.filter((c) => {
    const u = c.imageUrl || '';
    return u.startsWith('http://') || u.startsWith('https://');
  });
  const toProcess = limit ? withExternal.slice(0, limit) : withExternal;

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  console.log('Immagini da scaricare: ' + toProcess.length + (limit ? ' (limit)' : '') + (dryRun ? ' [dry-run]' : '') + '\n');

  let ok = 0;
  let fail = 0;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < toProcess.length; i++) {
    const card = toProcess[i];
    const url = card.imageUrl;
    const ext = extensionFromUrl(url);
    const filename = safeFilename(card.id) + ext;
    const filepath = path.join(IMAGES_DIR, filename);
    const localUrl = LOCAL_PREFIX + '/' + filename;

    try {
      if (!dryRun) {
        const buf = await get(url);
        fs.writeFileSync(filepath, buf);
      }
      card.imageUrl = localUrl;
      ok++;
      if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + toProcess.length);
    } catch (err) {
      console.warn('  FAIL ' + card.id + ': ' + err.message);
      fail++;
    }
    await delay(80);
  }

  console.log('\nScaricati: ' + ok + ', Falliti: ' + fail);
  if (!dryRun && ok > 0) {
    fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2), 'utf8');
    console.log('Scritto: ' + CARDS_PATH);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
