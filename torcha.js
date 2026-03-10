/**
 * Torcha – gacha card game (vanilla JS port for The Survivalist)
 * Uses torcha-cards.json, localStorage for persistence.
 */
(function () {
  'use strict';

  const RESPAWN_MIN = 15;
  const MAX_STOCK = 10;
  const PACK_SIZE = 5;
  const PVP_PACK_REWARD_EVERY = 10;
  const PACKS_PER_CLAIM = 2;
  const SEASONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

  const EXPANSIONS = [
    { id: 'road-to-all-stars', name: 'Road to All Stars', seasons: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'the-twists-era', name: 'The Twists Era', seasons: [9, 10, 11, 12, 13, 14] },
    { id: 'the-golden-age', name: 'The Golden Age', seasons: [15, 16, 17, 18, 19, 20] },
    { id: 'the-strategy-era', name: 'The Strategy Era', seasons: [21, 22, 23, 24, 25, 26] },
  ];

  /** Contestants excluded from the card pool (by exact name match, case-insensitive). */
  const CARD_BLOCKLIST_NAMES = new Set(['dan spilo', 'michael skupin', 'jeff varner']);

  const RARITY_PROBS = { common: 0.639, rare: 0.206, super_rare: 0.086, legend: 0.069 };
  const RARITIES = ['common', 'rare', 'super_rare', 'legend'];
  const FIRE_TOKEN_COSTS = { common: 500, rare: 1000, super_rare: 5000, legend: 10000 };

  const DAILY_TASKS = [
    { id: 'open_5_packs', label: 'Open 5 packs', target: 5 },
    { id: 'win_3_pvp', label: 'Win 3 Battle', target: 3 },
    { id: 'contribute_500_raid', label: 'Earn 500 Fire Tokens', target: 500 },
    { id: 'open_app_3', label: 'Open app 3 times today', target: 3 },
    { id: 'use_5_raid_cards', label: 'Use 5 cards in raid', target: 5 },
  ];

  const SEASON_NAMES = {
    1: 'Borneo', 2: 'The Australian Outback', 3: 'Africa', 4: 'Marquesas', 5: 'Thailand',
    6: 'The Amazon', 7: 'Pearl Islands', 8: 'All-Stars', 9: 'Vanuatu', 10: 'Palau',
    11: 'Guatemala', 12: 'Panama', 13: 'Cook Islands', 14: 'Fiji', 15: 'China',
    16: 'Micronesia', 17: 'Gabon', 18: 'Tocantins', 19: 'Samoa', 20: 'Heroes vs. Villains',
    21: 'Nicaragua', 22: 'Redemption Island', 23: 'South Pacific', 24: 'One World', 25: 'Philippines',
    26: 'Caramoan', 27: 'Blood vs. Water', 28: 'Cagayan', 29: 'San Juan del Sur', 30: 'Worlds Apart',
    31: 'Cambodia', 32: 'Kaôh Rōng', 33: 'Millennials vs. Gen X', 34: 'Game Changers',
    35: 'Heroes vs. Healers vs. Hustlers', 36: 'Ghost Island', 37: 'David vs. Goliath',
    38: 'Edge of Extinction', 39: 'Island of the Idols', 40: 'Winners at War',
    41: 'Survivor 41', 42: 'Survivor 42', 43: 'Survivor 43', 44: 'Survivor 44', 45: 'Survivor 45',
    46: 'Survivor 46', 47: 'Survivor 47', 48: 'Survivor 48', 49: 'Survivor 49',
    50: 'Survivor 50: In the Hands of the Fans',
  };
  const SEASON_ABBREV = {
    1: '', 2: 'Australia', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '',
    11: '', 12: '', 13: '', 14: '', 15: '', 16: '', 17: '', 18: '', 19: '', 20: 'HvV',
    21: '', 22: '', 23: '', 24: '', 25: '', 26: '', 27: 'BvW', 28: '', 29: 'SJDS', 30: '',
    31: '', 32: '', 33: 'MvGX', 34: '', 35: 'HvHvH', 36: '', 37: 'DvG', 38: 'EoE', 39: 'IoI', 40: 'WaW',
    41: '', 42: '', 43: '', 44: '', 45: '', 46: '', 47: '', 48: '', 49: '', 50: '50',
  };

  function getSeasonDisplay(seasonNum) {
    const name = SEASON_NAMES[seasonNum];
    return name ? 'S' + seasonNum + ' - ' + name : 'S' + seasonNum;
  }

  function getExpansionDisplay(exp) {
    if (!exp || !exp.seasons || exp.seasons.length === 0) return exp ? exp.name : '';
    const min = Math.min.apply(null, exp.seasons);
    const max = Math.max.apply(null, exp.seasons);
    return exp.name + ' (' + min + '-' + max + ')';
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatRarityLabel(rarity) {
    return rarity.replace('_', ' ');
  }

  // --- Persistence (same keys as Torcha React app) ---
  const STORAGE = {
    inventory: 'torcha_inventory',
    packStock: 'torcha_pack_stock',
    nextPackAt: 'torcha_next_pack_at',
    dailyClaimed: 'torcha_daily_claimed',
    dailyLastReset: 'torcha_daily_last_reset',
    packsToday: 'torcha_packs_opened_today',
    packsReset: 'torcha_packs_opened_last_reset',
    sessionsToday: 'torcha_sessions_today',
    sessionsReset: 'torcha_sessions_last_reset',
    pvpWins: 'torcha_pvp_wins',
    pvpWinsToday: 'torcha_pvp_wins_today',
    pvpLastReset: 'torcha_pvp_last_reset',
    raidCardsUsed: 'torcha_raid_cards_used_today',
    raidLastReset: 'torcha_raid_last_reset',
    fireTokens: 'torcha_fire_tokens',
    fireEarnedToday: 'torcha_fire_tokens_earned_today',
    fireLastReset: 'torcha_fire_tokens_last_reset',
  };

  function loadInventory() {
    try {
      const raw = localStorage.getItem(STORAGE.inventory);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const out = {};
      for (const [id, count] of Object.entries(data)) {
        if (typeof id === 'string' && typeof count === 'number' && count >= 0) out[id] = count;
      }
      return out;
    } catch (_) { return {}; }
  }

  function saveInventory(inv) {
    localStorage.setItem(STORAGE.inventory, JSON.stringify(inv));
  }

  function addToInventory(inv, cardId, count) {
    const next = Object.assign({}, inv);
    next[cardId] = (next[cardId] || 0) + (count || 1);
    return next;
  }

  function removeFromInventory(inv, cardId) {
    const current = inv[cardId] || 0;
    if (current < 2) return null;
    const next = Object.assign({}, inv);
    next[cardId] = current - 1;
    return next;
  }

  function getPackState() {
    let stock = parseInt(localStorage.getItem(STORAGE.packStock), 10);
    if (!Number.isFinite(stock)) stock = MAX_STOCK;
    stock = Math.max(0, Math.min(MAX_STOCK, stock));
    let nextAt = parseInt(localStorage.getItem(STORAGE.nextPackAt), 10) || 0;
    if (!Number.isFinite(nextAt)) nextAt = 0;
    const now = Date.now();
    while (stock < MAX_STOCK && nextAt > 0 && nextAt <= now) {
      stock += 1;
      nextAt += RESPAWN_MIN * 60 * 1000;
    }
    if (stock >= MAX_STOCK) nextAt = 0;
    else if (nextAt <= now) nextAt = now + RESPAWN_MIN * 60 * 1000;
    if (stock !== parseInt(localStorage.getItem(STORAGE.packStock), 10) || nextAt !== parseInt(localStorage.getItem(STORAGE.nextPackAt), 10)) {
      localStorage.setItem(STORAGE.packStock, String(stock));
      localStorage.setItem(STORAGE.nextPackAt, String(nextAt));
    }
    return { stock, nextPackAt: nextAt };
  }

  function savePackState(stock, nextPackAt) {
    localStorage.setItem(STORAGE.packStock, String(stock));
    localStorage.setItem(STORAGE.nextPackAt, String(nextPackAt));
  }

  function consumeOnePack(currentStock, currentNextAt) {
    if (currentStock <= 0) return { stock: 0, nextPackAt: currentNextAt };
    const now = Date.now();
    let nextAt = currentNextAt;
    if (currentStock === MAX_STOCK && currentNextAt <= 0) nextAt = now + RESPAWN_MIN * 60 * 1000;
    return { stock: currentStock - 1, nextPackAt: nextAt };
  }

  function addPacksToStock(currentStock, currentNextAt, n) {
    const stock = Math.min(MAX_STOCK, currentStock + Math.max(0, n));
    return { stock, nextPackAt: currentNextAt };
  }

  function getPacksOpenedToday() {
    if (localStorage.getItem(STORAGE.packsReset) !== todayKey()) return 0;
    const raw = localStorage.getItem(STORAGE.packsToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function incrementPacksOpenedToday() {
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.packsReset);
    let count = getPacksOpenedToday();
    if (last !== today) count = 0;
    count += 1;
    localStorage.setItem(STORAGE.packsToday, String(count));
    localStorage.setItem(STORAGE.packsReset, today);
  }

  function getSessionsToday() {
    if (localStorage.getItem(STORAGE.sessionsReset) !== todayKey()) return 0;
    const raw = localStorage.getItem(STORAGE.sessionsToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function incrementSessionsToday() {
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.sessionsReset);
    let count = getSessionsToday();
    if (last !== today) count = 0;
    count += 1;
    localStorage.setItem(STORAGE.sessionsToday, String(count));
    localStorage.setItem(STORAGE.sessionsReset, today);
  }

  function loadPvpWins() {
    const raw = localStorage.getItem(STORAGE.pvpWins);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function loadPvpWinsToday() {
    if (localStorage.getItem(STORAGE.pvpLastReset) !== todayKey()) return 0;
    const raw = localStorage.getItem(STORAGE.pvpWinsToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function savePvpWin() {
    const total = loadPvpWins() + 1;
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.pvpLastReset);
    let todayWins = loadPvpWinsToday();
    if (last !== today) todayWins = 0;
    todayWins += 1;
    localStorage.setItem(STORAGE.pvpWins, String(total));
    localStorage.setItem(STORAGE.pvpWinsToday, String(todayWins));
    localStorage.setItem(STORAGE.pvpLastReset, today);
  }

  function loadDailyClaimed() {
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.dailyLastReset);
    if (last !== today) {
      localStorage.setItem(STORAGE.dailyLastReset, today);
      localStorage.setItem(STORAGE.dailyClaimed, '{}');
      return {};
    }
    try {
      const raw = localStorage.getItem(STORAGE.dailyClaimed);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_) { return {}; }
  }

  function saveDailyClaimed(claimed) {
    localStorage.setItem(STORAGE.dailyClaimed, JSON.stringify(claimed));
  }

  function loadRaidCardsUsedToday() {
    if (localStorage.getItem(STORAGE.raidLastReset) !== todayKey()) {
      localStorage.setItem(STORAGE.raidLastReset, todayKey());
      localStorage.setItem(STORAGE.raidCardsUsed, '[]');
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE.raidCardsUsed);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (_) { return []; }
  }

  function addRaidCardsUsedToday(ids) {
    const used = loadRaidCardsUsedToday();
    const next = used.concat(ids);
    localStorage.setItem(STORAGE.raidCardsUsed, JSON.stringify(next));
  }

  function loadFireTokens() {
    const raw = localStorage.getItem(STORAGE.fireTokens);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function loadFireEarnedToday() {
    if (localStorage.getItem(STORAGE.fireLastReset) !== todayKey()) {
      localStorage.setItem(STORAGE.fireLastReset, todayKey());
      localStorage.setItem(STORAGE.fireEarnedToday, '0');
      return 0;
    }
    const raw = localStorage.getItem(STORAGE.fireEarnedToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function saveFireTokens(balance) {
    localStorage.setItem(STORAGE.fireTokens, String(Math.max(0, Math.floor(balance))));
  }

  function addFireTokens(amount) {
    const balance = loadFireTokens() + amount;
    saveFireTokens(balance);
    const today = todayKey();
    if (localStorage.getItem(STORAGE.fireLastReset) !== today) {
      localStorage.setItem(STORAGE.fireLastReset, today);
      localStorage.setItem(STORAGE.fireEarnedToday, '0');
    }
    const earned = loadFireEarnedToday() + amount;
    localStorage.setItem(STORAGE.fireEarnedToday, String(earned));
  }

  function spendFireTokens(amount) {
    const balance = loadFireTokens();
    if (balance < amount) return false;
    saveFireTokens(balance - amount);
    return true;
  }

  const SESSION_VERSION = 1;

  function exportSession() {
    const data = { tool: 'Torcha', version: SESSION_VERSION, savedAt: new Date().toISOString(), data: {} };
    Object.keys(STORAGE).forEach(function (k) {
      const v = localStorage.getItem(STORAGE[k]);
      if (v != null) data.data[STORAGE[k]] = v;
    });
    const filename = (window.getSessionFilename && window.getSessionFilename('Torcha', 'Session')) || ('TORCHA_Session_' + new Date().toISOString().slice(0, 10) + '.json');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSessionFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const raw = JSON.parse(e.target.result);
        if (!raw || typeof raw !== 'object' || raw.tool !== 'Torcha') {
          alert('Invalid file. This is not a Torcha session.');
          return;
        }
        if (raw.version !== SESSION_VERSION) {
          alert('Unsupported file version.');
          return;
        }
        const data = raw.data;
        if (!data || typeof data !== 'object') {
          alert('Invalid session data.');
          return;
        }
        Object.keys(data).forEach(function (key) {
          if (data[key] != null) localStorage.setItem(key, String(data[key]));
        });
        refreshSessionUI();
        alert('Session loaded. Saved at: ' + (raw.savedAt || 'unknown'));
      } catch (err) {
        alert('Invalid JSON file: ' + (err.message || err));
      }
    };
    reader.readAsText(file);
  }

  function resetSession() {
    if (!confirm('Reset everything? Current session data will be lost.')) return;
    Object.keys(STORAGE).forEach(function (k) { localStorage.removeItem(STORAGE[k]); });
    refreshSessionUI();
  }

  function refreshSessionUI() {
    inventory = loadInventory();
    packState = getPackState();
    renderTimer();
    renderPackPanel();
    renderDailyTasks();
    renderInventoryPanel();
    renderPvpPanel();
    renderShredPanel();
  }

  // --- Card data & draw ---
  function getCardById(cards, id) {
    return cards.find(function (c) { return c.id === id; });
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
    const out = { common: [], rare: [], super_rare: [], legend: [] };
    cards.forEach(function (c) {
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

  function drawSeasonPack(cards, season, count) {
    const pool = cards.filter(function (c) { return c.season === season; });
    if (pool.length === 0) return [];
    return drawCards(pool, count);
  }

  function drawRandomCardByRarity(cards, rarity) {
    const pool = cards.filter(function (c) { return c.rarity === rarity; });
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function shuffleIndices(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /** Forza = Power + Social (per matchmaking). */
  function getCardStrength(card) {
    return (card.power || 0) + (card.social || 0);
  }

  /** Pool filtrato per quantile: banda 40% attorno al percentile; bandShift negativo = CPU pesca da fascia leggermente più debole. */
  function getStrengthFilteredPool(pool, userStrength, bandWidth, bandShift) {
    if (!pool || pool.length === 0) return [];
    bandWidth = bandWidth != null ? bandWidth : 0.4;
    bandShift = bandShift != null ? bandShift : 0;
    var withStrength = pool.map(function (c) { return { card: c, strength: getCardStrength(c) }; });
    withStrength.sort(function (a, b) { return a.strength - b.strength; });
    var n = withStrength.length;
    var rank = 0;
    for (var i = 0; i < n; i++) {
      if (withStrength[i].strength <= userStrength) rank = i + 1;
      else break;
    }
    var percentile = n > 0 ? rank / n : 0;
    var center = Math.max(0.05, Math.min(0.95, percentile + bandShift));
    var half = bandWidth / 2;
    var low = Math.max(0, center - half);
    var high = Math.min(1, center + half);
    var lowIdx = Math.floor(low * n);
    var highIdx = Math.min(n - 1, Math.ceil(high * n));
    var result = [];
    for (var i = lowIdx; i <= highIdx; i++) result.push(withStrength[i].card);
    if (result.length < 5) return pool.slice();
    return result;
  }

  /** Counter score: tank → privilegia Power; glass_cannon → privilegia Social; balanced → uguali. */
  function getCounterScore(card, profile) {
    var p = card.power || 0, s = card.social || 0;
    if (profile === 'tank') return p * 1.5 + s * 0.5;
    if (profile === 'glass_cannon') return p * 0.5 + s * 1.5;
    return p + s;
  }

  /** Single pass over the deck: returns totalPower, totalSocial and profile (tank/glass_cannon/balanced). */
  function getDeckTotalsAndProfile(deck) {
    var totalPower = 0, totalSocial = 0;
    for (var i = 0; i < deck.length; i++) {
      totalPower += deck[i].power || 0;
      totalSocial += deck[i].social || 0;
    }
    var profile = totalSocial > totalPower * 1.2 ? 'tank' : (totalPower > totalSocial * 1.2 ? 'glass_cannon' : 'balanced');
    return { totalPower: totalPower, totalSocial: totalSocial, profile: profile };
  }

  /** Matchmaking (banda -12% così CPU da fascia un po' più debole) + 75% counter + 25% forza. Carta 1 da top 10%, …, 5 da 55-70%. */
  function pickCpuDeckMatchmaking(userDeck, fullPool) {
    if (!fullPool || fullPool.length === 0) return [];
    var totals = getDeckTotalsAndProfile(userDeck);
    var userAvgStrength = (totals.totalPower + totals.totalSocial) / 5;
    var strengthPool = getStrengthFilteredPool(fullPool, userAvgStrength, 0.4, -0.12);
    if (strengthPool.length < 5) strengthPool = fullPool.slice();
    var profile = totals.profile;
    var withScore = strengthPool.map(function (c) {
      var counter = getCounterScore(c, profile);
      var raw = getCardStrength(c);
      return { card: c, score: counter * 0.75 + raw * 0.25 };
    });
    withScore.sort(function (a, b) { return b.score - a.score; });
    var L = withScore.length;
    var limits = [0.10, 0.25, 0.40, 0.55, 0.70];
    var result = [];
    var used = {};
    for (var b = 0; b < 5; b++) {
      var low = b === 0 ? 0 : Math.ceil(limits[b - 1] * L);
      var high = Math.ceil(limits[b] * L);
      if (high > low) {
        var idx = low + Math.floor(Math.random() * (high - low));
        result.push(withScore[idx].card);
        used[idx] = true;
      } else {
        var avail = [];
        for (var i = 0; i < L; i++) if (!used[i]) avail.push(i);
        if (avail.length > 0) {
          var idx = avail[Math.floor(Math.random() * avail.length)];
          result.push(withScore[idx].card);
          used[idx] = true;
        }
      }
    }
    if (result.length < 5) {
      for (var i = 0; i < L && result.length < 5; i++) {
        if (!used[i]) result.push(withScore[i].card);
      }
    }
    return result.slice(0, 5);
  }

  /** Danno con varianza 75%-125% per colpo (stesso per giocatore e CPU). */
  function rollDamage(power) {
    var base = power || 0;
    if (base <= 0) return 0;
    var mult = 0.75 + Math.random() * 0.5;
    return Math.max(1, Math.round(base * mult));
  }

  var HP_MULTIPLIER = 2;

  function getDeckHp(deck) {
    var sum = 0;
    for (var i = 0; i < deck.length; i++) sum += (deck[i] && deck[i].social || 0) * HP_MULTIPLIER;
    return sum;
  }

  /** Applica un colpo: restituisce il nuovo HP del difensore e aggiunge una riga al log. */
  function applyHit(attackerCard, defenderLife, attackerSide, log) {
    if (!attackerCard || defenderLife <= 0) return defenderLife;
    var d = rollDamage(attackerCard.power);
    var newLife = Math.max(0, defenderLife - d);
    log.push({ side: attackerSide, name: attackerCard.name, damage: d, defenderLife: newLife });
    return newLife;
  }

  /** Battle: proceeds until one life bar reaches 0 (first to 0 wins). CPU uses cards in ascending Power order (weakest first). */
  function runLifeBattle(userDeck, cpuDeck) {
    var userLifeInitial = getDeckHp(userDeck);
    var cpuLifeInitial = getDeckHp(cpuDeck);
    var userLife = userLifeInitial;
    var cpuLife = cpuLifeInitial;
    var firstAttacker = Math.random() < 0.5 ? 'user' : 'cpu';
    var userOrder = shuffleIndices(5);
    var cpuOrder = [0, 1, 2, 3, 4].sort(function (a, b) {
      return (cpuDeck[a] && cpuDeck[a].power || 0) - (cpuDeck[b] && cpuDeck[b].power || 0);
    });
    var log = [];
    var round = 0;
    var maxRounds = 50;
    while (userLife > 0 && cpuLife > 0 && round < maxRounds) {
      var i = round % 5;
      var u = userDeck[userOrder[i]];
      var c = cpuDeck[cpuOrder[i]];
      if (firstAttacker === 'user') {
        cpuLife = applyHit(u, cpuLife, 'user', log);
        if (cpuLife <= 0) break;
        userLife = applyHit(c, userLife, 'cpu', log);
        if (userLife <= 0) break;
      } else {
        userLife = applyHit(c, userLife, 'cpu', log);
        if (userLife <= 0) break;
        cpuLife = applyHit(u, cpuLife, 'user', log);
        if (cpuLife <= 0) break;
      }
      round++;
    }
    return {
      userLifeInitial: userLifeInitial,
      cpuLifeInitial: cpuLifeInitial,
      userLife: userLife,
      cpuLife: cpuLife,
      log: log,
      userWon: cpuLife <= 0
    };
  }

  // --- App state ---
  let cards = [];
  let inventory = loadInventory();
  let packState = { stock: MAX_STOCK, nextPackAt: 0 };
  let activeTab = 'pack';
  let pvpDeck = [];
  let shredSelected = [];
  let filterRarity = '';
  let filterSeason = '';
  let filterExpansion = '';
  let filterSort = 'season';
  let lastDrawnCards = [];
  let claimFeedbackTaskId = null;
  let isOpeningPack = false;

  function formatTimeUntil(ms) {
    if (ms <= 0) return 'Ready';
    const s = Math.ceil((ms - Date.now()) / 1000);
    if (s <= 0) return 'Ready';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  }

  function getProgressValues() {
    return {
      open_5_packs: getPacksOpenedToday(),
      win_3_pvp: loadPvpWinsToday(),
      contribute_500_raid: loadFireEarnedToday(),
      open_app_3: getSessionsToday(),
      use_5_raid_cards: loadRaidCardsUsedToday().length,
    };
  }

  function getDailyTaskItems() {
    const claimed = loadDailyClaimed();
    const pv = getProgressValues();
    return DAILY_TASKS.map(function (task) {
      const current = pv[task.id] || 0;
      const canClaim = !claimed[task.id] && current >= task.target;
      return { task, current, claimed: !!claimed[task.id], canClaim };
    });
  }

  function claimDailyTask(taskId) {
    const claimed = loadDailyClaimed();
    if (claimed[taskId]) return false;
    const task = DAILY_TASKS.find(function (t) { return t.id === taskId; });
    const pv = getProgressValues();
    if (!task || (pv[taskId] || 0) < task.target) return false;
    claimed[taskId] = true;
    saveDailyClaimed(claimed);
    const state = getPackState();
    const next = addPacksToStock(state.stock, state.nextPackAt, PACKS_PER_CLAIM);
    savePackState(next.stock, next.nextPackAt);
    packState = getPackState();
    return true;
  }

  function getOwnedEntries() {
    const entries = [];
    Object.keys(inventory).forEach(function (id) {
      const count = inventory[id];
      if (count <= 0) return;
      const card = getCardById(cards, id);
      if (card) entries.push({ card, count });
    });
    return entries;
  }

  function applyFiltersToEntries(entries) {
    return entries.filter(function (_ref) {
      const card = _ref.card;
      if (SEASONS.indexOf(card.season) === -1) return false;
      if (filterRarity && card.rarity !== filterRarity) return false;
      if (filterSeason !== '' && card.season !== filterSeason) return false;
      if (filterExpansion) {
        const exp = EXPANSIONS.find(function (e) { return e.id === filterExpansion; });
        if (exp && exp.seasons.indexOf(card.season) === -1) return false;
      }
      return true;
    });
  }

  function sortEntries(entries, sortBy) {
    const list = entries.slice();
    sortBy = sortBy || filterSort;
    list.sort(function (a, b) {
      const c = a.card;
      const d = b.card;
      if (sortBy === 'season') {
        if (c.season !== d.season) return c.season - d.season;
        return (c.placement || 0) - (d.placement || 0);
      }
      if (sortBy === 'name') return (c.name || '').localeCompare(d.name || '', undefined, { sensitivity: 'base' });
      if (sortBy === 'power') return (d.power || 0) - (c.power || 0);
      if (sortBy === 'social') return (d.social || 0) - (c.social || 0);
      return 0;
    });
    return list;
  }

  function getFilteredEntries() {
    const owned = getOwnedEntries();
    const filtered = applyFiltersToEntries(owned);
    return sortEntries(filtered, filterSort);
  }

  function getProgress() {
    const released = getReleasedCards();
    const owned = getOwnedEntries().filter(function (_ref) { return SEASONS.indexOf(_ref.card.season) !== -1; });
    const totalUnique = released.length;
    const ownedUnique = owned.length;
    const bySeason = {};
    SEASONS.forEach(function (s) {
      const total = released.filter(function (c) { return c.season === s; }).length;
      const ownedCount = released.filter(function (c) { return c.season === s && (inventory[c.id] || 0) > 0; }).length;
      bySeason[s] = { owned: ownedCount, total };
    });
    return { overall: { owned: ownedUnique, total: totalUnique }, bySeason };
  }

  // --- DOM ---
  function el(id) { return document.getElementById(id); }
  function addClass(el, c) { if (el) el.classList.add(c); }
  function removeClass(el, c) { if (el) el.classList.remove(c); }
  function toggleHidden(el, hide) {
    if (!el) return;
    if (hide) el.classList.add('hidden'); else el.classList.remove('hidden');
  }

  function renderCardEl(card, opts) {
    opts = opts || {};
    const div = document.createElement(opts.button ? 'button' : 'div');
    div.className = 'torcha-card torcha-rarity-' + card.rarity;
    if (opts.reveal) div.classList.add('torcha-reveal-card');
    if (opts.collection) div.classList.add('torcha-collection-card');
    if (opts.button) div.type = 'button';
    const seasonDisplay = getSeasonDisplay(card.season);
    let html = '<div class="torcha-card-rarity">' + formatRarityLabel(card.rarity) + '</div>';
    html += '<div class="torcha-card-name">' + escapeHtml(card.name) + '</div>';
    html += '<div class="torcha-card-meta">' + escapeHtml(seasonDisplay) + '</div>';
    if (card.imageUrl) {
      html += '<div class="torcha-card-photo"><img src="' + escapeHtml(card.imageUrl) + '" alt="" loading="lazy"></div>';
    }
    if (opts.count > 1) html = '<span class="torcha-count-badge" aria-label="' + opts.count + ' copies">' + opts.count + '</span>' + html;
    if (opts.showStats !== false) {
      html += '<div class="torcha-card-stats">';
      html += '<span class="torcha-stat"><span class="torcha-stat-label">Power</span> ' + card.power + '</span>';
      html += '<span class="torcha-stat"><span class="torcha-stat-label">Social</span> ' + card.social + '</span>';
      html += '</div>';
    }
    if (opts.shredTokens != null) html += '<div class="torcha-card-meta">+' + opts.shredTokens + ' tokens</div>';
    div.innerHTML = html;
    return div;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderTimer() {
    packState = getPackState();
    const timerEl = el('torcha-timer');
    if (timerEl) {
      timerEl.innerHTML = '<span style="display:block">Packs: ' + packState.stock + ' / ' + MAX_STOCK + '</span><span style="display:block">Next pack: ' + formatTimeUntil(packState.nextPackAt) + '</span>';
    }
    const openBtn = el('torcha-open-pack-btn');
    const expansionSel = el('torcha-pack-expansion');
    const expansionId = expansionSel && expansionSel.value || '';
    const poolSize = getCardsForExpansion(expansionId).length;
    if (openBtn) openBtn.disabled = packState.stock <= 0 || isOpeningPack || !expansionId || poolSize === 0;
  }

  function renderReveal(drawn) {
    lastDrawnCards = drawn;
    const section = el('torcha-reveal-section');
    const countEl = el('torcha-reveal-count');
    const container = el('torcha-cards-reveal');
    if (!section || !container) return;
    if (countEl) countEl.textContent = drawn.length;
    container.innerHTML = '';
    drawn.forEach(function (card) {
      container.appendChild(renderCardEl(card, { reveal: true }));
    });
    toggleHidden(el('torcha-loading'), true);
    toggleHidden(el('torcha-main-card'), false);
    toggleHidden(el('torcha-app'), false);
    activeTab = 'pack';
    document.querySelectorAll('.torcha-tab').forEach(function (t) {
      const id = t.id && t.id.replace('torcha-tab-', '');
      t.classList.toggle('torcha-tab-active', id === 'pack');
      t.setAttribute('aria-selected', id === 'pack');
    });
    document.querySelectorAll('.torcha-panel').forEach(function (p) {
      const id = p.id && p.id.replace('torcha-panel-', '');
      toggleHidden(p, id !== 'pack');
    });
    toggleHidden(section, false);
  }

  function closeReveal() {
    lastDrawnCards = [];
    toggleHidden(el('torcha-reveal-section'), true);
  }

  function renderPackPanel() {
    renderTimer();
    updateExpansionCarouselSelected();
  }

  function renderDailyTasks() {
    const list = el('torcha-daily-tasks-list');
    if (!list) return;
    const items = getDailyTaskItems();
    list.innerHTML = '';
    items.forEach(function (item) {
      const displayed = Math.min(item.current, item.task.target);
      const isDone = item.claimed;
      const li = document.createElement('li');
      li.className = 'flex-row gap-md torcha-task-item' + (claimFeedbackTaskId === item.task.id ? ' claim-success' : '') + (isDone ? ' torcha-task-claimed' : '');
      li.style.marginBottom = 'var(--space-sm)';
      li.style.alignItems = 'center';
      li.setAttribute('role', 'listitem');
      li.innerHTML = '<span class="torcha-task-label" style="flex:1">' + escapeHtml(item.task.label) + ': ' + displayed + ' / ' + item.task.target + (isDone ? ' <span aria-label="Claimed">✓ Claimed</span>' : '') + '</span>';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary torcha-task-claim-btn';
      btn.textContent = 'Claim';
      btn.disabled = !item.canClaim;
      btn.addEventListener('click', function () {
        if (claimDailyTask(item.task.id)) {
          claimFeedbackTaskId = item.task.id;
          inventory = loadInventory();
          renderDailyTasks();
          renderPackPanel();
          setTimeout(function () {
            claimFeedbackTaskId = null;
            renderDailyTasks();
          }, 700);
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function renderInventoryPanel() {
    renderUnifiedFilters('');
    const progress = getProgress();
    const textEl = el('torcha-progress-text');
    if (textEl) textEl.innerHTML = 'Overall: <strong>' + progress.overall.owned + '</strong> / <strong>' + progress.overall.total + '</strong> unique cards';
    const fillEl = el('torcha-progress-fill');
    if (fillEl) {
      const pct = progress.overall.total ? (100 * progress.overall.owned / progress.overall.total) : 0;
      fillEl.style.width = pct + '%';
      fillEl.setAttribute('aria-valuenow', progress.overall.owned);
      fillEl.setAttribute('aria-valuemax', progress.overall.total);
    }
    const seasonContainer = el('torcha-season-progress');
    if (seasonContainer) {
      seasonContainer.innerHTML = '';
      SEASONS.forEach(function (s) {
        const data = progress.bySeason[s];
        const div = document.createElement('div');
        div.className = 'torcha-season-progress-item';
        const pct = data.total ? (100 * data.owned / data.total) : 0;
        div.innerHTML = '<label>S' + s + '</label><div class="torcha-progress-bar"><div class="torcha-progress-fill" role="progressbar" aria-valuenow="' + data.owned + '" aria-valuemin="0" aria-valuemax="' + data.total + '" style="width:' + pct + '%"></div></div><span style="font-size:0.75rem;color:#4a5f73">' + data.owned + '/' + data.total + '</span>';
        seasonContainer.appendChild(div);
      });
    }
    const filtered = getFilteredEntries();
    const grid = el('torcha-collection-grid');
    const emptyEl = el('torcha-collection-empty');
    if (grid) {
      grid.innerHTML = '';
      filtered.forEach(function (_ref) {
        const card = _ref.card;
        const count = _ref.count;
        const node = renderCardEl(card, { collection: true, count });
        grid.appendChild(node);
      });
    }
    if (emptyEl) toggleHidden(emptyEl, filtered.length > 0);
  }

  function renderExpansionFilter() {
    const sel = el('torcha-filter-expansion');
    if (!sel) return;
    let html = '<option value="">All expansions</option>';
    EXPANSIONS.forEach(function (e) {
      html += '<option value="' + e.id + '"' + (filterExpansion === e.id ? ' selected' : '') + '>' + escapeHtml(getExpansionDisplay(e)) + '</option>';
    });
    sel.innerHTML = html;
  }

  function renderRarityFilter() {
    const sel = el('torcha-filter-rarity');
    if (!sel) return;
    const options = [{ value: '', label: 'All rarities' }].concat(RARITIES.map(function (r) { return { value: r, label: formatRarityLabel(r) }; }));
    sel.innerHTML = options.map(function (o) { return '<option value="' + o.value + '"' + (filterRarity === o.value ? ' selected' : '') + '>' + o.label + '</option>'; }).join('');
  }

  function renderSeasonFilter() {
    const sel = el('torcha-filter-season');
    if (!sel) return;
    let html = '<option value="">All seasons</option>';
    SEASONS.forEach(function (s) {
      html += '<option value="' + s + '"' + (filterSeason === s ? ' selected' : '') + '>' + escapeHtml(getSeasonDisplay(s)) + '</option>';
    });
    sel.innerHTML = html;
  }

  const SORT_OPTIONS = [
    { id: 'season', label: 'Season' },
    { id: 'name', label: 'Name (A–Z)' },
    { id: 'power', label: 'Power (high first)' },
    { id: 'social', label: 'Social (high first)' },
  ];

  function renderSortFilter(selectId) {
    const sel = el(selectId);
    if (!sel) return;
    let html = '';
    SORT_OPTIONS.forEach(function (o) {
      html += '<option value="' + o.id + '"' + (filterSort === o.id ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
    });
    sel.innerHTML = html;
  }

  function renderUnifiedFilters(prefix) {
    const expansionId = prefix ? 'torcha-' + prefix + '-filter-expansion' : 'torcha-filter-expansion';
    const seasonId = prefix ? 'torcha-' + prefix + '-filter-season' : 'torcha-filter-season';
    const rarityId = prefix ? 'torcha-' + prefix + '-filter-rarity' : 'torcha-filter-rarity';
    const sortId = prefix ? 'torcha-' + prefix + '-filter-sort' : 'torcha-filter-sort';
    const expSel = el(expansionId);
    const seaSel = el(seasonId);
    const rarSel = el(rarityId);
    if (expSel) {
      let h = '<option value="">All expansions</option>';
      EXPANSIONS.forEach(function (e) {
        h += '<option value="' + e.id + '"' + (filterExpansion === e.id ? ' selected' : '') + '>' + escapeHtml(getExpansionDisplay(e)) + '</option>';
      });
      expSel.innerHTML = h;
    }
    if (seaSel) {
      let h = '<option value="">All seasons</option>';
      SEASONS.forEach(function (s) {
        h += '<option value="' + s + '"' + (filterSeason === s ? ' selected' : '') + '>' + escapeHtml(getSeasonDisplay(s)) + '</option>';
      });
      seaSel.innerHTML = h;
    }
    if (rarSel) {
      const options = [{ value: '', label: 'All rarities' }].concat(RARITIES.map(function (r) { return { value: r, label: formatRarityLabel(r) }; }));
      rarSel.innerHTML = options.map(function (o) { return '<option value="' + o.value + '"' + (filterRarity === o.value ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>'; }).join('');
    }
    renderSortFilter(sortId);
  }

  function renderPvpPanel() {
    renderUnifiedFilters('pvp');
    const filtered = getFilteredEntries();
    const deckIds = pvpDeck;
    const pool = filtered.filter(function (_ref) { return !deckIds.includes(_ref.card.id); });
    const statsEl = el('torcha-pvp-stats');
    const wins = loadPvpWins();
    const winsToday = loadPvpWinsToday();
    if (statsEl) statsEl.innerHTML = 'Wins: <strong>' + wins + '</strong> (today: <strong>' + winsToday + '</strong>) · +1 pack every 10 wins';
    const poolEl = el('torcha-pvp-pool');
    if (poolEl) {
      poolEl.innerHTML = '';
      pool.forEach(function (_ref) {
        const card = _ref.card;
        const btn = renderCardEl(card, { button: true });
        btn.style.cursor = 'pointer';
        btn.style.borderWidth = '2px';
        btn.addEventListener('click', function () {
          if (pvpDeck.length < 5) {
            pvpDeck = pvpDeck.concat(card.id);
            renderPvpPanel();
          }
        });
        poolEl.appendChild(btn);
      });
    }
    const deckLabel = el('torcha-pvp-deck-label');
    if (deckLabel) deckLabel.textContent = 'Deck: ' + deckIds.length + '/5';
    const deckEl = el('torcha-pvp-deck');
    if (deckEl) {
      deckEl.innerHTML = '';
      deckIds.forEach(function (id) {
        const card = getCardById(cards, id);
        if (!card) return;
        const chip = document.createElement('span');
        chip.className = 'torcha-pvp-deck-chip';
        chip.textContent = card.name;
        deckEl.appendChild(chip);
      });
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn-secondary';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', function () {
        pvpDeck = [];
        renderPvpPanel();
      });
      deckEl.appendChild(clearBtn);
    }
    const fightBtn = el('torcha-pvp-fight');
    if (fightBtn) fightBtn.disabled = deckIds.length !== 5;
  }

  function showBattleSetup() {
    var setup = el('torcha-battle-setup');
    var battle = el('torcha-battle-result');
    if (setup) toggleHidden(setup, false);
    if (battle) toggleHidden(battle, true);
  }

  function showBattleView() {
    var setup = el('torcha-battle-setup');
    var battle = el('torcha-battle-result');
    if (setup) toggleHidden(setup, true);
    if (battle) toggleHidden(battle, false);
  }

  function renderBattleResult(result, onComplete) {
    var container = el('torcha-battle-result');
    var lifeYouEl = el('torcha-battle-life-you');
    var lifeCpuEl = el('torcha-battle-life-cpu');
    var barYouEl = el('torcha-battle-bar-you');
    var barCpuEl = el('torcha-battle-bar-cpu');
    var logEl = el('torcha-battle-log');
    var outcomeEl = el('torcha-battle-outcome');
    var againBtn = el('torcha-battle-again');
    if (!container || !logEl || !outcomeEl) { if (onComplete) onComplete(); return; }
    toggleHidden(container, false);
    logEl.innerHTML = '';
    outcomeEl.innerHTML = '';
    outcomeEl.className = 'torcha-battle-outcome';
    if (againBtn) toggleHidden(againBtn, true);

    if (lifeYouEl) lifeYouEl.textContent = result.userLifeInitial + ' / ' + result.userLifeInitial + ' HP';
    if (lifeCpuEl) lifeCpuEl.textContent = result.cpuLifeInitial + ' / ' + result.cpuLifeInitial + ' HP';
    if (barYouEl) barYouEl.style.width = '100%';
    if (barCpuEl) barCpuEl.style.width = '100%';

    var delay = 500;
    var logIndex = 0;
    function showNextLog() {
      if (logIndex >= result.log.length) {
        if (barYouEl) barYouEl.style.width = (100 * result.userLife / result.userLifeInitial) + '%';
        if (barCpuEl) barCpuEl.style.width = (100 * result.cpuLife / result.cpuLifeInitial) + '%';
        if (lifeYouEl) lifeYouEl.textContent = result.userLife + ' / ' + result.userLifeInitial + ' HP';
        if (lifeCpuEl) lifeCpuEl.textContent = result.cpuLife + ' / ' + result.cpuLifeInitial + ' HP';
        outcomeEl.textContent = result.userWon ? 'Victory!' : 'Defeat';
        outcomeEl.classList.add(result.userWon ? 'torcha-battle-victory' : 'torcha-battle-defeat');
        if (againBtn) toggleHidden(againBtn, false);
        if (onComplete) onComplete();
        return;
      }
      var entry = result.log[logIndex];
      var row = document.createElement('div');
      row.className = 'torcha-battle-log-line torcha-battle-log-' + entry.side;
      row.innerHTML =
        '<span class="torcha-battle-log-attacker">' + escapeHtml(entry.name) + '</span> ' +
        ' hits for <strong>' + entry.damage + '</strong> damage. ' +
        (entry.side === 'user' ? 'CPU' : 'You') + ' at <strong>' + entry.defenderLife + ' HP</strong>.';
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
      if (entry.side === 'user') {
        if (barCpuEl) barCpuEl.style.width = (100 * entry.defenderLife / result.cpuLifeInitial) + '%';
        if (lifeCpuEl) lifeCpuEl.textContent = entry.defenderLife + ' / ' + result.cpuLifeInitial + ' HP';
      } else {
        if (barYouEl) barYouEl.style.width = (100 * entry.defenderLife / result.userLifeInitial) + '%';
        if (lifeYouEl) lifeYouEl.textContent = entry.defenderLife + ' / ' + result.userLifeInitial + ' HP';
      }
      logIndex++;
      setTimeout(showNextLog, delay);
    }
    setTimeout(showNextLog, delay);
  }

  function hideBattleResult() {
    var container = el('torcha-battle-result');
    if (container) toggleHidden(container, true);
  }

  function renderShredPanel() {
    renderUnifiedFilters('shred');
    const tokens = loadFireTokens();
    const textEl = el('torcha-fire-tokens-text');
    if (textEl) {
      textEl.innerHTML = 'Fire Tokens: <strong>' + tokens.toLocaleString() + '</strong>';
    }
    const filtered = getFilteredEntries().filter(function (_ref) { return _ref.count >= 2; });
    const grid = el('torcha-shred-grid');
    if (grid) {
      grid.innerHTML = '';
      filtered.forEach(function (_ref) {
        const card = _ref.card;
        const count = _ref.count;
        const tokensPer = Math.floor(FIRE_TOKEN_COSTS[card.rarity] / 10);
        const btn = renderCardEl(card, { button: true, collection: true, count, shredTokens: tokensPer });
        btn.style.cursor = 'pointer';
        btn.style.borderWidth = '2px';
        const isSelected = shredSelected.includes(card.id);
        btn.setAttribute('aria-pressed', isSelected);
        if (isSelected) btn.classList.add('torcha-card-selected');
        btn.addEventListener('click', function () {
          if (shredSelected.indexOf(card.id) >= 0) shredSelected = shredSelected.filter(function (id) { return id !== card.id; });
          else shredSelected = shredSelected.concat(card.id);
          renderShredPanel();
        });
        grid.appendChild(btn);
      });
    }
    const shredBtn = el('torcha-shred-btn');
    if (shredBtn) {
      shredBtn.textContent = 'Shred (' + shredSelected.length + ' cards)';
      shredBtn.disabled = shredSelected.length === 0;
    }
  }

  function renderBuyButtons() {
    const container = el('torcha-buy-buttons');
    if (!container) return;
    container.innerHTML = '';
    const tokens = loadFireTokens();
    RARITIES.forEach(function (rarity) {
      const cost = FIRE_TOKEN_COSTS[rarity];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary torcha-rarity-' + rarity;
      btn.textContent = formatRarityLabel(rarity) + ' — ' + cost.toLocaleString() + ' tokens';
      btn.disabled = tokens < cost;
      btn.addEventListener('click', function () {
        if (tokens < cost) return;
        const card = drawRandomCardByRarity(cards, rarity);
        if (!card || !spendFireTokens(cost)) return;
        inventory = addToInventory(inventory, card.id, 1);
        saveInventory(inventory);
        renderReveal([card]);
        renderShredPanel();
        renderBuyButtons();
        renderInventoryPanel();
        renderDailyTasks();
      });
      container.appendChild(btn);
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.torcha-tab').forEach(function (t) {
      const id = t.id && t.id.replace('torcha-tab-', '');
      t.classList.toggle('torcha-tab-active', id === tabId);
      t.setAttribute('aria-selected', id === tabId);
    });
    document.querySelectorAll('.torcha-panel').forEach(function (p) {
      const id = p.id && p.id.replace('torcha-panel-', '');
      toggleHidden(p, id !== tabId);
    });
    if (tabId === 'pack') { renderPackPanel(); renderDailyTasks(); }
    else if (tabId === 'inventory') renderInventoryPanel();
    else if (tabId === 'battle') { renderPvpPanel(); showBattleSetup(); }
    else if (tabId === 'raids') { renderShredPanel(); renderBuyButtons(); }
  }

  function getReleasedCards() {
    return cards.filter(function (c) { return SEASONS.indexOf(c.season) !== -1; });
  }

  function getCardsForExpansion(expansionId) {
    if (!expansionId) return [];
    const exp = EXPANSIONS.find(function (e) { return e.id === expansionId; });
    if (!exp || !exp.seasons) return [];
    return cards.filter(function (c) { return exp.seasons.indexOf(c.season) !== -1; });
  }

  function openPack() {
    const expansionId = (el('torcha-pack-expansion') && el('torcha-pack-expansion').value) || '';
    const pool = getCardsForExpansion(expansionId);
    if (!pool.length || packState.stock <= 0) return;
    const drawn = drawCards(pool, PACK_SIZE);
    const next = consumeOnePack(packState.stock, packState.nextPackAt);
    savePackState(next.stock, next.nextPackAt);
    drawn.forEach(function (c) {
      inventory = addToInventory(inventory, c.id, 1);
    });
    saveInventory(inventory);
    incrementPacksOpenedToday();
    packState = getPackState();
    isOpeningPack = true;
    el('torcha-pack-section') && el('torcha-pack-section').classList.add('is-opening');
    setTimeout(function () {
      isOpeningPack = false;
      el('torcha-pack-section') && el('torcha-pack-section').classList.remove('is-opening');
      renderReveal(drawn);
      renderPackPanel();
      renderDailyTasks();
      renderInventoryPanel();
    }, 520);
  }

  function doPvpFight() {
    if (pvpDeck.length !== 5) return;
    var userDeck = [];
    for (var i = 0; i < pvpDeck.length; i++) {
      var card = getCardById(cards, pvpDeck[i]);
      if (card && (inventory[card.id] || 0) > 0) userDeck.push(card);
    }
    if (userDeck.length !== 5) return;
    var released = getReleasedCards();
    var pool = released.length >= 5 ? released : cards;
    var cpuDeck = pickCpuDeckMatchmaking(userDeck, pool);
    if (cpuDeck.length < 5) {
      if (typeof alert !== 'undefined') alert('Not enough cards in the pool to form the CPU deck. Try again.');
      return;
    }
    showBattleView();
    var result = runLifeBattle(userDeck, cpuDeck);
    if (result.userWon) {
      savePvpWin();
      var total = loadPvpWins();
      if (total > 0 && total % PVP_PACK_REWARD_EVERY === 0) {
        var state = getPackState();
        var next = addPacksToStock(state.stock, state.nextPackAt, 1);
        savePackState(next.stock, next.nextPackAt);
        packState = getPackState();
      }
    }
    renderBattleResult(result, function () {
      renderPvpPanel();
      renderPackPanel();
      renderDailyTasks();
    });
  }

  function doShred() {
    if (shredSelected.length === 0) return;
    const toUse = shredSelected.filter(function (id) { return (inventory[id] || 0) >= 2; });
    let tokensEarned = 0;
    toUse.forEach(function (id) {
      const next = removeFromInventory(inventory, id);
      if (next) {
        inventory = next;
        const card = getCardById(cards, id);
        if (card) tokensEarned += Math.floor(FIRE_TOKEN_COSTS[card.rarity] / 10);
        addRaidCardsUsedToday([id]);
      }
    });
    saveInventory(inventory);
    if (tokensEarned > 0) addFireTokens(tokensEarned);
    shredSelected = [];
    renderShredPanel();
    renderBuyButtons();
    renderInventoryPanel();
    renderDailyTasks();
  }

  function initTabs() {
    ['pack', 'inventory', 'battle', 'raids'].forEach(function (tabId) {
      const btn = el('torcha-tab-' + tabId);
      if (btn) btn.addEventListener('click', function () { switchTab(tabId); });
    });
  }

  function getExpansionSeasonRange(exp) {
    if (!exp || !exp.seasons || exp.seasons.length === 0) return '';
    const min = Math.min.apply(null, exp.seasons);
    const max = Math.max.apply(null, exp.seasons);
    return 'Seasons ' + min + '–' + max;
  }

  function updateExpansionCarouselSelected() {
    const expansionId = (el('torcha-pack-expansion') && el('torcha-pack-expansion').value) || '';
    const track = el('torcha-carousel-track');
    if (!track) return;
    track.querySelectorAll('.torcha-expansion-cover').forEach(function (node) {
      node.classList.toggle('torcha-cover-selected', node.getAttribute('data-expansion') === expansionId);
    });
  }

  function scrollSelectedCoverIntoView() {
    const track = el('torcha-carousel-track');
    if (!track) return;
    const selected = track.querySelector('.torcha-expansion-cover.torcha-cover-selected');
    if (selected) selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function selectPrevExpansion() {
    const expansionSel = el('torcha-pack-expansion');
    if (!expansionSel || !EXPANSIONS.length) return;
    const currentId = expansionSel.value || EXPANSIONS[0].id;
    const idx = EXPANSIONS.findIndex(function (e) { return e.id === currentId; });
    const newIdx = idx <= 0 ? EXPANSIONS.length - 1 : idx - 1;
    expansionSel.value = EXPANSIONS[newIdx].id;
    updateExpansionCarouselSelected();
    scrollSelectedCoverIntoView();
    renderPackPanel();
  }

  function selectNextExpansion() {
    const expansionSel = el('torcha-pack-expansion');
    if (!expansionSel || !EXPANSIONS.length) return;
    const currentId = expansionSel.value || EXPANSIONS[0].id;
    const idx = EXPANSIONS.findIndex(function (e) { return e.id === currentId; });
    const newIdx = idx >= EXPANSIONS.length - 1 ? 0 : idx + 1;
    expansionSel.value = EXPANSIONS[newIdx].id;
    updateExpansionCarouselSelected();
    scrollSelectedCoverIntoView();
    renderPackPanel();
  }

  function renderExpansionCarousel() {
    const track = el('torcha-carousel-track');
    const expansionSel = el('torcha-pack-expansion');
    if (!track || !expansionSel) return;
    track.innerHTML = '';
    EXPANSIONS.forEach(function (e) {
      const cover = document.createElement('button');
      cover.type = 'button';
      cover.className = 'torcha-expansion-cover';
      cover.setAttribute('data-expansion', e.id);
      cover.setAttribute('role', 'listitem');
      cover.innerHTML = '<span class="torcha-cover-art" aria-hidden="true"><span class="torcha-cover-name">' + escapeHtml(e.name) + '</span></span><span class="torcha-cover-label"><span class="torcha-cover-sub">' + escapeHtml(getExpansionSeasonRange(e)) + '</span></span>';
      cover.addEventListener('click', function () {
        expansionSel.value = e.id;
        updateExpansionCarouselSelected();
        renderPackPanel();
        openPack();
      });
      track.appendChild(cover);
    });
    updateExpansionCarouselSelected();
  }

  function initCarouselNav() {
    const prevBtn = el('torcha-carousel-prev');
    const nextBtn = el('torcha-carousel-next');
    if (prevBtn) prevBtn.addEventListener('click', selectPrevExpansion);
    if (nextBtn) nextBtn.addEventListener('click', selectNextExpansion);
  }

  function initPackExpansion() {
    const sel = el('torcha-pack-expansion');
    if (!sel) return;
    sel.innerHTML = '';
    EXPANSIONS.forEach(function (e) {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = getExpansionDisplay(e);
      sel.appendChild(opt);
    });
    if (EXPANSIONS.length && !sel.value) sel.value = EXPANSIONS[0].id;
    renderExpansionCarousel();
    initCarouselNav();
  }

  function syncFilterFromSelect(expansionSel, seasonSel, raritySel, sortSel) {
    if (expansionSel) filterExpansion = expansionSel.value || '';
    if (seasonSel) filterSeason = seasonSel.value === '' ? '' : parseInt(seasonSel.value, 10);
    if (raritySel) filterRarity = raritySel.value || '';
    if (sortSel) filterSort = sortSel.value || 'season';
  }

  function initFilters() {
    const expansionSel = el('torcha-filter-expansion');
    const raritySel = el('torcha-filter-rarity');
    const seasonSel = el('torcha-filter-season');
    const sortSel = el('torcha-filter-sort');
    if (expansionSel) expansionSel.addEventListener('change', function () { filterExpansion = expansionSel.value || ''; renderInventoryPanel(); });
    if (raritySel) raritySel.addEventListener('change', function () { filterRarity = raritySel.value || ''; renderInventoryPanel(); });
    if (seasonSel) seasonSel.addEventListener('change', function () { filterSeason = seasonSel.value === '' ? '' : parseInt(seasonSel.value, 10); renderInventoryPanel(); });
    if (sortSel) sortSel.addEventListener('change', function () { filterSort = sortSel.value || 'season'; renderInventoryPanel(); });

    const pvpExp = el('torcha-pvp-filter-expansion');
    const pvpSea = el('torcha-pvp-filter-season');
    const pvpRar = el('torcha-pvp-filter-rarity');
    const pvpSort = el('torcha-pvp-filter-sort');
    function onPvpFilterChange() {
      syncFilterFromSelect(pvpExp, pvpSea, pvpRar, pvpSort);
      renderPvpPanel();
    }
    if (pvpExp) pvpExp.addEventListener('change', onPvpFilterChange);
    if (pvpSea) pvpSea.addEventListener('change', onPvpFilterChange);
    if (pvpRar) pvpRar.addEventListener('change', onPvpFilterChange);
    if (pvpSort) pvpSort.addEventListener('change', onPvpFilterChange);

    const shredExp = el('torcha-shred-filter-expansion');
    const shredSea = el('torcha-shred-filter-season');
    const shredRar = el('torcha-shred-filter-rarity');
    const shredSort = el('torcha-shred-filter-sort');
    function onShredFilterChange() {
      syncFilterFromSelect(shredExp, shredSea, shredRar, shredSort);
      renderShredPanel();
    }
    if (shredExp) shredExp.addEventListener('change', onShredFilterChange);
    if (shredSea) shredSea.addEventListener('change', onShredFilterChange);
    if (shredRar) shredRar.addEventListener('change', onShredFilterChange);
    if (shredSort) shredSort.addEventListener('change', onShredFilterChange);
  }

  function init() {
    if (typeof window.recordToolUsed === 'function') window.recordToolUsed('torcha');
    incrementSessionsToday();
    fetch('torcha-cards.json')
      .then(function (res) { if (!res.ok) throw new Error('Failed to load cards'); return res.json(); })
      .then(function (data) {
        cards = data.filter(function (c) {
          return !CARD_BLOCKLIST_NAMES.has((c.name || '').trim().toLowerCase());
        });
        packState = getPackState();
        inventory = loadInventory();
        toggleHidden(el('torcha-loading'), true);
        toggleHidden(el('torcha-main-card'), false);
        toggleHidden(el('torcha-app'), false);
        initTabs();
        initPackExpansion();
        renderExpansionFilter();
        renderRarityFilter();
        renderSeasonFilter();
        initFilters();
        switchTab('pack');
        el('torcha-reveal-close') && el('torcha-reveal-close').addEventListener('click', closeReveal);
        el('torcha-open-pack-btn') && el('torcha-open-pack-btn').addEventListener('click', openPack);
        el('torcha-pack-expansion') && el('torcha-pack-expansion').addEventListener('change', renderPackPanel);
        var saveBtn = el('torcha-save-session');
        var loadBtn = el('torcha-load-session');
        var resetBtn = el('torcha-reset-session');
        var importFileInput = el('torcha-import-session-file');
        if (saveBtn) saveBtn.addEventListener('click', exportSession);
        if (loadBtn) loadBtn.addEventListener('click', function () { if (importFileInput) importFileInput.click(); });
        if (importFileInput) importFileInput.addEventListener('change', function (e) { importSessionFile(e.target.files[0]); e.target.value = ''; });
        if (resetBtn) resetBtn.addEventListener('click', resetSession);
        el('torcha-pvp-fight') && el('torcha-pvp-fight').addEventListener('click', doPvpFight);
        el('torcha-battle-again') && el('torcha-battle-again').addEventListener('click', showBattleSetup);
        el('torcha-shred-btn') && el('torcha-shred-btn').addEventListener('click', doShred);
        setInterval(renderTimer, 1000);
      })
      .catch(function (err) {
        var loading = el('torcha-loading');
        if (loading) loading.innerHTML = '<p class="section-title">Failed to load cards. Check that torcha-cards.json exists.</p>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
