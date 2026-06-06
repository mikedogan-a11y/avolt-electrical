/* Avolt Electrical — site interactions (restrained motion, reduced-motion aware) */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* mobile nav toggle */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* current year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* header condenses on scroll */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 24) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* scroll reveal, with a light one-after-another stagger inside grids */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (!reduce && el.parentElement) {
          var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) {
            return c.classList.contains("reveal");
          });
          var idx = sibs.indexOf(el);
          if (idx > 0) el.style.transitionDelay = (Math.min(idx, 6) * 0.07).toFixed(2) + "s";
        }
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* count-up on numeric stats when they scroll into view */
  var nums = document.querySelectorAll(".stat .num b");
  var canAnim = ("IntersectionObserver" in window) && !reduce;
  if (nums.length && canAnim) {
    var toAnim = [];
    nums.forEach(function (el) {
      var t = el.textContent.trim();
      if (/^\d+$/.test(t)) {
        el.setAttribute("data-count", t);
        el.textContent = "0";
        toAnim.push(el);
      }
    });
    if (toAnim.length) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var target = parseInt(el.getAttribute("data-count"), 10);
          var dur = 1100, startTs = null;
          var step = function (ts) {
            if (!startTs) startTs = ts;
            var p = Math.min((ts - startTs) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic — smooth, no bounce */
            el.textContent = String(Math.round(eased * target));
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = String(target);
          };
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      }, { threshold: 0.5 });
      toAnim.forEach(function (el) { cio.observe(el); });
    }
  }

  /* a single soft pulse to draw the eye to the mobile call button */
  if (!reduce) {
    window.setTimeout(function () {
      var fab = document.querySelector(".fab-call");
      if (fab) fab.classList.add("nudge");
    }, 1500);
  }
})();
