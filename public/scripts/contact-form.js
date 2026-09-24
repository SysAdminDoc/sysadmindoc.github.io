/* Progressive enhancement for the contact form */
(function () {
  // The handler refuses a form token younger than its CONTACT_MIN_TIME, and
  // says how young beside each token (minAgeMs), so a submit that comes sooner
  // waits out the difference instead of failing. A handler that doesn't say
  // is an older one, which asks for three seconds. Half a second more covers
  // the trip, and a minute is the most a visitor is asked to wait.
  var DEFAULT_TOKEN_AGE_MS = 3000;
  var TOKEN_AGE_MARGIN_MS = 500;
  var MAX_TOKEN_AGE_MS = 60000;
  // A handler that never answers would otherwise leave the button on
  // "Sending..." for good.
  var TOKEN_TIMEOUT_MS = 10000;
  var POST_TIMEOUT_MS = 20000;
  var UNREACHABLE = 'Could not reach the server. Try emailing directly.';

  function fetchWithin(url, init, ms) {
    if (typeof AbortController !== 'function') return fetch(url, init);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    var options = Object.assign({}, init, { signal: controller.signal });
    return fetch(url, options).then(
      function (res) { clearTimeout(timer); return res; },
      function (error) { clearTimeout(timer); throw error; }
    );
  }

  var forms = document.querySelectorAll('.contact-form');
  forms.forEach(function (form) {
    // ContactForm.astro loads this with each form, so bind once.
    if (form.hasAttribute('data-enhanced')) return;
    form.setAttribute('data-enhanced', '');

    var token = null;
    var tokenAt = 0;
    var tokenAgeMs = DEFAULT_TOKEN_AGE_MS;
    var tokenReady = null;
    function fetchToken() {
      return fetchWithin('/api/contact/token', { headers: { Accept: 'application/json' }, cache: 'no-store' }, TOKEN_TIMEOUT_MS)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          token = data && typeof data.token === 'string' ? data.token : null;
          var asked = data && typeof data.minAgeMs === 'number' && isFinite(data.minAgeMs) && data.minAgeMs >= 0 ? data.minAgeMs : DEFAULT_TOKEN_AGE_MS;
          tokenAgeMs = Math.min(asked, MAX_TOKEN_AGE_MS);
          tokenAt = Date.now();
          return token;
        })
        .catch(function () {
          token = null;
          return null;
        });
    }
    // Only someone who starts filling in the form asks the server for a token,
    // not every page view.
    function ensureToken() {
      if (!tokenReady) tokenReady = fetchToken();
      return tokenReady;
    }
    // A token is good for one attempt, whatever came of it, and a failed fetch
    // must not be remembered either, so the next attempt asks again.
    function forgetToken() {
      tokenReady = null;
      token = null;
    }
    form.addEventListener('focusin', ensureToken);

    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.contact-form-status');

    function settle(message, ok) {
      status.textContent = message;
      status.className = 'contact-form-status ' + (ok ? 'contact-form-success' : 'contact-form-error');
      btn.disabled = false;
      btn.textContent = 'Send message';
    }

    function send(retried) {
      var wait = Math.max(0, tokenAgeMs + TOKEN_AGE_MARGIN_MS - (Date.now() - tokenAt));
      setTimeout(function () {
        var data = new FormData(form);
        data.set('token', token);
        // Accept tells the handler to answer in JSON; a plain browser POST gets
        // a redirect to a page instead.
        fetchWithin(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams(data).toString(),
        }, POST_TIMEOUT_MS)
          .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, data: j }; }); })
          .then(function (result) {
            forgetToken();
            // A token can lapse (a long draft, or a restart on the server).
            // Fetch a fresh one and send once more before giving up.
            if (!result.ok && result.data && result.data.code === 'token' && !retried) {
              ensureToken().then(function (fresh) {
                if (fresh) send(true);
                else {
                  forgetToken();
                  settle(UNREACHABLE, false);
                }
              });
              return;
            }
            if (result.ok) {
              settle(result.data.message || 'Sent. I will be in touch.', true);
              form.reset();
            } else {
              settle(result.data.error || 'Something went wrong. Try emailing directly.', false);
            }
          })
          .catch(function () {
            // No answer, or not JSON (an error page from the proxy).
            forgetToken();
            settle(UNREACHABLE, false);
          });
      }, wait);
    }

    form.addEventListener('submit', function (e) {
      if (!btn || !status) return;
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Sending...';
      status.textContent = '';
      ensureToken()
        .then(function () {
          if (token) return token;
          // The fetch when the form was first touched may have met a restart.
          // Ask once more before giving up.
          forgetToken();
          return ensureToken();
        })
        .then(function () {
          if (!token) {
            // The token and the form go to the same handler, so no token means
            // it's down or restarting. Posting the form anyway landed on the
            // error page and lost the text; staying here keeps it.
            forgetToken();
            settle(UNREACHABLE, false);
            return;
          }
          send(false);
        });
    });
  });
})();
