/**
 * Computes power and social from survivoR data (castaways, castaway_scores, confessionals).
 * Data source: https://survivorstatsdb.com (built on survivoR R package).
 * Normalization is GLOBAL across all 49 US seasons; all cards are updated. App shows only first two expansions (1–14).
 *
 * POWER = 30% placement + 70% (challenges score + successful boots + times immune)
 *   - challenges score: score_outplay
 *   - successful boots: n_successful_boots (normalized per season)
 *   - times immune: p_score_chal_immunity (immunity challenge score)
 *
 * SOCIAL = 40% placement + 60% (advantages + influence + tribal council + confessionals + overall)
 *   - advantages: score_adv
 *   - influence: score_inf
 *   - tribal council: score_vote
 *   - total confessionals: sum(confessional_count) per season
 *   - overall score: score_overall
 *
 * RARITY = base from placement (1=legend, 2=super_rare, 3=rare, else common) then returnee bump
 *   from torcha-player-identities.json: +1 at 2 appearances, then +1 every 3 seasons from 3rd onward (4→+1, 5→+2); cap at legend.
 *
 * Usage:
 *   node scripts/apply-survivoR-stats.js [options]
 * Options:
 *   --data-dir <path>   Use local JSON (castaways, castaway_scores, confessionals)
 *   --cards <path>      Path to cards JSON (default: ../torcha-cards.json)
 *   --out <path>        Write updated cards here (default: overwrite --cards)
 *   --identities <path> Returnee identities (default: ../torcha-player-identities.json)
 *   --dry-run           Print stats only, do not write
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const STAT_MIN = 1;
const STAT_MAX = 200;
const SURVIVOR_RAW = 'https://raw.githubusercontent.com/doehm/survivoR/master/dev/json';

const POWER_PLACEMENT_WEIGHT = 0.3;
const SOCIAL_PLACEMENT_WEIGHT = 0.4;
const IMAGE_BASE = 'https://gradientdescending.com/survivor/castaways/colour';

function buildImageUrl(season, castawayId) {
  if (!castawayId) return null;
  const seasonStr = String(Number(season)).padStart(2, '0');
  return `${IMAGE_BASE}/US${seasonStr}${castawayId}.png`;
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(url + ' → ' + res.statusCode));
        return;
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .trim();
}

/** Remove nickname in quotes: "Bill \"B.B.\" Andersen" -> "Bill Andersen" */
function stripNickname(name) {
  return (name || '').replace(/\s*"[^"]*"\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Full name for matching: strip nickname then normalize */
function normalizedCardName(name) {
  return normalizeName(stripNickname(name));
}

/** Extract first, last, and nickname (content in quotes) from card name */
function getCardNameParts(name) {
  const full = stripNickname(name);
  const parts = full.split(/\s+/).filter(Boolean);
  const first = parts.length ? normalizeName(parts[0]) : '';
  const last = parts.length > 1 ? normalizeName(parts[parts.length - 1]) : '';
  const nicknameMatch = (name || '').match(/"([^"]+)"/);
  const nickname = nicknameMatch ? normalizeName(nicknameMatch[1]) : '';
  return { first, last, nickname };
}

