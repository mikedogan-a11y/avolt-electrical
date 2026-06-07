/* LMI & LVR Calculator — depends on mmd-core.js
   Pillar: LMI / waived LMI / low deposit.
   Lead tag: Calculator - LMI. */
(function () {
  "use strict";
  var KEY = "lmi-lvr";

  var INPUTS = ["ll_value", "ll_price", "ll_deposit", "ll_loan", "ll_state", "ll_purpose"];

  function num(id) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    return MMD.parseMoney(raw);
  }

  function compute() {
    var value   = num("ll_value");
    var price   = num("ll_price");
    var deposit = num("ll_deposit");
    var loan    = num("ll_loan");
    var state   = MMD.$("ll_state").value;
    var ownerOcc = MMD.$("ll_purpose").value === "oo";

    // base = property value; use price only if value blank/<=0
    var base = value > 0 ? value : price;

    var lvr = MMD.lvr(loan, base);
    var depositPct = base > 0 ? MMD.finite(deposit / base * 100) : 0;
    var lmi = MMD.lmi(loan, base);
    var lmiLow = Math.round(lmi * 0.85);
    var lmiHigh = Math.round(lmi * 1.15);

    return {
      value: value, price: price, base: base, deposit: deposit, loan: loan,
      state: state, ownerOcc: ownerOcc,
      lvr: lvr, depositPct: depositPct, lmi: lmi, lmiLow: lmiLow, lmiHigh: lmiHigh
    };
  }

  function render() {
    var r = compute();

    // hero: LVR
    MMD.setText("llr_lvr", MMD.fmtPercent(r.lvr));
    var meter = MMD.$("llr_lvrmeter");
    if (meter) meter.style.width = Math.max(0, Math.min(100, r.lvr)).toFixed(1) + "%";

    // deposit percentage
    MMD.setText("llr_deppct", MMD.fmtPercent(r.depositPct));

    // whether LMI may apply
    var lmiFlag = MMD.$("llr_lmicard");
    if (lmiFlag) lmiFlag.classList.remove("is-positive", "is-caution");
    if (r.lvr <= 80) {
      MMD.setText("llr_lmiflag", "Unlikely — at or below 80% LVR");
      if (lmiFlag) lmiFlag.classList.add("is-positive");
    } else {
      MMD.setText("llr_lmiflag", "LMI may apply");
      if (lmiFlag && r.lvr > 90) lmiFlag.classList.add("is-caution");
    }

    // estimated LMI range
    if (r.lmi > 0) {
      MMD.setText("llr_lmirange", MMD.fmtCurrency(r.lmiLow) + " – " + MMD.fmtCurrency(r.lmiHigh));
      MMD.setText("llr_lmisub", "Indicative range — varies by lender and insurer");
    } else {
      MMD.setText("llr_lmirange", "$0.00");
      MMD.setText("llr_lmisub", "Nil at or below 80% LVR");
    }

    // summary note card
    var note;
    if (r.base <= 0 || r.loan <= 0) {
      note = "Enter a property value and proposed loan amount to estimate your LVR and any LMI.";
    } else if (r.lvr <= 80) {
      note = "At " + MMD.fmtPercent(r.lvr) + " LVR you are at or below 80%, so LMI is unlikely to apply. " +
             "Keeping your loan at or under 80% of the property value is the most common way to avoid LMI.";
    } else {
      note = "At " + MMD.fmtPercent(r.lvr) + " LVR your loan is above 80% of the property value, so LMI may apply " +
             "(indicatively " + MMD.fmtCurrency(r.lmiLow) + " – " + MMD.fmtCurrency(r.lmiHigh) + "). " +
             "Some borrowers — for example certain professions or guarantor structures — may reduce or avoid LMI. " +
             "Let's look at your options.";
    }
    MMD.setText("llr_note", note);

    var noteCard = MMD.$("llr_notecard");
    if (noteCard) {
      noteCard.classList.remove("is-positive", "is-caution");
      if (r.base > 0 && r.loan > 0) {
        if (r.lvr <= 80) noteCard.classList.add("is-positive");
        else if (r.lvr > 90) noteCard.classList.add("is-caution");
      }
    }

    MMD.lead.track(KEY, { lvr: r.lvr, lmi: r.lmi, depositPct: r.depositPct, state: r.state });
  }

  function reset() {
    INPUTS.forEach(function (id) {
      var e = MMD.$(id); if (!e) return;
      if (e.tagName === "SELECT") e.selectedIndex = 0; else e.value = "";
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    // populate state dropdown
    var sel = MMD.$("ll_state");
    MMD.STATES.forEach(function (s) {
      var o = document.createElement("option"); o.value = s[0]; o.textContent = s[1]; sel.appendChild(o);
    });

    MMD.renderPreviewChrome();
    MMD.renderTopDisclaimer(document.querySelector("[data-mmd-top]"));
    MMD.renderBottomDisclaimers(document.querySelector("[data-mmd-bottom]"), {
      calcName: "LMI & LVR",
      assumptions: [
        "LMI is an indicative estimate that varies by lender, LMI provider, loan size, property type and borrower profile.",
        "Some borrowers (for example certain professions or guarantor structures) may reduce or avoid LMI — to be discussed with MortgageMD."
      ],
      warnings: [
        "LMI is set by the insurer or lender, not this tool.",
        "Eligibility for any LMI waiver or reduction is subject to lender policy."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Could you reduce or avoid LMI? Let's look at your options.",
      getContext: function () { var r = compute(); return { lvr: r.lvr, lmi: r.lmi, state: r.state }; }
    });

    MMD.bind(INPUTS, render);
    MMD.on("ll_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("ll_reset", "click", reset);
    render();
  });
})();
