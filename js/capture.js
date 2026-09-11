(function () {
  "use strict";

  var STORAGE_KEY = "martialindex.leads";

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function loadLeads() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveLead(lead) {
    var leads = loadLeads();
    leads.push(lead);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }

  function handleSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var emailInput = form.querySelector('input[name="email"], input[type="email"]');
    var telInput = form.querySelector('input[name="tel"], input[type="tel"]');
    var status = form.querySelector("[data-capture-status]");
    var email = emailInput ? String(emailInput.value || "").trim() : "";
    var tel = telInput ? String(telInput.value || "").trim() : "";

    form.classList.remove("is-error", "is-success");
    if (status) {
      status.hidden = true;
      status.textContent = "";
    }

    if (!email || !isEmail(email)) {
      form.classList.add("is-error");
      if (status) {
        status.hidden = false;
        status.textContent = "Please enter a valid email.";
      }
      if (emailInput) emailInput.focus();
      return;
    }

    saveLead({
      email: email,
      tel: tel || null,
      page: location.pathname || "",
      at: new Date().toISOString()
    });

    form.classList.add("is-success");
    if (status) {
      status.hidden = false;
      status.textContent = "Thanks — you’re on the list.";
    }
    form.reset();
  }

  function bind(form) {
    form.addEventListener("submit", handleSubmit);
  }

  document.querySelectorAll("form[data-capture]").forEach(bind);
})();
