/**
 * Adds "expansion" field to every card in torcha-cards.json based on season.
 * Mapping must match torcha.js EXPANSIONS and scripts/apply-new-expansions.js.
 *
 * 1-8: dawn-of-the-legends, 9-15: age-of-exile, 16-20: webs-of-deceit,
 * 21-27: bonds-and-betrayals, 28-34: shadows-of-the-council,
 * 35-40: relics-of-power, 41-44: rise-of-a-new-era,
 * 45-49: a-million-dollar-frenzy, 50: the-pantheon
 */
const fs = require('fs');
const path = require('path');

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
  return 'dawn-of-the-legends';
}

const cardsPath = path.join(path.resolve(__dirname, '..'), 'torcha-cards.json');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

cards.forEach(function (card) {
  card.expansion = expansionIdForSeason(card.season);
});

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2), 'utf8');
console.log('Added expansion to', cards.length, 'cards.');
