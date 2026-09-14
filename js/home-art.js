(function () {
  "use strict";

  var picker = document.querySelector("[data-art-picker]");
  if (!picker) return;

  var tiles = Array.prototype.slice.call(picker.querySelectorAll("[data-art]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-art-panel]"));
  var label = document.querySelector("[data-featured-label]");
  var allLink = document.querySelector("[data-featured-all]");


  function hasPanel(art) {
    return panels.some(function (panel) {
      return panel.getAttribute("data-art-panel") === art;
    });
  }

  function select(art) {
    if (hasPanel(art)) {
      panels.forEach(function (panel) {
        var on = panel.getAttribute("data-art-panel") === art;
        panel.hidden = !on;
        if (on && typeof window.__miInitCarousel === "function") {
          window.__miInitCarousel(panel);
        }
      });
      if (label) label.textContent = "From the catalog";
      // Keep "View all" pointed at the full styles catalog (distinct from category rows).
      if (allLink) {
        // Distinct from nav /styles/ (no hash) so accessible names can differ.
        allLink.setAttribute("href", "/styles/#main");
        allLink.removeAttribute("aria-label");
      }
    }

    tiles.forEach(function (tile) {
      var on = tile.getAttribute("data-art") === art;
      tile.classList.toggle("is-selected", on);
      if (on) tile.setAttribute("aria-current", "true");
      else tile.removeAttribute("aria-current");
    });
  }

  function fromEvent(e) {
    var tile = e.target.closest("[data-art]");
    if (!tile || !picker.contains(tile)) return;
    select(tile.getAttribute("data-art"));
  }

  picker.addEventListener("mouseover", fromEvent);
  picker.addEventListener("focusin", fromEvent);

  select("grappling");
})();
