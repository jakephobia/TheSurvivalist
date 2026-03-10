/**
 * Fills missing imageUrl on torcha cards by matching to castaway data.
 * Uses survivoR castaways (same image CDN as survivorstatsdb.com).
 * Matching: full normalized name + season, then surname + season, then first name + season.
 *
 * Usage:
 *   node scripts/fill-image-urls.js [options]
 * Options:
 *   --data-dir <path>   Use local castaways.json (default: fetch from survivoR GitHub)
 *   --cards <path>      Path to cards JSON (default: ../torcha-cards.json)
 *   --out <path>        Write updated cards here (default: overwrite --cards)
 *   --dry-run           Print stats and unmatched only, do not write
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGE_BASE = 'https://gradientdescending.com/survivor/castaways/colour';
const SURVIVOR_RAW = 'https://raw.githubusercontent.com/doehm/survivoR/master/dev/json';

function buildImageUrl(season, castawayId) {
  if (!castawayId) return null;
  const seasonStr = String(Number(season)).padStart(2, '0');
  return `${IMAGE_BASE}/US${seasonStr}${castawayId}.png`;
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(url + ' → ' + res.statusCode));
        return;
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/** Lowercase, collapse spaces, remove quotes, trim */
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .trim();
}

/** Remove nickname in quotes so "Bill \"B.B.\" Andersen" -> "Bill Andersen" */
function stripNickname(name) {
  return (name || '').replace(/\s*"[^"]*"\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Full name for matching: strip nickname then normalize */
function normalizedCardName(name) {
  return normalizeName(stripNickname(name));
}

function loadJson(from) {
  if (from.startsWith('http')) {
    return get(from).then((data) => JSON.parse(data));
  }
  const data = fs.readFileSync(from, 'utf8');
  return Promise.resolve(JSON.parse(data));
}

/** Manual overrides: card id -> survivoR full_name when card name differs (typo/alias) */
const NAME_OVERRIDES = new Map([
  ['yesenia-jessie-camach:s03', 'Jessie Camacho'],
  ['zachary-zach-wurtenberger:s42', 'Zach Wurthenberger'],
  ['yamil-yam-yam-aroch:s44', 'Yam Yam Arocho'],
  ['janani-j-maya-krishnan-jha:s45', 'J. Maya'],
]);

/**
 * Build lookups from survivoR castaways (one row per castaway per season).
 * - byFull: normalizedFullName|season -> { castaway_id, full_name }
 * - bySurname: normalizedSurname|season -> [{ castaway_id, full_name }, ...]
 * - byFirstname: normalizedFirstname|season -> [{ castaway_id, full_name }, ...]
 */
function buildLookups(castaways) {
  const us = castaways.filter((c) => c.version === 'US');
  const byFull = new Map();
  const bySurname = new Map();
  const byFirstname = new Map();

  for (const c of us) {
    const season = c.season != null ? Number(c.season) : null;
    if (season == null) continue;
    const fullName = c.full_name || '';
    const cleanFull = normalizeName(stripNickname(fullName));
    const parts = fullName.replace(/\s*"[^"]*"\s*/g, ' ').trim().split(/\s+/).filter(Boolean);
    const first = parts.length ? normalizeName(parts[0]) : '';
    const last = parts.length > 1 ? normalizeName(parts[parts.length - 1]) : '';

    const keyFull = cleanFull + '|' + season;
    if (!byFull.has(keyFull)) {
      byFull.set(keyFull, { castaway_id: c.castaway_id, full_name: fullName });
    }

    if (last) {
      const keyLast = last + '|' + season;
      if (!bySurname.has(keyLast)) bySurname.set(keyLast, []);
      bySurname.get(keyLast).push({ castaway_id: c.castaway_id, full_name: fullName });
    }
    if (first) {
      const keyFirst = first + '|' + season;
      if (!byFirstname.has(keyFirst)) byFirstname.set(keyFirst, []);
      byFirstname.get(keyFirst).push({ castaway_id: c.castaway_id, full_name: fullName });
    }
  }

  return { byFull, bySurname, byFirstname };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dataDir: null, cards: null, out: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && args[i + 1]) {
      opts.dataDir = args[++i];
    } else if (args[i] === '--cards' && args[i + 1]) {
      opts.cards = args[++i];
    } else if (args[i] === '--out' && args[i + 1]) {
      opts.out = args[++i];
    } else if (args[i] === '--dry-run') {
      opts.dryRun = true;
    }
  }
  const root = path.join(__dirname, '..');
  if (!opts.cards) opts.cards = path.join(root, 'torcha-cards.json');
  if (!opts.out) opts.out = opts.cards;
  return opts;
}

async function main() {
  const opts = parseArgs();

  let castaways;
  if (opts.dataDir) {
    castaways = await loadJson(path.join(opts.dataDir, 'castaways.json'));
  } else {
    process.stderr.write('Downloading castaways.json...\n');
    castaways = await loadJson(SURVIVOR_RAW + '/castaways.json');
  }

  const { byFull, bySurname, byFirstname } = buildLookups(castaways);

  if (!fs.existsSync(opts.cards)) {
    process.stderr.write('Cards file not found: ' + opts.cards + '\n');
    process.exit(1);
  }
  const cards = JSON.parse(fs.readFileSync(opts.cards, 'utf8'));
  if (!Array.isArray(cards)) {
    process.stderr.write('Cards file must be a JSON array.\n');
    process.exit(1);
  }

  let filled = 0;
  const unmatched = [];

  for (const card of cards) {
    if (card.imageUrl) continue;
    const season = card.season != null ? Number(card.season) : null;
    if (season == null) {
      unmatched.push({ id: card.id, name: card.name, reason: 'no season' });
      continue;
    }

    const name = card.name || '';
    let norm = normalizedCardName(name);
    const override = NAME_OVERRIDES.get(card.id);
    if (override) norm = normalizeName(override);
    const keyFull = norm + '|' + season;

    let entry = byFull.get(keyFull);
    if (!entry && name) {
      const parts = stripNickname(name).split(/\s+/).filter(Boolean);
      const last = parts.length > 1 ? normalizeName(parts[parts.length - 1]) : '';
      const first = parts.length ? normalizeName(parts[0]) : '';
      if (last) {
        const list = bySurname.get(last + '|' + season);
        if (list && list.length === 1) entry = list[0];
      }
      if (!entry && first) {
        const list = byFirstname.get(first + '|' + season);
        if (list && list.length === 1) entry = list[0];
      }
    }

    if (entry) {
      const url = buildImageUrl(season, entry.castaway_id);
      if (url) {
        card.imageUrl = url;
        filled++;
      } else {
        unmatched.push({ id: card.id, name: card.name, season, reason: 'no castaway_id' });
      }
    } else {
      unmatched.push({ id: card.id, name: card.name, season, reason: 'no match' });
    }
  }

  process.stderr.write('Filled imageUrl for ' + filled + ' cards.\n');
  if (unmatched.length) {
    process.stderr.write('Unmatched: ' + unmatched.length + '\n');
    for (const u of unmatched) {
      process.stderr.write('  ' + (u.id || u.name) + ' (s' + u.season + ') ' + (u.reason || '') + '\n');
    }
  }

  if (!opts.dryRun && filled > 0) {
    fs.writeFileSync(opts.out, JSON.stringify(cards, null, 2), 'utf8');
    process.stderr.write('Wrote ' + opts.out + '\n');
  }
}

main().catch((err) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
