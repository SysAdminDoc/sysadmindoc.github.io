/* Progressive enhancement for the contact form */
(function () {
  // The handler refuses a form token younger than three seconds, so a submit
  // that comes sooner waits out the difference instead of failing.
  var MIN_TOKEN_AGE_MS = 3500;
  var forms = document.querySelectorAll('.contact-form');
  forms.forEach(function (form) {
    // ContactForm.astro loads this with each form, so bind once.
    if (form.hasAttribute('data-enhanced')) return;
    form.setAttribute('data-enhanced', '');

    var token = null;
    var tokenAt = 0;
    var tokenReady = null;
    function fetchToken() {
      return fetch('/api/contact/token', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          token = data && typeof data.token === 'string' ? data.token : null;
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
      var wait = Math.max(0, MIN_TOKEN_AGE_MS - (Date.now() - tokenAt));
      setTimeout(function () {
        var data = new FormData(form);
        data.set('token', token);
        // Accept tells the handler to answer in JSON; a plain browser POST gets
        // a redirect to a page instead.
        fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams(data).toString(),
        })
          .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, data: j }; }); })
          .then(function (result) {
            // A token can lapse (a long draft, or a restart on the server).
            // Fetch a fresh one and send once more before giving up.
            if (!result.ok && result.data && result.data.code === 'token' && !retried) {
              fetchToken().then(function (fresh) {
                if (fresh) send(true);
                else settle('Could not reach the server. Try emailing directly.', false);
              });
              return;
            }
            // A token is good for one attempt, sent or refused, so the next one
            // fetches its own.
            tokenReady = null;
            token = null;
            if (result.ok) {
              settle(result.data.message || 'Sent. I will be in touch.', true);
              form.reset();
            } else {
              settle(result.data.error || 'Something went wrong. Try emailing directly.', false);
            }
          })
          .catch(function () {
            settle('Could not reach the server. Try emailing directly.', false);
          });
      }, wait);
    }

    form.addEventListener('submit', function (e) {
      if (!btn || !status) return;
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Sending...';
      status.textContent = '';
      ensureToken().then(function () {
        if (!token) {
          // The token and the form go to the same handler, so no token means
          // it's down or restarting. Posting the form anyway landed on the
          // error page and lost the text; staying here keeps it.
          tokenReady = null;
          settle('Could not reach the server. Try emailing directly.', false);
          return;
        }
        send(false);
      });
    });
  });
})();
