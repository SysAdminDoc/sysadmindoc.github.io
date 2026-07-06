/* Command palette shared across the whole site for project search, route jumps, and quick links. */
(function(){
  function readJsonScript(id) {
    const node = document.getElementById(id);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || 'null');
    } catch (error) {
      return null;
    }
  }

  const sections = readJsonScript('cmdk-sections-data');
  const data = Object.assign(window.__PORTFOLIO_DATA || {}, Array.isArray(sections) ? { sections } : {});
  window.__PORTFOLIO_DATA = data;
  if (!Array.isArray(data.allProjects) && !Array.isArray(data.quickLinks) && !Array.isArray(data.sections)) return;

  const backdrop = document.getElementById('cmdk');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  const meta = document.getElementById('cmdkMeta');
  const toggleBtn = document.getElementById('cmdkToggle');
  const closeBtn = document.getElementById('cmdkClose');
  if (!backdrop || !input || !list) return;

  let selected = 0;
  let previousFocus = null;
  /* prefersReducedMotion — loaded from shared.js */
  const routeDotTones = {
    blue: 'blue',
    green: 'green',
    amber: 'amber',
    slate: 'slate',
  };
  const defaultProjectTypes = ['featured', 'live'];
  const cmdkTitleClass = 'cmdk-title';
  const cmdkSubtitleClass = 'cmdk-subtitle';
  /* isTextEntryTarget, SafeDOM — loaded from shared.js */
  const dom = window.SafeDOM || {};
  const replaceChildren = dom.replaceChildren || function (node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    for (let i = 1; i < arguments.length; i++) {
      if (arguments[i]) node.appendChild(arguments[i]);
    }
  };
  const appendHighlightedTextSafe = dom.appendHighlightedText || function (node, text) {
    node.textContent = String(text == null ? '' : text);
  };

  function highlightedSpan(className, text, query) {
    const span = document.createElement('span');
    span.className = className;
    appendHighlightedTextSafe(span, text, query);
    return span;
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

  function revealHashTarget(target) {
    if (!target) return;
    const homepage = window.PortfolioHome || {};
    if (typeof homepage.revealHomepageScrollSections === 'function') {
      try {
        homepage.revealHomepageScrollSections();
      } catch (error) {
        /* non-critical enhancement */
      }
    }
  }

  function activateHashTarget(target, hash) {
    revealHashTarget(target);
    window.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL = Date.now() + 2200;
    const homepage = window.PortfolioHome || {};
    if (typeof homepage.cancelHomepageHashRestore === 'function') {
      homepage.cancelHomepageHashRestore();
    }
    const jump = forceAuto => {
      target.scrollIntoView({ behavior: forceAuto || prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (hash) {
        try {
          window.history.replaceState(null, '', hash);
        } catch (error) {
          window.location.hash = hash;
        }
      }
    };
    jump(false);
    requestAnimationFrame(() => {
      jump(true);
      focusTarget(target, hash);
    });
    setTimeout(() => jump(true), 350);
    setTimeout(() => {
      if (typeof homepage.restoreHomepageHashTarget === 'function') {
        homepage.restoreHomepageHashTarget(hash);
      } else {
        jump(true);
      }
    }, 900);
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

  function getRecentlyViewed() {
    let slugs = [];
    try { slugs = JSON.parse(localStorage.getItem('recently_viewed') || '[]'); } catch (e) { /* unavailable */ }
    if (!Array.isArray(slugs) || !slugs.length) return [];
    const bySlug = new Map((Array.isArray(data.allProjects) ? data.allProjects : []).map(p => [p.slug, p]));
    const out = [];
    slugs.forEach((slug, i) => {
      const project = bySlug.get(slug);
      if (project) out.push({ kind: 'project', score: 400 - i, groupLabel: 'Recently Viewed', ...project });
    });
    return out.slice(0, 4);
  }

  function getDefaultResults() {
    const recent = getRecentlyViewed();
    const recentSlugs = new Set(recent.map(r => r.slug));
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
        .filter(project => project.type === type && !recentSlugs.has(project.slug))
        .slice(0, type === 'featured' ? 4 : 2)
        .map((project, projectIndex) => ({
          kind: 'project',
          score: 180 - (typeIndex * 10 + projectIndex),
          groupLabel: type === 'featured' ? 'Featured Projects' : 'Live Apps',
          ...project,
        })),
    );
    return [...recent, ...routes, ...sections, ...projects];
  }

  function renderRows(rows, query) {
    const fragment = document.createDocumentFragment();
    let lastGroup = '';
    rows.forEach((row, index) => {
      const groupLabel = row.groupLabel
        || (row.kind === 'project' ? 'Projects' : row.kind === 'route' ? 'Pages & Tracks' : 'Sections');
      if (groupLabel !== lastGroup) {
        const group = document.createElement('div');
        group.className = 'cmdk-group-label';
        group.textContent = groupLabel;
        fragment.appendChild(group);
        lastGroup = groupLabel;
      }
      const dotTone = row.kind === 'route'
        ? (routeDotTones[row.tone] || 'slate')
        : row.kind === 'section'
          ? 'slate'
          : ({
              featured: 'green',
              live: 'amber',
              catalog: 'blue',
            })[row.type] || 'slate';
      const badge = row.kind === 'project' ? (row.type || 'project').toUpperCase() : (row.badge || 'SECTION');
      const subtitle = row.desc
        || (row.kind === 'project'
          ? ((row.categoryLabel || row.category) ? (row.categoryLabel || row.category) + ' project' : 'Open the project detail page.')
          : 'Open this route.');
      const item = document.createElement('div');
      item.className = 'cmdk-item';
      item.id = 'cmdk-option-' + index;
      item.dataset.idx = String(index);
      item.dataset.href = String(row.href || row.url || '');
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      if (row.external) item.dataset.external = 'true';

      const dot = document.createElement('span');
      dot.className = 'cmdk-dot cmdk-dot-' + dotTone;
      const copy = document.createElement('span');
      copy.className = 'cmdk-copy';
      const titleRow = document.createElement('span');
      titleRow.className = 'cmdk-title-row';
      const badgeNode = document.createElement('span');
      badgeNode.className = 'cmdk-badge';
      badgeNode.textContent = badge;

      titleRow.appendChild(highlightedSpan(cmdkTitleClass, row.label || row.name, query));
      titleRow.appendChild(badgeNode);
      copy.appendChild(titleRow);
      copy.appendChild(highlightedSpan(cmdkSubtitleClass, subtitle, query));
      item.appendChild(dot);
      item.appendChild(copy);
      fragment.appendChild(item);
    });
    return fragment;
  }

  function renderEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'cmdk-empty';
    const strong = document.createElement('strong');
    strong.textContent = 'Nothing matched that search';
    const span = document.createElement('span');
    span.textContent = 'Try a project name, stack, category, or route.';
    empty.appendChild(strong);
    empty.appendChild(span);
    return empty;
  }

  let renderedQuery = '';

  function render(query) {
    renderedQuery = query;
    const q = query.trim();
    if (!q) {
      const starterResults = getDefaultResults();
      selected = 0;
      setMeta('Search the archive, jump through this page, or open a key route.');
      replaceChildren(list, renderRows(starterResults, q));
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
      setMeta('Nothing matched that search. Try a project name, stack, category, or route.');
      replaceChildren(list, renderEmptyState());
      return;
    }
    setMeta(top.length === 1 ? '1 match ready to open.' : top.length + ' matches ready to open.');
    replaceChildren(list, renderRows(top, q));
    setSelected(0);
  }

  function setExpanded(isOpen) {
    toggleBtn?.setAttribute('aria-expanded', String(isOpen));
    input.setAttribute('aria-expanded', String(isOpen));
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
        activateHashTarget(section, href);
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
        activateHashTarget(target, url.hash);
        return;
      }
    }
    window.location.assign(href);
  }

  function open() {
    if (backdrop.open) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.value = '';
    render('');
    list.scrollTop = 0;
    backdrop.showModal();
    setExpanded(true);
    setTimeout(() => input.focus(), 20);
  }

  function close(options) {
    options = options || {};
    if (!backdrop.open) return;
    var restoreFocus = options.restoreFocus !== false;
    backdrop.close();
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

  document.addEventListener('keydown', event => {
    if (backdrop.open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }, true);

  toggleBtn?.addEventListener('click', () => {
    backdrop.open ? close() : open();
  });
  closeBtn?.addEventListener('click', () => close());
  /* Native <dialog> fires 'cancel' on Escape — close cleanly */
  backdrop.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  /* Click on the ::backdrop (rendered by <dialog>) lands on the dialog element itself */
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });

  let renderDebounce = 0;
  function flushPendingRender() {
    clearTimeout(renderDebounce);
    renderDebounce = 0;
    if (renderedQuery !== input.value) render(input.value);
  }

  // Debounce the filter so rapid typing doesn't run a full-catalog pass on every
  // keystroke (keeps INP low as the project list grows). Keyboard actions flush
  // this queue first so Enter never opens a stale default result.
  input.addEventListener('input', event => {
    const value = event.target.value;
    clearTimeout(renderDebounce);
    renderDebounce = setTimeout(() => {
      renderDebounce = 0;
      render(value);
    }, 60);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      flushPendingRender();
      updateSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      flushPendingRender();
      updateSelection(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      flushPendingRender();
      const target = list.querySelectorAll('.cmdk-item')[selected];
      if (!target) return;
      const href = target.getAttribute('data-href');
      if (!href) return;
      if (target.getAttribute('data-external') === 'true') {
        window.open(href, '_blank', 'noopener');
      } else {
        close({ restoreFocus: false });
        navigateTo(href);
      }
    }
  });

  list.addEventListener('click', event => {
    const item = event.target instanceof Element ? event.target.closest('.cmdk-item') : null;
    if (!item) return;
    const index = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(index)) setSelected(index);
    const href = item.getAttribute('data-href') || '';
    if (item.getAttribute('data-external') === 'true') {
      if (href) window.open(href, '_blank', 'noopener');
      close({ restoreFocus: false });
      return;
    }
    event.preventDefault();
    close({ restoreFocus: false });
    navigateTo(href);
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
  window.__PORTFOLIO_CMDK = {
    open,
    close,
    toggle() {
      backdrop.open ? close() : open();
    },
  };
  window.dispatchEvent(new CustomEvent('portfolio:cmdk-ready'));
})();
