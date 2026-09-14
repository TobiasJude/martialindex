(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initCarousel(root) {
    if (!root || root.getAttribute("data-carousel-ready") === "1") return;
    if (root.hasAttribute("hidden")) return;

    var track = root.querySelector(".carousel__track");
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll(".carousel__slide"));
    if (slides.length < 2) return;

    root.setAttribute("data-carousel-ready", "1");

    var nav = root.querySelector(".carousel__nav");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "carousel__nav";
      nav.innerHTML =
        '<button type="button" class="carousel__btn carousel__prev" aria-label="Previous slide">‹</button>' +
        '<div class="carousel__dots" role="group" aria-label="Slides"></div>' +
        '<button type="button" class="carousel__btn carousel__next" aria-label="Next slide">›</button>';
      root.appendChild(nav);
    }

    var dotsWrap = nav.querySelector(".carousel__dots");
    if (dotsWrap && dotsWrap.getAttribute("role") === "tablist") dotsWrap.setAttribute("role", "group");
    var prevBtn = nav.querySelector(".carousel__prev");
    var nextBtn = nav.querySelector(".carousel__next");
    var dots = [];

    dotsWrap.innerHTML = "";
    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      var panel = root.getAttribute("data-art-panel") || "";
      var label = panel
        ? panel.replace(/-/g, " ") + ", slide " + (i + 1)
        : "Go to slide " + (i + 1);
      dot.setAttribute("aria-label", label);
      if (i === 0) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", function () {
        goTo(i);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    var index = 0;
    var ticking = false;
    var widthCache = 0;

    function slideWidth() {
      if (!widthCache) widthCache = track.clientWidth || 1;
      return widthCache;
    }

    function goTo(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      var w = slideWidth();
      if (reduceMotion) {
        track.scrollLeft = index * w;
      } else {
        track.scrollTo({ left: index * w, behavior: "smooth" });
      }
      updateChrome();
    }

    function updateChrome() {
      dots.forEach(function (dot, i) {
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= slides.length - 1;
    }

    function syncFromScroll() {
      var w = slideWidth();
      var next = Math.round(track.scrollLeft / w);
      next = Math.max(0, Math.min(slides.length - 1, next));
      if (next !== index) {
        index = next;
        updateChrome();
      }
    }

    track.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          syncFromScroll();
          ticking = false;
        });
      },
      { passive: true }
    );

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(index - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(index + 1);
      });
    }

    window.addEventListener(
      "resize",
      function () {
        widthCache = 0;
        track.scrollLeft = index * slideWidth();
        updateChrome();
      },
      { passive: true }
    );

    updateChrome();
  }

  function initAll() {
    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
  }

  window.__miInitCarousel = initCarousel;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
