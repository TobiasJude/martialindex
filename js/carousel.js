(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initCarousel(root) {
    var track = root.querySelector(".carousel__track");
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll(".carousel__slide"));
    if (slides.length < 2) return;

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
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      if (i === 0) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", function () {
        goTo(i);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    var index = 0;
    var ticking = false;

    function slideWidth() {
      return track.clientWidth || 1;
    }

    function goTo(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      if (reduceMotion) {
        track.scrollLeft = index * slideWidth();
      } else {
        track.scrollTo({ left: index * slideWidth(), behavior: "smooth" });
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
