/**
 * Torcha – gacha card game (vanilla JS port for The Survivalist)
 * Uses torcha-cards.json, localStorage for persistence.
 */
(function () {
  'use strict';

  const RESPAWN_MIN = 15;
  const MAX_STOCK = 10;
  const PACK_SIZE = 5;
  const PAGE_SIZE = 48;
  const DEX_PAGE_SIZE = 24;
  const PVP_PACK_REWARD_EVERY = 10;
  const PACKS_PER_CLAIM = 2;
  const EXPANSIONS = [
    { id: 'dawn-of-the-legends', name: 'Dawn of the Legends', seasons: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'age-of-exile', name: 'Age of Exile', seasons: [9, 10, 11, 12, 13, 14, 15] },
    { id: 'webs-of-deceit', name: 'Webs of Deceit', seasons: [16, 17, 18, 19, 20] },
    { id: 'bonds-and-betrayals', name: 'Bonds and Betrayals', seasons: [21, 22, 23, 24, 25, 26, 27] },
    { id: 'shadows-of-the-council', name: 'Shadows of the Council', seasons: [28, 29, 30, 31, 32, 33, 34] },
    { id: 'relics-of-power', name: 'Relics of Power', seasons: [35, 36, 37, 38, 39, 40] },
    { id: 'rise-of-a-new-era', name: 'Rise of a New Era', seasons: [41, 42, 43, 44] },
    { id: 'a-million-dollar-frenzy', name: 'A Million Dollar Frenzy', seasons: [45, 46, 47, 48, 49] },
    { id: 'the-pantheon', name: 'The Pantheon', seasons: [50] },
  ];

  /** Expansion ids not yet released (hidden from carousel, pack select, filters). Visible: Dawn of the Legends through A Million Dollar Frenzy; hidden: The Pantheon (S50). */
  const HIDDEN_EXPANSION_IDS = ['the-pantheon'];

  function getVisibleExpansions() {
    return EXPANSIONS.filter(function (e) { return HIDDEN_EXPANSION_IDS.indexOf(e.id) === -1; });
  }

  /** Seasons in visible expansions only (for filters and released card pool). */
  const SEASONS = getVisibleExpansions().reduce(function (acc, e) {
    (e.seasons || []).forEach(function (s) { if (acc.indexOf(s) === -1) acc.push(s); });
    return acc;
  }, []).sort(function (a, b) { return a - b; });

  /** Contestants excluded from the card pool (by exact name match, case-insensitive). */
  const CARD_BLOCKLIST_NAMES = new Set(['dan spilo', 'michael skupin', 'jeff varner']);

  const RARITY_PROBS = { common: 0.642, rare: 0.210, super_rare: 0.088, legend: 0.055, mt_rushmore: 0.005 };
  const RARITIES = ['common', 'rare', 'super_rare', 'legend', 'mt_rushmore'];
  const FIRE_TOKEN_COSTS = { common: 500, rare: 1000, super_rare: 5000, legend: 10000, mt_rushmore: 20000 };

  const DAILY_TASKS = [
    { id: 'open_5_packs', label: 'Open 5 packs', target: 5 },
    { id: 'win_3_pvp', label: 'Win 3 challenges', target: 3 },
    { id: 'contribute_500_raid', label: 'Earn 500 Fire Tokens', target: 500 },
    { id: 'shred_3_cards', label: 'Shred 3 cards', target: 3 },
    { id: 'play_10_challenges', label: 'Play 10 challenges', target: 10 },
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
    if (rarity === 'mt_rushmore') return 'Mt. Rushmore';
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
    challengePlayedToday: 'torcha_challenge_played_today',
    challengeLastReset: 'torcha_challenge_last_reset',
    shredCardsToday: 'torcha_shred_cards_today',
    shredLastReset: 'torcha_shred_last_reset',
    fireTokens: 'torcha_fire_tokens',
    fireEarnedToday: 'torcha_fire_tokens_earned_today',
    fireLastReset: 'torcha_fire_tokens_last_reset',
    favorites: 'torcha_favorites',
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

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE.favorites);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (_) { return []; }
  }

  function saveFavorites(ids) {
    localStorage.setItem(STORAGE.favorites, JSON.stringify(ids));
  }

  function isFavorite(cardId) {
    return loadFavorites().indexOf(cardId) !== -1;
  }

  function toggleFavorite(cardId) {
    const list = loadFavorites();
    const i = list.indexOf(cardId);
    if (i === -1) list.push(cardId);
    else list.splice(i, 1);
    saveFavorites(list);
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

  function getShredCardsToday() {
    if (localStorage.getItem(STORAGE.shredLastReset) !== todayKey()) return 0;
    const raw = localStorage.getItem(STORAGE.shredCardsToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function addShredCardsToday(n) {
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.shredLastReset);
    let count = getShredCardsToday();
    if (last !== today) count = 0;
    count += n;
    localStorage.setItem(STORAGE.shredCardsToday, String(count));
    localStorage.setItem(STORAGE.shredLastReset, today);
  }

  function getChallengePlayedToday() {
    if (localStorage.getItem(STORAGE.challengeLastReset) !== todayKey()) return 0;
    const raw = localStorage.getItem(STORAGE.challengePlayedToday);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function addChallengePlayedToday() {
    const today = todayKey();
    const last = localStorage.getItem(STORAGE.challengeLastReset);
    let count = getChallengePlayedToday();
    if (last !== today) count = 0;
    count += 1;
    localStorage.setItem(STORAGE.challengePlayedToday, String(count));
    localStorage.setItem(STORAGE.challengeLastReset, today);
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

  var ALLOWED_STORAGE_KEYS;
  function getAllowedStorageKeys() {
    if (ALLOWED_STORAGE_KEYS) return ALLOWED_STORAGE_KEYS;
    ALLOWED_STORAGE_KEYS = new Set(Object.keys(STORAGE).map(function (k) { return STORAGE[k]; }));
    return ALLOWED_STORAGE_KEYS;
  }

  var MAX_IMPORT_JSON_LENGTH = 2 * 1024 * 1024; // 2MB

  function importSessionFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const str = e.target.result;
        if (typeof str !== 'string' || str.length > MAX_IMPORT_JSON_LENGTH) {
          showTorchaModal({ title: 'Load session', body: 'File too large or invalid.', primaryLabel: 'OK' });
          return;
        }
        const raw = JSON.parse(str);
        if (!raw || typeof raw !== 'object' || raw.tool !== 'Torcha') {
          showTorchaModal({ title: 'Load session', body: 'Invalid file. This is not a Torcha session.', primaryLabel: 'OK' });
          return;
        }
        if (raw.version !== SESSION_VERSION) {
          showTorchaModal({ title: 'Load session', body: 'Unsupported file version.', primaryLabel: 'OK' });
          return;
        }
        const data = raw.data;
        if (!data || typeof data !== 'object') {
          showTorchaModal({ title: 'Load session', body: 'Invalid session data.', primaryLabel: 'OK' });
          return;
        }
        const allowed = getAllowedStorageKeys();
        Object.keys(data).forEach(function (key) {
          if (!allowed.has(key)) return;
          const val = data[key];
          if (val == null) return;
          localStorage.setItem(key, String(val));
        });
        refreshSessionUI();
        showTorchaModal({ title: 'Load session', body: 'Session loaded. Saved at: ' + (raw.savedAt || 'unknown'), primaryLabel: 'OK' });
      } catch (err) {
        showTorchaModal({ title: 'Load session', body: 'Invalid JSON file: ' + (err.message || err), primaryLabel: 'OK' });
      }
    };
    reader.readAsText(file);
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
    renderDexPanel();
  }

  var torchaModalPreviousFocus = null;
  var torchaModalEscapeHandler = null;

  function showTorchaModal(options) {
    var overlay = el('torcha-modal-overlay');
    var titleEl = el('torcha-modal-title');
    var bodyEl = el('torcha-modal-body');
    var primaryBtn = el('torcha-modal-primary');
    var secondaryBtn = el('torcha-modal-secondary');
    if (!overlay || !titleEl || !bodyEl || !primaryBtn) return;
    titleEl.textContent = options.title || '';
    bodyEl.textContent = options.body || '';
    primaryBtn.textContent = options.primaryLabel || 'OK';
    primaryBtn.onclick = function () {
      if (typeof options.onPrimary === 'function') options.onPrimary();
      hideTorchaModal();
    };
    if (options.secondaryLabel && secondaryBtn) {
      secondaryBtn.textContent = options.secondaryLabel;
      secondaryBtn.classList.remove('hidden');
      secondaryBtn.onclick = function () {
        if (typeof options.onSecondary === 'function') options.onSecondary();
        hideTorchaModal();
      };
    } else if (secondaryBtn) {
      secondaryBtn.classList.add('hidden');
    }
    torchaModalPreviousFocus = document.activeElement;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    primaryBtn.focus();
    torchaModalEscapeHandler = function (e) {
      if (e.key === 'Escape') {
        if (typeof options.onSecondary === 'function') options.onSecondary();
        hideTorchaModal();
      }
    };
    document.addEventListener('keydown', torchaModalEscapeHandler);
  }

  function hideTorchaModal() {
    var overlay = el('torcha-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    if (torchaModalEscapeHandler) {
      document.removeEventListener('keydown', torchaModalEscapeHandler);
      torchaModalEscapeHandler = null;
    }
    if (torchaModalPreviousFocus && typeof torchaModalPreviousFocus.focus === 'function') {
      torchaModalPreviousFocus.focus();
    }
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
    const out = { common: [], rare: [], super_rare: [], legend: [], mt_rushmore: [] };
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

  /** Forza = Strength + Strategy (per matchmaking). */
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

  /** Counter score: tank → privilegia Strength; glass_cannon → privilegia Strategy; balanced → uguali. */
  function getCounterScore(card, profile) {
    var p = card.power || 0, s = card.social || 0;
    if (profile === 'tank') return p * 1.5 + s * 0.5;
    if (profile === 'glass_cannon') return p * 0.5 + s * 1.5;
    return p + s;
  }

  /** Single pass over the deck: returns totalStrength, totalStrategy and profile (tank/glass_cannon/balanced). */
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

  /** Challenge: proceeds until one life bar reaches 0 (first to 0 wins). CPU uses cards in ascending Strength order (weakest first). */
  function runLifeChallenge(userDeck, cpuDeck) {
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
  /** cardId -> { canonicalName, seasons, cardIds } for returnees (same person across seasons). Built from torcha-player-identities.json. */
  let playerIdentitiesByCardId = {};
  let inventory = loadInventory();
  let packState = { stock: MAX_STOCK, nextPackAt: 0 };
  let activeTab = 'pack';
  let pvpDeck = [];
  let shredSelected = [];
  let filterRarity = '';
  let filterSeason = '';
  let filterExpansion = '';
  let filterSort = 'season';
  let filterFavoritesOnly = false;
  let filterSearch = '';
  let inventoryPageOffset = 0;
  let dexSeasonOffsets = {};
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
      shred_3_cards: getShredCardsToday(),
      play_10_challenges: getChallengePlayedToday(),
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

  function cardMatchesSearch(card, q) {
    if (!q || typeof card.name !== 'string') return true;
    return card.name.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1;
  }

  function applyFiltersToEntries(entries) {
    const searchQ = filterSearch.trim();
    return entries.filter(function (_ref) {
      const card = _ref.card;
      if (HIDDEN_EXPANSION_IDS.indexOf(card.expansion) !== -1) return false;
      if (searchQ && !cardMatchesSearch(card, filterSearch)) return false;
      if (filterFavoritesOnly && !isFavorite(card.id)) return false;
      if (filterRarity && card.rarity !== filterRarity) return false;
      if (filterSeason !== '' && card.season !== filterSeason) return false;
      if (filterExpansion && card.expansion !== filterExpansion) return false;
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
      if (sortBy === 'rarity') {
        const ri = function (r) { const i = RARITIES.indexOf(r); return i === -1 ? -1 : i; };
        return ri(d.rarity) - ri(c.rarity);
      }
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
    const byExpansion = {};
    getVisibleExpansions().forEach(function (e) {
      const total = released.filter(function (c) { return (e.seasons || []).indexOf(c.season) !== -1; }).length;
      const ownedCount = released.filter(function (c) {
        return (e.seasons || []).indexOf(c.season) !== -1 && (inventory[c.id] || 0) > 0;
      }).length;
      byExpansion[e.id] = { owned: ownedCount, total, name: e.name };
    });
    return { overall: { owned: ownedUnique, total: totalUnique }, bySeason, byExpansion };
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
    let baseClass = 'torcha-card torcha-rarity-' + card.rarity;
    if (opts.missing) baseClass += ' torcha-card-missing';
    div.className = baseClass;
    if (opts.reveal) div.classList.add('torcha-reveal-card');
    if (opts.collection) div.classList.add('torcha-collection-card');
    if (opts.button) div.type = 'button';
    const seasonDisplay = getSeasonDisplay(card.season);
    const showStar = (opts.collection || opts.showFavorite) && !opts.dexView;
    const starReadOnly = !!opts.favoriteReadOnly;
    let html = '<div class="torcha-card-rarity">' + formatRarityLabel(card.rarity) + '</div>';
    html += '<div class="torcha-card-name">' + escapeHtml(card.name) + '</div>';
    html += '<div class="torcha-card-meta">' + escapeHtml(seasonDisplay) + '</div>';
    if (opts.missing) {
      html += '<div class="torcha-card-photo torcha-card-photo-missing"><div class="torcha-card-silhouette" aria-hidden="true"></div></div>';
    } else if (card.imageUrl) {
      html += '<div class="torcha-card-photo"><img src="' + escapeHtml(card.imageUrl) + '" alt="" loading="lazy"></div>';
    }
    if (showStar) {
      const fav = isFavorite(card.id);
      const starClass = 'torcha-favorite-star' + (fav ? ' is-favorite' : '') + (starReadOnly ? ' torcha-favorite-star-readonly' : '');
      const starLabel = starReadOnly ? (fav ? 'Favorite' : 'Not in favorites') : (fav ? 'Remove from favorites' : 'Add to favorites');
      const starChar = fav ? '★' : '☆';
      const countPart = opts.count > 1 ? '<span class="torcha-count-badge" aria-label="' + opts.count + ' copies">' + opts.count + '</span>' : '';
      const starAttrs = starReadOnly ? ' aria-label="' + starLabel + '"' : ' role="button" tabindex="0" data-card-id="' + escapeHtml(card.id) + '" aria-label="' + starLabel + '"';
      html = '<div class="torcha-card-top-row"><span class="' + starClass + '"' + starAttrs + '>' + starChar + '</span>' + countPart + '</div>' + html;
    } else if (opts.count > 1) {
      html = '<span class="torcha-count-badge" aria-label="' + opts.count + ' copies">' + opts.count + '</span>' + html;
    }
    if (opts.showStats !== false) {
      const powerVal = opts.missing ? '???' : card.power;
      const socialVal = opts.missing ? '???' : card.social;
      html += '<div class="torcha-card-stats">';
      html += '<span class="torcha-stat"><span class="torcha-stat-label" title="Attack power in challenges. Based on challenge performance, immunity, and confessionals.">Strength</span> ' + powerVal + '</span>';
      html += '<span class="torcha-stat"><span class="torcha-stat-label" title="Team HP in challenges. Based on advantages, influence, votes, and successful vote-outs.">Strategy</span> ' + socialVal + '</span>';
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
      timerEl.innerHTML = '<span style="display:block">Packs: <strong>' + packState.stock + '</strong> / ' + MAX_STOCK + '</span><span style="display:block">Next pack: <strong>' + formatTimeUntil(packState.nextPackAt) + '</strong></span>';
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
    if (textEl) {
      const pctOverall = progress.overall.total ? Math.round(100 * progress.overall.owned / progress.overall.total) : 0;
      textEl.className = 'torcha-stats-content torcha-progress-row';
      textEl.innerHTML = '<span>Overall: <strong>' + progress.overall.owned + '</strong> / <strong>' + progress.overall.total + '</strong> unique cards</span><span class="torcha-progress-pct">' + pctOverall + '%</span>';
    }
    const fillEl = el('torcha-progress-fill');
    if (fillEl) {
      const pct = progress.overall.total ? (100 * progress.overall.owned / progress.overall.total) : 0;
      fillEl.style.width = pct + '%';
      fillEl.setAttribute('aria-valuenow', progress.overall.owned);
      fillEl.setAttribute('aria-valuemax', progress.overall.total);
    }
    const expansionContainer = el('torcha-expansion-progress');
    if (expansionContainer && progress.byExpansion) {
      expansionContainer.innerHTML = '';
      getVisibleExpansions().forEach(function (e) {
        const data = progress.byExpansion[e.id];
        if (!data) return;
        const div = document.createElement('div');
        div.className = 'torcha-progress-item';
        const pct = data.total ? (100 * data.owned / data.total) : 0;
        const pctRounded = Math.round(pct);
        div.innerHTML = '<label class="torcha-progress-item-label">' + escapeHtml(data.name || e.name) + '</label><div class="torcha-progress-bar"><div class="torcha-progress-fill" role="progressbar" aria-valuenow="' + data.owned + '" aria-valuemin="0" aria-valuemax="' + data.total + '" style="width:' + pct + '%"></div></div><div class="torcha-progress-item-row"><span class="torcha-progress-item-count">' + data.owned + '/' + data.total + '</span><span class="torcha-progress-item-pct">' + pctRounded + '%</span></div>';
        expansionContainer.appendChild(div);
      });
    }
    const seasonContainer = el('torcha-season-progress');
    if (seasonContainer) {
      seasonContainer.innerHTML = '';
      SEASONS.forEach(function (s) {
        const data = progress.bySeason[s];
        const div = document.createElement('div');
        div.className = 'torcha-progress-item';
        const pct = data.total ? (100 * data.owned / data.total) : 0;
        const pctRounded = Math.round(pct);
        div.innerHTML = '<label class="torcha-progress-item-label">S' + s + '</label><div class="torcha-progress-bar"><div class="torcha-progress-fill" role="progressbar" aria-valuenow="' + data.owned + '" aria-valuemin="0" aria-valuemax="' + data.total + '" style="width:' + pct + '%"></div></div><div class="torcha-progress-item-row"><span class="torcha-progress-item-count">' + data.owned + '/' + data.total + '</span><span class="torcha-progress-item-pct">' + pctRounded + '%</span></div>';
        seasonContainer.appendChild(div);
      });
    }
    const favInv = el('torcha-favorites-only');
    if (favInv) favInv.checked = filterFavoritesOnly;
    const filtered = getFilteredEntries();
    const limit = (inventoryPageOffset + 1) * PAGE_SIZE;
    const toShow = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    const grid = el('torcha-collection-grid');
    const emptyEl = el('torcha-collection-empty');
    const loadMoreWrap = el('torcha-collection-load-more-wrap');
    if (grid) {
      grid.innerHTML = '';
      toShow.forEach(function (_ref) {
        const card = _ref.card;
        const count = _ref.count;
        const node = renderCardEl(card, { collection: true, count });
        grid.appendChild(node);
      });
    }
    if (emptyEl) toggleHidden(emptyEl, filtered.length > 0);
    if (loadMoreWrap) {
      loadMoreWrap.innerHTML = '';
      if (hasMore && filtered.length > 0) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary torcha-load-more-btn';
        btn.textContent = 'Load more (' + toShow.length + ' / ' + filtered.length + ')';
        btn.addEventListener('click', function () {
          inventoryPageOffset++;
          renderInventoryPanel();
        });
        loadMoreWrap.appendChild(btn);
      }
    }
  }

  function renderDexPanel() {
    const released = getReleasedCards();
    let entries = released.map(function (card) {
      const count = inventory[card.id] || 0;
      return { card: card, count: count };
    });
    const searchQ = filterSearch.trim();
    if (searchQ) entries = entries.filter(function (e) { return cardMatchesSearch(e.card, filterSearch); });
    const summaryEl = el('torcha-dex-summary');
    if (summaryEl) {
      const ownedCount = entries.filter(function (e) { return (inventory[e.card.id] || 0) > 0; }).length;
      const total = entries.length;
      summaryEl.innerHTML = 'Owned: <strong>' + ownedCount + '</strong> / ' + total + ' unique cards';
    }
    const container = el('torcha-dex-grid');
    if (!container) return;
    container.innerHTML = '';
    const bySeason = {};
    entries.forEach(function (entry) {
      const s = entry.card.season;
      if (!bySeason[s]) bySeason[s] = [];
      bySeason[s].push(entry);
    });
    const seasonOrder = Object.keys(bySeason).map(Number).sort(function (a, b) { return a - b; });
    seasonOrder.forEach(function (seasonNum, idx) {
      const list = bySeason[seasonNum].slice();
      list.sort(function (a, b) { return (a.card.name || '').localeCompare(b.card.name || '', undefined, { sensitivity: 'base' }); });
      const totalInSeason = list.length;
      const ownedInSeason = list.filter(function (e) { return (inventory[e.card.id] || 0) > 0; }).length;
      const pageOffset = dexSeasonOffsets[seasonNum] || 0;
      const limit = (pageOffset + 1) * DEX_PAGE_SIZE;
      const toShow = list.slice(0, limit);
      const hasMore = totalInSeason > limit;
      const details = document.createElement('details');
      details.className = 'torcha-dex-season';
      if (idx === 0) details.setAttribute('open', '');
      const summary = document.createElement('summary');
      summary.className = 'torcha-dex-season-title';
      summary.textContent = getSeasonDisplay(seasonNum) + ' (' + ownedInSeason + '/' + totalInSeason + ')';
      summary.setAttribute('aria-label', ownedInSeason + ' of ' + totalInSeason + ' cards owned');
      details.appendChild(summary);
      const grid = document.createElement('div');
      grid.className = 'torcha-collection-grid';
      toShow.forEach(function (_ref) {
        const card = _ref.card;
        const count = _ref.count;
        const owned = (inventory[card.id] || 0) > 0;
        const node = renderCardEl(card, {
          collection: true,
          count: owned ? count : 0,
          missing: !owned,
          dexView: true
        });
        grid.appendChild(node);
      });
      details.appendChild(grid);
      if (hasMore) {
        const loadMoreWrap = document.createElement('div');
        loadMoreWrap.className = 'torcha-load-more-wrap';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary torcha-load-more-btn';
        btn.textContent = 'Load more (' + toShow.length + ' / ' + totalInSeason + ')';
        btn.addEventListener('click', function () {
          dexSeasonOffsets[seasonNum] = pageOffset + 1;
          renderDexPanel();
        });
        loadMoreWrap.appendChild(btn);
        details.appendChild(loadMoreWrap);
      }
      container.appendChild(details);
    });
  }

  function renderExpansionFilter() {
    const sel = el('torcha-filter-expansion');
    if (!sel) return;
    let html = '<option value="">All expansions</option>';
    getVisibleExpansions().forEach(function (e) {
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
    { id: 'rarity', label: 'Rarity (rarest first)' },
    { id: 'power', label: 'Strength (high first)' },
    { id: 'social', label: 'Strategy (high first)' },
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
      getVisibleExpansions().forEach(function (e) {
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
    const filtersContainer = expSel ? expSel.closest('.torcha-filters') : null;
    const favCheckId = prefix ? 'torcha-' + prefix + '-favorites-only' : 'torcha-favorites-only';
    if (prefix !== 'shred') {
      if (filtersContainer && !el(favCheckId)) {
        const wrap = document.createElement('div');
        wrap.className = 'input-group torcha-favorites-toggle-wrap';
        wrap.innerHTML = '<label class="torcha-toggle-label"><input type="checkbox" id="' + favCheckId + '" class="torcha-toggle-input" aria-label="Show only favorite cards"><span class="torcha-toggle-track" aria-hidden="true"></span><span class="torcha-toggle-text">Favorites only</span></label>';
        filtersContainer.appendChild(wrap);
        const favCheck = el(favCheckId);
        if (favCheck) {
          favCheck.checked = filterFavoritesOnly;
          favCheck.addEventListener('change', function () {
            filterFavoritesOnly = favCheck.checked;
            if (prefix === 'pvp') renderPvpPanel();
            else if (prefix === 'dex') renderDexPanel();
            else renderInventoryPanel();
          });
        }
      }
      const favCheckExisting = el(favCheckId);
      if (favCheckExisting) favCheckExisting.checked = filterFavoritesOnly;
    }
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
        const count = _ref.count;
        const btn = renderCardEl(card, { button: true, showFavorite: true, favoriteReadOnly: true, count: count });
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

  function showChallengeSetup() {
    var setup = el('torcha-challenge-setup');
    var result = el('torcha-challenge-result');
    if (setup) toggleHidden(setup, false);
    if (result) toggleHidden(result, true);
  }

  function showChallengeView() {
    var setup = el('torcha-challenge-setup');
    var result = el('torcha-challenge-result');
    if (setup) toggleHidden(setup, true);
    if (result) toggleHidden(result, false);
  }

  function renderChallengeResult(result, onComplete) {
    var container = el('torcha-challenge-result');
    var lifeYouEl = el('torcha-challenge-life-you');
    var lifeCpuEl = el('torcha-challenge-life-cpu');
    var barYouEl = el('torcha-challenge-bar-you');
    var barCpuEl = el('torcha-challenge-bar-cpu');
    var logEl = el('torcha-challenge-log');
    var outcomeEl = el('torcha-challenge-outcome');
    var againBtn = el('torcha-challenge-again');
    if (!container || !logEl || !outcomeEl) { if (onComplete) onComplete(); return; }
    toggleHidden(container, false);
    logEl.innerHTML = '';
    outcomeEl.innerHTML = '';
    outcomeEl.className = 'torcha-challenge-outcome';
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
        outcomeEl.classList.add(result.userWon ? 'torcha-challenge-victory' : 'torcha-challenge-defeat');
        if (againBtn) toggleHidden(againBtn, false);
        if (onComplete) onComplete();
        return;
      }
      var entry = result.log[logIndex];
      var row = document.createElement('div');
      row.className = 'torcha-challenge-log-line torcha-challenge-log-' + entry.side;
      row.innerHTML =
        '<span class="torcha-challenge-log-attacker">' + escapeHtml(entry.name) + '</span> ' +
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

  function hideChallengeResult() {
    var container = el('torcha-challenge-result');
    if (container) toggleHidden(container, true);
  }

  function renderShredPanel() {
    renderUnifiedFilters('shred');
    const tokens = loadFireTokens();
    const textEl = el('torcha-fire-tokens-text');
    if (textEl) {
      textEl.innerHTML = 'Fire Tokens: <strong>' + tokens.toLocaleString() + '</strong>';
    }
    const prevFavOnly = filterFavoritesOnly;
    filterFavoritesOnly = false;
    const filtered = getFilteredEntries().filter(function (_ref) { return _ref.count >= 2; });
    filterFavoritesOnly = prevFavOnly;
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

  function syncSearchInputs() {
    const invSearch = el('torcha-filter-search');
    const pvpSearch = el('torcha-pvp-filter-search');
    const shredSearch = el('torcha-shred-filter-search');
    const dexSearch = el('torcha-dex-filter-search');
    if (invSearch) invSearch.value = filterSearch;
    if (pvpSearch) pvpSearch.value = filterSearch;
    if (shredSearch) shredSearch.value = filterSearch;
    if (dexSearch) dexSearch.value = filterSearch;
  }

  var TORCHA_VALID_TABS = ['pack', 'inventory', 'challenge', 'raids', 'dex'];

  function switchTab(tabId) {
    activeTab = tabId;
    if (TORCHA_VALID_TABS.indexOf(tabId) !== -1) localStorage.setItem('torcha_active_tab', tabId);
    document.querySelectorAll('.torcha-tab').forEach(function (t) {
      const id = t.id && t.id.replace('torcha-tab-', '');
      t.classList.toggle('torcha-tab-active', id === tabId);
      t.setAttribute('aria-selected', id === tabId);
    });
    document.querySelectorAll('.torcha-bottom-nav-item').forEach(function (t) {
      const id = t.getAttribute('data-torcha-tab') || '';
      t.classList.toggle('torcha-tab-active', id === tabId);
      t.setAttribute('aria-selected', id === tabId);
    });
    document.querySelectorAll('.torcha-panel').forEach(function (p) {
      const id = p.id && p.id.replace('torcha-panel-', '');
      toggleHidden(p, id !== tabId);
    });
    syncSearchInputs();
    if (tabId === 'pack') { renderPackPanel(); renderDailyTasks(); }
    else if (tabId === 'inventory') renderInventoryPanel();
    else if (tabId === 'dex') { renderDexPanel(); updateBackTopVisibility(); }
    else if (tabId === 'challenge') { renderPvpPanel(); showChallengeSetup(); }
    else if (tabId === 'raids') { renderShredPanel(); renderBuyButtons(); }
    updateBackTopVisibility();
  }

  var BACK_TOP_SCROLL_THRESHOLD = 250;
  function updateBackTopVisibility() {
    const btn = el('torcha-dex-back-top');
    if (!btn) return;
    const showForTab = activeTab === 'inventory' || activeTab === 'raids' || activeTab === 'dex';
    const scrolled = typeof window.scrollY !== 'undefined' ? window.scrollY > BACK_TOP_SCROLL_THRESHOLD : (document.documentElement.scrollTop || 0) > BACK_TOP_SCROLL_THRESHOLD;
    toggleHidden(btn, !(showForTab && scrolled));
  }

  function initDexBackTop() {
    const btn = el('torcha-dex-back-top');
    if (btn) {
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateBackTopVisibility();
      });
    }
    window.addEventListener('scroll', function () { updateBackTopVisibility(); }, { passive: true });
  }

  function getReleasedCards() {
    return cards.filter(function (c) { return HIDDEN_EXPANSION_IDS.indexOf(c.expansion) === -1; });
  }

  function getCardsForExpansion(expansionId) {
    if (!expansionId) return [];
    return cards.filter(function (c) { return c.expansion === expansionId; });
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
      showTorchaModal({ title: 'Challenge', body: 'Not enough cards in the pool to form the CPU deck. Try again.', primaryLabel: 'OK' });
      return;
    }
    showChallengeView();
    addChallengePlayedToday();
    var result = runLifeChallenge(userDeck, cpuDeck);
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
    renderChallengeResult(result, function () {
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
      }
    });
    saveInventory(inventory);
    if (tokensEarned > 0) addFireTokens(tokensEarned);
    if (toUse.length > 0) addShredCardsToday(toUse.length);
    shredSelected = [];
    renderShredPanel();
    renderBuyButtons();
    renderInventoryPanel();
    renderDailyTasks();
  }

  function initTabs() {
    ['pack', 'inventory', 'dex', 'challenge', 'raids'].forEach(function (tabId) {
      const btn = el('torcha-tab-' + tabId);
      if (btn) btn.addEventListener('click', function () { switchTab(tabId); });
    });
    document.querySelectorAll('.torcha-bottom-nav-item').forEach(function (btn) {
      const tabId = btn.getAttribute('data-torcha-tab');
      if (tabId) btn.addEventListener('click', function () { switchTab(tabId); });
    });
  }

  function initHeaderOverflow() {
    const overflowBtn = el('torcha-header-overflow-btn');
    const dropdown = el('torcha-header-overflow-dropdown');
    const saveBtn = el('torcha-save-session');
    const loadBtn = el('torcha-load-session');
    const importFileInput = el('torcha-import-session-file');
    const resetBtn = el('torcha-reset');
    function closeDropdown() {
      if (dropdown) toggleHidden(dropdown, true);
      if (overflowBtn) overflowBtn.setAttribute('aria-expanded', 'false');
    }
    if (overflowBtn && dropdown) {
      overflowBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        toggleHidden(dropdown, isOpen);
        overflowBtn.setAttribute('aria-expanded', !isOpen);
      });
    }
    if (el('torcha-overflow-save')) {
      el('torcha-overflow-save').addEventListener('click', function () {
        if (saveBtn) saveBtn.click();
        closeDropdown();
      });
    }
    if (el('torcha-overflow-load')) {
      el('torcha-overflow-load').addEventListener('click', function () {
        if (importFileInput) importFileInput.click();
        closeDropdown();
      });
    }
    if (el('torcha-overflow-reset')) {
      el('torcha-overflow-reset').addEventListener('click', function () {
        if (resetBtn) resetBtn.click();
        closeDropdown();
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.torcha-header-overflow-wrap')) closeDropdown();
    });
  }

  function initFiltersDrawers() {
    document.querySelectorAll('.torcha-filters-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const drawerId = btn.getAttribute('aria-controls');
        const drawer = drawerId ? document.getElementById(drawerId) : null;
        const container = drawer && drawer.closest('.torcha-filters');
        if (!container) return;
        const isOpen = container.classList.toggle('torcha-filters-open');
        btn.setAttribute('aria-expanded', isOpen);
      });
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
    updateCarouselDots();
  }

  function scrollSelectedCoverIntoView() {
    const track = el('torcha-carousel-track');
    if (!track) return;
    const selected = track.querySelector('.torcha-expansion-cover.torcha-cover-selected');
    if (selected) selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function selectPrevExpansion() {
    const expansionSel = el('torcha-pack-expansion');
    const visible = getVisibleExpansions();
    if (!expansionSel || !visible.length) return;
    const currentId = expansionSel.value || visible[0].id;
    const idx = visible.findIndex(function (e) { return e.id === currentId; });
    const newIdx = idx <= 0 ? visible.length - 1 : idx - 1;
    expansionSel.value = visible[newIdx].id;
    updateExpansionCarouselSelected();
    scrollSelectedCoverIntoView();
    renderPackPanel();
  }

  function selectNextExpansion() {
    const expansionSel = el('torcha-pack-expansion');
    const visible = getVisibleExpansions();
    if (!expansionSel || !visible.length) return;
    const currentId = expansionSel.value || visible[0].id;
    const idx = visible.findIndex(function (e) { return e.id === currentId; });
    const newIdx = idx >= visible.length - 1 ? 0 : idx + 1;
    expansionSel.value = visible[newIdx].id;
    updateExpansionCarouselSelected();
    scrollSelectedCoverIntoView();
    renderPackPanel();
  }

  function renderCarouselDots() {
    const container = el('torcha-carousel-dots');
    const expansionSel = el('torcha-pack-expansion');
    if (!container || !expansionSel) return;
    const visible = getVisibleExpansions();
    container.innerHTML = '';
    visible.forEach(function (e, idx) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'torcha-carousel-dot' + (e.id === expansionSel.value ? ' torcha-dot-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Expansion ' + (idx + 1) + ' of ' + visible.length);
      dot.setAttribute('aria-selected', e.id === expansionSel.value ? 'true' : 'false');
      dot.addEventListener('click', function () {
        expansionSel.value = e.id;
        updateExpansionCarouselSelected();
        scrollSelectedCoverIntoView();
        renderPackPanel();
      });
      container.appendChild(dot);
    });
  }

  function updateCarouselDots() {
    const container = el('torcha-carousel-dots');
    const expansionSel = el('torcha-pack-expansion');
    if (!container || !expansionSel) return;
    const id = expansionSel.value || '';
    container.querySelectorAll('.torcha-carousel-dot').forEach(function (dot, idx) {
      const visible = getVisibleExpansions();
      const isActive = visible[idx] && visible[idx].id === id;
      dot.classList.toggle('torcha-dot-active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function renderExpansionCarousel() {
    const track = el('torcha-carousel-track');
    const expansionSel = el('torcha-pack-expansion');
    if (!track || !expansionSel) return;
    track.innerHTML = '';
    getVisibleExpansions().forEach(function (e) {
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
      });
      track.appendChild(cover);
    });
    updateExpansionCarouselSelected();
    renderCarouselDots();
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
    const visible = getVisibleExpansions();
    sel.innerHTML = '';
    visible.forEach(function (e) {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = getExpansionDisplay(e);
      sel.appendChild(opt);
    });
    if (visible.length && (!sel.value || HIDDEN_EXPANSION_IDS.indexOf(sel.value) !== -1)) sel.value = visible[0].id;
    renderExpansionCarousel();
    initCarouselNav();
    var track = el('torcha-carousel-track');
    if (track) track.scrollLeft = 0;
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
    const invFilters = expansionSel ? expansionSel.closest('.torcha-filters') : null;
    if (invFilters && !el('torcha-favorites-only')) {
      const wrap = document.createElement('div');
      wrap.className = 'input-group torcha-favorites-toggle-wrap';
      wrap.innerHTML = '<label class="torcha-toggle-label"><input type="checkbox" id="torcha-favorites-only" class="torcha-toggle-input" aria-label="Show only favorite cards"><span class="torcha-toggle-track" aria-hidden="true"></span><span class="torcha-toggle-text">Favorites only</span></label>';
      invFilters.appendChild(wrap);
      const favCheck = el('torcha-favorites-only');
      if (favCheck) {
        favCheck.checked = filterFavoritesOnly;
        favCheck.addEventListener('change', function () {
          filterFavoritesOnly = favCheck.checked;
          inventoryPageOffset = 0;
          renderInventoryPanel();
        });
      }
    }
    const invFavCheck = el('torcha-favorites-only');
    if (invFavCheck) invFavCheck.checked = filterFavoritesOnly;
    if (expansionSel) expansionSel.addEventListener('change', function () { filterExpansion = expansionSel.value || ''; inventoryPageOffset = 0; renderInventoryPanel(); });
    if (raritySel) raritySel.addEventListener('change', function () { filterRarity = raritySel.value || ''; inventoryPageOffset = 0; renderInventoryPanel(); });
    if (seasonSel) seasonSel.addEventListener('change', function () { filterSeason = seasonSel.value === '' ? '' : parseInt(seasonSel.value, 10); inventoryPageOffset = 0; renderInventoryPanel(); });
    if (sortSel) sortSel.addEventListener('change', function () { filterSort = sortSel.value || 'season'; inventoryPageOffset = 0; renderInventoryPanel(); });

    const invSearch = el('torcha-filter-search');
    if (invSearch) invSearch.addEventListener('input', function () { filterSearch = invSearch.value; inventoryPageOffset = 0; renderInventoryPanel(); });
    const pvpSearch = el('torcha-pvp-filter-search');
    if (pvpSearch) pvpSearch.addEventListener('input', function () { filterSearch = pvpSearch.value; renderPvpPanel(); });
    const shredSearch = el('torcha-shred-filter-search');
    if (shredSearch) shredSearch.addEventListener('input', function () { filterSearch = shredSearch.value; renderShredPanel(); });
    const dexSearch = el('torcha-dex-filter-search');
    if (dexSearch) dexSearch.addEventListener('input', function () { filterSearch = dexSearch.value; dexSeasonOffsets = {}; renderDexPanel(); });

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

    const appEl = el('torcha-app');
    if (appEl) {
      appEl.addEventListener('click', function (e) {
        const from = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement) || null;
        const star = from && from.closest && from.closest('.torcha-favorite-star');
        if (!star) return;
        if (star.classList.contains('torcha-favorite-star-readonly')) return;
        e.preventDefault();
        e.stopPropagation();
        const cardId = star.getAttribute('data-card-id');
        if (!cardId) return;
        toggleFavorite(cardId);
        if (activeTab === 'inventory') renderInventoryPanel();
        else if (activeTab === 'challenge') renderPvpPanel();
        else if (activeTab === 'raids') renderShredPanel();
      });
    }
  }

  /** Returns the player identity for a card (same person across seasons), or null if not a returnee. */
  function getPlayerIdentity(cardId) {
    return playerIdentitiesByCardId[cardId] || null;
  }

  /** Returns true if both card IDs belong to the same person (returnee across seasons). */
  function areSamePlayer(cardId1, cardId2) {
    if (!cardId1 || !cardId2 || cardId1 === cardId2) return cardId1 === cardId2;
    var id1 = playerIdentitiesByCardId[cardId1];
    return id1 && id1.cardIds && id1.cardIds.indexOf(cardId2) !== -1;
  }

  function init() {
    if (typeof window.recordToolUsed === 'function') window.recordToolUsed('torcha');
    incrementSessionsToday();
    var cardsUrl = new URL('torcha-cards.json', window.location.href).href;
    var identitiesUrl = new URL('torcha-player-identities.json', window.location.href).href;
    Promise.all([
      fetch(cardsUrl).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' loading torcha-cards.json');
        return res.text();
      }).then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error('Invalid JSON in torcha-cards.json: ' + (e.message || e));
        }
      }),
      fetch(identitiesUrl).then(function (res) { return res.ok ? res.json() : { identities: [] }; }).catch(function () { return { identities: [] }; })
    ]).then(function (results) {
      var data = results[0];
      var identityData = results[1];
      if (!Array.isArray(data)) {
        data = (data && (data.cards || data.data)) || [];
      }
      if (!Array.isArray(data)) {
        throw new Error('torcha-cards.json must be a JSON array (or object with "cards" or "data" array)');
      }
      cards = data.filter(function (c) {
        try {
          var name = (c && c.name != null) ? String(c.name) : '';
          return !CARD_BLOCKLIST_NAMES.has(name.trim().toLowerCase());
        } catch (e) {
          return true;
        }
      });
      playerIdentitiesByCardId = {};
      (identityData.identities || []).forEach(function (ident) {
        var cardIds = ident.cardIds || [];
        cardIds.forEach(function (cid) {
          playerIdentitiesByCardId[cid] = { canonicalName: ident.canonicalName, seasons: ident.seasons || [], cardIds: cardIds };
        });
      });
      if (typeof window !== 'undefined') {
        window.getTorchaPlayerIdentity = getPlayerIdentity;
        window.areTorchaSamePlayer = areSamePlayer;
      }
      packState = getPackState();
        inventory = loadInventory();
        toggleHidden(el('torcha-loading'), true);
        toggleHidden(el('torcha-main-card'), false);
        toggleHidden(el('torcha-app'), false);
        initTabs();
        initDexBackTop();
        initPackExpansion();
        renderExpansionFilter();
        renderRarityFilter();
        renderSeasonFilter();
        initFilters();
        var savedTab = localStorage.getItem('torcha_active_tab');
        if (savedTab && TORCHA_VALID_TABS.indexOf(savedTab) !== -1) switchTab(savedTab);
        else switchTab('pack');
        el('torcha-reveal-close') && el('torcha-reveal-close').addEventListener('click', closeReveal);
        el('torcha-open-pack-btn') && el('torcha-open-pack-btn').addEventListener('click', openPack);
        el('torcha-pack-expansion') && el('torcha-pack-expansion').addEventListener('change', renderPackPanel);
        var saveBtn = el('torcha-save-session');
        var loadBtn = el('torcha-load-session');
        var importFileInput = el('torcha-import-session-file');
        if (saveBtn) saveBtn.addEventListener('click', exportSession);
        if (loadBtn) loadBtn.addEventListener('click', function () { if (importFileInput) importFileInput.click(); });
        if (importFileInput) importFileInput.addEventListener('change', function (e) { importSessionFile(e.target.files[0]); e.target.value = ''; });
        initHeaderOverflow();
        initFiltersDrawers();
        el('torcha-pvp-fight') && el('torcha-pvp-fight').addEventListener('click', doPvpFight);
        el('torcha-challenge-again') && el('torcha-challenge-again').addEventListener('click', showChallengeSetup);
        el('torcha-shred-btn') && el('torcha-shred-btn').addEventListener('click', doShred);
        setInterval(renderTimer, 1000);
      })
    .catch(function (err) {
        console.error('Torcha load error:', err);
        var loading = el('torcha-loading');
        if (loading) {
          var msg = err && (err.message || String(err));
          loading.innerHTML =
            '<p class="section-title">Failed to load cards.</p>' +
            '<p style="font-size: 0.9rem; margin-top: var(--space-sm);">' + escapeHtml(msg) + '</p>' +
            '<p style="font-size: 0.85rem; margin-top: var(--space-sm); opacity: 0.9;">Check that <strong>torcha-cards.json</strong> is in the same folder as torcha.html on your server.</p>';
        }
      });
  }

  function attachResetButton() {
    var btn = document.getElementById('torcha-reset');
    if (!btn) return;
    btn.addEventListener('click', function () {
      showTorchaModal({
        title: 'Reset',
        body: 'Reset everything? The tool will return to its default state. This cannot be undone.',
        primaryLabel: 'Reset',
        secondaryLabel: 'Cancel',
        onPrimary: function () {
          Object.keys(STORAGE).forEach(function (k) { localStorage.removeItem(STORAGE[k]); });
          localStorage.removeItem('torcha_active_tab');
          if (cards && cards.length > 0) {
            inventory = loadInventory();
            packState = getPackState();
            renderTimer();
            renderPackPanel();
            renderDailyTasks();
            renderInventoryPanel();
            renderPvpPanel();
            renderShredPanel();
            renderDexPanel();
          }
        }
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { attachResetButton(); });
  } else {
    attachResetButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
