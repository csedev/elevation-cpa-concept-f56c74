(function () {
  var d = document, w = window, html = d.documentElement;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  html.classList.add('js');
  var header = d.querySelector('[data-header]');
  var hero = d.querySelector('[data-hero]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', !hero || w.scrollY > 48);
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', onScroll);
  onScroll();
  // A page without a photo hero starts right below the fixed header: its height is measured, not guessed by the design
  // (a guess left an empty band under the header). Not while the phone menu is open, which makes the header taller.
  function offset() {
    if (!header || hero || header.classList.contains('menu-open')) return;
    html.style.setProperty('--header-offset', header.offsetHeight + 'px');
  }
  offset();
  w.addEventListener('resize', offset);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(offset);

  var toggle = d.querySelector('[data-menu-toggle]');
  if (toggle) {
    var menu = d.getElementById(toggle.getAttribute('aria-controls'));
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (menu) menu.classList.toggle('is-open', open);
      if (header) header.classList.toggle('menu-open', open);
      html.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); } });
    if (menu) menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false); });
  }
  d.querySelectorAll('[data-submenu-toggle]').forEach(function (b) {
    var sub = d.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (sub) sub.classList.toggle('is-open', open);
    });
  });

  var reveals = d.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in w)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el, i) { el.style.setProperty('--reveal-index', String(i % 6)); io.observe(el); });
  }

  d.querySelectorAll('[data-video]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-provider'), id = b.getAttribute('data-video-id');
      if (!id) return;
      var f = d.createElement('iframe');
      f.src = p === 'vimeo' ? 'https://player.vimeo.com/video/' + id + '?autoplay=1&dnt=1' : 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = b.getAttribute('data-title') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.className = 'video-frame';
      b.replaceWith(f);
      f.focus();
    });
  });

  // A region that scrolls sideways (a wide table on a phone) must be reachable by keyboard.
  d.querySelectorAll('main *').forEach(function (el) {
    var o = w.getComputedStyle(el).overflowX;
    if ((o !== 'auto' && o !== 'scroll') || el.scrollWidth <= el.clientWidth + 1 || el.querySelector('a[href],button,input,select,textarea,[tabindex]')) return;
    el.setAttribute('tabindex', '0');
    if (!el.getAttribute('role')) el.setAttribute('role', 'region');
    if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      var cap = el.querySelector('caption, h2, h3, h4');
      el.setAttribute('aria-label', cap ? cap.textContent.trim() + ' (scrolls sideways)' : 'Scrolls sideways');
    }
  });

  d.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = f.querySelector('[role=status]');
      if (!s) { s = d.createElement('p'); s.setAttribute('role', 'status'); f.appendChild(s); }
      s.textContent = 'This is a design concept, so the form doesn\u2019t send anything yet.';
    });
  });
})();
