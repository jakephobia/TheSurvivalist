document.addEventListener('DOMContentLoaded', function() {
    // --------------------------------------------------------------
    // GLOBAL STATE
    // --------------------------------------------------------------
    let currentSeason = null;
    let tempWizardPlayers = [];
    let simulationLoop = null;
    let graphNodes = [];
    let draggedNode = null;
    let allCardsExpanded = false;
    let confSortCol = -1;
    let confSortAsc = true;

    // --------------------------------------------------------------
    // DOM ELEMENTS
    // --------------------------------------------------------------
    // Setup phase
    const setupPhase = document.getElementById('setupPhase');
    const appContent = document.getElementById('appContent');
    const activeSeasonUI = document.getElementById('activeSeasonUI');
    const startSeasonBtn = document.getElementById('startSeasonBtn');
    const importFile = document.getElementById('importFile');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');

    // Header
    const seasonInfo = document.getElementById('seasonInfo');
    const epDisplay = document.getElementById('episodeDisplay');
    const epPrevBtn = document.getElementById('epPrevBtn');
    const epNextBtn = document.getElementById('epNextBtn');

    // Overview
    const overviewContent = document.getElementById('overviewContent');
    const toggleAllCardsBtn = document.getElementById('toggleAllCardsBtn');
    const swapSetupBtn = document.getElementById('swapSetupBtn');
    const openMergeModalBtn = document.getElementById('openMergeModalBtn');

    // Alliance
    const allianceNameInput = document.getElementById('allianceNameInput');
    const allianceMemberSelect = document.getElementById('allianceMemberSelect');
    const createAllianceBtn = document.getElementById('createAllianceBtn');
    const activeAlliancesList = document.getElementById('activeAlliancesList');
    const allianceCanvas = document.getElementById('allianceCanvas');

    // Advantage
    const advantageGrid = document.getElementById('advantageGrid');

    // Confessional
    const confEpDisplay = document.getElementById('confEpDisplay');
    const confInputGrid = document.getElementById('confInputGrid');
    const confMainTable = document.getElementById('confMainTable');

    // Rankings
    const rankingsContainer = document.getElementById('rankingsContainer');
    const rankingsListLeft = document.getElementById('rankingsListLeft');
    const rankingsListRight = document.getElementById('rankingsListRight');

    // Tribal
    const tribalEpDisplay = document.getElementById('tribalEpDisplay');
    const ftcToggleArea = document.getElementById('ftcToggleArea');
    const splitTribalArea = document.getElementById('splitTribalArea');
    const tribalTribeSelect = document.getElementById('tribalTribeSelect');
    const tribalContentArea = document.getElementById('tribalContentArea');
    const finalTribalContentArea = document.getElementById('finalTribalContentArea');
    const tribalVoteList = document.getElementById('tribalVoteList');
    const noElimChk = document.getElementById('noElimChk');
    const saveTribalBtn = document.getElementById('saveTribalBtn');
    const finalistsContainer = document.getElementById('finalistsContainer');
    const juryPoolDrop = document.getElementById('juryPoolDrop');

    // Modals
    const mergeModal = document.getElementById('mergeModal');
    const swapModal = document.getElementById('swapModal');
    const splitModal = document.getElementById('splitModal');

    // Wizard
    const wizSeasonName = document.getElementById('wizSeasonName');
    const wizSinglePlayer = document.getElementById('wizSinglePlayer');
    const wizAddPlayerBtn = document.getElementById('wizAddPlayerBtn');
    const wizBulkPlayers = document.getElementById('wizBulkPlayers');
    const wizPlayerListDisplay = document.getElementById('wizPlayerListDisplay');
    const wizCount = document.getElementById('wizCount');
    const wizTribeCount = document.getElementById('wizTribeCount');
    const wizTribeInputsContainer = document.getElementById('wizTribeInputsContainer');

    // Merge modal
    const mergeName = document.getElementById('mergeName');
    const mergeColor = document.getElementById('mergeColor');
    const executeMergeBtn = document.getElementById('executeMergeBtn');

    // Swap modal
    const swapTribeCount = document.getElementById('swapTribeCount');
    const swapInputsContainer = document.getElementById('swapInputsContainer');
    const executeSwapBtn = document.getElementById('executeSwapBtn');
    let swapRandomAssignChk = null;

    // Split modal
    const splitSelectionList = document.getElementById('splitSelectionList');
    const confirmSplitBtn = document.getElementById('confirmSplitBtn');

    // --------------------------------------------------------------
    // UTILITY FUNCTIONS
    // --------------------------------------------------------------
    function saveData() {
        if (currentSeason) {
            localStorage.setItem('smufferSeason', JSON.stringify(currentSeason));
            if (window.recordToolUsed) window.recordToolUsed('smuffer');
        }
    }

    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    function migrateHistory() {
        const ep = currentSeason.currentEpisode;
        currentSeason.players.forEach(p => {
            if (!p.tribeHistory) p.tribeHistory = { [ep]: p.tribeId };
            if (!p.advHistory) p.advHistory = { [ep]: p.advantages || [] };
            if (!p.edgic) p.edgic = {};
            if (!p.confessionals) p.confessionals = {};
        });
        if (!currentSeason.toolsData.allianceHistory) currentSeason.toolsData.allianceHistory = { [ep]: currentSeason.toolsData.alliances || [] };
        if (!currentSeason.toolsData.tribeStructureHistory) currentSeason.toolsData.tribeStructureHistory = { [ep]: currentSeason.toolsData.overview.tribes || [] };
    }

    function getEpTribeId(p, ep) {
        return p.tribeHistory[ep] !== undefined ? p.tribeHistory[ep] : p.tribeHistory[1];
    }

    function getEpAdv(p, ep) {
        return p.advHistory[ep] || [];
    }

    function getEpAlliances(ep) {
        return currentSeason.toolsData.allianceHistory[ep] || [];
    }

    function getEpTribesList(ep) {
        if (currentSeason.toolsData.tribeStructureHistory[ep]) return currentSeason.toolsData.tribeStructureHistory[ep];
        for (let i = ep; i >= 1; i--) {
            if (currentSeason.toolsData.tribeStructureHistory[i]) return currentSeason.toolsData.tribeStructureHistory[i];
        }
        return [];
    }

    function getTribeColor(tid, ep) {
        const tribes = getEpTribesList(ep);
        const t = tribes.find(x => x.id == tid);
        return t ? t.color : '#ccc';
    }

    function getSortedTablePlayers() {
        return [...currentSeason.players].sort((a, b) => {
            if (a.eliminated === b.eliminated) {
                if (a.eliminated) return b.eliminationEp - a.eliminationEp;
                return a.name.localeCompare(b.name);
            }
            return a.eliminated ? 1 : -1;
        });
    }

    function updateMainButton() { /* no longer used, kept for compatibility */ }

    function checkTribalCompletion(ep) {
        const td = currentSeason.toolsData.tribal?.[ep];
        if (!td) return false;
        if (td.isFinal) return true;
        if (td.noElimination) return true;
        return Object.values(td.votes || {}).some(v => v.eliminated || v.medevac);
    }

    function consumeVotedAdvantages(ep) {
        const td = currentSeason.toolsData.tribal?.[ep];
        if (!td || !td.votes) return;
        Object.keys(td.votes).forEach(pid => {
            const used = td.votes[pid].usedAdv || [];
            if (used.length > 0) {
                const p = currentSeason.players.find(x => x.id == pid);
                const inv = p.advHistory[ep];
                used.forEach(uName => {
                    const idx = inv.findIndex(a => a.name === uName);
                    if (idx > -1) {
                        inv[idx].qty--;
                        if (inv[idx].qty <= 0) inv.splice(idx, 1);
                    }
                });
            }
        });
    }

    function recalcGameState() {
        const ep = currentSeason.currentEpisode;
        currentSeason.players.forEach(p => {
            p.eliminated = false;
            p.isJury = false;
            p.medevac = false;
            p.eliminationEp = null;
        });
        for (let e = 1; e < ep; e++) {
            const td = currentSeason.toolsData.tribal?.[e];
            if (td && td.votes && !td.isFinal) {
                Object.keys(td.votes).forEach(pid => {
                    const v = td.votes[pid];
                    const p = currentSeason.players.find(x => x.id == pid);
                    if (p && (v.eliminated || v.medevac)) {
                        p.eliminated = true;
                        p.medevac = !!v.medevac;
                        p.isJury = !!v.jury;
                        p.eliminationEp = e;
                    }
                });
            }
        }
    }

    // --------------------------------------------------------------
    // RENDER FUNCTIONS
    // --------------------------------------------------------------
    function renderEmptyState() {
        tempWizardPlayers = [];
        wizSeasonName.value = '';
        wizSinglePlayer.value = '';
        wizBulkPlayers.value = '';
        renderWizPlayers();
        wizRenderTribeInputs();
        setupPhase.classList.remove('hidden');
        activeSeasonUI.classList.add('hidden');
        appContent.classList.add('hidden');
    }

    function renderUI() {
        setupPhase.classList.add('hidden');
        activeSeasonUI.classList.remove('hidden');
        appContent.classList.remove('hidden');
        seasonInfo.innerText = currentSeason.name;
        epDisplay.innerText = `Ep. ${currentSeason.currentEpisode}`;
        const activeTabBtn = document.querySelector('.smuffer-tab-btn.active');
        const tabName = activeTabBtn ? activeTabBtn.dataset.tab : 'overview';
        switchTab(tabName);
    }

    function switchTab(id) {
        if (simulationLoop) cancelAnimationFrame(simulationLoop);
        document.querySelectorAll('.smuffer-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.smuffer-tab-btn[data-tab="${id}"]`).classList.add('active');
        document.querySelectorAll('.smuffer-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${id}`).classList.add('active');

        if (id === 'overview') renderOverview();
        if (id === 'advantage') renderAdvantageTracker();
        if (id === 'alliances') renderAlliances();
        if (id === 'confessional') renderConfessional();
        if (id === 'rankings') renderRankings();
        if (id === 'tribal') renderTribal();
    }

    // --- OVERVIEW ---
    function renderOverview() {
        const ep = currentSeason.currentEpisode;
        const tribes = getEpTribesList(ep);
        let html = `<div class="smuffer-dnd-container">`;
        tribes.forEach(t => {
            const members = currentSeason.players.filter(p => !p.eliminated && getEpTribeId(p, ep) == t.id).sort((a, b) => a.name.localeCompare(b.name));
            html += `<div class="smuffer-tribe-box" style="background:${t.color}">
                <div class="smuffer-tribe-header">
                    <span data-tribe-id="${t.id}" class="tribe-name-edit">${t.name} ✎</span>
                    <span>${members.length}</span>
                </div>
                <div class="smuffer-tribe-drop-zone" data-tribe-id="${t.id}" ondragover="event.preventDefault()"></div>
            </div>`;
        });
        html += `</div>`;
        const bench = currentSeason.players.filter(p => !p.eliminated && !getEpTribeId(p, ep)).sort((a, b) => a.name.localeCompare(b.name));
        if (bench.length > 0) {
            html += `<div class="smuffer-unassigned-area" ondragover="event.preventDefault()">
                <h4>Bench</h4>
                <div class="smuffer-unassigned-grid" data-drop-zone="null"></div>
            </div>`;
        }
        const jury = currentSeason.players.filter(p => p.eliminated && p.isJury).sort((a, b) => a.name.localeCompare(b.name));
        if (jury.length > 0) {
            html += `<div class="smuffer-jury-area">
                <h4>⚖️ Jury</h4>
                <div class="smuffer-unassigned-grid">${jury.map(p => renderCard(p)).join('')}</div>
            </div>`;
        }
        const elim = currentSeason.players.filter(p => p.eliminated && !p.isJury).sort((a, b) => a.name.localeCompare(b.name));
        html += `<div class="smuffer-eliminated-area">
            <h4>💀 Eliminated</h4>
            <div class="smuffer-unassigned-grid">${elim.map(p => renderCard(p)).join('')}</div>
        </div>`;
        overviewContent.innerHTML = html;

        // Append cards dynamically to drop zones
        tribes.forEach(t => {
            const zone = document.querySelector(`.smuffer-tribe-drop-zone[data-tribe-id="${t.id}"]`);
            if (zone) {
                const members = currentSeason.players.filter(p => !p.eliminated && getEpTribeId(p, ep) == t.id).sort((a, b) => a.name.localeCompare(b.name));
                members.forEach(p => zone.appendChild(createDraggableCardElement(p)));
            }
        });
        const benchZone = document.querySelector('.smuffer-unassigned-grid[data-drop-zone="null"]');
        if (benchZone) bench.forEach(p => benchZone.appendChild(createDraggableCardElement(p)));

        // Attach drag listeners to cards
        attachDragListeners();

        // Update Show Notes button label
        toggleAllCardsBtn.textContent = allCardsExpanded ? 'Hide Notes' : 'Show Notes';
    }

    function renderCard(p) {
        const ep = currentSeason.currentEpisode;
        const advs = getEpAdv(p, ep);
        const advHtml = advs.map(a => `<span class="smuffer-adv-badge">${a.qty}x ${a.name}</span>`).join('');
        return `<div class="smuffer-draggable-card" draggable="true" data-player-id="${p.id}">
            <div class="smuffer-card-header-strip">
                <span>${p.name}</span>
                <span class="toggle-details" data-player-id="${p.id}">▼</span>
            </div>
            <div id="det-${p.id}" class="smuffer-card-details ${allCardsExpanded ? 'visible' : ''}">
                <textarea class="smuffer-card-notes-input" data-player-id="${p.id}" placeholder="Notes...">${p.notes || ''}</textarea>
                <div>${advHtml}</div>
            </div>
        </div>`;
    }

    function createDraggableCardElement(p) {
        const div = document.createElement('div');
        div.className = 'smuffer-draggable-card';
        div.draggable = true;
        div.dataset.playerId = p.id;
        const ep = currentSeason.currentEpisode;
        const advs = getEpAdv(p, ep);
        const advHtml = advs.map(a => `<span class="smuffer-adv-badge">${a.qty}x ${a.name}</span>`).join('');
        div.innerHTML = `
            <div class="smuffer-card-header-strip">
                <span>${p.name}</span>
                <span class="toggle-details" data-player-id="${p.id}">▼</span>
            </div>
            <div id="det-${p.id}" class="smuffer-card-details ${allCardsExpanded ? 'visible' : ''}">
                <textarea class="smuffer-card-notes-input" data-player-id="${p.id}" placeholder="Notes...">${p.notes || ''}</textarea>
                <div>${advHtml}</div>
            </div>
        `;
        return div;
    }

    function attachDragListeners() {
        document.querySelectorAll('.smuffer-draggable-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.removeEventListener('dragend', handleDragEnd);
            card.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.playerId);
        e.dataTransfer.setData('pid', e.currentTarget.dataset.playerId);
    }

    function handleDragEnd(e) {
        // no-op
    }

    // Drop zones are handled via global listeners
    function setupDropZones() {
        document.querySelectorAll('[ondragover]').forEach(el => el.removeEventListener('dragover', preventDefault));
        document.querySelectorAll('[ondragover]').forEach(el => el.addEventListener('dragover', preventDefault));
        document.querySelectorAll('.smuffer-tribe-drop-zone, .smuffer-unassigned-area, .smuffer-unassigned-grid').forEach(el => {
            el.addEventListener('dragover', preventDefault);
            el.addEventListener('drop', handleDrop);
        });
    }

    function preventDefault(e) { e.preventDefault(); }

    function handleDrop(e) {
        e.preventDefault();
        let targetZone = e.target.closest('.smuffer-tribe-drop-zone, .smuffer-unassigned-grid, .smuffer-unassigned-area');
        if (!targetZone) return;
        let tid = null;
        if (targetZone.classList.contains('smuffer-tribe-drop-zone')) {
            tid = parseInt(targetZone.dataset.tribeId);
        } else if (targetZone.classList.contains('smuffer-unassigned-grid') && targetZone.dataset.dropZone === 'null') {
            tid = null;
        } else if (targetZone.classList.contains('smuffer-unassigned-area')) {
            tid = null;
        }
        const pid = e.dataTransfer.getData('pid');
        if (!pid) return;
        const p = currentSeason.players.find(x => x.id == pid);
        if (!p) return;
        const ep = currentSeason.currentEpisode;
        p.tribeHistory[ep] = tid;
        saveData();
        renderOverview();
    }

    // --- ADVANTAGES ---
    function renderAdvantageTracker() {
        const ep = currentSeason.currentEpisode;
        const active = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        advantageGrid.innerHTML = active.map(p => {
            const advs = getEpAdv(p, ep);
            const color = getTribeColor(getEpTribeId(p, ep), ep);
            let html = `<div class="smuffer-adv-card" style="border-left-color:${color}">
                <div style="font-weight:bold; margin-bottom:10px;">${p.name}
                    <button class="btn-secondary btn-add-adv" data-pid="${p.id}" style="font-size:0.7rem; padding:2px 5px; float:right;">+ Add</button>
                </div>`;
            advs.forEach((a, i) => {
                html += `<div class="smuffer-adv-row" data-pid="${p.id}" data-index="${i}">
                    <input type="number" class="adv-qty" value="${a.qty}" style="width:40px" data-field="qty">
                    <input type="text" class="adv-name" value="${a.name}" style="flex:1" data-field="name">
                    <button class="smuffer-adv-remove" data-index="${i}">×</button>
                </div>`;
            });
            html += `</div>`;
            return html;
        }).join('');
    }

    // --- ALLIANCES ---
    function renderAlliances() {
        const ep = currentSeason.currentEpisode;
        const alliances = getEpAlliances(ep);
        const active = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        const esc = (s) => (typeof escapeHtml !== 'undefined' ? escapeHtml(s) : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
        allianceMemberSelect.innerHTML = active.map(p => `<label style="display:block"><input type="checkbox" value="${p.id}" class="all-chk"> ${esc(p.name)}</label>`).join('');
        activeAlliancesList.innerHTML = alliances.map((a, i) => `<div class="card" style="padding:0.75rem; margin-bottom:0.5rem;">
            <b>${esc(a.name)}</b> <button style="float:right; color:#e74c3c; border:none; background:none; cursor:pointer;" class="del-alliance" data-index="${i}">×</button>
            <div style="font-size:0.8rem; color:#4a5f73;">${a.members.map(mid => esc(currentSeason.players.find(x => x.id == mid)?.name || '')).join(', ')}</div>
        </div>`).join('');
        renderNetwork(active, alliances);
    }

    function renderNetwork(players, alliances) {
        const ctx = allianceCanvas.getContext('2d');
        if (graphNodes.length !== players.length) {
            graphNodes = players.map(p => ({
                id: p.id,
                name: p.name,
                x: Math.random() * allianceCanvas.width,
                y: Math.random() * allianceCanvas.height,
                vx: 0,
                vy: 0
            }));
        }
        const ep = currentSeason.currentEpisode;

        function step() {
            const k_rep = 8000;
            const k_att_alliance = 0.12;
            const ideal_link_alliance = 120;
            const k_cluster_tribe = 0.25;
            const tribe_cluster_dist = 120;
            const center_att = 0.002;

            graphNodes.forEach(n => {
                const p = currentSeason.players.find(x => x.id == n.id);
                n.color = getTribeColor(getEpTribeId(p, ep), ep);
                n.tribeId = getEpTribeId(p, ep);
            });

            graphNodes.forEach(n1 => {
                let fx = 0, fy = 0;
                graphNodes.forEach(n2 => {
                    if (n1 === n2) return;
                    const dx = n1.x - n2.x, dy = n1.y - n2.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 500) {
                        const f = k_rep / (dist * dist);
                        fx += (dx / dist) * f;
                        fy += (dy / dist) * f;
                    }
                    if (n1.tribeId === n2.tribeId && n1.tribeId != null && dist > tribe_cluster_dist) {
                        fx -= (dx / dist) * k_cluster_tribe;
                        fy -= (dy / dist) * k_cluster_tribe;
                    }
                });
                fx += (allianceCanvas.width / 2 - n1.x) * center_att;
                fy += (allianceCanvas.height / 2 - n1.y) * center_att;
                n1.vx = (n1.vx + fx) * 0.85;
                n1.vy = (n1.vy + fy) * 0.85;
            });

            alliances.forEach(a => {
                for (let i = 0; i < a.members.length; i++) {
                    for (let j = i + 1; j < a.members.length; j++) {
                        const n1 = graphNodes.find(n => n.id == a.members[i]);
                        const n2 = graphNodes.find(n => n.id == a.members[j]);
                        if (n1 && n2) {
                            const dx = n2.x - n1.x, dy = n2.y - n1.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
                            const f = (dist - ideal_link_alliance) * k_att_alliance, fx = (dx / dist) * f, fy = (dy / dist) * f;
                            n1.vx += fx;
                            n1.vy += fy;
                            n2.vx -= fx;
                            n2.vy -= fy;
                        }
                    }
                }
            });

            ctx.clearRect(0, 0, allianceCanvas.width, allianceCanvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#999";
            alliances.forEach(a => {
                for (let i = 0; i < a.members.length; i++) {
                    for (let j = i + 1; j < a.members.length; j++) {
                        const n1 = graphNodes.find(n => n.id == a.members[i]);
                        const n2 = graphNodes.find(n => n.id == a.members[j]);
                        if (n1 && n2) {
                            ctx.beginPath();
                            ctx.moveTo(n1.x, n1.y);
                            ctx.lineTo(n2.x, n2.y);
                            ctx.stroke();
                        }
                    }
                }
            });

            graphNodes.forEach(n => {
                if (n !== draggedNode) {
                    n.x += n.vx;
                    n.y += n.vy;
                }
                n.x = Math.max(45, Math.min(allianceCanvas.width - 45, n.x));
                n.y = Math.max(45, Math.min(allianceCanvas.height - 45, n.y));
                ctx.beginPath();
                ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.fill();
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.fillStyle = "#333";
                ctx.font = "bold 12px Arial";
                ctx.textAlign = "center";
                ctx.fillText(n.name, n.x, n.y + 25);
            });
            simulationLoop = requestAnimationFrame(step);
        }

        if (simulationLoop) cancelAnimationFrame(simulationLoop);
        step();

        // Canvas drag handling
        allianceCanvas.onmousedown = (e) => {
            const rect = allianceCanvas.getBoundingClientRect();
            draggedNode = graphNodes.find(n => Math.hypot(n.x - (e.clientX - rect.left), n.y - (e.clientY - rect.top)) < 20);
        };
        allianceCanvas.onmousemove = (e) => {
            if (draggedNode) {
                const rect = allianceCanvas.getBoundingClientRect();
                draggedNode.x = e.clientX - rect.left;
                draggedNode.y = e.clientY - rect.top;
                draggedNode.vx = 0;
                draggedNode.vy = 0;
            }
        };
        allianceCanvas.onmouseup = () => { draggedNode = null; };
    }

    // --- CONFESSIONAL ---
    function renderConfessional() {
        const ep = currentSeason.currentEpisode;
        confEpDisplay.innerText = ep;
        const active = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        let tablePlayers = getSortedTablePlayers();

        confInputGrid.innerHTML = active.map(p => {
            const color = getTribeColor(getEpTribeId(p, ep), ep);
            return `<div class="smuffer-conf-card" style="border-left-color:${color}">
                <b>${p.name}</b>
                <button class="btn-secondary conf-minus" data-pid="${p.id}" style="padding:0.2rem 0.4rem;">−</button>
                <b class="conf-count" data-pid="${p.id}">${p.confessionals[ep] || 0}</b>
                <button class="btn-secondary conf-plus" data-pid="${p.id}" style="padding:0.2rem 0.4rem;">+</button>
            </div>`;
        }).join('');

        tablePlayers = sortConfTablePlayers(tablePlayers, ep);

        const sortIcon = (col) => {
            if (confSortCol !== col) return ' <span class="smuffer-sort-icon">↕</span>';
            return confSortAsc ? ' <span class="smuffer-sort-icon">▲</span>' : ' <span class="smuffer-sort-icon">▼</span>';
        };
        let h = `<thead><tr><th class="smuffer-conf-sortable" data-col="0">Player${sortIcon(0)}</th>`;
        for (let i = 1; i <= ep; i++) h += `<th class="smuffer-conf-sortable" data-col="${i}">E${i}${sortIcon(i)}</th>`;
        h += `<th class="smuffer-conf-sortable" data-col="${ep + 1}">Tot${sortIcon(ep + 1)}</th></tr></thead><tbody>`;
        tablePlayers.forEach(p => {
            let tot = 0;
            h += `<tr><td>${p.name}</td>`;
            for (let i = 1; i <= ep; i++) {
                const c = p.confessionals[i] || 0;
                tot += c;
                if (p.eliminated && p.eliminationEp && i > p.eliminationEp) h += `<td class="smuffer-cell-eliminated"></td>`;
                else h += `<td>${c}</td>`;
            }
            h += `<td>${tot}</td></tr>`;
        });
        confMainTable.innerHTML = h + `</tbody>`;
    }

    function sortConfTablePlayers(players, ep) {
        if (confSortCol < 0) return players;
        const asc = confSortAsc ? 1 : -1;
        return [...players].sort((a, b) => {
            let va, vb;
            if (confSortCol === 0) {
                va = (a.name || '').toLowerCase();
                vb = (b.name || '').toLowerCase();
                return asc * va.localeCompare(vb);
            }
            if (confSortCol === ep + 1) {
                va = 0; vb = 0;
                for (let i = 1; i <= ep; i++) { va += (a.confessionals[i] || 0); vb += (b.confessionals[i] || 0); }
            } else {
                va = a.confessionals[confSortCol] || 0;
                vb = b.confessionals[confSortCol] || 0;
            }
            return asc * (va - vb);
        });
    }

    // --- RANKINGS ---
    function renderRankings() {
        const ep = currentSeason.currentEpisode;
        if (!currentSeason.toolsData.rankings[ep]) {
            currentSeason.toolsData.rankings[ep] = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name)).map(p => p.id);
        }
        const list = currentSeason.toolsData.rankings[ep];
        const mid = Math.ceil(list.length / 2);
        const leftList = list.slice(0, mid);
        const rightList = list.slice(mid, list.length);

        const renderRankItem = (pid, i) => {
            const p = currentSeason.players.find(x => x.id == pid);
            return `<li class="smuffer-rank-item" draggable="true" data-index="${i}">
                <span class="smuffer-rank-pos">${i + 1}</span>
                <span class="smuffer-rank-name">${p ? p.name : '?'}</span>
                <div class="smuffer-flex-row smuffer-gap-5">
                    <button class="btn-secondary rank-up" data-index="${i}" style="padding:0.25rem 0.5rem;">▲</button>
                    <button class="btn-secondary rank-down" data-index="${i}" style="padding:0.25rem 0.5rem;">▼</button>
                </div>
            </li>`;
        };
        rankingsListLeft.innerHTML = leftList.map((pid, j) => renderRankItem(pid, j)).join('');
        rankingsListRight.innerHTML = rightList.map((pid, j) => renderRankItem(pid, mid + j)).join('');
        attachRankingsDragListeners();
    }

    function attachRankingsDragListeners() {
        document.querySelectorAll('#rankingsContainer .smuffer-rank-item').forEach(item => {
            item.addEventListener('dragstart', handleRankDragStart);
            item.addEventListener('dragend', handleRankDragEnd);
            item.addEventListener('dragover', handleRankDragOver);
            item.addEventListener('dragleave', handleRankDragLeave);
            item.addEventListener('drop', handleRankDrop);
        });
    }

    function handleRankDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.index);
        e.dataTransfer.setData('rankIndex', e.currentTarget.dataset.index);
        e.currentTarget.classList.add('smuffer-rank-dragging');
    }

    function handleRankDragEnd(e) {
        document.querySelectorAll('.smuffer-rank-item').forEach(el => el.classList.remove('smuffer-rank-dragging', 'smuffer-rank-drag-over'));
    }

    function handleRankDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget;
        if (target.classList.contains('smuffer-rank-dragging')) return;
        target.classList.add('smuffer-rank-drag-over');
    }

    function handleRankDragLeave(e) {
        e.currentTarget.classList.remove('smuffer-rank-drag-over');
    }

    function handleRankDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('smuffer-rank-drag-over');
        document.querySelectorAll('.smuffer-rank-item').forEach(el => el.classList.remove('smuffer-rank-dragging', 'smuffer-rank-drag-over'));
        const srcIdx = parseInt(e.dataTransfer.getData('rankIndex'));
        const tgtIdx = parseInt(e.currentTarget.dataset.index);
        if (isNaN(srcIdx) || isNaN(tgtIdx) || srcIdx === tgtIdx) return;
        const list = currentSeason.toolsData.rankings[currentSeason.currentEpisode];
        const [moved] = list.splice(srcIdx, 1);
        list.splice(tgtIdx, 0, moved);
        saveData();
        renderRankings();
    }

    function movRank(i, d) {
        const list = currentSeason.toolsData.rankings[currentSeason.currentEpisode];
        if (i + d < 0 || i + d >= list.length) return;
        [list[i], list[i + d]] = [list[i + d], list[i]];
        saveData();
        renderRankings();
    }

    // --- TRIBAL ---
    function renderTribal() {
        const ep = currentSeason.currentEpisode;
        tribalEpDisplay.innerText = ep;
        if (!currentSeason.toolsData.tribal[ep]) {
            currentSeason.toolsData.tribal[ep] = {
                selectedTribes: [],
                votes: {},
                splitTribal: false,
                splitSelection: [],
                noElimination: false,
                isFinal: false,
                finalVotes: {}
            };
        }
        const td = currentSeason.toolsData.tribal[ep];
        const tribes = getEpTribesList(ep);

        ftcToggleArea.innerHTML = `<label style="background:#5D9CA3; color:white; padding:5px 10px; border-radius:4px; font-weight:bold;">
            <input type="checkbox" id="ftcCheckbox" ${td.isFinal ? 'checked' : ''}> Is Final Tribal Council?
        </label>`;

        if (td.isFinal) {
            renderFinalTribal();
            return;
        } else {
            tribalContentArea.classList.remove('hidden');
            finalTribalContentArea.classList.add('hidden');
            tribalTribeSelect.style.display = 'block';
            splitTribalArea.style.display = 'block';
        }

        if (tribes.length === 1) {
            splitTribalArea.innerHTML = `<div class="smuffer-split-box">
                <label><input type="checkbox" id="splitTribalCheckbox" ${td.splitTribal ? 'checked' : ''}> Split Tribal</label>
                ${td.splitTribal ? `<button class="btn-secondary" id="editSplitBtn" style="font-size:0.8rem; padding:4px;">Edit</button>` : ''}
            </div>`;
        } else {
            splitTribalArea.innerHTML = '';
        }

        if (tribes.length > 1) {
            tribalTribeSelect.innerHTML = tribes.map(t => `<label class="smuffer-tribe-badge-chk" style="background:${t.color}">
                <input type="checkbox" class="tribe-select-chk" data-tribe-id="${t.id}" ${td.selectedTribes.includes(t.id) ? 'checked' : ''}> ${t.name}
            </label>`).join('');
        } else {
            tribalTribeSelect.innerHTML = '';
            if (td.selectedTribes.length === 0) td.selectedTribes = [tribes[0].id];
        }

        const active = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        let part = active.filter(p => td.selectedTribes.includes(getEpTribeId(p, ep)));
        if (td.splitTribal && td.splitSelection.length > 0) {
            part = part.filter(p => td.splitSelection.includes(p.id));
        }

        if (part.length === 0 && !td.noElimination) {
            tribalContentArea.classList.add('hidden');
        } else {
            tribalContentArea.classList.remove('hidden');
            noElimChk.checked = td.noElimination;
            const immuneIds = part.filter(p => td.votes[p.id]?.immunity).map(p => p.id);
            tribalVoteList.innerHTML = part.map(p => {
                const v = td.votes[p.id] || {
                    target: '', target2: '', immunity: false, eliminated: false, medevac: false,
                    jury: false, recv: null, extra: false, lost: false, idoled: false,
                    usedAdv: [], sitdUsed: false, sitdResult: null
                };
                const inventory = getEpAdv(p, ep);
                const esc = (s) => (typeof escapeHtml !== 'undefined' ? escapeHtml(s) : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
                const targets = part.filter(x => x.id !== p.id && !immuneIds.includes(x.id)).map(x => `<option value="${x.id}" ${v.target == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
                const usedBadges = (v.usedAdv || []).map((u, idx) => `<span class="smuffer-used-adv-badge">${u} <b class="smuffer-used-adv-remove" data-pid="${p.id}" data-idx="${idx}">×</b></span>`).join('');
                const usedCounts = {};
                (v.usedAdv || []).forEach(n => usedCounts[n] = (usedCounts[n] || 0) + 1);
                const availOpts = inventory.filter(a => a.qty > (usedCounts[a.name] || 0)).map(a => `<option value="${a.name}">${a.name} (x${a.qty})</option>`).join('');

                let calcVotes = 0;
                Object.values(td.votes).forEach(voteObj => {
                    if (voteObj.target == p.id) calcVotes++;
                    if (voteObj.target2 == p.id) calcVotes++;
                });
                const displayRecv = v.recv !== null ? v.recv : calcVotes;

                let voteUI = '';
                if (v.sitdUsed) {
                    voteUI = `<div class="smuffer-flex-row smuffer-gap-5">
                        <span style="font-weight:bold; font-size:0.8rem; color:var(--accent-color)">SITD Active</span>
                        <select class="smuffer-sitd-result-select" data-pid="${p.id}">
                            <option value="">Result?</option>
                            <option value="Safe" ${v.sitdResult == 'Safe' ? 'selected' : ''}>Safe</option>
                            <option value="Unsafe" ${v.sitdResult == 'Unsafe' ? 'selected' : ''}>Unsafe</option>
                        </select>
                    </div>`;
                } else if (v.lost) {
                    voteUI = '<span style="color:red;font-weight:bold">VOTE LOST</span>';
                } else {
                    voteUI = `<select class="smuffer-vote-select vote-target" data-pid="${p.id}">
                        <option value="">- Vote -</option>${targets}
                    </select>`;
                    if (v.extra) {
                        voteUI += `<select class="smuffer-vote-select vote-target2" data-pid="${p.id}">
                            <option value="">- Extra -</option>${targets}
                        </select>`;
                    }
                }

                return `<tr>
                    <td style="font-weight:bold; border-left:4px solid ${getTribeColor(getEpTribeId(p, ep), ep)}">${p.name}</td>
                    <td style="text-align:center"><input type="checkbox" class="vote-immunity" data-pid="${p.id}" ${v.immunity ? 'checked' : ''}></td>
                    <td>
                        <div class="smuffer-flex-row" style="flex-wrap:wrap; gap:4px; margin-bottom:4px;">${usedBadges}</div>
                        <select class="smuffer-vote-select add-adv" data-pid="${p.id}" style="font-size:0.75rem"><option value="">+ Use Adv</option>${availOpts}</select>
                        <div style="margin-top:5px;"><label class="checkbox-label"><input type="checkbox" class="vote-sitd" data-pid="${p.id}" ${v.sitdUsed ? 'checked' : ''}> Shot In The Dark</label></div>
                    </td>
                    <td>
                        <label class="checkbox-label"><input type="checkbox" class="vote-extra" data-pid="${p.id}" ${v.extra ? 'checked' : ''}> Extra Vote</label>
                        <label class="checkbox-label"><input type="checkbox" class="vote-lost" data-pid="${p.id}" ${v.lost ? 'checked' : ''}> Vote Lost</label>
                    </td>
                    <td>${voteUI}</td>
                    <td>
                        <input type="number" class="vote-recv ${v.idoled ? 'smuffer-idoled-cell' : ''}" style="width:40px" data-pid="${p.id}" value="${displayRecv}">
                        <label class="checkbox-label" style="font-size:0.7rem; color:#777"><input type="checkbox" class="vote-idoled" data-pid="${p.id}" ${v.idoled ? 'checked' : ''}> Idoled</label>
                    </td>
                    <td>
                        <label class="checkbox-label"><input type="checkbox" class="vote-eliminated" data-pid="${p.id}" ${v.eliminated ? 'checked' : ''}> Eliminated</label>
                        <label class="checkbox-label"><input type="checkbox" class="vote-medevac" data-pid="${p.id}" ${v.medevac ? 'checked' : ''}> Medevac</label>
                        <label class="checkbox-label" style="${v.jury ? 'color:#e74c3c; font-weight:800;' : ''}">
                            <input type="checkbox" class="vote-jury" data-pid="${p.id}" ${v.jury ? 'checked' : ''} ${(!v.eliminated || v.medevac) ? 'disabled' : ''}> Jury
                        </label>
                    </td>
                </tr>`;
            }).join('');
        }
    }

    function renderFinalTribal() {
        tribalContentArea.classList.add('hidden');
        tribalTribeSelect.style.display = 'none';
        splitTribalArea.style.display = 'none';
        finalTribalContentArea.classList.remove('hidden');

        const finalists = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        const jurors = currentSeason.players.filter(p => p.eliminated && p.isJury).sort((a, b) => a.name.localeCompare(b.name));
        const ep = currentSeason.currentEpisode;
        const td = currentSeason.toolsData.tribal[ep];
        if (!td.finalVotes) td.finalVotes = {};

        // Calculate Votes
        const votesCount = {};
        let maxVotes = -1;
        finalists.forEach(f => {
            const c = jurors.filter(j => td.finalVotes[j.id] == f.id).length;
            votesCount[f.id] = c;
            if (c > maxVotes) maxVotes = c;
        });

        // Finalist Boxes
        finalistsContainer.innerHTML = finalists.map(f => {
            const votes = jurors.filter(j => td.finalVotes[j.id] == f.id);
            const count = votes.length;
            const isWinner = (count === maxVotes && maxVotes > 0);
            const boxStyle = isWinner ? 'border: 3px solid #2ecc71; background: #e8f8f5;' : '';
            const badgeStyle = isWinner ? 'background:#2ecc71' : '';

            return `<div class="smuffer-finalist-box" style="${boxStyle}">
                <div class="smuffer-finalist-header">
                    <span>${f.name}</span>
                    <span class="smuffer-vote-counter-badge" style="${badgeStyle}">${count} Votes</span>
                </div>
                <div class="smuffer-finalist-votes-area" data-finalist-id="${f.id}" ondragover="event.preventDefault()"></div>
            </div>`;
        }).join('');

        // Unassigned Jury Pool
        const unassigned = jurors.filter(j => !td.finalVotes[j.id]);
        juryPoolDrop.innerHTML = unassigned.map(j => renderJurorCard(j)).join('');

        // Attach drop listeners
        document.querySelectorAll('.smuffer-finalist-votes-area').forEach(area => {
            area.addEventListener('dragover', preventDefault);
            area.addEventListener('drop', handleJurorDrop);
        });
        juryPoolDrop.addEventListener('dragover', preventDefault);
        juryPoolDrop.addEventListener('drop', handleJurorDrop);
    }

    function renderJurorCard(j) {
        return `<div class="smuffer-juror-card" draggable="true" data-juror-id="${j.id}">${j.name}</div>`;
    }

    function handleJurorDrop(e) {
        e.preventDefault();
        const target = e.target.closest('.smuffer-finalist-votes-area') || e.target.closest('#juryPoolDrop');
        if (!target) return;
        const jid = e.dataTransfer.getData('jurorId');
        if (!jid) return;
        const ep = currentSeason.currentEpisode;
        const td = currentSeason.toolsData.tribal[ep];
        if (target.id === 'juryPoolDrop') {
            delete td.finalVotes[jid];
        } else {
            const finalistId = parseInt(target.dataset.finalistId);
            td.finalVotes[jid] = finalistId;
        }
        saveData();
        renderFinalTribal();
    }

    // --------------------------------------------------------------
    // EVENT LISTENERS (static delegation)
    // --------------------------------------------------------------
    // Tab switching
    document.querySelectorAll('.smuffer-tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            switchTab(this.dataset.tab);
        });
    });

    // Episode navigation
    epPrevBtn.addEventListener('click', function() { changeEpisode(-1); });
    epNextBtn.addEventListener('click', function() { changeEpisode(1); });

    // Reset tab buttons
    document.querySelectorAll('.smuffer-btn-reset-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.reset;
            if (!confirm("Reset tab for THIS episode?")) return;
            const ep = currentSeason.currentEpisode;
            if (tab === 'advantage') currentSeason.players.forEach(p => p.advHistory[ep] = []);
            if (tab === 'alliances') currentSeason.toolsData.allianceHistory[ep] = [];
            if (tab === 'confessional') currentSeason.players.forEach(p => delete p.confessionals[ep]);
            if (tab === 'rankings') delete currentSeason.toolsData.rankings[ep];
            if (tab === 'tribal') delete currentSeason.toolsData.tribal[ep];
            saveData();
            switchTab(tab);
        });
    });

    // Tools dropdown
    resetAllBtn.addEventListener('click', function() {
        if (confirm("Delete all data?")) {
            localStorage.clear();
            location.reload();
        }
    });

    exportBtn.addEventListener('click', function() {
        if (!currentSeason) return alert("No season to export");
        if (window.recordToolUsed) window.recordToolUsed('smuffer');
        const blob = new Blob([JSON.stringify(currentSeason)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = window.getSessionFilename ? window.getSessionFilename('Smuffer', currentSeason.name) : 'SMUFFER_Session_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
    });

    importBtn.addEventListener('click', function() {
        importFile.click();
    });

    importFile.addEventListener('change', function(e) {
        const r = new FileReader();
        r.onload = function(ev) {
            currentSeason = JSON.parse(ev.target.result);
            migrateHistory();
            saveData();
            location.reload();
        };
        r.readAsText(e.target.files[0]);
    });

    // Setup phase
    wizAddPlayerBtn.addEventListener('click', wizAddPlayer);
    wizBulkPlayers.addEventListener('blur', wizProcessBulk);
    startSeasonBtn.addEventListener('click', wizFinish);
    wizTribeCount.addEventListener('change', wizRenderTribeInputs);

    document.getElementById('wizImportCastBtn').addEventListener('click', () => document.getElementById('wizImportCastFile').click());
    document.getElementById('wizExportCastBtn').addEventListener('click', function() {
        const names = [...tempWizardPlayers];
        if (names.length === 0) { alert('No players to export.'); return; }
        const tribes = [];
        document.querySelectorAll('.w-t-n').forEach((inp, i) => {
            const col = document.querySelectorAll('.w-t-c')[i];
            tribes.push({ nome: inp.value || `Tribe ${i + 1}`, colore: col ? col.value : '#888888' });
        });
        const data = window.CastShared.createUnifiedCast({
            players: names.map(n => ({ nome: n })),
            tribes: tribes.length ? tribes : [],
            seasonName: wizSeasonName.value || ''
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = window.getCastFilename ? window.getCastFilename() : 'cast_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });
    document.getElementById('wizImportCastFile').addEventListener('change', function(e) {
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
            const data = parsed.data;
            const players = window.CastShared.forSmuffer(data);
            tempWizardPlayers = players.map(p => p.name);
            if (data.seasonName) wizSeasonName.value = data.seasonName;
            const tribes = data.tribes || [];
            if (tribes.length > 0) {
                wizTribeCount.value = tribes.length;
                wizRenderTribeInputs();
                document.querySelectorAll('.w-t-n').forEach((inp, i) => {
                    if (tribes[i]) inp.value = tribes[i].nome || tribes[i].name || '';
                });
                document.querySelectorAll('.w-t-c').forEach((inp, i) => {
                    if (tribes[i]) inp.value = tribes[i].colore || tribes[i].color || inp.value;
                });
            }
            renderWizPlayers();
            e.target.value = '';
        };
        r.readAsText(file);
    });

    // Overview
    toggleAllCardsBtn.addEventListener('click', function() {
        allCardsExpanded = !allCardsExpanded;
        renderOverview();
    });
    swapSetupBtn.addEventListener('click', triggerSwapSetup);
    openMergeModalBtn.addEventListener('click', function() { mergeModal.style.display = 'flex'; });

    // Modal close buttons (delegation)
    document.addEventListener('click', function(e) {
        const closeBtn = e.target.closest('.smuffer-modal-close');
        if (closeBtn && closeBtn.dataset.close) {
            document.getElementById(closeBtn.dataset.close).style.display = 'none';
        }
    });

    // Merge modal
    executeMergeBtn.addEventListener('click', executeMerge);
    // Swap modal
    swapTribeCount.addEventListener('change', renderSwapInputs);
    swapTribeCount.addEventListener('input', renderSwapInputs);


    // Alliance
    createAllianceBtn.addEventListener('click', createNewAlliance);

    function createNewAlliance() {
        const name = allianceNameInput.value.trim();
        if (!name) return alert('Enter alliance name');
        const checked = Array.from(document.querySelectorAll('.all-chk:checked')).map(c => parseInt(c.value));
        if (checked.length < 2) return alert('Select at least 2 members');
        const ep = currentSeason.currentEpisode;
        if (!currentSeason.toolsData.allianceHistory[ep]) currentSeason.toolsData.allianceHistory[ep] = [];
        currentSeason.toolsData.allianceHistory[ep].push({ name, members: checked });
        allianceNameInput.value = '';
        document.querySelectorAll('.all-chk').forEach(c => { c.checked = false; });
        saveData();
        renderAlliances();
    }
    // Use delegation for delete alliance buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('del-alliance')) {
            const i = e.target.dataset.index;
            const ep = currentSeason.currentEpisode;
            currentSeason.toolsData.allianceHistory[ep].splice(i, 1);
            saveData();
            renderAlliances();
        }
    });

    // Advantages (delegation)
    document.addEventListener('click', function(e) {
        const addBtn = e.target.closest('.btn-add-adv');
        if (addBtn) {
            const pid = parseInt(addBtn.dataset.pid);
            const p = currentSeason.players.find(x => x.id == pid);
            if (!p) return;
            const ep = currentSeason.currentEpisode;
            if (!p.advHistory[ep]) p.advHistory[ep] = [];
            p.advHistory[ep].push({ name: 'Idol', qty: 1 });
            saveData();
            renderAdvantageTracker();
        }
        if (e.target.classList.contains('smuffer-adv-remove')) {
            const row = e.target.closest('.smuffer-adv-row');
            const pid = parseInt(row.dataset.pid);
            const idx = parseInt(row.dataset.index);
            currentSeason.players.find(x => x.id == pid).advHistory[currentSeason.currentEpisode].splice(idx, 1);
            saveData();
            renderAdvantageTracker();
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('adv-qty')) {
            const row = e.target.closest('.smuffer-adv-row');
            const pid = parseInt(row.dataset.pid);
            const idx = parseInt(row.dataset.index);
            currentSeason.players.find(x => x.id == pid).advHistory[currentSeason.currentEpisode][idx].qty = parseInt(e.target.value);
            saveData();
        }
        if (e.target.classList.contains('adv-name')) {
            const row = e.target.closest('.smuffer-adv-row');
            const pid = parseInt(row.dataset.pid);
            const idx = parseInt(row.dataset.index);
            currentSeason.players.find(x => x.id == pid).advHistory[currentSeason.currentEpisode][idx].name = e.target.value;
            saveData();
        }
    });

    // Confessional (delegation)
    document.addEventListener('click', function(e) {
        const sortTh = e.target.closest('.smuffer-conf-sortable');
        if (sortTh) {
            const col = parseInt(sortTh.dataset.col);
            if (confSortCol === col) confSortAsc = !confSortAsc;
            else { confSortCol = col; confSortAsc = true; }
            renderConfessional();
        }
        const btn = e.target.closest('.conf-plus, .conf-minus');
        if (btn) {
            const pid = parseInt(btn.dataset.pid);
            const p = currentSeason.players.find(x => x.id == pid);
            if (!p) return;
            if (!p.confessionals) p.confessionals = {};
            const ep = currentSeason.currentEpisode;
            if (!p.confessionals[ep]) p.confessionals[ep] = 0;
            p.confessionals[ep] += btn.classList.contains('conf-plus') ? 1 : -1;
            if (p.confessionals[ep] < 0) p.confessionals[ep] = 0;
            saveData();
            renderConfessional();
        }
    });

    // Rankings (delegation)
    document.addEventListener('click', function(e) {
        const upBtn = e.target.closest('.rank-up');
        const downBtn = e.target.closest('.rank-down');
        if (upBtn) {
            const i = parseInt(upBtn.dataset.index);
            movRank(i, -1);
        }
        if (downBtn) {
            const i = parseInt(downBtn.dataset.index);
            movRank(i, 1);
        }
    });

    // Tribal (delegation)
    document.addEventListener('change', function(e) {
        const ep = currentSeason.currentEpisode;
        const td = currentSeason.toolsData.tribal[ep];
        if (!td) return;

        if (e.target.id === 'ftcCheckbox') {
            td.isFinal = e.target.checked;
            saveData();
            renderTribal();
        }
        if (e.target.id === 'splitTribalCheckbox') {
            td.splitTribal = e.target.checked;
            if (td.splitTribal) {
                openSplitModal();
            } else {
                td.splitSelection = [];
                saveData();
                renderTribal();
            }
        }
        if (e.target.classList.contains('tribe-select-chk')) {
            const tid = parseInt(e.target.dataset.tribeId);
            if (e.target.checked) td.selectedTribes.push(tid);
            else td.selectedTribes = td.selectedTribes.filter(x => x != tid);
            saveData();
            renderTribal();
        }
        if (e.target.classList.contains('vote-immunity')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].immunity = e.target.checked;
            saveData();
        }
        if (e.target.classList.contains('vote-extra')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].extra = e.target.checked;
            saveData();
            renderTribal();
        }
        if (e.target.classList.contains('vote-lost')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].lost = e.target.checked;
            if (td.votes[pid].lost) td.votes[pid].target = ''; // clear vote
            saveData();
            renderTribal();
        }
        if (e.target.classList.contains('vote-sitd')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].sitdUsed = e.target.checked;
            if (!e.target.checked) td.votes[pid].sitdResult = null;
            saveData();
            renderTribal();
        }
        if (e.target.classList.contains('vote-target')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].target = e.target.value;
            saveData();
        }
        if (e.target.classList.contains('vote-target2')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].target2 = e.target.value;
            saveData();
        }
        if (e.target.classList.contains('vote-recv')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].recv = e.target.value === '' ? null : parseInt(e.target.value);
            saveData();
        }
        if (e.target.classList.contains('vote-idoled')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].idoled = e.target.checked;
            saveData();
        }
        if (e.target.classList.contains('vote-eliminated')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].eliminated = e.target.checked;
            if (td.votes[pid].eliminated) td.votes[pid].medevac = false;
            saveData();
        }
        if (e.target.classList.contains('vote-medevac')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].medevac = e.target.checked;
            if (td.votes[pid].medevac) td.votes[pid].eliminated = false;
            saveData();
        }
        if (e.target.classList.contains('vote-jury')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].jury = e.target.checked;
            saveData();
        }
        if (e.target.classList.contains('smuffer-sitd-result-select')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            td.votes[pid].sitdResult = e.target.value;
            if (e.target.value === 'Safe') td.votes[pid].idoled = true;
            saveData();
            renderTribal();
        }
        if (e.target.classList.contains('add-adv')) {
            const pid = parseInt(e.target.dataset.pid);
            if (!td.votes[pid]) td.votes[pid] = {};
            if (!td.votes[pid].usedAdv) td.votes[pid].usedAdv = [];
            if (e.target.value) {
                td.votes[pid].usedAdv.push(e.target.value);
                e.target.value = ''; // reset select
                saveData();
                renderTribal();
            }
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target.id === 'editSplitBtn') {
            openSplitModal();
        }
        if (e.target.classList.contains('smuffer-used-adv-remove')) {
            const pid = parseInt(e.target.dataset.pid);
            const idx = parseInt(e.target.dataset.idx);
            const ep = currentSeason.currentEpisode;
            const td = currentSeason.toolsData.tribal[ep];
            if (td && td.votes[pid] && td.votes[pid].usedAdv) {
                td.votes[pid].usedAdv.splice(idx, 1);
                saveData();
                renderTribal();
            }
        }
    });

    noElimChk.addEventListener('change', function(e) {
        const ep = currentSeason.currentEpisode;
        if (currentSeason.toolsData.tribal[ep]) {
            currentSeason.toolsData.tribal[ep].noElimination = e.target.checked;
            saveData();
        }
    });

    saveTribalBtn.addEventListener('click', function(e) {
        recalcGameState();
        saveData();
        e.target.innerText = "Saved! ✓";
        setTimeout(() => e.target.innerText = "Save Tribal Council", 1500);
    });

    // Split modal
    confirmSplitBtn.addEventListener('click', function() {
        closeModal('splitModal');
        renderTribal();
    });

    // Notes update (delegation)
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('smuffer-card-notes-input')) {
            const pid = parseInt(e.target.dataset.playerId);
            const p = currentSeason.players.find(x => x.id == pid);
            if (p) p.notes = e.target.value;
            saveData();
        }
    });

    // Toggle card details (delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('toggle-details')) {
            const pid = e.target.dataset.playerId;
            const details = document.getElementById(`det-${pid}`);
            if (details) details.classList.toggle('visible');
        }
    });

    // Tribe name editing (delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tribe-name-edit')) {
            const tid = parseInt(e.target.dataset.tribeId);
            const ep = currentSeason.currentEpisode;
            const tribes = getEpTribesList(ep);
            const t = tribes.find(x => x.id == tid);
            const n = prompt("New Name:", t.name);
            if (n) {
                t.name = n;
                saveData();
                renderOverview();
            }
        }
    });

    // Drag and drop global setup
    document.addEventListener('dragover', function(e) {
        if (e.target.closest('.smuffer-tribe-drop-zone, .smuffer-unassigned-area, .smuffer-unassigned-grid, .smuffer-finalist-votes-area, #juryPoolDrop')) {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', function(e) {
        if (e.target.closest('.smuffer-tribe-drop-zone, .smuffer-unassigned-grid, .smuffer-unassigned-area')) {
            handleDrop(e);
        }
        if (e.target.closest('.smuffer-finalist-votes-area, #juryPoolDrop')) {
            handleJurorDrop(e);
        }
    });

    // Drag start for jurors (delegation)
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('smuffer-juror-card')) {
            e.dataTransfer.setData('jurorId', e.target.dataset.jurorId);
        }
        if (e.target.classList.contains('smuffer-draggable-card')) {
            e.dataTransfer.setData('pid', e.target.dataset.playerId);
        }
    });

    // --------------------------------------------------------------
    // WIZARD FUNCTIONS
    // --------------------------------------------------------------
    function wizAddPlayer() {
        const n = wizSinglePlayer.value.trim();
        if (n) {
            tempWizardPlayers.push(n);
            wizSinglePlayer.value = '';
            renderWizPlayers();
        }
    }

    function wizProcessBulk() {
        const v = wizBulkPlayers.value;
        v.split('\n').forEach(l => { if (l.trim()) tempWizardPlayers.push(l.trim()); });
        wizBulkPlayers.value = '';
        renderWizPlayers();
    }

    function renderWizPlayers() {
        wizPlayerListDisplay.innerHTML = tempWizardPlayers.map((p, i) =>
            `<span class="smuffer-player-tag">${p} <b style="cursor:pointer; color:#e74c3c" data-wiz-remove="${i}">x</b></span>`
        ).join('');
        wizCount.innerText = tempWizardPlayers.length;
        // add remove listeners
        document.querySelectorAll('[data-wiz-remove]').forEach(el => {
            el.addEventListener('click', function() {
                const i = parseInt(this.dataset.wizRemove);
                tempWizardPlayers.splice(i, 1);
                renderWizPlayers();
            });
        });
    }

    function wizRenderTribeInputs() {
        const c = parseInt(wizTribeCount.value);
        let h = '';
        const colors = ['#FEB95F', '#5D9CA3', '#FF595E', '#312F2F', '#8E44AD'];
        for (let i = 0; i < c; i++) {
            h += `<div style="display:flex; gap:10px; margin-bottom:5px;">
                <input class="w-t-n" placeholder="e.g. Tribe ${i + 1}" style="flex:1">
                <input type="color" class="w-t-c" value="${colors[i % 5]}">
            </div>`;
        }
        wizTribeInputsContainer.innerHTML = h;
    }

    function wizFinish() {
        if (!wizSeasonName.value) return alert("Enter Season Name");
        if (tempWizardPlayers.length < 2) return alert("Need at least 2 players");
        const name = wizSeasonName.value;
        const tNames = document.querySelectorAll('.w-t-n');
        const tCols = document.querySelectorAll('.w-t-c');
        const tribes = [];
        tNames.forEach((t, i) => tribes.push({ id: Date.now() + i, name: t.value?.trim() || `Tribe ${i + 1}`, color: tCols[i].value }));

        currentSeason = {
            name: name,
            currentEpisode: 1,
            players: tempWizardPlayers.map((n, i) => ({
                id: Date.now() + 100 + i,
                name: n,
                tribeHistory: { 1: null },
                advHistory: { 1: [] },
                edgic: {},
                confessionals: {},
                notes: ''
            })),
            toolsData: {
                overview: { tribes },
                tribal: {},
                allianceHistory: { 1: [] },
                rankings: {},
                tribeStructureHistory: { 1: tribes }
            }
        };
        saveData();
        renderUI();
    }

    // --------------------------------------------------------------
    // SWAP / MERGE FUNCTIONS
    // --------------------------------------------------------------
    function triggerSwapSetup() {
        swapModal.style.display = 'flex';
        swapRandomAssignChk = document.getElementById('swapRandomAssign');
        renderSwapInputs();
    }

    function renderSwapInputs() {
        const c = Math.max(1, parseInt(swapTribeCount.value) || 2);
        let h = '';
        const colors = ['#FEB95F', '#5D9CA3', '#FF595E', '#312F2F', '#8E44AD'];
        for (let i = 0; i < c; i++) {
            h += `<div style="display:flex; gap:10px; margin-bottom:5px;">
                <input class="swap-tribe-name" placeholder="e.g. New Tribe ${i + 1}" style="flex:1">
                <input type="color" class="swap-tribe-color" value="${colors[i % 5]}">
            </div>`;
        }
        swapInputsContainer.innerHTML = h;
    }

    function executeSwap() {
        if (!currentSeason) return;
        const names = document.querySelectorAll('.swap-tribe-name');
        const colors = document.querySelectorAll('.swap-tribe-color');
        if (names.length === 0 || colors.length === 0) return;

        const newTribes = [];
        names.forEach((n, i) => { newTribes.push({ id: Date.now() + i, name: n.value?.trim() || `New Tribe ${i + 1}`, color: colors[i]?.value || '#888' }); });

        const ep = currentSeason.currentEpisode;
        if (!currentSeason.toolsData) currentSeason.toolsData = {};
        if (!currentSeason.toolsData.tribeStructureHistory) currentSeason.toolsData.tribeStructureHistory = {};
        currentSeason.toolsData.tribeStructureHistory[ep] = newTribes;

        const randomAssign = swapRandomAssignChk && swapRandomAssignChk.checked;
        const activePlayers = currentSeason.players.filter(p => !p.eliminated);

        if (randomAssign && activePlayers.length > 0 && newTribes.length > 0) {
            const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
            shuffled.forEach((p, i) => {
                const tribeIdx = i % newTribes.length;
                p.tribeHistory[ep] = newTribes[tribeIdx].id;
            });
        } else {
            currentSeason.players.forEach(p => p.tribeHistory[ep] = null);
        }

        saveData();
        swapModal.style.display = 'none';
        renderOverview();
    }

    window.smufferExecuteSwap = executeSwap;

    function executeMerge() {
        const name = mergeName.value?.trim() || 'Merged';
        const color = mergeColor.value;
        const mergeTribe = { id: Date.now(), name: name, color: color };
        const ep = currentSeason.currentEpisode;
        currentSeason.toolsData.tribeStructureHistory[ep] = [mergeTribe];
        currentSeason.players.forEach(p => { if (!p.eliminated) p.tribeHistory[ep] = mergeTribe.id; });
        saveData();
        mergeModal.style.display = 'none';
        renderOverview();
    }

    // Split modal
    function openSplitModal() {
        const active = currentSeason.players.filter(p => !p.eliminated).sort((a, b) => a.name.localeCompare(b.name));
        const sel = currentSeason.toolsData.tribal[currentSeason.currentEpisode].splitSelection || [];
        splitSelectionList.innerHTML = active.map(p => `<label><input type="checkbox" value="${p.id}" ${sel.includes(p.id) ? 'checked' : ''} class="split-chk"> ${p.name}</label>`).join('');
        splitModal.style.display = 'flex';
        confirmSplitBtn.onclick = function() {
            const checks = Array.from(document.querySelectorAll('.split-chk:checked')).map(c => parseInt(c.value));
            currentSeason.toolsData.tribal[currentSeason.currentEpisode].splitSelection = checks;
            closeModal('splitModal');
            renderTribal();
        };
    }

    // --------------------------------------------------------------
    // CHANGE EPISODE
    // --------------------------------------------------------------
    function changeEpisode(delta) {
        const oldEp = currentSeason.currentEpisode;
        const newEp = oldEp + delta;
        if (newEp < 1) return;
        if (delta > 0) {
            if (!checkTribalCompletion(oldEp)) {
                alert("Complete Tribal first!");
                switchTab('tribal');
                return;
            }
            consumeVotedAdvantages(oldEp);
            currentSeason.players.forEach(p => {
                if (p.tribeHistory[newEp] === undefined) p.tribeHistory[newEp] = p.tribeHistory[oldEp];
                if (p.advHistory[newEp] === undefined) p.advHistory[newEp] = JSON.parse(JSON.stringify(p.advHistory[oldEp]));
            });
            if (!currentSeason.toolsData.allianceHistory[newEp]) {
                currentSeason.toolsData.allianceHistory[newEp] = JSON.parse(JSON.stringify(currentSeason.toolsData.allianceHistory[oldEp]));
            }
            if (!currentSeason.toolsData.tribeStructureHistory[newEp]) {
                currentSeason.toolsData.tribeStructureHistory[newEp] = JSON.parse(JSON.stringify(getEpTribesList(oldEp)));
            }
        }
        currentSeason.currentEpisode = newEp;
        recalcGameState();
        saveData();
        renderUI();
    }

    // --------------------------------------------------------------
    // INIT
    // --------------------------------------------------------------
    function init() {
        const saved = localStorage.getItem('smufferSeason');
        if (saved) {
            try {
                currentSeason = JSON.parse(saved);
                migrateHistory();
                recalcGameState();
                renderUI();
            } catch (e) {
                currentSeason = null;
                renderEmptyState();
            }
        } else {
            renderEmptyState();
        }
    }

    init();
});