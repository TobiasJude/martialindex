(function () {
  "use strict";

  /* Guided Paths hub + walker. No MCQ, no scoring. ia19 */

  var PHOTO = "/media/photos/";

  var PATHS = [
    {
      id: "lineage-cage",
      title: "Judo → BJJ → MMA",
      dek: "Throws to guard to the cage — the modern grappling trunk under MMA rules.",
      domain: "mixed",
      featured: true,
      image: PHOTO + "bsd-alvarez-cage-control.jpg",
      plate: "JB",
      stops: [
        {
          art: "Judo",
          slug: "judo",
          url: "/styles/judo/",
          note: "Judo is the throw-and-pin art that made standing grips a science. Balance, kuzushi, and newaza on the ground are the trunk many modern grappling trees still grow from."
        },
        {
          art: "Brazilian Jiu-Jitsu",
          slug: "bjj",
          url: "/styles/bjj/",
          note: "BJJ took judo’s ground game and made the guard a whole world — positions, submissions, and the idea that a smaller person can win by leverage and patience."
        },
        {
          art: "MMA",
          slug: "mma",
          url: "/styles/mma/",
          note: "MMA is where those lineages meet striking under one rule set. The cage rewards who can force their preferred range — and who can survive everyone else’s."
        }
      ]
    },
    {
      id: "striking-ring",
      title: "Boxing → Muay Thai → Kickboxing",
      dek: "Hands only, then eight limbs, then the hybrid kickboxing frame.",
      domain: "striking",
      featured: false,
      image: PHOTO + "boxing-range-chase.jpg",
      plate: "BM",
      stops: [
        {
          art: "Boxing",
          slug: "boxing",
          url: "/styles/boxing/",
          note: "Boxing is ringcraft with the hands: footwork, the jab, and combinations that control distance without ever needing a kick."
        },
        {
          art: "Muay Thai",
          slug: "muay-thai",
          url: "/styles/muay-thai/",
          note: "Muay Thai adds elbows, knees, kicks, and the clinch. Same idea of range — but the whole body becomes a weapon, and the plum changes the fight."
        },
        {
          art: "Kickboxing",
          slug: "kickboxing",
          url: "/styles/kickboxing/",
          note: "Kickboxing sits between them: boxing hands plus kicks, often without the full Thai clinch. A clean hybrid for people who want ring striking without eight limbs."
        }
      ]
    },
    {
      id: "grappling-ground",
      title: "Wrestling → Judo → BJJ",
      dek: "Takedowns into throws into the guard — three grappling languages.",
      domain: "grappling",
      featured: false,
      image: PHOTO + "freestyle-wrestling.jpg",
      plate: "WJ",
      stops: [
        {
          art: "Wrestling",
          slug: "wrestling",
          url: "/styles/wrestling/",
          note: "Wrestling is the takedown engine: level changes, chains, and control that don’t need a gi. It teaches how to put someone down and keep them there."
        },
        {
          art: "Judo",
          slug: "judo",
          url: "/styles/judo/",
          note: "Judo turns grips into throws and pins. Standing balance-breaking plus a structured ground game — the bridge between mat wrestling and jacket grappling."
        },
        {
          art: "Brazilian Jiu-Jitsu",
          slug: "bjj",
          url: "/styles/bjj/",
          note: "BJJ is the positional syllabus once you’re on the floor: guard, pass, mount, back, finish. Wrestling gets you there; BJJ decides what happens next."
        }
      ]
    },
    {
      id: "thai-cage",
      title: "Muay Thai → Kickboxing → MMA",
      dek: "Eight limbs into the cage — clinch and kick striking under mixed rules.",
      domain: "mixed",
      featured: false,
      image: PHOTO + "muay-thai-knee-clinch.jpg",
      plate: "MT",
      stops: [
        {
          art: "Muay Thai",
          slug: "muay-thai",
          url: "/styles/muay-thai/",
          note: "Muay Thai builds the complete striking body: kicks, knees, elbows, and the clinch as a scoring weapon, not just a stall."
        },
        {
          art: "Kickboxing",
          slug: "kickboxing",
          url: "/styles/kickboxing/",
          note: "Kickboxing trims the clinch and sharpens the punch-kick exchange — useful range work for fighters who need cleaner entries into MMA."
        },
        {
          art: "MMA",
          slug: "mma",
          url: "/styles/mma/",
          note: "In MMA, Thai-derived striking meets takedown defense and ground threat. The question is always: can you keep the fight standing long enough?"
        }
      ]
    },
    {
      id: "lineage-flow",
      title: "Kung Fu → Wing Chun → Jeet Kune Do",
      dek: "Classical Chinese systems into Wing Chun, then Jeet Kune Do.",
      domain: "striking",
      featured: false,
      image: PHOTO + "wing-chun-forms.jpg",
      plate: "KW",
      stops: [
        {
          art: "Kung Fu",
          slug: "kung-fu",
          url: "/styles/kung-fu/",
          note: "Kung fu is a wide family of Chinese martial systems — forms, weapons, and close-range ideas that fed countless later styles."
        },
        {
          art: "Wing Chun",
          slug: "wing-chun",
          url: "/styles/wing-chun/",
          note: "Wing Chun narrows that field: centerline, economy, and sticky hands. Short structure, fast intercepts, less ornament."
        },
        {
          art: "Jeet Kune Do",
          slug: "jeet-kune-do",
          url: "/styles/jeet-kune-do/",
          note: "Jeet Kune Do takes the intercept and refuses the fixed style. Absorb what is useful, discard what isn’t — a philosophy as much as a syllabus."
        }
      ]
    },
    {
      id: "sambo-bridge",
      title: "Judo → Sambo → MMA",
      dek: "Jacket throws into combat sambo, then the mixed rule set.",
      domain: "grappling",
      featured: false,
      image: PHOTO + "sambo-european-games.jpg",
      plate: "JS",
      stops: [
        {
          art: "Judo",
          slug: "judo",
          url: "/styles/judo/",
          note: "Judo’s grip fighting and hip throws are the shared grammar. Sambo borrows the jacket game and rewrites the ground rules."
        },
        {
          art: "Sambo",
          slug: "sambo",
          url: "/styles/sambo/",
          note: "Sambo mixes jacket throws with aggressive leg locks and a combat branch that already includes striking — a Soviet synthesis built for sport and field."
        },
        {
          art: "MMA",
          slug: "mma",
          url: "/styles/mma/",
          note: "Combat sambo athletes often translate cleanly into MMA: throws, submissions, and striking already live in one system."
        }
      ]
    },
    {
      id: "catch-line",
      title: "Catch Wrestling → BJJ → Vale Tudo",
      dek: "Old catch holds into modern guard work, then no-gi fighting without gloves.",
      domain: "grappling",
      featured: false,
      image: PHOTO + "catch-wrestling-burns-gotch-01.jpg",
      plate: "CB",
      stops: [
        {
          art: "Catch Wrestling",
          slug: "catch-wrestling",
          url: "/styles/catch-wrestling/",
          note: "Catch is the carnival submission art: pins, cranking holds, and a willingness to finish from anywhere — the ancestor of a lot of modern no-gi."
        },
        {
          art: "Brazilian Jiu-Jitsu",
          slug: "bjj",
          url: "/styles/bjj/",
          note: "BJJ systematized the ground into positions and hierarchies. Where catch hunted holds, BJJ taught sequences and control."
        },
        {
          art: "Vale Tudo",
          slug: "vale-tudo",
          url: "/styles/vale-tudo/",
          note: "Vale tudo is the Brazilian no-holds-barred tradition that tested grappling under punches — a direct ancestor of modern MMA."
        }
      ]
    },
    {
      id: "karate-kick",
      title: "Karate → Kyokushin → Kickboxing",
      dek: "Traditional karate into full-contact Kyokushin, then the kickboxing ring.",
      domain: "striking",
      featured: false,
      image: PHOTO + "kyokushin-karate-match.jpg",
      plate: "KK",
      stops: [
        {
          art: "Karate",
          slug: "karate",
          url: "/styles/karate/",
          note: "Karate is a family of Okinawan and Japanese striking systems — kata, kihon, and sparring rules that vary from light to bone-on-bone."
        },
        {
          art: "Kyokushin",
          slug: "kyokushin",
          url: "/styles/kyokushin/",
          note: "Kyokushin is full-contact karate without punches to the head: body shots, low kicks, and toughness as a syllabus requirement."
        },
        {
          art: "Kickboxing",
          slug: "kickboxing",
          url: "/styles/kickboxing/",
          note: "Many Kyokushin athletes crossed into kickboxing — gloves on, head punches allowed, same kick pressure under different rules."
        }
      ]
    },
    {
      id: "weapons-edge",
      title: "Fencing → HEMA → Kendo",
      dek: "Sport foil into historical European arms, then Japanese sword sport.",
      domain: "weapons",
      featured: false,
      image: PHOTO + "fencing.jpg",
      plate: "FH",
      stops: [
        {
          art: "Fencing",
          slug: "fencing",
          url: "/styles/fencing/",
          note: "Olympic fencing is electric timing and right-of-way: foil, épée, sabre — distance and initiative under a strict rule clock."
        },
        {
          art: "HEMA",
          slug: "hema",
          url: "/styles/hema/",
          note: "HEMA reconstructs historical European martial arts from treatises — longsword, messer, dagger — steel and manuals instead of electrified tips."
        },
        {
          art: "Kendo",
          slug: "kendo",
          url: "/styles/kendo/",
          note: "Kendo is the Japanese shinai sport: strikes to designated targets, bogu armor, and a clear scoring vocabulary of ki-ken-tai-ichi."
        }
      ]
    }
  ];

  var BRIDGES = [
    { from: "Judo", to: "BJJ", pathId: "lineage-cage" },
    { from: "Muay Thai", to: "MMA", pathId: "thai-cage" },
    { from: "Wrestling", to: "BJJ", pathId: "grappling-ground" },
    { from: "Boxing", to: "Kickboxing", pathId: "striking-ring" },
    { from: "Kung Fu", to: "Jeet Kune Do", pathId: "lineage-flow" },
    { from: "Catch Wrestling", to: "Vale Tudo", pathId: "catch-line" },
    { from: "Karate", to: "Kickboxing", pathId: "karate-kick" },
    { from: "Judo", to: "Sambo", pathId: "sambo-bridge" }
  ];

  var ART_INDEX = (function () {
    var map = {};
    PATHS.forEach(function (p) {
      p.stops.forEach(function (s) {
        if (!map[s.slug]) {
          map[s.slug] = { art: s.art, slug: s.slug, url: s.url };
        }
      });
    });
    return map;
  })();

  var CLOSE_DEK =
    "That’s the end of this path. Choose another, or open the map.";

  var DOMAIN_LABEL = {
    all: "All",
    grappling: "Grappling",
    striking: "Striking",
    weapons: "Weapons",
    mixed: "Mixed"
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function stopLabels(path) {
    return path.stops.map(function (s) {
      return s.art;
    });
  }

  function stopLine(path) {
    return stopLabels(path).join(" · ");
  }

  function mapHref(path) {
    if (!path || path.adhoc) return "/#map";
    return "/?path=" + encodeURIComponent(path.id) + "#map";
  }

  function findPath(id) {
    for (var i = 0; i < PATHS.length; i++) {
      if (PATHS[i].id === id) return PATHS[i];
    }
    return null;
  }

  function featuredPath() {
    for (var i = 0; i < PATHS.length; i++) {
      if (PATHS[i].featured) return PATHS[i];
    }
    return PATHS[0];
  }

  function setQueryPath(id) {
    try {
      var url = new URL(window.location.href);
      if (id) url.searchParams.set("path", id);
      else url.searchParams.delete("path");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function readQueryPath() {
    try {
      var url = new URL(window.location.href);
      return url.searchParams.get("path");
    } catch (e) {
      return null;
    }
  }

  function mediaBlock(path, className) {
    var wrap = document.createElement("div");
    wrap.className = className || "paths-media";
    if (path.image) {
      var img = document.createElement("img");
      img.src = path.image;
      img.alt = "";
      img.loading = "eager";
      img.decoding = "async";
      img.fetchPriority = "high";
      img.addEventListener("error", function () {
        wrap.innerHTML = "";
        wrap.appendChild(plateEl(path));
      });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(plateEl(path));
    }
    return wrap;
  }

  function plateEl(path) {
    var plate = document.createElement("div");
    plate.className = "paths-plate";
    plate.setAttribute("aria-hidden", "true");
    plate.textContent = path.plate || (path.title || "?").slice(0, 2).toUpperCase();
    return plate;
  }

  /* —— Hub —— */
  function initHub(hub, openWalker) {
    var featuredEl = $("[data-paths-featured]", hub);
    var gridEl = $("[data-paths-grid]", hub);
    var filtersEl = $("[data-paths-filters]", hub);
    var countEl = $("[data-paths-count]", hub);
    var bridgesEl = $("[data-paths-bridges]", hub);
    var form = $("[data-paths-finder]", hub);
    var fromSel = $("[data-finder-from]", hub);
    var toSel = $("[data-finder-to]", hub);
    var resultEl = $("[data-finder-result]", hub);
    var filter = "all";

    function renderFeatured() {
      if (!featuredEl) return;
      var p = featuredPath();
      featuredEl.innerHTML = "";

      var copy = document.createElement("div");
      copy.className = "paths-featured__copy";

      var kicker = document.createElement("p");
      kicker.className = "paths-featured__kicker";
      kicker.textContent = "Featured · " + (DOMAIN_LABEL[p.domain] || p.domain);

      var title = document.createElement("h2");
      title.className = "paths-featured__title";
      title.id = "paths-featured-title";
      title.textContent = p.title;

      var dek = document.createElement("p");
      dek.className = "paths-featured__dek";
      dek.textContent = p.dek;

      var stops = document.createElement("ol");
      stops.className = "paths-featured__stops";
      p.stops.forEach(function (s, i) {
        var li = document.createElement("li");
        li.innerHTML =
          '<span class="paths-featured__n">' +
          String(i + 1).padStart(2, "0") +
          '</span><span class="paths-featured__art"></span>';
        li.querySelector(".paths-featured__art").textContent = s.art;
        stops.appendChild(li);
      });

      var actions = document.createElement("div");
      actions.className = "paths-featured__actions";

      var cta = document.createElement("button");
      cta.type = "button";
      cta.className = "btn-primary";
      cta.textContent = "Enter path →";
      cta.addEventListener("click", function () {
        openWalker(p);
      });

      var mapLink = document.createElement("a");
      mapLink.className = "paths-map-link";
      mapLink.href = mapHref(p);
      mapLink.textContent = "View on map →";

      actions.appendChild(cta);
      actions.appendChild(mapLink);

      copy.appendChild(kicker);
      copy.appendChild(title);
      copy.appendChild(dek);
      copy.appendChild(stops);
      copy.appendChild(actions);

      var media = mediaBlock(p, "paths-featured__media");
      featuredEl.appendChild(copy);
      featuredEl.appendChild(media);
    }

    function renderCard(p) {
      /* One grid cell: article > media + body. No <a> inside <button>. */
      var card = document.createElement("article");
      card.className = "paths-card";
      card.setAttribute("data-path-id", p.id);

      var media = mediaBlock(p, "paths-card__media");

      var body = document.createElement("div");
      body.className = "paths-card__body";

      var domain = document.createElement("p");
      domain.className = "paths-card__domain";
      domain.textContent = DOMAIN_LABEL[p.domain] || p.domain;

      var title = document.createElement("h3");
      title.className = "paths-card__title";
      title.textContent = p.title;

      var meta = document.createElement("p");
      meta.className = "paths-card__meta";
      meta.textContent = p.stops.length + " stops";

      var actions = document.createElement("div");
      actions.className = "paths-card__actions";

      var enter = document.createElement("button");
      enter.type = "button";
      enter.className = "paths-card__enter";
      enter.textContent = "Enter path →";
      enter.addEventListener("click", function () {
        openWalker(p);
      });

      var mapLink = document.createElement("a");
      mapLink.className = "paths-card__map";
      mapLink.href = mapHref(p);
      mapLink.textContent = "View on map";

      actions.appendChild(enter);
      actions.appendChild(mapLink);

      body.appendChild(domain);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(actions);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderGrid() {
      if (!gridEl) return;
      gridEl.innerHTML = "";
      var list = PATHS.filter(function (p) {
        return filter === "all" || p.domain === filter;
      });
      list.forEach(function (p) {
        gridEl.appendChild(renderCard(p));
      });
      if (countEl) {
        countEl.textContent =
          list.length + (list.length === 1 ? " path" : " paths");
      }
    }

    function renderBridges() {
      if (!bridgesEl) return;
      bridgesEl.innerHTML = "";
      BRIDGES.forEach(function (b) {
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "paths-bridges__btn";
        btn.innerHTML =
          '<span class="paths-bridges__from"></span>' +
          '<span class="paths-bridges__sep" aria-hidden="true">→</span>' +
          '<span class="paths-bridges__to"></span>';
        btn.querySelector(".paths-bridges__from").textContent = b.from;
        btn.querySelector(".paths-bridges__to").textContent = b.to;
        btn.addEventListener("click", function () {
          var p = findPath(b.pathId);
          if (p) openWalker(p);
        });
        li.appendChild(btn);
        bridgesEl.appendChild(li);
      });
    }

    function fillArtSelects() {
      var arts = Object.keys(ART_INDEX)
        .map(function (k) {
          return ART_INDEX[k];
        })
        .sort(function (a, b) {
          return a.art.localeCompare(b.art);
        });
      [fromSel, toSel].forEach(function (sel) {
        if (!sel) return;
        arts.forEach(function (a) {
          var opt = document.createElement("option");
          opt.value = a.slug;
          opt.textContent = a.art;
          sel.appendChild(opt);
        });
      });
    }

    function slugIndexInPath(path, slug) {
      for (var i = 0; i < path.stops.length; i++) {
        if (path.stops[i].slug === slug) return i;
      }
      return -1;
    }

    function matchPath(fromSlug, toSlug) {
      var best = null;
      var bestScore = -1;
      PATHS.forEach(function (p) {
        var fi = slugIndexInPath(p, fromSlug);
        var ti = slugIndexInPath(p, toSlug);
        if (fi < 0 || ti < 0 || ti <= fi) return;
        var score = 100 - (ti - fi) * 10 - (p.stops.length - (ti - fi + 1));
        if (fi === 0) score += 20;
        if (ti === p.stops.length - 1) score += 20;
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      });
      return best;
    }

    function buildAdhoc(fromSlug, toSlug) {
      var a = ART_INDEX[fromSlug];
      var b = ART_INDEX[toSlug];
      if (!a || !b) return null;
      return {
        id: "adhoc-" + fromSlug + "-" + toSlug,
        title: a.art + " → " + b.art,
        dek: "Short walk between two arts in the catalog.",
        domain: "mixed",
        featured: false,
        image: null,
        plate: (a.art.charAt(0) + b.art.charAt(0)).toUpperCase(),
        adhoc: true,
        stops: [
          {
            art: a.art,
            slug: a.slug,
            url: a.url,
            note:
              a.art +
              " is catalogued here as a full style page. Start with its range, rules, and core ideas — then step to " +
              b.art +
              "."
          },
          {
            art: b.art,
            slug: b.slug,
            url: b.url,
            note:
              b.art +
              " is the destination. Compare how it handles distance, contact, and scoring against what you just read — then open the page for the full entry."
          }
        ]
      };
    }

    if (filtersEl) {
      filtersEl.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-filter]");
        if (!btn) return;
        filter = btn.getAttribute("data-filter") || "all";
        $all("[data-filter]", filtersEl).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderGrid();
      });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var fromSlug = fromSel && fromSel.value;
        var toSlug = toSel && toSel.value;
        if (!fromSlug || !toSlug) return;
        if (fromSlug === toSlug) {
          if (resultEl) {
            resultEl.hidden = false;
            resultEl.textContent = "Pick two different arts.";
          }
          return;
        }
        var matched = matchPath(fromSlug, toSlug);
        var built = matched || buildAdhoc(fromSlug, toSlug);
        if (!built) {
          if (resultEl) {
            resultEl.hidden = false;
            resultEl.textContent = "No walk available for that pair yet.";
          }
          return;
        }
        if (resultEl) {
          resultEl.hidden = false;
          resultEl.textContent = matched
            ? "Matched curated path: " + matched.title
            : "Built a short walk: " + built.title;
        }
        openWalker(built);
      });
    }

    renderFeatured();
    renderGrid();
    renderBridges();
    fillArtSelects();
  }

  /* —— Walker —— */
  function initWalker(root, onBack) {
    var idEl = $("[data-path-id]", root);
    var titleEl = $("[data-path-title]", root);
    var dotsEl = $("[data-path-dots]", root);
    var beatEl = $("[data-path-beat]", root);
    var stopEl = $("[data-path-stop]", root);
    var artEl = $("[data-path-art]", root);
    var noteEl = $("[data-path-note]", root);
    var openEl = $("[data-path-open]", root);
    var nextEl = $("[data-path-next]", root);
    var closeEl = $("[data-path-close]", root);
    var closeDek = $("[data-path-close-dek]", root);
    var againEl = $("[data-path-again]", root);

    var path = null;
    var index = 0;

    function setDots(i, done) {
      if (!dotsEl || !path) return;
      var items = $all("li", dotsEl);
      items.forEach(function (d, n) {
        d.classList.toggle("is-current", !done && n === i);
        d.classList.toggle("is-done", done || n < i);
      });
    }

    function buildDots(n) {
      if (!dotsEl) return;
      dotsEl.innerHTML = "";
      for (var i = 0; i < n; i++) {
        dotsEl.appendChild(document.createElement("li"));
      }
    }

    function showStop() {
      if (!path) return;
      var stop = path.stops[index];
      if (!stop) return;
      if (stopEl) stopEl.hidden = false;
      if (closeEl) closeEl.hidden = true;
      setDots(index, false);
      if (beatEl) {
        beatEl.textContent =
          "Stop " +
          String(index + 1).padStart(2, "0") +
          " · " +
          path.stops.length;
      }
      if (artEl) artEl.textContent = stop.art;
      if (noteEl) noteEl.textContent = stop.note;
      if (openEl) {
        openEl.href = stop.url;
        openEl.textContent = "Open " + stop.art + " →";
      }
      if (nextEl) {
        nextEl.textContent =
          index >= path.stops.length - 1 ? "Finish path →" : "Next →";
      }
    }

    function showClose() {
      if (stopEl) stopEl.hidden = true;
      if (closeEl) closeEl.hidden = false;
      setDots(path.stops.length - 1, true);
      if (beatEl) beatEl.textContent = "Complete";
      if (closeDek) closeDek.textContent = CLOSE_DEK;
    }

    function start(p) {
      path = p;
      index = 0;
      if (idEl) {
        idEl.textContent = p.adhoc ? "Short walk" : "Path";
      }
      if (titleEl) titleEl.textContent = p.title;
      var mapSlot = root.querySelector("[data-path-map]") || null;
      if (!mapSlot) {
        mapSlot = document.createElement("a");
        mapSlot.setAttribute("data-path-map", "");
        mapSlot.className = "paths-map-link paths-frame__map";
        if (titleEl && titleEl.parentNode) titleEl.parentNode.insertBefore(mapSlot, titleEl.nextSibling);
        else root.insertBefore(mapSlot, root.firstChild);
      }
      if (p.adhoc) {
        mapSlot.hidden = true;
        mapSlot.removeAttribute("href");
      } else {
        mapSlot.hidden = false;
        mapSlot.href = mapHref(p);
        mapSlot.textContent = "View on map →";
      }
      buildDots(p.stops.length);
      if (dotsEl) dotsEl.hidden = false;
      if (beatEl) beatEl.hidden = false;
      if (closeEl) closeEl.hidden = true;
      showStop();
      try {
        root.focus({ preventScroll: true });
      } catch (e) {}
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (nextEl) {
      nextEl.addEventListener("click", function () {
        if (!path) return;
        if (index >= path.stops.length - 1) {
          showClose();
          return;
        }
        index += 1;
        showStop();
      });
    }

    if (againEl) {
      againEl.addEventListener("click", function () {
        path = null;
        index = 0;
        if (onBack) onBack();
      });
    }

    root.setAttribute("tabindex", "-1");

    return { start: start };
  }

  function boot() {
    var hub = $("[data-paths-hub]");
    var walkerRoot = $("[data-paths-app]");
    var more = $("[data-paths-more]");
    if (!hub || !walkerRoot) return;

    var walker = initWalker(walkerRoot, showHub);

    function showHub() {
      hub.hidden = false;
      walkerRoot.hidden = true;
      if (more) more.hidden = false;
      setQueryPath(null);
      try {
        hub.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {}
    }

    function openWalker(p) {
      hub.hidden = true;
      walkerRoot.hidden = false;
      if (more) more.hidden = true;
      if (!p.adhoc) setQueryPath(p.id);
      else setQueryPath(null);
      walker.start(p);
    }

    initHub(hub, openWalker);

    var deep = readQueryPath();
    if (deep) {
      var p = findPath(deep);
      if (p) openWalker(p);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
/* ia16p */
