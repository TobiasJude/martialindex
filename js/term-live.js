(function () {
  "use strict";

  var STORAGE_KEY = "martialindex.questions";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function normalizeQ(q) {
    return String(q || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function loadQuestions() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (err) {
      return [];
    }
  }

  function saveQuestions(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function landedList() {
    return $("#ask-landed");
  }

  function showLandedIfAny(list) {
    if (!list) return;
    if ($all("li", list).length) {
      list.hidden = false;
      list.removeAttribute("hidden");
    } else {
      list.hidden = true;
      list.setAttribute("hidden", "");
    }
  }

  function prependLanded(text) {
    var list = landedList();
    if (!list) return;
    var trimmed = String(text || "").trim();
    if (!trimmed) return;
    var norm = normalizeQ(trimmed);
    var exists = $all("li", list).some(function (li) {
      return normalizeQ(li.textContent) === norm;
    });
    if (exists) {
      showLandedIfAny(list);
      return;
    }
    var li = document.createElement("li");
    li.textContent = trimmed;
    list.insertBefore(li, list.firstChild);
    showLandedIfAny(list);
  }

  function hydrateLanded() {
    var list = landedList();
    if (!list) return;
    var path = location.pathname;
    var forPath = loadQuestions().filter(function (entry) {
      return entry && entry.path === path && entry.q;
    });
    // Storage is append-order; prepend each so newest ends on top
    for (var i = 0; i < forPath.length; i++) {
      prependLanded(forPath[i].q);
    }
    showLandedIfAny(list);
  }

  function bindAsk() {
    var form = $(".ask-house__form");
    if (!form) return;
    var qInput = $("#ask-page-q", form) || form.querySelector("textarea[name='question']");
    var emailInput = form.querySelector("input[name='email'], input[type='email']");
    var status = form.querySelector(".ask-house__status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.classList.remove("is-error", "is-success");
      if (status) status.textContent = "";

      var q = qInput ? String(qInput.value || "").trim() : "";
      var email = emailInput ? String(emailInput.value || "").trim() : "";

      if (!q) {
        form.classList.add("is-error");
        if (status) status.textContent = "Ask a question first.";
        if (qInput) qInput.focus();
        return;
      }

      if (email && !isEmail(email)) {
        form.classList.add("is-error");
        if (status) status.textContent = "That email does not look right.";
        if (emailInput) emailInput.focus();
        return;
      }

      var entry = {
        q: q,
        email: email || "",
        path: location.pathname,
        at: new Date().toISOString()
      };

      var all = loadQuestions();
      var already = all.some(function (item) {
        return item && item.path === entry.path && normalizeQ(item.q) === normalizeQ(q);
      });
      if (!already) {
        all.push(entry);
        saveQuestions(all);
      }
      prependLanded(q);

      form.classList.add("is-success");
      if (status) status.textContent = "On the page.";
      if (qInput) qInput.value = "";
    });
  }

  function init() {
    if (!$(".term-live") && !document.body.classList.contains("term-live")) {
      var art = $("article.article-layout");
      if (!art || !art.classList.contains("term-live")) return;
    }
    hydrateLanded();
    bindAsk();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
