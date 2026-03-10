/**
 * Mobile detection for The Survivalist - applies mobile-view class only when
 * viewport is mobile-sized. Load this script at start of body so document.body exists.
 */
(function() {
  var mq = window.matchMedia('(max-width: 850px)');

  function updateMobileClass() {
    if (mq.matches) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }

  updateMobileClass();
  mq.addEventListener('change', updateMobileClass);
})();
