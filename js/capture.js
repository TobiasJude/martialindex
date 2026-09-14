(function () {
  "use strict";

  var ENDPOINT = "https://formsubmit.co/ajax/tgeisler12@gmail.com";

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function setStatus(form, status, kind, text) {
    form.classList.remove("is-error", "is-success");
    if (kind) form.classList.add(kind);
    if (status) {
      status.hidden = false;
      status.textContent = text;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var emailInput = form.querySelector('input[name="email"], input[type="email"]');
    var status = form.querySelector("[data-capture-status]");
    var submit = form.querySelector('button[type="submit"], button:not([type])');
    var email = emailInput ? String(emailInput.value || "").trim() : "";

    if (status) {
      status.hidden = true;
      status.textContent = "";
    }

    if (!email || !isEmail(email)) {
      setStatus(form, status, "is-error", "Please enter a valid email.");
      if (emailInput) emailInput.focus();
      return;
    }

    if (submit) submit.disabled = true;

    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        email: email,
        page: location.pathname || "/",
        source: location.href,
        _captcha: "false",
        _subject: "Martial Index newsletter signup"
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        }).catch(function () {
          return { ok: res.ok, data: null };
        });
      })
      .then(function (result) {
        var payload = result.data || {};
        if (result.ok && payload.success !== "false" && payload.success !== false) {
          setStatus(form, status, "is-success", "Thanks — you’re on the list.");
          form.reset();
          return;
        }
        throw new Error(payload.message || "submit failed");
      })
      .catch(function () {
        setStatus(form, status, "is-error", "Couldn’t join just now. Try again.");
      })
      .then(function () {
        if (submit) submit.disabled = false;
      });
  }

  function bind(form) {
    form.addEventListener("submit", handleSubmit);
  }

  document.querySelectorAll("form[data-capture]").forEach(bind);
})();

(function loadAnalyticsIdle() {
  if (window.__miAnalyticsLoader) return;
  window.__miAnalyticsLoader = true;

  var GA_ID = "G-SVY4HBL4SY";
  var POSTHOG_SRC = "/js/posthog.js?v=phog5";
  var IDLE_TIMEOUT_MS = 4000;

  function loadPosthog() {
    if (window.__miPosthogLoader) return;
    window.__miPosthogLoader = true;
    var s = document.createElement("script");
    s.src = POSTHOG_SRC;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
  }

  function loadGtag() {
    if (window.__miGtagLoader || window.gtag) return;
    window.__miGtagLoader = true;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    var s = document.createElement("script");
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    s.async = true;
    s.onload = function () {
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, { send_page_view: true });
    };
    (document.head || document.documentElement).appendChild(s);
  }

  function start() {
    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      loadGtag();
      loadPosthog();
    }
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    } else {
      setTimeout(run, IDLE_TIMEOUT_MS);
    }
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
