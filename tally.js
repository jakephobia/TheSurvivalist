// --- CONSTANTS ---
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

const SurvivorApp = {
    Config: {
        storageKey: 'survivor_fantasy_v14',
        events: [
            { id: 'imm_ind', label: 'Individual Immunity Win', pts: 10, cat: 'pos', key_panel: true },
            { id: 'imm_tribal', label: 'Tribal Immunity Win', pts: 3, cat: 'pos', key_panel: true },
            { id: 'reward_ind', label: 'Individual Reward Win', pts: 5, cat: 'pos', key_panel: true },
            { id: 'reward_grp', label: 'Group Reward Win', pts: 2, cat: 'pos', key_panel: true },
            { id: 'eliminated', label: 'Voted Out at Tribal Council', pts: -5, cat: 'elim', type: 'elim', key_panel: true },
            { id: 'title_quote', label: 'Episode Title Quote', pts: 5, cat: 'narr', key_panel: true },
            { id: 'journey', label: 'Went on a Journey / Summit', pts: 3, cat: 'narr', key_panel: true },
            { id: 'imm_ind_last', label: 'Last Place in Immunity Challenge', pts: -2, cat: 'neg', key_panel: true },
            { id: 'survived', label: 'Survived the Episode', pts: 5, cat: 'pos', type: 'status' },
            { id: 'winner', label: 'Sole Survivor (Season Winner)', pts: 25, cat: 'pos' },
            { id: 'runner_up', label: 'Runner-Up (2nd or 3rd Place)', pts: 10, cat: 'pos' },
            { id: 'idol_found', label: 'Found a Hidden Immunity Idol', pts: 8, cat: 'strat' },
            { id: 'adv_found', label: 'Found an Advantage or Clue', pts: 5, cat: 'strat' },
            { id: 'idol_play_good', label: 'Played Idol Successfully (Nullified Votes)', pts: 10, cat: 'strat' },
            { id: 'vote_correct', label: 'Voted for the Eliminated Person', pts: 2, cat: 'strat' },
            { id: 'vote_cancelled', label: 'Vote Against Nullified by Idol (per vote)', pts: 1, cat: 'strat' },
            { id: 'sitd_success', label: 'Successful "Shot in the Dark" Play', pts: 7, cat: 'strat' },
            { id: 'fire_mk', label: 'Won Final Four Firemaking Challenge', pts: 10, cat: 'narr' },
            { id: 'fishing', label: 'Caught Fish or Provided Major Food', pts: 3, cat: 'narr' },
            { id: 'fight', label: 'Major Argument or Camp Drama', pts: 3, cat: 'narr' },
            { id: 'cries', label: 'Crying in a Confessional or at Camp', pts: 2, cat: 'narr' },
            { id: 'vote_received', label: 'Targeted (Received at least 1 vote)', pts: -2, cat: 'neg' },
            { id: 'sit_out', label: 'Sat Out of a Tribal Challenge', pts: -1, cat: 'neg' },
            { id: 'vote_wrong', label: 'Voted Wrongly (Subject of a Blindside)', pts: -2, cat: 'neg' },
            { id: 'idol_play_bad', label: 'Wasted an Idol (No votes nullified)', pts: -3, cat: 'neg' },
            { id: 'busted', label: 'Caught Searching for an Idol', pts: -3, cat: 'neg' },
            { id: 'medevac', label: 'Medical Evacuation or Voluntary Quit', pts: -10, cat: 'elim', type: 'elim' }
        ]
    },

    State: {
        data: { started: false, drafting: false, tempCastaways: [], tempPlayers: [], players: [], castaways: [], episodes: [] },
        modalContext: { epIndex: null, castawayName: null },
        sort: { pCol: 'total', pOrd: 'desc', sCol: 'total', sOrd: 'desc' },

        load() {
            const s = localStorage.getItem(SurvivorApp.Config.storageKey);
            if (s) try { this.data = JSON.parse(s); } catch(e) { this.reset(); }
        },
        save() {
            localStorage.setItem(SurvivorApp.Config.storageKey, JSON.stringify(this.data));
            if (window.recordToolUsed) window.recordToolUsed('tally');
            SurvivorApp.UI.renderAll();
        },
        reset() {
            localStorage.removeItem(SurvivorApp.Config.storageKey);
            location.reload();
        }
    },

    Core: {
        init() {
            SurvivorApp.State.load();
            SurvivorApp.UI.renderRules();
            SurvivorApp.UI.renderAll();
            SurvivorApp.UI.attachEventListeners();
        },

        exportData() {
            if (window.recordToolUsed) window.recordToolUsed('tally');
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(SurvivorApp.State.data));
            const dl = document.createElement('a');
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", window.getSessionFilename ? window.getSessionFilename('Tally', 'Session') : 'TALLY_Session_' + new Date().toISOString().slice(0, 10) + '.json');
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
        },

        importData(file) {
            if (!file) return;
            const r = new FileReader();
            r.onload = function(e) {
                try {
                    SurvivorApp.State.data = JSON.parse(e.target.result);
                    SurvivorApp.State.save();
                } catch(err) { alert("Invalid JSON"); }
            };
            r.readAsText(file);
        },

        initDraft() {
            const c = document.getElementById('inputCastaways').value.trim().split('\n').filter(Boolean);
            const p = document.getElementById('inputPlayers').value.trim().split('\n').filter(Boolean);
            if (!c.length || !p.length) return alert("Enter names.");
            SurvivorApp.State.data.tempCastaways = c.sort();
            SurvivorApp.State.data.tempPlayers = p;
            const perPerson = Math.floor(c.length / p.length);
            const remainder = c.length - (perPerson * p.length);
            SurvivorApp.State.data.players = p.map(n => ({ name: n, team: [], score: 0 }));
            if (remainder > 0) SurvivorApp.State.data.players.push({ name: 'Undrafted', team: [], score: 0 });
            SurvivorApp.State.data.drafting = true;
            SurvivorApp.State.save();
        },

        randomizeDraft() {
            const d = SurvivorApp.State.data;
            const perPerson = Math.floor(d.tempCastaways.length / d.tempPlayers.length);
            const remainder = d.tempCastaways.length - (perPerson * d.tempPlayers.length);
            let pool = [];
            d.tempPlayers.forEach(p => { for (let i = 0; i < perPerson; i++) pool.push(p); });
            if (remainder > 0) for (let i = 0; i < remainder; i++) pool.push('Undrafted');
            pool.sort(() => 0.5 - Math.random());
            document.querySelectorAll('.draft-assign-select').forEach((s, i) => { if (pool[i]) s.value = pool[i]; });
        },

        finalizeDraft() {
            const d = SurvivorApp.State.data;
            d.players.forEach(p => p.team = []);
            d.castaways = [];
            let ok = true;
            document.querySelectorAll('.draft-assign-select').forEach(s => {
                if (!s.value) { ok = false; s.style.borderColor = '#e74c3c'; }
                else {
                    d.players.find(p => p.name === s.value).team.push(s.dataset.castaway);
                    d.castaways.push({ name: s.dataset.castaway, status: 'active', elimEpisode: null });
                }
            });
            if (!ok) return alert("Assign all castaways.");
            d.drafting = false;
            d.started = true;
            this.addEpisode();
        },

        resetGame() { if (confirm("Reset season?")) SurvivorApp.State.reset(); },

        addEpisode() {
            SurvivorApp.State.data.episodes.push({ id: SurvivorApp.State.data.episodes.length + 1, events: [] });
            SurvivorApp.State.save();
        },

        addEvent(epIdx, cName, evtId) {
            if (!cName) return;
            const d = SurvivorApp.State.data;
            const def = SurvivorApp.Config.events.find(e => e.id === evtId);
            d.episodes[epIdx].events.push({ castawayName: cName, eventId: evtId });
            if (def?.type === 'elim') {
                const c = d.castaways.find(c => c.name === cName);
                if (c) { c.status = 'out'; c.elimEpisode = epIdx; }
            }
            SurvivorApp.State.save();
        },

        addMultipleEvents(epIdx, cName, evtId, count) {
            for(let i=0; i<count; i++) SurvivorApp.State.data.episodes[epIdx].events.push({ castawayName: cName, eventId: evtId });
            SurvivorApp.State.save();
        },

        removeEvent(epIdx, eventIndex) {
            const d = SurvivorApp.State.data;
            const entry = d.episodes[epIdx].events[eventIndex];
            const def = SurvivorApp.Config.events.find(e => e.id === entry.eventId);
            if (def?.type === 'elim') {
                const c = d.castaways.find(c => c.name === entry.castawayName);
                if (c && c.elimEpisode === epIdx) { c.status = 'active'; c.elimEpisode = null; }
            }
            d.episodes[epIdx].events.splice(eventIndex, 1);
            SurvivorApp.State.save();
        },

        batchAddSurvivalPoints(epIdx) {
            const d = SurvivorApp.State.data;
            this.getCastawaysForEpisode(epIdx).forEach(c => {
                const evs = d.episodes[epIdx].events;
                const elim = evs.some(e => e.castawayName === c.name && (e.eventId === 'eliminated' || e.eventId === 'medevac'));
                const has = evs.some(e => e.castawayName === c.name && e.eventId === 'survived');
                if (!elim && !has) d.episodes[epIdx].events.push({ castawayName: c.name, eventId: 'survived' });
            });
            SurvivorApp.State.save();
        },

        syncKeyEvent(epIdx, castawayName, eventId, shouldHave) {
            const d = SurvivorApp.State.data;
            const ep = d.episodes[epIdx];
            const idx = ep.events.findIndex(e => e.castawayName === castawayName && e.eventId === eventId);
            const hasIt = idx !== -1;
            if (shouldHave && !hasIt) {
                ep.events.push({ castawayName: castawayName, eventId: eventId });
                const def = SurvivorApp.Config.events.find(e => e.id === eventId);
                if (def?.type === 'elim') {
                    const c = d.castaways.find(c => c.name === castawayName);
                    if (c) { c.status = 'out'; c.elimEpisode = epIdx; }
                }
            } else if (!shouldHave && hasIt) {
                const def = SurvivorApp.Config.events.find(e => e.id === eventId);
                if (def?.type === 'elim') {
                    const c = d.castaways.find(c => c.name === castawayName);
                    if (c && c.elimEpisode === epIdx) { c.status = 'active'; c.elimEpisode = null; }
                }
                ep.events.splice(idx, 1);
            }
        },

        processKeyEvents(epIdx) {
            const getChecked = (id) => {
                const container = document.getElementById(id);
                return container ? [...container.querySelectorAll('input:checked')].map(cb => cb.value) : [];
            };
            const getVal = (id) => document.getElementById(id)?.value || '';
            const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;

            const active = this.getCastawaysForEpisode(epIdx);

            const elims = getChecked(`k-elim-${epIdx}`);
            active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'eliminated', elims.includes(c.name)));

            const immType = getRadio(`immT${epIdx}`);
            if (immType === 'ind') {
                const val = getVal(`k-imm-s-${epIdx}`);
                active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'imm_ind', c.name === val));
            } else {
                const vals = getChecked(`k-imm-m-${epIdx}`);
                active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'imm_tribal', vals.includes(c.name)));
            }

            const rewType = getRadio(`rewT${epIdx}`);
            if (rewType === 'ind') {
                const val = getVal(`k-rew-s-${epIdx}`);
                active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'reward_ind', c.name === val));
            } else {
                const vals = getChecked(`k-rew-m-${epIdx}`);
                active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'reward_grp', vals.includes(c.name)));
            }

            const jourVals = getChecked(`k-jour-${epIdx}`);
            active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'journey', jourVals.includes(c.name)));

            const quoteVal = getVal(`k-quote-${epIdx}`);
            active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'title_quote', c.name === quoteVal));

            const lastVal = getVal(`k-last-${epIdx}`);
            active.forEach(c => this.syncKeyEvent(epIdx, c.name, 'imm_ind_last', c.name === lastVal));

            SurvivorApp.State.save();
        },

        getCastawaysForEpisode(epIdx) {
            return SurvivorApp.State.data.castaways.filter(c => c.status === 'active' || c.elimEpisode >= epIdx || c.elimEpisode === null);
        },

        calculateScores() {
            const d = SurvivorApp.State.data;
            const cScores = {};
            d.castaways.forEach(c => cScores[c.name] = 0);
            d.episodes.forEach(ep => ep.events.forEach(ev => {
                const def = SurvivorApp.Config.events.find(e => e.id === ev.eventId);
                if (def) cScores[ev.castawayName] += def.pts;
            }));
            return d.players.map(p => ({
                ...p,
                score: p.team.reduce((s, c) => s + (cScores[c] || 0), 0),
                cScores
            })).sort((a,b) => b.score - a.score);
        }
    },

    Stats: {
        calculate() {
            const d = SurvivorApp.State.data;
            const epCount = d.episodes.length || 1;

            const sStats = d.castaways.map(c => {
                let total = 0;
                const catPts = { pos:0, strat:0, narr:0, neg:0 };
                d.episodes.forEach(ep => ep.events.forEach(ev => {
                    if (ev.castawayName === c.name) {
                        const def = SurvivorApp.Config.events.find(e => e.id === ev.eventId);
                        if(def) {
                            total += def.pts;
                            if(def.cat && catPts[def.cat] !== undefined) catPts[def.cat] += def.pts;
                        }
                    }
                }));
                const playerOwner = d.players.find(p => p.team.includes(c.name));
                return {
                    name: c.name,
                    total,
                    avg: Number((total/epCount).toFixed(1)),
                    catPts,
                    status: c.status,
                    owner: playerOwner ? playerOwner.name : 'None',
                    ownerIdx: playerOwner ? d.players.indexOf(playerOwner) : -1
                };
            });

            const getTop = (cat) => [...sStats].sort((a,b) => b.catPts[cat] - a.catPts[cat])[0];
            const awards = {
                challenge: getTop('pos'),
                strat: getTop('strat'),
                narr: getTop('narr'),
                villain: [...sStats].sort((a,b) => a.catPts['neg'] - b.catPts['neg'])[0]
            };

            const pStats = d.players.map((p, idx) => {
                const teamStats = sStats.filter(s => p.team.includes(s.name));
                const total = teamStats.reduce((acc, curr) => acc + curr.total, 0);
                const activeCount = teamStats.filter(s => s.status === 'active').length;
                const mvp = teamStats.sort((a,b) => b.total - a.total)[0];
                let dependency = 0;
                if(mvp && total > 0) dependency = ((mvp.total / total) * 100).toFixed(0);
                return {
                    name: p.name,
                    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                    total,
                    avg: Number((total/epCount).toFixed(1)),
                    survivors: `${activeCount}/${p.team.length}`,
                    carry: mvp ? `${mvp.name} (${dependency}%)` : 'N/A',
                    survivorsVal: activeCount
                };
            });

            return { sStats, pStats, awards };
        }
    },

    UI: {
        escape(str) { return str.replace(/'/g, "\\'"); },

        renderAll() {
            const s = SurvivorApp.State.data;
            document.getElementById('viewSetup').classList.add('hidden');
            document.getElementById('viewDraft').classList.add('hidden');
            document.getElementById('viewGame').classList.add('hidden');
            document.getElementById('viewStats').classList.add('hidden');
            document.getElementById('viewRules').classList.add('hidden');
            document.getElementById('gameControls').classList.add('hidden');
            document.getElementById('mainTabs').classList.add('hidden');

            if (!s.started && !s.drafting) {
                document.getElementById('viewSetup').classList.remove('hidden');
            } else if (s.drafting) {
                document.getElementById('viewDraft').classList.remove('hidden');
                this.renderDraftUI();
            } else {
                document.getElementById('viewGame').classList.remove('hidden');
                document.getElementById('gameControls').classList.remove('hidden');
                document.getElementById('mainTabs').classList.remove('hidden');
                this.renderScoreboard();
                this.renderEpisodes();
                this.renderStats();
                this.renderRules();

                const activeTab = document.querySelector('.tally-tab.active')?.dataset.tab || 'game';
                this.switchTab(activeTab);
            }
        },

        switchTab(tab) {
            ['game','stats','rules'].forEach(id => {
                const cap = id.charAt(0).toUpperCase() + id.slice(1);
                document.getElementById(`view${cap}`).classList.add('hidden');
            });
            document.querySelectorAll('.tally-tab').forEach(b => b.classList.remove('active'));
            const capTab = tab.charAt(0).toUpperCase() + tab.slice(1);
            document.getElementById(`view${capTab}`).classList.remove('hidden');
            const btns = document.querySelectorAll('.tally-tab');
            if (tab === 'game') btns[0]?.classList.add('active');
            else if (tab === 'stats') btns[1]?.classList.add('active');
            else btns[2]?.classList.add('active');
        },

        toggleSort(type, col) {
            const s = SurvivorApp.State.sort;
            if (type === 'player') {
                if (s.pCol === col) s.pOrd = s.pOrd === 'desc' ? 'asc' : 'desc';
                else { s.pCol = col; s.pOrd = 'desc'; }
            } else {
                if (s.sCol === col) s.sOrd = s.sOrd === 'desc' ? 'asc' : 'desc';
                else { s.sCol = col; s.sOrd = 'desc'; }
            }
            this.renderStats();
        },

        sortData(arr, col, ord) {
            return arr.slice().sort((a,b) => {
                let va = a[col], vb = b[col];
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return ord === 'asc' ? -1 : 1;
                if (va > vb) return ord === 'asc' ? 1 : -1;
                return 0;
            });
        },

        getSortIcon(type, col) {
            const s = SurvivorApp.State.sort;
            const activeCol = type === 'player' ? s.pCol : s.sCol;
            const activeOrd = type === 'player' ? s.pOrd : s.sOrd;
            if (activeCol !== col) return '<span class="tally-sort-icon">▼</span>';
            return activeOrd === 'desc' ? '<span class="tally-sort-icon active">▼</span>' : '<span class="tally-sort-icon active">▲</span>';
        },

        renderStats() {
            const raw = SurvivorApp.Stats.calculate();
            const s = SurvivorApp.State.sort;
            const pStats = this.sortData(raw.pStats, s.pCol, s.pOrd);
            const sStats = this.sortData(raw.sStats, s.sCol, s.sOrd);
            const awards = raw.awards;

            const awC = document.getElementById('awardsContainer');
            awC.innerHTML = `
                <div class="tally-stat-card" style="border-color:#10b981"><div class="tally-stat-label">Challenge Beast</div><div class="tally-stat-value">${awards.challenge?.name || 'N/A'}</div><div class="tally-stat-sub">${awards.challenge?.catPts.pos || 0} pts</div></div>
                <div class="tally-stat-card" style="border-color:#f59e0b"><div class="tally-stat-label">The Mastermind</div><div class="tally-stat-value">${awards.strat?.name || 'N/A'}</div><div class="tally-stat-sub">${awards.strat?.catPts.strat || 0} pts</div></div>
                <div class="tally-stat-card" style="border-color:#3b82f6"><div class="tally-stat-label">Main Character</div><div class="tally-stat-value">${awards.narr?.name || 'N/A'}</div><div class="tally-stat-sub">${awards.narr?.catPts.narr || 0} pts</div></div>
                <div class="tally-stat-card" style="border-color:#ef4444"><div class="tally-stat-label">The Troublemaker</div><div class="tally-stat-value">${awards.villain?.name || 'N/A'}</div><div class="tally-stat-sub">${awards.villain?.catPts.neg || 0} pts</div></div>
            `;

            const psC = document.getElementById('playerStatsContainer');
            let tableHtml = `<table class="tally-data-table"><thead><tr>`;
            tableHtml += `<th data-sort-type="player" data-col="name">Player ${this.getSortIcon('player', 'name')}</th>`;
            tableHtml += `<th data-sort-type="player" data-col="total">Total ${this.getSortIcon('player', 'total')}</th>`;
            tableHtml += `<th data-sort-type="player" data-col="avg">Avg/Ep ${this.getSortIcon('player', 'avg')}</th>`;
            tableHtml += `<th data-sort-type="player" data-col="survivorsVal">Survivors ${this.getSortIcon('player', 'survivorsVal')}</th>`;
            tableHtml += `<th>Carry Factor (MVP)</th>`;
            tableHtml += `</tr></thead><tbody>`;
            pStats.forEach(p => {
                tableHtml += `<tr><td style="color:${p.color}; font-weight:bold">${p.name}</td><td>${p.total}</td><td>${p.avg}</td><td>${p.survivors}</td><td>${p.carry}</td></tr>`;
            });
            tableHtml += `</tbody></table>`;
            psC.innerHTML = tableHtml;
            psC.querySelectorAll('th[data-sort-type]').forEach(th => {
                th.addEventListener('click', () => {
                    this.toggleSort(th.dataset.sortType, th.dataset.col);
                });
            });

            const ssC = document.getElementById('survivorStatsContainer');
            let sHtml = `<table class="tally-data-table"><thead><tr>`;
            sHtml += `<th data-sort-type="survivor" data-col="name">Castaway ${this.getSortIcon('survivor', 'name')}</th>`;
            sHtml += `<th data-sort-type="survivor" data-col="owner">Owner ${this.getSortIcon('survivor', 'owner')}</th>`;
            sHtml += `<th data-sort-type="survivor" data-col="status">Status ${this.getSortIcon('survivor', 'status')}</th>`;
            sHtml += `<th data-sort-type="survivor" data-col="total">Total ${this.getSortIcon('survivor', 'total')}</th>`;
            sHtml += `<th data-sort-type="survivor" data-col="avg">Avg/Ep ${this.getSortIcon('survivor', 'avg')}</th>`;
            sHtml += `</tr></thead><tbody>`;
            sStats.forEach(s => {
                const color = s.ownerIdx > -1 ? PLAYER_COLORS[s.ownerIdx % 8] : '#999';
                sHtml += `<tr><td style="font-weight:bold">${s.name}</td><td style="color:${color}">${s.owner}</td><td class="${s.status==='out'?'tally-status-out':''}">${s.status.toUpperCase()}</td><td>${s.total}</td><td>${s.avg}</td></tr>`;
            });
            sHtml += `</tbody></table>`;
            ssC.innerHTML = sHtml;
            ssC.querySelectorAll('th[data-sort-type]').forEach(th => {
                th.addEventListener('click', () => {
                    this.toggleSort(th.dataset.sortType, th.dataset.col);
                });
            });
        },

        renderRules() {
            const cats = { pos: 'Challenges & Positive', strat: 'Strategy & Idols', narr: 'Narrative & Edit', neg: 'Negative / Penalties', elim: 'Elimination' };
            let html = '';
            for (const [key, label] of Object.entries(cats)) {
                const evts = SurvivorApp.Config.events.filter(e => e.cat === key);
                if (evts.length === 0) continue;
                html += `<h3 style="margin-top:1.25rem; color:#4a5f73; font-size:0.9rem;">${label}</h3><table class="tally-data-table"><tbody>`;
                evts.forEach(e => {
                    html += `<tr><td>${e.label}</td><td style="width:60px"><span class="tally-pts-badge tally-pts-${e.pts >= 0 ? 'pos' : 'neg'}">${e.pts > 0 ? '+' : ''}${e.pts}</span></td></tr>`;
                });
                html += `</tbody></table>`;
            }
            document.getElementById('rulesContainer').innerHTML = html;
        },

        renderDraftUI() {
            const s = SurvivorApp.State.data;
            const playerOpts = s.players.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
            const opts = `<option value="" disabled selected>-- Select --</option>` + playerOpts;
            document.getElementById('draftList').innerHTML = s.tempCastaways.map(c => `<div class="tally-draft-row"><span style="font-weight:bold">${c}</span><select class="draft-assign-select" data-castaway="${c}">${opts}</select></div>`).join('');
        },

        renderScoreboard() {
            const data = SurvivorApp.Core.calculateScores();
            document.getElementById('scoreboard').innerHTML = data.map((p, i) => {
                const isUndrafted = p.name === 'Undrafted';
                const col = isUndrafted ? '#000' : PLAYER_COLORS[i % 8];
                const cardClass = 'tally-player-card' + (isUndrafted ? ' tally-player-undrafted' : '');
                const borderStyle = isUndrafted ? '' : `border-top-color:${col}`;
                const nameClass = 'tally-player-name' + (isUndrafted ? ' tally-player-undrafted-name' : '');
                return `<div class="${cardClass}" style="${borderStyle}">
                    <div class="${nameClass}" style="color:${col}">${p.name}</div>
                    <div class="tally-player-score">${p.score} <small style="font-size:0.4em">pts</small></div>
                    <div class="tally-team-list">${p.team.map(c => {
                        const obj = SurvivorApp.State.data.castaways.find(x => x.name === c);
                        return `<div class="${obj?.status==='out'?'tally-status-out':''}">${c}: <strong>${p.cScores[c]}</strong></div>`;
                    }).join('')}</div>
                </div>`;
            }).join('');
        },

        renderEpisodes() {
            const eps = SurvivorApp.State.data.episodes;
            document.getElementById('episodesList').innerHTML = '';
            [...eps].reverse().forEach((ep, revIdx) => {
                const rIdx = eps.length - 1 - revIdx;
                const active = SurvivorApp.Core.getCastawaysForEpisode(rIdx);
                const getSel = (id) => ep.events.find(e => e.eventId === id)?.castawayName || '';
                const getMulti = (id) => ep.events.filter(e => e.eventId === id).map(e => e.castawayName);

                const elimVals = ep.events.filter(e => e.eventId === 'eliminated' || e.eventId === 'medevac').map(e => e.castawayName);
                const immIndVal = getSel('imm_ind');
                const immTrbVals = getMulti('imm_tribal');
                const rewIndVal = getSel('reward_ind');
                const rewGrpVals = getMulti('reward_grp');
                const jourVals = getMulti('journey');

                const isImmTrb = immTrbVals.length > 0;
                const isRewGrp = rewGrpVals.length > 0;
                const sOpts = (sel) => `<option value="">-- None --</option>` + active.map(c => `<option value="${c.name}" ${c.name===sel?'selected':''}>${c.name}</option>`).join('');
                const cbGrid = (sel) => active.map(c => `<label class="tally-checkbox-item"><input type="checkbox" value="${c.name}" ${sel.includes(c.name)?'checked':''}>${c.name}</label>`).join('');

                const div = document.createElement('div'); div.className = 'tally-episode';
                div.innerHTML = `
                    <div class="tally-episode-header" data-ep-idx="${rIdx}">
                        <h3 style="margin:0; font-size:1rem;">Episode ${ep.id}</h3>
                        <span class="tally-text-muted">${ep.events.length} eventi</span>
                    </div>
                    <div class="tally-episode-body" id="ep-${rIdx}">
                        <div class="tally-key-panel">
                            <div class="tally-key-row"><div class="tally-key-label">Voted Out</div><div class="tally-checkbox-grid" id="k-elim-${rIdx}">${cbGrid(elimVals)}</div></div>
                            <div class="tally-key-row"><div class="tally-key-label">Immunity</div><div>
                                <div class="tally-radio-group">
                                    <label><input type="radio" value="ind" name="immT${rIdx}" ${!isImmTrb?'checked':''}> Individual</label>
                                    <label><input type="radio" value="grp" name="immT${rIdx}" ${isImmTrb?'checked':''}> Tribal Win</label>
                                </div>
                                <div id="imm-s-${rIdx}" class="${isImmTrb?'hidden':''}"><div class="tally-form-group"><select id="k-imm-s-${rIdx}">${sOpts(immIndVal)}</select></div></div>
                                <div class="tally-checkbox-grid ${!isImmTrb?'hidden':''}" id="k-imm-m-${rIdx}">${cbGrid(immTrbVals)}</div>
                            </div></div>
                            <div class="tally-key-row"><div class="tally-key-label">Reward</div><div>
                                <div class="tally-radio-group">
                                    <label><input type="radio" value="ind" name="rewT${rIdx}" ${!isRewGrp?'checked':''}> Individual</label>
                                    <label><input type="radio" value="grp" name="rewT${rIdx}" ${isRewGrp?'checked':''}> Group Win</label>
                                </div>
                                <div id="rew-s-${rIdx}" class="${isRewGrp?'hidden':''}"><div class="tally-form-group"><select id="k-rew-s-${rIdx}">${sOpts(rewIndVal)}</select></div></div>
                                <div class="tally-checkbox-grid ${!isRewGrp?'hidden':''}" id="k-rew-m-${rIdx}">${cbGrid(rewGrpVals)}</div>
                            </div></div>
                            <div class="tally-key-row"><div class="tally-key-label">Journey</div><div class="tally-checkbox-grid" id="k-jour-${rIdx}">${cbGrid(jourVals)}</div></div>
                            <div class="tally-key-row"><div class="tally-key-label">Main Info</div><div class="tally-grid-2" style="gap:0.5rem">
                                <div class="tally-form-group"><label>Title Quote</label><select id="k-quote-${rIdx}">${sOpts(getSel('title_quote'))}</select></div>
                                <div class="tally-form-group"><label>Last in Challenge</label><select id="k-last-${rIdx}">${sOpts(getSel('imm_ind_last'))}</select></div>
                            </div></div>
                            <button class="btn-primary btn-block" data-ep-idx="${rIdx}" data-update-key-events>💾 Aggiorna Key Events</button>
                        </div>
                        <div class="tally-episode-actions">
                            <button class="btn-secondary btn-sm add-survived-btn" data-ep-idx="${rIdx}">✅ Add "Survived Episode" (+5) to All Active</button>
                        </div>
                        <div id="rows-${rIdx}"></div>
                    </div>`;
                document.getElementById('episodesList').appendChild(div);

                const rowC = div.querySelector(`#rows-${rIdx}`);
                active.forEach(c => {
                    const myEvs = ep.events.map((e,i) => ({...e, i})).filter(e => e.castawayName === c.name);
                    const tags = myEvs.map(e => {
                        const d = SurvivorApp.Config.events.find(x => x.id === e.eventId);
                        const cls = d.cat==='neg'||d.cat==='elim'?'tally-tag-neg':'tally-tag-pos';
                        return `<span class="tally-tag">${d.label} <span class="${cls}">${d.pts}</span><span class="tally-tag-remove tag-remove" data-ep-idx="${rIdx}" data-event-idx="${e.i}">×</span></span>`;
                    }).join('');
                    const r = document.createElement('div'); r.className = 'tally-castaway-row';
                    const safeName = SurvivorApp.UI.escape(c.name);
                    r.innerHTML = `
                        <div class="tally-castaway-name">${c.name}</div>
                        <button class="btn-secondary btn-sm add-event-btn" data-ep-idx="${rIdx}" data-castaway="${safeName}">+ Add Event</button>
                        <div class="tally-tags-container">${tags}</div>`;
                    rowC.appendChild(r);
                });
            });
            const firstBody = document.querySelector('.tally-episode-body');
            if(firstBody) firstBody.classList.add('open');
        },

        openModal(cName, epIdx) {
            SurvivorApp.State.modalContext = { epIndex: epIdx, castawayName: cName };
            document.getElementById('modalTitle').innerText = `Events for ${cName}`;
            const grid = document.getElementById('modalGrid');
            grid.innerHTML = '';
            const cats = [
                {id:'pos',l:'Challenges & Positive',c:'tally-evt-green'},
                {id:'strat',l:'Strategy & Idols',c:'tally-evt-yellow'},
                {id:'narr',l:'Narrative & Edit',c:'tally-evt-blue'},
                {id:'neg',l:'Negative / Penalties',c:'tally-evt-red'},
                {id:'elim',l:'Game Over',c:'tally-evt-red',s:'border-width:2px'}
            ];
            cats.forEach(cat => {
                const evts = SurvivorApp.Config.events.filter(e => e.cat === cat.id && !e.key_panel);
                if(evts.length){
                    const title = document.createElement('div');
                    title.className = 'tally-evt-cat-title';
                    title.textContent = cat.l;
                    grid.appendChild(title);
                    evts.forEach(e => {
                        const b = document.createElement('div');
                        b.className = `tally-evt-btn ${cat.c}`;
                        if(cat.s) b.style.borderWidth = '2px';
                        b.innerHTML = `<span>${e.label}</span> <strong>${e.pts>0?'+':''}${e.pts}</strong>`;
                        b.addEventListener('click', () => {
                            if(e.id === 'vote_cancelled'){
                                const n = prompt("How many votes were nullified?");
                                if(n && n>0) SurvivorApp.Core.addMultipleEvents(epIdx, cName, e.id, parseInt(n));
                            } else SurvivorApp.Core.addEvent(epIdx, cName, e.id);
                            SurvivorApp.UI.closeModal();
                        });
                        grid.appendChild(b);
                    });
                }
            });
            document.getElementById('eventModal').classList.add('open');
        },

        closeModal() {
            document.getElementById('eventModal').classList.remove('open');
        },

        attachEventListeners() {
            document.getElementById('initDraftBtn').addEventListener('click', SurvivorApp.Core.initDraft.bind(SurvivorApp.Core));
            document.getElementById('randomizeDraftBtn').addEventListener('click', SurvivorApp.Core.randomizeDraft.bind(SurvivorApp.Core));
            document.getElementById('finalizeDraftBtn').addEventListener('click', SurvivorApp.Core.finalizeDraft.bind(SurvivorApp.Core));
            document.getElementById('addEpisodeBtn').addEventListener('click', SurvivorApp.Core.addEpisode.bind(SurvivorApp.Core));
            document.getElementById('exportBtn').addEventListener('click', SurvivorApp.Core.exportData.bind(SurvivorApp.Core));
            document.getElementById('resetBtn').addEventListener('click', SurvivorApp.Core.resetGame.bind(SurvivorApp.Core));
            document.getElementById('closeModalBtn').addEventListener('click', SurvivorApp.UI.closeModal.bind(SurvivorApp.UI));

            document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

            document.getElementById('importCastBtn').addEventListener('click', () => document.getElementById('castImportFile').click());
            document.getElementById('exportCastBtn').addEventListener('click', function() {
                const names = document.getElementById('inputCastaways').value.trim().split('\n').filter(Boolean);
                if (names.length === 0) { alert('No castaways to export.'); return; }
                const data = window.CastShared.createUnifiedCast({
                    players: names.map(n => ({ nome: n })),
                    tribes: [],
                    seasonName: ''
                });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
                a.download = window.getCastFilename ? window.getCastFilename() : 'cast_' + new Date().toISOString().slice(0, 10) + '.json';
                a.click();
                URL.revokeObjectURL(a.href);
            });
            document.getElementById('castImportFile').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = function(ev) {
                    const parsed = window.CastShared && window.CastShared.parseUnifiedCast(ev.target.result);
                    if (!parsed || !parsed.valid) {
                        alert(parsed ? parsed.error : 'Usa export cast da Simoa.');
                        e.target.value = '';
                        return;
                    }
                    const names = window.CastShared.forTally(parsed.data);
                    document.getElementById('inputCastaways').value = names.join('\n');
                    e.target.value = '';
                };
                r.readAsText(file);
            });

            document.getElementById('addPlayerBtn').addEventListener('click', function() {
                const inp = document.getElementById('inputPlayerSingle');
                const name = inp.value.trim();
                if (!name) return;
                const list = document.getElementById('fantasyPlayersList');
                const existing = [...list.querySelectorAll('.tally-fantasy-tag')].map(t => t.dataset.name);
                if (existing.includes(name)) return;
                const tag = document.createElement('span');
                tag.className = 'tally-fantasy-tag';
                tag.dataset.name = name;
                tag.innerHTML = `${name} <b class="tally-fantasy-remove" style="cursor:pointer; color:#e74c3c; margin-left:4px;">×</b>`;
                list.appendChild(tag);
                inp.value = '';
                syncFantasyPlayersToHidden();
            });
            document.getElementById('inputPlayerSingle').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('addPlayerBtn').click();
                }
            });
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('tally-fantasy-remove')) {
                    e.target.closest('.tally-fantasy-tag')?.remove();
                    syncFantasyPlayersToHidden();
                }
            });

            function syncFantasyPlayersToHidden() {
                const list = document.getElementById('fantasyPlayersList');
                const names = [...list.querySelectorAll('.tally-fantasy-tag')].map(t => t.dataset.name);
                document.getElementById('inputPlayers').value = names.join('\n');
            }

            document.getElementById('importFile').addEventListener('change', function(e) {
                if (e.target.files.length) SurvivorApp.Core.importData(e.target.files[0]);
                e.target.value = '';
            });

            document.querySelectorAll('.tally-tab[data-tab]').forEach(btn => {
                btn.addEventListener('click', function() {
                    SurvivorApp.UI.switchTab(this.dataset.tab);
                });
            });

            const episodesList = document.getElementById('episodesList');
            if (episodesList) {
                episodesList.addEventListener('click', function(e) {
                    const header = e.target.closest('.tally-episode-header');
                    if (header) {
                        const body = header.nextElementSibling;
                        if (body && body.classList.contains('tally-episode-body')) {
                            body.classList.toggle('open');
                        }
                    }
                });

                episodesList.addEventListener('click', function(e) {
                    const btn = e.target.closest('[data-update-key-events]');
                    if (btn) {
                        SurvivorApp.Core.processKeyEvents(parseInt(btn.dataset.epIdx));
                    }
                });

                episodesList.addEventListener('click', function(e) {
                    const btn = e.target.closest('.add-survived-btn');
                    if (btn) {
                        SurvivorApp.Core.batchAddSurvivalPoints(parseInt(btn.dataset.epIdx));
                    }
                });

                episodesList.addEventListener('click', function(e) {
                    const tag = e.target.closest('.tag-remove');
                    if (tag) {
                        SurvivorApp.Core.removeEvent(parseInt(tag.dataset.epIdx), parseInt(tag.dataset.eventIdx));
                    }
                });

                episodesList.addEventListener('click', function(e) {
                    const btn = e.target.closest('.add-event-btn');
                    if (btn) {
                        SurvivorApp.UI.openModal(btn.dataset.castaway.replace(/\\'/g, "'"), parseInt(btn.dataset.epIdx));
                    }
                });

                episodesList.addEventListener('change', function(e) {
                    const radio = e.target;
                    if (radio.name && radio.name.startsWith('immT')) {
                        const epIdx = radio.name.replace('immT','');
                        const isGrp = radio.value === 'grp';
                        const immS = document.getElementById(`imm-s-${epIdx}`);
                        const immM = document.getElementById(`k-imm-m-${epIdx}`);
                        if (immS) immS.classList.toggle('hidden', isGrp);
                        if (immM) immM.classList.toggle('hidden', !isGrp);
                    }
                    if (radio.name && radio.name.startsWith('rewT')) {
                        const epIdx = radio.name.replace('rewT','');
                        const isGrp = radio.value === 'grp';
                        const rewS = document.getElementById(`rew-s-${epIdx}`);
                        const rewM = document.getElementById(`k-rew-m-${epIdx}`);
                        if (rewS) rewS.classList.toggle('hidden', isGrp);
                        if (rewM) rewM.classList.toggle('hidden', !isGrp);
                    }
                });
            }

            document.addEventListener('change', function(e) {
                if (e.target.classList.contains('draft-assign-select')) {
                    e.target.style.borderColor = '';
                }
            });

            const modal = document.getElementById('eventModal');
            modal.addEventListener('click', function(e) {
                if (e.target === modal) SurvivorApp.UI.closeModal();
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', SurvivorApp.Core.init.bind(SurvivorApp.Core));