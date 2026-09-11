(function () {
  "use strict";

  var picker = document.querySelector("[data-art-picker]");
  if (!picker) return;

  var tabs = Array.prototype.slice.call(picker.querySelectorAll("[data-art]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-art-panel]"));
  var label = document.querySelector("[data-featured-label]");

  var names = {
    bjj: "Brazilian jiu-jitsu",
    mma: "MMA",
    "muay-thai": "Muay Thai",
    judo: "Judo",
    wrestling: "Wrestling",
    boxing: "Boxing"
  };

  function select(art, opts) {
    if (!names[art]) art = "bjj";
    opts = opts || {};

    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-art") === art;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.classList.toggle("is-selected", on);
      tab.tabIndex = on ? 0 : -1;
    });

    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-art-panel") === art;
      panel.hidden = !on;
    });

    if (label) {
      label.textContent = "Read next · " + names[art];
    }

    if (opts.hash !== false) {
      try {
        history.replaceState(null, "", "#" + art);
      } catch (e) {}
    }

    window.dispatchEvent(new Event("resize"));
  }

  picker.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-art]");
    if (!tab || !picker.contains(tab)) return;
    select(tab.getAttribute("data-art"));
  });

  picker.addEventListener("keydown", function (e) {
    var current = document.activeElement;
    if (!current || !current.hasAttribute("data-art")) return;
    var i = tabs.indexOf(current);
    if (i < 0) return;
    var next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    tabs[next].focus();
    select(tabs[next].getAttribute("data-art"));
  });

  var fromHash = (location.hash || "").replace(/^#/, "");
  select(fromHash || "bjj", { hash: false });
})();
