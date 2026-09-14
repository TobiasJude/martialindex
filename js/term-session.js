(function () {
  "use strict";

  var PROGRESS = [
    "Lock · learn",
    "Lock · drill",
    "Break posture · learn",
    "Break posture · drill",
    "Angle · learn",
    "Angle · drill",
    "Glue",
    "Whole",
    "Transition",
    "Done"
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function scrollBehavior() {
    return prefersReducedMotion() ? "auto" : "smooth";
  }

  function haptic(ms) {
    if (prefersReducedMotion()) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }

  function lowerFirst(str) {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  function setProgress(root, index, stepsCount) {
    var doneIndex = PROGRESS.length - 1;
    var isDone = index >= doneIndex;
    var total = Math.max(stepsCount || 0, 1);

    var el = $("[data-session-progress]", root);
    var remEl = $("[data-session-remaining]", root);
    var label = isDone
      ? "Done"
      : PROGRESS[Math.min(index, doneIndex)] || "";

    if (el) el.textContent = label;

    if (remEl) {
      if (isDone) {
        remEl.textContent = "";
        remEl.hidden = true;
      } else {
        var remaining = total - index - 1;
        if (remaining > 1) {
          remEl.textContent = " · " + remaining + " left";
          remEl.hidden = false;
        } else if (remaining === 1) {
          remEl.textContent = " · Last beat";
          remEl.hidden = false;
        } else {
          remEl.textContent = "";
          remEl.hidden = true;
        }
      }
    }

    var dots = $all("[data-session-dots] li", root);
    dots.forEach(function (dot, i) {
      if (isDone) {
        dot.classList.remove("is-current");
        dot.classList.add("is-done");
      } else {
        dot.classList.toggle("is-current", i === index);
        dot.classList.toggle("is-done", i < index);
      }
    });

    var fill = $(".session__bar-fill", root);
    if (fill) {
      var pct;
      if (isDone) {
        pct = 100;
      } else {
        pct = (index / total) * 100;
      }
      fill.style.width = pct + "%";
    }
  }

  function revealStance(check) {
    var details = $(".check__stance", check);
    if (details && !details.open) details.open = true;
  }

  function showContinue(step, pulse) {
    var btn = $("[data-session-continue]", step);
    if (!btn) return;
    btn.hidden = false;
    btn.classList.toggle("is-pulse", !!pulse && !prefersReducedMotion());
  }

  function clearSessionField(session) {
    if (!session) return;
    session.classList.remove("is-win-field", "is-miss-field");
  }

  function hideContinue(step, session) {
    var btn = $("[data-session-continue]", step);
    if (btn) {
      btn.hidden = true;
      btn.classList.remove("is-pulse", "is-win", "is-miss");
    }
    clearSessionField(session);
  }

  /* Chrome stays visible — class is a chapter inside the SEO post */
  function setChromeHidden() {}

  function bindCheck(check, session) {
    var choices = $all(".check__choice", check);
    var feedback = $("[data-check-feedback]", check);
    if (!choices.length) return;

    choices.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (check.classList.contains("is-resolved")) return;

        var correct = btn.getAttribute("data-correct") === "true";
        var mistake = btn.getAttribute("data-mistake") || "";
        var win = check.getAttribute("data-win") || "Locked.";

        choices.forEach(function (c) {
          c.disabled = true;
          c.classList.remove("is-picked", "is-correct", "is-wrong");
        });
        btn.classList.add("is-picked");

        if (correct) {
          btn.classList.add("is-correct");
          if (feedback) {
            feedback.hidden = false;
            feedback.textContent = win;
            feedback.classList.add("is-win");
            feedback.classList.remove("is-miss");
          }
          haptic(10);
        } else {
          btn.classList.add("is-wrong");
          var right = choices.filter(function (c) {
            return c.getAttribute("data-correct") === "true";
          })[0];
          if (right) right.classList.add("is-correct");
          if (feedback) {
            feedback.hidden = false;
            feedback.textContent = mistake
              ? "That's the miss: " + lowerFirst(mistake) + "."
              : "That's the miss.";
            feedback.classList.add("is-miss");
            feedback.classList.remove("is-win");
          }
          haptic(24);
        }

        revealStance(check);
        check.classList.add("is-resolved");
        check.classList.toggle("is-win", correct);
        check.classList.toggle("is-miss", !correct);

        if (session) {
          session.classList.toggle("is-win-field", correct);
          session.classList.toggle("is-miss-field", !correct);
        }

        var cont = $("[data-session-continue]", check);
        if (cont) {
          var winText = cont.getAttribute("data-continue-win") || "Next beat";
          var missText = cont.getAttribute("data-continue-miss") || "Hold that. Next.";
          cont.textContent = correct ? winText : missText;
          cont.classList.toggle("is-win", correct);
          cont.classList.toggle("is-miss", !correct);
        }

        showContinue(check, correct);
      });
    });
  }

  function init() {
    var root = $("article[data-learning-app]") || $("article.term-closed-guard");
    if (!root) return;
    var session = $("#session", root);
    if (!session) return;

    var steps = $all("[data-session-step]", session);
    if (!steps.length) return;

    var closePanel = $("[data-session-close]", session);
    var index = 0;
    var stepsCount = steps.length;

    session.classList.add("is-paged");

    function activate(i) {
      index = i;
      clearSessionField(session);
      steps.forEach(function (step, n) {
        var on = n === index;
        step.classList.toggle("is-active", on);
        if (on) {
          step.removeAttribute("hidden");
          step.removeAttribute("inert");
        } else {
          step.setAttribute("hidden", "");
          step.setAttribute("inert", "");
        }
        if (!on) hideContinue(step, session);
      });

      setProgress(session, Math.min(index, stepsCount - 1), stepsCount);

      var current = steps[index];
      if (current) {
        // Teach steps: Continue ready immediately. Checks wait for a pick.
        if (!current.hasAttribute("data-check")) {
          showContinue(current, false);
        } else if (current.classList.contains("is-resolved")) {
          showContinue(current, false);
        } else {
          hideContinue(current, session);
        }
      }

      // Keep session stage in view on step change (mobile)
      try {
        var head = $(".session__head", session);
        if (head && index > 0) {
          head.scrollIntoView({ block: "start", behavior: scrollBehavior() });
        }
      } catch (e) {}
    }

    function finish() {
      steps.forEach(function (step) {
        step.classList.remove("is-active");
        step.setAttribute("hidden", "");
        step.setAttribute("inert", "");
        hideContinue(step, session);
      });
      clearSessionField(session);
      session.classList.add("is-complete");
      setProgress(session, PROGRESS.length - 1, stepsCount);

      if (closePanel) {
        closePanel.hidden = false;
        closePanel.removeAttribute("hidden");
      }

      // Close panel only — do not jump into #entry
      try {
        var scrollTarget = closePanel || session;
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ block: "start", behavior: scrollBehavior() });
        }
      } catch (e) {}
    }

    // Keep encyclopedia chrome + Ask/next-learn visible (SEO post).
    // Only page the session steps.

    steps.forEach(function (step) {
      if (step.hasAttribute("data-check")) {
        bindCheck(step, session);
      }
      var cont = $("[data-session-continue]", step);
      if (cont) {
        cont.addEventListener("click", function () {
          if (index >= steps.length - 1) {
            finish();
            return;
          }
          activate(index + 1);
        });
      }
    });

    activate(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
