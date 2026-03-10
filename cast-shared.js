/**
 * Survivalist Cast - Unified Format
 * Shared across Sutral, Simoa, Edger, Smuffer, Tally.
 * Fields: name, gender, tribe, stats (from Simoa).
 * Each tool imports only the applicable fields, ignoring the rest.
 */
(function(global) {
    'use strict';

    const FORMAT_VERSION = 1;
    const FORMAT_ID = 'survivalist_cast';

    const DEFAULT_STATS = { PHY: 5, STR: 5, SOC: 5, LOY: 5, INT: 5, TMP: 5 };

    /**
     * Create a cast object in unified format
     * @param {Object} opts - { players, tribes, seasonName }
     * @returns {Object} JSON ready for export
     */
    function createUnifiedCast(opts) {
        const players = (opts.players || []).map(p => ({
            nome: String(p.nome || p.name || '').trim(),
            sesso: p.sesso || p.gender || 'M',
            tribe: p.tribe != null ? String(p.tribe) : '',
            statistiche: Object.assign({}, DEFAULT_STATS, p.statistiche || p.stats || {})
        })).filter(p => p.nome);

        const tribes = (opts.tribes || []).map(t => ({
            nome: String(t.nome || t.name || '').trim(),
            colore: t.colore || t.color || '#888888'
        })).filter(t => t.nome);

        return {
            version: FORMAT_VERSION,
            format: FORMAT_ID,
            seasonName: opts.seasonName || '',
            players,
            tribes
        };
    }

    /**
     * Validate and parse a unified cast JSON file
     * @param {string} jsonStr
     * @returns {{ valid: boolean, data?: Object, error?: string }}
     */
    function parseUnifiedCast(jsonStr) {
        try {
            const raw = JSON.parse(jsonStr);
            if (!raw || typeof raw !== 'object') {
                return { valid: false, error: 'Invalid JSON' };
            }
            // Support both unified format and legacy Simoa format
            let players = [];
            let tribes = [];
            let seasonName = '';

            if (raw.format === FORMAT_ID && Array.isArray(raw.players)) {
                players = raw.players;
                tribes = raw.tribes || [];
                seasonName = raw.seasonName || '';
            } else if (raw.players && Array.isArray(raw.players) && raw.tribes && Array.isArray(raw.tribes)) {
                // Legacy Simoa format: { players: [{name, gender, tribe, stats}], tribes: [{name, color}] }
                players = raw.players.map(p => ({
                    nome: p.name || p.nome || '',
                    sesso: p.gender || p.sesso || 'M',
                    tribe: (() => {
                        const tid = p.tribe;
                        if (typeof tid === 'number' && raw.tribes[tid]) {
                            return raw.tribes[tid].name || raw.tribes[tid].nome || '';
                        }
                        return tid != null ? String(tid) : '';
                    })(),
                    statistiche: Object.assign({}, DEFAULT_STATS, p.stats || p.statistiche || {})
                }));
                tribes = raw.tribes.map(t => ({
                    nome: t.name || t.nome || '',
                    colore: t.color || t.colore || '#888888'
                }));
                seasonName = raw.seasonName || '';
            } else {
                return { valid: false, error: 'Unrecognized cast format. Use export from Simoa or survivalist_cast format.' };
            }

            return {
                valid: true,
                data: createUnifiedCast({ players, tribes, seasonName })
            };
        } catch (e) {
            return { valid: false, error: e.message || 'Error parsing file' };
        }
    }

    /**
     * Extract data for SUTRAL (names only)
     */
    function forSutral(data) {
        return (data.players || []).map(p => p.nome).filter(Boolean);
    }

    /**
     * Extract data for SIMOA (name, gender, tribe index, stats)
     */
    function forSimoa(data) {
        const tribes = data.tribes || [];
        return (data.players || []).map(p => {
            const tribeIdx = tribes.findIndex(t =>
                (t.nome || t.name || '').toLowerCase() === (p.tribe || '').toLowerCase()
            );
            return {
                name: p.nome,
                gender: p.sesso || 'M',
                tribe: tribeIdx >= 0 ? tribeIdx : 0,
                stats: Object.assign({}, DEFAULT_STATS, p.statistiche || {})
            };
        });
    }

    /**
     * Extract data for EDGER (names only)
     */
    function forEdger(data) {
        return (data.players || []).map(p => p.nome).filter(Boolean);
    }

    /**
     * Extract data for SMUFFER (names + tribe name for initial assign)
     * Smuffer assigns tribe later; tribe name can be used for matching
     */
    function forSmuffer(data) {
        return (data.players || []).map(p => ({
            name: p.nome,
            tribeName: p.tribe || ''
        }));
    }

    /**
     * Extract data for TALLY (castaway names only)
     */
    function forTally(data) {
        return (data.players || []).map(p => p.nome).filter(Boolean);
    }

    global.CastShared = {
        FORMAT_VERSION,
        FORMAT_ID,
        DEFAULT_STATS,
        createUnifiedCast,
        parseUnifiedCast,
        forSutral,
        forSimoa,
        forEdger,
        forSmuffer,
        forTally
    };
})(typeof window !== 'undefined' ? window : globalThis);
