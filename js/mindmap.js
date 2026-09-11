/* Martial Index — style-hub mind map
   Draws SVG edges, then reveals branches on first intersection. */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)");
  var MOBILE = window.matchMedia("(max-width: 720px)");

  function prefersReduce() {
    return REDUCE.matches;
  }

  function isMobile() {
    return MOBILE.matches;
  }

  function centerOf(el, canvasRect) {
    var r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - canvasRect.left,
      y: r.top + r.height / 2 - canvasRect.top
    };
  }

  function edgeToward(from, to, inset) {
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var len = Math.hypot(dx, dy) || 1;
    var t = Math.min(inset / len, 0.42);
    return { x: from.x + dx * t, y: from.y + dy * t };
  }

  function quadPath(a, b) {
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var cx = mx + dy * 0.14;
    var cy = my - dx * 0.14;
    return "M " + a.x.toFixed(1) + " " + a.y.toFixed(1) +
      " Q " + cx.toFixed(1) + " " + cy.toFixed(1) +
      " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function addPath(svg, d, delay) {
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "mindmap__edge");
    path.setAttribute("fill", "none");
    svg.appendChild(path);
    var length = 0;
    try { length = path.getTotalLength(); } catch (e) { length = 120; }
    path.style.setProperty("--mm-len", String(length));
    path.style.setProperty("--mm-delay", delay + "ms");
    return path;
  }

  function draw(root) {
    var canvas = root.querySelector(".mindmap__canvas");
    var svg = root.querySelector(".mindmap__edges");
    var hub = root.querySelector(".mindmap__hub");
    if (!canvas || !svg || !hub) return;

    if (isMobile()) {
      clearSvg(svg);
      svg.setAttribute("hidden", "");
      return;
    }

    svg.removeAttribute("hidden");
    var cr = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(cr.width));
    var h = Math.max(1, Math.round(cr.height));
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    clearSvg(svg);

    var hubPt = centerOf(hub, cr);
    var clusters = root.querySelectorAll(".mindmap__cluster");
    var delay = 0;

    clusters.forEach(function (cluster, ci) {
      var label = cluster.querySelector(".mindmap__cluster-label");
      if (!label) return;
      var labelPt = centerOf(label, cr);
      var start = edgeToward(hubPt, labelPt, 28);
      var end = edgeToward(labelPt, hubPt, 10);
      addPath(svg, quadPath(start, end), delay);
      delay += 55;

      var nodes = cluster.querySelectorAll(".mindmap__node");
      nodes.forEach(function (node, ni) {
        var nodePt = centerOf(node, cr);
        var a = edgeToward(labelPt, nodePt, 8);
        var b = edgeToward(nodePt, labelPt, 10);
        addPath(svg, quadPath(a, b), delay + ni * 40);
      });
      delay += 70;
    });
  }

  function reveal(root) {
    if (root.classList.contains("is-drawn")) return;
    root.classList.add("is-drawn");
  }

  function init(root) {
    var nodes = root.querySelectorAll(".mindmap__node, .mindmap__cluster-label");
    nodes.forEach(function (el, i) {
      if (!el.style.getPropertyValue("--i")) {
        el.style.setProperty("--i", String(i));
      }
    });

    function paint() {
      draw(root);
    }

    paint();

    function start() {
      if (prefersReduce()) {
        root.classList.add("is-static");
        reveal(root);
        return;
      }
      // two frames so dashoffset "from" paints before is-drawn
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          reveal(root);
        });
      });
    }

    if (prefersReduce()) {
      start();
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
            io.disconnect();
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px 15% 0px" });
      io.observe(root);
      window.setTimeout(function () {
        if (!root.classList.contains("is-drawn")) start();
      }, 900);
    } else {
      start();
    }

    var timer = 0;
    function onChange() {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 120);
    }

    window.addEventListener("resize", onChange);
    if (typeof ResizeObserver === "function") {
      var ro = new ResizeObserver(onChange);
      var canvas = root.querySelector(".mindmap__canvas");
      if (canvas) ro.observe(canvas);
    }
    if (typeof REDUCE.addEventListener === "function") {
      REDUCE.addEventListener("change", function () {
        if (prefersReduce()) {
          root.classList.add("is-static");
          reveal(root);
        }
        paint();
      });
    }
    if (typeof MOBILE.addEventListener === "function") {
      MOBILE.addEventListener("change", paint);
    }
  }

  function boot() {
    document.querySelectorAll("[data-mindmap]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
