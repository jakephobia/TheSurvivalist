document.addEventListener('DOMContentLoaded', function() {
    /* ---------------- CONSTANTS & DATA ---------------- */
    const DEFAULT_COLORS = ['#ef5350', '#42a5f5', '#ffee58', '#66bb6a'];
    const DEFAULT_NAMES = ["Dakal", "Sele", "Yara", "Koru"];
    const FIRST_NAMES = ["Jack", "Jill", "Tom", "Sarah", "Mike", "Emily", "Chris", "Jessica", "David", "Ashley", "Rob", "Amber", "Parvati", "Sandra", "Tony", "Boston", "Tyson", "Kim", "Jeremy", "Natalie", "Michele", "Ben", "Denise", "Adam", "Sophie", "Nick", "Wendell", "Yul"];

    const ALLIANCE_NAMES = [
        "The Core", "Stealth R Us", "The Syndicate", "Iron Sharpens Iron", "The Outsiders", "Power Couple", "The Summit", "Chaos Theory",
        "The Trust", "Shield & Sword", "The Think Tank", "Viper Pit", "Island Gods", "Day One", "The Hive", "Wolf Pack", "Black Widow Brigade",
        "Three Amigos", "The Family", "Coconut Bandits", "Rice Police", "The Shelter People", "Top Dogs", "Underdogs", "Silent Assassins",
        "The Roundtable", "Witches Coven", "Stealth R Us 2.0", "The Merged", "Final Five", "Power Six", "The Exiles", "Beach Bums", 
        "The A-Team", "The Brains", "The Brawn", "The Beauty", "Golden Boys", "Spice Girls", "Dumb & Dumber", "Operation Delete", 
        "The Axis", "Revenge Squad", "Shadow Government", "The Jury Threats", "Goat Herders", "Palm Tree Gang", "Lagoon Squad",
        "The Noble Ones", "Chaos Krew", "The Breakfast Club", "Secret Spies", "Alpha Alliance", "Beta Blockers", "Charlie's Angels",
        "The Four Horsemen", "Million Dollar Club", "The Undercover Cops", "The Wizards", "Ocean's 11", "Jungle Cats", "The Snake Pit"
    ];

    const EVENTS_DB = [
        { txt: "caught a huge fish providing a feast!", type: "good", stat: "PHY", rel: 15, group: true },
        { txt: "started the fire without flint.", type: "good", stat: "PHY", rel: 12 },
        { txt: "comforted a tribemate who was crying.", type: "good", stat: "SOC", rel: 20 },
        { txt: "wove palm fronds into a comfortable mat.", type: "good", stat: "SOC", rel: 8 },
        { txt: "led the tribe in a meditation session.", type: "good", stat: "SOC", rel: 5, group: true },
        { txt: "found a grove of papaya trees!", type: "good", stat: "PHY", rel: 10, group: true },
        { txt: "won the respect of the tribe with work ethic.", type: "good", stat: "PHY", rel: 10 },
        { txt: "shared a hidden snack they smuggled in.", type: "good", stat: "SOC", rel: 15 },
        { txt: "fixed the leaking shelter roof.", type: "good", stat: "PHY", rel: 12, group: true },
        { txt: "spilled the rice pot! Disaster!", type: "bad", stat: "PHY", rel: -20 },
        { txt: "was caught sleeping while others worked.", type: "bad", stat: "PHY", rel: -15 },
        { txt: "got into a screaming match about chores.", type: "bad", stat: "SOC", rel: -25 },
        { txt: "annoyed everyone with loud snoring.", type: "bad", stat: "SOC", rel: -10, group: true },
        { txt: "lost the fishing spear in the ocean.", type: "bad", stat: "PHY", rel: -15 },
        { txt: "accused someone of having an Idol publicly.", type: "bad", stat: "STR", rel: -20 },
        { txt: "ate more than their fair share of rice.", type: "bad", stat: "SOC", rel: -15 },
        { txt: "tripped and extinguished the fire.", type: "bad", stat: "PHY", rel: -10 },
        { txt: "is isolating themselves from the group.", type: "bad", stat: "SOC", rel: -5 },
        { txt: "pulled someone aside to solidify a Final 2.", type: "strat", rel: 30 },
        { txt: "is searching for the Idol... suspiciously.", type: "strat", rel: -5 },
        { txt: "is throwing names out to target the strong.", type: "strat", rel: 5 },
        { txt: "found a clue to a secret advantage.", type: "strat", rel: 5 },
        { txt: "built a 'Spy Shack' to eavesdrop.", type: "strat", rel: 0 },
        { txt: "created a fake idol to trick others.", type: "strat", rel: 5 },
        { txt: "is trying to play both sides against the middle.", type: "strat", rel: -10 },
        { txt: "is analyzing the vote numbers constantly.", type: "strat", rel: 0 },
        { txt: "proposed a split vote plan.", type: "strat", rel: 10, group: true },
        { txt: "is struggling with the rain and cold.", type: "neutral", rel: 0 },
        { txt: "misses family back home.", type: "neutral", rel: 0 },
        { txt: "got stung by a jellyfish.", type: "neutral", rel: 0 },
        { txt: "saw a shark near the reef!", type: "neutral", rel: 0 },
        { txt: "is complaining about the bugs.", type: "neutral", rel: -2 },
        { txt: "found a weird looking rock (not an idol).", type: "neutral", rel: 0 },
        { txt: "is telling ghost stories around the fire.", type: "neutral", rel: 5, group: true },
        { txt: "invented a new game to pass time.", type: "neutral", rel: 5, group: true },
        { txt: "suffered a minor cut while chopping wood.", type: "neutral", rel: 0 },
        { txt: "threw the challenge to target someone!", type: "bad", stat: "LOY", rel: -30 },
        { txt: "revealed a secret alliance to the whole tribe.", type: "bad", stat: "LOY", rel: -25 },
        { txt: "gave up their reward to boost morale.", type: "good", stat: "SOC", rel: 25 },
        { txt: "blamed someone else for the missing machete.", type: "bad", stat: "SOC", rel: -15 },
        { txt: "is bonding over shared life experiences.", type: "good", stat: "SOC", rel: 18 },
        { txt: "was caught searching through someone's bag!", type: "bad", stat: "STR", rel: -40 },
        { txt: "successfully hunted a wild chicken.", type: "good", stat: "PHY", rel: 20 },
        { txt: "got sick from drinking unboiled water.", type: "bad", stat: "PHY", rel: -5 },
        { txt: "orchestrated a blindside plan perfectly.", type: "strat", rel: 15 },
        { txt: "is getting paranoid and confronting allies.", type: "bad", stat: "TMP", rel: -20 },
        { txt: "found extra coconuts and shared them.", type: "good", stat: "SOC", rel: 10, group: true },
        { txt: "is sleeping close to the fire to stay warm.", type: "neutral", rel: 2 },
        { txt: "made a fake immunity idol from shells.", type: "strat", rel: 5 },
        { txt: "is teaching the tribe yoga on the beach.", type: "good", stat: "SOC", rel: 8, group: true },
        { txt: "got into a heated argument about rice portions.", type: "bad", stat: "SOC", rel: -20 },
        { txt: "accidentally burned a hole in the shelter roof.", type: "bad", stat: "PHY", rel: -10 },
        { txt: "found a hidden advantage menu.", type: "strat", rel: 5 },
        { txt: "is plotting to vote out their closest ally.", type: "strat", rel: -10 },
        { txt: "saved the fire during a torrential downpour.", type: "good", stat: "PHY", rel: 25 },
        { txt: "is eavesdropping on conversations at the water well.", type: "strat", rel: 0 },
        { txt: "shared a heartfelt story about their kids.", type: "good", stat: "SOC", rel: 15 },
        { txt: "is openly searching for idols in front of everyone.", type: "bad", stat: "STR", rel: -5 },
        { txt: "caught a clam but ate it alone.", type: "bad", stat: "SOC", rel: -15 },
        { txt: "is trying to mediate a conflict between tribemates.", type: "good", stat: "SOC", rel: 12 },
        { txt: "hurt their ankle but is pushing through.", type: "neutral", rel: 5 },
        { txt: "is complaining about the lack of sleep.", type: "bad", stat: "TMP", rel: -5 },
        { txt: "constructed a swing for the tribe.", type: "good", stat: "SOC", rel: 10 },
        { txt: "is calculating jury votes already.", type: "strat", rel: 0 },
        { txt: "called a tribe meeting to air grievances.", type: "bad", stat: "SOC", rel: -10, group: true },
        { txt: "woke up everyone in the middle of the night screaming.", type: "bad", stat: "TMP", rel: -25 },
        { txt: "found a lemon tree and made lemonade for everyone.", type: "good", stat: "SOC", rel: 20 },
        { txt: "forgot to bring the fishing gear back from the reef.", type: "bad", stat: "PHY", rel: -15 },
        { txt: "is sunbathing while the fire is dying out.", type: "bad", stat: "PHY", rel: -10 },
        { txt: "shared secret intel from the other tribe.", type: "strat", rel: 15 },
        { txt: "organized a talent show to lift spirits.", type: "good", stat: "SOC", rel: 15, group: true },
        { txt: "accidentally insulted a jury member's profession.", type: "bad", stat: "SOC", rel: -10 },
        { txt: "made a spear that actually works.", type: "good", stat: "PHY", rel: 10 },
        { txt: "is suspected of hiding the flint.", type: "bad", stat: "SOC", rel: -30 },
        { txt: "gave up their spot on the reward trip.", type: "good", stat: "SOC", rel: 30 }
    ];

    /* ---------------- STATE ---------------- */
    let players = [];
    let tribes = [];
    let alliances = [];
    let currentEpisode = 1;
    let episodeEventsCount = 0;
    let eventsTarget = 6;
    let isMerged = false;
    let globalIdolsFound = 0;
    let settings = {};
    let historyLog = [];
    let swapSchedule = [];
    let currentSort = { key: 'name', dir: 'asc' };
    let allianceSortDir = 'desc';
    let gameMode = "EVENT";
    let bootOrder = 0;
    let medevacCount = 0;

    /* ---------------- DOM ELEMENTS ---------------- */
    const setupPhase = document.getElementById('setup-phase');
    const gamePhase = document.getElementById('game-phase');
    const seasonName = document.getElementById('season-name');
    const numPlayers = document.getElementById('num-players');
    const numTribes = document.getElementById('num-tribes');
    const mergeAt = document.getElementById('merge-at');
    const numSwaps = document.getElementById('num-swaps');
    const mergeName = document.getElementById('merge-name');
    const mergeColor = document.getElementById('merge-color');
    const tribeConfigArea = document.getElementById('tribe-config-area');
    const generateCastBtn = document.getElementById('generateCastBtn');
    const resumeGameBtn = document.getElementById('btn-resume-game');
    const castEditor = document.getElementById('cast-editor');
    const castContainer = document.getElementById('cast-container');
    const startGameBtn = document.getElementById('startGameBtn');
    const castImportFile = document.getElementById('cast-import-file');
    const importCastBtn = document.getElementById('importCastBtn');
    const exportCastBtn = document.getElementById('exportCastBtn');
    const toggleStatLegendBtn = document.getElementById('toggleStatLegendBtn');
    const statLegend = document.getElementById('stat-legend');
    const randomizeAllBtn = document.getElementById('randomizeAllBtn');
    const fillRandomNamesBtn = document.getElementById('fillRandomNamesBtn');
    const balanceTribesBtn = document.getElementById('balanceTribesBtn');
    const importSeasonBtn = document.getElementById('importSeasonBtn');
    const exportSeasonBtn = document.getElementById('exportSeasonBtn');
    const importFile = document.getElementById('import-file');
    const navPrev = document.getElementById('navEpisodePrev');
    const navNext = document.getElementById('navEpisodeNext');
    const epDisplay = document.getElementById('ep-display');
    const btnSimEp = document.getElementById('btn-sim-ep');
    const btnMainAction = document.getElementById('btn-main-action');
    const tribalSection = document.getElementById('tribal-section');
    const tribalBody = document.getElementById('tribal-body');
    const btnReadVote = document.getElementById('btn-read-vote');
    const btnEndTribal = document.getElementById('btn-end-tribal');
    const btnCloseTribalView = document.getElementById('btn-close-tribal-view');
    const finaleSection = document.getElementById('finale-section');
    const btnReadWinner = document.getElementById('btn-read-winner');
    const winnerReveal = document.getElementById('winner-reveal');
    const winnerName = document.getElementById('winner-name');
    const finaleRecap = document.getElementById('finale-recap');
    const juryListRecap = document.getElementById('jury-list-recap');
    const advantageList = document.getElementById('advantage-list');
    const allianceList = document.getElementById('alliance-list');
    const inactiveAllianceList = document.getElementById('inactive-alliance-list');
    const pastAllianceList = document.getElementById('past-alliance-list');
    const sortAlliances = document.getElementById('sortAlliances');
    const playerStatsTableBody = document.getElementById('player-stats-table-body');
    const heatmapContainer = document.getElementById('heatmap-container');
    const votingHead = document.getElementById('voting-head');
    const votingBody = document.getElementById('voting-body');
    const gameStageText = document.getElementById('game-stage-text');
    const headerSeasonName = document.getElementById('header-season-name');
    const remainingCount = document.getElementById('remaining-count');
    const narrativeLog = document.getElementById('narrative-log');
    const tribalLog = document.getElementById('tribal-log');
    const voteRevealArea = document.getElementById('vote-reveal-area');
    const finalistsDisplay = document.getElementById('finalists-display');
    const juryReadArea = document.getElementById('jury-read-area');

    /* ---------------- UTILITIES ---------------- */
    function updateMainButton() {
        if (gameMode === "EVENT") {
            btnMainAction.innerHTML = '<i class="fas fa-step-forward"></i> Next Event';
            btnMainAction.className = "btn btn-primary btn-block btn-lg";
        } else if (gameMode === "TRIBAL_READY") {
            btnMainAction.innerHTML = '<i class="fas fa-skull-crossbones"></i> Go to Tribal Council';
            btnMainAction.className = "btn btn-danger btn-block btn-lg";
        } else if (gameMode === "MEDEVAC_RESET") {
            btnMainAction.innerHTML = '<i class="fas fa-forward"></i> Proceed to Next Episode (Medevac)';
            btnMainAction.className = "btn btn-medevac btn-block btn-lg";
        }
    }

    /* ========================================================================
       EPISODE HISTORY: IMMUTABLE (read-only for past episodes)
       ========================================================================
       - When proceeding to the next episode (endTribal / next episode), everything
         from the previous episode is saved to historyLog and becomes IMMUTABLE.
       - Past episodes are READ-ONLY: narrative, tribal, voting history are fixed
         and never rewritten.
       - Only the current episode (currentEpisode) can be updated (saveSnapshot).
       - In navEpisode(), if target !== currentEpisode we are in "read mode":
         only the saved snapshot is used, never modified.
       ======================================================================== */

    window.sim = {
        immunityWinner: null,
        tribalTargetTribe: null,
        votesToRead: [],
        jury: [],
        pendingBoot: null,
        viewingEpisode: 1,
        tribalStage: 'initial',
        tiedPlayers: [],
        finaleVotes: [],
        tribalLogLines: [],
        tribalVotesRevealed: [],
        /** true after first "Read First Vote" (calculateVotes run). Lazy tribal: no calculation until first click. */
        tribalVotesCalculated: false,
        /** true when deadlock has already been resolved (fire/rocks executed). Prevents loop. */
        deadlockResolved: false,

        /** Save only the CURRENT episode state. Never touches past episodes (immutable). */
        saveSnapshot: function() {
            const existingIdx = historyLog.findIndex(h => h.episode === currentEpisode);
            let tribalData = null;
            if (gameMode === 'TRIBAL' && (this.tribalLogLines.length > 0 || this.tribalVotesRevealed.length > 0)) {
                tribalData = {
                    logLines: this.tribalLogLines.slice(),
                    votesRevealed: this.tribalVotesRevealed.slice(),
                    eliminated: this.pendingBoot ? this.pendingBoot.name : null
                };
            } else if (existingIdx >= 0 && historyLog[existingIdx].tribalData) {
                tribalData = historyLog[existingIdx].tribalData;
            }
            const snap = {
                episode: currentEpisode,
                players: JSON.parse(JSON.stringify(players)),
                tribes: JSON.parse(JSON.stringify(tribes)),
                alliances: JSON.parse(JSON.stringify(alliances)),
                narrative: narrativeLog.innerHTML,
                tribalData: tribalData,
                stage: isMerged ? "Merge" : "Pre-Merge",
                immunityWinner: this.immunityWinner,
                tribalTargetTribe: this.tribalTargetTribe
            };
            if (existingIdx >= 0) historyLog[existingIdx] = snap;
            else historyLog.push(snap);
            this.saveLocal();
        },

        buildTribalHtmlFromData: function(tribalData) {
            if (!tribalData || (!tribalData.logLines.length && !tribalData.votesRevealed.length && !tribalData.eliminated)) return '';
            let logHtml = tribalData.logLines.map(function(line) {
                return '<div style="padding:4px 0"><i class="fas fa-caret-right"></i> ' + (line || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
            }).join('');
            let revealHtml = '';
            if (tribalData.eliminated) {
                revealHtml = '<h2 style="color:var(--error); font-size:3em;">' + (tribalData.eliminated || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h2><p>The tribe has spoken.</p>';
            }
            return '<div id="tribal-log" class="simoa-tribal-log">' + logHtml + '</div>' +
                '<div id="vote-reveal-area" class="simoa-vote-area">' + revealHtml + '</div>';
        },

        saveLocal: function() {
            this.jury = [...new Set(this.jury)];
            const fullState = {
                players, tribes, alliances, currentEpisode, episodeEventsCount,
                eventsTarget, isMerged, globalIdolsFound, settings, historyLog,
                swapSchedule, gameMode,
                narrativeHTML: narrativeLog.innerHTML,
                tribalHTML: tribalBody.innerHTML,
                tribalStage: this.tribalStage,
                tiedPlayers: this.tiedPlayers,
                votesToRead: this.votesToRead,
                pendingBoot: this.pendingBoot,
                bootOrder: bootOrder,
                medevacCount: medevacCount,
                jury: this.jury,
                tribalVotesCalculated: this.tribalVotesCalculated,
                tribalLogLines: (this.tribalLogLines || []).slice(),
                tribalVotesRevealed: (this.tribalVotesRevealed || []).slice(),
                deadlockResolved: this.deadlockResolved
            };
            localStorage.setItem('survivor_save', JSON.stringify(fullState));
        },

        loadLocal: function() {
            const data = localStorage.getItem('survivor_save');
            if (!data) return;
            const s = JSON.parse(data);
            players = s.players || [];
            tribes = s.tribes || [];
            alliances = s.alliances || [];
            currentEpisode = s.currentEpisode || 1;
            episodeEventsCount = s.episodeEventsCount || 0;
            eventsTarget = s.eventsTarget || 6;
            isMerged = s.isMerged || false;
            globalIdolsFound = s.globalIdolsFound || 0;
            settings = s.settings || {};
            historyLog = Array.isArray(s.historyLog) ? s.historyLog : [];
            swapSchedule = Array.isArray(s.swapSchedule) ? s.swapSchedule : [];
            gameMode = s.gameMode || 'EVENT';
            bootOrder = s.bootOrder || 0;
            medevacCount = s.medevacCount || 0;
            this.tribalStage = s.tribalStage || 'initial';
            this.tiedPlayers = Array.isArray(s.tiedPlayers) ? s.tiedPlayers : [];
            this.votesToRead = Array.isArray(s.votesToRead) ? s.votesToRead : [];
            this.pendingBoot = s.pendingBoot || null;
            this.jury = s.jury ? [...new Set(s.jury)] : [];
            this.tribalVotesCalculated = s.tribalVotesCalculated === true;
            this.tribalLogLines = Array.isArray(s.tribalLogLines) ? s.tribalLogLines.slice() : [];
            this.tribalVotesRevealed = Array.isArray(s.tribalVotesRevealed) ? s.tribalVotesRevealed.slice() : [];
            this.deadlockResolved = s.deadlockResolved === true;

            headerSeasonName.innerText = settings.seasonName || "Season in Progress";
            narrativeLog.innerHTML = s.narrativeHTML || '';

            if (gameMode === 'TRIBAL') {
                const tribalData = {
                    logLines: this.tribalLogLines.slice(),
                    votesRevealed: this.tribalVotesRevealed.slice(),
                    eliminated: this.pendingBoot ? this.pendingBoot.name : null
                };
                let built = this.buildTribalHtmlFromData(tribalData);
                tribalBody.innerHTML = built || (s.tribalHTML || '');
                const endBtn = document.getElementById('btn-end-tribal');
                if (endBtn) {
                    endBtn.classList.remove('hidden');
                    endBtn.textContent = 'Leave Tribal';
                }
                const readBtn = document.getElementById('btn-read-vote');
                if (readBtn) {
                    readBtn.classList.remove('hidden');
                    readBtn.innerText = this.votesToRead.length > 0 ? 'Show Next Vote' : 'Reveal Decision';
                }
                tribalSection.classList.remove('hidden');
            } else {
                tribalBody.innerHTML = '';
            }

            setupPhase.classList.add('hidden');
            gamePhase.classList.remove('hidden');
            this.updateUI();
            updateMainButton();
            this.viewingEpisode = currentEpisode;
            this.navEpisode(0);
            alert("Game Resumed!");
        },

        /**
         * Episode navigation. If target !== currentEpisode we are in READ-ONLY mode:
         * the episode snapshot is immutable, used only to display narrative and tribal.
         */
        navEpisode: function(dir) {
            const target = this.viewingEpisode + dir;
            const maxEp = historyLog.length > 0 ? historyLog[historyLog.length - 1].episode : 1;
            if (target < 1 || target > maxEp) return;
            this.viewingEpisode = target;
            epDisplay.innerText = `Ep ${this.viewingEpisode}`;
            const snap = historyLog.find(h => h.episode === target);
            if (!snap) return;

            narrativeLog.innerHTML = snap.narrative;

            if (target !== currentEpisode) {
                /* --- PAST EPISODE: read-only, immutable snapshot --- */
                const tribalHtml = snap.tribalData
                    ? this.buildTribalHtmlFromData(snap.tribalData)
                    : (snap.tribalHtml || '');
                if (tribalHtml) {
                    tribalSection.classList.remove('hidden');
                    tribalBody.innerHTML = tribalHtml;
                    const endTribalBtn = document.getElementById('btn-end-tribal');
                    const readVoteBtn = document.getElementById('btn-read-vote');
                    if (endTribalBtn) {
                        endTribalBtn.classList.remove('hidden');
                        endTribalBtn.textContent = 'Close tribal view';
                    }
                    if (readVoteBtn) readVoteBtn.classList.add('hidden');
                    if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
                } else {
                    tribalSection.classList.add('hidden');
                    if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
                }
                this.updateUI();
                return;
            }

            /* --- CURRENT EPISODE: tribal visible only when in TRIBAL mode --- */
            if (gameMode === 'TRIBAL') {
                tribalSection.classList.remove('hidden');
                const endTribalBtn = document.getElementById('btn-end-tribal');
                const readVoteBtn = document.getElementById('btn-read-vote');
                if (endTribalBtn) {
                    endTribalBtn.classList.remove('hidden');
                    endTribalBtn.textContent = 'Leave Tribal';
                }
                if (readVoteBtn) readVoteBtn.classList.remove('hidden');
                if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
            } else {
                tribalSection.classList.add('hidden');
                if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
            }
            this.updateUI();
        },

        importSeason: function(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid Format");
                    historyLog = data;
                    const lastState = data[data.length - 1];
                    players = lastState.players;
                    tribes = lastState.tribes;
                    alliances = lastState.alliances;
                    currentEpisode = lastState.episode;
                    isMerged = (lastState.stage === "Merge");
                    setupPhase.classList.add('hidden');
                    gamePhase.classList.remove('hidden');
                    sim.viewingEpisode = 1;
                    sim.navEpisode(0);
                    sim.updateUI();
                    alert("Season Imported Successfully!");
                } catch (err) {
                    alert("Error importing file: " + err);
                }
            };
            reader.readAsText(file);
        },

        sortStats: function(key) {
            if (currentSort.key === key) {
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = key;
                currentSort.dir = 'asc';
            }
            this.updateUI();
        },

        toggleAllianceSort: function() {
            allianceSortDir = allianceSortDir === 'asc' ? 'desc' : 'asc';
            this.updateUI();
        },

        getSocialScore: function(player) {
            const active = this.getActivePlayers();
            let total = 0, count = 0;
            active.forEach(p => {
                if (p.id !== player.id) {
                    total += player.relationships[p.id] || 50;
                    count++;
                }
            });
            return count === 0 ? 0 : Math.round(total / count);
        },

        mainAction: function() {
            if (gameMode === "EVENT") {
                this.runNextEvent();
            } else if (gameMode === "TRIBAL_READY") {
                this.setupTribalUI();
            } else if (gameMode === "MEDEVAC_RESET") {
                this.endTribal();
            }
        },

        dailyUpdate: function() {
            alliances.forEach(a => {
                if (a.active) {
                    a.strength = Math.max(1, Math.min(10, a.strength + (Math.floor(Math.random() * 5) - 2)));
                }
            });
            const active = this.getActivePlayers();
            active.forEach(p1 => {
                active.forEach(p2 => {
                    if (p1.id !== p2.id) {
                        let drift = Math.floor(Math.random() * 11) - 5;
                        this.modifyRel(p1.id, p2.id, drift);
                    }
                });
            });
        },

        runNextEvent: function() {
            if (episodeEventsCount === 0) {
                if (swapSchedule.includes(currentEpisode) && !isMerged) {
                    this.performSwap();
                }
                this.dailyUpdate();
            }
            if (medevacCount < 2 && this.getActivePlayers().length > 5 && Math.random() < 0.002) {
                this.processMedevac();
                return;
            }
            if (episodeEventsCount >= eventsTarget) {
                if (this.immunityWinner === null) this.runImmunity();
                return;
            }
            episodeEventsCount++;
            const active = this.getActivePlayers();
            const p1 = active[Math.floor(Math.random() * active.length)];
            const candidates = active.filter(p => p.id !== p1.id && (isMerged || p.tribe === p1.tribe));
            if (!candidates.length) return;
            const p2 = candidates[Math.floor(Math.random() * candidates.length)];
            const p1Color = (isMerged || p1.tribe === 99) ? settings.mergeColor : tribes[p1.tribe].color;
            if (this.getActivePlayers().length > 4 && Math.random() < 0.02 + (p1.stats.STR * 0.005) && globalIdolsFound < 6) {
                p1.items.push("Idol");
                globalIdolsFound++;
                this.logEvent(`<strong>${p1.name}</strong> found a Hidden Immunity Idol!`, "fa-shield-alt", p1Color);
                this.saveSnapshot();
                this.updateUI();
                return;
            }
            const event = EVENTS_DB[Math.floor(Math.random() * EVENTS_DB.length)];
            if (event.rel !== 0) this.modifyRel(p1.id, p2.id, event.rel);
            let text = `<strong>${p1.name}</strong> ${event.txt}`;
            if (event.group) {
                let extras = candidates.filter(p => p.id !== p2.id).sort(() => 0.5 - Math.random()).slice(0, 2);
                if (extras.length > 0) {
                    text += ` (with ${p2.name} and ${extras.map(e => e.name).join(', ')})`;
                    extras.forEach(e => {
                        if (event.rel !== 0) this.modifyRel(p1.id, e.id, Math.floor(event.rel / 2));
                    });
                } else {
                    text += ` (with ${p2.name})`;
                }
            } else if (event.rel !== 0) {
                text += ` (with ${p2.name})`;
            }
            this.logEvent(text, event.type === 'good' ? 'fa-smile' : event.type === 'bad' ? 'fa-frown' : 'fa-chess-pawn', p1Color);
            this.checkAllianceFormation();
            this.saveSnapshot();
            this.updateUI();
            if (episodeEventsCount >= eventsTarget) {
                this.runImmunity();
            }
        },

        processMedevac: function() {
            const active = this.getActivePlayers();
            const victim = active[Math.floor(Math.random() * active.length)];
            medevacCount++;
            this.logEvent(`<strong>MEDEVAC!</strong> ${victim.name} has been medically evacuated from the game.`, "fa-ambulance", "var(--medevac)");
            this.logEvent(`Tribal Council is CANCELLED.`, "fa-ban", "#888");
            bootOrder++;
            victim.bootOrder = bootOrder;
            victim.status = "Eliminated";
            const remaining = this.getActivePlayers().length;
            if (remaining < 9) {
                victim.status = "Jury";
                if (!this.jury.includes(victim.id)) {
                    this.jury.push(victim.id);
                }
            }
            episodeEventsCount = eventsTarget;
            gameMode = "MEDEVAC_RESET";
            updateMainButton();
            this.saveSnapshot();
            this.updateUI();
        },

        performSwap: function() {
            this.logEvent("--- DROP YOUR BUFFS! TRIBE SWAP! ---", "fa-sync-alt", "#fff");
            const active = this.getActivePlayers();
            active.sort(() => Math.random() - 0.5);
            tribes.forEach(t => t.members = []);
            let tIndex = 0;
            active.forEach(p => {
                p.tribe = tIndex;
                tribes[tIndex].members.push(p.id);
                tIndex = (tIndex + 1) % tribes.length;
            });
            this.updateUI();
            this.saveSnapshot();
        },

        modifyRel: function(id1, id2, amount) {
            players[id1].relationships[id2] = Math.max(0, Math.min(100, players[id1].relationships[id2] + amount));
            players[id2].relationships[id1] = Math.max(0, Math.min(100, players[id2].relationships[id1] + amount));
        },

        checkAllianceFormation: function() {
            alliances.forEach(a => {
                if (!a.active) return;
                if (a.strength < 5) {
                    a.active = false;
                    this.logEvent(`Alliance Broken (Weak): ${a.name}`, "fa-unlink", "#888");
                    return;
                }
                let sum = 0, count = 0;
                for (let i = 0; i < a.members.length; i++) {
                    for (let j = i + 1; j < a.members.length; j++) {
                        let m1 = players[a.members[i]];
                        let m2 = players[a.members[j]];
                        if (m1.status === 'Active' && m2.status === 'Active') {
                            sum += m1.relationships[m2.id];
                            count++;
                        }
                    }
                }
                if (count > 0 && (sum / count) < 35) {
                    a.active = false;
                    this.logEvent(`Alliance Broken (Infighting): ${a.name}`, "fa-unlink", "#888");
                }
            });
            const active = this.getActivePlayers();
            let tribesInPlay = isMerged ? [99] : tribes.map(t => t.id);
            tribesInPlay.forEach(tId => {
                let tribeMembers = active.filter(p => p.tribe === tId);
                if (tribeMembers.length < 3) return;
                let starter = tribeMembers[Math.floor(Math.random() * tribeMembers.length)];
                let potentials = tribeMembers.filter(p => p.id !== starter.id && starter.relationships[p.id] > 60);
                let targetSize = Math.floor(Math.random() * (tribeMembers.length - 2)) + 2;
                if (potentials.length > 0) {
                    potentials.sort((a, b) => starter.relationships[b.id] - starter.relationships[a.id]);
                    let chosen = potentials.slice(0, targetSize - 1);
                    chosen.push(starter);
                    if (chosen.length >= 2) {
                        let chosenIds = chosen.map(p => p.id).sort().join(',');
                        let exists = alliances.some(a => a.members.slice().sort().join(',') === chosenIds);
                        if (!exists && Math.random() > 0.7) {
                            let possibleNames = ALLIANCE_NAMES.filter(n => !alliances.some(a => a.name === n));
                            let aName = possibleNames.length > 0 ? possibleNames[Math.floor(Math.random() * possibleNames.length)] : `Alliance #${alliances.length + 1}`;
                            alliances.push({ name: aName, members: chosen.map(p => p.id), strength: 6, active: true });
                            let aColor = (tId === 99 || isMerged) ? settings.mergeColor : tribes[tId].color;
                            this.logEvent(`Alliance Formed: ${aName} (${chosen.map(p => p.name).join(', ')})`, "fa-handshake", aColor);
                        }
                    }
                }
            });
        },

        runImmunity: function() {
            const active = this.getActivePlayers();
            if (!isMerged) {
                // Find min/max PHY range among active players for normalization
                const allPhy = active.map(p => p.stats.PHY || 5);
                const minPhy = Math.min(...allPhy);
                const maxPhy = Math.max(...allPhy);
                const phyRange = maxPhy - minPhy || 1; // Avoid division by zero
                
                let scores = tribes.map(t => {
                    let mems = active.filter(p => p.tribe === t.id);
                    if (mems.length === 0) return { id: t.id, score: -1 };
                    let avgPhy = mems.reduce((sum, p) => sum + (p.stats.PHY || 5), 0) / mems.length;
                    // Normalize stats to 0-100 scale
                    let normalizedStat = phyRange > 0 ? ((avgPhy - minPhy) / phyRange) * 100 : 50;
                    let statPart = normalizedStat;
                    let randPart = Math.random() * 100;
                    // 50% statistiche, 50% RNG
                    let finalScore = (statPart * 0.5) + (randPart * 0.5);
                    return { id: t.id, score: finalScore };
                });
                scores.sort((a, b) => b.score - a.score);
                let loser = scores[scores.length - 1];
                if (loser.score === -1) { }
                this.tribalTargetTribe = loser.id;
                this.immunityWinner = scores[0].id;
                this.logEvent(`${tribes[loser.id].name} loses Immunity!`, "fa-skull", tribes[loser.id].color);
            } else {
                // Find min/max PHY range among active players for normalization
                const allPhy = active.map(p => p.stats.PHY || 5);
                const minPhy = Math.min(...allPhy);
                const maxPhy = Math.max(...allPhy);
                const phyRange = maxPhy - minPhy || 1; // Avoid division by zero
                
                let scores = active.map(p => {
                    // Normalize stats to 0-100 scale
                    let normalizedStat = phyRange > 0 ? (((p.stats.PHY || 5) - minPhy) / phyRange) * 100 : 50;
                    let statPart = normalizedStat;
                    let randPart = Math.random() * 100;
                    // 50% statistiche, 50% RNG
                    return { p: p, score: (statPart * 0.5) + (randPart * 0.5) };
                });
                scores.sort((a, b) => b.score - a.score);
                let winner = scores[0].p;
                this.immunityWinner = winner.id;
                this.tribalTargetTribe = 99;
                this.logEvent(`${winner.name} wins Individual Immunity!`, "fa-necklace", "gold");
            }
            gameMode = "TRIBAL_READY";
            updateMainButton();
            this.saveSnapshot();
        },

        /** Show tribal UI without calculating votes (lazy). Votes are calculated on first "Read First Vote" click. */
        setupTribalUI: function() {
            gameMode = "TRIBAL";
            this.tribalStage = 'initial';
            this.tiedPlayers = [];
            this.pendingBoot = null;
            this.tribalLogLines = [];
            this.tribalVotesRevealed = [];
            this.votesToRead = [];
            this.tribalVotesCalculated = false;
            this.deadlockResolved = false;
            btnMainAction.classList.add('hidden');
            tribalSection.classList.remove('hidden');

            const revealEl = document.getElementById('vote-reveal-area') || voteRevealArea;
            const logEl = document.getElementById('tribal-log') || tribalLog;
            if (revealEl) revealEl.innerHTML = '<span style="color:#888; font-style:italic">Votes have been cast...</span>';
            if (logEl) logEl.innerHTML = '';

            const readBtn = document.getElementById('btn-read-vote') || btnReadVote;
            const endBtn = document.getElementById('btn-end-tribal') || btnEndTribal;
            if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
            if (readBtn) {
                readBtn.classList.remove('hidden');
                readBtn.disabled = false;
                readBtn.innerText = 'Show Next Vote';
                readBtn.onclick = null; // Remove any leftover handler
            }
            if (endBtn) {
                endBtn.classList.remove('hidden');
                endBtn.textContent = 'Leave Tribal';
                endBtn.disabled = false;
            }
        },

        getVoteTarget: function(voter, potentialTargets) {
            if (!potentialTargets || potentialTargets.length === 0) {
                return null;
            }
            let activeAlliance = alliances.find(a => a.active && a.members.includes(voter.id));
            let allianceTarget = null;
            if (activeAlliance) {
                let bestHateScore = 1000;
                potentialTargets.forEach(t => {
                    if (!activeAlliance.members.includes(t.id)) {
                        let totalRel = 0;
                        let count = 0;
                        activeAlliance.members.forEach(memId => {
                            let mem = players[memId];
                            if (mem.status === 'Active') {
                                totalRel += mem.relationships[t.id] || 50;
                                count++;
                            }
                        });
                        let avg = count > 0 ? totalRel / count : 50;
                        if (avg < bestHateScore) {
                            bestHateScore = avg;
                            allianceTarget = t;
                        }
                    }
                });
                let loyaltyCheck = Math.random() < (activeAlliance.strength / 10);
                if (allianceTarget && loyaltyCheck) {
                    return allianceTarget;
                }
            }
            let sorted = [...potentialTargets].sort((a, b) => (voter.relationships[a.id] || 50) - (voter.relationships[b.id] || 50));
            return sorted[0] || null;
        },

        calculateVotes: function() {
            let voters = [], targets = [];
            const active = this.getActivePlayers();
            if (this.tribalStage === 'initial') {
                if (!isMerged) {
                    voters = active.filter(p => p.tribe === this.tribalTargetTribe);
                    targets = [...voters];
                } else {
                    voters = active;
                    targets = active.filter(p => p.id !== this.immunityWinner);
                }
                this.addTribalLog("The tribe is voting...");
            } else if (this.tribalStage === 'revote') {
                voters = active.filter(p => {
                    let properGroup = isMerged || p.tribe === this.tribalTargetTribe;
                    return properGroup && !this.tiedPlayers.includes(p.id);
                });
                targets = active.filter(p => this.tiedPlayers.includes(p.id));
                this.addTribalLog("Revoting... You can only vote for: " + targets.map(t => t.name).join(", "));
            } else if (this.tribalStage === 'deadlock') {
                if (!this.deadlockResolved) {
                    this.resolveDeadlock(active);
                }
                return;
            }
            // Ensure there are valid voters and targets
            if (voters.length === 0) {
                // If no voters (e.g. all in tiedPlayers during revote), go to rocks
                this.addTribalLog("No voters available. Going to rocks...");
                this.tiedPlayers = [];
                let safeIds = [];
                if (this.immunityWinner !== null) {
                    safeIds.push(this.immunityWinner);
                    this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                }
                const active = this.getActivePlayers();
                let rockPool = active.filter(p => 
                    !safeIds.includes(p.id) && 
                    (isMerged || p.tribe === this.tribalTargetTribe)
                );
                if (rockPool.length === 0) {
                    // If nobody in rock pool, eliminate first available target
                    const fallbackTargets = isMerged 
                        ? active.filter(p => p.id !== this.immunityWinner)
                        : active.filter(p => p.tribe === this.tribalTargetTribe);
                    this.pendingBoot = fallbackTargets.length > 0 ? fallbackTargets[0] : active[0];
                } else {
                    let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                    this.pendingBoot = loser;
                    this.addTribalLog(`${loser.name} draws the black rock!`);
                }
                return;
            }
            if (targets.length === 0) {
                // If no targets, go to rocks
                this.addTribalLog("No valid targets. Going to rocks...");
                this.tiedPlayers = [];
                let safeIds = [];
                if (this.immunityWinner !== null) {
                    safeIds.push(this.immunityWinner);
                    this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                }
                const active = this.getActivePlayers();
                let rockPool = active.filter(p => 
                    !safeIds.includes(p.id) && 
                    (isMerged || p.tribe === this.tribalTargetTribe)
                );
                if (rockPool.length === 0) {
                    const fallbackTargets = isMerged 
                        ? active.filter(p => p.id !== this.immunityWinner)
                        : active.filter(p => p.tribe === this.tribalTargetTribe);
                    this.pendingBoot = fallbackTargets.length > 0 ? fallbackTargets[0] : active[0];
                } else {
                    let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                    this.pendingBoot = loser;
                    this.addTribalLog(`${loser.name} draws the black rock!`);
                }
                return;
            }
            let voteCast = [];
            let voteCounts = {};
            targets.forEach(t => voteCounts[t.id] = 0);
            voters.forEach(v => {
                let choice = this.getVoteTarget(v, targets);
                if (choice) {
                    voteCast.push({ voter: v, targetId: choice.id });
                    voteCounts[choice.id]++;
                    if (this.tribalStage === 'initial') {
                        v.history.push({ ep: currentEpisode, vote: choice.name });
                    }
                } else {
                    // If getVoteTarget returns no target, use first available
                    if (targets.length > 0) {
                        choice = targets[0];
                        voteCast.push({ voter: v, targetId: choice.id });
                        voteCounts[choice.id]++;
                        if (this.tribalStage === 'initial') {
                            v.history.push({ ep: currentEpisode, vote: choice.name });
                        }
                    }
                }
            });
            // If voteCast is still empty after loop, go to rocks
            if (voteCast.length === 0) {
                this.addTribalLog("No votes were cast. Going to rocks...");
                this.tiedPlayers = [];
                let safeIds = [];
                if (this.immunityWinner !== null) {
                    safeIds.push(this.immunityWinner);
                    this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                }
                const active = this.getActivePlayers();
                let rockPool = active.filter(p => 
                    !safeIds.includes(p.id) && 
                    (isMerged || p.tribe === this.tribalTargetTribe)
                );
                if (rockPool.length === 0) {
                    // If nobody in rock pool, use targets or first active
                    if (targets.length > 0) {
                        this.pendingBoot = targets[0];
                    } else {
                        this.pendingBoot = active[0];
                    }
                } else {
                    let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                    this.pendingBoot = loser;
                    this.addTribalLog(`${loser.name} draws the black rock!`);
                }
                return;
            }
            this.votesToRead = [];
            let finalTally = {};
            let idolsPlayed = [];
            const activeCount = this.getActivePlayers().length;
            if (this.tribalStage === 'initial' && activeCount > 4) {
                targets.forEach(t => {
                    if (t.items.includes("Idol")) {
                        let risk = voteCounts[t.id];
                        let paranoid = (t.stats.TMP < 3 && Math.random() < 0.3);
                        let smartPlay = (risk > 1 && Math.random() < (t.stats.INT * 0.15));
                        if (smartPlay || paranoid) {
                            idolsPlayed.push(t.id);
                            t.items = t.items.filter(i => i !== 'Idol');
                            this.addTribalLog(`${t.name} plays an IDOL!`);
                        }
                    }
                });
            }
            let validStack = [];
            let invalidStack = [];
            voteCast.forEach(vc => {
                let isValid = !idolsPlayed.includes(vc.targetId);
                let voteObj = { name: players[vc.targetId].name, valid: isValid, id: vc.targetId };
                if (isValid) {
                    validStack.push(voteObj);
                    finalTally[vc.targetId] = (finalTally[vc.targetId] || 0) + 1;
                } else {
                    invalidStack.push(voteObj);
                }
            });
            validStack.sort(() => Math.random() - 0.5);
            invalidStack.sort(() => Math.random() - 0.5);
            this.votesToRead = [...validStack, ...invalidStack];
            
            // RIGOROUS TRIBAL RULES: Find person with most votes
            let maxVotes = 0;
            let personWithMostVotes = null;
            let voteCountsArray = [];
            for (const [pid, count] of Object.entries(finalTally)) {
                voteCountsArray.push({ id: parseInt(pid), count: count });
                if (count > maxVotes) {
                    maxVotes = count;
                    personWithMostVotes = parseInt(pid);
                }
            }
            
            // Sort by vote count descending
            voteCountsArray.sort((a, b) => b.count - a.count);
            
            if (maxVotes === 0 && this.tribalStage === 'initial') {
                // All votes cancelled by Idol - go directly to rocks
                this.addTribalLog("All votes cancelled by Idol!");
                this.addTribalLog("Going to rocks... All votes nullified.");
                this.tiedPlayers = [];
                let safeIds = [];
                if (this.immunityWinner !== null) {
                    safeIds.push(this.immunityWinner);
                    this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                }
                let rockPool = targets.filter(p => !safeIds.includes(p.id));
                if (rockPool.length === 0) {
                    this.pendingBoot = targets[0];
                } else {
                    let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                    this.pendingBoot = loser;
                    this.addTribalLog(`${loser.name} draws the black rock!`);
                }
            } else if (this.tribalStage === 'initial' && personWithMostVotes !== null && idolsPlayed.includes(personWithMostVotes)) {
                // Person with most votes used an idol - eliminate person with SECOND highest votes
                this.addTribalLog(`${players[personWithMostVotes].name} used an Idol! Votes nullified.`);
                if (voteCountsArray.length > 1 && voteCountsArray[1].count > 0) {
                    // There is a second highest
                    this.pendingBoot = players[voteCountsArray[1].id];
                    this.tiedPlayers = [];
                    this.addTribalLog(`${this.pendingBoot.name} has the second highest votes and is eliminated.`);
                } else {
                    // No second highest (all votes were on idol player) - go to rocks
                    this.addTribalLog("All votes were on the idol player. Going to rocks...");
                    this.tiedPlayers = [];
                    let safeIds = [];
                    if (this.immunityWinner !== null) {
                        safeIds.push(this.immunityWinner);
                        this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                    }
                    let rockPool = targets.filter(p => !safeIds.includes(p.id));
                    if (rockPool.length === 0) {
                        this.pendingBoot = targets[0];
                    } else {
                        let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                        this.pendingBoot = loser;
                        this.addTribalLog(`${loser.name} draws the black rock!`);
                    }
                }
            } else {
                // Normal case: check for ties
                if (Object.keys(finalTally).length === 0) {
                    // No valid votes at all - go to rocks
                    this.addTribalLog("No valid votes cast. Going to rocks...");
                    this.tiedPlayers = [];
                    let safeIds = [];
                    if (this.immunityWinner !== null) {
                        safeIds.push(this.immunityWinner);
                        this.addTribalLog(`Immune: ${players[this.immunityWinner].name} (Individual Immunity Winner)`);
                    }
                    let rockPool = targets.filter(p => !safeIds.includes(p.id));
                    if (rockPool.length === 0) {
                        this.pendingBoot = targets[0];
                    } else {
                        let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                        this.pendingBoot = loser;
                        this.addTribalLog(`${loser.name} draws the black rock!`);
                    }
                } else {
                    let currentTied = [];
                    for (const [pid, count] of Object.entries(finalTally)) {
                        if (count === maxVotes) {
                            currentTied.push(parseInt(pid));
                        }
                    }
                    if (currentTied.length === 1) {
                        // Single person with most votes - eliminate them
                        this.pendingBoot = players[currentTied[0]];
                        this.tiedPlayers = [];
                    } else if (currentTied.length > 1) {
                        // TIE - will go to revote (or deadlock if already revote)
                        this.pendingBoot = null;
                        this.tiedPlayers = currentTied;
                    } else {
                        // Fallback: should not happen, but if it does, eliminate first target
                        this.addTribalLog("Unexpected vote result. Eliminating first target.");
                        this.pendingBoot = targets[0];
                        this.tiedPlayers = [];
                    }
                }
            }
        },

        resolveDeadlock: function(active) {
            if (this.pendingBoot !== null || this.deadlockResolved) return;
            this.deadlockResolved = true;
            this.addTribalLog("Deadlock! The vote is still tied.");
            const activeCount = this.getActivePlayers().length;
            if (activeCount === 4 && this.tiedPlayers.length === 2) {
                this.addTribalLog("Fire Making Challenge!");
                let p1 = players[this.tiedPlayers[0]];
                let p2 = players[this.tiedPlayers[1]];
                if (p1 && p2) {
                    let s1 = (p1.stats.PHY || 5) + (p1.stats.INT || 5) + (Math.random() * 10);
                    let s2 = (p2.stats.PHY || 5) + (p2.stats.INT || 5) + (Math.random() * 10);
                    this.pendingBoot = (s1 < s2) ? p1 : p2;
                    this.addTribalLog(`${this.pendingBoot.name} loses fire making.`);
                } else {
                    this.pendingBoot = p1 || p2 || players[this.tiedPlayers[0]];
                }
            } else {
                this.addTribalLog("Going to rocks... Immune: Immunity Winner + Tied Players");
                let safeIds = [this.immunityWinner, ...this.tiedPlayers].filter(id => id != null);
                let rockPool = active.filter(p => !safeIds.includes(p.id) && (isMerged || p.tribe === this.tribalTargetTribe));
                if (rockPool.length === 0) {
                    this.pendingBoot = players[this.tiedPlayers[0]];
                } else {
                    let loser = rockPool[Math.floor(Math.random() * rockPool.length)];
                    this.pendingBoot = loser;
                    this.addTribalLog(`${loser.name} draws the black rock!`);
                }
            }
            if (this.pendingBoot) {
                this.resolveBoot();
            }
        },

        revealNextVote: function() {
            if (!this.tribalVotesCalculated) {
                this.calculateVotes();
                this.tribalVotesCalculated = true;
                // If after calculateVotes there are no votes to read, check outcome
                if (this.votesToRead.length === 0) {
                    // Ensure pendingBoot or tiedPlayers are set
                    if (!this.pendingBoot && (!this.tiedPlayers || this.tiedPlayers.length === 0)) {
                        // If still no result, force an elimination
                        const active = this.getActivePlayers();
                        const targets = isMerged 
                            ? active.filter(p => p.id !== this.immunityWinner)
                            : active.filter(p => p.tribe === this.tribalTargetTribe);
                        if (targets.length > 0) {
                            this.addTribalLog("No votes to reveal. Forcing elimination.");
                            this.pendingBoot = targets[Math.floor(Math.random() * targets.length)];
                        }
                    }
                    this.checkVoteOutcome();
                    return;
                }
            }
            if (this.votesToRead.length === 0) {
                this.checkVoteOutcome();
                return;
            }
            const vote = this.votesToRead.pop();
            this.tribalVotesRevealed = this.tribalVotesRevealed || [];
            this.tribalVotesRevealed.push({ name: vote.name, valid: vote.valid });
            const revealEl = document.getElementById('vote-reveal-area') || voteRevealArea;
            if (revealEl) revealEl.innerHTML = '';
            const card = document.createElement('div');
            card.className = 'vote-card animate__animated animate__flipInX';
            card.innerHTML = `${vote.name}`;
            if (!vote.valid) card.innerHTML += `<br><span style="color:red; font-size:0.5em">DOES NOT COUNT</span>`;
            if (revealEl) revealEl.appendChild(card);
            this.addTribalLog(`Vote: ${vote.name}`);
            const bodyEl = document.getElementById('tribal-body');
            if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
            if (this.votesToRead.length === 0) {
                const readBtn = document.getElementById('btn-read-vote') || btnReadVote;
                if (readBtn) {
                    readBtn.innerText = "Reveal Decision";
                    readBtn.disabled = false;
                    readBtn.onclick = function(ev) {
                        if (ev) { 
                            ev.stopPropagation(); 
                            ev.preventDefault(); 
                        }
                        sim.checkVoteOutcome();
                    };
                }
            }
        },

        checkVoteOutcome: function() {
            if (this.pendingBoot) {
                if (this.tribalStage === 'deadlock') return;
                this.resolveBoot();
            } else if (this.tiedPlayers.length > 0) {
                const readBtn = document.getElementById('btn-read-vote') || btnReadVote;
                if (this.tribalStage === 'initial') {
                    let tiedNames = this.tiedPlayers.map(id => players[id].name).join(" and ");
                    this.addTribalLog(`TIE VOTE between ${tiedNames}.`);
                    if (readBtn) {
                        readBtn.innerText = "Proceed to Revote";
                        readBtn.disabled = false;
                        readBtn.onclick = function(ev) {
                            if (ev) { 
                                ev.stopPropagation(); 
                                ev.preventDefault(); 
                            }
                            sim.tribalStage = 'revote';
                            sim.setupRevoteUI();
                        };
                    }
                } else if (this.tribalStage === 'revote') {
                    this.addTribalLog("STILL TIED.");
                    if (readBtn) {
                        readBtn.innerText = "Go to Deadlock";
                        readBtn.disabled = false;
                        readBtn.onclick = function(ev) {
                            if (ev) { 
                                ev.stopPropagation(); 
                                ev.preventDefault(); 
                            }
                            const btn = ev && ev.target ? ev.target : (this || readBtn);
                            if (btn) btn.disabled = true;
                            sim.tribalStage = 'deadlock';
                            sim.deadlockResolved = false;
                            sim.calculateVotes();
                        };
                    }
                }
            } else {
                // Fallback: if neither pendingBoot nor tiedPlayers, recalculate votes
                // This can happen if calculateVotes did not set state correctly
                // Avoid infinite loops: if we already calculated votes, force elimination
                if (!this.tribalVotesCalculated) {
                    this.addTribalLog("Recalculating votes...");
                    this.calculateVotes();
                    this.tribalVotesCalculated = true;
                    if (this.votesToRead.length > 0) {
                        // There are votes to read, continue normally
                        return;
                    }
                }
                // If still no pendingBoot nor tiedPlayers after recalc, force random elimination among targets
                const active = this.getActivePlayers();
                const targets = isMerged 
                    ? active.filter(p => p.id !== this.immunityWinner)
                    : active.filter(p => p.tribe === this.tribalTargetTribe);
                if (targets.length > 0) {
                    this.addTribalLog("Forcing elimination due to vote calculation issue.");
                    const loser = targets[Math.floor(Math.random() * targets.length)];
                    this.pendingBoot = loser;
                    this.resolveBoot();
                } else {
                    this.addTribalLog("Error: No valid targets for elimination.");
                    const endBtn = document.getElementById('btn-end-tribal') || btnEndTribal;
                    if (endBtn) endBtn.classList.remove('hidden');
                }
            }
        },

        setupRevoteUI: function() {
            this.deadlockResolved = false;
            this.votesToRead = [];
            const revealEl = document.getElementById('vote-reveal-area') || voteRevealArea;
            if (revealEl) revealEl.innerHTML = '<span style="color:var(--error); font-weight:bold;">REVOTE IN PROGRESS</span>';
            const readBtn = document.getElementById('btn-read-vote') || btnReadVote;
            if (readBtn) {
                readBtn.classList.remove('hidden');
                readBtn.disabled = false;
                readBtn.innerText = "Read Revotes";
                readBtn.onclick = function(ev) {
                    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
                    sim.revealNextVote();
                };
            }
            this.calculateVotes();
            this.tribalVotesCalculated = true;
        },

        resolveBoot: function() {
            if (this.pendingBoot) {
                this.playerOut(this.pendingBoot);
            } else {
                this.addTribalLog("Confusion... proceeding.");
                const endBtn = document.getElementById('btn-end-tribal') || btnEndTribal;
                if (endBtn) endBtn.classList.remove('hidden');
            }
        },

        playerOut: function(p) {
            const revealEl = document.getElementById('vote-reveal-area') || voteRevealArea;
            if (revealEl) revealEl.innerHTML = `<h2 style="color:var(--error); font-size:3em;">${p.name}</h2><p>The tribe has spoken.</p>`;
            bootOrder++;
            p.bootOrder = bootOrder;
            p.status = "Eliminated";
            const remaining = this.getActivePlayers().length;
            // ONLY players eliminated from merge onward go to jury
            // Merge happens when <= settings.mergeAt players remain
            // So if we are already at merge (isMerged === true), add to jury
            if (isMerged) {
                p.status = "Jury";
                if (!this.jury.includes(p.id)) {
                    this.jury.push(p.id);
                    this.addTribalLog(`${p.name} joins the Jury.`);
                }
            } else {
                this.addTribalLog(`${p.name} eliminated.`);
            }
            const readBtn = document.getElementById('btn-read-vote') || btnReadVote;
            const endBtn = document.getElementById('btn-end-tribal') || btnEndTribal;
            if (readBtn) readBtn.classList.add('hidden');
            if (endBtn) endBtn.classList.remove('hidden');
            this.saveSnapshot();
        },

        endTribal: function() {
            if (this.viewingEpisode !== currentEpisode) {
                tribalSection.classList.add('hidden');
                if (btnCloseTribalView) btnCloseTribalView.classList.add('hidden');
                return;
            }
            tribalSection.classList.add('hidden');
            btnMainAction.classList.remove('hidden');
            narrativeLog.innerHTML = '';
            /* Advancing to next episode: the just-finished episode is already in historyLog and becomes IMMUTABLE (read-only). */
            currentEpisode++;
            this.viewingEpisode = currentEpisode;
            epDisplay.innerText = `Ep ${currentEpisode}`;
            episodeEventsCount = 0;
            eventsTarget = Math.floor(Math.random() * 6) + 5;
            this.immunityWinner = null;
            this.tribalTargetTribe = null;
            gameMode = "EVENT";
            updateMainButton();
            if (this.getActivePlayers().length <= settings.finalists) {
                this.runFinale();
            } else if (!isMerged && this.getActivePlayers().length <= settings.mergeAt) {
                this.performMerge();
                this.updateUI();
            } else {
                this.updateUI();
            }
            this.saveSnapshot();
        },

        performMerge: function() {
            isMerged = true;
            this.getActivePlayers().forEach(p => p.tribe = 99);
            this.logEvent(`--- MERGE --- Tribes are dissolved into ${settings.mergeName}!`, "fa-users", "#fff");
            gameStageText.innerText = "Merge Phase";
            gameStageText.style.color = settings.mergeColor;
        },

        fixJuryMembership: function() {
            // Find merge episode from snapshots
            let mergeEpisode = null;
            for (let i = 0; i < historyLog.length; i++) {
                if (historyLog[i].stage === "Merge") {
                    mergeEpisode = historyLog[i].episode;
                    break;
                }
            }
            
            // Reset jury: remove all
            this.jury = [];
            
            // Add ONLY players eliminated from merge onward
            // Merge happens when <= mergeAt players remain
            // Jurors are those eliminated AFTER merge (including the merge episode itself)
            if (mergeEpisode !== null) {
                // First, find all players who were active at merge time
                const mergeSnap = historyLog.find(h => h.episode === mergeEpisode);
                const activeAtMerge = new Set();
                if (mergeSnap && mergeSnap.players) {
                    mergeSnap.players.forEach(p => {
                        if (p.status === "Active") {
                            activeAtMerge.add(p.id);
                        }
                    });
                }
                
                // Check all snapshots from merge onward for eliminated players who were active at merge
                for (let ep = mergeEpisode; ep <= currentEpisode; ep++) {
                    const snap = historyLog.find(h => h.episode === ep);
                    if (snap && snap.players) {
                        snap.players.forEach(pAtEp => {
                            if ((pAtEp.status === "Eliminated" || pAtEp.status === "Jury") && 
                                !this.jury.includes(pAtEp.id) &&
                                activeAtMerge.has(pAtEp.id)) {
                                // This player was active at merge and was eliminated after
                                this.jury.push(pAtEp.id);
                                const p = players.find(pl => pl.id === pAtEp.id);
                                if (p) {
                                    p.status = "Jury";
                                }
                            }
                        });
                    }
                }
            }
            
            // Also check currently eliminated players if we are at merge
            if (isMerged && mergeEpisode !== null) {
                const mergeSnap = historyLog.find(h => h.episode === mergeEpisode);
                const activeAtMerge = new Set();
                if (mergeSnap && mergeSnap.players) {
                    mergeSnap.players.forEach(p => {
                        if (p.status === "Active") {
                            activeAtMerge.add(p.id);
                        }
                    });
                }
                
                players.forEach(p => {
                    if ((p.status === "Eliminated" || p.status === "Jury") && 
                        !this.jury.includes(p.id) &&
                        activeAtMerge.has(p.id)) {
                        // Was active at merge, so can be juror
                        this.jury.push(p.id);
                        p.status = "Jury";
                    }
                });
            }
            
            // Remove duplicates
            this.jury = [...new Set(this.jury)];
            
            // Ensure jury count is correct: should be mergeAt - 3
            const expectedJurySize = settings.mergeAt - 3;
            if (this.jury.length !== expectedJurySize) {
                // If count doesn't match, keep only the last N eliminated after merge
                // Fallback in case the above logic is off
                if (this.jury.length > expectedJurySize) {
                    this.jury = this.jury.slice(-expectedJurySize);
                }
            }
        },

        runFinale: function() {
            // Prevent running finale multiple times
            if (finaleSection && !finaleSection.classList.contains('hidden')) {
                return;
            }
            // Ensure all players eliminated from merge onward are in jury
            this.fixJuryMembership();
            btnMainAction.classList.add('hidden');
            finaleSection.classList.remove('hidden');
            const container = finalistsDisplay;
            const finalists = this.getActivePlayers();
            container.innerHTML = '';
            finalists.forEach(f => {
                container.innerHTML += `
                    <div>
                        <div style="width:100px; height:100px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2em; margin:0 auto 10px; border:3px solid ${settings.mergeColor}">${f.name.substring(0,1)}</div>
                        <div style="font-weight:bold">${f.name}</div>
                        <div class="vote-counter" id="counter-${f.id}" style="font-size:2em; font-weight:bold; color:var(--secondary)">0</div>
                    </div>
                `;
            });
            this.finaleVotes = [];
            juryListRecap.innerHTML = '';
            juryReadArea.innerText = '';
            this.jury = [...new Set(this.jury)];
            const uniqueJury = this.jury;
            const usedJurorIds = new Set();
            uniqueJury.forEach(jId => {
                // Skip if this juror already voted
                if (usedJurorIds.has(jId)) return;
                const juror = players[jId];
                if (!juror) return; // Skip if juror doesn't exist
                let bestScore = -1000, voteFor = null;
                finalists.forEach(f => {
                    let score = juror.relationships[f.id] + (f.stats.SOC * 3) + f.stats.STR;
                    if (score > bestScore) { bestScore = score; voteFor = f.id; }
                });
                if (voteFor !== null) {
                    this.finaleVotes.push({ juror: juror.name, voteFor: voteFor, jurorId: jId });
                    usedJurorIds.add(jId);
                }
            });
            this.finaleVotes.sort(() => Math.random() - 0.5);
        },

        readFinaleVote: function() {
            if (this.finaleVotes.length === 0) {
                const finalists = this.getActivePlayers();
                let tally = finalists.map(f => {
                    let el = document.getElementById(`counter-${f.id}`);
                    return { id: f.id, name: f.name, count: parseInt(el.innerText), player: f };
                });
                tally.sort((a, b) => b.count - a.count);
                let winner = tally[0];
                if (tally.length > 1 && tally[0].count === tally[1].count) {
                    if (tally.length === 3 && tally[1].count === tally[2].count) {
                        let luckyIndex = Math.floor(Math.random() * 3);
                        winner = tally[luckyIndex];
                        alert(`3-WAY TIE! Rocks drawn... Winner: ${winner.name}`);
                    } else if (tally.length === 3) {
                        let p1 = tally[0];
                        let p2 = tally[1];
                        let decider = tally[2];
                        let rel1 = decider.player.relationships[p1.id] || 0;
                        let rel2 = decider.player.relationships[p2.id] || 0;
                        let choice = (rel1 >= rel2) ? p1 : p2;
                        let recap = juryListRecap;
                        recap.innerHTML += `<li style="color:var(--error); font-weight:bold; margin-top:10px;">TIED ${p1.count}-${p2.count}! ${decider.name} becomes the final juror.</li>`;
                        recap.innerHTML += `<li style="color:${settings.mergeColor}; font-weight:bold;">${decider.name} casts the winning vote for... ${choice.name}</li>`;
                        document.getElementById(`counter-${choice.id}`).innerText = choice.count + 1;
                        winner = choice;
                    } else {
                        let lucky = (Math.random() > 0.5) ? tally[0] : tally[1];
                        alert(`TIE in Final 2! Fire making... ${lucky.name} wins!`);
                        winner = lucky;
                    }
                }
                const wRev = winnerReveal;
                winnerName.innerText = winner.name;
                wRev.classList.remove('hidden');
                return;
            }
            const vote = this.finaleVotes.pop();
            juryReadArea.innerText = `Vote... for ${players[vote.voteFor].name}.`;
            const el = document.getElementById(`counter-${vote.voteFor}`);
            el.innerText = parseInt(el.innerText) + 1;
            juryListRecap.innerHTML += `<li>${vote.juror} voted for ${players[vote.voteFor].name}</li>`;
            if (this.finaleVotes.length === 0) {
                btnReadWinner.innerText = "Announce Winner";
                finaleRecap.classList.remove('hidden');
            }
        },

        exportSeason: function() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyLog));
            const node = document.createElement('a');
            node.setAttribute("href", dataStr);
            node.setAttribute("download", "survivor_season.json");
            document.body.appendChild(node);
            node.click();
            node.remove();
        },

        getActivePlayers: function() {
            return players.filter(p => p.status === 'Active');
        },

        logEvent: function(html, icon, color) {
            const div = document.createElement('div');
            div.className = 'simoa-event-item';
            if (color) div.style.borderLeftColor = color;
            div.innerHTML = `<div class="simoa-event-icon"><i class="fas ${icon}"></i></div><div>${html}</div>`;
            narrativeLog.prepend(div);
        },

        addTribalLog: function(text) {
            this.tribalLogLines = this.tribalLogLines || [];
            this.tribalLogLines.push(text);
            const div = document.createElement('div');
            div.style.padding = "4px 0";
            div.innerHTML = `<i class="fas fa-caret-right"></i> ${text}`;
            const logEl = document.getElementById('tribal-log') || tribalLog;
            if (logEl) logEl.appendChild(div);
            const bodyEl = document.getElementById('tribal-body');
            if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
        },

        updateUI: function() {
            remainingCount.innerText = this.getActivePlayers().length;
            headerSeasonName.innerText = settings.seasonName || "Season in Progress";
            advantageList.innerHTML = '';
            this.getActivePlayers().forEach(p => {
                p.items.forEach(i => {
                    advantageList.innerHTML += `<div style="background:rgba(255, 255, 255, 0.8); color:#0e2638; padding:5px 10px; border-radius:15px; font-size:0.8em; border:1px solid gold; font-weight:600"><i class="fas fa-shield-alt"></i> ${p.name} (${i})</div>`;
                });
            });
            if (advantageList.innerHTML === '') advantageList.innerHTML = '<small style="padding:10px">No advantages found yet.</small>';
            playerStatsTableBody.innerHTML = '';
            let displayList = [...this.getActivePlayers()];
            displayList.sort((a, b) => {
                let valA, valB;
                if (currentSort.key === 'name') { valA = a.name; valB = b.name; }
                else if (currentSort.key === 'tribe') { valA = tribes[a.tribe].name; valB = tribes[b.tribe].name; }
                else if (currentSort.key === 'socialScore') { valA = this.getSocialScore(a); valB = this.getSocialScore(b); }
                else if (currentSort.key === 'items') { valA = a.items.length; valB = b.items.length; }
                if (valA < valB) return currentSort.dir === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.dir === 'asc' ? 1 : -1;
                return 0;
            });
            displayList.forEach(p => {
                const tColor = (isMerged || p.tribe === 99) ? settings.mergeColor : tribes[p.tribe].color;
                const tName = (isMerged || p.tribe === 99) ? settings.mergeName : tribes[p.tribe].name;
                const sScore = this.getSocialScore(p);
                let sColor = sScore < 30 ? 'var(--error)' : sScore > 70 ? '#66bb6a' : 'var(--secondary)';
                const socBar = `<div class="stat-bar-container"><div class="stat-bar-fill" style="width:${sScore}%; background:${sColor}"></div></div>`;
                playerStatsTableBody.innerHTML += `
                    <tr>
                        <td><strong style="color:${tColor}">${p.name}</strong></td>
                        <td>${tName}</td>
                        <td>${sScore} ${socBar}</td>
                        <td>${p.items.length > 0 ? '<i class="fas fa-shield-alt" style="color:gold"></i>' : '-'}</td>
                    </tr>
                `;
            });
            allianceList.innerHTML = '';
            inactiveAllianceList.innerHTML = '';
            pastAllianceList.innerHTML = '';
            let sortedAlliances = [...alliances];
            sortedAlliances.sort((a, b) => allianceSortDir === 'asc' ? a.strength - b.strength : b.strength - a.strength);
            sortedAlliances.forEach((a, idx) => {
                let realIdx = alliances.indexOf(a);
                const activeMembers = a.members.filter(mId => players[mId].status === 'Active');
                const names = a.members.map(id => {
                    const p = players[id];
                    return p.status === 'Active' ? p.name : `<span style="text-decoration:line-through; opacity:0.6">${p.name}</span>`;
                }).join(", ");
                if (a.active && activeMembers.length >= 2) {
                    let distinctTribes = new Set(activeMembers.map(mId => players[mId].tribe));
                    if (distinctTribes.size === 1) {
                        let tId = [...distinctTribes][0];
                        let aColor = (isMerged || tId === 99) ? settings.mergeColor : tribes[tId].color;
                        let html = `<div class="simoa-alliance-card" style="padding:8px; margin-bottom:5px; border-radius:8px; border-left:4px solid ${aColor}">
                            <div style="font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                                <span>${a.name} <i class="fas fa-edit" style="cursor:pointer; margin-left:5px; color:#888; font-size:0.8em;" onclick="sim.renameAlliance(${realIdx})"></i></span>
                                <span style="font-size:0.8em; color:#4a5f73">Str: ${a.strength}</span>
                            </div>
                            <small style="color:#5a6f83">${names}</small>
                        </div>`;
                        allianceList.innerHTML += html;
                    } else {
                        let html = `<div class="simoa-alliance-card simoa-alliance-inactive" style="padding:8px; margin-bottom:5px; border-radius:8px; border-left:4px solid #94a3b8">
                            <div style="font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                                <span>${a.name} <i class="fas fa-edit" style="cursor:pointer; margin-left:5px; color:#94a3b8; font-size:0.8em;" onclick="sim.renameAlliance(${realIdx})"></i></span>
                                <span style="font-size:0.8em; color:#64748b">Str: ${a.strength}</span>
                            </div>
                            <small style="color:#64748b">${names}</small>
                        </div>`;
                        inactiveAllianceList.innerHTML += html;
                    }
                } else {
                    let sColor = a.strength < 5 ? '#e74c3c' : '#64748b';
                    let html = `<div class="simoa-alliance-card simoa-alliance-past" style="padding:8px; margin-bottom:5px; border-radius:8px; border-left:4px solid ${sColor}">
                        <div style="font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                            <span>${a.name} <i class="fas fa-edit" style="cursor:pointer; margin-left:5px; color:#94a3b8; font-size:0.8em;" onclick="sim.renameAlliance(${realIdx})"></i></span>
                            <span style="font-size:0.8em; color:#64748b">Str: ${a.strength}</span>
                        </div>
                        <small style="color:#64748b">${names}</small>
                    </div>`;
                    pastAllianceList.innerHTML += html;
                }
            });
            if (allianceList.innerHTML === '') allianceList.innerHTML = '<small style="padding:10px">No active alliances.</small>';
            if (inactiveAllianceList.innerHTML === '') inactiveAllianceList.innerHTML = '<small style="padding:10px; color:#666">No cross-tribe alliances.</small>';
            this.renderHeatmap();
            const voteSnap = this.viewingEpisode !== currentEpisode ? historyLog.find(h => h.episode === this.viewingEpisode) : null;
            this.renderVoteHistory(voteSnap || undefined);
        },

        renderHeatmap: function() {
            heatmapContainer.innerHTML = '';
            const active = this.getActivePlayers();
            let groups = {};
            if (isMerged) {
                groups[settings.mergeName] = active;
            } else {
                active.forEach(p => {
                    let tName = tribes[p.tribe].name;
                    if (!groups[tName]) groups[tName] = [];
                    groups[tName].push(p);
                });
            }
            for (let [gName, members] of Object.entries(groups)) {
                let html = `<h4 style="margin:10px 0 5px 0; color:var(--text-med)">${gName}</h4>`;
                html += `<table class="heatmap simoa-relationships-heatmap"><tr><th style="width:30px"></th>${members.map(m => `<th class="vertical-name">${m.name}</th>`).join('')}</tr>`;
                members.forEach(p1 => {
                    html += `<tr><th>${p1.name.substr(0, 3)}</th>`;
                    members.forEach(p2 => {
                        if (p1.id === p2.id) html += `<td class="heatmap-diag">—</td>`;
                        else {
                            let val = p1.relationships[p2.id];
                            let intensity = val < 50 ? (50 - val) / 50 : (val - 50) / 50;
                            let bg = val < 50 ? `rgba(239, 68, 68, ${0.2 + intensity * 0.5})` : `rgba(34, 197, 94, ${0.2 + intensity * 0.5})`;
                            html += `<td class="heatmap-cell" style="background:${bg}">${val}</td>`;
                        }
                    });
                    html += `</tr>`;
                });
                html += `</table>`;
                heatmapContainer.innerHTML += html;
            }
        },

        /** Contrasto testo su sfondo colore: bianco o nero. */
        _textColorOnBg: function(hexOrCss) {
            const s = (hexOrCss || '').toString().trim();
            let r = 0, g = 0, b = 0;
            if (s.indexOf('var(') === 0) return '#fff';
            const hex = s.replace(/^#/, '');
            if (hex.length === 6) {
                r = parseInt(hex.substr(0, 2), 16);
                g = parseInt(hex.substr(2, 2), 16);
                b = parseInt(hex.substr(4, 2), 16);
            }
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return lum > 0.5 ? '#111' : '#fff';
        },

        /** @param {Object|undefined} snapshot - If provided (past episode), table uses only snapshot data (read-only). */
        renderVoteHistory: function(snapshot) {
            const useSnapshot = snapshot && snapshot.players && snapshot.episode != null;
            let maxEp = useSnapshot ? snapshot.episode : 0;
            if (!useSnapshot) {
                players.forEach(p => {
                    if (p.history && p.history.length > 0) {
                        p.history.forEach(h => { if (h.ep > maxEp) maxEp = h.ep; });
                    }
                });
            }
            const historyLogRef = historyLog;
            const tribesRef = tribes;
            const settingsRef = settings;
            let hHtml = `<tr><th style="width:100px; text-align:left;">Player</th>`;
            for (let i = 1; i <= maxEp; i++) hHtml += `<th>E${i}</th>`;
            hHtml += `</tr>`;
            votingHead.innerHTML = hHtml;
            votingBody.innerHTML = '';
            const allPlayers = useSnapshot ? snapshot.players : players;
            const displayList = allPlayers.slice();
            displayList.sort((a, b) => {
                const aActive = a.status === 'Active';
                const bActive = b.status === 'Active';
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                if (aActive) return a.name.localeCompare(b.name);
                return (b.bootOrder || 0) - (a.bootOrder || 0);
            });
            displayList.forEach(p => {
                const nameColor = p.status === 'Active' ? '#0e2638' : '#666';
                let row = `<tr><td style="text-align:left; font-weight:bold; color: ${nameColor}">${p.name}</td>`;
                for (let i = 1; i <= maxEp; i++) {
                    const epSnap = historyLogRef.find(h => h.episode === i);
                    let cellContent = "-";
                    if (epSnap && epSnap.players) {
                        const pAtEp = epSnap.players.find(pl => pl.id === p.id);
                        if (pAtEp) {
                            if (pAtEp.status !== 'Active' && pAtEp.status !== 'Jury') {
                                cellContent = "-";
                            } else {
                                const history = (pAtEp.history || []);
                                const voteObj = history.find(h => h.ep === i);
                                if (voteObj) {
                                    cellContent = voteObj.vote;
                                } else if (epSnap.immunityWinner != null && epSnap.tribalTargetTribe != null) {
                                    const isMerge = epSnap.stage === "Merge";
                                    const immune = isMerge
                                        ? (pAtEp.id === epSnap.immunityWinner)
                                        : (pAtEp.tribe !== epSnap.tribalTargetTribe);
                                    if (immune) {
                                        const bg = isMerge
                                            ? (settingsRef.mergeColor || '#ab47bc')
                                            : (tribesRef[pAtEp.tribe] && tribesRef[pAtEp.tribe].color) ? tribesRef[pAtEp.tribe].color : '#888';
                                        const fg = this._textColorOnBg(bg);
                                        cellContent = `<span style="background:${bg};color:${fg};padding:2px 6px;border-radius:4px;font-size:0.75em;font-weight:600;">IMMUNE</span>`;
                                    }
                                }
                            }
                        }
                    }
                    row += `<td>${cellContent}</td>`;
                }
                row += `</tr>`;
                votingBody.innerHTML += row;
            });
        },

        simulateEpisode: function() {
            while (episodeEventsCount < eventsTarget) this.runNextEvent();
            if (this.immunityWinner === null) this.runImmunity();
            this.setupTribalUI();
            this.revealNextVote();
            while (this.votesToRead.length > 0) this.revealNextVote();
            this.checkVoteOutcome();
            if (this.tribalStage === 'initial' && this.pendingBoot) {
                this.resolveBoot();
                this.endTribal();
            } else if (this.tribalStage === 'revote' && this.pendingBoot) {
                this.resolveBoot();
                this.endTribal();
            }
        },

        simulateSeason: function() {
            let timer = setInterval(() => {
                if (this.getActivePlayers().length <= settings.finalists) {
                    clearInterval(timer);
                    this.runFinale();
                } else {
                    this.simulateEpisode();
                }
            }, 500);
        },

        renameAlliance: function(idx) {
            let newName = prompt("Enter new alliance name:", alliances[idx].name);
            if (newName && newName.trim()) alliances[idx].name = newName.trim();
            this.updateUI();
        }
    };

    /* ---------------- FUNCTIONS (from original) ---------------- */
    function updateTribeConfigInputs() {
        const num = parseInt(numTribes.value);
        tribeConfigArea.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const row = document.createElement('div');
            row.className = 'tribe-config-row';
            row.innerHTML = `
                <div class="simoa-input-group simoa-input-group-season">
                    <span class="simoa-input-label">Tribe ${i + 1} Name</span>
                    <input type="text" id="t-name-${i}" value="${DEFAULT_NAMES[i] || 'Tribe ' + (i + 1)}" placeholder="Tribe Name">
                </div>
                <div class="simoa-input-group simoa-input-group-color">
                    <span class="simoa-input-label">Color</span>
                    <input type="color" id="t-color-${i}" value="${DEFAULT_COLORS[i] || '#888888'}">
                </div>
            `;
            tribeConfigArea.appendChild(row);
        }
    }

    function generateCastForm() {
        const num = parseInt(numPlayers.value, 10) || 18;
        const numTribesVal = parseInt(numTribes.value, 10);
        castContainer.innerHTML = '';
        let tIndex = 0;
        for (let i = 0; i < num; i++) {
            const div = document.createElement('div');
            const defaultColor = document.getElementById(`t-color-${tIndex}`).value;
            div.className = 'cast-row';
            div.style.borderLeftColor = defaultColor;
            div.dataset.id = i;
            div.innerHTML = `
                <div class="cast-row-inner">
                    <div class="simoa-input-group cast-name-cell">
                        <span class="simoa-input-label">Name</span>
                        <input type="text" class="p-name" value="Player ${i + 1}">
                    </div>
                    <div class="simoa-input-group cast-gender-cell">
                        <span class="simoa-input-label">G</span>
                        <select class="p-gender"><option value="M">M</option><option value="F">F</option><option value="NB">NB</option></select>
                    </div>
                    <div class="simoa-input-group cast-tribe-cell">
                        <span class="simoa-input-label">Tribe</span>
                        <select class="p-tribe">
                            ${generateTribeOptions(numTribesVal, tIndex)}
                        </select>
                    </div>
                    <div class="cast-stats-inline">
                        <div class="stat-mini"><label>Physical</label><input type="number" class="s-phy stat-input" value="5" min="1" max="10"></div>
                        <div class="stat-mini"><label>Strategy</label><input type="number" class="s-str stat-input" value="5" min="1" max="10"></div>
                        <div class="stat-mini"><label>Social</label><input type="number" class="s-soc stat-input" value="5" min="1" max="10"></div>
                        <div class="stat-mini"><label>Loyalty</label><input type="number" class="s-loy stat-input" value="5" min="1" max="10"></div>
                        <div class="stat-mini"><label>Intuition</label><input type="number" class="s-int stat-input" value="5" min="1" max="10"></div>
                        <div class="stat-mini"><label>Temper</label><input type="number" class="s-tmp stat-input" value="5" min="1" max="10"></div>
                    </div>
                </div>
            `;
            castContainer.appendChild(div);
            tIndex = (tIndex + 1) % numTribesVal;
        }
        castEditor.classList.remove('hidden');
        castEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function generateTribeOptions(total, selected) {
        let html = '';
        for (let i = 0; i < total; i++) {
            const el = document.getElementById(`t-name-${i}`);
            const name = el ? el.value : 'Tribe ' + (i + 1);
            html += `<option value="${i}" ${i === selected ? 'selected' : ''}>${String(name)}</option>`;
        }
        return html;
    }

    function generateTribeOptionsFromConfig(tribesConfig, selectedIndex) {
        if (!Array.isArray(tribesConfig) || tribesConfig.length === 0) return '';
        const sel = parseInt(selectedIndex, 10);
        return tribesConfig.map((t, i) => {
            const name = (t && t.name) ? String(t.name) : 'Tribe ' + (i + 1);
            return `<option value="${i}" ${i === sel ? 'selected' : ''}>${name}</option>`;
        }).join('');
    }

    function updateCardColor(select) {
        const color = document.getElementById(`t-color-${select.value}`).value;
        select.closest('.cast-row').style.borderLeftColor = color;
    }

    function randomizeStats() {
        document.querySelectorAll('.cast-row input[type="number"]').forEach(inp => inp.value = Math.floor(Math.random() * 10) + 1);
    }
    function fillRandomNames() {
        const inputs = document.querySelectorAll('.p-name');
        const shuffled = [...FIRST_NAMES].sort(() => 0.5 - Math.random());
        inputs.forEach((inp, i) => inp.value = shuffled[i % shuffled.length]);
    }
    function balanceTribesLogic() {
        const cards = Array.from(document.querySelectorAll('.cast-row'));
        const numTribesVal = parseInt(numTribes.value);
        let cardData = cards.map(c => ({ el: c, gender: c.querySelector('.p-gender').value }));
        cardData.sort(() => Math.random() - 0.5);
        let t = 0;
        cardData.forEach(item => {
            const select = item.el.querySelector('.p-tribe');
            select.value = t;
            updateCardColor(select);
            t = (t + 1) % numTribesVal;
        });
    }
    function randomizeAll() {
        randomizeStats();
        fillRandomNames();
        balanceTribesLogic();
    }

    function exportCastConfig() {
        const castData = [];
        document.querySelectorAll('.cast-row').forEach(row => {
            castData.push({
                name: row.querySelector('.p-name').value,
                gender: row.querySelector('.p-gender').value,
                tribe: row.querySelector('.p-tribe').value,
                stats: {
                    PHY: row.querySelector('.s-phy').value,
                    STR: row.querySelector('.s-str').value,
                    SOC: row.querySelector('.s-soc').value,
                    LOY: row.querySelector('.s-loy').value,
                    INT: row.querySelector('.s-int').value,
                    TMP: row.querySelector('.s-tmp').value,
                }
            });
        });
        const tribeData = [];
        const numTribesVal = parseInt(numTribes.value);
        for (let i = 0; i < numTribesVal; i++) {
            tribeData.push({
                name: document.getElementById(`t-name-${i}`).value,
                color: document.getElementById(`t-color-${i}`).value
            });
        }
        const config = { players: castData, tribes: tribeData, seasonName: seasonName.value };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "survivor_cast_config.json");
        document.body.appendChild(node);
        node.click();
        node.remove();
    }

    function importCastConfig(fileInput) {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onerror = function() {
            alert("Import error: could not read file.");
        };
        reader.onload = function(ev) {
            const raw = ev.target && ev.target.result;
            if (typeof raw !== 'string') {
                alert("Import error: could not read file content.");
                return;
            }
            let config;
            try {
                config = JSON.parse(raw);
            } catch (parseErr) {
                alert("Import error: invalid JSON - " + (parseErr.message || String(parseErr)));
                fileInput.value = '';
                return;
            }
            const playersList = Array.isArray(config.players) ? config.players : [];
            const tribesList = Array.isArray(config.tribes) ? config.tribes : [];
            if (playersList.length === 0 || tribesList.length === 0) {
                alert("Import error: file must contain non-empty 'players' and 'tribes' arrays.");
                fileInput.value = '';
                return;
            }
            if (config.seasonName) seasonName.value = String(config.seasonName);
            numTribes.value = String(tribesList.length);
            updateTribeConfigInputs();
            tribesList.forEach(function(t, i) {
                const nameEl = document.getElementById('t-name-' + i);
                const colorEl = document.getElementById('t-color-' + i);
                if (nameEl) nameEl.value = (t && t.name != null) ? String(t.name) : 'Tribe ' + (i + 1);
                if (colorEl) colorEl.value = (t && t.color) ? String(t.color) : '#888888';
            });
            numPlayers.value = String(playersList.length);
            castContainer.innerHTML = '';
            playersList.forEach(function(p, i) {
                const tribeIndex = Math.max(0, Math.min(tribesList.length - 1, parseInt(p.tribe, 10) || 0));
                const tribeForColor = tribesList[tribeIndex];
                const color = (tribeForColor && tribeForColor.color) ? tribeForColor.color : '#888';
                const stats = (p && p.stats) ? p.stats : {};
                const phy = Math.min(10, Math.max(1, parseInt(stats.PHY, 10) || 5));
                const str = Math.min(10, Math.max(1, parseInt(stats.STR, 10) || 5));
                const soc = Math.min(10, Math.max(1, parseInt(stats.SOC, 10) || 5));
                const loy = Math.min(10, Math.max(1, parseInt(stats.LOY, 10) || 5));
                const int = Math.min(10, Math.max(1, parseInt(stats.INT, 10) || 5));
                const tmp = Math.min(10, Math.max(1, parseInt(stats.TMP, 10) || 5));
                const name = (p && p.name != null) ? String(p.name) : 'Player ' + (i + 1);
                const safeName = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const gender = (p && p.gender) ? String(p.gender) : 'M';
                const div = document.createElement('div');
                div.className = 'cast-row';
                div.style.borderLeftColor = color;
                div.innerHTML =
                    '<div class="cast-row-inner">' +
                    '<div class="simoa-input-group cast-name-cell"><span class="simoa-input-label">Name</span><input type="text" class="p-name" value="' + safeName + '"></div>' +
                    '<div class="simoa-input-group cast-gender-cell"><span class="simoa-input-label">G</span><select class="p-gender">' +
                    '<option value="M"' + (gender === 'M' ? ' selected' : '') + '>M</option>' +
                    '<option value="F"' + (gender === 'F' ? ' selected' : '') + '>F</option>' +
                    '<option value="NB"' + (gender === 'NB' ? ' selected' : '') + '>NB</option></select></div>' +
                    '<div class="simoa-input-group cast-tribe-cell"><span class="simoa-input-label">Tribe</span><select class="p-tribe">' +
                    generateTribeOptionsFromConfig(tribesList, tribeIndex) + '</select></div>' +
                    '<div class="cast-stats-inline">' +
                    '<div class="stat-mini"><label>Physical</label><input type="number" class="s-phy stat-input" value="' + phy + '" min="1" max="10"></div>' +
                    '<div class="stat-mini"><label>Strategy</label><input type="number" class="s-str stat-input" value="' + str + '" min="1" max="10"></div>' +
                    '<div class="stat-mini"><label>Social</label><input type="number" class="s-soc stat-input" value="' + soc + '" min="1" max="10"></div>' +
                    '<div class="stat-mini"><label>Loyalty</label><input type="number" class="s-loy stat-input" value="' + loy + '" min="1" max="10"></div>' +
                    '<div class="stat-mini"><label>Intuition</label><input type="number" class="s-int stat-input" value="' + int + '" min="1" max="10"></div>' +
                    '<div class="stat-mini"><label>Temper</label><input type="number" class="s-tmp stat-input" value="' + tmp + '" min="1" max="10"></div>' +
                    '</div></div>';
                castContainer.appendChild(div);
            });
            castEditor.classList.remove('hidden');
            castContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            fileInput.value = '';
            alert("Cast imported successfully! " + playersList.length + " players, " + tribesList.length + " tribes.");
        };
        reader.readAsText(file, 'UTF-8');
    }

    function startGame() {
        settings = {
            seasonName: seasonName.value,
            numTribes: parseInt(numTribes.value),
            mergeAt: parseInt(mergeAt.value),
            numSwaps: parseInt(numSwaps.value),
            mergeName: mergeName.value,
            mergeColor: mergeColor.value,
            finalists: 3
        };
        tribes = [];
        for (let i = 0; i < settings.numTribes; i++) {
            const n = document.getElementById(`t-name-${i}`).value;
            const c = document.getElementById(`t-color-${i}`).value;
            tribes.push({ id: i, name: n, color: c, members: [] });
        }
        players = [];
        document.querySelectorAll('.cast-row').forEach((card, idx) => {
            const name = card.querySelector('.p-name').value;
            const tId = parseInt(card.querySelector('.p-tribe').value);
            const gender = card.querySelector('.p-gender').value;
            const stats = {
                PHY: parseInt(card.querySelector('.s-phy').value),
                STR: parseInt(card.querySelector('.s-str').value),
                SOC: parseInt(card.querySelector('.s-soc').value),
                LOY: parseInt(card.querySelector('.s-loy').value),
                INT: parseInt(card.querySelector('.s-int').value),
                TMP: parseInt(card.querySelector('.s-tmp').value)
            };
            const p = {
                id: idx, name: name, tribe: tId, originalTribe: tId, gender: gender,
                stats: stats, relationships: {}, items: [], status: "Active", history: [],
                votesReceived: 0, placement: null, bootOrder: 0
            };
            players.push(p);
            tribes[tId].members.push(idx);
        });
        players.forEach(p1 => {
            players.forEach(p2 => {
                if (p1.id !== p2.id) {
                    let base = 50;
                    if (p1.tribe === p2.tribe) base += Math.floor(Math.random() * 20);
                    p1.relationships[p2.id] = base;
                }
            });
        });
        const startCount = players.length;
        const roundsBeforeMerge = startCount - settings.mergeAt;
        if (settings.numSwaps > 0 && roundsBeforeMerge > 1) {
            let interval = Math.floor(roundsBeforeMerge / (settings.numSwaps + 1));
            if (interval < 1) interval = 1;
            for (let k = 1; k <= settings.numSwaps; k++) {
                swapSchedule.push(1 + (k * interval));
            }
        }
        eventsTarget = Math.floor(Math.random() * 6) + 5;
        bootOrder = 0;
        medevacCount = 0;
        updateMainButton();
        setupPhase.classList.add('hidden');
        gamePhase.classList.remove('hidden');
        window.sim.saveSnapshot();
        window.sim.updateUI();
    }

    /* ---------------- EVENT LISTENERS ---------------- */
    numTribes.addEventListener('change', updateTribeConfigInputs);
    generateCastBtn.addEventListener('click', generateCastForm);
    resumeGameBtn.addEventListener('click', () => window.sim.loadLocal());
    startGameBtn.addEventListener('click', startGame);
    importCastBtn.addEventListener('click', () => {
        castImportFile.value = '';
        castImportFile.click();
    });
    castImportFile.addEventListener('change', function(e) {
        const inputEl = e.target && e.target.nodeName === 'INPUT' ? e.target : castImportFile;
        importCastConfig(inputEl);
    });
    exportCastBtn.addEventListener('click', exportCastConfig);
    toggleStatLegendBtn.addEventListener('click', () => statLegend.classList.toggle('hidden'));
    randomizeAllBtn.addEventListener('click', randomizeAll);
    fillRandomNamesBtn.addEventListener('click', fillRandomNames);
    balanceTribesBtn.addEventListener('click', balanceTribesLogic);
    importSeasonBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => window.sim.importSeason(e.target));
    exportSeasonBtn.addEventListener('click', () => window.sim.exportSeason());
    navPrev.addEventListener('click', () => window.sim.navEpisode(-1));
    navNext.addEventListener('click', () => window.sim.navEpisode(1));
    btnSimEp.addEventListener('click', () => window.sim.simulateEpisode());
    btnMainAction.addEventListener('click', () => window.sim.mainAction());
    /* Leave Tribal e Read Vote gestiti solo da delegation su tribalSection per evitare doppia esecuzione (pulsante + bubble). */
    if (btnCloseTribalView) {
        btnCloseTribalView.addEventListener('click', function() {
            tribalSection.classList.add('hidden');
            btnCloseTribalView.classList.add('hidden');
        });
    }
    tribalSection.addEventListener('click', function(e) {
        const target = e.target;
        if (target && (target.id === 'btn-end-tribal' || target.closest('#btn-end-tribal'))) {
            e.preventDefault();
            e.stopPropagation();
            window.sim.endTribal();
            return;
        }
        if (target && (target.id === 'btn-read-vote' || target.closest('#btn-read-vote'))) {
            var btn = target.id === 'btn-read-vote' ? target : target.closest('#btn-read-vote');
            if (btn) {
                // If button has custom onclick handler, let it handle the event
                // But only if not disabled
                if (btn.disabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (btn.onclick && btn.onclick.toString().indexOf('stopPropagation') !== -1) {
                    // Button has custom handler, let it handle the event
                    return;
                }
                // Check button text to avoid conflicts
                if (btn.innerText) {
                    const btnText = btn.innerText;
                    if (btnText.indexOf('Deadlock') !== -1 || 
                        btnText.indexOf('Proceed to Revote') !== -1 ||
                        btnText.indexOf('Reveal Decision') !== -1) {
                        // Button has custom handler for these cases
                        return;
                    }
                }
                e.preventDefault();
                e.stopPropagation();
                // Call revealNextVote only when button shows "Show Next Vote" or "Read Revotes"
                window.sim.revealNextVote();
            }
        }
    });
    btnReadWinner.addEventListener('click', () => window.sim.readFinaleVote());

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            const tabId = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        });
    });

    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const key = this.dataset.sort;
            window.sim.sortStats(key);
        });
    });

    sortAlliances.addEventListener('click', () => window.sim.toggleAllianceSort());

    castContainer.addEventListener('change', function(e) {
        const select = e.target.closest('.p-tribe');
        if (select) updateCardColor(select);
    });

    if (localStorage.getItem('survivor_save')) {
        resumeGameBtn.classList.remove('hidden');
    }

    updateTribeConfigInputs();
});