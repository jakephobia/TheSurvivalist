/**
 * Applies expansion id to each card in torcha-cards.json based on season.
 * New expansion mapping (id = slug of name):
 * 1-8: Dawn of the Legends -> dawn-of-the-legends
 * 9-15: Age of Exile -> age-of-exile
 * 16-20: Webs of Deceit -> webs-of-deceit
 * 21-27: Bonds and Betrayals -> bonds-and-betrayals
 * 28-34: Shadows of the Council -> shadows-of-the-council
 * 35-40: Relics of Power -> relics-of-power
 * 41-44: Rise of a New Era -> rise-of-a-new-era
 * 45-49: A Million Dollar Frenzy -> a-million-dollar-frenzy
 * 50: The Pantheon -> the-pantheon
 *
 * Usage: node scripts/apply-new-expansions.js
 */

const fs = require('fs');
const path = require('path');

const CARDS_PATH = path.join(path.resolve(__dirname, '..'), 'torcha-cards.json');

function expansionIdForSeason(season) {
  const n = parseInt(season, 10);
  if (n >= 1 && n <= 8) return 'dawn-of-the-legends';
  if (n >= 9 && n <= 15) return 'age-of-exile';
  if (n >= 16 && n <= 20) return 'webs-of-deceit';
  if (n >= 21 && n <= 27) return 'bonds-and-betrayals';
  if (n >= 28 && n <= 34) return 'shadows-of-the-council';
  if (n >= 35 && n <= 40) return 'relics-of-power';
  if (n >= 41 && n <= 44) return 'rise-of-a-new-era';
  if (n >= 45 && n <= 49) return 'a-million-dollar-frenzy';
  if (n === 50) return 'the-pantheon';
  return 'dawn-of-the-legends'; // fallback
}

const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
let updated = 0;
cards.forEach(function (card) {
  const id = expansionIdForSeason(card.season);
  if (card.expansion !== id) {
    card.expansion = id;
    updated++;
  } else {
    card.expansion = id;
  }
});

fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2), 'utf8');
console.log('Applied expansion to', cards.length, 'cards (' + updated + ' changed).');
