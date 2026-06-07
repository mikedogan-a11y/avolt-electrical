/* Refinance Savings & Break-Even Calculator — depends on mmd-core.js
   Pillar: refinancing.
   Lead tag: Calculator - Refinance.
   COMPLIANCE: never state guaranteed savings. Use "estimated"/"could"/"may".
   Savings depend on the loan you qualify for and lender approval. */
(function () {
  "use strict";
  var KEY = "refinance";

  var INPUTS = ["rf_balance","rf_currentrate","rf_newrate","rf_term","rf_repaytype",
                "rf_switchcosts","rf_cashback","rf_period"];
  // default assumptions (editable by the user)
  var DEFAULTS = {
    rf_currentrate: 6.80, rf_newrate: 6.10, rf_term: 25,
    rf_switchcosts: 800, rf_cashback: 0, rf_period: 3
  };

  function num(id, fallback) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    if (raw === "" && fallback !== undefined) return fallback;
    return MMD.parseMoney(raw);
  }

  function compute() {
    var balance      = num("rf_balance");
    var currentRate  = num("rf_currentrate", DEFAULTS.rf_currentrate);
    var newRate      = num("rf_newrate", DEFAULTS.rf_newrate);
    var years        = num("rf_term", DEFAULTS.rf_term);
    var interestOnly = MMD.$("rf_repaytype").value === "io";
    var switchCosts  = num("rf_switchcosts", DEFAULTS.rf_switchcosts);
    var cashback     = num("rf_cashback", DEFAULTS.rf_cashback);
    var comparison   = num("rf_period", DEFAULTS.rf_period);

    var currentRepay = MMD.repayment(balance, currentRate, years, 12, interestOnly);
    var newRepay     = MMD.repayment(balance, newRate, years, 12, interestOnly);
    var monthlySaving = MMD.finite(currentRepay - newRepay);

    var netCost = MMD.finite(switchCosts - cashback);

    // Guard division: only compute break-even when there is a positive monthly saving.
    var breakEvenMonths = (monthlySaving > 0) ? Math.ceil(netCost / monthlySaving) : null;

    var totalSaving = MMD.finite(monthlySaving * 12 * comparison - netCost);

    return {
      balance: balance, currentRepay: currentRepay, newRepay: newRepay,
      monthlySaving: monthlySaving, netCost: netCost,
      breakEvenMonths: breakEvenMonths, totalSaving: totalSaving,
      comparison: comparison
    };
  }

  function render() {
    var r = compute();

    var hasSaving = r.monthlySaving > 0;

    MMD.setText("rfr_saving", hasSaving ? MMD.fmtCurrency(r.monthlySaving) : "$0.00");
    MMD.setText("rfr_savinghint", hasSaving
      ? "Difference in repayments at the rates entered"
      : "At these figures refinancing may not reduce your repayments — worth a proper review.");

    MMD.setText("rfr_current", MMD.fmtCurrency(r.currentRepay));
    MMD.setText("rfr_new", MMD.fmtCurrency(r.newRepay));

    // Break-even point: guard the null (no positive monthly saving) case.
    MMD.setText("rfr_breakeven", r.breakEvenMonths === null
      ? "N/A — no monthly saving at these figures"
      : r.breakEvenMonths + " months");

    var periodLabel = MMD.fmtNumber(r.comparison, 0);
    MMD.setText("rfr_totallabel", "Estimated total saving over " + periodLabel + " years");
    MMD.setText("rfr_total", MMD.fmtCurrency(r.totalSaving));

    var totalCard = MMD.$("rfr_totalcard");
    if (totalCard) {
      totalCard.classList.remove("is-positive", "is-caution");
      totalCard.classList.add(r.totalSaving >= 0 ? "is-positive" : "is-caution");
    }

    MMD.lead.track(KEY, {
      monthlySaving: r.monthlySaving,
      breakEvenMonths: r.breakEvenMonths,
      totalSaving: r.totalSaving
    });
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
      calcName: "Refinance Savings & Break-Even",
      showComparisonWarning: true,
      assumptions: [
        "Savings are estimates based on the rates and costs you entered and assume both rates stay constant for the comparison period.",
        "The estimate does not include all fees, nor the long-run cost of extending your loan term, and uses your remaining term for both loans.",
        "Switching costs and any cashback are taken at the figures you entered and should be confirmed with the lenders involved."
      ],
      warnings: [
        "Actual savings depend on the loan you qualify for and are always subject to lender approval.",
        "Extending your loan term can increase the total interest you pay over the life of the loan, even if your monthly repayment falls.",
        "Any interest rate shown is indicative only and is not an offer of credit."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Want us to check what you could really save by refinancing?",
      getContext: function () {
        var r = compute();
        return {
          monthlySaving: r.monthlySaving,
          breakEvenMonths: r.breakEvenMonths,
          totalSaving: r.totalSaving
        };
      }
    });

    MMD.bind(INPUTS, render);
    MMD.on("rf_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("rf_reset", "click", reset);
    render();
  });
})();