function num(x) {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

async function loadJson(from) {
  if (from.startsWith('http')) {
    const data = await get(from);
    return JSON.parse(data);
  }
  const data = fs.readFileSync(from, 'utf8');
  return JSON.parse(data);
}

/** Sum confessionals per (castaway_id, season) */
function aggregateConfessionals(confessionals) {
  const us = (confessionals || []).filter((c) => c.version === 'US');
  const byKey = new Map();
  for (const row of us) {
    const key = row.castaway_id + '|' + row.season;
    const count = num(row.confessional_count) || 0;
    byKey.set(key, (byKey.get(key) || 0) + count);
  }
  return byKey;
}

function buildLookup(castaways, castawayScores, confessionalsByKey) {
  const usCastaways = castaways.filter((c) => c.version === 'US');
  const usScores = castawayScores.filter((c) => c.version === 'US');

  const byKey = new Map();
  for (const c of usCastaways) {
    const key = c.castaway_id + '|' + c.season;
    const place = c.place != null ? Number(c.place) : 20;
    if (!byKey.has(key) || byKey.get(key).place > place) {
      byKey.set(key, {
        full_name: c.full_name,
        place,
        season: c.season,
        castaway_id: c.castaway_id,
      });
    }
  }

  const seasonTotal = new Map();
  for (const c of usCastaways) {
    const s = c.season;
    const p = c.place != null ? Number(c.place) : 20;
    if (!seasonTotal.has(s) || seasonTotal.get(s) < p) seasonTotal.set(s, p);
  }

  const lookup = new Map();
  for (const s of usScores) {
    const key = s.castaway_id + '|' + s.season;
    const base = byKey.get(key);
    if (!base) continue;
    const total = seasonTotal.get(base.season) || 20;
    const placementPct = 1 - (base.place - 1) / Math.max(total, 1);

    const nBoots = num(s.n_successful_boots);
    const chalImmunity = num(s.p_score_chal_immunity);
    const outplay = num(s.score_outplay);
    const adv = num(s.score_adv);
    const inf = num(s.score_inf);
    const vote = num(s.score_vote);
    const overall = num(s.score_overall);
    const confessionals = confessionalsByKey ? confessionalsByKey.get(key) || 0 : 0;

    const norm = normalizeName(base.full_name);
    const lookupKey = norm + '|' + base.season;
    lookup.set(lookupKey, {
      season: base.season,
      placement: base.place,
      total,
      full_name: base.full_name,
      castaway_id: base.castaway_id,
      placementPct,
      // Power components (70% total)
      score_outplay: outplay,
      n_successful_boots: nBoots,
      p_score_chal_immunity: chalImmunity,
      // Social components (60% total)
      score_adv: adv,
      score_inf: inf,
      score_vote: vote,
      score_overall: overall,
      total_confessionals: confessionals,
    });
  }
  return lookup;
}

/** Build bySurname and byFirstname from lookup for fallback matching (unique per season only). */
function buildFallbackLookups(lookup) {
  const bySurname = new Map();
  const byFirstname = new Map();
  for (const [, v] of lookup) {
    const full = (v.full_name || '').replace(/\s*"[^"]*"\s*/g, ' ').trim();
    const parts = full.split(/\s+/).filter(Boolean);
    const first = parts.length ? normalizeName(parts[0]) : '';
    const last = parts.length > 1 ? normalizeName(parts[parts.length - 1]) : '';
    if (last) {
      const key = last + '|' + v.season;
      if (!bySurname.has(key)) bySurname.set(key, []);
      bySurname.get(key).push(v);
    }
    if (first) {
      const key = first + '|' + v.season;
      if (!byFirstname.has(key)) byFirstname.set(key, []);
      byFirstname.get(key).push(v);
    }
  }
  return { bySurname, byFirstname };
}

/** Resolve card to lookup entry: full name, then surname, then first name, then nickname (as first name). Returns v or null. */
function resolveCardToLookup(card, lookup, bySurname, byFirstname, nameOverrides) {
  const season = card.season != null ? Number(card.season) : null;
  if (season == null) return null;
  let name = card.name || '';
  const override = nameOverrides.get(card.id);
  if (override) name = override;
  const keyFull = normalizedCardName(name) + '|' + season;
  let v = lookup.get(keyFull);
  if (v) return v;
  const { first, last, nickname } = getCardNameParts(card.name || '');
  if (last) {
    const list = bySurname.get(last + '|' + season);
    if (list && list.length === 1) return list[0];
  }
  if (first) {
    const list = byFirstname.get(first + '|' + season);
    if (list && list.length === 1) return list[0];
  }
  if (nickname) {
    const list = byFirstname.get(nickname + '|' + season);
    if (list && list.length === 1) return list[0];
  }
  return null;
}

/** Global min/max of composite power/social across ALL seasons (for final 1–200 scale). */
function computeGlobalBounds(lookup, ranges) {
  let powerMin = 1;
  let powerMax = 0;
  let socialMin = 1;
  let socialMax = 0;

  for (const [, v] of lookup) {
    const placementPct = v.placementPct;
    const ro = ranges.powerRanges.get('outplay');
    const rb = ranges.powerRanges.get('boots');
    const ri = ranges.powerRanges.get('immunity');
    let powerRaw = placementPct;
    if (ro && rb && ri) {
      const nOutplay = norm01(v.score_outplay, ro.min, ro.max);
      const nBoots = norm01(v.n_successful_boots, rb.min, rb.max);
      const nImmunity = norm01(v.p_score_chal_immunity, ri.min, ri.max);
      powerRaw =
        POWER_PLACEMENT_WEIGHT * placementPct +
        (1 - POWER_PLACEMENT_WEIGHT) * (nOutplay + nBoots + nImmunity) / 3;
    }
    powerMin = Math.min(powerMin, powerRaw);
    powerMax = Math.max(powerMax, powerRaw);

    const rAdv = ranges.socialRanges.get('adv');
    const rInf = ranges.socialRanges.get('inf');
    const rVote = ranges.socialRanges.get('vote');
    const rOverall = ranges.socialRanges.get('overall');
    const rConf = ranges.socialRanges.get('conf');
    let socialRaw = placementPct;
    if (rAdv && rInf && rVote && rOverall && rConf) {
      const nAdv = norm01(v.score_adv, rAdv.min, rAdv.max);
      const nInf = norm01(v.score_inf, rInf.min, rInf.max);
      const nVote = norm01(v.score_vote, rVote.min, rVote.max);
      const nOverall = norm01(v.score_overall, rOverall.min, rOverall.max);
      const nConf = norm01(v.total_confessionals, rConf.min, rConf.max);
      socialRaw =
        SOCIAL_PLACEMENT_WEIGHT * placementPct +
        (1 - SOCIAL_PLACEMENT_WEIGHT) * (nAdv + nInf + nVote + nOverall + nConf) / 5;
    }
    socialMin = Math.min(socialMin, socialRaw);
    socialMax = Math.max(socialMax, socialRaw);
  }
  return { powerMin, powerMax, socialMin, socialMax };
}

/** Global min/max for each metric across ALL seasons (so only true record holders get high stats). */
function computeGlobalRanges(lookup) {
  const powerRanges = new Map();
  const socialRanges = new Map();
  const keys = {
    outplay: (v) => v.score_outplay,
    boots: (v) => v.n_successful_boots,
    immunity: (v) => v.p_score_chal_immunity,
    adv: (v) => v.score_adv,
    inf: (v) => v.score_inf,
    vote: (v) => v.score_vote,
    overall: (v) => v.score_overall,
    conf: (v) => v.total_confessionals,
  };
  for (const [, v] of lookup) {
    for (const [key, getVal] of Object.entries(keys)) {
      const val = getVal(v);
      const map = key === 'outplay' || key === 'boots' || key === 'immunity' ? powerRanges : socialRanges;
      if (!map.has(key)) map.set(key, { min: val, max: val });
      else {
        const m = map.get(key);
        m.min = Math.min(m.min, val);
        m.max = Math.max(m.max, val);
      }
    }
  }
  return { powerRanges, socialRanges };
}

function norm01(val, minVal, maxVal) {
  const eps = 1e-9;
  const range = maxVal - minVal + eps;
  return (val - minVal) / range;
}

function scaleToRange(val, minVal, maxVal) {
  const u = norm01(val, minVal, maxVal);
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(STAT_MIN + u * (STAT_MAX - STAT_MIN))));
}

