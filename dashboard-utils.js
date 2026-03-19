/**
 * Dashboard utilities - record tool usage for "Recent Tools" on index
 * and shared security helpers (escapeHtml for XSS prevention).
 */
(function () {
  /** Escape string for safe insertion into HTML (prevents XSS). */
  window.escapeHtml = function (s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };

  const STORAGE_KEY = 'survivalist_recent_tools';
  const MAX_ITEMS = 5;

  const TOOL_LABELS = {
    sutral: 'Sutral',
    simoa: 'Simoa',
    edger: 'Edger',
    outlist: 'Outlist',
    smuffer: 'Smuffer',
    tally: 'Tally',
    torcha: 'Torcha'
  };

  window.recordToolUsed = function (page) {
    try {
      const label = TOOL_LABELS[page] || page;
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('getRecentTools parse:', e);
      }
      const entry = { page, label, ts: Date.now() };
      list = list.filter(e => e.page !== page);
      list.unshift(entry);
      list = list.slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('recordToolUsed:', e);
    }
  };

  window.getRecentTools = function () {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('getRecentTools:', e);
      return [];
    }
  };

  function getExportDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function sanitizeSessionName(name) {
    if (!name || typeof name !== 'string') return 'Session';
    return name.trim().replace(/[\s\W]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Session';
  }

  window.getSessionFilename = function (tool, sessionName) {
    const toolUpper = String(tool || 'Session').toUpperCase();
    const session = sanitizeSessionName(sessionName);
    const date = getExportDate();
    return toolUpper + '_' + session + '_' + date + '.json';
  };

  window.getCastFilename = function () {
    return 'cast_' + getExportDate() + '.json';
  };

  const TOOL_PAGES = ['sutral', 'simoa', 'edger', 'outlist', 'smuffer', 'tally', 'torcha'];

  function getCurrentToolPage() {
    const body = document.body;
    if (!body || !body.classList) return null;
    for (const p of TOOL_PAGES) {
      if (body.classList.contains('page-' + p)) return p;
    }
    return null;
  }

  function onInteraction(ev) {
    const page = getCurrentToolPage();
    if (!page) return;
    const target = ev.target;
    if (target && target.closest && target.closest('.sidebar')) return;
    if (window.recordToolUsed) window.recordToolUsed(page);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractionTracking);
  } else {
    initInteractionTracking();
  }

  function initInteractionTracking() {
    const page = getCurrentToolPage();
    if (!page) return;
    if (window.recordToolUsed) window.recordToolUsed(page);
    ['click', 'input', 'change', 'keydown', 'drop', 'dragend'].forEach(function (type) {
      document.addEventListener(type, onInteraction, true);
    });
  }
})();
