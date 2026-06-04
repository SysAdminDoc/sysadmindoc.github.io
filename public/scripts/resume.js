(function () {
  var button = document.getElementById('resumePrint');
  if (!button) return;
  button.addEventListener('click', function () {
    window.print();
  });
})();