function powerFromPlacement(placement, total) {
  const pct = 1 - (placement - 1) / Math.max(total, 1);
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(STAT_MIN + pct * (STAT_MAX - STAT_MIN))));
}

/** Rarity by placement only (base). */
const RARITY_ORDER = ['common', 'rare', 'super_rare', 'legend'];
function placementToRarity(placement) {
  if (placement === 1) return 'legend';
  if (placement === 2) return 'super_rare';
  if (placement === 3) return 'rare';
  return 'common';
}
/** Bump rarity by N levels. Caps at legend. */
function bumpRarity(rarity, levels) {
  const i = RARITY_ORDER.indexOf(rarity);
  if (i === -1) return rarity;
  const j = Math.min(RARITY_ORDER.length - 1, i + levels);
  return RARITY_ORDER[j];
}
/** Returnee rarity bump: +1 for having 2+ appearances, then +1 every 3 seasons from 3rd onward (4 app = +1, 5 app = +2, 8 app = +3). */
function returneeBumpLevels(appearances) {
  if (appearances < 2) return 0;
  return (appearances >= 2 ? 1 : 0) + (appearances >= 5 ? Math.floor((appearances - 2) / 3) : 0);
}

/** Build cardId -> number of appearances from torcha-player-identities.json. */
function buildAppearancesByCardId(identitiesPath) {
  const byCardId = new Map();
  if (!identitiesPath || !fs.existsSync(identitiesPath)) return byCardId;
  const data = JSON.parse(fs.readFileSync(identitiesPath, 'utf8'));
  const identities = data.identities || [];
  for (const ident of identities) {
    const cardIds = ident.cardIds || [];
    const n = cardIds.length;
    for (const cid of cardIds) byCardId.set(cid, n);
  }
  return byCardId;
}

