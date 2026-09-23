/* Progressive enhancement for the contact form */
(function () {
  var forms = document.querySelectorAll('.contact-form');
  forms.forEach(function (form) {
    // ContactForm.astro loads this with each form, so bind once.
    if (form.hasAttribute('data-enhanced')) return;
    form.setAttribute('data-enhanced', '');
    var timeField = form.querySelector('input[name="_t"]');
    if (timeField) timeField.value = String(Math.floor(Date.now() / 1000));

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var status = form.querySelector('.contact-form-status');
      if (!btn || !status) return;

      btn.disabled = true;
      btn.textContent = 'Sending...';
      status.textContent = '';

      var data = new FormData(form);
      var body = new URLSearchParams(data).toString();

      // Accept tells the handler to answer in JSON; a plain browser POST gets
      // a redirect to a page instead.
      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body,
      })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, data: j }; }); })
        .then(function (result) {
          if (result.ok) {
            status.textContent = result.data.message || 'Sent. I will be in touch.';
            status.className = 'contact-form-status contact-form-success';
            form.reset();
            if (timeField) timeField.value = String(Math.floor(Date.now() / 1000));
          } else {
            status.textContent = result.data.error || 'Something went wrong. Try emailing directly.';
            status.className = 'contact-form-status contact-form-error';
          }
          btn.disabled = false;
          btn.textContent = 'Send message';
        })
        .catch(function () {
          status.textContent = 'Could not reach the server. Try emailing directly.';
          status.className = 'contact-form-status contact-form-error';
          btn.disabled = false;
          btn.textContent = 'Send message';
        });
    });
  });
})();
