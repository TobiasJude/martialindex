(function () {
  "use strict";

  var EMPTY_MSG = "No matches. Try a style or technique name.";
  var KIND_ORDER = ["style", "term"];
  var KIND_HEADERS = { style: "STYLE", term: "TECHNIQUE" };
  var MAX_RESULTS = 14;

  var index = null;
  var loadPromise = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loadPromise) return loadPromise;
    loadPromise = fetch("/data/search-index.json")
      .then(function (r) {
        if (!r.ok) throw new Error("index fetch failed");
        return r.json();
      })
      .then(function (data) {
        index = Array.isArray(data) ? data : [];
        return index;
      })
      .catch(function () {
        index = [];
        return index;
      });
    return loadPromise;
  }

  function kindLabel(kind) {
    return KIND_HEADERS[kind] || String(kind || "").toUpperCase();
  }

  function scoreItem(item, q) {
    var title = (item.title || "").toLowerCase();
    var slug = (item.slug || "").toLowerCase();
    var url = (item.url || "").toLowerCase();
    var idx = title.indexOf(q);
    if (idx === -1 && slug.indexOf(q) !== -1) idx = 40;
    if (idx === -1 && url.indexOf(q) !== -1) idx = 60;
    if (idx === -1) return -1;
    var score = 1000 - (typeof idx === "number" ? idx : 0);
    if (title === q) score += 500;
    if (title.indexOf(q) === 0) score += 200;
    if (item.kind === "style") score += 8;
    return score;
  }

  function filter(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return [];
    var scored = [];
    var list = index || [];
    for (var i = 0; i < list.length; i++) {
      var s = scoreItem(list[i], q);
      if (s >= 0) scored.push({ s: s, item: list[i] });
    }
    scored.sort(function (a, b) {
      return b.s - a.s;
    });
    return scored.slice(0, MAX_RESULTS).map(function (x) {
      return x.item;
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightTitle(title, q) {
    if (!q) return escapeHtml(title);
    var lower = title.toLowerCase();
    var qi = lower.indexOf(q.toLowerCase());
    if (qi === -1) return escapeHtml(title);
    return (
      escapeHtml(title.slice(0, qi)) +
      "<mark>" +
      escapeHtml(title.slice(qi, qi + q.length)) +
      "</mark>" +
      escapeHtml(title.slice(qi + q.length))
    );
  }

  function groupByKind(list) {
    var buckets = {};
    list.forEach(function (item) {
      var k = item.kind || "term";
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push(item);
    });
    return KIND_ORDER.filter(function (k) {
      return buckets[k] && buckets[k].length;
    }).map(function (k) {
      return { kind: k, items: buckets[k] };
    });
  }

  function makeResult(item, optIndex, q) {
    var a = document.createElement("a");
    a.className = "home-search__result";
    a.href = item.url || "#";
    a.setAttribute("role", "option");
    a.id = "home-search-opt-" + optIndex;
    a.setAttribute("data-opt-index", String(optIndex));
    a.innerHTML =
      '<span class="home-search__result-title"></span>' +
      '<span class="home-search__result-kind"></span>';
    a.querySelector(".home-search__result-title").innerHTML = highlightTitle(
      item.title || "",
      q || ""
    );
    a.querySelector(".home-search__result-kind").textContent = kindLabel(item.kind);
    return a;
  }

  function dimMapNodes(q) {
    var nodes = document.querySelectorAll("[data-map-node]");
    if (!nodes.length) return;
    q = (q || "").trim().toLowerCase();
    if (!q) {
      nodes.forEach(function (n) {
        n.classList.remove("is-dim", "is-match");
      });
      return;
    }
    var anyStyleMatch = false;
    nodes.forEach(function (n) {
      var label = (n.getAttribute("data-label") || n.textContent || "").toLowerCase();
      if (label.indexOf(q) !== -1) anyStyleMatch = true;
    });
    if (!anyStyleMatch) {
      nodes.forEach(function (n) {
        n.classList.remove("is-dim", "is-match");
      });
      return;
    }
    nodes.forEach(function (n) {
      var label = (n.getAttribute("data-label") || n.textContent || "").toLowerCase();
      var match = label.indexOf(q) !== -1;
      n.classList.toggle("is-dim", !match);
      n.classList.toggle("is-match", match);
    });
  }

  function initFieldHover() {
    var roots = document.querySelectorAll(".field-map");
    roots.forEach(function (root) {
      var edges = root.querySelectorAll(".field-map__edges path[data-nodes]");
      var nodes = root.querySelectorAll(".hm-static-node[data-id]");
      if (!edges.length || !nodes.length) return;

      function clear() {
        root.classList.remove("is-hovering");
        edges.forEach(function (p) {
          p.classList.remove("is-lit");
        });
        nodes.forEach(function (n) {
          n.classList.remove("is-neighbor", "is-hovered");
        });
      }

      nodes.forEach(function (node) {
        node.addEventListener("mouseenter", function () {
          var id = node.getAttribute("data-id");
          if (!id) return;
          root.classList.add("is-hovering");
          node.classList.add("is-hovered");
          edges.forEach(function (p) {
            var ids = (p.getAttribute("data-nodes") || "").split(" ");
            if (ids.indexOf(id) !== -1) {
              p.classList.add("is-lit");
              ids.forEach(function (oid) {
                if (oid === id) return;
                var other = root.querySelector('.hm-static-node[data-id="' + oid + '"]');
                if (other) other.classList.add("is-neighbor");
              });
            }
          });
        });
        node.addEventListener("mouseleave", clear);
      });
    });
  }

  function initRoot(root) {
    var input =
      $("[data-home-search-input]", root) ||
      $("#home-search-q", root) ||
      $("input[type='search']", root);
    var results = $("[data-home-search-results]", root);
    var panel = $("[data-home-search-panel]", root);
    if (!input || !results || !panel) return;

    var active = -1;
    var open = false;

    function getOpts() {
      return results.querySelectorAll(".home-search__result");
    }

    function setActive(opts, idx) {
      for (var i = 0; i < opts.length; i++) {
        opts[i].classList.toggle("is-active", i === idx);
      }
    }

    function closePanel() {
      open = false;
      panel.hidden = true;
      panel.setAttribute("hidden", "");
      panel.classList.remove("is-open");
      root.classList.remove("is-search-open");
      results.innerHTML = "";
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
      active = -1;
      var empty = panel.querySelector("[data-home-search-empty]");
      if (empty) empty.hidden = true;
    }

    function showEmpty(want) {
      var el = panel.querySelector("[data-home-search-empty]");
      if (!want) {
        if (el) el.hidden = true;
        return;
      }
      if (!el) {
        el = document.createElement("p");
        el.className = "home-search__empty";
        el.setAttribute("data-home-search-empty", "");
        el.textContent = EMPTY_MSG;
        panel.appendChild(el);
      }
      el.hidden = false;
      el.removeAttribute("hidden");
    }

    function render(list, q) {
      results.innerHTML = "";
      if (!list.length) {
        results.hidden = true;
        showEmpty(true);
        return;
      }
      showEmpty(false);
      results.hidden = false;
      var frag = document.createDocumentFragment();
      var optIndex = 0;
      groupByKind(list).forEach(function (g) {
        var section = document.createElement("div");
        section.className = "home-search__group";
        section.setAttribute("role", "group");
        section.setAttribute("aria-label", kindLabel(g.kind));
        var label = document.createElement("span");
        label.className = "home-search__group-label";
        label.textContent = kindLabel(g.kind);
        section.appendChild(label);
        g.items.forEach(function (item) {
          section.appendChild(makeResult(item, optIndex++, q));
        });
        frag.appendChild(section);
      });
      results.appendChild(frag);
    }

    function sync() {
      var q = (input.value || "").trim();
      active = -1;
      dimMapNodes(q);

      if (!q) {
        closePanel();
        return;
      }

      var list = filter(q);
      open = true;
      panel.hidden = false;
      panel.removeAttribute("hidden");
      panel.classList.add("is-open");
      root.classList.add("is-search-open");
      input.setAttribute("aria-expanded", "true");
      render(list, q);
      setActive(getOpts(), -1);
    }

    function focusSearch() {
      loadIndex().then(function () {
        try {
          input.focus({ preventScroll: false });
        } catch (e) {
          input.focus();
        }
        if (input.value.trim()) sync();
      });
      try {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e2) {}
    }

    function activateResult(a) {
      if (!a || !a.href) return;
      var href = a.href || "";
      var map = window.MartialIndexMap;
      if (map && typeof map.focus === "function") {
        var m = href.match(/\/styles\/([^\/]+)\/?/);
        var slug = m && m[1];
        if (slug && map.hasNode && map.hasNode(slug)) {
          closePanel();
          map.focus(slug, (input.value || "").trim() || slug);
          var field = document.getElementById("map");
          if (field) {
            try { field.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
          }
          return;
        }
      }
      window.location.href = href;
    }

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", results.id || "home-search-results");
    if (!results.id) results.id = "home-search-results";
    results.setAttribute("role", "listbox");

    closePanel();
    loadIndex();

    input.addEventListener("input", function () {
      loadIndex().then(sync);
    });
    input.addEventListener("search", function () {
      loadIndex().then(sync);
    });

    input.addEventListener("keydown", function (e) {
      var opts = getOpts();
      if (e.key === "Escape") {
        e.preventDefault();
        input.value = "";
        dimMapNodes("");
        closePanel();
        input.blur();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!opts.length) return;
        active = (active + 1) % opts.length;
        setActive(opts, active);
        opts[active].focus();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!opts.length) return;
        if (active <= 0) {
          active = -1;
          setActive(opts, -1);
          input.focus();
          return;
        }
        active -= 1;
        setActive(opts, active);
        opts[active].focus();
        return;
      }
      if (e.key === "Enter") {
        if (!opts.length) return;
        e.preventDefault();
        if (active >= 0 && opts[active]) activateResult(opts[active]);
        else activateResult(opts[0]);
      }
    });

    results.addEventListener("keydown", function (e) {
      var opts = getOpts();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(active + 1, opts.length - 1);
        setActive(opts, active);
        if (opts[active]) opts[active].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (active <= 0) {
          active = -1;
          setActive(opts, -1);
          input.focus();
        } else {
          active -= 1;
          setActive(opts, active);
          if (opts[active]) opts[active].focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        input.value = "";
        dimMapNodes("");
        closePanel();
        input.focus();
      } else if (e.key === "Enter" && active >= 0 && opts[active]) {
        e.preventDefault();
        activateResult(opts[active]);
      }
    });

    document.addEventListener("click", function (e) {
      if (!open) return;
      if (root.contains(e.target)) return;
      if (e.target.closest && e.target.closest("[data-nav-search]")) return;
      closePanel();
    });

    document.querySelectorAll("[data-nav-search]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        focusSearch();
      });
    });

    root._homeSearch = {
      focus: focusSearch,
      close: closePanel,
      input: input
    };

    if (window.location.hash === "#home-search-q" || window.location.hash === "#search") {
      focusSearch();
    }
  }

  function boot() {
    document.querySelectorAll("[data-home-search]").forEach(initRoot);
    initFieldHover();

    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      var typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target && e.target.isContentEditable);
      var root = document.querySelector("[data-home-search]");
      var api = root && root._homeSearch;

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (api) api.focus();
        return;
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (api) api.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
/* ia8 + ia15 map focus bridge */
