(function () {
  "use strict";

  var MAX_RESULTS = 80;
  var index = null;
  var loadPromise = null;

  // Light enrichment when query clearly targets Closed Guard neighborhood
  var CG_RELATED = [
    { title: "Open Guard", url: "/terms/open-guard/", kind: "term", cat: "related", meta: "Position" },
    { title: "Half Guard", url: "/terms/half-guard/", kind: "term", cat: "related", meta: "Position" }
  ];
  var CG_PEOPLE = [
    { title: "Roger Gracie", url: "#", kind: "people", cat: "people", meta: "BJJ — Practitioner", entityId: "roger-gracie" }
  ];

  var CAT_ORDER = ["position", "technique", "style", "people", "related", "term"];
  var CAT_LABELS = {
    position: "Positions",
    technique: "Techniques",
    related: "Related",
    people: "People",
    style: "Martial Arts",
    term: "Terms"
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loadPromise) return loadPromise;
    loadPromise = fetch("/data/search-index.json?v=ia41")
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

  function classifyItem(item) {
    if (item.cat && CAT_LABELS[item.cat]) return item.cat;
    if (item.kind === "style") return "style";
    if (item.kind === "people" || item.kind === "related") return item.kind;
    if (item.kind === "technique") return "technique";
    if (item.kind === "position") return "position";
    var t = (item.title || "").toLowerCase();
    var slug = (item.slug || "").toLowerCase();
    var pos = [
      "guard",
      "mount",
      "control",
      "clinch",
      "side",
      "turtle",
      "knee on",
      "knee-on",
      "stance",
      "north-south",
      "north south"
    ];
    for (var i = 0; i < pos.length; i++) {
      if (t.indexOf(pos[i]) !== -1 || slug.indexOf(pos[i].replace(/\s+/g, "-")) !== -1) {
        return "position";
      }
    }
    return "technique";
  }

  function scoreItem(item, q) {
    var title = (item.title || "").toLowerCase();
    var slug = (item.slug || "").toLowerCase();
    var url = (item.url || "").toLowerCase();
    var meta = (item.meta || "").toLowerCase();
    var idx = title.indexOf(q);
    if (idx === -1 && slug.indexOf(q) !== -1) idx = 35;
    if (idx === -1 && url.indexOf(q) !== -1) idx = 55;
    if (idx === -1 && meta.indexOf(q) !== -1) idx = 70;
    if (idx === -1) return -1;
    var score = 1000 - (typeof idx === "number" ? idx : 0);
    if (title === q) score += 500;
    if (title.indexOf(q) === 0) score += 200;
    if (item.kind === "style") score += 12;
    if (classifyItem(item) === "position") score += 4;
    return score;
  }

  function withMeta(item) {
    var copy = Object.assign({}, item);
    copy.cat = classifyItem(copy);
    if (copy.meta) return copy;
    if (copy.cat === "style") copy.meta = "Martial Art";
    else if (copy.cat === "position") copy.meta = "Position";
    else if (copy.cat === "people") copy.meta = "Person";
    else if (copy.cat === "related") copy.meta = "Related";
    else copy.meta = "Technique";
    return copy;
  }

  function enrichClosedGuard(q, list) {
    if (q.indexOf("closed") === -1 && q !== "guard" && q.indexOf("closed guard") === -1) {
      if (q.indexOf("guard") === -1) return list;
    }
    var wantsCg = q.indexOf("closed") !== -1 || q === "closed guard";
    if (!wantsCg && q.indexOf("guard") === -1) return list;

    var out = list.slice();
    var seen = {};
    out.forEach(function (i) {
      seen[(i.title || "").toLowerCase()] = true;
    });
    function push(arr) {
      arr.forEach(function (item) {
        var k = (item.title || "").toLowerCase();
        if (seen[k]) return;
        seen[k] = true;
        out.push(Object.assign({}, item));
      });
    }
    out = out.map(function (item) {
      var copy = withMeta(item);
      if ((copy.title || "").toLowerCase() === "closed guard") {
        copy.cat = "position";
        copy.meta = "BJJ — Position";
        copy.entityId = "closed-guard";
      }
      return copy;
    });
    if (wantsCg || q.indexOf("guard") !== -1) {
      push(CG_RELATED);
      push(CG_PEOPLE);
    }
    return out;
  }

  /* Empty query → no results. Suggestions A–Z sidebar was the stuck-home bug. */
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
    var items = scored.slice(0, MAX_RESULTS).map(function (x) {
      return withMeta(x.item);
    });
    return enrichClosedGuard(q, items);
  }

  function group(list) {
    var buckets = {};
    list.forEach(function (item) {
      var k = item.cat || "term";
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push(item);
    });
    return CAT_ORDER.filter(function (k) {
      return buckets[k] && buckets[k].length;
    }).map(function (k) {
      return { kind: k, label: CAT_LABELS[k] || k, items: buckets[k] };
    });
  }

  function slugFromUrl(url) {
    var m = String(url || "").match(/\/(?:terms|styles)\/([^\/]+)\/?/);
    return m ? m[1] : "";
  }

  function openEntityFromItem(item) {
    var id = item.entityId || slugFromUrl(item.url) || item.slug;
    if (window.MartialIndexEntity && typeof window.MartialIndexEntity.canOpen === "function" && window.MartialIndexEntity.canOpen(id)) {
      window.MartialIndexEntity.open(id);
      return true;
    }
    if (window.MartialIndexEntity && typeof window.MartialIndexEntity.openStub === "function") {
      window.MartialIndexEntity.openStub({
        id: id || (item.title || "").toLowerCase().replace(/\s+/g, "-"),
        title: item.title,
        type:
          item.cat === "style"
            ? "Martial Art"
            : item.cat === "people"
              ? "Person"
              : item.cat === "position"
                ? "Position"
                : "Technique",
        art: item.meta || "",
        url: item.url || null
      });
      return true;
    }
    if (item.url && item.url !== "#") {
      window.location.href = item.url;
      return true;
    }
    return false;
  }

  function buildResultButton(item, q, className, optIndex, onPick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.setAttribute("role", "option");
    btn.setAttribute("data-opt-index", String(optIndex));
    btn.innerHTML =
      '<span class="' +
      className +
      '-title">' +
      highlightTitle(item.title || "", q) +
      '</span><span class="' +
      className +
      '-meta">' +
      escapeHtml(item.meta || CAT_LABELS[item.cat] || "") +
      "</span>";
    btn.addEventListener("click", function () {
      onPick(item);
    });
    return btn;
  }

  function renderGrouped(host, list, q, resultClass, onPick) {
    host.innerHTML = "";
    var flat = list.slice();
    if (!list.length) {
      if ((q || "").trim()) {
        host.innerHTML =
          '<p class="' +
          resultClass.replace(/__result$/, "__empty") +
          '">No matches. Try a position, technique, or art.</p>';
      }
      return flat;
    }
    var frag = document.createDocumentFragment();
    var optIndex = 0;
    var groupClass = resultClass.replace(/__result$/, "__group");
    var labelClass = resultClass.replace(/__result$/, "__group-label");
    group(list).forEach(function (g) {
      var section = document.createElement("div");
      section.className = groupClass;
      var label = document.createElement("span");
      label.className = labelClass;
      label.textContent = g.label + (g.items.length > 3 ? " · " + g.items.length : "");
      section.appendChild(label);
      g.items.forEach(function (item) {
        section.appendChild(buildResultButton(item, q, resultClass, optIndex, onPick));
        optIndex++;
      });
      frag.appendChild(section);
    });
    host.appendChild(frag);
    return flat;
  }

  /* —— Hero inline results (product surface) —— */
  function initHero() {
    var wrap = $("[data-home-search]");
    var input = $("[data-home-search-input]");
    if (!wrap || !input) return null;

    var panel = $("[data-home-search-panel]", wrap);
    var results = $("[data-home-search-results]", wrap);
    if (!panel || !results) return null;

    var active = -1;
    var flat = [];
    var open = false;

    function close() {
      panel.hidden = true;
      panel.setAttribute("hidden", "");
      input.setAttribute("aria-expanded", "false");
      results.innerHTML = "";
      active = -1;
      flat = [];
      open = false;
      if (!$("[data-search-overlay]") || $("[data-search-overlay]").hidden) {
        document.body.classList.remove("is-search-open");
      }
    }

    function setActive(idx) {
      active = idx;
      var opts = results.querySelectorAll(".home-search__result");
      for (var i = 0; i < opts.length; i++) {
        opts[i].classList.toggle("is-active", i === idx);
      }
      if (opts[idx]) opts[idx].scrollIntoView({ block: "nearest" });
    }

    function render(list) {
      var q = (input.value || "").trim();
      flat = renderGrouped(results, list, q, "home-search__result", function (item) {
        close();
        openEntityFromItem(item);
      });
      active = -1;
      if (!list.length && !q) {
        close();
        return;
      }
      panel.hidden = false;
      panel.removeAttribute("hidden");
      input.setAttribute("aria-expanded", "true");
      open = true;
      document.body.classList.add("is-search-open");
    }

    function update() {
      var q = (input.value || "").trim();
      if (!q) {
        close();
        return;
      }
      loadIndex().then(function () {
        render(filter(q));
      });
    }

    function focusField() {
      try {
        input.focus({ preventScroll: true });
      } catch (e) {
        input.focus();
      }
    }

    input.addEventListener("input", update);

    /* Focus alone must NOT open suggestions / overlay — that was the stuck sidebar. */
    input.addEventListener("focus", function () {
      loadIndex();
    });

    input.addEventListener("keydown", function (e) {
      var opts = results.querySelectorAll(".home-search__result");
      if (e.key === "Escape") {
        e.preventDefault();
        if (open) {
          close();
        } else {
          input.blur();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!opts.length) return;
        setActive(active < 0 ? 0 : (active + 1) % opts.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!opts.length) return;
        setActive(active <= 0 ? opts.length - 1 : active - 1);
        return;
      }
      if (e.key === "Enter") {
        if (!flat.length) return;
        e.preventDefault();
        var item = flat[active >= 0 ? active : 0];
        close();
        openEntityFromItem(item);
      }
    });

    document.addEventListener("mousedown", function (e) {
      if (!open) return;
      if (wrap.contains(e.target)) return;
      close();
    });

    return {
      close: close,
      update: update,
      focus: focusField,
      input: input,
      isOpen: function () {
        return open;
      }
    };
  }

  /* —— Overlay: intentional ⌘K / nav only; never empty-query suggestions —— */
  function initOverlay(heroApi) {
    var overlay = $("[data-search-overlay]");
    if (!overlay) return null;
    var input = $("[data-overlay-search-input]", overlay);
    var results = $("[data-overlay-search-results]", overlay);
    var active = -1;
    var flat = [];

    function close() {
      overlay.hidden = true;
      overlay.setAttribute("hidden", "");
      document.body.classList.remove("is-search-open");
      results.innerHTML = "";
      active = -1;
      flat = [];
    }

    function open(prefill) {
      if (heroApi) heroApi.close();
      overlay.hidden = false;
      overlay.removeAttribute("hidden");
      document.body.classList.add("is-search-open");
      loadIndex().then(function () {
        if (prefill != null) input.value = prefill;
        else if (heroApi && heroApi.input && heroApi.input.value) input.value = heroApi.input.value;
        else if (prefill === undefined && !input.value) {
          /* keep existing */
        }
        var q = (input.value || "").trim();
        /* Empty intentional open: clean panel — type to see results */
        render(filter(q));
        try {
          input.focus({ preventScroll: true });
        } catch (e) {
          input.focus();
        }
        if (input.select && input.value) input.select();
      });
    }

    function setActive(idx) {
      active = idx;
      var opts = results.querySelectorAll(".search-overlay__result");
      for (var i = 0; i < opts.length; i++) {
        opts[i].classList.toggle("is-active", i === idx);
      }
      if (opts[idx]) opts[idx].scrollIntoView({ block: "nearest" });
    }

    function render(list) {
      var q = (input.value || "").trim();
      flat = renderGrouped(results, list, q, "search-overlay__result", function (item) {
        close();
        openEntityFromItem(item);
      });
      active = -1;
    }

    input.addEventListener("input", function () {
      loadIndex().then(function () {
        render(filter(input.value));
      });
    });

    input.addEventListener("keydown", function (e) {
      var opts = results.querySelectorAll(".search-overlay__result");
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!opts.length) return;
        setActive(active < 0 ? 0 : (active + 1) % opts.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!opts.length) return;
        setActive(active <= 0 ? opts.length - 1 : active - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!flat.length) return;
        var item = flat[active >= 0 ? active : 0];
        close();
        openEntityFromItem(item);
      }
    });

    overlay.querySelectorAll("[data-search-close]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });

    return { open: open, close: close };
  }

  function boot() {
    var heroApi = initHero();
    var overlayApi = initOverlay(heroApi);

    function openSearch(prefill) {
      /* Prefer hero product surface when on home with hero field */
      if (heroApi && document.body.classList.contains("is-home")) {
        if (prefill != null && prefill !== "") {
          heroApi.input.value = prefill;
          heroApi.focus();
          heroApi.update();
          return;
        }
        heroApi.focus();
        return;
      }
      if (overlayApi) overlayApi.open(prefill);
    }

    function closeAll() {
      if (heroApi) heroApi.close();
      if (overlayApi) overlayApi.close();
    }

    document.querySelectorAll("[data-nav-search]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        /* Intentional open: overlay with scrim (Esc/scrim closes). Empty = no suggestions. */
        if (overlayApi) overlayApi.open("");
        else openSearch();
      });
    });

    document.querySelectorAll("[data-open-entity]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        closeAll();
        var id = btn.getAttribute("data-open-entity");
        if (window.MartialIndexEntity && window.MartialIndexEntity.canOpen && window.MartialIndexEntity.canOpen(id)) {
          window.MartialIndexEntity.open(id);
          return;
        }
        openEntityFromItem({
          entityId: id,
          title: btn.getAttribute("data-entity-title") || btn.textContent,
          url: btn.getAttribute("data-entity-url") || "#",
          cat: btn.getAttribute("data-entity-kind") || "term",
          meta: btn.getAttribute("data-entity-kind") || ""
        });
      });
    });

    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      var typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target && e.target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (overlayApi) overlayApi.open("");
        else openSearch();
        return;
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (heroApi) {
          heroApi.focus();
        } else if (overlayApi) {
          overlayApi.open("");
        }
        return;
      }
      if (e.key === "Escape") {
        var ov = $("[data-search-overlay]");
        if (ov && !ov.hidden) {
          e.preventDefault();
          if (overlayApi) overlayApi.close();
          return;
        }
        if (heroApi && heroApi.isOpen()) {
          e.preventDefault();
          heroApi.close();
          return;
        }
        if (document.body.classList.contains("is-entity-open")) {
          if (window.MartialIndexEntity) window.MartialIndexEntity.close();
        }
      }
    });

    var hash = window.location.hash || "";
    var m = hash.match(/^#entity\/([^\/\?]+)/);
    if (m && m[1] === "closed-guard") {
      loadIndex().then(function () {
        if (window.MartialIndexEntity) window.MartialIndexEntity.open("closed-guard");
      });
    }

    var params = new URLSearchParams(window.location.search);
    if (params.get("q")) {
      openSearch(params.get("q"));
    }

    loadIndex();

    window.MartialIndexSearch = {
      open: openSearch,
      close: closeAll,
      select: openEntityFromItem,
      openEntity: openEntityFromItem
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
