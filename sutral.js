// --- GLOBAL CONSTANTS & STATE ---
const EDGIC_SCORES = {
  CP:10, CPP:9, CPM:8, MOR:7,
  MORP:6, CPN:6, UTR:6,
  OTTP:5,
  OTT:4, OTTN:4, MORN:4, UTRP:4,
  MORM:3, OTTM:3,
  UTRN:2, UTRM:2, OTTPP:2, CPPP:2,
  INV:1
};
const SCORING_WEIGHTS = { w_alli: 0.30, w_edg: 0.30, w_idol: 0.20, w_conf: 0.20 };
const LOST_VOTE_MALUS = 0.15; // 15% reduction to episode score when player has lost vote
const POWER_EXPONENT = 4;
// Recency packages: new = latest 2 eps, mid = 3rd & 4th from end, old = older
const RECENCY_WEIGHT_NEW = 2;
const RECENCY_WEIGHT_MID = 1.5;
const RECENCY_WEIGHT_OLD = 1;
// Convergence: spread totals away from center so scores don't cluster near 5
const CONVERGENCE_CENTER = 5;
const CONVERGENCE_SPREAD_FACTOR = 1.5;
const STORAGE_KEY = 'sutral_autosave_v3';

let episodeCounter = 0;
let history = {};
let rankHistory = {};
let episodeSortState = {};
let pendingActionType = null;
let pendingFileEvent = null;
let saveTimeout;
let chartSeriesData = {};
let chartPlayers = [];
let playerColorMap = {};

// --- DOM ELEMENTS (static) ---
const helpBtn = document.getElementById('helpBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('import-file');
const importNamesBtn = document.getElementById('importNamesBtn');
const importNames = document.getElementById('import-names');
const importCastBtn = document.getElementById('importCastBtn');
const importCastFile = document.getElementById('import-cast-file');
const exportCastBtn = document.getElementById('exportCastBtn');
const addEpisodeBtn = document.getElementById('addEpisodeBtn');
const calculateBtn = document.getElementById('calculateBtn');
const episodesContainer = document.getElementById('episodes-container');
const winnerAnalysis = document.getElementById('winner-analysis');
const winnerDetails = document.getElementById('winner-details');
const chartContainer = document.getElementById('chart-container');
const autosaveMsg = document.getElementById('autosave-msg');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

// --- UTILITY FUNCTIONS ---
function mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToBrowser, 800);
}

// --- DATA PERSISTENCE ---
function serializeData() {
  const data = { episodeCounter, config: SCORING_WEIGHTS, episodes: [] };
  const eps = Array.from(document.querySelectorAll('.episode')).sort(
    (a, b) => parseInt(a.id.replace('ep', ''), 10) - parseInt(b.id.replace('ep', ''), 10)
  );
  eps.forEach(ep => {
    const epNum = parseInt(ep.id.replace('ep', ''), 10);
    const rows = [];
    const tbody = document.getElementById(`tbody-${ep.id}`);
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      if (!row.cells || row.cells.length < 12) return;
      rows.push({
        name: (row.cells[0].textContent || '').trim(),
        alliances: (row.cells[1].textContent || '').trim(),
        majority: row.cells[2].querySelector('input')?.checked ? 1 : 0,
        conf: (row.cells[3].textContent || '').trim(),
        edgic: row.cells[4].querySelector('select')?.value || '',
        idols: row.cells[5].querySelector('input')?.value ?? '',
        advs: row.cells[6].querySelector('input')?.value ?? '',
        bew: row.cells[7].querySelector('input')?.value ?? '',
        journey: row.cells[8].querySelector('input')?.checked ? 1 : 0,
        elim: row.cells[9].querySelector('input')?.checked ? 1 : 0,
        medevac: row.cells[10].querySelector('input')?.checked ? 1 : 0,
        lostVote: row.cells[11]?.querySelector?.('input')?.checked ? 1 : 0
      });
    });
    data.episodes.push({ epNum, rows });
  });
  return data;
}

function saveToBrowser() {
  const data = serializeData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (window.recordToolUsed) window.recordToolUsed('sutral');
  if (autosaveMsg) {
    autosaveMsg.style.display = 'block';
    setTimeout(() => autosaveMsg.style.display = 'none', 1000);
  }
}

function loadDataFromJSON(data) {
  episodesContainer.innerHTML = '';
  episodeCounter = 0;
  history = {};
  rankHistory = {};
  playerColorMap = {};
  winnerAnalysis.style.display = 'none';

  if (!data.episodes || data.episodes.length === 0) return false;

  const episodesSorted = [...data.episodes].sort(
    (a, b) => (a.epNum || 0) - (b.epNum || 0)
  );

  for (let i = 0; i < episodesSorted.length; i++) {
    addEpisode(false);
  }

  episodesSorted.forEach((ep, index) => {
    const epId = `ep${index + 1}`;
    const tbody = document.getElementById(`tbody-${epId}`);
    if (!tbody) return;
    while (tbody.rows.length > 0) tbody.deleteRow(0);
    (ep.rows || []).forEach(rowData => {
      addPlayerRow(epId, rowData.name != null ? rowData.name : '', false);
      const row = tbody.rows[tbody.rows.length - 1];
      if (!row || !row.cells || row.cells.length < 12) return;
      row.cells[1].textContent = rowData.alliances != null ? String(rowData.alliances) : '';
      if (row.cells[2].querySelector('input')) row.cells[2].querySelector('input').checked = !!rowData.majority;
      row.cells[3].textContent = rowData.conf != null ? String(rowData.conf) : '';
      if (row.cells[4].querySelector('select')) row.cells[4].querySelector('select').value = rowData.edgic != null ? rowData.edgic : '';
      if (row.cells[5].querySelector('input')) row.cells[5].querySelector('input').value = rowData.idols != null ? String(rowData.idols) : '';
      if (row.cells[6].querySelector('input')) row.cells[6].querySelector('input').value = rowData.advs != null ? String(rowData.advs) : '';
      if (row.cells[7].querySelector('input')) row.cells[7].querySelector('input').value = rowData.bew != null ? String(rowData.bew) : '';
      if (row.cells[8].querySelector('input')) row.cells[8].querySelector('input').checked = !!rowData.journey;
      if (row.cells[9].querySelector('input')) row.cells[9].querySelector('input').checked = !!rowData.elim;
      if (row.cells[10].querySelector('input')) row.cells[10].querySelector('input').checked = !!rowData.medevac;
      if (row.cells[11]?.querySelector?.('input')) row.cells[11].querySelector('input').checked = !!rowData.lostVote;
      validateInvLogic(row);
    });
  });

  return true;
}

