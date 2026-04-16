/* Command palette (⌘K / Ctrl+K)
 * Shared across the whole site for project search, route jumps, and quick links. */
(function(){
  const data = window.__PORTFOLIO_DATA;
  if (!data) return;

  const backdrop = document.getElementById('cmdk');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  const meta = document.getElementById('cmdkMeta');
  const toggleBtn = document.getElementById('cmdkToggle');
  if (!backdrop || !input || !list) return;

  let selected = 0;
  let previousFocus = null;
  let previousBodyOverflow = '';
  let previousHtmlOverflow = '';
  let chordTimer = 0;
  let chordActive = false;
  const prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const routeColors = {
    blue: '#7cb8ff',
    green: '#4ade80',
    amber: '#e5b169',
    slate: '#8b9cc0',
  };
  const defaultProjectTypes = ['featured', 'live'];
  const chordMap = {
    f: '/#featured',
    l: '/#live',
    c: '/#catalog',
    s: '/#skills',
    a: '/#about',
    p: '/#philosophy',
    j: '/#journey',
    b: '/#beyond',
    r: '/releases/',
    n: '/now/',
    h: '/',
    t: '/healthcare-it/',
  };
  const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => _escMap[char]);
  }

  function highlightMatch(text, query) {
    const value = String(text == null ? '' : text);
    if (!query) return escapeHtml(value);
    const lowerValue = value.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerValue.indexOf(lowerQuery);
    if (index < 0) return escapeHtml(value);
    return escapeHtml(value.slice(0, index))
      + '<mark>' + escapeHtml(value.slice(index, index + query.length)) + '</mark>'
      + escapeHtml(value.slice(index + query.length));
  }

  function isTextEntryTarget(el) {
    return !!el && (
      el.tagName === 'INPUT'
      || el.tagName === 'TEXTAREA'
      || el.tagName === 'SELECT'
      || el.isContentEditable
    );
  }

  function setMeta(message) {
    if (meta) meta.textContent = message;
  }

  function focusTarget(target, hash) {
    if (!target) return;
    if (hash) {
      try {
        window.history.pushState(null, '', hash);
      } catch (error) {
        window.location.hash = hash;
      }
    }
    const hadTabIndex = target.hasAttribute('tabindex');
    if (!hadTabIndex) target.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        target.focus();
      }
      if (!hadTabIndex) {
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    });
  }

  function fuzzy(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = String(text == null ? '' : text).toLowerCase();
    const exact = t.indexOf(q);
    if (exact >= 0) return 1000 - exact;
    let qi = 0;
    let score = 0;
    let lastMatch = -2;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += ti === lastMatch + 1 ? 5 : 1;
        lastMatch = ti;
        qi++;
      }
    }
    return qi === q.length ? score : 0;
  }

  function getDefaultResults() {
    const quickLinks = Array.isArray(data.quickLinks) ? data.quickLinks.slice(0, 4) : [];
    const routes = quickLinks.map((link, index) => ({
      kind: 'route',
      score: 300 - index,
      groupLabel: 'Start Here',
      ...link,
    }));
    const sections = Array.isArray(data.sections)
      ? data.sections.slice(0, 3).map((section, index) => ({
          kind: 'section',
          score: 220 - index,
          groupLabel: 'Jump To',
          ...section,
        }))
      : [];
    const projects = defaultProjectTypes.flatMap((type, typeIndex) =>
      (Array.isArray(data.allProjects) ? data.allProjects : [])
        .filter(project => project.type === type)
        .slice(0, type === 'featured' ? 4 : 2)
        .map((project, projectIndex) => ({
          kind: 'project',
          score: 180 - (typeIndex * 10 + projectIndex),
          groupLabel: type === 'featured' ? 'Featured Projects' : 'Live Apps',
          ...project,
        })),
    );
    return [...routes, ...sections, ...projects];
  }

  function renderRows(rows, query) {
    const output = [];
    let lastGroup = '';
    rows.forEach((row, index) => {
      const groupLabel = row.groupLabel
        || (row.kind === 'project' ? 'Projects' : row.kind === 'route' ? 'Pages & Tracks' : 'Sections');
      if (groupLabel !== lastGroup) {
        output.push('<div class="cmdk-group-label">' + escapeHtml(groupLabel) + '</div>');
        lastGroup = groupLabel;
      }
      const dotColor = row.kind === 'route'
        ? (routeColors[row.tone] || '#8b9cc0')
        : row.kind === 'section'
          ? '#8b9cc0'
          : ({
              featured: '#4ade80',
              live: '#facc15',
              catalog: '#58a6ff',
            })[row.type] || '#7080a0';
      const badge = row.kind === 'project' ? row.type.toUpperCase() : (row.badge || 'SECTION');
      const subtitle = row.desc
        || (row.kind === 'project'
          ? ((row.categoryLabel || row.category) ? (row.categoryLabel || row.category) + ' project' : 'Open the project detail page.')
          : 'Open this route.');
      output.push(
        '<a class="cmdk-item" id="cmdk-option-' + index + '" data-idx="' + index + '" role="option" aria-selected="' + (index === 0 ? 'true' : 'false') + '" href="' + escapeHtml(row.href || row.url) + '"' + (row.external ? ' target="_blank" rel="noopener"' : '') + '>'
        + '<span class="cmdk-dot" style="background:' + dotColor + ';color:' + dotColor + '"></span>'
        + '<span class="cmdk-copy">'
        + '<span class="cmdk-title-row">'
        + '<span class="cmdk-title">' + highlightMatch(row.label || row.name, query) + '</span>'
        + '<span class="cmdk-badge">' + escapeHtml(badge) + '</span>'
        + '</span>'
        + '<span class="cmdk-subtitle">' + highlightMatch(subtitle, query) + '</span>'
        + '</span>'
        + '</a>',
      );
    });
    return output.join('');
  }

  function render(query) {
    const q = query.trim();
    if (!q) {
      const starterResults = getDefaultResults();
      selected = 0;
      setMeta('Search the archive, jump through this page, or open a key route.');
      list.innerHTML = renderRows(starterResults, q);
      setSelected(0);
      return;
    }

    const results = [];
    if (Array.isArray(data.quickLinks)) {
      data.quickLinks.forEach(link => {
        const termScores = [
          fuzzy(q, link.label),
          fuzzy(q, link.desc || '') * 0.7,
          fuzzy(q, link.url || '') * 0.25,
        ];
        if (Array.isArray(link.searchTerms)) {
          link.searchTerms.forEach(term => termScores.push(fuzzy(q, term) * 0.8));
        }
        const score = Math.max(...termScores);
        if (score > 0) results.push({ kind: 'route', score, groupLabel: 'Pages & Tracks', ...link });
      });
    }
    if (Array.isArray(data.sections)) {
      data.sections.forEach(section => {
        const score = Math.max(
          fuzzy(q, section.label),
          fuzzy(q, section.desc || '') * 0.7,
          fuzzy(q, section.href || '') * 0.2,
        );
        if (score > 0) results.push({ kind: 'section', score, groupLabel: 'Sections', ...section });
      });
    }
    if (Array.isArray(data.allProjects)) {
      data.allProjects.forEach(project => {
        const termScores = [
          fuzzy(q, project.name),
          fuzzy(q, project.slug) * 0.95,
          fuzzy(q, project.desc) * 0.5,
          fuzzy(q, project.categoryLabel || project.category || '') * 0.8,
        ];
        if (Array.isArray(project.searchTerms)) {
          project.searchTerms.forEach(term => termScores.push(fuzzy(q, term) * 0.75));
        }
        const score = Math.max(...termScores);
        if (score > 0) results.push({ kind: 'project', score, groupLabel: 'Projects', ...project });
      });
    }

    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 30);
    if (!top.length) {
      selected = 0;
      input.setAttribute('aria-activedescendant', '');
      setMeta('Nothing matched that search. Try a project name, page, category, or section.');
      list.innerHTML = '<div class="cmdk-empty">Nothing matched that search. Try a project name, page, category, or section.</div>';
      return;
    }
    setMeta(top.length === 1 ? '1 match ready to open.' : top.length + ' matches ready to open.');
    list.innerHTML = renderRows(top, q);
    setSelected(0);
  }

  function setExpanded(isOpen) {
    toggleBtn?.setAttribute('aria-expanded', String(isOpen));
    input.setAttribute('aria-expanded', String(isOpen));
    backdrop.setAttribute('aria-hidden', String(!isOpen));
  }

  function getFocusableElements() {
    return [input, ...list.querySelectorAll('.cmdk-item')];
  }

  function setSelected(nextIndex) {
    const nodes = list.querySelectorAll('.cmdk-item');
    if (!nodes.length) {
      selected = 0;
      input.setAttribute('aria-activedescendant', '');
      return;
    }
    nodes[selected]?.setAttribute('aria-selected', 'false');
    selected = ((nextIndex % nodes.length) + nodes.length) % nodes.length;
    const target = nodes[selected];
    if (!target) return;
    target.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', target.id || '');
  }

  function navigateTo(href) {
    if (!href) return;
    if (href.startsWith('#')) {
      const section = document.querySelector(href);
      if (section) {
        section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        focusTarget(section, href);
        return;
      }
      window.location.hash = href;
      return;
    }

    let url;
    try {
      url = new URL(href, window.location.origin);
    } catch (error) {
      window.location.assign(href);
      return;
    }

    const isSamePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (isSamePage && url.hash) {
      const target = document.querySelector(url.hash);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        focusTarget(target, url.hash);
        return;
      }
    }
    window.location.assign(href);
  }

  function open() {
    if (backdrop.classList.contains('open')) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    backdrop.classList.add('open');
    input.value = '';
    render('');
    list.scrollTop = 0;
    setExpanded(true);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 20);
  }

  function close(options = {}) {
    if (!backdrop.classList.contains('open')) return;
    const restoreFocus = options.restoreFocus !== false;
    backdrop.classList.remove('open');
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    input.setAttribute('aria-activedescendant', '');
    setExpanded(false);
    if (restoreFocus && previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function updateSelection(delta) {
    const nodes = list.querySelectorAll('.cmdk-item');
    if (!nodes.length) return;
    setSelected(selected + delta);
    const target = nodes[selected];
    target.scrollIntoView({ block: 'nearest' });
  }

  function showHint(message) {
    let hint = document.getElementById('chordHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'chordHint';
      hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--bg2);border:1px solid var(--glass-border);color:var(--t1);padding:10px 16px;border-radius:10px;font-family:var(--mono);font-size:13px;z-index:99997;opacity:0;transition:opacity .2s;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4)';
      document.body.appendChild(hint);
    }
    hint.textContent = message;
    hint.style.opacity = '1';
    clearTimeout(hint._t);
    hint._t = setTimeout(() => { hint.style.opacity = '0'; }, 1200);
  }

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      backdrop.classList.contains('open') ? close() : open();
      return;
    }
    if (event.key === '/' && !backdrop.classList.contains('open')) {
      const focused = document.activeElement;
      if (focused && isTextEntryTarget(focused)) return;
      event.preventDefault();
      open();
    }
  });

  document.addEventListener('keydown', event => {
    if (backdrop.classList.contains('open')) return;
    const focused = document.activeElement;
    if (focused && isTextEntryTarget(focused)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (!chordActive && event.key === 'g') {
      chordActive = true;
      showHint('g → quick jump (f/l/c/s/a/p/j/b/r/n/h/t)');
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => { chordActive = false; }, 1500);
      return;
    }
    if (!chordActive) return;

    const target = chordMap[event.key.toLowerCase()];
    chordActive = false;
    clearTimeout(chordTimer);
    if (target) {
      event.preventDefault();
      navigateTo(target);
      showHint('→ ' + target.replace('/#', '#'));
    }
  });

  toggleBtn?.addEventListener('click', () => {
    backdrop.classList.contains('open') ? close() : open();
  });
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });
  backdrop.addEventListener('keydown', event => {
    if (!backdrop.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements().filter(el => el && typeof el.focus === 'function');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  input.addEventListener('input', event => render(event.target.value));
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      updateSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      updateSelection(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = list.querySelectorAll('.cmdk-item')[selected];
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;
      if (target.target === '_blank') {
        window.open(target.href, '_blank', 'noopener');
      } else {
        navigateTo(href);
      }
      close({ restoreFocus: false });
    }
  });

  list.addEventListener('click', event => {
    const item = event.target instanceof Element ? event.target.closest('.cmdk-item') : null;
    if (!item) return;
    const index = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(index)) setSelected(index);
    if (item.target === '_blank') {
      close({ restoreFocus: false });
      return;
    }
    event.preventDefault();
    navigateTo(item.getAttribute('href') || '');
    close({ restoreFocus: false });
  });
  list.addEventListener('mouseover', event => {
    const item = event.target instanceof Element ? event.target.closest('.cmdk-item') : null;
    if (!item) return;
    const index = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(index) && index !== selected) setSelected(index);
  });
  list.addEventListener('focusin', event => {
    const item = event.target instanceof Element ? event.target.closest('.cmdk-item') : null;
    if (!item) return;
    const index = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(index)) setSelected(index);
  });
})();
