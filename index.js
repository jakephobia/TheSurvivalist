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
      listEl.innerHTML = recent.map(function (e) {
        const href = toolPages[e.page] || e.page + '.html';
        const pageClass = e.page ? 'index-recent-item-' + e.page : '';
        return '<a href="' + href + '" class="index-recent-item ' + pageClass + '">' + (e.label || e.page) + '</a>';
      }).join('');
    }
  }
});
