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
  var status = document.createElement('span');
  status.className = 'sv-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
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
  bar.appendChild(status);
  bar.appendChild(zoomBtn);
  bar.appendChild(closeBtn);
  inner.appendChild(img);
  inner.appendChild(bar);
  dialog.appendChild(inner);
  document.body.appendChild(dialog);

  var zoomed = false;
  var lastTrigger = null;
  var restoreFocusOnClose = true;
  var statusTimer = 0;

  function setZoom(state) {
    zoomed = state;
    img.classList.toggle('sv-img-zoom', zoomed);
    zoomBtn.textContent = zoomed ? '100%' : 'Fit';
  }

  function setStatus(message) {
    status.textContent = message || '';
    if (statusTimer) window.clearTimeout(statusTimer);
    if (message) {
      statusTimer = window.setTimeout(function () {
        status.textContent = '';
      }, 3200);
    }
  }

  function shotUrl() {
    var url = new URL(window.location.href);
    url.searchParams.set('shot', '1');
    return url.toString();
  }

  function fallbackCopy(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.className = 'copy-buffer';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('copy command failed'));
        }
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  function open(trigger, options) {
    options = options || {};
    var src = trigger.getAttribute('data-shot-src');
    var alt = trigger.getAttribute('data-shot-alt') || '';
    var live = trigger.getAttribute('data-shot-live');
    var source = trigger.getAttribute('data-shot-source');
    lastTrigger = trigger;
    restoreFocusOnClose = options.restoreFocus !== false;

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
    setStatus('');
    shareBtn.textContent = 'Share';
    dialog.showModal();
    closeBtn.focus();

    var url = new URL(window.location.href);
    url.searchParams.set('shot', '1');
    history.replaceState(null, '', url.toString());
  }

  function close() {
    clearShotUrl();
    dialog.close();
  }

  function clearShotUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete('shot');
    history.replaceState(null, '', url.toString());
  }

  function cleanupAfterClose() {
    setZoom(false);
    setStatus('');
    shareBtn.textContent = 'Share';
    clearShotUrl();
    if (restoreFocusOnClose && lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
    restoreFocusOnClose = true;
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
      navigator.share({ title: img.alt || document.title, url: url })
        .then(function () { setStatus('Screenshot link shared.'); })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          fallbackCopy(url)
            .then(function () { setStatus('Screenshot link copied.'); })
            .catch(function () { setStatus('Copy failed.'); });
        });
      return;
    }
    fallbackCopy(url)
      .then(function () { setStatus('Screenshot link copied.'); })
      .catch(function () { setStatus('Copy failed.'); });
  });

  dialog.addEventListener('cancel', clearShotUrl);
  dialog.addEventListener('close', cleanupAfterClose);
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
    open(triggers[0], { restoreFocus: false });
  }
})();
