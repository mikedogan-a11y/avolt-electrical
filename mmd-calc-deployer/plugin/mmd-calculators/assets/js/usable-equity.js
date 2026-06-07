/* Usable Equity Calculator — depends on mmd-core.js
   Pillar: investment / guarantor / professional.
   Lead tag: Calculator - Equity. */
(function () {
  "use strict";
  var KEY = "equity";

  var INPUTS = ["eq_value", "eq_balance", "eq_target"];
  var DEFAULT_TARGET = 80;

  function num(id, fallback) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    if (raw === "" && fallback !== undefined) return fallback;
    return MMD.parseMoney(raw);
  }

  function compute() {
    var value   = num("eq_value");
    var balance = num("eq_balance");
    var target  = num("eq_target", DEFAULT_TARGET);
    if (target <= 0) target = DEFAULT_TARGET;

    var totalEquity  = Math.max(0, value - balance);
    var usableEquity = Math.max(0, value * (target / 100) - balance);
    var currentLVR   = MMD.lvr(balance, value);

    return {
      value: value, balance: balance, target: target,
      totalEquity: totalEquity, usableEquity: usableEquity, currentLVR: currentLVR
    };
  }

  function render() {
    var r = compute();

    if (r.usableEquity <= 0) {
      MMD.setText("eqr_usable", "$0.00");
      MMD.setText("eqr_usablehint", "At this target LVR there may be no usable equity yet — let's review.");
    } else {
      MMD.setText("eqr_usable", MMD.fmtCurrency(r.usableEquity));
      MMD.setText("eqr_usablehint", "Equity you may be able to access at your target LVR");
    }

    MMD.setText("eqr_total", MMD.fmtCurrency(r.totalEquity));
    MMD.setText("eqr_lvr", MMD.fmtPercent(r.currentLVR));
    var meter = MMD.$("eqr_lvrmeter");
    if (meter) meter.style.width = Math.max(0, Math.min(100, r.currentLVR)).toFixed(1) + "%";
    MMD.setText("eqr_target", MMD.fmtPercent(r.target));
    MMD.setText("eqr_note",
      "Usable equity is the portion of your equity a lender may let you access at your target LVR. " +
      "Most lenders cap this around 80% LVR (above which LMI may apply), and a lender valuation and full assessment will still be required.");

    MMD.lead.track(KEY, { usableEquity: r.usableEquity, totalEquity: r.totalEquity, currentLVR: r.currentLVR });
  }

  function reset() {
    INPUTS.forEach(function (id) {
      var e = MMD.$(id); if (!e) return;
      if (e.tagName === "SELECT") e.selectedIndex = 0; else e.value = "";
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    MMD.renderPreviewChrome();
    MMD.renderTopDisclaimer(document.querySelector("[data-mmd-top]"));
    MMD.renderBottomDisclaimers(document.querySelector("[data-mmd-bottom]"), {
      calcName: "Usable Equity",
      assumptions: [
        "Usable equity is an estimate based on the value you provided — a lender will require a valuation, which may differ.",
        "Accessing equity is subject to lender policy, serviceability and credit assessment.",
        "Most lenders cap usable equity around 80% LVR, above which Lenders Mortgage Insurance may apply."
      ],
      warnings: [
        "A lender valuation may differ from your estimate and change the equity available.",
        "Accessing equity increases your debt and the interest you pay."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Could this equity support your next purchase or refinance?",
      getContext: function () { var r = compute(); return { usableEquity: r.usableEquity, totalEquity: r.totalEquity, currentLVR: r.currentLVR }; }
    });

    MMD.bind(INPUTS, render);
    MMD.on("eq_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("eq_reset", "click", reset);
    render();
  });
})();
