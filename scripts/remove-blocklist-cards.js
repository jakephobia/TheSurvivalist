/**
 * Removes blocklisted contestants from torcha-cards.json (Michael Skupin, Dan Spilo, Jeff Varner).
 */
const fs = require('fs');
const path = require('path');

const BLOCKLIST_NAMES = new Set([
  'michael skupin',
  'dan spilo',
  'dan spil',  // in case stored without 'o'
  'jeff varner',
]);

const cardsPath = path.join(path.resolve(__dirname, '..'), 'torcha-cards.json');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

const before = cards.length;
const filtered = cards.filter(function (c) {
  const name = (c.name || '').trim().toLowerCase();
  return !BLOCKLIST_NAMES.has(name);
});
const removed = before - filtered.length;

fs.writeFileSync(cardsPath, JSON.stringify(filtered, null, 2), 'utf8');
console.log('Removed', removed, 'blocklisted card(s). Total cards:', filtered.length);
