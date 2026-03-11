/**
 * Fetches contestant profile images from survivor.fandom.com for seasons 45–49,
 * crops them around the face (top-center), and saves to assets/torcha-wiki-faces/.
 * Updates torcha-cards.json imageUrl for those seasons so cards use the same
 * rectangular photo area as seasons 1–44.
 *
 * Prerequisites: npm install
 * Usage: node scripts/fetch-fandom-images-45-49.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SHARP = require('sharp');

const WIKI_API = 'https://survivor.fandom.com/api.php?action=query&titles=';
const CARDS_PATH = path.join(__dirname, '..', 'torcha-cards.json');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'torcha-wiki-faces');
const SEASONS = [45, 46, 47, 48, 49];

/** Card id -> Fandom wiki slug when it differs from id-based slug */
const WIKI_SLUG_OVERRIDES = new Map([
  ['dianelys-dee-valladares:s45', 'Dee_Valladares'],
  ['jake-okane:s45', "Jake_O'Kane"],
  ['kendra-mcquarrie:s45', 'Kendra_McQuarrie'],
  ['nicholas-sifu-alsup:s45', 'Sifu_Alsup'],
  ['janani-j-maya-krishnan-jha:s45', 'J._Maya'],
  ['brandon-brando-meyer:s45', 'Brando_Meyer'],
  ['brandon-donlon:s45', 'Brandon_Donlon'],
  ['quintavius-q-burdette:s46', 'Q_Burdette'],
  ['hunter-mcknight:s46', 'Hunter_McKnight'],
  ['sodasia-soda-thompson:s46', 'Soda_Thompson'],
  ['jemila-jem-hussain-adams:s46', 'Jem_Hussain-Adams'],
  ['jessica-jess-chong:s46', 'Jess_Chong'],
  ['tiffany-nicole-ervin:s46', 'Tiffany_Nicole_Ervin'],
  ['randen-montalv:s46', 'Randen_Montalvo'],
  ['rachel-lamont:s47', 'Rachel_LaMont'],
  ['teeny-chirichill:s47', 'Teeny_Chirichillo'],
  ['solomon-sol-yi:s47', 'Sol_Yi'],
  ['jerome-rome-cooney:s47', 'Rome_Cooney'],
  ['terran-tk-foster:s47', 'TK_Foster'],
  ['cedrek-mcfadden:s48', 'Cedrek_McFadden'],
  ['saiounia-sai-hughley:s48', 'Saiounia_Hughley'],
  ['sage-ahrens-nichols:s49', 'Sage_Ahrens-Nichols'],
  ['michelle-mc-chukwujekwu:s49', 'MC_Chukwujekwu'],
  ['kimberly-annie-davis:s49', 'Annie_Davis'],
  ['nicole-mazull:s49', 'Nicole_Mazullo'],
]);

function slugFromCard(card) {
  const override = WIKI_SLUG_OVERRIDES.get(card.id);
  if (override) return override;
  const part = (card.id || '').split(':')[0] || '';
  return part
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + (s.slice(1) || ''))
    .join('_');
}

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: REQUEST_HEADERS }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return get(loc.startsWith('http') ? loc : new URL(loc, url).href).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(url + ' → ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/** Get main page image URL from Fandom MediaWiki API (avoids 403 from HTML fetch). */
async function getImageUrlFromApi(wikiSlug) {
  const title = encodeURIComponent(wikiSlug.replace(/\s/g, '_'));
  const url = WIKI_API + title + '&prop=pageimages&pithumbsize=800&format=json';
  const body = await get(url);
  const data = JSON.parse(body.toString('utf8'));
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  const thumb = page?.thumbnail?.source;
  if (!thumb) return null;
  let src = thumb.startsWith('//') ? 'https:' + thumb : thumb;
  if (src.includes('/scale-to-width-down/')) {
    src = src.replace(/\/scale-to-width-down\/\d+/, '/scale-to-width-down/800');
  }
  return src;
}

/** Crop to face region (top-center) and save as JPEG; size suitable for card */
async function cropFaceAndSave(inputBuffer, outPath) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const meta = await SHARP(inputBuffer).metadata();
  const w = meta.width || 400;
  const h = meta.height || 600;
  // Crop: top 50% of image (face usually in upper half), full width
  const cropTop = Math.floor(h * 0.08);
  const cropHeight = Math.min(Math.floor(h * 0.55), h - cropTop);
  await SHARP(inputBuffer)
    .extract({ left: 0, top: cropTop, width: w, height: cropHeight })
    .resize(400, 500, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .toFile(outPath);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const missingOnly = args.includes('--missing-only');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (!fs.existsSync(CARDS_PATH)) {
    console.error('Cards file not found:', CARDS_PATH);
    process.exit(1);
  }
  const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  let targetCards = cards.filter((c) => c.season != null && SEASONS.includes(Number(c.season)));
  if (missingOnly) {
    targetCards = targetCards.filter((c) => !(c.imageUrl || '').includes('torcha-wiki-faces'));
  }
  const toProcess = limit ? targetCards.slice(0, limit) : targetCards;

  console.log('Seasons 45–49: ' + targetCards.length + ' cards. Processing ' + toProcess.length + (limit ? ' (limit)' : '') + (dryRun ? ' [dry-run]' : '') + '\n');

  let updated = 0;
  let failed = 0;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < toProcess.length; i++) {
    const card = toProcess[i];
    const season = card.season;
    const slug = slugFromCard(card);
    const safeSlug = slug.replace(/[^a-z0-9_.-]/gi, '_');
    const relPath = `${season}/${safeSlug}.jpg`;
    const outPath = path.join(OUT_DIR, relPath);
    const imageUrl = 'assets/torcha-wiki-faces/' + relPath;

    try {
      const imgUrl = await getImageUrlFromApi(slug);
      await delay(350);
      if (!imgUrl) {
        console.warn('  [skip] No image: ' + card.name + ' (s' + season + ') → ' + slug);
        failed++;
        continue;
      }
      const buf = await get(imgUrl);
      await delay(300);
      if (!dryRun) {
        await cropFaceAndSave(buf, outPath);
        card.imageUrl = imageUrl;
        updated++;
      }
      console.log((dryRun ? '[dry-run] ' : '') + 'OK ' + card.name + ' (s' + season + ') → ' + relPath);
    } catch (err) {
      console.warn('  FAIL ' + card.name + ' (s' + season + ') ' + slug + ': ' + err.message);
      failed++;
    }
  }

  console.log('\nDone. Updated: ' + updated + ', Failed: ' + failed);
  if (!dryRun && updated > 0) {
    fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2), 'utf8');
    console.log('Written: ' + CARDS_PATH);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
