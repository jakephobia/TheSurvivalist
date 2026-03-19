/**
 * Sutral Export - Standalone module for PNG export from Bottega
 * Computes Sutral data from JSON and builds exportable HTML
 */
(function (global) {
  'use strict';

  const EDGIC_SCORES = {
    CP: 10, CPP: 9, CPM: 8, MOR: 7, MORP: 6, CPN: 6, UTR: 6, OTTP: 5,
    OTT: 4, OTTN: 4, MORN: 4, UTRP: 4, MORM: 3, OTTM: 3,
    UTRN: 2, UTRM: 2, OTTPP: 2, CPPP: 2, INV: 1
  };
  const SCORING_WEIGHTS = { w_alli: 0.30, w_edg: 0.30, w_idol: 0.20, w_conf: 0.20 };
  const LOST_VOTE_MALUS = 0.15;
  const POWER_EXPONENT = 4;
  const RECENCY_WEIGHT_NEW = 2;
  const RECENCY_WEIGHT_MID = 1.5;
  const RECENCY_WEIGHT_OLD = 1;
  const CONVERGENCE_CENTER = 5;
  const CONVERGENCE_SPREAD_FACTOR = 1.5;
  const CHART_Y_MIN = 0.1;
  const CHART_PALETTE_SIZE = 18;
  const TREND_ICON_SIZE = 20;
  const TREND_SVG_UP = '<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4l-8 10h5v6h6v-6h5L12 4z"/></svg>';
  const TREND_SVG_DOWN = '<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 20l8-10h-5V4h-6v6H4l8 10z"/></svg>';
  const TREND_SVG_EQUAL = '<svg class="sutral-trend-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 9h16v2H4V9zm0 5h16v2H4v-2z"/></svg>';

  function recencyWeightedTotal(scores) {
    if (!scores.length) return 0;
    const L = scores.length;
    let sum = 0, weightSum = 0;
    for (let i = 0; i < L; i++) {
      const posFromEnd = L - i;
      const w = posFromEnd <= 2 ? RECENCY_WEIGHT_NEW : posFromEnd <= 4 ? RECENCY_WEIGHT_MID : RECENCY_WEIGHT_OLD;
      sum += scores[i] * w;
      weightSum += w;
    }
    return weightSum > 0 ? sum / weightSum : 0;
  }

  function spreadFromCenter(raw) {
    const spread = CONVERGENCE_CENTER + (raw - CONVERGENCE_CENTER) * CONVERGENCE_SPREAD_FACTOR;
    return Math.max(0, Math.min(10, spread));
  }

  function collectEpisodeScoresFromData(rows, episodeIndex) {
    const cfg = SCORING_WEIGHTS;
    const confVals = rows.map(r => parseFloat(r.conf) || 0);
    const maxConf = Math.max(...confVals, 0);
    const players = [];
    rows.forEach(row => {
      const name = (row.name || '').trim();
      if (!name) return;
      const alliCount = parseFloat(row.alliances) || 0;
      const isMaj = row.majority ? 1 : 0;
      const confRaw = parseFloat(row.conf) || 0;
      const edgTag = row.edgic || '';
      const idolCount = parseInt(row.idols, 10) || 0;
      const advCount = parseInt(row.advs, 10) || 0;
      const bewCount = parseInt(row.bew, 10) || 0;
      const journey = row.journey ? 1 : 0;
      const elim = row.elim ? 1 : 0;
      const medevac = row.medevac ? 1 : 0;
      const lostVote = !!row.lostVote;
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
      players.push({ name, alliScore, confScore, edgScore, idolComp, baseRaw, elim: elim === 1, medevac: medevac === 1 });
    });
    return { epId: 'ep' + (episodeIndex + 1), players };
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

  function getTrendHtml(trend) {
    if (trend === 'up') return '<span class="sutral-trend sutral-trend-up">' + TREND_SVG_UP + '</span>';
    if (trend === 'down') return '<span class="sutral-trend sutral-trend-down">' + TREND_SVG_DOWN + '</span>';
    return '<span class="sutral-trend sutral-trend-equal">' + TREND_SVG_EQUAL + '</span>';
  }

  function indexToChartColor(index) {
    const hue = ((index % CHART_PALETTE_SIZE) * (360 / CHART_PALETTE_SIZE)) % 360;
    return `hsl(${hue}, 72%, 48%)`;
  }

  function getChartAdaptiveStrength() {
    try {
      const v = localStorage.getItem('sutral_chart_adaptive_strength');
      if (v != null) { const n = parseFloat(v); if (!isNaN(n)) return Math.max(0, Math.min(1, n)); }
    } catch (e) {}
    return 0.35;
  }

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
      for (let i = 0; i < n; i++) { if (sorted[i] <= val) count++; else break; }
      return (1 - alpha) * linear + alpha * (count / n);
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
    const CHART_TOP_BAND_MAX_FRAC = 0.07;
    const CHART_TOP_BAND_START = 70;
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

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /**
   * Run full Sutral calculation from raw JSON data
   * @param {Object} data - { episodes: [{ epNum, rows }] }
   * @param {Object} [opts] - { maxEpisodeNum: number } - if set, winner table & chart reflect state UP TO that episode
   * @returns {Object} computed data for export
   */
  function computeSutralData(data, opts) {
    const maxEp = (opts && opts.maxEpisodeNum) ? parseInt(opts.maxEpisodeNum, 10) : null;
    const episodes = (data.episodes || []).sort((a, b) => (a.epNum || 0) - (b.epNum || 0));
    if (episodes.length === 0) return null;

    const history = {};
    const rankHistory = {};
    const playerColorMap = {};
    let colorIndex = 0;

    const allEpisodeData = episodes.map((ep, i) => {
      const rows = ep.rows || [];
      return collectEpisodeScoresFromData(rows, i);
    });

    allEpisodeData.forEach(({ epId, players }, epIdx) => {
      players.forEach(p => {
        if (!history[p.name]) history[p.name] = [];
        history[p.name].push(p.baseRaw);
        if (!(p.name in playerColorMap)) playerColorMap[p.name] = indexToChartColor(colorIndex++);
        if (!rankHistory[p.name]) rankHistory[p.name] = [];
        const idx = rankHistory[p.name].length;
        const scoresSoFar = history[p.name].slice(0, idx + 1);
        const totalPtsRaw = recencyWeightedTotal(scoresSoFar);
        rankHistory[p.name].push({
          ep: epId,
          epNum: epIdx + 1,
          baseRaw: p.baseRaw,
          totalPts: totalPtsRaw,
          eliminated: p.elim || p.medevac
        });
      });
    });

    const episodeResults = [];
    allEpisodeData.forEach((epData, i) => {
      const playersWithTotals = epData.players.map(p => {
        const scoresSoFar = (history[p.name] || []).slice(0, i + 1);
        const totalPtsRaw = recencyWeightedTotal(scoresSoFar);
        const totalPts = spreadFromCenter(totalPtsRaw);
        let trend = 'equal';
        if (i > 0) {
          const prevRaw = recencyWeightedTotal((history[p.name] || []).slice(0, i));
          const prevSpread = spreadFromCenter(prevRaw);
          if (totalPts > prevSpread + 0.1) trend = 'up';
          else if (totalPts < prevSpread - 0.1) trend = 'down';
        }
        return { ...p, totalPts, totalPtsRaw, trend };
      });
      playersWithTotals.sort((a, b) => b.totalPts - a.totalPts);
      playersWithTotals.forEach((p, idx) => { p.rank = idx + 1; });
      const sortedByEpPts = playersWithTotals.slice().sort((a, b) => b.baseRaw - a.baseRaw);
      sortedByEpPts.forEach((p, idx) => { p.epRank = idx + 1; });
      episodeResults.push({
        epId: epData.epId,
        epNum: i + 1,
        playersWithTotals,
        sortedByEpPts,
        rows: episodes[i].rows || []
      });
    });

    const allPlayers = new Set();
    const eliminatedPlayers = new Set();
    episodeResults.forEach(er => {
      er.playersWithTotals.forEach(p => {
        allPlayers.add(p.name);
        if (maxEp != null && er.epNum > maxEp) return;
        if (p.elim || p.medevac) eliminatedPlayers.add(p.name);
      });
    });
    const remaining = Array.from(allPlayers).filter(x => !eliminatedPlayers.has(x));
    if (remaining.length === 0) {
      return { episodeResults, winnerTable: null, chartSeries: null, chartPlayers: [] };
    }

    const allSeries = {};
    const episodeIds = maxEp != null
      ? episodeResults.filter(er => er.epNum <= maxEp).map(er => er.epId)
      : episodeResults.map(er => er.epId);
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
    const histUpTo = (hist) => maxEp != null ? (hist || []).filter(h => h.epNum <= maxEp) : (hist || []);
    remaining.forEach(p => {
      const playerHistory = rankHistory[p] || [];
      const upTo = histUpTo(playerHistory);
      const latest = upTo[upTo.length - 1];
      currentScoresMap[p] = latest ? spreadFromCenter(latest.totalPts) : 0;
    });
    const sortedByScore = [...remaining].sort((a, b) => {
      const d = currentScoresMap[b] - currentScoresMap[a];
      return d !== 0 ? d : String(a).localeCompare(String(b));
    });
    const rankCurr = {};
    sortedByScore.forEach((p, i) => { rankCurr[p] = i + 1; });
    const trends = {};
    const withPrevEpisode = Object.keys(rankHistory).filter(p => histUpTo(rankHistory[p]).length >= 2);
    const scorePrev = {};
    withPrevEpisode.forEach(p => {
      const upTo = histUpTo(rankHistory[p]);
      scorePrev[p] = spreadFromCenter(upTo[upTo.length - 2].totalPts);
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

    return {
      episodeResults,
      winnerTable: { sortedByScore, currentScoresMap, trends, finalProbs },
      chartSeries: allSeries,
      chartPlayers: sortedByScore,
      playerColorMap
    };
  }

  /**
   * Build HTML for episode table (read-only, for export)
   */
  function buildEpisodeTableHTML(epResult, playerColorMap) {
    const { epNum, playersWithTotals, rows } = epResult;
    const thStyle = 'padding:4px 6px;text-align:center;font-weight:600;font-size:0.72rem;border:1px solid #ddd;background:#f5f5f5;white-space:nowrap;';
    const tdStyle = 'padding:3px 5px;text-align:center;font-size:0.75rem;border:1px solid #ddd;';
    const cbChecked = '<input type="checkbox" checked disabled style="pointer-events:none;margin:0;width:13px;height:13px;">';
    const cbUnchecked = '<input type="checkbox" disabled style="pointer-events:none;margin:0;width:13px;height:13px;">';
    const numStyle = 'padding:3px 5px;text-align:center;font-size:0.75rem;border:1px solid #ddd;background:#f9f9f9;';

    let html = '<div style="border:2px solid #e0a030;border-radius:8px;overflow:hidden;background:#fff;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;font-weight:600;font-size:1rem;background:#fafafa;border-bottom:1px solid #eee;">';
    html += '<span>▼ 📺 Episode ' + epNum + '</span></div>';
    html += '<table style="width:100%;border-collapse:collapse;font-family:inherit;table-layout:auto;"><thead><tr>';
    html += '<th style="' + thStyle + '">Player</th>';
    html += '<th style="' + thStyle + '">Alliances</th>';
    html += '<th style="' + thStyle + '">Majority?</th>';
    html += '<th style="' + thStyle + '"># Conf</th>';
    html += '<th style="' + thStyle + '">Edgic</th>';
    html += '<th style="' + thStyle + '">#Idol</th>';
    html += '<th style="' + thStyle + '">#Adv</th>';
    html += '<th style="' + thStyle + '">#Bew</th>';
    html += '<th style="' + thStyle + '">Journey?</th>';
    html += '<th style="' + thStyle + '">Elim?</th>';
    html += '<th style="' + thStyle + '">Medevac?</th>';
    html += '<th style="' + thStyle + '">Lost vote?</th>';
    html += '<th style="' + thStyle + '">EP Pts</th>';
    html += '<th style="' + thStyle + '">Tot Pts</th>';
    html += '<th style="' + thStyle + '">Trend</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      const p = playersWithTotals.find(pl => pl.name === (row.name || '').trim());
      if (!p) return;
      const isTop = p.rank <= 3;
      const rowBg = isTop ? '#fff5f5' : '#fff';
      const nameColor = isTop ? '#c0392b' : '#222';
      html += '<tr style="background:' + rowBg + ';">';
      html += '<td style="' + tdStyle + 'text-align:left;font-weight:500;color:' + nameColor + ';">' + escapeHtml(p.name) + '</td>';
      html += '<td style="' + tdStyle + '">' + escapeHtml(String(row.alliances || '')) + '</td>';
      html += '<td style="' + tdStyle + '">' + (row.majority ? cbChecked : cbUnchecked) + '</td>';
      html += '<td style="' + tdStyle + '">' + escapeHtml(String(row.conf || '')) + '</td>';
      html += '<td style="' + tdStyle + 'font-weight:500;color:' + (isTop ? '#c0392b' : '#222') + ';">' + escapeHtml(row.edgic || '') + '</td>';
      html += '<td style="' + numStyle + '">' + escapeHtml(String(row.idols || '0')) + '</td>';
      html += '<td style="' + numStyle + '">' + escapeHtml(String(row.advs || '0')) + '</td>';
      html += '<td style="' + numStyle + '">' + escapeHtml(String(row.bew || '0')) + '</td>';
      html += '<td style="' + tdStyle + '">' + (row.journey ? cbChecked : cbUnchecked) + '</td>';
      html += '<td style="' + tdStyle + '">' + (row.elim ? cbChecked : cbUnchecked) + '</td>';
      html += '<td style="' + tdStyle + '">' + (row.medevac ? cbChecked : cbUnchecked) + '</td>';
      html += '<td style="' + tdStyle + '">' + (row.lostVote ? cbChecked : cbUnchecked) + '</td>';
      html += '<td style="' + tdStyle + 'font-weight:500;color:' + (isTop ? '#c0392b' : '#222') + ';">' + p.baseRaw.toFixed(2) + '</td>';
      html += '<td style="' + tdStyle + 'font-weight:500;color:' + (isTop ? '#c0392b' : '#222') + ';">' + p.totalPts.toFixed(2) + '</td>';
      html += '<td style="' + tdStyle + '">' + getTrendHtml(p.trend) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Build HTML for power rankings
   */
  function buildPowerRankingsHTML(epResult, playerColorMap) {
    const { epNum, sortedByEpPts } = epResult;
    const getColor = (name) => playerColorMap[name] || indexToChartColor(0);
    const n = sortedByEpPts.length;
    const leftCount = Math.floor(n / 2);
    const makeTable = (arr) => {
      let t = '<table class="sutral-power-table"><thead><tr><th>Pos</th><th>Name</th><th>Ep Pts</th></tr></thead><tbody>';
      arr.forEach(p => {
        const color = getColor(p.name);
        t += '<tr><td>' + p.epRank + '</td><td><span class="player-color-dot" style="background:' + color + '"></span>' + escapeHtml(p.name) + '</td><td>' + p.baseRaw.toFixed(2) + '</td></tr>';
      });
      t += '</tbody></table>';
      return t;
    };
    let html = '<div class="sutral-export-power"><div class="sutral-ranking-collapsible" style="padding:0.5rem 1rem; font-weight:600;">📊 Power Rankings ▼</div>';
    if (n >= 8) {
      html += '<div class="sutral-power-two-cols"><div>' + makeTable(sortedByEpPts.slice(0, leftCount)) + '</div><div>' + makeTable(sortedByEpPts.slice(leftCount)) + '</div></div>';
    } else {
      html += makeTable(sortedByEpPts);
    }
    html += '</div>';
    return html;
  }

  /**
   * Build HTML for winner table (stats & win equity)
   */
  function buildWinnerTableHTML(winnerTable, playerColorMap, minWinRate) {
    if (!winnerTable) return '';
    const { sortedByScore, currentScoresMap, trends, finalProbs } = winnerTable;
    const getColor = (name) => playerColorMap[name] || indexToChartColor(0);
    const filtered = minWinRate != null && minWinRate > 0
      ? sortedByScore.filter(p => (finalProbs[p] || 0) >= minWinRate)
      : sortedByScore;
    if (filtered.length === 0) return '<p>Nessun giocatore sopra la soglia minima.</p>';
    let html = '<table class="sutral-winner-table sutral-export-winner"><thead><tr><th>Player ⇅</th><th>Tot Pts ⇅</th><th>Trend ⇅</th><th>Win Equity (%) ⇅</th></tr></thead><tbody>';
    filtered.forEach(p => {
      const prob = (finalProbs[p] || 0).toFixed(1);
      const color = getColor(p);
      html += '<tr><td><span class="player-color-dot" style="background:' + color + '"></span>' + escapeHtml(p) + '</td>';
      html += '<td>' + (currentScoresMap[p] || 0).toFixed(2) + '</td>';
      html += '<td>' + getTrendHtml(trends[p] || 'equal') + '</td>';
      html += '<td><strong>' + prob + '%</strong></td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  /**
   * Build SVG for win equity chart
   */
  function buildChartSVG(seriesData, playersToShow, playerColorMap, w, h) {
    w = w || 800;
    h = h || 320;
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
    if (maxEp < 0) return '';
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
    const formatBandLabel = (v) => v < 1 ? v.toFixed(2) : (v >= yMax - 0.5 ? Math.round(yMax) + '' : (v < 10 ? v.toFixed(1) : Math.round(v) + ''));
    let svgHtml = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">';
    const numBands = 8;
    for (let i = 0; i <= numBands; i++) {
      const normY = i / numBands;
      const val = scale.normYToValue(normY);
      const y = h - padding - normY * (h - 2 * padding);
      svgHtml += '<line x1="' + padding + '" y1="' + y + '" x2="' + (w - rightBuffer) + '" y2="' + y + '" stroke="#eee" stroke-width="1" stroke-dasharray="4 2" />';
      svgHtml += '<text x="5" y="' + (y + 3) + '" font-size="10" fill="#666">' + formatBandLabel(val) + '%</text>';
    }
    for (let i = 0; i <= numEp; i++) {
      const x = padding + (i / (numEp > 0 ? numEp : 1)) * (w - padding - rightBuffer);
      svgHtml += '<text x="' + (x - 5) + '" y="' + (h - 10) + '" font-size="10" fill="#666">Ep' + i + '</text>';
    }
    const xScale = numEp > 0 ? numEp : 1;
    playersToShow.forEach(p => {
      const s = seriesData[p];
      if (!s || s.length === 0) return;
      const color = playerColorMap[p] || indexToChartColor(0);
      const coords = s.map(entry => {
        const epIndex = parseInt(entry.ep.replace('ep', ''), 10);
        const x = padding + (epIndex / xScale) * (w - padding - rightBuffer);
        const drawVal = Math.max(Math.min(entry.val, yMax), CHART_Y_MIN);
        const normY = scale.valueToNormY(drawVal);
        const y = h - padding - normY * (h - 2 * padding);
        return { x, y, val: entry.val, ep: entry.ep };
      });
      let d = '';
      coords.forEach((pt, i) => { d += (i === 0 ? 'M' : 'L') + pt.x + ',' + pt.y + ' '; });
      const lastPt = coords[coords.length - 1];
      const circlesHtml = coords.map(pt => '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="2"/>').join('');
      svgHtml += '<g><path d="' + d + '" stroke="' + color + '" fill="none" stroke-width="3" stroke-linecap="round"/><path d="' + d + '" stroke="transparent" fill="none" stroke-width="12"/>' + circlesHtml + '<text x="' + (lastPt.x + 8) + '" y="' + lastPt.y + '" fill="' + color + '" font-size="11" font-weight="bold">' + escapeHtml(p) + '</text></g>';
    });
    svgHtml += '</svg>';
    return svgHtml;
  }

  global.SutralExport = {
    computeSutralData,
    buildEpisodeTableHTML,
    buildPowerRankingsHTML,
    buildWinnerTableHTML,
    buildChartSVG,
    escapeHtml,
    indexToChartColor
  };
})(typeof window !== 'undefined' ? window : globalThis);
