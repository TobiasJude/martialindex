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
