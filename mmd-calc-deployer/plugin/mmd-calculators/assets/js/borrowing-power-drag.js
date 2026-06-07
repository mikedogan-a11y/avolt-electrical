/* What's Reducing Your Borrowing Power — depends on mmd-core.js
   Pillar: general / low deposit / professional.
   Output: a GENERAL impact indication + ranked contributors — NOT an exact capacity figure.
   Lead tag: Calculator - Borrowing Power Drag. */
(function () {
  "use strict";
  var KEY = "borrowing-power-drag";

  var INPUTS = ["bd_cardlimits","bd_facilities","bd_carpersonal","bd_hecs",
                "bd_other","bd_dependants"];

  // Indicative assessment factors (document as approximations only).
  var CARD_ASSESS_RATE = 0.038;   // ~3.8%/month of card + facility LIMITS assessed
  var DEPENDANT_LOADING = 500;    // indicative monthly living-cost loading per dependant (HEM-style)
  var ASSESS_RATE_ANNUAL = 9.5;   // indicative assessment rate used to capitalise the monthly impact

  function num(id) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    return MMD.parseMoney(raw);
  }

  function compute() {
    var cardLimits     = num("bd_cardlimits");
    var facilities     = num("bd_facilities");
    var carPersonal    = num("bd_carpersonal");
    var hecsMonthly    = num("bd_hecs");
    var otherRepay     = num("bd_other");
    var dependants     = MMD.parseMoney(MMD.$("bd_dependants") ? MMD.$("bd_dependants").value : 0);

    var cardDrag      = (cardLimits + facilities) * CARD_ASSESS_RATE;
    var loanDrag      = carPersonal + otherRepay + hecsMonthly;
    var dependantDrag = dependants * DEPENDANT_LOADING;
    var totalMonthlyDrag = MMD.finite(cardDrag + loanDrag + dependantDrag);

    // Capitalise the monthly amount at an indicative assessment rate over a 30yr term.
    var i = (ASSESS_RATE_ANNUAL / 100) / 12;
    var n = 30 * 12;
    var capacity = 0;
    if (i > 0) capacity = totalMonthlyDrag * (1 - Math.pow(1 + i, -n)) / i;
    else capacity = totalMonthlyDrag * n; // guard: never divide by zero
    capacity = MMD.finite(capacity);

    var low  = Math.round(capacity * 0.9 / 1000) * 1000;
    var high = Math.round(capacity * 1.1 / 1000) * 1000;

    var contributors = [
      { key: "card", amount: MMD.finite(cardDrag),
        label: "Credit card & facility limits — assessed on the limit, not the balance; reducing limits may help" },
      { key: "loan", amount: MMD.finite(loanDrag),
        label: "Existing loan & HECS repayments — ongoing monthly commitments reduce assessed surplus" },
      { key: "dependant", amount: MMD.finite(dependantDrag),
        label: "Dependants — lenders apply higher living-cost benchmarks as dependant numbers rise" }
    ];
    // Rank largest to smallest by indicative monthly contribution.
    contributors.sort(function (a, b) { return b.amount - a.amount; });

    return {
      cardDrag: MMD.finite(cardDrag), loanDrag: MMD.finite(loanDrag),
      dependantDrag: MMD.finite(dependantDrag), totalMonthlyDrag: totalMonthlyDrag,
      low: low, high: high, contributors: contributors
    };
  }

  function render() {
    var r = compute();
    MMD.setText("bdr_range", MMD.fmtCurrency0(r.low) + " – " + MMD.fmtCurrency0(r.high));
    MMD.setText("bdr_monthly", MMD.fmtCurrency(r.totalMonthlyDrag) + " / month");

    var list = MMD.$("bdr_ranked");
    if (list) {
      list.innerHTML = "";
      r.contributors.forEach(function (c, idx) {
        var li = document.createElement("li");
        var dot = document.createElement("span");
        // Biggest contributor gets a caution (warn) dot; the rest are informational.
        dot.className = "dot " + (idx === 0 ? "warn" : "info");
        var txt = document.createElement("span");
        txt.textContent = c.label + " (" + MMD.fmtCurrency(c.amount) + "/mo)";
        li.appendChild(dot);
        li.appendChild(txt);
        list.appendChild(li);
      });
    }
    MMD.lead.track(KEY, { low: r.low, high: r.high, monthlyDrag: r.totalMonthlyDrag });
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
      calcName: "What's Reducing Your Borrowing Power",
      showComparisonWarning: false,
      assumptions: [
        "This is a general indication only and is not an exact borrowing-capacity figure.",
        "It capitalises the indicative monthly impact at an indicative assessment rate of " +
          MMD.fmtPercent(ASSESS_RATE_ANNUAL, 1) + " p.a. over a 30-year term — actual lender assessment rates differ.",
        "Lenders assess credit card and facility limits on the LIMIT, not the balance you owe.",
        "Dependant and living-cost benchmarks vary by lender and are applied here as an indicative loading only."
      ],
      warnings: [
        "Actual borrowing power varies materially between lenders.",
        "Reducing or closing limits and facilities may improve your position, depending on lender policy."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Want us to show how restructuring could improve your position?",
      getContext: function () { var r = compute(); return { low: r.low, high: r.high, monthlyDrag: r.totalMonthlyDrag }; }
    });

    MMD.bind(INPUTS, render);
    MMD.on("bd_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("bd_reset", "click", reset);
    render();
  });
})();
