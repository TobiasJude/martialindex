(function () {
  "use strict";

  var picker = document.querySelector("[data-art-picker]");
  if (!picker) return;

  var tiles = Array.prototype.slice.call(picker.querySelectorAll("[data-art]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-art-panel]"));
  var label = document.querySelector("[data-featured-label]");
  var allLink = document.querySelector("[data-featured-all]");

  var dest = {
    grappling: "styles.html#styles-grappling",
    wrestling: "styles/wrestling.html",
    striking: "styles.html#styles-striking",
    mixed: "styles.html#styles-mixed"
  };

  function hasPanel(art) {
    return panels.some(function (panel) {
      return panel.getAttribute("data-art-panel") === art;
    });
  }

  function select(art) {
    if (hasPanel(art)) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-art-panel") !== art;
      });
      if (label) label.textContent = "From the catalog";
      if (allLink) allLink.setAttribute("href", dest[art] || "styles.html");
      window.dispatchEvent(new Event("resize"));
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
