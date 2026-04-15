/* Command palette (⌘K / Ctrl+K)
 * Fuzzy search across all projects + section jumps.
 * Data is injected via window.__PORTFOLIO_DATA at build time. */
(function(){
  const data = window.__PORTFOLIO_DATA;
  if (!data) return;

  const backdrop = document.getElementById('cmdk');
  const panel = backdrop?.querySelector('.cmdk');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  const toggleBtn = document.getElementById('cmdkToggle');
  if (!backdrop || !panel || !input || !list) return;

  let selected = 0;
  let items = [];
  let previousFocus = null;
  let previousBodyOverflow = '';
  let previousHtmlOverflow = '';
  const prefersReducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sectionHints = {
    '#featured': 'Flagship builds with the sharpest product and systems thinking.',
    '#live': 'Launch-ready browser apps with no setup wall.',
    '#catalog': 'Every public repo, filterable by language and domain.',
    '#skills': 'Languages, tooling, and where the work clusters.',
    '#about': 'Background, operating style, and what drives the work.',
    '#philosophy': 'The product standards behind every repo.',
    '#journey': 'How the portfolio expanded across platforms.',
    '#beyond': 'Drone work, music, and the rest of the creative output.',
    '#connect': 'Best ways to collaborate and what to bring.',
    '#hero': 'Portfolio overview, live stats, and the interactive shell.',
  };
  function isTextEntryTarget(el) {
    return !!el && (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable
    );
  }

  // Simple subsequence fuzzy match with score = inverse index of first char
  function fuzzy(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    // Exact substring wins hardest
    const idx = t.indexOf(q);
    if (idx >= 0) return 1000 - idx;
    // Subsequence
    let qi = 0, score = 0, lastMatch = -2;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += (ti === lastMatch + 1 ? 5 : 1);
        lastMatch = ti;
        qi++;
      }
    }
    return qi === q.length ? score : 0;
  }

  function render(query) {
    const q = query.trim();
    const results = [];
    // Sections always first if matching
    data.sections.forEach(s => {
      const score = fuzzy(q, s.label);
      if (score > 0) results.push({ kind: 'section', score, label: s.label, hash: '#' + s.id });
    });
    // Projects
    data.allProjects.forEach(p => {
      const termScores = [
        fuzzy(q, p.name),
        fuzzy(q, p.slug) * 0.95,
        fuzzy(q, p.desc) * 0.5,
        fuzzy(q, p.categoryLabel || p.category || '') * 0.8,
      ];
      if (Array.isArray(p.searchTerms)) {
        p.searchTerms.forEach(term => termScores.push(fuzzy(q, term) * 0.75));
      }
      const score = Math.max(...termScores);
      if (score > 0) results.push({ kind: 'project', score, ...p });
    });
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 30);
    items = top;
    if (top.length === 0) {
      selected = 0;
      input.setAttribute('aria-activedescendant', '');
      list.innerHTML = '<div class="cmdk-empty">No matches yet. Try a project name, category, or section.</div>';
      return;
    }
    const rows = [];
    let lastKind = '';
    top.forEach((r, i) => {
      if (r.kind !== lastKind) {
        rows.push('<div class="cmdk-group-label">' + (r.kind === 'section' ? 'Go to' : 'Projects') + '</div>');
        lastKind = r.kind;
      }
      const dotColor = r.kind === 'section' ? '#8b9cc0' : ({
        featured: '#4ade80', live: '#facc15', catalog: '#58a6ff'
      })[r.type] || '#7080a0';
      const badge = r.kind === 'project' ? r.type.toUpperCase() : 'SECTION';
      const subtitle = r.kind === 'section'
        ? sectionHints[r.hash] || 'Jump to this section.'
        : r.desc || ((r.categoryLabel || r.category) ? (r.categoryLabel || r.category) + ' project' : 'Open the project detail page.');
      const safeSubtitle = escapeHtml(subtitle);
      rows.push(
        '<a class="cmdk-item" id="cmdk-option-' + i + '" data-idx="' + i + '" role="option" aria-selected="' + (i === 0 ? 'true' : 'false') + '" href="' + (r.kind === 'section' ? r.hash : r.url) + '">'
        + '<span class="cmdk-dot" style="background:' + dotColor + ';color:' + dotColor + '"></span>'
        + '<span class="cmdk-copy">'
        + '<span class="cmdk-title-row">'
        + '<span class="cmdk-title">' + escapeHtml(r.label || r.name) + '</span>'
        + '<span class="cmdk-badge">' + badge + '</span>'
        + '</span>'
        + '<span class="cmdk-subtitle">' + safeSubtitle + '</span>'
        + '</span>'
        + '</a>'
      );
    });
    list.innerHTML = rows.join('');
    setSelected(0);
  }

  const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => _escMap[c]);
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

  function open() {
    if (backdrop.classList.contains('open')) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    backdrop.classList.add('open');
    input.value = '';
    render('');
    list.scrollTop = 0;
    setTimeout(() => input.focus(), 20);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    setExpanded(true);
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

  // Global hotkey: Ctrl/Cmd+K toggle, / open, Esc close
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      backdrop.classList.contains('open') ? close() : open();
    }
    if (e.key === '/' && !backdrop.classList.contains('open')) {
      const focused = document.activeElement;
      if (focused && isTextEntryTarget(focused)) return;
      e.preventDefault();
      open();
    }
  });

  // Vim-style chord navigation: g<letter> jumps to section
  const chordMap = {
    f: '#featured', l: '#live', c: '#catalog', s: '#skills',
    a: '#about', p: '#philosophy', j: '#journey', b: '#beyond',
    n: '#connect', h: '#hero', t: '#hero'
  };
  let chordTimer = null;
  let chordActive = false;
  function showHint(msg) {
    let hint = document.getElementById('chordHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'chordHint';
      hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--bg2);border:1px solid var(--glass-border);color:var(--t1);padding:10px 16px;border-radius:10px;font-family:var(--mono);font-size:13px;z-index:99997;opacity:0;transition:opacity .2s;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4)';
      document.body.appendChild(hint);
    }
    hint.textContent = msg;
    hint.style.opacity = '1';
    clearTimeout(hint._t);
    hint._t = setTimeout(() => { hint.style.opacity = '0'; }, 1200);
  }
  document.addEventListener('keydown', e => {
    if (backdrop.classList.contains('open')) return;
    const focused = document.activeElement;
    if (focused && isTextEntryTarget(focused)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (!chordActive && e.key === 'g') {
      chordActive = true;
      showHint('g → section (f/l/c/s/a/p/j/b/n)');
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => { chordActive = false; }, 1500);
      return;
    }
    if (chordActive) {
      const target = chordMap[e.key.toLowerCase()];
      chordActive = false;
      clearTimeout(chordTimer);
      if (target) {
        e.preventDefault();
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
          showHint('→ ' + target);
        }
      }
    }
  });

  toggleBtn?.addEventListener('click', () => {
    backdrop.classList.contains('open') ? close() : open();
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.addEventListener('keydown', e => {
    if (!backdrop.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements().filter(el => el && typeof el.focus === 'function');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); updateSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); updateSelection(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = list.querySelectorAll('.cmdk-item')[selected];
      if (target) {
        const href = target.getAttribute('href');
        if (!href) return;
        if (target.target === '_blank') {
          window.open(target.href, '_blank', 'noopener');
        } else if (href.startsWith('#')) {
          const section = document.querySelector(href);
          if (section) section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
          else location.hash = href;
        } else {
          window.location.assign(href);
        }
        close({ restoreFocus: false });
      }
    }
  });
  list.addEventListener('click', e => {
    const item = e.target instanceof Element ? e.target.closest('.cmdk-item') : null;
    if (!item) return;
    const idx = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(idx)) setSelected(idx);
    const href = item.getAttribute('href') || '';
    if (href.startsWith('#')) setTimeout(() => close({ restoreFocus: false }), 50);
    else close({ restoreFocus: false });
  });
  list.addEventListener('mouseover', e => {
    const item = e.target instanceof Element ? e.target.closest('.cmdk-item') : null;
    if (!item) return;
    const idx = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(idx) && idx !== selected) setSelected(idx);
  });
  list.addEventListener('focusin', e => {
    const item = e.target instanceof Element ? e.target.closest('.cmdk-item') : null;
    if (!item) return;
    const idx = Number(item.getAttribute('data-idx'));
    if (!Number.isNaN(idx)) setSelected(idx);
  });
})();
