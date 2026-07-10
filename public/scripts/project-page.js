(function () {
  var project = document.querySelector('[data-project-slug]');
  var slug = project ? project.getAttribute('data-project-slug') : '';
  if (!slug) return;

  try {
    var key = 'recently_viewed';
    var list = JSON.parse(localStorage.getItem(key) || '[]');
    list = (Array.isArray(list) ? list : []).filter(function (item) {
      return item !== slug;
    });
    list.unshift(slug);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 8)));
  } catch (error) {
    /* Storage may be unavailable in hardened browser modes. */
  }

  var shareButton = document.querySelector('[data-project-share]');
  if (!shareButton) return;

  var shareStatus = document.getElementById('project-share-status');
  var statusTimer = null;
  function setShareStatus(message) {
    if (!shareStatus) return;
    shareStatus.textContent = message;
    if (statusTimer) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(function () {
      shareStatus.textContent = '';
    }, 3200);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var previousFocus = document.activeElement;
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
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus({ preventScroll: true });
        }
      }
    });
  }

  function fallbackCopy(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  function setShareBusy(isBusy) {
    shareButton.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    shareButton.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
  }

  shareButton.addEventListener('click', function () {
    if (shareButton.getAttribute('aria-busy') === 'true') return;
    var shareUrl = shareButton.getAttribute('data-share-url') || window.location.href;
    var shareData = {
      title: shareButton.getAttribute('data-share-title') || document.title,
      text: shareButton.getAttribute('data-share-text') || '',
      url: shareUrl,
    };

    setShareBusy(true);
    var sharePromise;
    if (navigator.share) {
      sharePromise = navigator.share(shareData)
        .then(function () {
          setShareStatus('Project shared.');
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          return fallbackCopy(shareUrl)
            .then(function () { setShareStatus('Project link copied.'); });
        });
    } else {
      sharePromise = fallbackCopy(shareUrl)
        .then(function () { setShareStatus('Project link copied.'); });
    }
    sharePromise
      .catch(function () { setShareStatus("Couldn't copy. Copy the address from your browser."); })
      .finally(function () { setShareBusy(false); });
  });
})();
