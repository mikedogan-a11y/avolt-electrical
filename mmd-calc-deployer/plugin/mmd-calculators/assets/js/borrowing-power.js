/* Borrowing Power Estimate — depends on mmd-core.js
   Pillar: home loans / low deposit.
   Lead tag: Calculator - Borrowing Power.
   Simplified, INDICATIVE serviceability only — never a single
   guaranteed figure, always a range. */
(function () {
  "use strict";
  var KEY = "borrowing-power";

  var INPUTS = ["bp_applicants","bp_purpose","bp_income","bp_income2","bp_incometype",
                "bp_dependants","bp_expenses","bp_cardlimits","bp_othercommit",
                "bp_hecs","bp_rental","bp_rate","bp_term","bp_buffer"];

  // sensible defaults (editable by the user)
  var DEFAULTS = { bp_rate: 6.50, bp_term: 30, bp_buffer: 3.0 };

  function num(id, fallback) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    if (raw === "" && fallback !== undefined) return fallback;
    return MMD.parseMoney(raw);
  }

  function round1000(x) {
    x = MMD.finite(x);
    return Math.round(x / 1000) * 1000;
  }

  function compute() {
    var primaryIncome  = num("bp_income");
    var secondIncome   = num("bp_income2");
    var incomeType     = MMD.$("bp_incometype").value;
    var ownerOcc       = MMD.$("bp_purpose").value === "oo";
    var livingExpenses = num("bp_expenses");
    var creditCardLimits = num("bp_cardlimits");
    var otherMonthly   = num("bp_othercommit");
    var hecsMonthly    = num("bp_hecs");
    var rentalMonthly  = num("bp_rental");
    var applicants     = MMD.$("bp_applicants").value;
    var dependants     = MMD.parseMoney(MMD.$("bp_dependants").value);
    var assessmentRate = num("bp_rate", DEFAULTS.bp_rate);
    var term           = num("bp_term", DEFAULTS.bp_term);
    if (term <= 0) term = DEFAULTS.bp_term;
    var buffer         = num("bp_buffer", DEFAULTS.bp_buffer);   // adjustable serviceability buffer
    if (buffer < 0) buffer = 0; if (buffer > 5) buffer = 5;

    // gross income (rental shaded to 80%)
    var grossAnnual = primaryIncome + secondIncome + (rentalMonthly * 12 * 0.80);
    // net income after resident income tax + 2% Medicare levy (indicative)
    var netMonthly = MMD.netAnnualIncome(grossAnnual) / 12;
    // indicative HEM-style minimum monthly living expenses (floor), by household size
    var hemFloor = (applicants === "couple" ? 2400 : 1500) + dependants * 350;
    var effectiveExpenses = Math.max(livingExpenses, hemFloor);
    // commitments (credit card limits assessed at ~3.0%/month)
    var commitments = effectiveExpenses + otherMonthly + hecsMonthly + (creditCardLimits * 0.030);
    var surplus = netMonthly - commitments;

    // APRA-style serviceability buffer added to the assessment rate (user-adjustable)
    var assessRate = assessmentRate + buffer;

    // capacity (annuity present value of the monthly surplus)
    var i = (assessRate / 100) / 12;
    var n = term * 12;
    var maxLoan = 0;
    if (surplus > 0 && n > 0) {
      if (i === 0) {
        maxLoan = surplus * n;
      } else {
        maxLoan = surplus * (1 - Math.pow(1 + i, -n)) / i;
      }
    }
    maxLoan = MMD.finite(maxLoan);

    var low  = round1000(maxLoan * 0.98);
    var high = round1000(maxLoan * 1.15);

    return {
      ownerOcc: ownerOcc, incomeType: incomeType,
      grossAnnual: grossAnnual, netMonthly: netMonthly,
      commitments: commitments, surplus: surplus,
      assessmentRate: assessmentRate, assessRate: assessRate,
      maxLoan: maxLoan, low: low, high: high
    };
  }

  function render() {
    var r = compute();
    var hint = MMD.$("bpr_rangehint");

    if (r.surplus <= 0) {
      MMD.setText("bpr_range", "$0");
      if (hint) hint.textContent =
        "Based on these figures there may be limited additional capacity — let's talk.";
    } else {
      MMD.setText("bpr_range", MMD.fmtCurrency0(r.low) + " – " + MMD.fmtCurrency0(r.high));
      if (hint) hint.textContent =
        "An indicative range only — not a single figure or an approval amount.";
    }

    // monthly surplus (max assessed repayment capacity)
    var surplusShown = r.surplus > 0 ? r.surplus : 0;
    MMD.setText("bpr_surplus", MMD.fmtCurrency(surplusShown));
    MMD.setText("bpr_maxrepay", MMD.fmtCurrency(surplusShown));
    MMD.setText("bpr_assessrate", MMD.fmtPercent(r.assessRate));
    MMD.setText("bpr_purpose", r.ownerOcc ? "Owner-occupied" : "Investment");

    MMD.lead.track(KEY, {
      low: r.low, high: r.high, surplus: surplusShown,
      assessRate: r.assessRate, purpose: r.ownerOcc ? "Owner-occupied" : "Investment"
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
      calcName: "Borrowing Power",
      showComparisonWarning: true,
      assumptions: [
        "A serviceability buffer is added to your interest rate to estimate capacity — default 3.0% and adjustable, in line with APRA-style practice; some lenders apply a smaller buffer.",
        "Living expenses use the higher of the figure you enter or an indicative minimum for your household size; lender-specific HEM tables are not replicated.",
        "Rental income is shaded to 80%; credit card limits are assessed at approximately 3.0% of the limit per month.",
        "Net income is estimated using 2024-25 resident income tax rates plus the 2% Medicare levy; offsets (e.g. LITO), HELP repayments and the Medicare levy surcharge are not applied."
      ],
      warnings: [
        "This is an indicative range only — a specific lender's assessment may be higher or lower, and is always subject to full assessment and policy.",
        "Actual borrowing capacity varies materially between lenders.",
        "Self-employed income assessment varies significantly between lenders and may require additional verification."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Want us to run this properly against lender policy?",
      getContext: function () {
        var r = compute();
        return {
          low: r.low, high: r.high, surplus: r.surplus > 0 ? r.surplus : 0,
          assessRate: r.assessRate, purpose: r.ownerOcc ? "Owner-occupied" : "Investment"
        };
      }
    });

    MMD.bind(INPUTS, render);
    MMD.on("bp_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("bp_reset", "click", reset);
    render();
  });
})();
