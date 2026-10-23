(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll("[data-creator-filter]")
  );
  var cards = Array.prototype.slice.call(
    document.querySelectorAll(".creator-card")
  );
  var empty = document.getElementById("creatorEmpty");

  if (!buttons.length || !cards.length) return;

  function applyFilter(filter) {
    var visible = 0;

    cards.forEach(function (card) {
      var platforms = (card.dataset.platforms || "").split(/\s+/);
      var show = filter === "all" || platforms.indexOf(filter) !== -1;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (empty) empty.hidden = visible !== 0;
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.dataset.creatorFilter || "all";

      buttons.forEach(function (item) {
        var active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      applyFilter(filter);
    });
  });
})();
