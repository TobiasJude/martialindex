/* Martial Index — ia22 homepage Field map (touch pan, sparse mobile labels, tighter chrome) */
(function () {
  "use strict";

  var DATA_URL = "/data/map-graph.json?v=ia22";
  var VB = { w: 1140, h: 700 };
  var SCALE_MIN = 0.75;
  var SCALE_MAX = 3.2;
  var EDGE_GAP = 2.5;
  var MMA_ID = "mma";
  var BASE_TYPES = { art: true, style: true };
  var CHIP_ORDER = ["all", "lineage", "influence", "shared_practice", "sport_overlap", "into_mma"];
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)");
  var PHOTO_GLOW = "#5B8FB8";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  /** Small map disc / strip plate; falls back to full image if thumb missing. */
  function thumbSrc(n) {
    if (!n) return "";
    return n.thumb || n.image || "";
  }
  /** Full plate for detail drawer / editorial hero only. */
  function fullSrc(n) {
    if (!n) return "";
    return n.image || n.thumb || "";
  }

  function typeLabel(t) {
    return (
      {
        art: "Style",
        style: "Branch",
        technique: "Technique",
        person: "Person",
        lineage: "Lineage"
      }[t] || t
    );
  }

  function relationLabel(t) {
    return (
      {
        lineage: "Lineage",
        influence: "Influence",
        shared_practice: "Shared practice",
        sport_overlap: "Sport overlap",
        into_mma: "Into MMA"
      }[t] || t
    );
  }

  function initials(label) {
    var parts = String(label || "")
      .replace(/[^a-zA-Z\s]/g, " ")
      .trim()
      .split(/\s+/);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function metaLine(n) {
    var kind = n.kindLabel || typeLabel(n.type);
    var origin = n.origin || (n.tags && n.tags.length ? n.tags[n.tags.length - 1] : "");
    return origin ? kind + " · " + origin : kind;
  }

  function init(root) {
    if (!root || root.__mapProductInit) return;
    root.__mapProductInit = true;

    var stage = $("[data-map-stage]", root);
    var svgHost = $("[data-map-svg]", root);
    var detail = $("[data-map-detail]", root);
    var pills = $("[data-map-pills]", root);
    var discover = $("[data-map-discover]", root);
    var modeHost = $("[data-map-mode-host]", root);
    var tooltip = $("[data-map-tooltip]", root);
    var legend = $("[data-map-legend]", root);
    var searchPill = $("[data-map-search-pill]", root);
    var rail = $("[data-map-rail]", root);
    if (!stage || !svgHost || !detail) return;

    var state = {
      data: null,
      mode: "map", /* map | path | compare | discovery */
      explore: "all",
      domain: "all",
      entity: { art: true, style: true, technique: false, person: false, lineage: false },
      selected: null,
      hover: null,
      compareIds: null,
      pathId: null,
      pathStep: 0,
      searchQ: "",
      discoveryIdx: 0,
      scale: 1,
      tx: 0,
      ty: 0,
      nodeById: {},
      adj: {}
    };

    var svg, gWorld, gWash, gEdges, gNodes, gDomains, gLabels;
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var clipSeq = 0;
    var activePointer = null;
    var panMoved = false;
    var pointerOriginX = 0;
    var pointerOriginY = 0;
    var transformRaf = null;
    var nodeTapId = null;
    var suppressClickUntil = 0;
    var PAN_THRESH_MOUSE = 5;
    var PAN_THRESH_TOUCH = 8;
    var useTouchFallback = !window.PointerEvent;
    var pinchStartDist = 0;
    var pinchStartScale = 1;
    var pinching = false;
    /* Mobile: hide most titles until zoomed; always keep selected readable */
    var LABEL_ZOOM_SPARSE = 2.65;
    var LABEL_ZOOM_ALL = 3.05;

    function isMobileView() {
      return window.matchMedia("(max-width: 768px)").matches;
    }
    function defaultScale() {
      /* ia21: closer than ia20 bbox-fit so the field fills the viewport */
      return isMobileView() ? 2.25 : 1.92;
    }
    function labelZoomTier() {
      var s = state.scale || 1;
      if (s >= LABEL_ZOOM_ALL) return "all";
      if (s >= LABEL_ZOOM_SPARSE) return "sparse";
      return "min";
    }
    function mmaCenter() {
      var n = state.nodeById[MMA_ID];
      if (n) {
        return {
          x: n._ox != null ? n._ox : n.x,
          y: n._oy != null ? n._oy : n.y
        };
      }
      return { x: 549.3, y: 243.9 };
    }
    function applyDefaultView() {
      var c = mmaCenter();
      var s = defaultScale();
      state.scale = clampScale(s);
      state.tx = VB.w / 2 - c.x * state.scale;
      /* Bias slightly up so hub sits optically central above detail chrome */
      state.ty = VB.h * 0.46 - c.y * state.scale;
      applyTransform();
    }
    function clampScale(s) {
      return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
    }
    function clearPathUrl() {
      try {
        var url = new URL(window.location.href);
        if (!url.searchParams.has("path")) return;
        url.searchParams.delete("path");
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch (err) {}
    }
    function exitToMap() {
      state.pathId = null;
      state.pathStep = 0;
      state.compareIds = null;
      clearPathUrl();
      setMode("map");
    }

    function neighborsOf(id) {
      return state.adj[id] ? Object.keys(state.adj[id]) : [];
    }

    function buildIndex(data) {
      state.nodeById = {};
      state.adj = {};
      data.nodes.forEach(function (n) {
        state.nodeById[n.id] = n;
        state.adj[n.id] = {};
      });
      data.edges.forEach(function (e) {
        if (!state.adj[e.source]) state.adj[e.source] = {};
        if (!state.adj[e.target]) state.adj[e.target] = {};
        state.adj[e.source][e.target] = true;
        state.adj[e.target][e.source] = true;
      });
    }

    function edgeVisible(e) {
      if (state.explore !== "all" && e.type !== state.explore) return false;
      var a = state.nodeById[e.source];
      var b = state.nodeById[e.target];
      if (!a || !b) return false;
      return nodeVisible(a) && nodeVisible(b);
    }

    function nodeVisible(n) {
      if (!n) return false;
      if (BASE_TYPES[n.type] || state.entity[n.type]) return true;
      if (state.selected) {
        if (n.id === state.selected) return true;
        if (state.adj[state.selected] && state.adj[state.selected][n.id]) return true;
        if (n.anchor === state.selected) return true;
      }
      return false;
    }

    function rememberMapPositions() {
      if (!state.data) return;
      state.data.nodes.forEach(function (n) {
        if (n._ox == null) {
          n._ox = n.x;
          n._oy = n.y;
        }
      });
    }

    function restoreMapPositions() {
      if (!state.data) return;
      state.data.nodes.forEach(function (n) {
        if (n._ox != null) {
          n.x = n._ox;
          n.y = n._oy;
        }
      });
      if (gDomains) gDomains.style.display = "";
    }

    function ensureSvg() {
      if (svg) return;
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "map-product__svg");
      svg.setAttribute("viewBox", "0 0 " + VB.w + " " + VB.h);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-labelledby", "map-product-title");
      svg.innerHTML =
        '<title id="map-product-title">Field map of how martial arts connect</title>' +
        "<defs>" +
        '<marker id="mp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">' +
        '<path d="M0 1.2 L7 4 L0 6.8 Z" fill="#6A6358" fill-opacity=".7"/>' +
        "</marker>" +
        '<filter id="mp-photo-glow" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="' +
        PHOTO_GLOW +
        '" flood-opacity="0.55"/>' +
        "</filter>" +
        '<filter id="mp-soft" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#2A2418" flood-opacity="0.18"/>' +
        "</filter>" +
        '<radialGradient id="mp-wash-a" cx="22%" cy="78%" r="55%">' +
        '<stop offset="0%" stop-color="#8A8070" stop-opacity=".12"/>' +
        '<stop offset="100%" stop-color="#F7F2E8" stop-opacity="0"/>' +
        "</radialGradient>" +
        '<radialGradient id="mp-wash-b" cx="78%" cy="18%" r="48%">' +
        '<stop offset="0%" stop-color="#6A7A88" stop-opacity=".08"/>' +
        '<stop offset="100%" stop-color="#F7F2E8" stop-opacity="0"/>' +
        "</radialGradient>" +
        "</defs>";

      gWorld = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gWorld.setAttribute("class", "map-product__world");
      gWash = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gWash.setAttribute("class", "map-product__wash");
      gWash.setAttribute("aria-hidden", "true");
      gWash.innerHTML =
        '<rect width="100%" height="100%" fill="url(#mp-wash-a)"/>' +
        '<rect width="100%" height="100%" fill="url(#mp-wash-b)"/>' +
        '<g opacity=".14" fill="none" stroke="#5A5348" stroke-width="1.1">' +
        '<path d="M40 620 C120 560, 180 580, 260 540 C340 500, 400 560, 500 530 C600 500, 680 560, 780 520 C880 480, 960 540, 1100 500"/>' +
        '<path d="M20 640 C140 600, 220 620, 320 590 C420 560, 520 620, 640 580 C760 540, 860 600, 1120 560"/>' +
        '<path d="M80 660 C200 630, 300 650, 420 620 C540 590, 700 640, 900 600 C1000 580, 1060 610, 1120 590" stroke-width=".8"/>' +
        "</g>";
      gDomains = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gDomains.setAttribute("class", "map-product__domains");
      gEdges = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gEdges.setAttribute("class", "map-product__edges");
      gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gNodes.setAttribute("class", "map-product__nodes");
      gLabels = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gLabels.setAttribute("class", "map-product__float-labels");
      gWorld.appendChild(gWash);
      gWorld.appendChild(gDomains);
      gWorld.appendChild(gEdges);
      gWorld.appendChild(gNodes);
      gWorld.appendChild(gLabels);
      svg.appendChild(gWorld);
      svgHost.innerHTML = "";
      svgHost.appendChild(svg);

      /* Pointer pan/zoom. Always non-passive touch so we can block scroll-fighting
         while a gesture is active (Safari often ignores touch-action on SVG). */
      svg.addEventListener("pointerdown", onPointerDown);
      svg.addEventListener("pointermove", onPointerMove);
      svg.addEventListener("pointerup", onPointerUp);
      svg.addEventListener("pointercancel", onPointerUp);
      svg.addEventListener("lostpointercapture", onLostCapture);
      svg.addEventListener("touchstart", onTouchGuard, { passive: false });
      svg.addEventListener("touchmove", onTouchGuard, { passive: false });
      svg.addEventListener("touchend", onTouchGuard, { passive: false });
      svg.addEventListener("touchcancel", onTouchGuard, { passive: false });
      if (useTouchFallback) {
        svg.addEventListener("touchstart", onTouchStart, { passive: false });
        svg.addEventListener("touchmove", onTouchMove, { passive: false });
        svg.addEventListener("touchend", onTouchEnd, { passive: false });
        svg.addEventListener("touchcancel", onTouchEnd, { passive: false });
      }
      svg.addEventListener(
        "wheel",
        function (e) {
          if (isMobileView() && !e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          var rect = svg.getBoundingClientRect();
          var sx = rect.width / VB.w || 1;
          var sy = rect.height / VB.h || 1;
          var disp = Math.min(sx, sy);
          /* Map client → viewBox (meet letterbox approx via centered content) */
          var ox = rect.left + (rect.width - VB.w * disp) / 2;
          var oy = rect.top + (rect.height - VB.h * disp) / 2;
          var vx = (e.clientX - ox) / disp;
          var vy = (e.clientY - oy) / disp;
          var dir = e.deltaY > 0 ? -1 : 1;
          var step = e.ctrlKey || e.metaKey ? 0.1 : 0.085;
          setScaleAt(state.scale + dir * step, vx, vy);
        },
        { passive: false }
      );
    }

    function applyTransform() {
      if (!gWorld) return;
      gWorld.setAttribute(
        "transform",
        "translate(" + state.tx + " " + state.ty + ") scale(" + state.scale + ")"
      );
      syncLabelVisibility();
    }

    function scheduleTransform() {
      if (transformRaf != null) return;
      transformRaf = requestAnimationFrame(function () {
        transformRaf = null;
        applyTransform();
      });
    }

    function displayScale() {
      if (!svg) return 1;
      var rect = svg.getBoundingClientRect();
      var sx = rect.width / VB.w || 1;
      var sy = rect.height / VB.h || 1;
      return Math.min(sx, sy) || 1;
    }

    function clientToViewBox(clientX, clientY) {
      var rect = svg.getBoundingClientRect();
      var disp = displayScale();
      var ox = rect.left + (rect.width - VB.w * disp) / 2;
      var oy = rect.top + (rect.height - VB.h * disp) / 2;
      return { x: (clientX - ox) / disp, y: (clientY - oy) / disp };
    }

    /** Button zoom — keep viewport center fixed in world space. */
    function setScale(s) {
      var old = state.scale || 1;
      var next = clampScale(s);
      var wx = (VB.w / 2 - state.tx) / old;
      var wy = (VB.h / 2 - state.ty) / old;
      state.scale = next;
      state.tx = VB.w / 2 - wx * next;
      state.ty = VB.h / 2 - wy * next;
      scheduleTransform();
    }

    /** Wheel/pinch zoom — keep a viewBox point under the cursor fixed. */
    function setScaleAt(s, viewX, viewY) {
      var old = state.scale || 1;
      var next = clampScale(s);
      var wx = (viewX - state.tx) / old;
      var wy = (viewY - state.ty) / old;
      state.scale = next;
      state.tx = viewX - wx * next;
      state.ty = viewY - wy * next;
      scheduleTransform();
    }

    function resetView() {
      dragging = false;
      panMoved = false;
      nodeTapId = null;
      activePointer = null;
      pinching = false;
      if (stage) stage.classList.remove("is-panning", "is-touching");
      applyDefaultView();
    }

    function focusOnNode(id, zoom) {
      var n = state.nodeById[id];
      if (!n || !svg) return;
      var z = zoom || Math.max(defaultScale(), 1.55);
      state.scale = clampScale(z);
      state.tx = VB.w / 2 - n.x * state.scale;
      state.ty = VB.h * 0.46 - n.y * state.scale;
      applyTransform();
    }

    function panThreshold(e) {
      return e && e.pointerType === "touch" ? PAN_THRESH_TOUCH : PAN_THRESH_MOUSE;
    }

    function nodeIdFromEvent(e) {
      var el = e.target;
      if (el && el.closest) {
        var n = el.closest(".mp-node");
        if (n) return n.getAttribute("data-id");
      }
      /* SVG pointer-events:none labels/photos can miss — resolve nearest art hit */
      try {
        var pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        var ctm = svg.getScreenCTM();
        if (!ctm) return null;
        var loc = pt.matrixTransform(ctm.inverse());
        /* account for world transform */
        var wx = (loc.x - state.tx) / state.scale;
        var wy = (loc.y - state.ty) / state.scale;
        var best = null;
        var bestD = 1e9;
        var maxR = isMobileView() ? 26 : 28;
        state.data.nodes.forEach(function (node) {
          if (!nodeVisible(node)) return;
          var dx = node.x - wx;
          var dy = node.y - wy;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestD && d <= maxR) {
            bestD = d;
            best = node.id;
          }
        });
        return best;
      } catch (err) {
        return null;
      }
    }

    function endGestureFlags() {
      dragging = false;
      activePointer = null;
      nodeTapId = null;
      panMoved = false;
      if (stage) stage.classList.remove("is-panning", "is-touching");
    }

    function markTouching(on) {
      if (!stage) return;
      stage.classList.toggle("is-touching", !!on);
    }

    /** Block page scroll while map owns the gesture (critical on iOS SVG). */
    function onTouchGuard(e) {
      if (pinching) {
        e.preventDefault();
        return;
      }
      if (e.type === "touchstart") {
        if (e.touches && e.touches.length >= 2) {
          onPinchStart(e);
          return;
        }
        return;
      }
      if (e.type === "touchmove") {
        if (pinching || (e.touches && e.touches.length >= 2)) {
          onPinchMove(e);
          return;
        }
        if (activePointer != null || dragging || nodeTapId) {
          e.preventDefault();
        }
        return;
      }
      /* touchend / touchcancel */
      if (pinching) {
        onPinchEnd(e);
      }
    }

    function onPointerDown(e) {
      if (pinching) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      /* Ignore secondary pointers; keep one-finger pan stable */
      if (activePointer != null && e.pointerId !== activePointer) return;

      panMoved = false;
      activePointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerOriginX = e.clientX;
      pointerOriginY = e.clientY;
      markTouching(e.pointerType === "touch");

      var nid = nodeIdFromEvent(e);
      if (nid) {
        /* Tentative tap — promote to pan past threshold so hit pads don't swallow drag */
        nodeTapId = nid;
        dragging = false;
      } else {
        nodeTapId = null;
        dragging = true;
        stage.classList.add("is-panning");
      }

      try {
        svg.setPointerCapture(e.pointerId);
      } catch (err) {}
      /* preventDefault on pointerdown alone does not stop iOS scroll; touchmove guard does.
         Still cancel synthetic mouse/click noise where supported. */
      if (e.pointerType === "touch" && e.cancelable) e.preventDefault();
    }
    function onPointerMove(e) {
      if (pinching) return;
      if (activePointer == null || e.pointerId !== activePointer) return;

      var odx = e.clientX - pointerOriginX;
      var ody = e.clientY - pointerOriginY;
      var dist = Math.sqrt(odx * odx + ody * ody);
      var thresh = panThreshold(e);

      if (nodeTapId) {
        if (dist > thresh) {
          panMoved = true;
          nodeTapId = null;
          dragging = true;
          stage.classList.add("is-panning");
          lastX = e.clientX;
          lastY = e.clientY;
        } else {
          return;
        }
      }

      if (!dragging) return;
      if (dist > thresh) panMoved = true;
      if (!panMoved) return;

      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      var s = displayScale();
      state.tx += dx / s;
      state.ty += dy / s;
      lastX = e.clientX;
      lastY = e.clientY;
      scheduleTransform();
      if (e.pointerType === "touch" && e.cancelable) e.preventDefault();
    }
    function onPointerUp(e) {
      if (pinching) return;
      if (activePointer != null && e && e.pointerId != null && e.pointerId !== activePointer) return;
      if (!dragging && !nodeTapId && activePointer == null) return;
      var tapId = nodeTapId;
      var wasPan = panMoved;
      try {
        if (e && e.pointerId != null && svg && svg.releasePointerCapture) {
          svg.releasePointerCapture(e.pointerId);
        }
      } catch (errRel) {}
      dragging = false;
      activePointer = null;
      nodeTapId = null;
      stage.classList.remove("is-panning");
      markTouching(false);
      if (tapId && !wasPan) {
        suppressClickUntil = Date.now() + 520;
        setTimeout(function () {
          selectNode(tapId);
        }, 0);
      }
      panMoved = false;
    }
    function onLostCapture(e) {
      /* Only end if this was our active pointer — avoid stuck is-panning */
      if (activePointer != null && e && e.pointerId !== activePointer) return;
      if (!dragging && !nodeTapId && activePointer == null) return;
      onPointerUp(e);
    }

    function touchDist(touches) {
      var a = touches[0];
      var b = touches[1];
      var dx = a.clientX - b.clientX;
      var dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy) || 1;
    }
    function touchMid(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    }
    function onPinchStart(e) {
      if (!e.touches || e.touches.length < 2) return;
      e.preventDefault();
      pinching = true;
      endGestureFlags();
      markTouching(true);
      pinchStartDist = touchDist(e.touches);
      pinchStartScale = state.scale;
    }
    function onPinchMove(e) {
      if (!pinching || !e.touches || e.touches.length < 2) return;
      e.preventDefault();
      var d = touchDist(e.touches);
      var mid = touchMid(e.touches);
      var vb = clientToViewBox(mid.x, mid.y);
      setScaleAt(pinchStartScale * (d / pinchStartDist), vb.x, vb.y);
    }
    function onPinchEnd(e) {
      if (!e.touches || e.touches.length < 2) {
        pinching = false;
        markTouching(false);
      }
    }

    /* Touch fallback when the engine does not synthesize PointerEvents. */
    function onTouchStart(e) {
      if (e.touches && e.touches.length >= 2) {
        onPinchStart(e);
        return;
      }
      if (!e.touches || e.touches.length !== 1) return;
      if (activePointer != null || dragging || nodeTapId) return;
      var t = e.touches[0];
      var fake = {
        pointerType: "touch",
        pointerId: t.identifier + 1000,
        button: 0,
        clientX: t.clientX,
        clientY: t.clientY,
        target: e.target,
        cancelable: true,
        preventDefault: function () { e.preventDefault(); }
      };
      onPointerDown(fake);
    }
    function onTouchMove(e) {
      if (pinching || (e.touches && e.touches.length >= 2)) {
        onPinchMove(e);
        return;
      }
      if (!e.touches || !e.touches.length) return;
      if (activePointer == null) return;
      var t = e.touches[0];
      var fake = {
        pointerType: "touch",
        pointerId: activePointer,
        clientX: t.clientX,
        clientY: t.clientY,
        cancelable: true,
        preventDefault: function () { e.preventDefault(); }
      };
      onPointerMove(fake);
    }
    function onTouchEnd(e) {
      if (pinching) {
        onPinchEnd(e);
        return;
      }
      if (activePointer == null && !nodeTapId && !dragging) return;
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      var fake = {
        pointerType: "touch",
        pointerId: activePointer != null ? activePointer : 0,
        clientX: t ? t.clientX : lastX,
        clientY: t ? t.clientY : lastY
      };
      onPointerUp(fake);
    }

    function drawDomains(data) {
      gDomains.innerHTML = "";
      (data.domains || []).forEach(function (d) {
        var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("class", "mp-domain__label");
        t.setAttribute("x", d.x + 14);
        t.setAttribute("y", d.y + 18);
        t.textContent = (d.label || "").toUpperCase();
        gDomains.appendChild(t);
      });
    }

    function diamondPoints(x, y, s) {
      return x + "," + (y - s) + " " + (x + s) + "," + y + " " + x + "," + (y + s) + " " + (x - s) + "," + y;
    }

    function nextClipId() {
      clipSeq += 1;
      return "mp-clip-" + clipSeq;
    }

    function drawPhotoCircle(g, n, r, selected) {
      var defs = svg.querySelector("defs");
      var clipId = nextClipId();
      var clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clip.setAttribute("id", clipId);
      var cc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cc.setAttribute("cx", n.x);
      cc.setAttribute("cy", n.y);
      cc.setAttribute("r", r);
      clip.appendChild(cc);
      defs.appendChild(clip);

      if (selected) {
        var halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        halo.setAttribute("cx", n.x);
        halo.setAttribute("cy", n.y);
        halo.setAttribute("r", r + 5);
        halo.setAttribute("class", "mp-node__halo");
        halo.setAttribute("fill", "none");
        halo.setAttribute("stroke", PHOTO_GLOW);
        halo.setAttribute("stroke-width", "3");
        halo.setAttribute("opacity", "0.85");
        halo.setAttribute("filter", "url(#mp-photo-glow)");
        g.appendChild(halo);
      }

      var ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("cx", n.x);
      ring.setAttribute("cy", n.y);
      ring.setAttribute("r", r);
      ring.setAttribute("class", "mp-node__shape mp-node__ring");
      ring.setAttribute("fill", "#E8E2D6");
      ring.setAttribute("stroke", selected ? PHOTO_GLOW : "#2A2418");
      ring.setAttribute("stroke-width", selected ? 2.4 : 1.2);
      g.appendChild(ring);

      var src = thumbSrc(n);
      if (src) {
        var img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttribute("x", n.x - r);
        img.setAttribute("y", n.y - r);
        img.setAttribute("width", r * 2);
        img.setAttribute("height", r * 2);
        img.setAttribute("preserveAspectRatio", "xMidYMid slice");
        img.setAttribute("clip-path", "url(#" + clipId + ")");
        img.setAttribute("class", "mp-node__photo");
        img.setAttribute("data-photo-src", src);
        g.appendChild(img);
        function attachHref() {
          if (!img.getAttribute("href")) {
            img.setAttributeNS("http://www.w3.org/1999/xlink", "href", src);
            img.setAttribute("href", src);
          }
        }
        /* Selected / focal node: paint immediately. Others: after first paint. */
        if (selected) {
          attachHref();
        } else if (typeof requestIdleCallback === "function") {
          requestIdleCallback(attachHref, { timeout: 1200 });
        } else {
          setTimeout(attachHref, 0);
        }
      } else {
        var av = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        av.setAttribute("cx", n.x);
        av.setAttribute("cy", n.y);
        av.setAttribute("r", r);
        av.setAttribute("fill", "#2F2A24");
        av.setAttribute("clip-path", "url(#" + clipId + ")");
        g.appendChild(av);
        var tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tx.setAttribute("x", n.x);
        tx.setAttribute("y", n.y + 5);
        tx.setAttribute("text-anchor", "middle");
        tx.setAttribute("class", "mp-node__initials");
        tx.setAttribute("fill", "#F4EFE4");
        tx.textContent = initials(n.label);
        g.appendChild(tx);
      }
    }

    function drawNodeShape(g, n) {
      var selected = state.selected === n.id;
      var isArtLike = n.type === "art" || n.type === "style";
      var isPerson = n.type === "person";
      var isTech = n.type === "technique";
      var isLin = n.type === "lineage";
      var photoArt = isArtLike && !!(n.thumb || n.image);
      var mobile = isMobileView();

      /* Invisible hit pad — mobile ~44px CSS without blanketing the field */
      var hitR = mobile ? (isArtLike ? 28 : 20) : (isArtLike ? 26 : 18);
      var hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.setAttribute("cx", n.x);
      hit.setAttribute("cy", n.y);
      hit.setAttribute("r", hitR);
      hit.setAttribute("fill", "transparent");
      hit.setAttribute("pointer-events", "all");
      hit.setAttribute("class", "mp-node__hit");
      g.appendChild(hit);

      /* Arts/styles with images are photo circles at rest (editorial default). */
      if (photoArt) {
        drawPhotoCircle(g, n, selected ? (mobile ? 40 : 36) : (mobile ? 24 : 20), selected);
      } else if (isPerson) {
        drawPhotoCircle(g, n, selected ? 22 : 16, selected);
      } else if (isLin) {
        var bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.setAttribute("x", n.x - 18);
        bar.setAttribute("y", n.y - 6);
        bar.setAttribute("width", 36);
        bar.setAttribute("height", 12);
        bar.setAttribute("rx", 3);
        bar.setAttribute("class", "mp-node__shape");
        bar.setAttribute("fill", n.accent || "#7A6A5A");
        bar.setAttribute("stroke", "#2A2418");
        bar.setAttribute("stroke-width", "1");
        bar.setAttribute("opacity", "0.85");
        g.appendChild(bar);
      } else {
        /* Techniques + arts without photos stay diamonds. */
        var s = isTech ? 9 : n.hub ? 16 : 13;
        var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", diamondPoints(n.x, n.y, s));
        poly.setAttribute("class", "mp-node__shape");
        poly.setAttribute("fill", n.accent || "#6F8F6A");
        poly.setAttribute("stroke", selected ? PHOTO_GLOW : "rgba(42,36,24,.45)");
        poly.setAttribute("stroke-width", selected ? 2 : 1);
        poly.setAttribute("filter", "url(#mp-soft)");
        if (isTech) poly.setAttribute("opacity", "0.9");
        g.appendChild(poly);
        if (selected && isArtLike) {
          var glow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          glow.setAttribute("points", diamondPoints(n.x, n.y, s + 4));
          glow.setAttribute("fill", "none");
          glow.setAttribute("stroke", PHOTO_GLOW);
          glow.setAttribute("stroke-width", "2");
          glow.setAttribute("opacity", "0.7");
          glow.setAttribute("filter", "url(#mp-photo-glow)");
          g.insertBefore(glow, poly);
        }
      }

      var labelY = photoArt
        ? n.y + (selected ? (mobile ? 46 : 52) : (mobile ? 30 : 34))
        : n.y + (isPerson ? 28 : isTech ? 18 : 24);
      /* Slight stagger so neighboring titles don't stack into one ink blot */
      var stagger = (Math.abs(Math.round(n.x * 3 + n.y * 5)) % 5) - 2;
      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute(
        "class",
        "mp-node__label" +
          (isTech ? " mp-node__label--tiny" : "") +
          (n.hub || n.id === MMA_ID ? " mp-node__label--hub" : "")
      );
      label.setAttribute("x", n.x + (mobile ? stagger * 0.6 : 0));
      label.setAttribute("y", labelY + (mobile ? stagger : 0));
      label.setAttribute("text-anchor", "middle");
      label.textContent = n.label;
      g.appendChild(label);

      if (isArtLike && !isTech && !mobile) {
        var micro = document.createElementNS("http://www.w3.org/2000/svg", "text");
        micro.setAttribute("class", "mp-node__micro");
        micro.setAttribute("x", n.x);
        micro.setAttribute("y", labelY + 12);
        micro.setAttribute("text-anchor", "middle");
        micro.textContent = typeLabel(n.type);
        g.appendChild(micro);
      }
    }

    /** Visual rim radius matching drawNodeShape (unselected resting size). */
    function nodeRimRadius(n) {
      if (!n) return 12;
      var mobile = isMobileView();
      var selected = state.selected === n.id;
      var isArtLike = n.type === "art" || n.type === "style";
      var photoArt = isArtLike && !!(n.thumb || n.image);
      if (photoArt) {
        return selected ? (mobile ? 40 : 36) : (mobile ? 24 : 20);
      }
      if (n.type === "person") return selected ? 22 : 16;
      if (n.type === "lineage") return 14; /* rounded bar ≈ half-diagonal */
      if (n.type === "technique") return 9;
      return n.hub ? 16 : 13;
    }

    function curvePath(a, b, typed, fanA, fanB) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ra = nodeRimRadius(a) + EDGE_GAP;
      var rb = nodeRimRadius(b) + EDGE_GAP;
      /* Keep a minimum drawable segment */
      if (ra + rb > len - 4) {
        var shrink = Math.max(0.15, (len - 4) / (ra + rb));
        ra *= shrink;
        rb *= shrink;
      }
      var fa = fanA || 0;
      var fb = fanB || 0;
      /* Angular fan keeps endpoints on the rim circle (no piercing discs) */
      var base = Math.atan2(dy, dx);
      var angA = base + (ra > 0.5 ? fa / ra : 0);
      var angB = base + Math.PI - (rb > 0.5 ? fb / rb : 0);
      var x1 = a.x + Math.cos(angA) * ra;
      var y1 = a.y + Math.sin(angA) * ra;
      var x2 = b.x + Math.cos(angB) * rb;
      var y2 = b.y + Math.sin(angB) * rb;
      var mx = (x1 + x2) / 2;
      var my = (y1 + y2) / 2;
      var cdx = x2 - x1;
      var cdy = y2 - y1;
      var bend = typed === "into_mma" ? 0.12 : 0.08;
      bend += Math.min(0.05, (Math.abs(fa) + Math.abs(fb)) * 0.0035);
      var cx = mx + cdy * bend;
      var cy = my - cdx * bend;
      return (
        "M " +
        x1.toFixed(1) +
        " " +
        y1.toFixed(1) +
        " Q " +
        cx.toFixed(1) +
        " " +
        cy.toFixed(1) +
        " " +
        x2.toFixed(1) +
        " " +
        y2.toFixed(1)
      );
    }

    /** Per-endpoint fan offsets so many edges into one hub don't share one ray. */
    function buildEdgeFans(edgeList) {
      var buckets = {};
      edgeList.forEach(function (e, idx) {
        if (!buckets[e.source]) buckets[e.source] = [];
        if (!buckets[e.target]) buckets[e.target] = [];
        buckets[e.source].push({ edge: e, idx: idx, end: "s" });
        buckets[e.target].push({ edge: e, idx: idx, end: "t" });
      });
      var fanAt = {}; /* key idx -> {a,b} */
      Object.keys(buckets).forEach(function (nid) {
        var list = buckets[nid];
        if (list.length < 2) return;
        var hub = state.nodeById[nid];
        list.sort(function (u, v) {
          var ou = u.end === "s" ? state.nodeById[u.edge.target] : state.nodeById[u.edge.source];
          var ov = v.end === "s" ? state.nodeById[v.edge.target] : state.nodeById[v.edge.source];
          var au = Math.atan2((ou.y || 0) - hub.y, (ou.x || 0) - hub.x);
          var av = Math.atan2((ov.y || 0) - hub.y, (ov.x || 0) - hub.x);
          return au - av;
        });
        var n = list.length;
        var spacing = n > 8 ? 3.2 : n > 4 ? 4.2 : 5.2;
        list.forEach(function (item, i) {
          var off = (i - (n - 1) / 2) * spacing;
          if (!fanAt[item.idx]) fanAt[item.idx] = { a: 0, b: 0 };
          if (item.end === "s") fanAt[item.idx].a = off;
          else fanAt[item.idx].b = off;
        });
      });
      return fanAt;
    }

    function renderGraph() {
      if (state.mode !== "map") return;
      ensureSvg();
      /* purge old clips except filters/markers/gradients */
      var defs = svg.querySelector("defs");
      $$("clipPath", defs).forEach(function (c) {
        c.parentNode.removeChild(c);
      });
      clipSeq = 0;

      if (gDomains) gDomains.style.display = "";
      drawDomains(state.data);
      gEdges.innerHTML = "";
      gNodes.innerHTML = "";

      var edgeRank = {
        lineage: 1,
        into_mma: 2,
        influence: 3,
        sport_overlap: 4,
        shared_practice: 5
      };
      var drawn = {};
      var edgeList = state.data.edges.slice().sort(function (a, b) {
        return (edgeRank[a.type] || 9) - (edgeRank[b.type] || 9);
      });
      var visibleEdges = [];
      edgeList.forEach(function (e) {
        if (!edgeVisible(e)) return;
        var a = state.nodeById[e.source];
        var b = state.nodeById[e.target];
        if (!a || !b) return;
        if (state.explore === "all") {
          var pair = [e.source, e.target].sort().join("|");
          if (drawn[pair]) return;
          drawn[pair] = true;
        }
        visibleEdges.push(e);
      });
      var fans = buildEdgeFans(visibleEdges);
      /* Edges first (under nodes). gEdges is already before gNodes in DOM. */
      visibleEdges.forEach(function (e, idx) {
        var a = state.nodeById[e.source];
        var b = state.nodeById[e.target];
        var fan = fans[idx] || { a: 0, b: 0 };
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", curvePath(a, b, e.type, fan.a, fan.b));
        path.setAttribute("class", "mp-edge mp-edge--" + e.type);
        path.setAttribute("data-type", e.type);
        path.setAttribute("data-nodes", e.source + " " + e.target);
        path.setAttribute("data-label", e.label || relationLabel(e.type));
        var tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
        tip.textContent = (e.label || relationLabel(e.type)) + "";
        path.appendChild(tip);
        if (e.type === "into_mma" || e.type === "lineage") {
          path.setAttribute("marker-end", "url(#mp-arrow)");
        }
        gEdges.appendChild(path);
      });

      state.data.nodes.forEach(function (n) {
        if (!nodeVisible(n)) return;
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "mp-node mp-node--" + n.type);
        g.setAttribute("data-map-node", "");
        g.setAttribute("data-id", n.id);
        g.setAttribute("data-label", n.label + (n.tags ? " " + n.tags.join(" ") : ""));
        g.setAttribute("data-type", n.type);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", n.label);
        if (n.hub) g.classList.add("mp-node--hub");
        if (state.selected === n.id) g.classList.add("is-selected");
        drawNodeShape(g, n);
        g.addEventListener("click", function (ev) {
          /* Selection is handled on pointerup; keep click as mouse fallback only */
          if (Date.now() < suppressClickUntil) {
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
          if (panMoved) return;
          ev.preventDefault();
          ev.stopPropagation();
          selectNode(n.id);
        });
        g.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            selectNode(n.id);
          }
        });
        g.addEventListener("mouseenter", function (ev) {
          state.hover = n.id;
          applyFocusStyles();
          showTooltip(n, ev);
        });
        g.addEventListener("mousemove", function (ev) {
          if (state.hover === n.id) positionTooltip(ev);
        });
        g.addEventListener("mouseleave", function () {
          state.hover = null;
          applyFocusStyles();
          hideTooltip();
        });
        gNodes.appendChild(g);
      });

      applyFocusStyles();
    }

    function showTooltip(n, ev) {
      if (!tooltip) return;
      tooltip.hidden = false;
      tooltip.innerHTML =
        "<strong>" +
        esc(n.label) +
        "</strong> <span>(" +
        esc(metaLine(n)) +
        ")</span>" +
        '<em> — Click to explore</em>';
      positionTooltip(ev);
    }
    function positionTooltip(ev) {
      if (!tooltip || tooltip.hidden) return;
      var host = stage.getBoundingClientRect();
      var x = ev.clientX - host.left + 14;
      var y = ev.clientY - host.top + 14;
      tooltip.style.left = Math.min(x, host.width - 220) + "px";
      tooltip.style.top = Math.min(y, host.height - 48) + "px";
    }
    function hideTooltip() {
      if (!tooltip) return;
      tooltip.hidden = true;
    }

    /**
     * Mobile label policy (ia22): prefer sparse readable titles over stacked piles.
     * - min zoom: selected only (detail sheet also carries the name)
     * - sparse: selected + neighbors + hubs
     * - all / desktop: everyone visible
     */
    function syncLabelVisibility() {
      if (!gNodes) return;
      var mobile = isMobileView();
      var tier = labelZoomTier();
      var focus = state.selected || state.hover;
      var neighSet = {};
      if (focus) {
        neighSet[focus] = true;
        neighborsOf(focus).forEach(function (id) {
          neighSet[id] = true;
        });
        if (state.data) {
          state.data.nodes.forEach(function (n) {
            if (n.anchor === focus) neighSet[n.id] = true;
          });
        }
      }
      Array.prototype.forEach.call(gNodes.querySelectorAll(".mp-node"), function (g) {
        var id = g.getAttribute("data-id");
        var label = g.querySelector(".mp-node__label");
        if (!label) return;
        var show;
        if (!mobile) {
          show = true;
        } else if (state.selected === id) {
          show = true;
        } else if (tier === "all") {
          show = true;
        } else if (tier === "sparse") {
          show = !!(neighSet[id] || label.classList.contains("mp-node__label--hub"));
        } else {
          /* min: hubs when cold; selected title only when focusing (sheet carries the name too) */
          show = !focus
            ? label.classList.contains("mp-node__label--hub")
            : state.selected === id || state.hover === id;
        }
        label.setAttribute("visibility", show ? "visible" : "hidden");
        g.classList.toggle("is-label-on", show);
      });
      if (gDomains) {
        gDomains.style.opacity = mobile && tier === "min" ? "0.35" : "1";
      }
    }

    function applyFocusStyles() {
      if (!gNodes || !gEdges) return;
      var focus = state.selected || state.hover;
      var neighSet = {};
      if (focus) {
        neighSet[focus] = true;
        neighborsOf(focus).forEach(function (id) {
          neighSet[id] = true;
        });
        state.data.nodes.forEach(function (n) {
          if (n.anchor === focus) neighSet[n.id] = true;
        });
      }
      stage.classList.toggle("is-focusing", !!focus);
      Array.prototype.forEach.call(gNodes.querySelectorAll(".mp-node"), function (g) {
        var id = g.getAttribute("data-id");
        g.classList.toggle("is-selected", state.selected === id);
        g.classList.toggle("is-focus", focus === id);
        g.classList.toggle("is-neighbor", !!(focus && neighSet[id] && id !== focus));
        g.classList.toggle("is-dim", !!(focus && !neighSet[id]));
      });
      Array.prototype.forEach.call(gEdges.querySelectorAll(".mp-edge"), function (path) {
        var ids = (path.getAttribute("data-nodes") || "").split(" ");
        var lit = !!(focus && (ids[0] === focus || ids[1] === focus));
        path.classList.toggle("is-lit", lit);
        path.classList.toggle("is-dim", !!(focus && !lit));
      });
      syncLabelVisibility();
    }

    function connDot(edgeType, accent) {
      var color =
        {
          lineage: "#5B8FB8",
          influence: "#B85C4A",
          shared_practice: "#6F8F6A",
          sport_overlap: "#C48A4A",
          into_mma: "#5B6B8C"
        }[edgeType] || accent || "#8A8070";
      return '<span class="map-detail__dot" style="background:' + color + '"></span>';
    }

    function renderDetail(id) {
      if (state.mode !== "map" && state.mode !== "compare") {
        /* detail still usable in map overlay modes that keep panel */
      }
      if (!id) {
        detail.classList.remove("has-selection");
        detail.innerHTML =
          '<div class="map-detail__empty">' +
          '<p class="map-detail__empty-kicker">Guide</p>' +
          '<p class="map-detail__empty-copy">Pick an art on the map. Its roots and branches will gather here.</p>' +
          '<button type="button" class="map-detail__surprise" data-map-surprise>Did you know? →</button>' +
          "</div>";
        root.classList.remove("has-detail-open");
        var surprise = $("[data-map-surprise]", detail);
        if (surprise) surprise.addEventListener("click", openDiscovery);
        return;
      }
      var n = state.nodeById[id];
      if (!n) return;

      var connections = [];
      state.data.edges.forEach(function (e) {
        if (e.source === id || e.target === id) {
          var otherId = e.source === id ? e.target : e.source;
          var other = state.nodeById[otherId];
          if (!other) return;
          if (!(BASE_TYPES[other.type] || other.type === "person" || other.type === "lineage" || other.type === "style")) {
            if (other.type === "technique" && other.anchor !== id) return;
          }
          connections.push({
            id: otherId,
            label: other.label,
            type: other.type,
            relation: e.label || relationLabel(e.type),
            edgeType: e.type,
            accent: other.accent
          });
        }
      });
      var seen = {};
      connections = connections.filter(function (c) {
        if (seen[c.id]) return false;
        seen[c.id] = true;
        return true;
      });
      connections.sort(function (a, b) {
        var wa = BASE_TYPES[a.type] ? 0 : a.type === "person" || a.type === "lineage" ? 1 : 2;
        var wb = BASE_TYPES[b.type] ? 0 : b.type === "person" || b.type === "lineage" ? 1 : 2;
        return wa - wb;
      });

      var artConns = connections.filter(function (c) {
        return c.type === "art" || c.type === "style";
      });
      var techCount = connections.filter(function (c) {
        return c.type === "technique";
      }).length;
      var lineageCount = connections.filter(function (c) {
        return c.edgeType === "lineage" || c.type === "lineage" || c.type === "person";
      }).length;

      var connHtml = connections
        .filter(function (c) {
          return c.type !== "technique";
        })
        .slice(0, 8)
        .map(function (c) {
          return (
            '<button type="button" class="map-detail__conn" data-goto="' +
            esc(c.id) +
            '">' +
            connDot(c.edgeType, c.accent) +
            '<span class="map-detail__conn-name">' +
            esc(c.label) +
            "</span>" +
            '<span class="map-detail__conn-rel">' +
            esc(c.relation) +
            "</span>" +
            "</button>"
          );
        })
        .join("");

      var detailImg = fullSrc(n);
      var thumb =
        detailImg
          ? '<img class="map-detail__thumb" src="' + esc(detailImg) + '" alt="" loading="lazy">'
          : '<span class="map-detail__thumb map-detail__thumb--init" aria-hidden="true">' +
            esc(initials(n.label)) +
            "</span>";

      var cta =
        n.href
          ? '<a class="map-detail__cta" href="' +
            esc(n.href) +
            '">Explore ' +
            esc(n.label) +
            " →</a>"
          : "";

      var lineageCard = "";
      if (n.lineageCard) {
        lineageCard =
          '<div class="map-detail__lineage">' +
          (fullSrc(n.lineageCard)
            ? '<img src="' + esc(fullSrc(n.lineageCard)) + '" alt="" loading="lazy">'
            : "") +
          "<div><p>" +
          esc(n.lineageCard.title) +
          "</p></div></div>";
      }

      var compareBtn =
        n.type === "art" || n.type === "style"
          ? '<button type="button" class="map-detail__compare" data-map-compare="' +
            esc(n.id) +
            '">Compare with…</button>'
          : "";

      detail.classList.add("has-selection");
      root.classList.add("has-detail-open");
      detail.innerHTML =
        '<div class="map-detail__panel">' +
        '<header class="map-detail__head">' +
        '<div class="map-detail__identity">' +
        thumb +
        "<div>" +
        '<h3 class="map-detail__title">' +
        esc(n.label) +
        "</h3>" +
        '<p class="map-detail__type">' +
        esc(metaLine(n)) +
        "</p>" +
        "</div></div>" +
        '<button type="button" class="map-detail__close" data-map-close aria-label="Clear selection">×</button>' +
        "</header>" +
        '<p class="map-detail__dek">' +
        esc(n.dek || "") +
        "</p>" +
        '<div class="map-detail__section">' +
        '<p class="map-detail__section-title">Key connections</p>' +
        '<div class="map-detail__conns">' +
        (connHtml || '<p class="map-detail__muted">No connections drawn yet.</p>') +
        "</div></div>" +
        '<p class="map-detail__stats">' +
        techCount +
        " Techniques · " +
        artConns.length +
        " Related arts · " +
        lineageCount +
        " Lineages</p>" +
        cta +
        compareBtn +
        lineageCard +
        "</div>";

      var closeBtn = $("[data-map-close]", detail);
      if (closeBtn) {
        closeBtn.addEventListener("click", function (ev) {
          if (Date.now() < suppressClickUntil) {
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
          selectNode(null);
        });
      }
      $$("[data-goto]", detail).forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectNode(btn.getAttribute("data-goto"));
        });
      });
      var cmp = $("[data-map-compare]", detail);
      if (cmp) {
        cmp.addEventListener("click", function () {
          openCompare(cmp.getAttribute("data-map-compare"));
        });
      }
    }

    function selectNode(id) {
      if (state.mode !== "map") setMode("map");
      state.selected = id || null;
      renderGraph();
      renderDetail(state.selected);
      syncUrl(state.selected);
      var scrim = $("[data-map-detail-scrim]", root);
      if (scrim) {
        if (state.selected && window.matchMedia("(max-width: 900px)").matches) {
          scrim.hidden = false;
          root.classList.add("detail-sheet-open");
        } else {
          scrim.hidden = true;
          root.classList.remove("detail-sheet-open");
        }
      }
    }

    function syncUrl(id) {
      try {
        var url = new URL(window.location.href);
        if (id) {
          url.hash = "map/" + id;
        } else if (url.hash.indexOf("map/") === 0 || url.hash === "#map") {
          url.hash = "map";
        }
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch (err) {}
    }

    function readUrlNode() {
      try {
        var url = new URL(window.location.href);
        var q = url.searchParams.get("node");
        if (q && state.nodeById[q]) return q;
        var h = (url.hash || "").replace(/^#/, "");
        if (h.indexOf("map/") === 0) {
          var id = h.slice(4);
          if (state.nodeById[id]) return id;
        }
      } catch (err) {}
      return null;
    }

    function renderPills(data) {
      if (!pills) return;
      pills.innerHTML = "";
      var byId = {};
      (data.relationTypes || []).forEach(function (r) {
        byId[r.id] = r;
      });
      CHIP_ORDER.forEach(function (id) {
        var r = byId[id] || { id: id, label: relationLabel(id) };
        if (id === "all") r = { id: "all", label: "All connections" };
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "map-pill" + (state.explore === r.id ? " is-active" : "");
        btn.setAttribute("data-explore", r.id);
        btn.textContent = r.label;
        btn.addEventListener("click", function () {
          setExplore(r.id);
        });
        pills.appendChild(btn);
      });
    }

    function setExplore(id) {
      state.explore = id;
      $$("[data-explore]", root).forEach(function (el) {
        el.classList.toggle("is-active", el.getAttribute("data-explore") === id);
      });
      renderGraph();
    }

    function renderLegend() {
      if (!legend) return;
      legend.innerHTML =
        '<p class="map-legend__title">Relationship Types</p>' +
        '<ul class="map-legend__list">' +
        '<li><span class="map-legend__swatch map-legend__swatch--lineage"></span>Lineage</li>' +
        '<li><span class="map-legend__swatch map-legend__swatch--influence"></span>Influence</li>' +
        '<li><span class="map-legend__swatch map-legend__swatch--shared"></span>Shared practice</li>' +
        '<li><span class="map-legend__swatch map-legend__swatch--sport"></span>Sport overlap</li>' +
        '<li><span class="map-legend__swatch map-legend__swatch--mma"></span>Into MMA</li>' +
        "</ul>" +
        '<button type="button" class="map-legend__reset" data-map-recenter-inline>Reset view</button>';
      var btn = $("[data-map-recenter-inline]", legend);
      if (btn) btn.addEventListener("click", resetView);
    }

    function renderDiscover(data) {
      if (!discover) return;
      var paths = data.discoverPaths || [];
      var cards = paths
        .map(function (p) {
          return (
            '<button type="button" class="map-path-card" data-path-id="' +
            esc(p.id) +
            '">' +
            '<span class="map-path-card__media">' +
            (thumbSrc(p)
              ? '<img src="' + esc(thumbSrc(p)) + '" alt="" loading="lazy">'
              : "") +
            "</span>" +
            '<span class="map-path-card__body">' +
            '<span class="map-path-card__title">' +
            esc(p.title) +
            "</span>" +
            '<span class="map-path-card__kind">' +
            esc(p.kind || "Path") +
            "</span>" +
            "</span></button>"
          );
        })
        .join("");

      discover.innerHTML =
        '<div class="map-discover__head">' +
        '<p class="map-discover__kicker">Discover Paths</p>' +
        '<h3 class="map-discover__heading">Follow the journey. See how one art leads to another.</h3>' +
        "</div>" +
        '<div class="map-discover__scroller">' +
        cards +
        '<a class="map-path-card map-path-card--all" href="/sessions/">' +
        '<span class="map-path-card__icon" aria-hidden="true">↗</span>' +
        '<span class="map-path-card__body"><span class="map-path-card__title">Explore all paths →</span>' +
        '<span class="map-path-card__kind">Sessions</span></span></a>' +
        "</div>";

      $$("[data-path-id]", discover).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-path-id");
          openPath(id);
        });
      });
    }

    function updateSearchPill() {
      if (!searchPill) return;
      if (!state.searchQ) {
        searchPill.hidden = true;
        searchPill.innerHTML = "";
        return;
      }
      searchPill.hidden = false;
      searchPill.innerHTML =
        'Showing results for “' +
        esc(state.searchQ) +
        '” <button type="button" data-clear-search aria-label="Clear search">×</button>';
      var b = $("[data-clear-search]", searchPill);
      if (b) {
        b.addEventListener("click", function () {
          clearSearchFocus();
        });
      }
    }

    function clearSearchFocus() {
      state.searchQ = "";
      updateSearchPill();
      $$("[data-map-node]", root).forEach(function (n) {
        n.classList.remove("is-match");
      });
    }

    function focusFromSearch(query, preferId) {
      if (state.mode !== "map") setMode("map");
      var q = (query || "").trim().toLowerCase();
      state.searchQ = query || "";
      updateSearchPill();
      var match = preferId && state.nodeById[preferId] ? preferId : null;
      if (!match && q) {
        var best = null;
        var bestScore = -1;
        state.data.nodes.forEach(function (n) {
          if (!(n.type === "art" || n.type === "style" || n.type === "person")) return;
          var label = (n.label || "").toLowerCase();
          var id = n.id.toLowerCase();
          var score = -1;
          if (label === q || id === q) score = 1000;
          else if (label.indexOf(q) === 0 || id.indexOf(q) === 0) score = 500;
          else if (label.indexOf(q) !== -1 || id.indexOf(q) !== -1) score = 100;
          if (score > bestScore) {
            bestScore = score;
            best = n.id;
          }
        });
        match = best;
      }
      if (match) {
        selectNode(match);
        focusOnNode(match, 1.35);
        root.scrollIntoView({ block: "nearest", behavior: REDUCE.matches ? "auto" : "smooth" });
      }
    }

    /* ——— Modes ——— */
    function setMode(mode) {
      if (mode === "timeline") mode = "map";
      state.mode = mode;
      root.setAttribute("data-map-mode", mode);
      $$("[data-map-mode]", root).forEach(function (el) {
        el.classList.toggle("is-active", el.getAttribute("data-map-mode") === mode);
        if (el.hasAttribute("aria-pressed")) {
          el.setAttribute("aria-pressed", el.getAttribute("data-map-mode") === mode ? "true" : "false");
        }
      });
      if (detail) {
        var showDetail = mode === "map";
        detail.hidden = !showDetail;
        if (!showDetail) {
          root.classList.remove("has-detail-open", "detail-sheet-open");
          var scrim = $("[data-map-detail-scrim]", root);
          if (scrim) scrim.hidden = true;
        }
      }
      if (modeHost) {
        if (mode === "map") {
          modeHost.hidden = true;
          modeHost.innerHTML = "";
          stage.hidden = false;
          if (discover) discover.hidden = false;
        } else if (mode === "discovery") {
          stage.hidden = false;
          if (discover) discover.hidden = false;
          modeHost.hidden = false;
        } else {
          stage.hidden = true;
          if (discover && mode !== "path") discover.hidden = false;
          if (mode === "path") discover.hidden = true;
          modeHost.hidden = false;
        }
      }
      if (mode === "map") {
        /* Leaving path/compare/discovery — restore usable atlas camera */
        if (state.pathId) state.pathId = null;
        state.pathStep = 0;
        restoreMapPositions();
        if (stage) {
          stage.hidden = false;
          stage.style.display = "";
        }
        if (modeHost) {
          modeHost.hidden = true;
          modeHost.innerHTML = "";
        }
        if (discover) discover.hidden = false;
        renderGraph();
        renderDetail(state.selected);
        applyDefaultView();
      }
    }

    function findDiscoverPath(pathId) {
      var paths = state.data.discoverPaths || [];
      var i;
      for (i = 0; i < paths.length; i++) {
        if (paths[i].id === pathId) return paths[i];
      }
      for (i = 0; i < paths.length; i++) {
        if (paths[i].sessionId === pathId || paths[i].alias === pathId) return paths[i];
      }
      return null;
    }

    function openPath(pathId) {
      var p = findDiscoverPath(pathId);
      if (!p) return;
      state.pathId = p.id;
      state.pathStep = 0;
      setMode("path");
      renderPathMode(p);
      try {
        var url = new URL(window.location.href);
        url.searchParams.set("path", p.id);
        url.hash = "map";
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch (err) {}
    }

    function renderPathMode(p) {
      if (!modeHost) return;
      var journey = p.journey || p.ids || [];
      var step = Math.max(0, Math.min(state.pathStep, journey.length - 1));
      state.pathStep = step;
      var nodes = journey.map(function (id) {
        return state.nodeById[id];
      }).filter(Boolean);
      var cur = nodes[step];
      var strip = nodes
        .map(function (n, i) {
          return (
            '<button type="button" class="map-path-mode__step' +
            (i === step ? " is-current" : "") +
            '" data-step="' +
            i +
            '">' +
            (thumbSrc(n)
              ? '<img src="' + esc(thumbSrc(n)) + '" alt="" loading="lazy">'
              : '<span class="map-path-mode__init">' + esc(initials(n.label)) + "</span>") +
            "<span>" +
            esc(n.label) +
            "</span></button>" +
            (i < nodes.length - 1 ? '<span class="map-path-mode__arrow" aria-hidden="true">→</span>' : "")
          );
        })
        .join("");

      modeHost.innerHTML =
        '<div class="map-path-mode">' +
        '<header class="map-path-mode__bar">' +
        '<button type="button" class="map-path-mode__back" data-exit-mode>← Map</button>' +
        '<p class="map-path-mode__kicker">Path</p>' +
        '<div class="map-path-mode__fromto">' +
        "<span>FROM <strong>" +
        esc(p.fromLabel || (nodes[0] && nodes[0].label) || "") +
        "</strong></span>" +
        "<span>TO <strong>" +
        esc(p.toLabel || (nodes[nodes.length - 1] && nodes[nodes.length - 1].label) || "") +
        "</strong></span>" +
        "</div></header>" +
        '<div class="map-path-mode__strip">' +
        strip +
        "</div>" +
        '<div class="map-path-mode__editorial">' +
        '<div class="map-path-mode__photo">' +
        (fullSrc(p) ? '<img src="' + esc(fullSrc(p)) + '" alt="" loading="lazy">' : "") +
        "</div>" +
        '<div class="map-path-mode__copy">' +
        "<h3>" +
        esc(p.title) +
        "</h3>" +
        "<p>" +
        esc(p.story || "") +
        "</p>" +
        (cur
          ? '<p class="map-path-mode__now">Now: <strong>' +
            esc(cur.label) +
            "</strong> — " +
            esc(cur.dek || "") +
            "</p>"
          : "") +
        '<div class="map-path-mode__nav">' +
        '<button type="button" data-path-prev' +
        (step === 0 ? " disabled" : "") +
        ">← Back</button>" +
        '<button type="button" data-path-next' +
        (step >= nodes.length - 1 ? " disabled" : "") +
        ">Next →</button>" +
        '<a class="map-path-mode__cta" href="' +
        esc(p.href || ("/sessions/?path=" + (p.sessionId || p.id))) +
        '">Explore this path →</a>' +
        "</div></div></div></div>";

      var exit = $("[data-exit-mode]", modeHost);
      if (exit) exit.addEventListener("click", function () { exitToMap(); });
      $$("[data-step]", modeHost).forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.pathStep = parseInt(btn.getAttribute("data-step"), 10) || 0;
          renderPathMode(p);
        });
      });
      var prev = $("[data-path-prev]", modeHost);
      var next = $("[data-path-next]", modeHost);
      if (prev) {
        prev.addEventListener("click", function () {
          state.pathStep = Math.max(0, state.pathStep - 1);
          renderPathMode(p);
        });
      }
      if (next) {
        next.addEventListener("click", function () {
          state.pathStep = Math.min(nodes.length - 1, state.pathStep + 1);
          renderPathMode(p);
        });
      }
    }

    function openCompare(fromId) {
      var pairs = state.data.comparePairs || [];
      var pair = null;
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].a === fromId || pairs[i].b === fromId) {
          pair = pairs[i];
          break;
        }
      }
      if (!pair && pairs.length) {
        /* default partner: first pair involving fromId else first pair */
        pair = pairs[0];
        if (fromId === pair.a) {
          /* ok */
        } else if (fromId !== pair.b) {
          /* synthesize with BJJ/Judo defaults when possible */
          var other = fromId === "judo" ? "bjj" : fromId === "bjj" ? "judo" : null;
          if (other && state.nodeById[other]) {
            pair = {
              a: fromId,
              b: other,
              aFocus: (state.nodeById[fromId].tags || []).slice(0, 4),
              bFocus: (state.nodeById[other].tags || []).slice(0, 4),
              shared: ["Grappling", "Lineage connections"],
              dek: "A quick editorial compare of two arts on the Field."
            };
          }
        }
      }
      if (!pair) return;
      state.compareIds = [pair.a, pair.b];
      setMode("compare");
      renderCompare(pair);
    }

    function renderCompare(pair) {
      if (!modeHost) return;
      var a = state.nodeById[pair.a];
      var b = state.nodeById[pair.b];
      if (!a || !b) return;
      function col(n, focus, side) {
        return (
          '<div class="map-compare__col map-compare__col--' +
          side +
          '">' +
          (thumbSrc(n) ? '<img class="map-compare__thumb" src="' + esc(thumbSrc(n)) + '" alt="" loading="lazy">' : "") +
          "<h3>" +
          esc(n.label) +
          "</h3>" +
          '<p class="map-compare__meta">' +
          esc(metaLine(n)) +
          "</p>" +
          '<p class="map-compare__section">Focus</p><ul>' +
          (focus || [])
            .map(function (f) {
              return "<li>" + esc(f) + "</li>";
            })
            .join("") +
          "</ul></div>"
        );
      }
      modeHost.innerHTML =
        '<div class="map-compare">' +
        '<header class="map-compare__bar"><button type="button" data-exit-mode>← Map</button>' +
        "<h3>Compare</h3></header>" +
        '<div class="map-compare__grid">' +
        col(a, pair.aFocus, "a") +
        '<div class="map-compare__shared"><p class="map-compare__section">Shared</p><ul>' +
        (pair.shared || [])
          .map(function (f) {
            return "<li>" + esc(f) + "</li>";
          })
          .join("") +
        '</ul><p class="map-compare__dek">' +
        esc(pair.dek || "") +
        "</p></div>" +
        col(b, pair.bFocus, "b") +
        "</div>" +
        '<div class="map-compare__actions">' +
        '<button type="button" data-focus-pair>Show on map →</button>' +
        (a.href && b.href
          ? '<a href="' + esc(a.href) + '">Explore ' + esc(a.label) + "</a>"
          : "") +
        "</div></div>";

      $("[data-exit-mode]", modeHost).addEventListener("click", function () {
        exitToMap();
      });
      $("[data-focus-pair]", modeHost).addEventListener("click", function () {
        exitToMap();
        selectNode(pair.a);
        focusOnNode(pair.a, 1.55);
      });
    }

    function openDiscovery() {
      var facts = state.data.discoveryFacts || [];
      if (!facts.length) return;
      state.discoveryIdx = state.discoveryIdx % facts.length;
      var fact = facts[state.discoveryIdx];
      setMode("discovery");
      if (!modeHost) return;
      modeHost.innerHTML =
        '<div class="map-discovery">' +
        '<div class="map-discovery__card">' +
        '<p class="map-discovery__kicker">Did you know?</p>' +
        "<p class=\"map-discovery__text\">" +
        esc(fact.text) +
        "</p>" +
        '<div class="map-discovery__actions">' +
        '<button type="button" class="map-discovery__cta" data-explore-fact>Explore the connection →</button>' +
        '<button type="button" data-shuffle-fact>Discover something new</button>' +
        '<button type="button" data-exit-mode>Close</button>' +
        "</div></div></div>";
      $("[data-exit-mode]", modeHost).addEventListener("click", function () {
        exitToMap();
      });
      $("[data-shuffle-fact]", modeHost).addEventListener("click", function () {
        state.discoveryIdx = (state.discoveryIdx + 1) % facts.length;
        openDiscovery();
      });
      $("[data-explore-fact]", modeHost).addEventListener("click", function () {
        var ids = fact.ids || [];
        exitToMap();
        if (ids[0]) {
          selectNode(ids[0]);
          focusOnNode(ids[0], 1.55);
        }
      });
    }

    function wireChrome() {
      var zoomIn = $("[data-map-zoom-in]", root);
      var zoomOut = $("[data-map-zoom-out]", root);
      var recenter = $("[data-map-recenter]", root);
      if (zoomIn) zoomIn.addEventListener("click", function () { setScale(state.scale + 0.15); });
      if (zoomOut) zoomOut.addEventListener("click", function () { setScale(state.scale - 0.15); });
      if (recenter) recenter.addEventListener("click", resetView);
      window.addEventListener("resize", function () {
        /* Keep default framing sensible when crossing mobile breakpoint while idle */
        if (state.mode === "map" && !state.selected && Math.abs(state.scale - defaultScale()) < 0.35) {
          applyDefaultView();
        }
      });

      var detailScrim = $("[data-map-detail-scrim]", root);
      if (detailScrim) {
        function dismissSheet(ev) {
          if (Date.now() < suppressClickUntil) {
            if (ev) {
              ev.preventDefault();
              ev.stopPropagation();
            }
            return;
          }
          selectNode(null);
        }
        detailScrim.addEventListener("click", dismissSheet);
        detailScrim.addEventListener("pointerup", dismissSheet);
      }

      if (rail) {
        $$("[data-map-mode]", rail).forEach(function (btn) {
          btn.addEventListener("click", function () {
            var m = btn.getAttribute("data-map-mode");
            if (m === "map") exitToMap();
            else if (m === "path") {
              var first = (state.data.discoverPaths || [])[0];
              if (first) openPath(first.id);
              else window.location.href = "/sessions/";
            }
          });
        });
      }

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          if (state.mode !== "map") {
            exitToMap();
            return;
          }
          if (state.selected) selectNode(null);
        }
      });

      svgHost.addEventListener("click", function (e) {
        if (e.target === svg || e.target === svgHost || (e.target.classList && e.target.classList.contains("map-product__wash"))) {
          /* ignore */
        }
      });

      /* Hero search bridge */
      var heroInput = document.querySelector("[data-home-search-input], #home-search-q");
      if (heroInput) {
        heroInput.addEventListener("input", function () {
          var q = (heroInput.value || "").trim();
          if (!q) {
            clearSearchFocus();
            return;
          }
          /* live dim handled by home-search; keep search pill soft */
          state.searchQ = q;
          updateSearchPill();
        });
      }

      document.addEventListener("mi:map-focus", function (ev) {
        var detail = (ev && ev.detail) || {};
        focusFromSearch(detail.query || "", detail.id || null);
      });
    }

    function boot(data) {
      state.data = data;
      VB.w = (data.viewBox && data.viewBox[2]) || 1140;
      VB.h = (data.viewBox && data.viewBox[3]) || 700;
      buildIndex(data);
      state.entity = { art: true, style: true, technique: false, person: false, lineage: false };
      ensureSvg();
      applyTransform();
      renderPills(data);
      renderLegend();
      renderDiscover(data);
      renderDetail(null);
      wireChrome();
      rememberMapPositions();
      setMode("map");
      renderGraph();
      applyDefaultView();

      window.MartialIndexMap = {
        focus: function (id, query) {
          focusFromSearch(query || "", id || null);
        },
        select: selectNode,
        openPath: openPath,
        findPath: findDiscoverPath,
        openCompare: openCompare,
        openDiscovery: openDiscovery,
        hasNode: function (id) {
          return !!state.nodeById[id];
        },
        nodeIdFromStyleSlug: function (slug) {
          if (!slug) return null;
          if (state.nodeById[slug]) return slug;
          return null;
        }
      };

      var deep = readUrlNode();
      var pathDeep = null;
      try {
        var u = new URL(window.location.href);
        pathDeep = u.searchParams.get("path");
        var h = (u.hash || "").replace(/^#/, "");
        if (!pathDeep && h.indexOf("path/") === 0) pathDeep = h.slice(5);
        if (!pathDeep && h.indexOf("map/path/") === 0) pathDeep = h.slice(9);
      } catch (err) {}
      if (pathDeep && findDiscoverPath(pathDeep)) {
        root.scrollIntoView({ block: "start" });
        openPath(pathDeep);
      } else if (deep) {
        selectNode(deep);
        root.scrollIntoView({ block: "start" });
      } else if (location.hash === "#map" || location.hash === "#map/") {
        root.scrollIntoView({ block: "start" });
      }
    }

    fetch(DATA_URL, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("map graph " + r.status);
        return r.json();
      })
      .then(boot)
      .catch(function (err) {
        console.warn("[map-product]", err);
        svgHost.innerHTML =
          '<p class="map-product__error">Map data failed to load. <a href="/styles/">Browse styles</a> instead.</p>';
      });
  }

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    $$("[data-map-product]").forEach(init);
  });
})();