function loadFromBrowser() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const loaded = loadDataFromJSON(data);
      if (loaded) {
        calculateAll(false);
        return true;
      }
    } catch (e) {
      console.error('SUTRAL: Error loading autosave', e);
    }
  }
  return false;
}

// --- MODALS ---
function openHelp() {
  helpModal.classList.add('open');
}
function closeHelp() {
  helpModal.classList.remove('open');
}
function closeConfirm() {
  confirmModal.classList.remove('open');
  if (pendingActionType === 'IMPORT') importFile.value = '';
  pendingActionType = null;
  pendingFileEvent = null;
}
function confirmAction() {
  confirmModal.classList.remove('open');
  if (pendingActionType === 'RESET') executeReset();
  else if (pendingActionType === 'IMPORT') executeImport(pendingFileEvent);
}
function triggerReset() {
  pendingActionType = 'RESET';
  confirmModal.classList.add('open');
}
function triggerImport() {
  importFile.click();
}

// --- DATA ACTIONS ---
function executeReset() {
  localStorage.removeItem(STORAGE_KEY);
  episodesContainer.innerHTML = '';
  episodeCounter = 0;
  history = {};
  rankHistory = {};
  playerColorMap = {};
  winnerAnalysis.style.display = 'none';
  addEpisode();
}

function executeImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      loadDataFromJSON(data);
      calculateAll(false);
      saveToBrowser();
      alert('Data imported successfully!');
      event.target.value = '';
    } catch (err) {
      alert('Import error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function exportData() {
  const data = serializeData();
  if (window.recordToolUsed) window.recordToolUsed('sutral');
  const filename = window.getSessionFilename ? window.getSessionFilename('Sutral', 'Session') : 'SUTRAL_Session_' + new Date().toISOString().slice(0, 10) + '.json';
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- BATCH IMPORT ---
function importPlayers() {
  const text = importNames.value;
  const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
  if (names.length === 0) { alert('Enter at least one name'); return; }
  if (episodeCounter === 0) addEpisode();
  const epId = `ep${episodeCounter}`;
  const tbody = document.getElementById(`tbody-${epId}`);
  if (!tbody) return;
  const existingNames = new Set();
  Array.from(tbody.rows).forEach(row => {
    const n = row.cells[0]?.textContent?.trim();
    if (n) existingNames.add(n);
  });
  const toAdd = names.filter(n => !existingNames.has(n));
  toAdd.forEach(name => { addPlayerRow(epId, name, false); });
  importNames.value = '';
  alert(`Added ${toAdd.length} player(s)${toAdd.length < names.length ? ` (${names.length - toAdd.length} already present)` : ''}`);
  saveToBrowser();
}

// --- EPISODE MANAGEMENT ---
function addEpisode(triggerSave = true) {
  const existingCount = document.querySelectorAll('.episode').length;
  episodeCounter = existingCount + 1;
  const epId = `ep${episodeCounter}`;
  const div = document.createElement('div');
  div.className = 'episode sutral-episode';
  div.id = epId;
  div.innerHTML = `
    <div class="episode-header sutral-episode-header" data-episode-id="${epId}">
      <div class="episode-header-left">
        <span class="episode-toggle sutral-episode-toggle" id="toggle-${epId}">▶</span>
        <span>📺 Episode ${episodeCounter}</span>
      </div>
      <div class="episode-header-right">
        <button class="btn-ep-del" data-episode-id="${epId}" title="Delete episode">🗑️</button>
      </div>
    </div>
    <div class="episode-content sutral-episode-content" id="content-${epId}">
      <table class="sutral-table">
        <thead>
          <tr>
            <th class="sortable" data-col="0">Player</th>
            <th class="sortable" data-col="1">Alliances</th>
            <th>Majority?</th>
            <th class="sortable" data-col="3"># Conf</th>
            <th class="sortable" data-col="4">Edgic</th>
            <th>#Idol</th>
            <th>#Adv</th>
            <th>#Bew</th>
            <th>Journey?</th>
            <th>Elim?</th>
            <th>Medevac?</th>
            <th>Lost vote?</th>
            <th class="scores-toggle" data-episode-id="${epId}">📊</th>
            <th class="scores-col sortable" data-col="13">Alli</th>
            <th class="scores-col sortable" data-col="14">Conf</th>
            <th class="scores-col sortable" data-col="15">EDGIC</th>
            <th class="scores-col sortable" data-col="16">Adv</th>
            <th class="sortable" data-col="17">EP Pts</th>
            <th class="sortable" data-col="18">Tot Pts</th>
            <th>Trend</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="tbody-${epId}"></tbody>
      </table>
      <div id="ranking-${epId}" class="sutral-ranking-info"></div>
    </div>`;
  episodesContainer.appendChild(div);
  const tbody = document.getElementById(`tbody-${epId}`);
  if (episodeCounter > 1) {
    const prevEpId = `ep${episodeCounter - 1}`;
    const prevTbody = document.getElementById(`tbody-${prevEpId}`);
    if (prevTbody) {
      while (tbody.rows.length > 0) tbody.deleteRow(0);
      Array.from(prevTbody.rows).forEach(prevRow => {
        const name = prevRow.cells[0].textContent.trim();
        const isElim = prevRow.cells[9].querySelector('input').checked;
        const isMedevac = prevRow.cells[10].querySelector('input').checked;
        if (name && !isElim && !isMedevac) addPlayerRow(epId, name, false);
      });
    }
  }
  if (tbody.rows.length === 0) addPlayerRow(epId, null, false);
  if (triggerSave) saveToBrowser();
}

function removeEpisode(epId) {
  const el = document.getElementById(epId);
  if (el) el.remove();
  renumberEpisodes();
  saveToBrowser();
}

function renumberEpisodes() {
  const episodes = document.querySelectorAll('.episode');
  episodes.forEach((ep, index) => {
    const newNum = index + 1;
    const newId = `ep${newNum}`;
    ep.id = newId;
    const header = ep.querySelector('.episode-header');
    header.dataset.episodeId = newId;
    header.querySelector('span:last-child').textContent = `📺 Episode ${newNum}`;
    const toggle = ep.querySelector('.episode-toggle');
    if (toggle) toggle.id = `toggle-${newId}`;
    const content = ep.querySelector('.episode-content');
    if (content) content.id = `content-${newId}`;
    const tbody = ep.querySelector('tbody');
    if (tbody) tbody.id = `tbody-${newId}`;
    const delBtn = ep.querySelector('.btn-ep-del');
    if (delBtn) delBtn.dataset.episodeId = newId;
    const scoreToggle = ep.querySelector('.scores-toggle');
    if (scoreToggle) scoreToggle.dataset.episodeId = newId;
    const rankingDiv = ep.querySelector('.sutral-ranking-info');
    if (rankingDiv) rankingDiv.id = `ranking-${newId}`;
    const rankingList = ep.querySelector('.ranking-list');
    if (rankingList) rankingList.id = `ranking-list-${newId}`;
  });
  episodeCounter = episodes.length;
}

// --- PLAYER ROW ---
function addPlayerRow(epId, presetName = null, triggerSave = true) {
  const tbody = document.getElementById(`tbody-${epId}`);
  if (!tbody) return;
  const row = tbody.insertRow();
  row.innerHTML = `
    <td contenteditable="true" data-placeholder="e.g. Player name">${presetName || ''}</td>
    <td contenteditable="true" data-placeholder="e.g. 0"></td>
    <td style="text-align:center"><input type="checkbox"></td>
    <td contenteditable="true" data-placeholder="e.g. 0"></td>
    <td><select>
        <option value="">-</option>
        <option>INV</option><option>UTR</option><option>UTRP</option><option>UTRM</option><option>UTRN</option>
        <option>MOR</option><option>MORP</option><option>MORM</option><option>MORN</option>
        <option>CP</option><option>CPP</option><option>CPPP</option><option>CPM</option><option>CPN</option>
        <option>OTT</option><option>OTTP</option><option>OTTPP</option><option>OTTM</option><option>OTTN</option>
    </select></td>
    <td><input type="number" min="0" placeholder="0"></td>
    <td><input type="number" min="0" placeholder="0"></td>
    <td><input type="number" min="0" placeholder="0"></td>
    <td style="text-align:center"><input type="checkbox"></td>
    <td style="text-align:center"><input type="checkbox"></td>
    <td style="text-align:center"><input type="checkbox"></td>
    <td style="text-align:center"><input type="checkbox" title="No vote at this tribal"></td>
    <td class="calc" style="cursor:default;font-size:0.75rem">📊</td>
    <td class="scores-col">0</td><td class="scores-col">0</td><td class="scores-col">0</td><td class="scores-col">0</td>
    <td>0</td><td>0</td><td>-</td>
    <td><button class="delete-player-btn sutral-delete-btn" title="Delete">✕</button></td>`;
  if (triggerSave) saveToBrowser();
}

// --- VALIDATION ---
function validateInvLogic(row) {
  const confCell = row.cells[3];
  const edgicSelect = row.cells[4].querySelector('select');
  const confVal = parseFloat(confCell.textContent) || 0;
  Array.from(edgicSelect.options).forEach(opt => {
    if (opt.value === 'INV') {
      opt.disabled = confVal > 0;
      if (edgicSelect.value === 'INV' && confVal > 0) {
        alert('You cannot select INV if the player has confessionals (# Conf > 0).');
        edgicSelect.value = '';
      }
    }
  });
}

// --- SORTING ---
function sortEpisodeByColumn(epId, colIndex, type) {
  const tbody = document.getElementById(`tbody-${epId}`);
  if (!tbody) return;
  const rows = Array.from(tbody.rows);
  if (!episodeSortState[epId]) episodeSortState[epId] = {};
  let isAsc = episodeSortState[epId][colIndex] === false ? true : false;
  if (episodeSortState[epId][colIndex] === undefined) isAsc = (type === 'text');
  episodeSortState[epId][colIndex] = isAsc;

  rows.sort((a, b) => {
    let aVal, bVal;
    if (colIndex === 0) {
      aVal = a.cells[colIndex].textContent.trim();
      bVal = b.cells[colIndex].textContent.trim();
    } else if (colIndex === 4) {
      aVal = a.cells[colIndex].querySelector('select').value;
      bVal = b.cells[colIndex].querySelector('select').value;
    } else {
      aVal = a.cells[colIndex].textContent.trim();
      bVal = b.cells[colIndex].textContent.trim();
    }
    if (type === 'number') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
      return isAsc ? aVal - bVal : bVal - aVal;
    }
    return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  rows.forEach(row => tbody.appendChild(row));
  saveToBrowser();
}

// --- TOGGLE EPISODE CONTENT ---
function toggleEpisode(epId) {
  const content = document.getElementById(`content-${epId}`);
  const toggle = document.getElementById(`toggle-${epId}`);
  if (content && toggle) {
    content.classList.toggle('open');
    toggle.textContent = content.classList.contains('open') ? '▼' : '▶';
  }
}

// --- TOGGLE SCORES COLUMNS ---
function toggleScores(epId) {
  const content = document.getElementById(`content-${epId}`);
  if (content) {
    content.querySelectorAll('.scores-col').forEach(cell => cell.classList.toggle('visible'));
  }
}

// --- RANKING TOGGLE ---
function toggleRanking(listId) {
  const list = document.getElementById(listId);
  if (list) list.classList.toggle('open');
}

// --- DELETE PLAYER ---
function deletePlayerRow(button) {
  if (!confirm('Remove this player?')) return;
  const row = button.closest('tr');
  if (row) row.remove();
  saveToBrowser();
}

// --- TREND DISPLAY (color-coded SVG icons) ---
const TREND_ICON_SIZE = 20;
const TREND_SVG_UP = `<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="${TREND_ICON_SIZE}" height="${TREND_ICON_SIZE}" fill="currentColor" aria-hidden="true"><path d="M12 4l-8 10h5v6h6v-6h5L12 4z"/></svg>`;
const TREND_SVG_DOWN = `<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="${TREND_ICON_SIZE}" height="${TREND_ICON_SIZE}" fill="currentColor" aria-hidden="true"><path d="M12 20l8-10h-5V4h-6v6H4l8 10z"/></svg>`;
const TREND_SVG_EQUAL = `<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="${TREND_ICON_SIZE}" height="${TREND_ICON_SIZE}" fill="currentColor" aria-hidden="true"><path d="M4 9h16v2H4V9zm0 5h16v2H4v-2z"/></svg>`;

function getTrendHtml(trend) {
  if (trend === 'up') return '<span class="sutral-trend sutral-trend-up" title="Trend up">' + TREND_SVG_UP + '</span>';
  if (trend === 'down') return '<span class="sutral-trend sutral-trend-down" title="Trend down">' + TREND_SVG_DOWN + '</span>';
  return '<span class="sutral-trend sutral-trend-equal" title="Stazionario">' + TREND_SVG_EQUAL + '</span>';
}

// --- RECENCY-WEIGHTED TOTAL ---
// Episodes: index 0 = first, index L-1 = latest. Package new = latest 2, mid = 3rd & 4th from end, old = rest.
function recencyWeightedTotal(scores) {
  if (!scores.length) return 0;
  const L = scores.length;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < L; i++) {
    const posFromEnd = L - i; // 1 = latest
    const w = posFromEnd <= 2 ? RECENCY_WEIGHT_NEW : posFromEnd <= 4 ? RECENCY_WEIGHT_MID : RECENCY_WEIGHT_OLD;
    sum += scores[i] * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

// --- CONVERGENCE: SPREAD TOTALS AWAY FROM CENTER ---
function spreadFromCenter(raw) {
  const spread = CONVERGENCE_CENTER + (raw - CONVERGENCE_CENTER) * CONVERGENCE_SPREAD_FACTOR;
  return Math.max(0, Math.min(10, spread));
}

// --- CALCULATION ---
// Read a single episode and return raw scores (without touching history/rankHistory)
function collectEpisodeScores(epId) {
  const cfg = SCORING_WEIGHTS;
  const tbody = document.getElementById(`tbody-${epId}`);
  if (!tbody) return { epId, players: [] };
  const rows = Array.from(tbody.rows);
  const confVals = rows.map(row => parseFloat(row.cells[3].textContent) || 0);
  const maxConf = Math.max(...confVals, 0);
  const players = [];
  rows.forEach(row => {
    const cells = row.cells;
    const name = cells[0].textContent.trim();
    if (!name) return;
    const alliCount = parseFloat(cells[1].textContent) || 0;
    const isMaj = cells[2].querySelector('input').checked ? 1 : 0;
    const confRaw = parseFloat(cells[3].textContent) || 0;
    const edgTag = cells[4].querySelector('select').value;
    const idolCount = parseInt(cells[5].querySelector('input').value) || 0;
    const advCount = parseInt(cells[6].querySelector('input').value) || 0;
    const bewCount = parseInt(cells[7].querySelector('input').value) || 0;
    const journey = cells[8].querySelector('input').checked ? 1 : 0;
    const elim = cells[9].querySelector('input').checked ? 1 : 0;
    const medevac = cells[10].querySelector('input').checked ? 1 : 0;
    const lostVote = cells[11]?.querySelector?.('input')?.checked ?? false;
    const confRawAdjusted = journey ? confRaw * 0.7 : confRaw;
    const alliScore = Math.min(10, 2 * alliCount + (isMaj ? 3 : 0));
    const confScore = maxConf > 0 ? (10 * confRawAdjusted / maxConf) : 0;
    const edgScore = EDGIC_SCORES[edgTag] || 0;
    const idolScore = 3 * idolCount;
    const advScore = 1.5 * advCount;
    const baseId = Math.max(0, idolScore + advScore);
    const bewareFactor = Math.max(0, 1 - 0.1 * bewCount);
    const idolComp = Math.min(10, baseId) * bewareFactor;
    let baseRaw = cfg.w_idol * idolComp + cfg.w_alli * alliScore + cfg.w_edg * edgScore + cfg.w_conf * confScore;
    if (lostVote) baseRaw *= (1 - LOST_VOTE_MALUS);
    players.push({
      name,
      alliScore,
      confScore,
      edgScore,
      idolComp,
      baseRaw,
      elim: elim === 1,
      medevac: medevac === 1
    });
  });
  return { epId, players };
}

// Update a single episode table using pre-populated history/rankHistory (global)
function updateEpisodeTable(epId, episodeDataIndex, allEpisodeData) {
  const epData = allEpisodeData[episodeDataIndex];
  if (!epData) return;
  const tbody = document.getElementById(`tbody-${epId}`);
  if (!tbody) return;
  const rows = Array.from(tbody.rows);
  const playersWithTotals = epData.players.map(p => {
    const scoresSoFar = (history[p.name] || []).slice(0, episodeDataIndex + 1);
    const totalPtsRaw = recencyWeightedTotal(scoresSoFar);
    const totalPts = spreadFromCenter(totalPtsRaw);
    let trend = 'equal';
    if (episodeDataIndex > 0) {
      const prevRaw = recencyWeightedTotal((history[p.name] || []).slice(0, episodeDataIndex));
      const prevSpread = spreadFromCenter(prevRaw);
      if (totalPts > prevSpread + 0.1) trend = 'up';
      else if (totalPts < prevSpread - 0.1) trend = 'down';
    }
    return { ...p, totalPts, totalPtsRaw, trend };
  });
  playersWithTotals.sort((a, b) => b.totalPts - a.totalPts);
  playersWithTotals.forEach((p, i) => { p.rank = i + 1; });
  rows.forEach((row) => {
    const pName = row.cells[0].textContent.trim();
    const p = playersWithTotals.find(pl => pl.name === pName);
    if (!p) return;
    const c = row.cells;
    c[13].textContent = p.alliScore.toFixed(1);
    c[14].textContent = p.confScore.toFixed(1);
    c[15].textContent = p.edgScore.toFixed(1);
    c[16].textContent = p.idolComp.toFixed(2);
    c[17].textContent = p.baseRaw.toFixed(2);
    c[18].textContent = p.totalPts.toFixed(2);
    c[19].innerHTML = getTrendHtml(p.trend);
    row.className = '';
    if (p.rank <= 3) {
      row.classList.add('sutral-bottom3', `sutral-rank${p.rank}`);
    } else {
      row.classList.add('sutral-safe');
    }
  });
  const rankingDiv = document.getElementById(`ranking-${epId}`);
  const rankingId = `ranking-list-${epId}`;
  const sorted = playersWithTotals.slice().sort((a, b) => a.rank - b.rank);
  const n = sorted.length;
  const useTwoCols = n >= 8;
  const leftCount = Math.floor(n / 2);
  const makeTable = (arr) => `
    <table class="sutral-power-table">
      <thead><tr><th>Pos</th><th>Name</th><th>Points</th></tr></thead>
      <tbody>${arr.map(p => {
        const color = getPlayerColor(p.name);
        return `<tr><td>${p.rank}</td><td><span class="player-color-dot" style="background:${color}"></span>${p.name}</td><td>${p.totalPts.toFixed(2)}</td></tr>`;
      }).join('')}</tbody>
    </table>`;
  let tableHtml;
  if (useTwoCols) {
    const left = sorted.slice(0, leftCount);
    const right = sorted.slice(leftCount);
    tableHtml = `<div class="sutral-power-two-cols"><div>${makeTable(left)}</div><div>${makeTable(right)}</div></div>`;
  } else {
    tableHtml = makeTable(sorted);
  }
  if (rankingDiv) {
    rankingDiv.innerHTML = `<div class="sutral-ranking-collapsible" data-ranking-id="${rankingId}">📊 Power Rankings ▶</div><div id="${rankingId}" class="ranking-list sutral-ranking-list">${tableHtml}</div>`;
  }
}

function calculateAll(triggerSave = true) {
  history = {};
  rankHistory = {};
  ensurePlayerColors();
  const eps = Array.from(document.querySelectorAll('.episode')).sort(
    (a, b) => parseInt(a.id.replace('ep', ''), 10) - parseInt(b.id.replace('ep', ''), 10)
  );
  if (eps.length === 0) {
    if (winnerAnalysis) winnerAnalysis.style.display = 'none';
    return;
  }
  // Phase 1: collect data from ALL episodes (DOM read only)
  const allEpisodeData = eps.map(ep => collectEpisodeScores(ep.id));
  // Phase 2: build global history and rankHistory (weighted by recency)
  allEpisodeData.forEach(({ epId, players }) => {
    players.forEach(p => {
      if (!history[p.name]) history[p.name] = [];
      history[p.name].push(p.baseRaw);
      if (!rankHistory[p.name]) rankHistory[p.name] = [];
      const idx = rankHistory[p.name].length;
      const scoresSoFar = history[p.name].slice(0, idx + 1);
      const totalPtsRaw = recencyWeightedTotal(scoresSoFar);
      rankHistory[p.name].push({
        ep: epId,
        baseRaw: p.baseRaw,
        blockFinal: p.baseRaw,
        totalPts: totalPtsRaw,
        eliminated: p.elim || p.medevac
      });
    });
  });
  episodeCounter = eps.length;
  // Phase 3: update each episode's tables (Tot Pts, trend, ranking)
  allEpisodeData.forEach((epData, i) => {
    updateEpisodeTable(epData.epId, i, allEpisodeData);
  });
  analyzeWinners();
  if (triggerSave) saveToBrowser();
}

// --- WINNER ANALYSIS & CHART ---
const CHART_PALETTE_SIZE = 18;
function indexToChartColor(index) {
  const hue = ((index % CHART_PALETTE_SIZE) * (360 / CHART_PALETTE_SIZE)) % 360;
  return `hsl(${hue}, 72%, 48%)`;
}

function getInitialCast() {
  const tbody = document.getElementById('tbody-ep1');
  if (!tbody) return [];
  const cast = [];
  Array.from(tbody.rows).forEach(row => {
    const name = (row.cells[0]?.textContent || '').trim();
    if (name) cast.push(name);
  });
  return cast;
}

function ensurePlayerColors() {
  const initialCast = getInitialCast();
  let nextIndex = Object.keys(playerColorMap).length;
  initialCast.forEach(p => {
    if (!(p in playerColorMap)) {
      playerColorMap[p] = indexToChartColor(nextIndex);
      nextIndex++;
    }
  });
}

function getPlayerColor(player) {
  if (!(player in playerColorMap)) {
    const idx = Object.keys(playerColorMap).length;
    playerColorMap[player] = indexToChartColor(idx);
  }
  return playerColorMap[player];
}

function calculateProbabilities(scoresMap) {
  const names = Object.keys(scoresMap);
  const n = names.length;
  if (n === 0) return {};
  let totalPower = 0;
  const powerMap = {};
  names.forEach(p => {
    const val = scoresMap[p];
    const pwr = Math.pow(Math.max(0, val), POWER_EXPONENT);
    powerMap[p] = pwr;
    totalPower += pwr;
  });
  const probs = {};
  const minEquityPct = 0.1;
  const remainingPool = 100 - n * minEquityPct;
  names.forEach(p => {
    let share = totalPower > 0 ? powerMap[p] / totalPower : 1 / n;
    probs[p] = remainingPool < 0 ? share * 100 : minEquityPct + (remainingPool * share);
  });
  return probs;
}

// Scala Y adattiva: più dati in una fascia → più altezza (granularità data-driven)
const CHART_Y_MIN = 0.1;
// 0 = scala lineare, 1 = scala totalmente guidata dalla densità. Override da Bottega (localStorage 'sutral_chart_adaptive_strength').
const CHART_ADAPTIVE_STRENGTH_DEFAULT = 0.35;
function getChartAdaptiveStrength() {
  try {
    const v = localStorage.getItem('sutral_chart_adaptive_strength');
    if (v != null) { const n = parseFloat(v); if (!isNaN(n)) return Math.max(0, Math.min(1, n)); }
  } catch (e) {}
  return CHART_ADAPTIVE_STRENGTH_DEFAULT;
}
// Fascia 70–100%: massima frazione di altezza (sempre compressa in alto)
const CHART_TOP_BAND_MAX_FRAC = 0.07;
const CHART_TOP_BAND_START = 70;
function buildAdaptiveScale(allValues, yMax) {
  const sorted = allValues.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const alpha = Math.max(0, Math.min(1, getChartAdaptiveStrength()));
  const range = Math.max(yMax - CHART_Y_MIN, 0.1);

  function valueToNormYInner(v) {
    const val = Math.max(Math.min(v, yMax), CHART_Y_MIN);
    const linear = (val - CHART_Y_MIN) / range;
    if (n === 0) return linear;
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (sorted[i] <= val) count++;
      else break;
    }
    const data = count / n;
    return (1 - alpha) * linear + alpha * data;
  }

  function normYToValueInner(normY) {
    const ny = Math.max(0, Math.min(1, normY));
    if (n === 0) return CHART_Y_MIN + ny * range;
    const uniq = [CHART_Y_MIN];
    let prev = CHART_Y_MIN;
    for (let i = 0; i < n; i++) {
      if (sorted[i] > prev && sorted[i] <= yMax) { uniq.push(sorted[i]); prev = sorted[i]; }
    }
    if (yMax > prev) uniq.push(yMax);
    const samples = uniq.map(v => ({ ny: valueToNormYInner(v), v }));
    samples.sort((a, b) => a.ny - b.ny);
    if (ny <= samples[0].ny) return samples[0].v;
    if (ny >= samples[samples.length - 1].ny) return samples[samples.length - 1].v;
    for (let i = 0; i < samples.length - 1; i++) {
      if (ny >= samples[i].ny && ny <= samples[i + 1].ny) {
        const t = (ny - samples[i].ny) / (samples[i + 1].ny - samples[i].ny || 1e-9);
        return samples[i].v + t * (samples[i + 1].v - samples[i].v);
      }
    }
    return yMax;
  }

  const capTop = yMax >= CHART_TOP_BAND_START;
  const raw70 = capTop ? valueToNormYInner(CHART_TOP_BAND_START) : 1;
  const belowFrac = 1 - CHART_TOP_BAND_MAX_FRAC;

  function valueToNormY(v) {
    const raw = valueToNormYInner(v);
    if (!capTop || raw <= raw70) return raw <= raw70 ? raw * (belowFrac / (raw70 || 1e-9)) : raw;
    return belowFrac + (raw - raw70) / (1 - raw70 || 1e-9) * CHART_TOP_BAND_MAX_FRAC;
  }

  function normYToValue(normY) {
    const ny = Math.max(0, Math.min(1, normY));
    if (!capTop) return normYToValueInner(ny);
    if (ny <= belowFrac) return normYToValueInner(ny * (raw70 / belowFrac));
    return normYToValueInner(raw70 + (ny - belowFrac) / CHART_TOP_BAND_MAX_FRAC * (1 - raw70));
  }

  return { valueToNormY, normYToValue };
}

function drawChart(playersToShow, seriesData) {
  const w = chartContainer.clientWidth || 800;
  const h = chartContainer.clientHeight || 300;
  const padding = 30;
  const rightBuffer = 120;
  let maxEp = 0;
  playersToShow.forEach(p => {
    const s = seriesData[p] || [];
    s.forEach(pt => {
      const idx = parseInt(String(pt.ep).replace('ep', ''), 10);
      if (!isNaN(idx) && idx > maxEp) maxEp = idx;
    });
  });
  if (maxEp < 0) { chartContainer.innerHTML = ''; return; }
  const numEp = maxEp;
  let maxVal = 0;
  playersToShow.forEach(p => {
    const s = seriesData[p] || [];
    s.forEach(pt => { if (pt.val > maxVal) maxVal = pt.val; });
  });
  let yMax = Math.ceil(maxVal / 5) * 5;
  if (yMax < 5) yMax = 5;
  if (yMax > 100) yMax = 100;
  const allValues = [];
  playersToShow.forEach(p => {
    const s = seriesData[p] || [];
    s.forEach(pt => allValues.push(Math.max(CHART_Y_MIN, Math.min(pt.val, yMax))));
  });
  const scale = buildAdaptiveScale(allValues, yMax);
  let svgHtml = `<svg viewBox="0 0 ${w} ${h}">`;
  const numBands = 8;
  const formatBandLabel = (v, forceTwoDecimals) => {
    if (v < 1) return v.toFixed(2);
    if (v >= yMax - 0.5) return Math.round(yMax) + '';
    if (forceTwoDecimals || v < 10) return v.toFixed(1);
    return Math.round(v) + '';
  };
  let prevLabel = '';
  for (let i = 0; i <= numBands; i++) {
    const normY = i / numBands;
    const val = scale.normYToValue(normY);
    let label = formatBandLabel(val);
    if (label === prevLabel) label = formatBandLabel(val, true);
    prevLabel = label;
    const y = h - padding - normY * (h - 2 * padding);
    svgHtml += `<line x1="${padding}" y1="${y}" x2="${w - rightBuffer}" y2="${y}" stroke="#eee" stroke-width="1" stroke-dasharray="4 2" />`;
    svgHtml += `<text x="5" y="${y + 3}" font-size="10" fill="#666">${label}%</text>`;
  }
  for (let i = 0; i <= numEp; i++) {
    const x = padding + (i / (numEp > 0 ? numEp : 1)) * (w - padding - rightBuffer);
    svgHtml += `<text x="${x - 5}" y="${h - 10}" font-size="10" fill="#666">Ep${i}</text>`;
  }
  const xScale = (numEp > 0 ? numEp : 1);
  playersToShow.forEach(p => {
    const s = seriesData[p];
    if (!s || s.length === 0) return;
    const color = getPlayerColor(p);
    const coords = s.map(entry => {
      const epIndex = parseInt(entry.ep.replace('ep', ''), 10);
      const x = padding + (epIndex / xScale) * (w - padding - rightBuffer);
      const drawVal = Math.max(Math.min(entry.val, yMax), CHART_Y_MIN);
      const normY = scale.valueToNormY(drawVal);
      const y = h - padding - normY * (h - 2 * padding);
      return { x, y, val: entry.val, ep: entry.ep };
    });
    let d = '';
    coords.forEach((pt, i) => { d += (i === 0 ? 'M' : 'L') + `${pt.x},${pt.y} `; });
    const lastPt = coords[coords.length - 1];
    const circlesHtml = coords.map(pt => `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${color}" stroke="#fff" stroke-width="2"><title>${p} (Ep${pt.ep.replace('ep','')}): ${pt.val.toFixed(1)}%</title></circle>`).join('');
    svgHtml += `<g class="chart-series" data-player="${p.replace(/"/g, '&quot;')}"><path d="${d}" stroke="${color}" fill="none" stroke-width="3" stroke-linecap="round" /><path d="${d}" stroke="transparent" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer" />${circlesHtml}<text x="${lastPt.x + 8}" y="${lastPt.y}" fill="${color}" font-size="11" font-weight="bold">${p}</text></g>`;
  });
  svgHtml += `</svg>`;
  chartContainer.innerHTML = svgHtml;
}

function analyzeWinners() {
  try {
    const winnerDetailsEl = document.getElementById('winner-details');
    const winnerEl = document.getElementById('winner-analysis');
    if (!winnerDetailsEl || !winnerEl) return;
    const allPlayers = new Set();
    const eliminatedPlayers = new Set();
    document.querySelectorAll('.episode tbody tr').forEach(row => {
      if (!row.cells || row.cells.length < 11) return;
      const name = (row.cells[0]?.textContent || '').trim();
      if (!name) return;
      allPlayers.add(name);
      const elimInput = row.cells[9]?.querySelector?.('input');
      const medevacInput = row.cells[10]?.querySelector?.('input');
      const isElim = elimInput?.checked ?? false;
      const isMedevac = medevacInput?.checked ?? false;
      if (isElim || isMedevac) eliminatedPlayers.add(name);
    });
    const remaining = Array.from(allPlayers).filter(x => !eliminatedPlayers.has(x));
    if (remaining.length === 0) {
      winnerDetailsEl.innerHTML = '<p style="color:#666; padding:1rem;">No players in the game. Add names in the episodes and ensure at least one player is not marked as eliminated.</p>';
      if (chartContainer) chartContainer.innerHTML = '';
      winnerEl.style.display = 'block';
      winnerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const allSeries = {};
    const episodeIds = Array.from(document.querySelectorAll('.episode'))
      .map(ep => ep.id)
      .sort((a, b) => parseInt(a.replace('ep', ''), 10) - parseInt(b.replace('ep', ''), 10));
    for (const epKey of episodeIds) {
      const stepScores = {};
      Object.keys(rankHistory).forEach(pName => {
        const hist = rankHistory[pName];
        const epIdx = hist.findIndex(h => h.ep === epKey);
        if (epIdx === -1) return;
        const snapshot = hist[epIdx];
        if (!snapshot.eliminated) stepScores[pName] = spreadFromCenter(snapshot.totalPts);
      });
      const stepProbs = calculateProbabilities(stepScores);
      Object.keys(stepProbs).forEach(pName => {
        if (!allSeries[pName]) allSeries[pName] = [];
        allSeries[pName].push({ ep: epKey, val: stepProbs[pName] });
      });
    }
    const castSize = allPlayers.size;
    remaining.forEach(pName => {
      if (!allSeries[pName]) allSeries[pName] = [];
      const startVal = castSize > 0 ? 100 / castSize : 0;
      allSeries[pName].unshift({ ep: 'ep0', val: startVal });
    });
    const currentScoresMap = {};
    remaining.forEach(p => {
      const playerHistory = rankHistory[p] || [];
      const latest = playerHistory[playerHistory.length - 1];
      currentScoresMap[p] = latest ? spreadFromCenter(latest.totalPts) : 0;
    });
    const sortedByScore = [...remaining].sort((a, b) => {
      const d = currentScoresMap[b] - currentScoresMap[a];
      return d !== 0 ? d : String(a).localeCompare(String(b));
    });
    const rankCurr = {};
    sortedByScore.forEach((p, i) => { rankCurr[p] = i + 1; });
    const trends = {};
    const withPrevEpisode = Object.keys(rankHistory).filter(p => (rankHistory[p] || []).length >= 2);
    const scorePrev = {};
    withPrevEpisode.forEach(p => {
      const hist = rankHistory[p];
      scorePrev[p] = spreadFromCenter(hist[hist.length - 2].totalPts);
    });
    const sortedByPrev = [...withPrevEpisode].sort((a, b) => {
      const d = (scorePrev[b] || 0) - (scorePrev[a] || 0);
      return d !== 0 ? d : String(a).localeCompare(String(b));
    });
    const rankPrev = {};
    sortedByPrev.forEach((p, i) => { rankPrev[p] = i + 1; });
    remaining.forEach(p => {
      let trendKey = 'equal';
      if (rankPrev[p] != null && rankCurr[p] != null) {
        if (rankCurr[p] < rankPrev[p]) trendKey = 'up';
        else if (rankCurr[p] > rankPrev[p]) trendKey = 'down';
      }
      trends[p] = trendKey;
    });
    const finalProbs = calculateProbabilities(currentScoresMap);
    chartSeriesData = allSeries;
    chartPlayers = sortedByScore;
    let html = '<table id="winner-table" class="sutral-winner-table"><tbody><tr><th onclick="sortWinnerTable(0)">Player ⇅</th><th onclick="sortWinnerTable(1)">Tot Pts ⇅</th><th onclick="sortWinnerTable(2)">Trend ⇅</th><th onclick="sortWinnerTable(3)">Win Equity (%) ⇅</th><th class="chart-col">Chart</th></tr>';
    sortedByScore.forEach(p => {
      const prob = finalProbs[p] ? finalProbs[p].toFixed(1) : "0.0";
      const safeP = p.replace(/"/g, '&quot;');
      const color = getPlayerColor(p);
      html += `<tr data-player="${safeP}"><td><span class="player-color-dot" style="background:${color}"></span>${p}</td><td>${currentScoresMap[p].toFixed(2)}</td><td>${getTrendHtml(trends[p])}</td><td><strong>${prob}%</strong></td><td class="chart-col"><label class="chart-switch"><input type="checkbox" class="chart-visibility-toggle" data-player="${safeP}" checked><span class="chart-switch-slider"></span></label></td></tr>`;
    });
    html += '</tbody></table>';
    winnerDetailsEl.innerHTML = html;
    winnerEl.style.display = 'block';
    drawChart(sortedByScore, allSeries);
    winnerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveToBrowser();
  } catch (e) {
    console.error("Error in analyzeWinners:", e);
    alert("Calculation error. Check the console.");
  }
}

let winnerSortAsc = { 0: true, 1: true, 2: true, 3: true };
window.sortWinnerTable = function(colIndex) {
  const table = document.getElementById('winner-table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr')).slice(1);
  const isAsc = winnerSortAsc[colIndex];
  rows.sort((a, b) => {
    let aVal, bVal;
    if (colIndex === 0 || colIndex === 2) {
      aVal = a.cells[colIndex].textContent.toLowerCase();
      bVal = b.cells[colIndex].textContent.toLowerCase();
      return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    aVal = parseFloat(a.cells[colIndex].textContent) || 0;
    bVal = parseFloat(b.cells[colIndex].textContent) || 0;
    return isAsc ? aVal - bVal : bVal - aVal;
  });
  rows.forEach(row => tbody.appendChild(row));
  winnerSortAsc[colIndex] = !isAsc;
};

function refreshChartFromToggles() {
  if (!chartContainer || Object.keys(chartSeriesData).length === 0) return;
  const toggles = document.querySelectorAll('.chart-visibility-toggle:checked');
  const visible = Array.from(toggles).map(t => t.dataset.player);
  drawChart(visible, chartSeriesData);
}

// --- EVENT DELEGATION ---
episodesContainer.addEventListener('click', (e) => {
  // Check buttons first (they are inside header, so must run before header toggle)
  const delBtn = e.target.closest('.btn-ep-del');
  if (delBtn) {
    e.stopPropagation();
    removeEpisode(delBtn.dataset.episodeId);
    return;
  }
  const header = e.target.closest('.episode-header');
  if (header) {
    toggleEpisode(header.dataset.episodeId);
    return;
  }
  const scoreToggle = e.target.closest('.scores-toggle');
  if (scoreToggle) {
    e.stopPropagation();
    let epId = scoreToggle.dataset.episodeId;
    if (!epId) {
      const content = scoreToggle.closest('.episode-content');
      if (content) epId = content.id.replace('content-', '');
    }
    if (epId) toggleScores(epId);
    return;
  }
  const rankColl = e.target.closest('.sutral-ranking-collapsible');
  if (rankColl) {
    toggleRanking(rankColl.dataset.rankingId);
    return;
  }
  const delPlayerBtn = e.target.closest('.delete-player-btn');
  if (delPlayerBtn) {
    deletePlayerRow(delPlayerBtn);
    return;
  }
});

episodesContainer.addEventListener('click', (e) => {
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const table = th.closest('table');
  if (!table) return;
  const epContent = table.closest('.episode-content');
  if (!epContent) return;
  const epId = epContent.id.replace('content-', '');
  const colIndex = parseInt(th.dataset.col);
  const type = (colIndex === 0 || colIndex === 4) ? 'text' : 'number';
  sortEpisodeByColumn(epId, colIndex, type);
});

episodesContainer.addEventListener('change', (e) => {
  const select = e.target.closest('select');
  if (select && select.closest('td') && select.closest('td').cellIndex === 4) {
    validateInvLogic(select.closest('tr'));
    debouncedSave();
  }
  if (e.target.matches('input[type="checkbox"], input[type="number"]')) debouncedSave();
});

episodesContainer.addEventListener('input', (e) => {
  if (e.target.matches('td[contenteditable="true"]')) {
    const row = e.target.closest('tr');
    if (row && row.cells[3] === e.target) validateInvLogic(row);
    debouncedSave();
  }
});

// --- STATIC LISTENERS ---
helpBtn.addEventListener('click', openHelp);
closeHelpBtn.addEventListener('click', closeHelp);
window.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp();
  if (e.target === confirmModal) closeConfirm();
});
exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', triggerImport);
importFile.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    pendingActionType = 'IMPORT';
    pendingFileEvent = e;
    confirmModal.classList.add('open');
  }
});
function attachSutralReset() {
  var sutralResetBtn = document.getElementById('sutral-reset');
  if (sutralResetBtn) sutralResetBtn.addEventListener('click', triggerReset);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachSutralReset);
} else {
  attachSutralReset();
}
confirmYesBtn.addEventListener('click', confirmAction);
confirmNoBtn.addEventListener('click', closeConfirm);
importNamesBtn.addEventListener('click', importPlayers);

