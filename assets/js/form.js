/* Avolt Electrical — enquiry form (Web3Forms AJAX) */
(function () {
  "use strict";

  /* ===========================================================
     SETUP: paste your free Web3Forms access key below.
     Get one in 30 seconds: go to https://web3forms.com/ ,
     enter the inbox email where enquiries should land, and copy
     the access key they email you. Replace the value below.
     Until a real key is set, the form runs in DEMO mode and just
     shows the success state without sending anything.
     =========================================================== */
  var ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";

  var form = document.getElementById("enquiry-form");
  if (!form) return;

  var DEMO = !ACCESS_KEY || ACCESS_KEY === "YOUR_WEB3FORMS_ACCESS_KEY";
  var submitBtn = form.querySelector('button[type="submit"]');
  var btnLabel = submitBtn ? submitBtn.querySelector(".btn-label") : null;
  var statusBox = document.getElementById("form-status");
  var successBox = document.getElementById("form-success");

  /* set the access key into the hidden field if present */
  var keyField = form.querySelector('input[name="access_key"]');
  if (keyField && !DEMO) keyField.value = ACCESS_KEY;

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var phoneRe = /^[0-9+()\s-]{8,}$/;

  function setError(field, msg) {
    var input = form.querySelector('[name="' + field + '"]');
    if (!input) return;
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    var err = input.closest(".field").querySelector(".err");
    if (err) { err.textContent = msg; err.classList.add("show"); }
  }
  function clearError(input) {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    var err = input.closest(".field").querySelector(".err");
    if (err) err.classList.remove("show");
  }

  form.querySelectorAll("input, select, textarea").forEach(function (el) {
    el.addEventListener("input", function () { clearError(el); });
    el.addEventListener("change", function () { clearError(el); });
  });

  function validate() {
    var ok = true;
    var data = new FormData(form);
    function fail(field, msg) { setError(field, msg); ok = false; }

    if (!String(data.get("name") || "").trim()) fail("name", "Please enter your name.");
    var phone = String(data.get("phone") || "").trim();
    if (!phone) fail("phone", "Please enter a phone number.");
    else if (!phoneRe.test(phone)) fail("phone", "That phone number looks incomplete.");
    var email = String(data.get("email") || "").trim();
    if (!email) fail("email", "Please enter your email.");
    else if (!emailRe.test(email)) fail("email", "Please enter a valid email address.");
    if (!String(data.get("service") || "").trim()) fail("service", "Please choose a service.");
    if (String(data.get("message") || "").trim().length < 10) fail("message", "Tell us a little about the job (10+ characters).");

    if (!ok) {
      var firstBad = form.querySelector(".invalid");
      if (firstBad) firstBad.focus();
    }
    return ok;
  }

  function showStatus(type, msg) {
    if (!statusBox) return;
    statusBox.className = "form-status show " + (type === "ok" ? "ok" : "bad");
    statusBox.innerHTML =
      (type === "ok"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>') +
      "<span>" + msg + "</span>";
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.setAttribute("aria-busy", busy ? "true" : "false");
    if (btnLabel) {
      btnLabel.innerHTML = busy
        ? '<span class="spinner"></span> Sending…'
        : 'Send enquiry';
    }
  }

  function showSuccess() {
    if (successBox) {
      form.style.display = "none";
      if (statusBox) statusBox.className = "form-status";
      successBox.classList.add("show");
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      showStatus("ok", "Thanks — your enquiry has been sent. We'll be in touch shortly.");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (statusBox) statusBox.className = "form-status";

    /* honeypot — if filled, silently pretend success */
    var hp = form.querySelector('input[name="botcheck"]');
    if (hp && hp.checked) { showSuccess(); return; }

    if (!validate()) {
      showStatus("bad", "Please fix the highlighted fields and try again.");
      return;
    }

    setBusy(true);

    if (DEMO) {
      /* No access key configured yet — simulate a successful send. */
      window.setTimeout(function () { setBusy(false); showSuccess(); }, 900);
      return;
    }

    var payload = Object.fromEntries(new FormData(form).entries());
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        setBusy(false);
        if (json.success) showSuccess();
        else showStatus("bad", json.message || "Something went wrong. Please call us on the number above.");
      })
      .catch(function () {
        setBusy(false);
        showStatus("bad", "Network error — please try again, or call us directly.");
      });
  });
})();
