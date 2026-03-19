/**
 * Add Survivor 50 "In the Hands of the Fans" expansion:
 * - Append 24 new cards (season 50) with placeholder power/social.
 * - Recalculate rarity for all existing cards of those 24 returnees (bump by appearances).
 *
 * Usage: node scripts/add-season-50-expansion.js [--cards path] [--out path] [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const RARITY_ORDER = ['common', 'rare', 'super_rare', 'legend'];
function placementToRarity(placement) {
  if (placement === 1) return 'legend';
  if (placement === 2) return 'super_rare';
  if (placement === 3) return 'rare';
  return 'common';
}
function bumpRarity(rarity, levels) {
  const i = RARITY_ORDER.indexOf(rarity);
  if (i === -1) return rarity;
  return RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, i + levels)];
}
function rarityBumpLevels(baseRarity, appearances) {
  if (baseRarity === 'super_rare') return Math.floor(appearances / 3);
  return Math.floor(appearances / 2);
}

/** S50 cast: canonical id slug and display name (same person across seasons). */
const S50_CAST = [
  { slug: 'jenna-lewis', name: 'Jenna Lewis Dougherty' },
  { slug: 'colby-donaldson', name: 'Colby Donaldson' },
  { slug: 'stephenie-lagrossa', name: 'Stephenie LaGrossa Kendrick' },
  { slug: 'cirie-fields', name: 'Cirie Fields' },
  { slug: 'ozzy-lusth', name: 'Ozzy Lusth' },
  { slug: 'benjamin-coach-wade', name: 'Benjamin "Coach" Wade' },
  { slug: 'aubry-bracco', name: 'Aubry Bracco' },
  { slug: 'mike-white', name: 'Mike White' },
  { slug: 'chrissy-hofbeck', name: 'Chrissy Hofbeck' },
  { slug: 'christian-hubicki', name: 'Christian Hubicki' },
  { slug: 'angelina-keeley', name: 'Angelina Keeley' },
  { slug: 'rick-devens', name: 'Rick Devens' },
  { slug: 'jonathan-young', name: 'Jonathan Young' },
  { slug: 'dianelys-dee-valladares', name: 'Dianelys "Dee" Valladares' },
  { slug: 'emily-flippen', name: 'Emily Flippen' },
  { slug: 'quintavius-q-burdette', name: 'Quintavius "Q" Burdette' },
  { slug: 'tiffany-nicole-ervin', name: 'Tiffany Nicole Ervin' },
  { slug: 'charlie-davis', name: 'Charlie Davis' },
  { slug: 'genevieve-mushaluk', name: 'Genevieve Mushaluk' },
  { slug: 'joe-hunter', name: 'Joe Hunter' },
  { slug: 'kyle-fraser', name: 'Kyle Fraser' },
  { slug: 'kamilla-karthigesu', name: 'Kamilla Karthigesu' },
  { slug: 'rizo-velovic', name: 'Rizo "Rizgod" Velovic' },
  { slug: 'savannah-louie', name: 'Savannah Louie' },
];

/** Alternate id slugs or name variants → same person (canonical slug). */
const SLUG_ALIASES = new Map([
  ['jenna-lewis-dougherty', 'jenna-lewis'],
  ['stephenie-lagrossa-kendrick', 'stephenie-lagrossa'],
  ['rizo-rizgod-velovic', 'rizo-velovic'],
  ['dee-valladares', 'dianelys-dee-valladares'],
  ['q-burdette', 'quintavius-q-burdette'],
  ['tiffany-ervin', 'tiffany-nicole-ervin'],
]);

function getCanonicalSlug(idPrefix) {
  return SLUG_ALIASES.get(idPrefix) || idPrefix;
}

const S50_SLUGS = new Set(S50_CAST.map((c) => c.slug));
const EXPANSION_ID = 'the-pantheon';
const PLACEHOLDER_POWER = 50;
const PLACEHOLDER_SOCIAL = 50;
const PLACEHOLDER_PLACEMENT = 12;

function getIdPrefix(card) {
  const id = card.id || '';
  const colon = id.indexOf(':');
  return colon >= 0 ? id.slice(0, colon) : id;
}

function main() {
  const args = process.argv.slice(2);
  let cardsPath = path.join(__dirname, '..', 'torcha-cards.json');
  let outPath = cardsPath;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cards' && args[i + 1]) cardsPath = args[++i];
    else if (args[i] === '--out' && args[i + 1]) outPath = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
  }

  const raw = fs.readFileSync(cardsPath, 'utf8');
  const cards = JSON.parse(raw);
  if (!Array.isArray(cards)) {
    process.stderr.write('Cards file must be a JSON array.\n');
    process.exit(1);
  }

  // 1) Add 24 new S50 cards if not already present (placeholder power/social)
  const existingS50Ids = new Set(cards.filter((c) => c.season === 50).map((c) => c.id));
  let added = 0;
  for (const { slug, name } of S50_CAST) {
    const id = `${slug}:s50`;
    if (existingS50Ids.has(id)) continue;
    cards.push({
      id,
      name,
      season: 50,
      placement: PLACEHOLDER_PLACEMENT,
      is_winner: false,
      power: PLACEHOLDER_POWER,
      social: PLACEHOLDER_SOCIAL,
      rarity: 'common',
      expansion: EXPANSION_ID,
      imageUrl: '',
    });
    added++;
  }

  // Normalise display names for S50 cards (same person = same full name)
  const nameByCanonical = Object.fromEntries(S50_CAST.map((c) => [c.slug, c.name]));
  for (const card of cards) {
    if (card.season !== 50) continue;
    const canonical = getCanonicalSlug(getIdPrefix(card));
    if (nameByCanonical[canonical]) card.name = nameByCanonical[canonical];
  }

  // 2) Count appearances per canonical slug (same person: e.g. Jenna Lewis = Jenna Lewis Dougherty, Rizo = Rizo Rizgod)
  const seasonsBySlug = new Map();
  for (const card of cards) {
    const prefix = getIdPrefix(card);
    const canonical = getCanonicalSlug(prefix);
    if (!S50_SLUGS.has(canonical)) continue;
    const seasons = seasonsBySlug.get(canonical) || new Set();
    seasons.add(card.season);
    seasonsBySlug.set(canonical, seasons);
  }

  // 3) Recalculate rarity for every card of a S50 returnee (grouped by canonical slug)
  let updated = 0;
  for (const card of cards) {
    const prefix = getIdPrefix(card);
    const canonical = getCanonicalSlug(prefix);
    if (!S50_SLUGS.has(canonical)) continue;
    const appearances = (seasonsBySlug.get(canonical) || new Set()).size;
    const baseRarity = placementToRarity(card.placement);
    const bump = rarityBumpLevels(baseRarity, appearances);
    const newRarity = bumpRarity(baseRarity, bump);
    if (card.rarity !== newRarity) {
      card.rarity = newRarity;
      updated++;
    }
  }

  process.stderr.write(
    `S50: ${added} new cards added; ${updated} returnee cards rarity updated; S50 names normalized.\n`
  );
  if (!dryRun) {
    fs.writeFileSync(outPath, JSON.stringify(cards, null, 2), 'utf8');
    process.stderr.write('Wrote ' + outPath + '\n');
  }
}

main();
