(function () {
  var triggers = document.querySelectorAll('[data-shot-viewer]');
  if (!triggers.length) return;

  var dialog = document.createElement('dialog');
  dialog.id = 'shotViewer';
  dialog.className = 'sv-dialog';
  dialog.setAttribute('aria-label', 'Screenshot viewer');

  var inner = document.createElement('div');
  inner.className = 'sv-inner';
  var img = document.createElement('img');
  img.className = 'sv-img';
  img.alt = '';
  var bar = document.createElement('div');
  bar.className = 'sv-bar';
  var caption = document.createElement('span');
  caption.className = 'sv-caption';
  var spacer = document.createElement('span');
  spacer.className = 'sv-spacer';
  var liveLink = document.createElement('a');
  liveLink.className = 'sv-action sv-live';
  liveLink.target = '_blank';
  liveLink.rel = 'noopener';
  liveLink.hidden = true;
  liveLink.textContent = 'Open live';
  var sourceLink = document.createElement('a');
  sourceLink.className = 'sv-action sv-source';
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener';
  sourceLink.textContent = 'View source';
  var shareBtn = document.createElement('button');
  shareBtn.className = 'sv-btn sv-share';
  shareBtn.type = 'button';
  shareBtn.setAttribute('aria-label', 'Share screenshot link');
  shareBtn.textContent = 'Share';
  var zoomBtn = document.createElement('button');
  zoomBtn.className = 'sv-btn sv-zoom';
  zoomBtn.type = 'button';
  zoomBtn.setAttribute('aria-label', 'Toggle zoom');
  zoomBtn.textContent = 'Fit';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'sv-btn sv-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close viewer');
  closeBtn.textContent = '\u00d7';
  bar.appendChild(caption);
  bar.appendChild(spacer);
  bar.appendChild(liveLink);
  bar.appendChild(sourceLink);
  bar.appendChild(shareBtn);
  bar.appendChild(zoomBtn);
  bar.appendChild(closeBtn);
  inner.appendChild(img);
  inner.appendChild(bar);
  dialog.appendChild(inner);
  document.body.appendChild(dialog);

  var zoomed = false;

  function setZoom(state) {
    zoomed = state;
    img.classList.toggle('sv-img-zoom', zoomed);
    zoomBtn.textContent = zoomed ? '100%' : 'Fit';
  }

  function shotUrl() {
    var url = new URL(window.location.href);
    url.searchParams.set('shot', '1');
    return url.toString();
  }

  function open(trigger) {
    var src = trigger.getAttribute('data-shot-src');
    var alt = trigger.getAttribute('data-shot-alt') || '';
    var live = trigger.getAttribute('data-shot-live');
    var source = trigger.getAttribute('data-shot-source');

    img.src = src;
    img.alt = alt;
    caption.textContent = alt;

    if (live) {
      liveLink.href = live;
      liveLink.hidden = false;
    } else {
      liveLink.hidden = true;
    }

    if (source) {
      sourceLink.href = source;
      sourceLink.hidden = false;
    } else {
      sourceLink.hidden = true;
    }

    setZoom(false);
    dialog.showModal();
    closeBtn.focus();

    var url = new URL(window.location.href);
    url.searchParams.set('shot', '1');
    history.replaceState(null, '', url.toString());
  }

  function close() {
    dialog.close();
    var url = new URL(window.location.href);
    url.searchParams.delete('shot');
    history.replaceState(null, '', url.toString());
  }

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      open(trigger);
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(trigger);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  zoomBtn.addEventListener('click', function () { setZoom(!zoomed); });
  img.addEventListener('click', function () { setZoom(!zoomed); });

  shareBtn.addEventListener('click', function () {
    var url = shotUrl();
    if (navigator.share) {
      navigator.share({ title: img.alt || document.title, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url).then(function () {
        shareBtn.textContent = 'Copied';
        setTimeout(function () { shareBtn.textContent = 'Share'; }, 2000);
      }).catch(function () {});
    }
  });

  dialog.addEventListener('cancel', function () {
    setZoom(false);
    var url = new URL(window.location.href);
    url.searchParams.delete('shot');
    history.replaceState(null, '', url.toString());
  });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) close();
  });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      setZoom(!zoomed);
    }
  });

  if (new URLSearchParams(window.location.search).get('shot') === '1' && triggers[0]) {
    open(triggers[0]);
  }
})();
