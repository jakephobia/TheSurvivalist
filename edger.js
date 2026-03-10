document.addEventListener('DOMContentLoaded', function() {
    // ------------------- VARIABILI GLOBALI --------------------
    let ep = 0;
    let curCell = null;
    let s = { r: '', t: '', v: '1' };
    let currentToneStyle = 'solid';

    const edgicColors = {
        'INV': '#cfd8dc',
        'UTR1': '#b8d850', 'UTR2': '#9cce56', 'UTR3': '#81c45c', 'UTR4': '#66ba63', 'UTR5': '#4ab069',
        'MOR1': '#fdfd9e', 'MOR2': '#fef482', 'MOR3': '#feec66', 'MOR4': '#fee34b', 'MOR5': '#ffda2f',
        'CP1': '#a1fffa',  'CP2': '#8ee6fb',  'CP3': '#7accfc',  'CP4': '#66b2fe',  'CP5': '#5399ff',
        'OTT1': '#ffa8f7', 'OTT2': '#f398f9', 'OTT3': '#e888fb', 'OTT4': '#dc79fd', 'OTT5': '#d069ff'
    };

    // ------------------- DOM ELEMENTI -------------------------
    const seasonNameInput = document.getElementById('seasonName');
    const toneStyleSelect = document.getElementById('toneStyleSelect');
    const batchInInput = document.getElementById('batchIn');
    const fileInput = document.getElementById('fileIn');
    const castFileIn = document.getElementById('castFileIn');
    const importCastBtn = document.getElementById('importCastBtn');
    const exportCastBtn = document.getElementById('exportCastBtn');
    const exportBtn = document.getElementById('exportBtn');
    const loadBtn = document.getElementById('loadBtn');
    const addBatchBtn = document.getElementById('addBatchBtn');
    const addEpBtn = document.getElementById('addEpBtn');
    const generateBtn = document.getElementById('generateBtn');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const visRange = document.getElementById('visRange');
    const visVal = document.getElementById('visVal');
    const hdCanvas = document.getElementById('hd-canvas');
    const hdTitleTarget = document.getElementById('hd-title-target');
    const hdTableInner = document.getElementById('hd-table-inner');

    // ------------------- EVENT LISTENERS ----------------------
    var edgerResetBtn = document.getElementById('edger-reset');
    if (edgerResetBtn) {
        edgerResetBtn.addEventListener('click', function() {
            if (!confirm('Reset everything? Tool will return to default state.')) return;
            document.getElementById('headRow').innerHTML = '<th class="edger-sticky-player">PLAYER</th>';
            document.getElementById('bodyRow').innerHTML = '';
            document.getElementById('colGroup').innerHTML = '<col class="edger-col-player">';
            ep = 0;
            addEp();
            addBatch('');
        });
    }
    exportBtn.addEventListener('click', exportData);
    loadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importData);
    importCastBtn.addEventListener('click', () => castFileIn.click());
    castFileIn.addEventListener('change', function(e) {
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
            const names = window.CastShared.forEdger(parsed.data);
            document.getElementById('bodyRow').innerHTML = '';
            addBatch(names.join(', '));
            if (parsed.data.seasonName) seasonNameInput.value = parsed.data.seasonName;
            e.target.value = '';
        };
        r.readAsText(file);
    });

    exportCastBtn.addEventListener('click', function() {
        const names = [];
        document.querySelectorAll('#bodyRow tr').forEach(tr => {
            const inp = tr.querySelector('input');
            if (inp && inp.value.trim()) names.push(inp.value.trim());
        });
        if (names.length === 0) { alert('No players to export.'); return; }
        const data = window.CastShared.createUnifiedCast({
            players: names.map(n => ({ nome: n })),
            tribes: [],
            seasonName: seasonNameInput.value || ''
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = window.getCastFilename ? window.getCastFilename() : 'cast_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });
    toneStyleSelect.addEventListener('change', changeToneStyle);
    addBatchBtn.addEventListener('click', addBatch);
    addEpBtn.addEventListener('click', addEp);
    generateBtn.addEventListener('click', makeHD);

    // MODAL - rating buttons
    document.querySelectorAll('.edger-opt-btn[data-v]').forEach(btn => {
        btn.addEventListener('click', function() {
            setR(this.dataset.v);
        });
    });
    // MODAL - tone buttons
    document.getElementById('btnTN').addEventListener('click', () => setT('N'));
    document.getElementById('btnTM').addEventListener('click', () => setT('M'));
    document.getElementById('btnTP').addEventListener('click', () => setT('P'));
    // MODAL - visibility range
    visRange.addEventListener('input', updVis);
    // MODAL - reset / confirm
    document.querySelector('.edger-btn-reset').addEventListener('click', wipe);
    document.querySelector('.edger-btn-confirm').addEventListener('click', save);

    // Close preview
    document.getElementById('closePreviewBtn').addEventListener('click', function() {
        document.getElementById('preview-area').classList.add('hidden');
    });
    // Close modal on outside click (optional)
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    // Event delegation for cells (dynamically created)
    document.getElementById('bodyRow').addEventListener('click', function(e) {
        const cell = e.target.closest('td.edger-cell');
        if (cell) edit(cell);
        const mBtn = e.target.closest('.edger-m-btn');
        if (mBtn) {
            const dir = parseInt(mBtn.dataset.dir);
            moveRow(mBtn, dir);
        }
        const delBtn = e.target.closest('.edger-del-btn');
        if (delBtn) delBtn.closest('tr').remove();
    });

    // ------------------- INIZIALIZZAZIONE --------------------
    addEp();
    addBatch("");

    // ------------------- FUNZIONI ----------------------------
    function addEp() {
        ep++;
        let col = document.createElement('col');
        col.className = 'edger-col-ep';
        document.getElementById('colGroup').appendChild(col);

        let th = document.createElement('th');
        let wrap = document.createElement('div');
        wrap.className = 'edger-th-content-ep';
        let del = document.createElement('span');
        del.innerText = '×';
        del.className = 'edger-del-btn-ep';
        del.onclick = () => deleteEp(th);
        let lbl = document.createElement('span');
        lbl.className = 'ep-label';
        lbl.innerText = 'E' + ep;
        wrap.appendChild(del);
        wrap.appendChild(lbl);
        th.appendChild(wrap);
        document.getElementById('headRow').appendChild(th);

        document.querySelectorAll('#bodyRow tr').forEach(tr => mkCell(tr, ep));
    }

    function deleteEp(th) {
        let headers = Array.from(document.getElementById('headRow').children);
        let colIndex = headers.indexOf(th);
        th.remove();
        document.getElementById('colGroup').children[colIndex].remove();
        document.querySelectorAll('#bodyRow tr').forEach(tr => {
            if (tr.children[colIndex]) tr.children[colIndex].remove();
        });
        ep--;
        let remainingHeaders = document.getElementById('headRow').children;
        for (let i = 1; i < remainingHeaders.length; i++) {
            remainingHeaders[i].querySelector('.ep-label').innerText = 'E' + i;
        }
    }

    function moveRow(btn, dir) {
        const tr = btn.closest('tr');
        if (dir === -1 && tr.previousElementSibling) {
            tr.parentNode.insertBefore(tr, tr.previousElementSibling);
        } else if (dir === 1 && tr.nextElementSibling) {
            tr.parentNode.insertBefore(tr.nextElementSibling, tr);
        }
    }

    function createPlayerHeader(name) {
        let th = document.createElement('th');
        th.className = 'edger-sticky-player';
        let wrap = document.createElement('div');
        wrap.className = 'edger-th-content';
        let mBox = document.createElement('div');
        mBox.className = 'edger-move-btns';
        mBox.innerHTML = `<span class="edger-m-btn" data-dir="-1">▲</span><span class="edger-m-btn" data-dir="1">▼</span>`;
        let del = document.createElement('span');
        del.innerText = '×';
        del.className = 'edger-del-btn';
        let inp = document.createElement('input');
        inp.value = name;
        wrap.appendChild(mBox);
        wrap.appendChild(del);
        wrap.appendChild(inp);
        th.appendChild(wrap);
        return th;
    }

    function addBatch(txt) {
        let val = txt || batchInInput.value;
        if (!val) return;
        val.split(',').forEach(n => {
            if (!n.trim()) return;
            let tr = document.createElement('tr');
            tr.appendChild(createPlayerHeader(n.trim()));
            for (let i = 1; i <= ep; i++) mkCell(tr, i);
            document.getElementById('bodyRow').appendChild(tr);
        });
        if (!txt) batchInInput.value = '';
    }

    function mkCell(tr, i, data) {
        let td = document.createElement('td');
        td.className = 'edger-cell';
        td.dataset.ep = i;
        tr.appendChild(td);
        if (data) applyCellData(td, data);
    }

    function edit(td) {
        curCell = td;
        let name = td.parentElement.querySelector('input').value;
        modalTitle.innerText = `${name} / EP ${td.dataset.ep}`;
        s = {
            r: td.dataset.r || '',
            t: td.dataset.t || '',
            v: td.dataset.v || '1'
        };
        updUI();
        modal.classList.add('open');
    }

    function updUI() {
        document.querySelectorAll('.edger-opt-btn[data-v]').forEach(b => b.classList.toggle('sel', b.dataset.v === s.r));
        ['N', 'M', 'P'].forEach(x => document.getElementById('btnT' + x).classList.toggle('sel', s.t === x));
        visRange.value = s.v;
        visVal.innerText = s.v;
    }

    function setR(x) {
        s.r = x;
        updUI();
    }

    function setT(x) {
        s.t = (s.t === x) ? '' : x;
        updUI();
    }

    function updVis() {
        s.v = visRange.value;
        visVal.innerText = s.v;
    }

    function wipe() {
        if (curCell) {
            curCell.innerText = '';
            curCell.style.background = 'transparent';
            delete curCell.dataset.r;
            delete curCell.dataset.t;
            delete curCell.dataset.v;
        }
        closeModal();
    }

    function save() {
        if (curCell && s.r) applyCellData(curCell, s);
        closeModal();
    }

    function closeModal() {
        modal.classList.remove('open');
    }

    function changeToneStyle() {
        currentToneStyle = toneStyleSelect.value;
        document.querySelectorAll('td.edger-cell').forEach(td => {
            if (td.dataset.r) {
                applyCellData(td, { r: td.dataset.r, t: td.dataset.t, v: td.dataset.v });
            }
        });
    }

    function applyCellData(cell, d) {
        let txt = d.r;
        if (d.r !== 'INV') txt += d.t + d.v;
        cell.innerText = txt;

        let colorKey = d.r;
        if (d.r !== 'INV') colorKey += d.v;
        let base = edgicColors[colorKey] || '#cfd8dc';

        let tMap = { 'P': '#22c55e', 'N': '#ef4444', 'M': '#f97316' };
        let toneColor = tMap[d.t];
        if (d.r === 'INV') toneColor = '#334151';

        if (toneColor) {
            if (currentToneStyle === 'solid') {
                cell.style.background = `linear-gradient(90deg, ${base} 88%, ${toneColor} 88%)`;
            } else {
                cell.style.background = `linear-gradient(90deg, ${base} 75%, ${toneColor} 100%)`;
            }
        } else {
            cell.style.background = base;
        }

        cell.dataset.r = d.r;
        cell.dataset.t = d.t;
        cell.dataset.v = d.v;
    }

    function exportData() {
        if (window.recordToolUsed) window.recordToolUsed('edger');
        let d = {
            ep: ep,
            season: seasonNameInput.value,
            p: []
        };
        document.querySelectorAll('#bodyRow tr').forEach(tr => {
            let cells = [];
            tr.querySelectorAll('td.edger-cell').forEach(td => cells.push({
                r: td.dataset.r,
                t: td.dataset.t,
                v: td.dataset.v
            }));
            d.p.push({ n: tr.querySelector('input').value, c: cells });
        });
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
        a.download = window.getSessionFilename ? window.getSessionFilename('Edger', seasonNameInput.value) : 'EDGER_Session_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        let r = new FileReader();
        r.onload = ev => {
            if (window.recordToolUsed) window.recordToolUsed('edger');
            let d = JSON.parse(ev.target.result);
            document.getElementById('headRow').innerHTML = '<th class="edger-sticky-player">PLAYER</th>';
            document.getElementById('bodyRow').innerHTML = '';
            document.getElementById('colGroup').innerHTML = '<col class="edger-col-player">';
            ep = 0;
            if (d.season) seasonNameInput.value = d.season;
            for (let i = 0; i < d.ep; i++) addEp();
            d.p.forEach(p => {
                let tr = document.createElement('tr');
                tr.appendChild(createPlayerHeader(p.n));
                p.c.forEach((c, idx) => mkCell(tr, idx + 1, c.r ? c : null));
                document.getElementById('bodyRow').appendChild(tr);
            });
        };
        r.readAsText(file);
    }

    function makeHD() {
        if (window.recordToolUsed) window.recordToolUsed('edger');
        hdTitleTarget.innerText = seasonNameInput.value || "SEASON PROGRESS";
        hdTableInner.innerHTML = '';
        let trH = document.createElement('tr');
        trH.innerHTML = '<th>CONTESTANT</th>';
        for (let i = 1; i <= ep; i++) {
            trH.innerHTML += `<th>E${i}</th>`;
        }
        hdTableInner.appendChild(trH);

        let rowData = Array.from(document.querySelectorAll('#bodyRow tr')).map((tr, i) => {
            let cells = Array.from(tr.querySelectorAll('td.edger-cell'));
            let filledCount = cells.filter(td => td.dataset.r && td.dataset.r !== '').length;
            let name = tr.querySelector('input').value;
            return { tr, name, filledCount, originalIndex: i };
        });

        rowData.sort((a, b) => {
            if (b.filledCount !== a.filledCount) return b.filledCount - a.filledCount;
            return a.originalIndex - b.originalIndex;
        });

        rowData.forEach(data => {
            let tr = document.createElement('tr');
            let tdN = document.createElement('td');
            tdN.innerText = data.name;
            tdN.className = "edger-hd-name-cell";
            tr.appendChild(tdN);
            data.tr.querySelectorAll('td.edger-cell').forEach(origTd => {
                let td = document.createElement('td');
                td.innerText = origTd.innerText;
                td.style.background = origTd.style.background;
                tr.appendChild(td);
            });
            hdTableInner.appendChild(tr);
        });

        hdCanvas.style.display = 'flex';
        html2canvas(hdCanvas, {
            scale: 1,
            backgroundColor: null,
            useCORS: true,
            windowWidth: 1920,
            height: hdCanvas.offsetHeight
        }).then(cvs => {
            hdCanvas.style.display = 'none';
            let url = cvs.toDataURL();
            document.getElementById('preview-img').src = url;
            document.getElementById('dl-link').href = url;
            document.getElementById('preview-area').classList.remove('hidden');
            document.getElementById('preview-area').scrollIntoView({ behavior: 'smooth' });
        });
    }
});