/** Count distinct seasons per castaway_id (appearances) – used only for fallback when identities file missing. */
function buildAppearancesByCastawayId(lookup) {
  const byId = new Map();
  for (const [, v] of lookup) {
    const id = v.castaway_id;
    if (!byId.has(id)) byId.set(id, new Set());
    byId.get(id).add(v.season);
  }
  const count = new Map();
  for (const [id, seasons] of byId) count.set(id, seasons.size);
  return count;
}

function computePower(v, bounds, ranges) {
  const placementPct = v.placementPct;
  const ro = ranges.powerRanges.get('outplay');
  const rb = ranges.powerRanges.get('boots');
  const ri = ranges.powerRanges.get('immunity');
  if (!ro || !rb || !ri) return scaleToRange(powerFromPlacement(v.placement, v.total), 0, 1);

  const nOutplay = norm01(v.score_outplay, ro.min, ro.max);
  const nBoots = norm01(v.n_successful_boots, rb.min, rb.max);
  const nImmunity = norm01(v.p_score_chal_immunity, ri.min, ri.max);
  const powerRaw =
    POWER_PLACEMENT_WEIGHT * placementPct +
    (1 - POWER_PLACEMENT_WEIGHT) * (nOutplay + nBoots + nImmunity) / 3;
  return scaleToRange(powerRaw, bounds.powerMin, bounds.powerMax);
}

function computeSocial(v, bounds, ranges) {
  const placementPct = v.placementPct;
  const rAdv = ranges.socialRanges.get('adv');
  const rInf = ranges.socialRanges.get('inf');
  const rVote = ranges.socialRanges.get('vote');
  const rOverall = ranges.socialRanges.get('overall');
  const rConf = ranges.socialRanges.get('conf');
  if (!rAdv || !rInf || !rVote || !rOverall || !rConf) {
    return scaleToRange(powerFromPlacement(v.placement, v.total), 0, 1);
  }

  const nAdv = norm01(v.score_adv, rAdv.min, rAdv.max);
  const nInf = norm01(v.score_inf, rInf.min, rInf.max);
  const nVote = norm01(v.score_vote, rVote.min, rVote.max);
  const nOverall = norm01(v.score_overall, rOverall.min, rOverall.max);
  const nConf = norm01(v.total_confessionals, rConf.min, rConf.max);
  const socialRaw =
    SOCIAL_PLACEMENT_WEIGHT * placementPct +
    (1 - SOCIAL_PLACEMENT_WEIGHT) * (nAdv + nInf + nVote + nOverall + nConf) / 5;
  return scaleToRange(socialRaw, bounds.socialMin, bounds.socialMax);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dataDir: null, cards: null, out: null, identities: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && args[i + 1]) {
      opts.dataDir = args[++i];
    } else if (args[i] === '--cards' && args[i + 1]) {
      opts.cards = args[++i];
    } else if (args[i] === '--out' && args[i + 1]) {
      opts.out = args[++i];
    } else if (args[i] === '--identities' && args[i + 1]) {
      opts.identities = args[++i];
    } else if (args[i] === '--dry-run') {
      opts.dryRun = true;
    }
  }
  const root = path.join(__dirname, '..');
  if (!opts.cards) opts.cards = path.join(root, 'torcha-cards.json');
  if (!opts.out) opts.out = opts.cards;
  if (!opts.identities) opts.identities = path.join(root, 'torcha-player-identities.json');
  return opts;
}

