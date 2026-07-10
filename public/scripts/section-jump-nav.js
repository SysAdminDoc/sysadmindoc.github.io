(function () {
  if (window.__sectionJumpNavMounted) return;
  window.__sectionJumpNavMounted = true;

  function mountJumpNav() {
    var navs = Array.from(document.querySelectorAll('[data-page-jump-nav]'));
    if (navs.length === 0) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    navs.forEach(function (nav) {
      var links = Array.from(nav.querySelectorAll('[data-page-jump-link]'));
      var targets = links
        .map(function (link) {
          var id = link.getAttribute('data-page-jump-link');
          return id ? document.getElementById(id) : null;
        })
        .filter(function (target) {
          return target instanceof HTMLElement;
        });

      if (links.length === 0 || targets.length === 0) return;

      function setActive(id) {
        links.forEach(function (link) {
          var isActive = link.getAttribute('data-page-jump-link') === id;
          link.classList.toggle('is-active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }

      links.forEach(function (link) {
        link.addEventListener('click', function (event) {
          var id = link.getAttribute('data-page-jump-link');
          if (!id) return;
          var target = document.getElementById(id);
          if (!(target instanceof HTMLElement)) return;

          event.preventDefault();
          var focusable = target.matches('a, button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
          if (!focusable && !target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex', '-1');
          }
          history.pushState(null, '', '#' + id);
          target.focus({ preventScroll: true });
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          setActive(id);
        });
      });

      var frame = 0;
      function syncActive() {
        var activeId = targets[0] && targets[0].id ? targets[0].id : '';
        for (var index = 0; index < targets.length; index += 1) {
          var target = targets[index];
          if (target.getBoundingClientRect().top <= 164) {
            activeId = target.id;
          } else {
            break;
          }
        }
        if (activeId) setActive(activeId);
      }

      function scheduleSync() {
        if (frame) return;
        frame = window.requestAnimationFrame(function () {
          frame = 0;
          syncActive();
        });
      }

      window.addEventListener('scroll', scheduleSync, { passive: true });
      window.addEventListener('resize', scheduleSync);
      window.addEventListener('hashchange', scheduleSync);

      var initialId = window.location.hash.replace(/^#/, '');
      try {
        initialId = decodeURIComponent(initialId);
      } catch (error) {
        initialId = '';
      }
      if (initialId) setActive(initialId);
      scheduleSync();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountJumpNav, { once: true });
  } else {
    mountJumpNav();
  }
})();
