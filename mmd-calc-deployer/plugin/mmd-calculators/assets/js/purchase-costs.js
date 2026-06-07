/* Purchase Costs Calculator — depends on mmd-core.js
   Pillar: low deposit / first home buyer / guarantor.
   Lead tag: Calculator - Purchase Costs. */
(function () {
  "use strict";
  var KEY = "purchase-costs";

  var INPUTS = ["pc_price","pc_state","pc_purpose","pc_fhb","pc_proptype","pc_foreign","pc_deposit","pc_loan",
                "pc_conveyancing","pc_lenderfees","pc_other"];
  // default upfront cost assumptions (editable by the user)
  var DEFAULTS = { pc_conveyancing: 1800, pc_lenderfees: 600, pc_other: 0 };

  function num(id, fallback) {
    var raw = (MMD.$(id) && MMD.$(id).value || "").trim();
    if (raw === "" && fallback !== undefined) return fallback;
    return MMD.parseMoney(raw);
  }

  function compute() {
    var price   = num("pc_price");
    var state   = MMD.$("pc_state").value;
    var ownerOcc = MMD.$("pc_purpose").value === "oo";
    var fhb     = MMD.$("pc_fhb").value === "yes";
    var isNew   = MMD.$("pc_proptype").value === "new";
    var isForeign = MMD.$("pc_foreign").value === "yes";
    var deposit = num("pc_deposit");
    var loan    = num("pc_loan");
    var conveyancing = num("pc_conveyancing", DEFAULTS.pc_conveyancing);
    var lenderFees   = num("pc_lenderfees", DEFAULTS.pc_lenderfees);
    var other        = num("pc_other", DEFAULTS.pc_other);

    var stamp = MMD.stampDuty(state, price, { ownerOccupier: ownerOcc, firstHomeBuyer: fhb, newBuild: isNew, foreign: isForeign });
    var gov   = MMD.govFees(state);
    var lmi   = MMD.lmi(loan, price);

    var upfront = stamp + gov.total + lmi + conveyancing + lenderFees + other;
    var totalPurchaseCosts = price + upfront;
    var fundsRequired = totalPurchaseCosts - loan;
    var lvr = MMD.lvr(loan, price);
    var surplus = deposit - fundsRequired;

    return {
      price: price, state: state, stamp: stamp, gov: gov, lmi: lmi,
      upfront: upfront, totalPurchaseCosts: totalPurchaseCosts,
      fundsRequired: fundsRequired, lvr: lvr, surplus: surplus
    };
  }

  function render() {
    var r = compute();
    MMD.setText("pcr_funds", MMD.fmtCurrency(r.fundsRequired));
    MMD.setText("pcr_total", MMD.fmtCurrency(r.totalPurchaseCosts));
    MMD.setText("pcr_stamp", MMD.fmtCurrency(r.stamp));
    MMD.setText("pcr_gov", MMD.fmtCurrency(r.gov.total));
    MMD.setText("pcr_govsub", "Transfer " + MMD.fmtCurrency(r.gov.transfer) + " + registration " + MMD.fmtCurrency(r.gov.registration));
    MMD.setText("pcr_lmi", MMD.fmtCurrency(r.lmi));
    MMD.setText("pcr_lmisub", r.lmi > 0 ? "May apply above 80% LVR" : "Nil at or below 80% LVR");
    MMD.setText("pcr_lvr", MMD.fmtPercent(r.lvr));
    var meter = MMD.$("pcr_lvrmeter");
    if (meter) meter.style.width = Math.max(0, Math.min(100, r.lvr)).toFixed(1) + "%";

    var card = MMD.$("pcr_surcard");
    card.classList.remove("is-positive", "is-caution");
    if (r.surplus >= 0) {
      MMD.setText("pcr_surlabel", "Estimated surplus vs your savings");
      MMD.setText("pcr_sur", MMD.fmtCurrency(r.surplus));
      card.classList.add("is-positive");
    } else {
      MMD.setText("pcr_surlabel", "Estimated shortfall vs your savings");
      MMD.setText("pcr_sur", MMD.fmtCurrency(Math.abs(r.surplus)));
      card.classList.add("is-caution");
    }
    MMD.lead.track(KEY, { fundsRequired: r.fundsRequired, lvr: r.lvr, state: r.state });
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
    var sel = MMD.$("pc_state");
    MMD.STATES.forEach(function (s) {
      var o = document.createElement("option"); o.value = s[0]; o.textContent = s[1]; sel.appendChild(o);
    });

    MMD.renderPreviewChrome();
    MMD.renderTopDisclaimer(document.querySelector("[data-mmd-top]"));
    MMD.renderBottomDisclaimers(document.querySelector("[data-mmd-bottom]"), {
      calcName: "Purchase Costs",
      assumptions: [
        "Stamp duty, first-home-buyer concessions and government fees are indicative and based on the selected state only — concessions, surcharges and scheme rules vary and change.",
        "Conveyancing, lender fees and other costs default to typical estimates and should be replaced with your actual quotes.",
        "LMI is estimated only and varies by lender, loan size, property type and borrower profile."
      ],
      warnings: [
        "Stamp duty and government charges should be confirmed with the relevant state revenue office.",
        "Lenders Mortgage Insurance may apply depending on the lender and your circumstances."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Want us to confirm your real funds-to-complete against lender policy?",
      getContext: function () { var r = compute(); return { fundsRequired: r.fundsRequired, state: r.state, lvr: r.lvr }; }
    });

    MMD.bind(INPUTS, render);
    MMD.on("pc_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("pc_reset", "click", reset);
    render();
  });
})();