async function main() {
  const opts = parseArgs();

  let castaways;
  let castawayScores;
  let confessionals = null;
  if (opts.dataDir) {
    castaways = await loadJson(path.join(opts.dataDir, 'castaways.json'));
    castawayScores = await loadJson(path.join(opts.dataDir, 'castaway_scores.json'));
    const confPath = path.join(opts.dataDir, 'confessionals.json');
    if (fs.existsSync(confPath)) confessionals = await loadJson(confPath);
  } else {
    process.stderr.write('Downloading castaways.json...\n');
    castaways = await loadJson(SURVIVOR_RAW + '/castaways.json');
    process.stderr.write('Downloading castaway_scores.json...\n');
    castawayScores = await loadJson(SURVIVOR_RAW + '/castaway_scores.json');
    try {
      process.stderr.write('Downloading confessionals.json...\n');
      confessionals = await loadJson(SURVIVOR_RAW + '/confessionals.json');
    } catch (e) {
      process.stderr.write('Confessionals not available, using 0 for that component.\n');
    }
  }

  const confessionalsByKey = aggregateConfessionals(confessionals);
  const lookup = buildLookup(castaways, castawayScores, confessionalsByKey);
  const appearancesByCastawayId = buildAppearancesByCastawayId(lookup);
  const { bySurname, byFirstname } = buildFallbackLookups(lookup);
  const ranges = computeGlobalRanges(lookup);
  const bounds = computeGlobalBounds(lookup, ranges);

  if (!fs.existsSync(opts.cards)) {
    process.stderr.write('Cards file not found: ' + opts.cards + '\n');
    process.exit(1);
  }
  const cards = JSON.parse(fs.readFileSync(opts.cards, 'utf8'));
  if (!Array.isArray(cards)) {
    process.stderr.write('Cards file must be a JSON array.\n');
    process.exit(1);
  }

  const NAME_OVERRIDES = new Map([
    ['yesenia-jessie-camach:s03', 'Jessie Camacho'],
    ['zachary-zach-wurtenberger:s42', 'Zach Wurthenberger'],
    ['yamil-yam-yam-aroch:s44', 'Yam Yam Arocho'],
    ['janani-j-maya-krishnan-jha:s45', 'J. Maya'],
    ['jessica-sugar-kiper:s20', 'Jessica Kiper'],
    ['danielle-danni-boatwright:s40', 'Danni Boatwright'],
    ['amber-mariano:s40', 'Amber Mariano'],
  ]);

  const identitiesPath = opts.identities;
  const appearancesByCardId = buildAppearancesByCardId(identitiesPath);

  // 1) Recompute all rarities from placement + returnee bump (identities)
  for (const card of cards) {
    const placement = card.placement != null ? Number(card.placement) : 20;
    const baseRarity = placementToRarity(placement);
    const appearances = appearancesByCardId.get(card.id) || 1;
    const bump = returneeBumpLevels(appearances);
    card.rarity = bumpRarity(baseRarity, bump);
  }

  // 2) Update power, social, imageUrl from SurvivoR only for non–season-50 cards
  let updated = 0;
  for (const card of cards) {
    const v = resolveCardToLookup(card, lookup, bySurname, byFirstname, NAME_OVERRIDES);
    if (!v) continue;
    if (Number(card.season) !== 50) {
      const power = computePower(v, bounds, ranges);
      const social = computeSocial(v, bounds, ranges);
      card.power = power;
      card.social = social;
    }
    const imageUrl = buildImageUrl(v.season, v.castaway_id);
    if (imageUrl) card.imageUrl = imageUrl;
    updated++;
  }

  process.stderr.write('Updated all card rarities from placement + returnee bump; ' + updated + ' cards with survivoR stats (power/social skipped for season 50).\n');
  if (!opts.dryRun) {
    fs.writeFileSync(opts.out, JSON.stringify(cards, null, 2), 'utf8');
    process.stderr.write('Wrote ' + opts.out + '\n');
  }
}

main().catch((err) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
