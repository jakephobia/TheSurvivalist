/**
 * Simula: apri 10 pack, scegli le 5 carte con forza media maggiore, fai 10 challenge, stampa win rate.
 * Uso: node scripts/sim-challenge-winrate.js
 */
const path = require('path');
const fs = require('fs');

const CARDS_PATH = path.join(__dirname, '..', 'torcha-cards.json');

const HIDDEN_EXPANSION_IDS = ['the-pantheon'];
const EXPANSIONS = [
  { id: 'dawn-of-the-legends', seasons: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'age-of-exile', seasons: [9, 10, 11, 12, 13, 14, 15] },
  { id: 'webs-of-deceit', seasons: [16, 17, 18, 19, 20] },
  { id: 'bonds-and-betrayals', seasons: [21, 22, 23, 24, 25, 26, 27] },
  { id: 'shadows-of-the-council', seasons: [28, 29, 30, 31, 32, 33, 34] },
  { id: 'relics-of-power', seasons: [35, 36, 37, 38, 39, 40] },
  { id: 'rise-of-a-new-era', seasons: [41, 42, 43, 44] },
  { id: 'a-million-dollar-frenzy', seasons: [45, 46, 47, 48, 49] },
  { id: 'the-pantheon', seasons: [50] },
];
function getVisibleExpansions() {
  return EXPANSIONS.filter(e => !HIDDEN_EXPANSION_IDS.includes(e.id));
}
const RARITY_PROBS = { common: 0.642, rare: 0.210, super_rare: 0.088, legend: 0.055, mt_rushmore: 0.005 };
const RARITIES = ['common', 'rare', 'super_rare', 'legend', 'mt_rushmore'];
const PACK_SIZE = 5;
const HP_MULTIPLIER = 2;

function getReleasedCards(cards) {
  return cards.filter(c => !HIDDEN_EXPANSION_IDS.includes(c.expansion));
}

function getCardsForExpansion(cards, expansionId) {
  if (!expansionId) return [];
  return cards.filter(c => c.expansion === expansionId);
}

function getCardById(cards, id) {
  return cards.find(c => c.id === id);
}

function weightedRandomRarity() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    acc += RARITY_PROBS[RARITIES[i]];
    if (r < acc) return RARITIES[i];
  }
  return 'common';
}

function buildByRarity(cards) {
  const out = { common: [], rare: [], super_rare: [], legend: [], mt_rushmore: [] };
  cards.forEach(c => {
    if (out[c.rarity]) out[c.rarity].push(c);
  });
  return out;
}

