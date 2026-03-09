/**
 * Adds "expansion" field to every card in torcha-cards.json based on season.
 */
const fs = require('fs');
const path = require('path');

const SEASON_TO_EXPANSION = {
  1: 'road-to-all-stars', 2: 'road-to-all-stars', 3: 'road-to-all-stars', 4: 'road-to-all-stars',
  5: 'road-to-all-stars', 6: 'road-to-all-stars', 7: 'road-to-all-stars', 8: 'road-to-all-stars',
  9: 'the-twists-era', 10: 'the-twists-era', 11: 'the-twists-era', 12: 'the-twists-era',
  13: 'the-twists-era', 14: 'the-twists-era',
  15: 'the-golden-age', 16: 'the-golden-age', 17: 'the-golden-age', 18: 'the-golden-age',
  19: 'the-golden-age', 20: 'the-golden-age',
  21: 'the-dark-age', 22: 'the-dark-age', 23: 'the-dark-age', 24: 'the-dark-age',
  25: 'the-dark-age', 26: 'the-dark-age',
  27: 'rise-of-the-big-moves', 28: 'rise-of-the-big-moves', 29: 'rise-of-the-big-moves',
  30: 'rise-of-the-big-moves', 31: 'rise-of-the-big-moves', 32: 'rise-of-the-big-moves', 33: 'rise-of-the-big-moves',
  34: 'advantagegeddon', 35: 'advantagegeddon', 36: 'advantagegeddon', 37: 'advantagegeddon',
  38: 'advantagegeddon', 39: 'advantagegeddon', 40: 'advantagegeddon',
  41: 'early-new-era', 42: 'early-new-era', 43: 'early-new-era', 44: 'early-new-era',
  45: 'late-new-era', 46: 'late-new-era', 47: 'late-new-era', 48: 'late-new-era', 49: 'late-new-era',
};

const cardsPath = path.join(path.resolve(__dirname, '..'), 'torcha-cards.json');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

cards.forEach(function (card) {
  card.expansion = SEASON_TO_EXPANSION[card.season] || '';
});

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2), 'utf8');
console.log('Added expansion to', cards.length, 'cards.');
