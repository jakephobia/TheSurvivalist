/**
 * Unified dark mode toggle - persists across all pages via localStorage
 */
(function () {
  const STORAGE_KEY = 'survivalist_theme';

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch (_) {
      return 'light';
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
    updateToggleLabel();
  }

  function updateToggleLabel() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = isDark ? '<span aria-hidden="true">☀</span> Light mode' : '<span aria-hidden="true">🌙</span> Night mode';
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Apply saved theme on load (run before paint when possible)
  const saved = getSavedTheme();
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Bind toggle when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      updateToggleLabel();
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.addEventListener('click', toggleTheme);
    });
  } else {
    updateToggleLabel();
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', toggleTheme);
  }
})();
