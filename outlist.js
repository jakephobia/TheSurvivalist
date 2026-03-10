document.addEventListener('DOMContentLoaded', function() {
    const CATEGORIES = [
        { id: 'cast', label: 'Cast' },
        { id: 'editing', label: 'Editing' },
        { id: 'twists', label: 'Twists' },
        { id: 'winner', label: 'Winner' },
        { id: 'location', label: 'Location' },
        { id: 'epicness', label: 'Epicness' },
        { id: 'gameplay', label: 'Gameplay' }
    ];

    const DEFAULT_WEIGHTS = {
        cast: 20,
        editing: 10,
        twists: 15,
        winner: 10,
        location: 15,
        epicness: 10,
        gameplay: 20
    };

    const SEASONS = [
        { num: 1, name: 'Borneo' }, { num: 2, name: 'The Australian Outback' },
        { num: 3, name: 'Africa' }, { num: 4, name: 'Marquesas' },
        { num: 5, name: 'Thailand' }, { num: 6, name: 'The Amazon' },
        { num: 7, name: 'Pearl Islands' }, { num: 8, name: 'All-Stars' },
        { num: 9, name: 'Vanuatu' }, { num: 10, name: 'Palau' },
        { num: 11, name: 'Guatemala' }, { num: 12, name: 'Panama' },
        { num: 13, name: 'Cook Islands' }, { num: 14, name: 'Fiji' },
        { num: 15, name: 'China' }, { num: 16, name: 'Micronesia' },
        { num: 17, name: 'Gabon' }, { num: 18, name: 'Tocantins' },
        { num: 19, name: 'Samoa' }, { num: 20, name: 'Heroes vs. Villains' },
        { num: 21, name: 'Nicaragua' }, { num: 22, name: 'Redemption Island' },
        { num: 23, name: 'South Pacific' }, { num: 24, name: 'One World' },
        { num: 25, name: 'Philippines' }, { num: 26, name: 'Caramoan' },
        { num: 27, name: 'Blood vs. Water' }, { num: 28, name: 'Cagayan' },
        { num: 29, name: 'San Juan del Sur' }, { num: 30, name: 'Worlds Apart' },
        { num: 31, name: 'Cambodia' }, { num: 32, name: 'Kaôh Rōng' },
        { num: 33, name: 'Millennials vs. Gen X' }, { num: 34, name: 'Game Changers' },
        { num: 35, name: 'Heroes vs. Healers vs. Hustlers' }, { num: 36, name: 'Ghost Island' },
        { num: 37, name: 'David vs. Goliath' }, { num: 38, name: 'Edge of Extinction' },
        { num: 39, name: 'Island of the Idols' }, { num: 40, name: 'Winners at War' },
        { num: 41, name: 'Survivor 41' }, { num: 42, name: 'Survivor 42' },
        { num: 43, name: 'Survivor 43' }, { num: 44, name: 'Survivor 44' },
        { num: 45, name: 'Survivor 45' }, { num: 46, name: 'Survivor 46' },
        { num: 47, name: 'Survivor 47' }, { num: 48, name: 'Survivor 48' },
        { num: 49, name: 'Survivor 49' }, { num: 50, name: 'In The Hands of The Fans' }
    ];

    let data = {};
    let useCustomWeights = false;
    let customWeights = { ...DEFAULT_WEIGHTS };
    let selectedForAdd = new Set();

    const seasonsList = document.getElementById('seasonsList');
    const weightsGrid = document.getElementById('weightsGrid');
    const seasonOptions = document.getElementById('seasonOptions');
    const modal = document.getElementById('seasonModal');
    const modalSearch = document.getElementById('modalSearch');
    const confirmAddBtn = document.getElementById('confirmAddBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const toggleAdvanced = document.getElementById('toggleAdvanced');
    const advancedSettings = document.getElementById('advancedSettings');
    const useCustomWeightsCheckbox = document.getElementById('useCustomWeights');
    const weightsContainer = document.getElementById('weightsContainer');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const jsonFile = document.getElementById('jsonFile');
    const addSeasonBtn = document.getElementById('addSeasonBtn');
    const calculateRankingBtn = document.getElementById('calculateRankingBtn');
    const sortOrder = document.getElementById('sortOrder');
    const exportText = document.getElementById('exportText');
    const copyBtn = document.getElementById('copyBtn');
    const exportSection = document.getElementById('exportSection');
    const watchedStat = document.getElementById('watchedStat');
    const ratedStat = document.getElementById('ratedStat');

    function calculateScore(ratings) {
        let ws = 0, wt = 0;
        CATEGORIES.forEach(cat => {
            const v = parseFloat(ratings[cat.id]) || 0;
            const w = useCustomWeights ? (parseFloat(customWeights[cat.id]) || 0) : (DEFAULT_WEIGHTS[cat.id] || 10);
            ws += (v * w);
            wt += w;
        });
        return wt === 0 ? 0 : Math.round((ws / wt) * 10);
    }

    function updateWeight(catId, val) {
        customWeights[catId] = parseFloat(val) || 0;
        localStorage.setItem('outlist_weights', JSON.stringify(customWeights));
        if (useCustomWeights) refreshScores();
    }

    function refreshScores() {
        Object.keys(data).forEach(id => {
            const el = document.getElementById(`score-${id}`);
            if (el) el.textContent = calculateScore(data[id].ratings);
        });
    }

    function updateStats() {
        const keys = Object.keys(data);
        const totalAvailable = SEASONS.length;
        const fullyRatedCount = keys.filter(id =>
            CATEGORIES.every(c => data[id].ratings[c.id] > 0)
        ).length;
        watchedStat.textContent = `${keys.length}/${totalAvailable}`;
        ratedStat.textContent = `${fullyRatedCount}/${totalAvailable}`;
    }

    function removeSeason(id) {
        if (confirm(`Remove S${id}?`)) {
            delete data[id];
            localStorage.setItem('outlist_v6', JSON.stringify(data));
            render();
            updateStats();
        }
    }

    function closeModal() {
        modal.classList.remove('open');
        selectedForAdd.clear();
    }

    function renderWeightsGrid() {
        weightsGrid.innerHTML = CATEGORIES.map(cat => `
            <div class="outlist-weight-item">
                <label>${cat.label}</label>
                <input type="number" value="${customWeights[cat.id]}" data-cat-id="${cat.id}">
            </div>
        `).join('');
    }

    function render() {
        const addedIds = Object.keys(data).map(Number).sort((a, b) => a - b);
        seasonsList.innerHTML = addedIds.map(id => {
            const s = SEASONS.find(x => x.num === id);
            if (!s) return '';
            const r = data[id].ratings;
            return `
                <div class="outlist-season-card" data-id="${id}">
                    <div class="outlist-season-info">
                        <span class="outlist-season-id">S${id}</span>
                        <span class="outlist-season-title">${s.name}</span>
                    </div>
                    <div class="outlist-season-controls">
                        <div style="display:flex; flex:1; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                            ${CATEGORIES.map(c => `
                                <div class="outlist-rating-box" data-cat="${c.id}">
                                    <label>${c.label}</label>
                                    <input type="number" step="0.1" min="0" max="10" value="${r[c.id] || ''}" data-cat-id="${c.id}">
                                </div>
                            `).join('')}
                        </div>
                        <div class="outlist-score-box" id="score-${id}">${calculateScore(r)}</div>
                        <button class="outlist-remove-btn" aria-label="Remove">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderModalOptions() {
        const search = modalSearch.value.toLowerCase();
        const added = Object.keys(data).map(Number);
        const available = SEASONS.filter(s =>
            !added.includes(s.num) &&
            (s.name.toLowerCase().includes(search) || s.num.toString().includes(search))
        );
        seasonOptions.innerHTML = available.map(s => `
            <div class="outlist-season-option">
                <input type="checkbox" id="chk-${s.num}" data-num="${s.num}">
                <label for="chk-${s.num}">S${s.num}: ${s.name}</label>
            </div>
        `).join('');
    }

    seasonsList.addEventListener('input', function(e) {
        const input = e.target.closest('input[type="number"]');
        if (!input) return;
        const seasonCard = input.closest('.outlist-season-card');
        if (!seasonCard) return;
        const seasonId = parseInt(seasonCard.dataset.id);
        if (!data[seasonId]) return;

        const ratingBox = input.closest('.outlist-rating-box');
        if (!ratingBox) return;
        const catId = ratingBox.dataset.cat;
        let val = parseFloat(input.value);
        if (!isNaN(val)) {
            if (val > 10) val = 10;
            if (val < 1 && input.value.length > 0) val = 1;
            input.value = val;
        } else {
            val = 0;
        }

        data[seasonId].ratings[catId] = val;
        document.getElementById(`score-${seasonId}`).textContent = calculateScore(data[seasonId].ratings);
        localStorage.setItem('outlist_v6', JSON.stringify(data));
        if (window.recordToolUsed) window.recordToolUsed('outlist');
        updateStats();
    });

    seasonsList.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('.outlist-remove-btn');
        if (removeBtn) {
            const seasonCard = removeBtn.closest('.outlist-season-card');
            const id = parseInt(seasonCard.dataset.id);
            removeSeason(id);
        }
    });

    weightsGrid.addEventListener('input', function(e) {
        const input = e.target.closest('input[type="number"]');
        if (!input) return;
        const catId = input.dataset.catId;
        updateWeight(catId, input.value);
    });

    seasonOptions.addEventListener('change', function(e) {
        const checkbox = e.target.closest('input[type="checkbox"]');
        if (!checkbox) return;
        const seasonNum = parseInt(checkbox.dataset.num);
        if (checkbox.checked) {
            selectedForAdd.add(seasonNum);
        } else {
            selectedForAdd.delete(seasonNum);
        }
    });

    toggleAdvanced.addEventListener('click', () => {
        advancedSettings.classList.toggle('hidden');
    });

    useCustomWeightsCheckbox.addEventListener('change', function(e) {
        useCustomWeights = e.target.checked;
        weightsContainer.classList.toggle('hidden', !useCustomWeights);
        localStorage.setItem('outlist_useCustom', useCustomWeights);
        refreshScores();
    });

    addSeasonBtn.addEventListener('click', function() {
        modal.classList.add('open');
        renderModalOptions();
    });

    cancelModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    confirmAddBtn.addEventListener('click', function() {
        selectedForAdd.forEach(id => {
            data[id] = {
                ratings: CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {})
            };
        });
        selectedForAdd.clear();
        localStorage.setItem('outlist_v6', JSON.stringify(data));
        if (window.recordToolUsed) window.recordToolUsed('outlist');
        render();
        updateStats();
        closeModal();
    });

    modalSearch.addEventListener('input', renderModalOptions);

    calculateRankingBtn.addEventListener('click', function() {
        const ids = Object.keys(data);
        if (ids.length === 0) return;
        if (ids.some(id => !CATEGORIES.every(c => data[id].ratings[c.id] > 0))) {
            alert('Complete all ratings!');
            return;
        }
        const order = sortOrder.value;
        const ranked = ids.map(id => ({
            id,
            name: SEASONS.find(s => s.num == id).name,
            score: calculateScore(data[id].ratings)
        })).sort((a, b) => order === 'desc' ? b.score - a.score : a.score - b.score);
        exportText.value = ranked.map((s, i) => `${i + 1}. S${s.id} - ${s.name}: ${s.score}/100`).join('\n');
        exportSection.classList.remove('hidden');
        exportSection.scrollIntoView({ behavior: 'smooth' });
    });

    copyBtn.addEventListener('click', function() {
        exportText.select();
        document.execCommand('copy');
        alert('Copied!');
    });

    document.getElementById('exportRankingsBtn').addEventListener('click', function() {
        const content = exportText.value;
        if (!content.trim()) return;
        const date = new Date().toISOString().slice(0, 10);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'outlist_ranking_' + date + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    exportJsonBtn.addEventListener('click', function() {
        if (window.recordToolUsed) window.recordToolUsed('outlist');
        const blob = new Blob([JSON.stringify({ data, weights: customWeights, useCustom: useCustomWeights })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = window.getSessionFilename ? window.getSessionFilename('Outlist', 'Session') : 'OUTLIST_Session_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    importJsonBtn.addEventListener('click', () => jsonFile.click());

    jsonFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                data = parsed.data || data;
                customWeights = parsed.weights || customWeights;
                useCustomWeights = parsed.useCustom || false;
                localStorage.setItem('outlist_v6', JSON.stringify(data));
                localStorage.setItem('outlist_weights', JSON.stringify(customWeights));
                localStorage.setItem('outlist_useCustom', useCustomWeights);
                location.reload();
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    var outlistResetBtn = document.getElementById('outlist-reset');
    if (outlistResetBtn) {
        outlistResetBtn.addEventListener('click', function() {
            if (confirm('Reset everything? Tool will return to default state.')) {
                localStorage.removeItem('outlist_v6');
                localStorage.removeItem('outlist_weights');
                localStorage.removeItem('outlist_useCustom');
                location.reload();
            }
        });
    }

    function init() {
        const saved = localStorage.getItem('outlist_v6');
        if (saved) try { data = JSON.parse(saved); } catch(_) {}
        const sw = localStorage.getItem('outlist_weights');
        if (sw) try { customWeights = JSON.parse(sw); } catch(_) {}
        useCustomWeights = localStorage.getItem('outlist_useCustom') === 'true';
        useCustomWeightsCheckbox.checked = useCustomWeights;
        weightsContainer.classList.toggle('hidden', !useCustomWeights);
        renderWeightsGrid();
        render();
        updateStats();
    }

    init();
});