(function () {
  var roots = document.querySelectorAll(".toc, .toc-mobile");
  if (!roots.length) return;

  var links = [];
  roots.forEach(function (root) {
    root.querySelectorAll('a[href^="#"]').forEach(function (a) {
      links.push(a);
    });
  });
  if (!links.length) return;

  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    if (!map[id]) map[id] = [];
    map[id].push(a);
  });

  var ids = Object.keys(map);
  var sections = ids
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);
  if (!sections.length) return;

  function clear() {
    links.forEach(function (a) {
      a.removeAttribute("aria-current");
      var li = a.closest("li");
      if (li) li.classList.remove("is-active");
    });
  }

  function activate(id) {
    clear();
    (map[id] || []).forEach(function (a) {
      a.setAttribute("aria-current", "true");
      var li = a.closest("li");
      if (li) li.classList.add("is-active");
      // also mark parent li if nested
      var parentLi = li && li.parentElement && li.parentElement.closest("li");
      if (parentLi) parentLi.classList.add("is-active");
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      var visible = entries
        .filter(function (e) {
          return e.isIntersecting;
        })
        .sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });
      if (visible[0] && visible[0].target.id) {
        activate(visible[0].target.id);
      }
    },
    {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.25, 1],
    }
  );

  sections.forEach(function (sec) {
    observer.observe(sec);
  });
})();
