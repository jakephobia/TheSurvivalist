/**
 * Generates torcha card entries for Survivor seasons 9-49 from Wikipedia contestants list.
 * Usage: node scripts/generate-torcha-cards.js <path-to-wiki-markdown-file>
 * Output: JSON array printed to stdout (append to torcha-cards.json for S9-S49).
 */

const fs = require('fs');
const path = require('path');

const SEASON_NAME_TO_NUM = {
  'Survivor: Vanuatu': 9, 'Survivor: Palau': 10, 'Survivor: Guatemala': 11,
  'Survivor: Panama': 12, 'Survivor: Cook Islands': 13, 'Survivor: Fiji': 14,
  'Survivor: China': 15, 'Survivor: Micronesia': 16, 'Survivor: Gabon': 17,
  'Survivor: Tocantins': 18, 'Survivor: Samoa': 19, 'Survivor: Heroes vs. Villains': 20,
  'Survivor: Nicaragua': 21, 'Survivor: Redemption Island': 22, 'Survivor: South Pacific': 23,
  'Survivor: One World': 24, 'Survivor: Philippines': 25, 'Survivor: Caramoan': 26,
  'Survivor: Blood vs. Water': 27, 'Survivor: Cagayan': 28, 'Survivor: San Juan del Sur': 29,
  'Survivor: Worlds Apart': 30, 'Survivor: Cambodia': 31, 'Survivor: Kaôh Rōng': 32,
  'Survivor: Millennials vs. Gen X': 33, 'Survivor: Game Changers': 34,
  'Survivor: Heroes vs. Healers vs. Hustlers': 35, 'Survivor: Ghost Island': 36,
  'Survivor: David vs. Goliath': 37, 'Survivor: Edge of Extinction': 38,
  'Survivor: Island of the Idols': 39, 'Survivor: Winners at War': 40,
  'Survivor 41': 41, 'Survivor 42': 42, 'Survivor 43': 43, 'Survivor 44': 44,
  'Survivor 45': 45, 'Survivor 46': 46, 'Survivor 47': 47, 'Survivor 48': 48,
  'Survivor 49': 49,
};

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/["']/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function parseName(raw) {
  let s = raw.trim();
  s = s.replace(/\s*[\^◊o‡]\s*$/, ''); // returnee symbols
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // [text](url) -> text
  return s.trim();
}

function parseFinish(finishCol) {
  const f = (finishCol || '').trim();
  if (/^Winner$/i.test(f)) return 1;
  if (/^Runner-up$/i.test(f)) return 2;
  if (/^(2nd Runner-up|Co-runner up|Co-runner up)$/i.test(f)) return 3;
  const m = f.match(/^(\d+)(?:th|st|nd|rd)$/);
  return m ? parseInt(m[1], 10) : 20;
}

function parseSeason(col) {
  if (!col) return null;
  const m = col.match(/\[(Survivor[^\]]+)\]\([^)]+\)/);
  if (m) return SEASON_NAME_TO_NUM[m[1].trim()] || null;
  return null;
}

const STAT_MIN = 1;
const STAT_MAX = 200;

/** Deterministic hash of string to 32-bit int (for reproducible jitter). */
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function placementToRarity(placement) {
  if (placement === 1) return 'legend';
  if (placement === 2) return 'super_rare';
  if (placement === 3) return 'rare';
  return 'common';
}

/** Power and social are computed independently; both in [STAT_MIN, STAT_MAX] (1–200). */
function placementToPowerSocial(placement, total, name, season) {
  const pct = 1 - (placement - 1) / Math.max(total, 1);
  const base = STAT_MIN + pct * (STAT_MAX - STAT_MIN); // 1..200
  const seed = (name || '') + '|' + (season ?? '');
  const powerJitter = (simpleHash(seed) % 41) - 20;        // ±20
  const socialJitter = (simpleHash(seed + '|s') % 41) - 20; // independent jitter
  const power = Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(base + powerJitter)));
  const social = Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(base + socialJitter)));
  return { power, social };
}

function main() {
  const wikiPath = process.argv[2];
  if (!wikiPath || !fs.existsSync(wikiPath)) {
    console.error('Usage: node generate-torcha-cards.js <path-to-wiki-markdown-file>');
    process.exit(1);
  }
  const content = fs.readFileSync(wikiPath, 'utf8');
  const lines = content.split(/\r?\n/);
  let currentSeason = null;
  const cards = [];
  const seenIds = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|') || line.startsWith('| ---')) continue;
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 7) continue;
    const nameCol = parts[1];
    const seasonCol = parts[5];
    const finishCol = parts[6];
    if (!nameCol || nameCol === 'Name') continue;

    const seasonFromCol = parseSeason(seasonCol);
    if (seasonFromCol != null) currentSeason = seasonFromCol;
    if (currentSeason == null || currentSeason < 9 || currentSeason > 49) continue;

    const name = parseName(nameCol);
    if (!name) continue;
    const placement = parseFinish(finishCol);
    const total = 20;
    const { power, social } = placementToPowerSocial(placement, total, name, currentSeason);
    let id = slug(name) + ':s' + String(currentSeason).padStart(2, '0');
    let suffix = 0;
    while (seenIds.has(id)) {
      suffix++;
      id = slug(name) + '-' + suffix + ':s' + String(currentSeason).padStart(2, '0');
    }
    seenIds.add(id);

    cards.push({
      id,
      name,
      season: currentSeason,
      tribe: '',
      placement,
      is_winner: placement === 1,
      power,
      social,
      rarity: placementToRarity(placement),
    });
  }

  const outPath = path.join(__dirname, 's9-s49-cards.json');
  fs.writeFileSync(outPath, JSON.stringify(cards, null, 2), 'utf8');
  console.error('Wrote ' + cards.length + ' cards to ' + outPath);
}

main();
