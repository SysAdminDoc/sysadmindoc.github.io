(function () {
  var triggers = document.querySelectorAll('[data-shot-viewer]');
  if (!triggers.length) return;

  var dialog = document.createElement('dialog');
  dialog.id = 'shotViewer';
  dialog.className = 'sv-dialog';
  dialog.setAttribute('aria-label', 'Screenshot viewer');
  dialog.innerHTML =
    '<div class="sv-inner">' +
      '<img class="sv-img" alt="" />' +
      '<div class="sv-bar">' +
        '<span class="sv-caption"></span>' +
        '<span class="sv-spacer"></span>' +
        '<a class="sv-action sv-live" target="_blank" rel="noopener" hidden>Open live</a>' +
        '<a class="sv-action sv-source" target="_blank" rel="noopener">View source</a>' +
        '<button class="sv-btn sv-share" type="button" aria-label="Share screenshot link">Share</button>' +
        '<button class="sv-btn sv-zoom" type="button" aria-label="Toggle zoom">Fit</button>' +
        '<button class="sv-btn sv-close" type="button" aria-label="Close viewer">×</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dialog);

  var img = dialog.querySelector('.sv-img');
  var caption = dialog.querySelector('.sv-caption');
  var liveLink = dialog.querySelector('.sv-live');
  var sourceLink = dialog.querySelector('.sv-source');
  var shareBtn = dialog.querySelector('.sv-share');
  var zoomBtn = dialog.querySelector('.sv-zoom');
  var closeBtn = dialog.querySelector('.sv-close');
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
