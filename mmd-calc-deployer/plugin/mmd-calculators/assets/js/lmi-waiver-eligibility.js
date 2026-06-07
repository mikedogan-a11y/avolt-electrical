/* LMI Waiver Eligibility Checker — depends on mmd-core.js
   Pillar: doctor / lawyer / accountant / engineer home loans (waived LMI).
   DISCUSSION GUIDE ONLY. Lead tag: Calculator - LMI Waiver.

   COMPLIANCE CRITICAL: never assert the person IS eligible, never name a
   guaranteed lender outcome, never mention specific postcodes. Always frame
   as "may" / "could" / "depending on lender policy". */
(function () {
  "use strict";
  var KEY = "lmi-waiver";

  var INPUTS = ["lw_profession","lw_member","lw_income","lw_purpose",
                "lw_price","lw_deposit","lw_loan"];

  // Recognised professions = everything listed EXCEPT "Other".
  var PROFESSIONS = {
    medical:     "Medical practitioner",
    dentist:     "Dentist",
    vet:         "Veterinarian",
    optometrist: "Optometrist",
    pharmacist:  "Pharmacist",
    lawyer:      "Lawyer",
    accountant:  "Accountant",
    engineer:    "Engineer",
    other:       "Other"
  };

  var INCOME_LABELS = {
    u100:     "Under $100k",
    "100to150": "$100k–$150k",
    "150to200": "$150k–$200k",
    "200plus":  "$200k+"
  };
  // Income bands at or above $150k.
  var INCOME_150_PLUS = { "150to200": true, "200plus": true };

  function num(id) {
    return MMD.parseMoney(MMD.$(id) && MMD.$(id).value || "");
  }

  function compute() {
    var profKey = MMD.$("lw_profession").value;
    var member  = MMD.$("lw_member").value === "yes";
    var income  = MMD.$("lw_income").value;
    var price   = num("lw_price");
    var loan    = num("lw_loan");

    var lvr = MMD.lvr(loan, price); // guarded in core (returns 0 if price <= 0)

    var professionEligible = (profKey !== "other");
    var income150plus = !!INCOME_150_PLUS[income];
    var hasInputs = price > 0 && loan > 0;

    var bandClass, bandText;
    if (!hasInputs) {
      // Neutral default until enough is entered — do not imply eligibility on blank inputs.
      bandClass = "is-talk";
      bandText  = "Enter your price, loan and details to explore possible waiver pathways";
    } else if (professionEligible && member && income150plus && lvr <= 90) {
      bandClass = "is-strong";
      bandText  = "An LMI waiver may be worth discussing";
    } else if (professionEligible && lvr <= 95) {
      bandClass = "is-talk";
      bandText  = "You may have options worth discussing";
    } else {
      bandClass = "is-review";
      bandText  = "Standard LMI may apply — still worth a conversation";
    }

    return {
      profKey: profKey,
      profLabel: PROFESSIONS[profKey] || "—",
      income: income,
      incomeLabel: INCOME_LABELS[income] || "—",
      lvr: lvr,
      hasInputs: hasInputs,
      bandClass: bandClass,
      bandText: bandText
    };
  }

  function render() {
    var r = compute();

    var band = MMD.$("lwr_band");
    if (band) {
      band.className = "mmd-band " + r.bandClass;
      band.textContent = r.bandText;
    }
    // Keep the "you may be eligible" discussion paragraph hidden until details are entered.
    var para = MMD.$("lwr_para");
    if (para) para.style.display = r.hasInputs ? "" : "none";

    MMD.setText("lwr_lvr", MMD.fmtPercent(r.lvr));
    var meter = MMD.$("lwr_lvrmeter");
    if (meter) meter.style.width = Math.max(0, Math.min(100, MMD.finite(r.lvr))).toFixed(1) + "%";

    MMD.setText("lwr_prof", r.profLabel);
    MMD.setText("lwr_income", r.incomeLabel);

    MMD.lead.track(KEY, { profession: r.profLabel, income: r.incomeLabel, lvr: r.lvr });
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
      calcName: "LMI Waiver Eligibility",
      showComparisonWarning: false,
      assumptions: [
        "Waiver eligibility, the maximum LVR and the lenders and professions offering an LMI waiver change frequently and are confirmed case-by-case.",
        "This tool does not check any specific lender policy, postcode or security (property type) restriction.",
        "Your inputs describe your situation in general terms only and do not capture your full circumstances."
      ],
      warnings: [
        "This is NOT confirmation of eligibility or any lender outcome.",
        "An LMI waiver is always subject to lender approval and the lender's policy at the time."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Book a chat to discuss whether an LMI waiver could apply to you.",
      getContext: function () {
        var r = compute();
        return { profession: r.profLabel, income: r.incomeLabel, lvr: r.lvr };
      }
    });

    MMD.bind(INPUTS, render);
    MMD.on("lw_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("lw_reset", "click", reset);
    render();
  });
})();