importCastBtn.addEventListener('click', () => importCastFile.click());
exportCastBtn.addEventListener('click', function() {
  const names = new Set();
  document.querySelectorAll('.episode tbody tr').forEach(row => {
    const n = row.cells[0]?.textContent?.trim();
    if (n) names.add(n);
  });
  if (names.size === 0) {
    const fromText = importNames.value.trim().split('\n').filter(Boolean);
    fromText.forEach(n => names.add(n));
  }
  if (names.size === 0) { alert('No players to export.'); return; }
  const data = window.CastShared.createUnifiedCast({
    players: [...names].map(n => ({ nome: n })),
    tribes: [],
    seasonName: ''
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = window.getCastFilename ? window.getCastFilename() : 'cast_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

importCastFile.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = function(ev) {
    const parsed = window.CastShared && window.CastShared.parseUnifiedCast(ev.target.result);
    if (!parsed || !parsed.valid) {
      alert(parsed ? parsed.error : 'Carica cast unificato da Simoa (export cast).');
      e.target.value = '';
      return;
    }
    const names = window.CastShared.forSutral(parsed.data);
    importNames.value = names.join('\n');
    importPlayers();
    e.target.value = '';
  };
  r.readAsText(file);
});
addEpisodeBtn.addEventListener('click', () => addEpisode());
calculateBtn.addEventListener('click', () => calculateAll(true));

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
  const loaded = loadFromBrowser();
  if (!loaded) addEpisode(false);
  episodesContainer.addEventListener('input', debouncedSave);
  episodesContainer.addEventListener('change', debouncedSave);
  if (winnerAnalysis) {
    winnerAnalysis.addEventListener('change', (e) => {
      if (e.target.classList.contains('chart-visibility-toggle')) {
        refreshChartFromToggles();
      }
    });
  }
});