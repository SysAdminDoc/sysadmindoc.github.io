/* Command palette (⌘K / Ctrl+K)
 * Fuzzy search across all projects + section jumps.
 * Data is injected via window.__PORTFOLIO_DATA at build time. */
(function(){
  const data = window.__PORTFOLIO_DATA;
  if (!data) return;

  const backdrop = document.getElementById('cmdk');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  const toggleBtn = document.getElementById('cmdkToggle');
  if (!backdrop || !input || !list) return;

  let selected = 0;
  let items = [];

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
      const score = Math.max(fuzzy(q, p.name), fuzzy(q, p.desc) * 0.5);
      if (score > 0) results.push({ kind: 'project', score, ...p });
    });
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 30);
    items = top;
    selected = 0;
    if (top.length === 0) {
      list.innerHTML = '<div class="cmdk-empty">No matches. Try a different term.</div>';
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
      rows.push(
        '<a class="cmdk-item" data-idx="' + i + '" role="option" aria-selected="' + (i === 0 ? 'true' : 'false') + '" href="' + (r.kind === 'section' ? r.hash : r.url) + '"' + (r.kind === 'project' ? ' target="_blank" rel="noopener"' : '') + '>'
        + '<span class="cmdk-dot" style="background:' + dotColor + '"></span>'
        + '<span class="cmdk-title">' + escapeHtml(r.label || r.name) + '</span>'
        + '<span class="cmdk-badge">' + badge + '</span>'
        + '</a>'
      );
    });
    list.innerHTML = rows.join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function open() {
    backdrop.classList.add('open');
    input.value = '';
    render('');
    setTimeout(() => input.focus(), 20);
    document.body.style.overflow = 'hidden';
  }
  function close() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateSelection(delta) {
    const nodes = list.querySelectorAll('.cmdk-item');
    if (!nodes.length) return;
    nodes[selected]?.setAttribute('aria-selected', 'false');
    selected = (selected + delta + nodes.length) % nodes.length;
    const target = nodes[selected];
    target.setAttribute('aria-selected', 'true');
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
      if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;
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
    if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.tagName === 'SELECT')) return;
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
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          showHint('→ ' + target);
        }
      }
    }
  });

  toggleBtn?.addEventListener('click', open);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); updateSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); updateSelection(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = list.querySelectorAll('.cmdk-item')[selected];
      if (target) {
        if (target.target === '_blank') window.open(target.href, '_blank', 'noopener');
        else location.hash = target.getAttribute('href');
        close();
      }
    }
  });
  list.addEventListener('click', e => {
    const item = e.target.closest('.cmdk-item');
    if (item && !item.target) setTimeout(close, 50);
    else if (item) close();
  });
})();
