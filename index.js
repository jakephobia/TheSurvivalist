document.addEventListener('DOMContentLoaded', function () {
  const toolPages = {
    sutral: 'sutral.html',
    simoa: 'simoa.html',
    edger: 'edger.html',
    outlist: 'outlist.html',
    smuffer: 'smuffer.html',
    tally: 'tally.html',
    torcha: 'torcha.html'
  };

  const listEl = document.getElementById('recentToolsList');
  const emptyEl = document.getElementById('recentToolsEmpty');

  if (listEl && emptyEl) {
    const recent = window.getRecentTools ? window.getRecentTools() : [];
    if (recent.length === 0) {
      listEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      var allowedPages = Object.keys(toolPages);
      var lowerToKey = {};
      allowedPages.forEach(function (k) { lowerToKey[k.toLowerCase()] = k; });
      var escapeHtml = (typeof window.escapeHtml === 'function') ? window.escapeHtml : function (s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
      };
      listEl.innerHTML = recent.map(function (e) {
        var rawPage = (e && e.page != null) ? String(e.page).trim() : '';
        var page = (rawPage && lowerToKey[rawPage.toLowerCase()]) ? lowerToKey[rawPage.toLowerCase()] : '';
        var href = page ? toolPages[page] : 'index.html';
        var label = (e && (e.label != null || e.page != null)) ? escapeHtml(String(e.label || e.page || '')) : '';
        var pageClass = page ? 'index-recent-item-' + page : '';
        return '<a href="' + escapeHtml(href) + '" class="index-recent-item ' + pageClass + '">' + label + '</a>';
      }).join('');
    }
  }

  var changelogEl = document.getElementById('indexChangelog');
  if (changelogEl) {
    var esc = (typeof window.escapeHtml === 'function') ? window.escapeHtml : function (s) {
      if (s == null) return '';
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    };
    fetch('changelog.json?v=' + Date.now()).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); }).then(function (arr) {
      if (!Array.isArray(arr) || arr.length === 0) { changelogEl.innerHTML = '<p class="index-card-sub">Nessuna voce.</p>'; return; }
      changelogEl.innerHTML = arr.map(function (e) {
        return '<div class="index-changelog-item"><span class="index-changelog-date">' + esc(e.date) + '</span><p>' + esc(e.text) + '</p></div>';
      }).join('');
    }).catch(function () {
      changelogEl.innerHTML = '<p class="index-card-sub">Changelog non disponibile.</p>';
    });
  }
});
