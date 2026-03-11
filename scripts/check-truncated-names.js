const fs = require('fs');
const path = require('path');

const cardsPath = path.join(process.cwd(), 'torcha-cards.json');
const base = process.cwd();
const survPath = path.join(base, 'dev', 'json', 'castaways.json');
const survPathAlt = path.join(process.env.USERPROFILE || '', '.cursor', 'projects', 'c-Users-jacop-Desktop-Surv2', 'agent-tools', '6958e007-7d5e-47fa-bea5-797098aac229.txt');

let survRaw;
if (fs.existsSync(survPath)) {
  survRaw = fs.readFileSync(survPath, 'utf8');
} else if (fs.existsSync(survPathAlt)) {
  survRaw = fs.readFileSync(survPathAlt, 'utf8');
} else {
  console.error('survivoR castaways JSON not found. Tried:', survPath, survPathAlt);
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const surv = JSON.parse(survRaw);
const us = surv.filter(c => c.version === 'US');

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/\s*"[^"]*"\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const survNames = new Set(us.map(c => norm(c.full_name)));
const survByNorm = new Map();
us.forEach(c => {
  const k = norm(c.full_name);
  if (!survByNorm.has(k)) survByNorm.set(k, c.full_name);
});

// For each card, get season and normalized name
const bySeason = {};
us.forEach(c => {
  if (!bySeason[c.season]) bySeason[c.season] = new Map();
  bySeason[c.season].set(norm(c.full_name), c.full_name);
});

const suggestions = [];
cards.forEach(card => {
  const cardNorm = norm(card.name);
  const season = card.season;
  const seasonNames = bySeason[season];
  if (!seasonNames) return;

  if (seasonNames.has(cardNorm)) return; // exact match

  // Card name might be truncated: survivoR name starts with card name and adds 1–5 chars
  for (const [sn, full] of seasonNames) {
    if (sn.startsWith(cardNorm) && sn.length > cardNorm.length && sn.length - cardNorm.length <= 5) {
      suggestions.push({ card: card.name, season, suggested: full });
      break;
    }
  }
});

console.log(JSON.stringify(suggestions, null, 2));
