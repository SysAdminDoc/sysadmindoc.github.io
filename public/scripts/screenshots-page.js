(function () {
  var buttons = document.querySelectorAll('[data-filter]');
  var cards = document.querySelectorAll('[data-category]');
  if (!buttons.length || !cards.length) return;
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter');
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      cards.forEach(function (card) {
        card.style.display = filter === 'all' || card.getAttribute('data-category') === filter ? '' : 'none';
      });
    });
  });
})();
