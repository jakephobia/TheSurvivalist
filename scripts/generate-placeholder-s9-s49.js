/**
 * Generates placeholder torcha cards for Survivor seasons 9-49 and appends to torcha-cards.json.
 * Same structure as existing cards; names are placeholders (e.g. "S9 – Contestant 1") for later replacement.
 */

const fs = require('fs');
const path = require('path');

const CAST_SIZE = 18; // typical per season

const STAT_MIN = 1;
const STAT_MAX = 200;

function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/["']/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function placementToRarity(placement) {
  if (placement === 1) return 'legend';
  if (placement === 2) return 'super_rare';
  if (placement === 3) return 'rare';
  return 'common';
}

/** Power and social independent; both in [STAT_MIN, STAT_MAX] (1–200). */
function placementToPowerSocial(placement, total, name, season) {
  const pct = 1 - (placement - 1) / Math.max(total, 1);
  const base = STAT_MIN + pct * (STAT_MAX - STAT_MIN);
  const seed = (name || '') + '|' + (season ?? '');
  const powerJitter = (simpleHash(seed) % 41) - 20;
  const socialJitter = (simpleHash(seed + '|s') % 41) - 20;
  const power = Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(base + powerJitter)));
  const social = Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(base + socialJitter)));
  return { power, social };
}

function generatePlaceholderCards() {
  const cards = [];
  for (let season = 9; season <= 49; season++) {
    const s = String(season).padStart(2, '0');
    for (let p = 1; p <= CAST_SIZE; p++) {
      const placement = p;
      const name = 'S' + season + ' – Contestant ' + placement;
      const id = slug('s' + season + '-contestant-' + placement) + ':s' + s;
      const { power, social } = placementToPowerSocial(placement, CAST_SIZE, name, season);
      cards.push({
        id,
        name,
        season,
        tribe: 'Tribe',
        placement,
        is_winner: placement === 1,
        power,
        social,
        rarity: placementToRarity(placement),
      });
    }
  }
  return cards;
}

function main() {
  const root = path.join(__dirname, '..');
  const cardsPath = path.join(root, 'torcha-cards.json');
  const existing = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
  const placeholders = generatePlaceholderCards();
  const merged = existing.concat(placeholders);
  fs.writeFileSync(cardsPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log('Appended ' + placeholders.length + ' placeholder cards (S9–S49). Total cards: ' + merged.length);
}

main();
