/**
 * Parses Wikipedia contestants file, fills S9-S49 placeholder names in torcha-cards.json,
 * and removes the tribe field from all cards.
 */

const fs = require('fs');
const path = require('path');

const SEASON_NAME_TO_NUM = {
  'Vanuatu': 9, 'Palau': 10, 'Guatemala': 11, 'Panama': 12, 'Cook Islands': 13,
  'Fiji': 14, 'China': 15, 'Micronesia': 16, 'Gabon': 17, 'Tocantins': 18,
  'Samoa': 19, 'Heroes vs. Villains': 20, 'Nicaragua': 21, 'Redemption Island': 22,
  'South Pacific': 23, 'One World': 24, 'Philippines': 25, 'Caramoan': 26,
  'Blood vs. Water': 27, 'Cagayan': 28, 'San Juan del Sur': 29, 'Worlds Apart': 30,
  'Cambodia': 31, 'Kaôh Rōng': 32, 'Kaoh Rong': 32, 'Millennials vs. Gen X': 33,
  'Game Changers': 34, 'Heroes vs. Healers vs. Hustlers': 35, 'Ghost Island': 36,
  'David vs. Goliath': 37, 'Edge of Extinction': 38, 'Island of the Idols': 39,
  'Winners at War': 40
};

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/["']/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function stripWikiName(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*[\^◊o‡]\s*$/, '') // remove return appearance markers
    .replace(/\[([^\]]+)\](?:\([^)]*\))?/g, '$1') // [Name](url) -> Name
    .replace(/&quot;/g, '"')
    .trim();
}

function parseFinish(finish) {
  const f = (finish || '').trim();
  if (/^Winner$/i.test(f)) return 1;
  if (/^Runner-up$/i.test(f)) return 2;
  if (/^2nd Runner-up$/i.test(f) || /^3rd$/i.test(f)) return 3;
  if (/^Co-runner up$/i.test(f)) return null; // caller assigns 2 and 3
  const m = f.match(/^(\d+)th$/);
  if (m) return parseInt(m[1], 10);
  const m2 = f.match(/^(\d+)st$/);
  if (m2) return parseInt(m2[1], 10);
  const m3 = f.match(/^(\d+)nd$/);
  if (m3) return parseInt(m3[1], 10);
  const m4 = f.match(/^(\d+)rd$/);
  if (m4) return parseInt(m4[1], 10);
  return null;
}

function parseWikiFile(content) {
  const bySeason = {};
  let currentSeason = null;
  let coRunnerUpCount = 0;

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('|') || line.startsWith('| ---') || line.startsWith('| Name ')) continue;
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 6) continue;
    const nameCell = parts[1];
    const seasonCell = parts[5] || '';
    // First row of a season has Season link in [5] and Finish in [6]; continuation rows have Finish in [5]
    const finishCell = (parts[6] && parts[6].trim()) ? parts[6].trim() : (parts[5] || '').trim();

    if (seasonCell.includes('Survivor')) {
      let num = null;
      const matchNum = seasonCell.match(/Survivor\s+(\d+)/i);
      if (matchNum) {
        num = parseInt(matchNum[1], 10);
      } else {
        const matchName = seasonCell.match(/Survivor:\s*([^\](\[]+)/i);
        if (matchName) {
          const name = matchName[1].trim();
          num = SEASON_NAME_TO_NUM[name] || SEASON_NAME_TO_NUM[name.replace(/_/g, ' ')];
        }
      }
      if (num != null && num >= 9 && num <= 49) {
        currentSeason = num;
        if (!bySeason[currentSeason]) bySeason[currentSeason] = {};
      }
    }

    if (currentSeason == null) continue;

    const name = stripWikiName(nameCell);
    if (!name) continue;

    let placement = parseFinish(finishCell);
    if (placement === null) {
      if (/Co-runner up/i.test(finishCell)) {
        coRunnerUpCount++;
        placement = coRunnerUpCount === 1 ? 3 : 2;
        if (coRunnerUpCount >= 2) coRunnerUpCount = 0;
      } else continue;
    } else {
      coRunnerUpCount = 0;
    }

    bySeason[currentSeason][placement] = name;
  }

  return bySeason;
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const wikiPath = process.argv[2] || path.join(projectRoot, 'scripts', 'wiki-contestants.txt');
  const cardsPath = path.join(projectRoot, 'torcha-cards.json');

  if (!fs.existsSync(wikiPath)) {
    console.error('Wikipedia file not found:', wikiPath);
    process.exit(1);
  }

  const wikiContent = fs.readFileSync(wikiPath, 'utf8');
  const bySeason = parseWikiFile(wikiContent);

  let cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
  let updated = 0;
  let tribeRemoved = 0;

  for (const card of cards) {
    if (card.tribe !== undefined) {
      delete card.tribe;
      tribeRemoved++;
    }

    if (card.season >= 9 && card.season <= 49 && card.placement != null) {
      const placeholderMatch = card.name && card.name.match(/^S(\d+)\s*–\s*Contestant\s+(\d+)$/);
      const lookup = bySeason[card.season];
      const realName = lookup && lookup[card.placement];

      if (realName) {
        card.name = realName;
        card.id = slug(realName) + ':s' + String(card.season).padStart(2, '0');
        updated++;
      }
    }
  }

  // Remove any card that is still a placeholder (e.g. seasons with 16 cast have no 17th/18th)
  const beforeRemove = cards.length;
  cards = cards.filter(c => !c.name || !c.name.match(/^S\d+\s*–\s*Contestant\s+\d+$/));
  const removed = beforeRemove - cards.length;

  fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2), 'utf8');
  console.log('Removed tribe from', tribeRemoved, 'cards. Filled', updated, 'names. Removed', removed, 'leftover placeholders.');
}

main();
