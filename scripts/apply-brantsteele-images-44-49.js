/**
 * Sets imageUrl for seasons 44–49 to Brant Steele CDN (already face-cropped).
 * URL pattern: https://cdn.brantsteele.cloud/images/survivor/{season}/{slug}.png
 *
 * Usage: node scripts/apply-brantsteele-images-44-49.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const CARDS_PATH = path.join(__dirname, '..', 'torcha-cards.json');
const BRANT_BASE = 'https://cdn.brantsteele.cloud/images/survivor';
const SEASONS = [44, 45, 46, 47, 48, 49];

/** card id -> Brant Steele filename (no extension) when different from derived */
const SLUG_OVERRIDES = new Map([
  ['yamil-yam-yam-aroch:s44', 'yamyam'],
  ['janani-j-maya-krishnan-jha:s45', 'jmaya'],
  ['nicholas-sifu-alsup:s45', 'sifu'],
  ['brandon-brando-meyer:s45', 'brando'],
  ['brandon-donlon:s45', 'brandon'],
  ['quintavius-q-burdette:s46', 'q'],
  ['jemila-jem-hussain-adams:s46', 'jem'],
  ['jessica-jess-chong:s46', 'jess'],
  ['sodasia-soda-thompson:s46', 'soda'],
  ['solomon-sol-yi:s47', 'sol'],
  ['jerome-rome-cooney:s47', 'rome'],
  ['terran-tk-foster:s47', 'tk'],
  ['saiounia-sai-hughley:s48', 'sai'],
  ['michelle-mc-chukwujekwu:s49', 'mc'],
  ['kimberly-annie-davis:s49', 'annie'],
  ['rizo-velovic:s49', 'rizgod'],
  ['matthew-matt-blankinship:s44', 'matt'],
]);

/** From card name, get the display first name or nickname for Brant Steele filename */
function slugFromName(name, cardId) {
  const override = SLUG_OVERRIDES.get(cardId);
  if (override) return override;
  if (!name || typeof name !== 'string') return null;
  const quoted = name.match(/\s*"([^"]+)"\s*/);
  if (quoted) {
    const nick = quoted[1].toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
    return nick || null;
  }
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.toLowerCase().replace(/'/g, '');
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (!fs.existsSync(CARDS_PATH)) {
    console.error('Cards file not found:', CARDS_PATH);
    process.exit(1);
  }
  const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  const target = cards.filter((c) => c.season != null && SEASONS.includes(Number(c.season)));

  let updated = 0;
  for (const card of target) {
    const season = card.season;
    const slug = slugFromName(card.name, card.id);
    if (!slug) {
      console.warn('  [skip] No slug: ' + card.name + ' (s' + season + ')');
      continue;
    }
    const imageUrl = `${BRANT_BASE}/${season}/${slug}.png`;
    card.imageUrl = imageUrl;
    updated++;
    console.log('OK s' + season + ' ' + card.name + ' → ' + slug + '.png');
  }

  console.log('\nUpdated imageUrl for ' + updated + ' cards (seasons 44–49).');
  if (!dryRun && updated > 0) {
    fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2), 'utf8');
    console.log('Written: ' + CARDS_PATH);
  }
}

main();
