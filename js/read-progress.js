(function () {
  var track = document.querySelector(".read-progress");
  var bar = document.querySelector(".read-progress__bar");
  if (!track || !bar) return;

  var article =
    document.querySelector(".article-main") ||
    document.querySelector("article") ||
    document.querySelector("main");
  if (!article) return;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function update() {
    var rect = article.getBoundingClientRect();
    var articleTop = window.scrollY + rect.top;
    var articleHeight = article.offsetHeight;
    var view = window.innerHeight || document.documentElement.clientHeight;
    var readable = articleHeight - view;
    var pct;
    if (readable <= 0) {
      pct = window.scrollY + view >= articleTop + articleHeight ? 100 : 0;
    } else {
      pct = ((window.scrollY - articleTop) / readable) * 100;
    }
    pct = clamp(pct, 0, 100);
    bar.style.transform = "scaleX(" + pct / 100 + ")";
    track.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update);
  } else {
    update();
  }
})();