function drawCards(cards, count) {
  const byRarity = buildByRarity(cards);
  const result = [];
  for (let i = 0; i < count; i++) {
    const rarity = weightedRandomRarity();
    const pool = byRarity[rarity] || [];
    if (pool.length === 0) {
      result.push(cards[Math.floor(Math.random() * cards.length)]);
    } else {
      result.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }
  return result;
}

function getCardStrength(card) {
  return (card.power || 0) + (card.social || 0);
}

function getStrengthFilteredPool(pool, userStrength, bandWidth, bandShift) {
  if (!pool || pool.length === 0) return [];
  bandWidth = bandWidth != null ? bandWidth : 0.4;
  bandShift = bandShift != null ? bandShift : 0;
  const withStrength = pool.map(c => ({ card: c, strength: getCardStrength(c) }));
  withStrength.sort((a, b) => a.strength - b.strength);
  const n = withStrength.length;
  let rank = 0;
  for (let i = 0; i < n; i++) {
    if (withStrength[i].strength <= userStrength) rank = i + 1;
    else break;
  }
  const percentile = n > 0 ? rank / n : 0;
  const center = Math.max(0.05, Math.min(0.95, percentile + bandShift));
  const half = bandWidth / 2;
  const low = Math.max(0, center - half);
  const high = Math.min(1, center + half);
  const lowIdx = Math.floor(low * n);
  const highIdx = Math.min(n - 1, Math.ceil(high * n));
  const result = [];
  for (let i = lowIdx; i <= highIdx; i++) result.push(withStrength[i].card);
  if (result.length < 5) return pool.slice();
  return result;
}

function getCounterScore(card, profile) {
  const p = card.power || 0, s = card.social || 0;
  if (profile === 'tank') return p * 1.5 + s * 0.5;
  if (profile === 'glass_cannon') return p * 0.5 + s * 1.5;
  return p + s;
}

function getDeckTotalsAndProfile(deck) {
  let totalPower = 0, totalSocial = 0;
  for (let i = 0; i < deck.length; i++) {
    totalPower += deck[i].power || 0;
    totalSocial += deck[i].social || 0;
  }
  const profile = totalSocial > totalPower * 1.2 ? 'tank' : (totalPower > totalSocial * 1.2 ? 'glass_cannon' : 'balanced');
  return { totalPower, totalSocial, profile };
}

function pickCpuDeckMatchmaking(userDeck, fullPool) {
  if (!fullPool || fullPool.length === 0) return [];
  const totals = getDeckTotalsAndProfile(userDeck);
  const userAvgStrength = (totals.totalPower + totals.totalSocial) / 5;
  let strengthPool = getStrengthFilteredPool(fullPool, userAvgStrength, 0.28, 0);
  if (strengthPool.length < 5) strengthPool = fullPool.slice();
  const profile = totals.profile;
  const withScore = strengthPool.map(c => ({
    card: c,
    score: getCounterScore(c, profile) * 0.75 + getCardStrength(c) * 0.25
  }));
  withScore.sort((a, b) => b.score - a.score);
  const L = withScore.length;
  const limits = [0.32, 0.40, 0.48, 0.56, 0.64];
  const result = [];
  const used = {};
  for (let b = 0; b < 5; b++) {
    const low = b === 0 ? 0 : Math.ceil(limits[b - 1] * L);
    const high = Math.ceil(limits[b] * L);
    if (high > low) {
      const idx = low + Math.floor(Math.random() * (high - low));
      result.push(withScore[idx].card);
      used[idx] = true;
    } else {
      const avail = [];
      for (let i = 0; i < L; i++) if (!used[i]) avail.push(i);
      if (avail.length > 0) {
        const idx = avail[Math.floor(Math.random() * avail.length)];
        result.push(withScore[idx].card);
        used[idx] = true;
      }
    }
  }
  if (result.length < 5) {
    for (let i = 0; i < L && result.length < 5; i++) {
      if (!used[i]) result.push(withScore[i].card);
    }
  }
  return result.slice(0, 5);
}

function rollDamage(power) {
  const base = power || 0;
  if (base <= 0) return 0;
  const mult = 0.75 + Math.random() * 0.5;
  return Math.max(1, Math.round(base * mult));
}

function getDeckHp(deck) {
  let sum = 0;
  for (let i = 0; i < deck.length; i++) sum += (deck[i] && deck[i].social || 0) * HP_MULTIPLIER;
  return sum;
}

function applyHit(attackerCard, defenderLife, log) {
  if (!attackerCard || defenderLife <= 0) return defenderLife;
  const d = rollDamage(attackerCard.power);
  const newLife = Math.max(0, defenderLife - d);
  log.push({ name: attackerCard.name, damage: d, defenderLife: newLife });
  return newLife;
}

function shuffleIndices(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function runLifeChallenge(userDeck, cpuDeck) {
  let userLife = getDeckHp(userDeck);
  let cpuLife = getDeckHp(cpuDeck);
  const firstAttacker = Math.random() < 0.5 ? 'user' : 'cpu';
  const userOrder = shuffleIndices(5);
  const cpuOrder = [0, 1, 2, 3, 4].sort((a, b) =>
    (cpuDeck[a] && cpuDeck[a].power || 0) - (cpuDeck[b] && cpuDeck[b].power || 0)
  );
  const log = [];
  let round = 0;
  const maxRounds = 50;
  while (userLife > 0 && cpuLife > 0 && round < maxRounds) {
    const i = round % 5;
    const u = userDeck[userOrder[i]];
    const c = cpuDeck[cpuOrder[i]];
    if (firstAttacker === 'user') {
      cpuLife = applyHit(u, cpuLife, log);
      if (cpuLife <= 0) break;
      userLife = applyHit(c, userLife, log);
      if (userLife <= 0) break;
    } else {
      userLife = applyHit(c, userLife, log);
      if (userLife <= 0) break;
      cpuLife = applyHit(u, cpuLife, log);
      if (cpuLife <= 0) break;
    }
    round++;
  }
  return { userWon: cpuLife <= 0 };
}

function main() {
  const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  const released = getReleasedCards(cards);
  const visible = getVisibleExpansions();
  const withCards = visible.filter(e => getCardsForExpansion(cards, e.id).length > 0);

  // Simula 10 pack: ogni pack da un'espansione random
  const inventory = {};
  for (let p = 0; p < 10; p++) {
    const exp = withCards[Math.floor(Math.random() * withCards.length)];
    const pool = getCardsForExpansion(cards, exp.id);
    const drawn = drawCards(pool, PACK_SIZE);
    drawn.forEach(card => {
      inventory[card.id] = (inventory[card.id] || 0) + 1;
    });
  }

  // Le 5 carte con forza media maggiore (tra quelle possedute)
  const entries = Object.entries(inventory).map(([id, count]) => ({
    card: getCardById(cards, id),
    count
  })).filter(e => e.card);
  entries.sort((a, b) => getCardStrength(b.card) - getCardStrength(a.card));
  const userDeck = entries.slice(0, 5).map(e => e.card);
  if (userDeck.length < 5) {
    console.error('Meno di 5 carte nell\'inventario dopo 10 pack. Riprova.');
    process.exit(1);
  }

  const avgStrength = (userDeck.reduce((s, c) => s + getCardStrength(c), 0) / 5).toFixed(1);
  console.log('Inventario dopo 10 pack:', Object.keys(inventory).length, 'carte uniche');
  console.log('Top 5 per forza:', userDeck.map(c => c.name + ' (' + getCardStrength(c) + ')').join(', '));
  console.log('Forza media deck:', avgStrength);
  console.log('');

  const numChallenges = parseInt(process.argv[2], 10) || 10;
  const pool = released.length >= 5 ? released : cards;
  let wins = 0;
  for (let i = 0; i < numChallenges; i++) {
    const cpuDeck = pickCpuDeckMatchmaking(userDeck, pool);
    if (cpuDeck.length < 5) {
      console.warn('Challenge', i + 1, ': pool CPU insufficiente, skip');
      continue;
    }
    const result = runLifeChallenge(userDeck, cpuDeck);
    if (result.userWon) wins++;
  }
  const played = numChallenges;
  const winRate = played > 0 ? (wins / played * 100).toFixed(1) : '0';
  console.log('Challenge giocate:', played);
  console.log('Vittorie:', wins, '/', played);
  console.log('Win rate:', winRate + '%');
}

main();
