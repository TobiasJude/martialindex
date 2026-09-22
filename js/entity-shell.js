(function () {
  "use strict";

  var ENTITY_FILES = {
    "closed-guard": "/data/entity-closed-guard.json?v=ia40b",
    "armbar": "/data/entity-armbar.json?v=ia40b",
    "escape": "/data/entity-escape.json?v=ia40b",
    "armbar-defense": "/data/entity-escape.json?v=ia40b"
  };
  var DATA_URL = ENTITY_FILES["closed-guard"];
  var cache = {};
  var currentId = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function linkOrSpan(item) {
    if (item.url) {
      return '<a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.label) + "</a>";
    }
    return "<span>" + escapeHtml(item.label) + "</span>";
  }
  function note(item) {
    return item.note
      ? '<span class="entity-lens__note">' + escapeHtml(item.note) + "</span>"
      : "";
  }


  function renderNeighborhood(host, nb, centerLabel) {
    if (!host || !nb) return;
    var W = 640;
    var H = 320;
    var cx = W / 2;
    var cy = H / 2;
    var svgNS = "http://www.w3.org/2000/svg";
    var centerId =
      (nb.center && nb.center.id) ||
      currentId ||
      "closed-guard";
    var wrap = document.createElement("div");
    wrap.className = "entity-nb";

    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "entity-nb__svg");
    svg.setAttribute("aria-hidden", "true");
    var g = document.createElementNS(svgNS, "g");

    function nodeById(id) {
      if (id === centerId) return { x: 0.5, y: 0.5, id: centerId };
      var found = null;
      (nb.nodes || []).forEach(function (n) {
        if (n.id === id) found = n;
      });
      return found;
    }

    (nb.edges || []).forEach(function (pair) {
      var a = nodeById(pair[0]);
      var b = nodeById(pair[1]);
      if (!a || !b) return;
      var ax = (a.x != null ? a.x : 0.5) * W;
      var ay = (a.y != null ? a.y : 0.5) * H;
      var bx = (b.x != null ? b.x : 0.5) * W;
      var by = (b.y != null ? b.y : 0.5) * H;
      if (pair[0] === centerId) {
        ax = cx;
        ay = cy;
      }
      if (pair[1] === centerId) {
        bx = cx;
        by = cy;
      }
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(ax));
      line.setAttribute("y1", String(ay));
      line.setAttribute("x2", String(bx));
      line.setAttribute("y2", String(by));
      g.appendChild(line);
    });
    svg.appendChild(g);

    var labels = document.createElement("div");
    labels.className = "entity-nb__labels";
    var center = document.createElement("span");
    center.className = "entity-nb__center";
    center.textContent = centerLabel || (nb.center && nb.center.label) || "Center";
    center.style.left = "50%";
    center.style.top = "50%";
    labels.appendChild(center);

    (nb.nodes || []).forEach(function (n) {
      var a = document.createElement("a");
      a.className = "entity-nb__node entity-nb__node--" + (n.ring || "related");
      a.href = n.url || "#";
      a.textContent = n.label;
      a.style.left = n.x * 100 + "%";
      a.style.top = n.y * 100 + "%";
      a.setAttribute("data-nb-id", n.id || "");
      if (n.entity) a.setAttribute("data-nb-entity", n.entity);
      a.addEventListener("click", function (ev) {
        var eid = n.entity || n.id;
        if (eid && ENTITY_FILES[eid]) {
          ev.preventDefault();
          open(eid, { keepNeighborhood: true });
          return;
        }
        // otherwise follow href to term URL
      });
      labels.appendChild(a);
    });

    wrap.appendChild(svg);
    wrap.appendChild(labels);
    host.innerHTML = "";
    host.appendChild(wrap);
  }


  function renderOverview(panel, data) {
    var o = data.overview || {};
    var you = o.youCan || {};
    var html = "";
    /* Two independent stacks — avoids 2×2 grid stretch blank under Situation */
    html += '<div class="entity-lens__grid">';
    html += '<div class="entity-lens__stack">';
    html +=
      '<section class="entity-lens__col"><h3>Situation</h3><p>' +
      escapeHtml(o.situation || "") +
      "</p></section>";
    html += '<section class="entity-lens__col"><h3>What can they do?</h3><ul>';
    (o.theyCan || []).forEach(function (item) {
      html += "<li>" + linkOrSpan(item) + note(item) + "</li>";
    });
    html += "</ul></section>";
    html += "</div>";
    html += '<div class="entity-lens__stack">';
    html += '<section class="entity-lens__col"><h3>What can I do from here?</h3>';
    html += '<p class="entity-lens__sub">Attack</p><ul>';
    (you.attack || []).forEach(function (item) {
      html += "<li>" + linkOrSpan(item) + note(item) + "</li>";
    });
    html += '</ul><p class="entity-lens__sub">Control</p><ul>';
    (you.control || []).forEach(function (item) {
      html += "<li>" + linkOrSpan(item) + note(item) + "</li>";
    });
    html += "</ul></section>";
    html += '<section class="entity-lens__col"><h3>What does it connect to?</h3><ul>';
    (o.connectsTo || []).forEach(function (item) {
      html += "<li>" + linkOrSpan(item) + "</li>";
    });
    html += "</ul></section>";
    html += "</div></div>";

    html +=
      '<div class="entity-lens__nb-head"><p class="entity-lens__kicker">Neighborhood</p></div>';
    html += '<div class="entity-nb-host" data-entity-nb></div>';
    panel.innerHTML = html;
    renderNeighborhood($("[data-entity-nb]", panel), data.neighborhood, data.title);
  }

  function renderListPanel(panel, title, items, stub) {
    var html = "<h3>" + escapeHtml(title) + "</h3>";
    if (stub) html += '<p class="entity-lens__stub">' + escapeHtml(stub) + "</p>";
    if (items && items.length) {
      html += "<ul>";
      items.forEach(function (item) {
        html += "<li>" + linkOrSpan(item) + note(item) + "</li>";
      });
      html += "</ul>";
    }
    panel.innerHTML = html;
  }

  function activate(shell, name) {
    $all("[data-lens-tab]", shell).forEach(function (btn) {
      var on = btn.getAttribute("data-lens-tab") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    $all("[data-lens-panel]", shell).forEach(function (panel) {
      var on = panel.getAttribute("data-lens-panel") === name;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
  }

  function countLabel(n, base) {
    if (n == null) return base;
    return base + " (" + n + ")";
  }


  function listItems(items) {
    if (!items || !items.length) return "";
    var html = "<ul>";
    items.forEach(function (item) {
      html +=
        "<li>" +
        linkOrSpan(item) +
        (item.note ? '<span class="entity-card__note">' + escapeHtml(item.note) + "</span>" : "") +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  function buildUnderstandingHTML(data) {
    var o = data.overview || {};
    var you = o.youCan || {};
    var sessionUrl = data.sessionUrl || "/sessions/?path=stuck-closed-guard";
    var catalogUrl =
      data.catalogUrl ||
      (data.neighborhood && data.neighborhood.center && data.neighborhood.center.url) ||
      (data.id === "armbar"
        ? "/terms/armbar/"
        : data.id === "escape" || data.id === "armbar-defense"
          ? "/terms/armbar-defense/"
          : "/terms/closed-guard/");

    var whatItIs =
      data.whatItIs ||
      [data.definition || "", o.situation || ""]
        .filter(Boolean)
        .join(" ");

    var cues = data.cues || [];
    if (!cues.length && o.situation) {
      cues = [o.situation];
    }

    var youItems = [].concat(you.attack || [], you.control || []);
    var theyItems = o.theyCan || [];
    var whereItems = o.connectsTo || data.relatedPositions || [];

    var html = "";
    html +=
      '<div class="home-entity__toolbar"><button type="button" class="home-entity__back" data-entity-close>← Back</button></div>';

    html +=
      '<article class="entity-card" aria-label="' +
      escapeHtml(data.title || "Entity") +
      '">';
    html +=
      '<h1 class="entity-card__title">' + escapeHtml(data.title || "") + "</h1>";
    html +=
      '<p class="entity-card__meta">' +
      escapeHtml(data.type || "Entity") +
      " · " +
      escapeHtml(data.artShort || data.art || "") +
      "</p>";

    if (whatItIs) {
      html += '<section class="entity-card__sec">';
      html += "<h2>What it is</h2>";
      html += "<p>" + escapeHtml(whatItIs) + "</p></section>";
    }

    if (cues.length) {
      html += '<section class="entity-card__sec">';
      html += "<h2>How it works</h2><ul>";
      cues.forEach(function (c) {
        var label = typeof c === "string" ? c : c.label || "";
        if (!label) return;
        html += "<li>" + escapeHtml(label) + "</li>";
      });
      html += "</ul></section>";
    }

    html += '<section class="entity-card__sec">';
    html += "<h2>What you can do</h2>";
    html += listItems(youItems) || "<p>—</p>";
    html += "</section>";

    html += '<section class="entity-card__sec">';
    html += "<h2>What they can do</h2>";
    html += listItems(theyItems) || "<p>—</p>";
    html += "</section>";

    html += '<section class="entity-card__sec">';
    html += "<h2>Where it goes</h2>";
    html += listItems(whereItems) || "<p>—</p>";
    html += "</section>";

    html += '<div class="entity-card__cta-row">';
    html +=
      '<a class="entity-card__cta" href="' +
      escapeHtml(sessionUrl) +
      '">Test yourself</a>';
    html +=
      '<a class="entity-card__catalog" href="' +
      escapeHtml(catalogUrl) +
      '">Full catalog entry</a>';
    html += "</div>";

    html += "</article>";
    return html;
  }


  function buildShellHTML(data, opts) {
    opts = opts || {};
    var c = data.counts || {};
    var crumbs = data.breadcrumb || [];
    var crumbHtml = crumbs
      .map(function (cr, i) {
        if (cr.url && i < crumbs.length - 1) {
          return '<a href="' + escapeHtml(cr.url) + '">' + escapeHtml(cr.label) + "</a>";
        }
        return "<span>" + escapeHtml(cr.label) + "</span>";
      })
      .join('<span class="entity-os__crumb-sep">›</span>');

    var html = "";
    if (opts.home) {
      html +=
        '<div class="home-entity__toolbar"><button type="button" class="home-entity__back" data-entity-close>← Back</button>';
      html +=
        '<a class="home-entity__full" href="/terms/closed-guard/">Open full entry</a></div>';
    }

    html += '<div class="entity-os" aria-label="' + escapeHtml(data.title || "Entity") + '">';
    html += '<div class="entity-os__inner">';
    html += '<div class="entity-os__top">';
    html += '<div class="entity-os__copy">';
    if (crumbHtml) html += '<nav class="entity-os__crumbs" aria-label="Breadcrumb">' + crumbHtml + "</nav>";
    html += '<h1 class="entity-os__title">' + escapeHtml(data.title || "") + "</h1>";
    html +=
      '<p class="entity-os__meta">' +
      escapeHtml(data.artShort || data.art || "") +
      " — " +
      escapeHtml(data.type || "") +
      "</p>";
    html +=
      '<p class="entity-os__dek">' +
      escapeHtml(data.definition || "") +
      "</p>";
    html += "</div>";
    // Home entity panel: optional corner plate. Term pages: omit corner float.
    if (data.image && !opts.omitPlate) {
      html +=
        '<figure class="entity-os__plate"><img src="' +
        escapeHtml(data.image) +
        '" alt="' +
        escapeHtml(data.imageAlt || data.title || "") +
        '" width="' + escapeHtml(data.imageWidth || 420) +
        '" height="' + escapeHtml(data.imageHeight || 300) +
        (data.imageSrcset ? '" srcset="' + escapeHtml(data.imageSrcset) +
          '" sizes="' + escapeHtml(data.imageSizes || '(max-width: 800px) 100vw, 420px') : '') +
        '" loading="eager" decoding="async"></figure>';
    }
    html += "</div>";
    // Term/blog SEO lead: full-width under dek, before lenses (not homepage corner).
    if (data.image && opts.omitPlate) {
      html +=
        '<figure class="entity-os__lead" id="lead-illustration"><div class="media-frame"><img src="' +
        escapeHtml(data.image) +
        '" alt="' +
        escapeHtml(data.imageAlt || data.title || "") +
        '" width="' + escapeHtml(data.imageWidth || 1200) +
        '" height="' + escapeHtml(data.imageHeight || 800) +
        (data.imageSrcset ? '" srcset="' + escapeHtml(data.imageSrcset) +
          '" sizes="' + escapeHtml(data.imageSizes || '(max-width: 900px) 100vw, 900px') : '') +
        '" loading="eager" decoding="async" fetchpriority="high"></div></figure>';
    }

    html += '<div class="entity-lenses" role="tablist" aria-label="Lenses">';
    html +=
      '<button type="button" role="tab" data-lens-tab="overview" aria-selected="true" class="is-active">Overview</button>';
    html +=
      '<button type="button" role="tab" data-lens-tab="techniques" aria-selected="false">' +
      escapeHtml(countLabel(c.techniques, "Techniques")) +
      "</button>";
    html +=
      '<button type="button" role="tab" data-lens-tab="counters" aria-selected="false">' +
      escapeHtml(countLabel(c.counters, "Counters")) +
      "</button>";
    html +=
      '<button type="button" role="tab" data-lens-tab="related" aria-selected="false">' +
      escapeHtml(countLabel(c.related, "Related")) +
      "</button>";
    html +=
      '<button type="button" role="tab" data-lens-tab="people" aria-selected="false">' +
      escapeHtml(countLabel(c.people, "People")) +
      "</button>";
    html +=
      '<button type="button" role="tab" data-lens-tab="history" aria-selected="false">' +
      escapeHtml(countLabel(c.history, "History")) +
      "</button>";
    html += "</div>";

    html += '<div class="entity-lens-panel is-active" data-lens-panel="overview" role="tabpanel"></div>';
    html += '<div class="entity-lens-panel" data-lens-panel="techniques" role="tabpanel" hidden></div>';
    html += '<div class="entity-lens-panel" data-lens-panel="counters" role="tabpanel" hidden></div>';
    html += '<div class="entity-lens-panel" data-lens-panel="related" role="tabpanel" hidden></div>';
    html += '<div class="entity-lens-panel" data-lens-panel="people" role="tabpanel" hidden></div>';
    html += '<div class="entity-lens-panel" data-lens-panel="history" role="tabpanel" hidden></div>';

    // Key relationships + quick actions + related cards (overview companion, always visible below tabs content area via overview; also sticky strip)
    html += '<div class="entity-os__aside" data-entity-aside>';
    html += '<div class="entity-keyrel">';
    html += '<p class="entity-keyrel__label">Key relationships</p><ul>';
    (data.keyRelationships || []).forEach(function (rel) {
      html +=
        '<li><button type="button" data-lens-jump="' +
        escapeHtml(rel.lens || "overview") +
        '"><span>' +
        escapeHtml(rel.label) +
        '</span><span class="entity-keyrel__count">' +
        escapeHtml(String(rel.count)) +
        " ›</span></button></li>";
    });
    html += "</ul></div>";

    html += '<div class="entity-actions">';
    if (data.sessionUrl) {
      html +=
        '<a class="entity-actions__btn entity-actions__btn--solid" href="' +
        escapeHtml(data.sessionUrl) +
        '">Start Session →</a>';
    }
    html +=
      '<button type="button" class="entity-actions__btn" data-lens-jump="related">Explore Related</button>';
    html += "</div>";

    html += '<div class="entity-related-cards">';
    html += '<p class="entity-related-cards__label">Related positions</p><ul>';
    (data.relatedPositions || []).forEach(function (p) {
      html +=
        '<li><a href="' +
        escapeHtml(p.url || "#") +
        '"><span class="entity-related-cards__title">' +
        escapeHtml(p.label) +
        '</span><span class="entity-related-cards__note">' +
        escapeHtml(p.note || "Position") +
        "</span></a></li>";
    });
    html += "</ul></div>";
    html += "</div>";

    html += "</div></div>";
    return html;
  }

  function fillPanels(shell, data) {
    var overview = $('[data-lens-panel="overview"]', shell);
    var techniques = $('[data-lens-panel="techniques"]', shell);
    var counters = $('[data-lens-panel="counters"]', shell);
    var related = $('[data-lens-panel="related"]', shell);
    var people = $('[data-lens-panel="people"]', shell);
    var history = $('[data-lens-panel="history"]', shell);

    // legacy aliases
    var attacks = $('[data-lens-panel="attacks"]', shell);
    var defense = $('[data-lens-panel="defense"]', shell);
    var transitions = $('[data-lens-panel="transitions"]', shell);

    if (overview) renderOverview(overview, data);
    if (techniques) renderListPanel(techniques, "Techniques from here", data.techniques || data.attacks);
    if (counters) renderListPanel(counters, "Counters / passer options", data.counters || data.defense);
    if (related) renderListPanel(related, "Related", data.related || data.transitions);
    if (people) renderListPanel(people, "People", data.people);
    if (history)
      renderListPanel(
        history,
        "History",
        (data.history && data.history.items) || [],
        (data.history && data.history.stub) || ""
      );

    if (attacks) renderListPanel(attacks, "Attacks from here", data.attacks || data.techniques);
    if (defense) renderListPanel(defense, "Defense / passer options", data.defense || data.counters);
    if (transitions) renderListPanel(transitions, "Transitions", data.transitions || data.related);

    $all("[data-lens-tab]", shell).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activate(shell, btn.getAttribute("data-lens-tab"));
      });
    });
    $all("[data-lens-jump]", shell).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activate(shell, btn.getAttribute("data-lens-jump"));
      });
    });
    activate(shell, "overview");
  }

  function loadData(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("entity data failed");
        return r.json();
      })
      .then(function (data) {
        cache[url] = data;
        return data;
      });
  }


  function showNeighborhood(host, data) {
    var panel = $("[data-entity-nb-panel]", host);
    if (!panel) return;
    panel.hidden = false;
    panel.removeAttribute("hidden");
    renderNeighborhood($("[data-entity-nb]", panel), data.neighborhood, data.title);
    try {
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {}
  }

  function mountHome(data, opts) {
    opts = opts || {};
    var host = $("[data-home-entity]");
    var inner = host && $("[data-entity-shell]", host);
    if (!host || !inner) return;
    currentId = data.id || currentId || "closed-guard";
    inner.innerHTML = buildUnderstandingHTML(data);
    host.hidden = false;
    host.removeAttribute("hidden");
    document.body.classList.add("is-entity-open");

    var closeBtn = $("[data-entity-close]", host);
    if (closeBtn) {
      closeBtn.onclick = function () {
        closeHome();
      };
    }

    // In-card hops stay on the one-screen card (no neighborhood recenter)
    $all("a[href]", host).forEach(function (a) {
      if (a.classList.contains("entity-card__cta") || a.classList.contains("entity-card__catalog")) {
        return;
      }
      var href = a.getAttribute("href") || "";
      var m = href.match(/\/terms\/([a-z0-9-]+)\/?/);
      if (!m) return;
      var eid = m[1];
      if (!ENTITY_FILES[eid]) return;
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        open(eid);
      });
    });

    try {
      history.replaceState(null, "", "#entity/" + (data.id || "closed-guard"));
    } catch (e2) {}
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e3) {
      window.scrollTo(0, 0);
    }
  }


  function closeHome() {
    var host = $("[data-home-entity]");
    if (host) {
      host.hidden = true;
      host.setAttribute("hidden", "");
    }
    document.body.classList.remove("is-entity-open");
    try {
      if ((window.location.hash || "").indexOf("#entity/") === 0) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch (e) {}
  }

  function openStub(info) {
    var host = $("[data-home-entity]");
    var inner = host && $("[data-entity-shell]", host);
    if (!host || !inner) {
      if (info.url) window.location.href = info.url;
      return;
    }
    var data = {
      id: info.id,
      title: info.title || "Entity",
      type: info.type || "Entity",
      art: info.art || "",
      artShort: info.art || "",
      definition: "Catalog entry available. Closed Guard is the full object-card slice.",
      whatItIs: "This entry is a stub card. Open the catalog page for the full term, or start with Closed Guard.",
      cues: [],
      catalogUrl: info.url || "/terms/",
      breadcrumb: [{ label: info.type || "Index", url: "/terms/" }, { label: info.title || "Entity" }],
      sessionUrl: "/sessions/",
      counts: {},
      keyRelationships: [],
      relatedPositions: [],
      overview: {
        situation: "",
        youCan: { attack: [], control: [] },
        theyCan: [],
        connectsTo: []
      },
      techniques: [],
      counters: [],
      related: [],
      people: [],
      history: { stub: "", items: [] }
    };
    if (info.url) {
      data.definition += "";
    }
    mountHome(data);
    // Add open link if url
    if (info.url && info.url !== "#") {
      var full = $(".home-entity__full", host);
      if (full) full.href = info.url;
      else {
        var tb = $(".home-entity__toolbar", host);
        if (tb) {
          var a = document.createElement("a");
          a.className = "home-entity__full";
          a.href = info.url;
          a.textContent = "Open full entry";
          tb.appendChild(a);
        }
      }
    }
  }


  function open(id, opts) {
    opts = opts || {};
    var key = id || "closed-guard";
    var url = ENTITY_FILES[key];
    if (!url) {
      openStub({ id: key, title: key, type: "Entity" });
      return;
    }
    currentId = key;
    loadData(url)
      .then(function (data) {
        var homeHost = $("[data-home-entity]");
        if (homeHost) {
          mountHome(data, opts);
        } else {
          var shell = $("[data-entity-shell]");
          if (shell && !shell.getAttribute("data-built")) {
            if ($("[data-lens-panel]", shell)) {
              fillPanels(shell, data);
            } else {
              shell.innerHTML = buildShellHTML(data, { home: false, omitPlate: true });
              fillPanels($(".entity-os", shell) || shell, data);
            }
          }
        }
      })
      .catch(function (err) {
        console.warn("entity-shell", err);
      });
  }


  function initStaticPage() {
    var shell = $("[data-entity-shell]");
    var homeHost = $("[data-home-entity]");
    if (homeHost) return; // home uses open() API
    if (!shell) return;
    var inline = shell.getAttribute("data-entity-src");
    var url = inline || DATA_URL;
    loadData(url)
      .then(function (data) {
        // Rebuild lenses/aside; omit homepage-style corner plate on term pages (post66).
        // Images stay in article media-frame + session teach plates.
        shell.innerHTML = buildShellHTML(data, { home: false, omitPlate: true });
        fillPanels($(".entity-os", shell) || shell, data);
      })
      .catch(function (err) {
        console.warn("entity-shell", err);
      });
  }

  window.MartialIndexEntity = {
    open: open,
    openStub: openStub,
    close: closeHome,
    canOpen: function (id) {
      return !!ENTITY_FILES[id];
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStaticPage);
  } else {
    initStaticPage();
  }
})();
