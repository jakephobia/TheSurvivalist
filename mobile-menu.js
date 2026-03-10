/**
 * Mobile menu toggle - hamburger opens/closes sidebar overlay.
 * Only relevant when body.mobile-view is present.
 */
(function() {
  function init() {
    var btn = document.getElementById('mobileMenuBtn');
    var backdrop = document.getElementById('mobileMenuBackdrop');
    var navLinks = document.querySelectorAll('.sidebar-nav .nav-item');

    if (!btn || !backdrop) return;

    function openMenu() {
      document.body.classList.add('mobile-menu-open');
    }

    function closeMenu() {
      document.body.classList.remove('mobile-menu-open');
    }

    btn.addEventListener('click', function() {
      if (document.body.classList.contains('mobile-menu-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    backdrop.addEventListener('click', closeMenu);

    navLinks.forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
