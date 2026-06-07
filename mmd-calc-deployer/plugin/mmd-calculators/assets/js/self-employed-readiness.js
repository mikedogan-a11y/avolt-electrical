/* Self-Employed Home Loan Readiness Check — depends on mmd-core.js
   Pillar: self-employed / accountant / professional.
   Lead tag: Calculator - Self Employed.
   NO dollar output. Output = a readiness RATING + checklist.

   SCORING (max 11):
     ABN:           2+ years +3 | 1–2 years +1 | under 1 +0
     Tax returns:   2 years +3  | 1 year +1    | none +0
     BAS available  +1
     Accountant letter available +1
     GST registered +1
     Structure:     company/trust +1 (sole trader / partnership +0)
     ATO:           None +1 | payment plan +0 | overdue −1
     Add-backs (depreciation / interest / one-off): informational only, NOT scored.
   BANDS by score:
     >=8 -> is-strong "Strong documentation position"
     5–7 -> is-talk   "Likely a full-doc pathway to discuss"
     3–4 -> is-review "Further review required"
     <3  -> is-review "Possible low-doc pathway to discuss / accountant documents likely required"
*/
(function () {
  "use strict";
  var KEY = "self-employed";
  var MAX_SCORE = 11;

  var SELECTS = ["se_abn","se_gst","se_structure","se_returns","se_bas","se_acct","se_ato"];
  var CHECKS  = ["se_dep","se_int","se_oneoff"];
  var INPUTS  = SELECTS.concat(CHECKS);

  function val(id) { var e = MMD.$(id); return e ? e.value : ""; }
  function checked(id) { var e = MMD.$(id); return !!(e && e.checked); }

  function compute() {
    var abn = val("se_abn");
    var gst = val("se_gst");
    var structure = val("se_structure");
    var returns = val("se_returns");
    var bas = val("se_bas") === "yes";
    var acct = val("se_acct") === "yes";
    var ato = val("se_ato");

    var items = [];   // checklist rows: { type: "ok"|"warn"|"info", label }
    var score = 0;

    // ABN age
    if (abn === "2plus") { score += 3; items.push({ type:"ok", label:"ABN held 2+ years — strong for self-employed documentation" }); }
    else if (abn === "1to2") { score += 1; items.push({ type:"warn", label:"ABN held 1–2 years — may limit some lender options" }); }
    else { items.push({ type:"warn", label:"ABN under 1 year — many lenders prefer a longer trading history" }); }

    // Tax returns
    if (returns === "2") { score += 3; items.push({ type:"ok", label:"2 years of tax returns available — strong" }); }
    else if (returns === "1") { score += 1; items.push({ type:"warn", label:"1 year of tax returns available — a second year may be needed for some lenders" }); }
    else { items.push({ type:"warn", label:"No tax returns provided yet — these are usually central to a full-doc review" }); }

    // BAS
    if (bas) { score += 1; items.push({ type:"ok", label:"BAS available — helpful supporting evidence" }); }
    else { items.push({ type:"warn", label:"BAS not provided — may be needed" }); }

    // Accountant letter
    if (acct) { score += 1; items.push({ type:"ok", label:"Accountant letter available — can support some lender pathways" }); }
    else { items.push({ type:"warn", label:"Accountant letter not provided — may be requested" }); }

    // GST
    if (gst === "yes") { score += 1; items.push({ type:"ok", label:"GST registered — consistent with established trading" }); }
    else if (gst === "no") { items.push({ type:"warn", label:"Not GST registered — confirm whether this fits the lenders being considered" }); }
    else { items.push({ type:"info", label:"GST not applicable — noted for context" }); }

    // Structure
    if (structure === "company" || structure === "trust") {
      score += 1;
      items.push({ type:"ok", label:(structure === "company" ? "Company" : "Trust") + " structure noted — financials may broaden options" });
    } else {
      items.push({ type:"info", label:(structure === "partnership" ? "Partnership" : "Sole trader") + " structure noted — for context only" });
    }

    // ATO
    if (ato === "none") { score += 1; items.push({ type:"ok", label:"No ATO debt or payment plan — a positive sign" }); }
    else if (ato === "plan") { items.push({ type:"warn", label:"ATO payment plan noted — lenders will want to understand it" }); }
    else { score -= 1; items.push({ type:"warn", label:"Overdue ATO debt noted — likely to need attention before applying" }); }

    if (score < 0) score = 0;

    // Add-backs — informational only, not scored
    if (checked("se_dep")) items.push({ type:"info", label:"Depreciation add-back noted — confirm with your accountant" });
    if (checked("se_int")) items.push({ type:"info", label:"Interest add-back noted — confirm with your accountant" });
    if (checked("se_oneoff")) items.push({ type:"info", label:"One-off expenses add-back noted — confirm with your accountant" });

    // Band logic
    var band, bandClass, summary;
    if (score >= 8) {
      bandClass = "is-strong"; band = "Strong documentation position";
      summary = "Your documentation looks well-prepared for a self-employed home loan conversation. A strong position does not guarantee approval — the lender still assesses your income and circumstances.";
    } else if (score >= 5) {
      bandClass = "is-talk"; band = "Likely a full-doc pathway to discuss";
      summary = "There may be a full-documentation pathway worth discussing. A short conversation can confirm which documents would strengthen your position.";
    } else if (score >= 3) {
      bandClass = "is-review"; band = "Further review required";
      summary = "Some key documents appear to be missing or limited. A review can help identify what to gather before applying.";
    } else {
      bandClass = "is-review"; band = "Possible low-doc pathway to discuss / accountant documents likely required";
      summary = "A low-documentation pathway may need to be explored, and accountant-prepared documents are likely to be required. A low score does not mean you cannot borrow.";
    }

    return { score: score, band: band, bandClass: bandClass, summary: summary, items: items };
  }

  function render() {
    var r = compute();

    var bandEl = MMD.$("ser_band");
    if (bandEl) {
      bandEl.className = "mmd-band " + r.bandClass;
      bandEl.textContent = r.band;
    }
    MMD.setText("ser_summary", r.summary);

    var list = MMD.$("ser_checklist");
    if (list) {
      list.innerHTML = "";
      r.items.forEach(function (it) {
        var li = document.createElement("li");
        var dot = document.createElement("span");
        dot.className = "dot " + it.type;
        var txt = document.createElement("span");
        txt.textContent = it.label;
        li.appendChild(dot);
        li.appendChild(txt);
        list.appendChild(li);
      });
    }

    MMD.lead.track(KEY, { score: r.score, maxScore: MAX_SCORE, band: r.band });
  }

  function reset() {
    SELECTS.forEach(function (id) { var e = MMD.$(id); if (e) e.selectedIndex = 0; });
    CHECKS.forEach(function (id) { var e = MMD.$(id); if (e) e.checked = false; });
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    MMD.renderPreviewChrome();
    MMD.renderTopDisclaimer(document.querySelector("[data-mmd-top]"));
    MMD.renderBottomDisclaimers(document.querySelector("[data-mmd-bottom]"), {
      calcName: "Self-Employed Readiness Check",
      showComparisonWarning: false,
      assumptions: [
        "This is a general readiness indication only and does not assess income amount, serviceability or eligibility.",
        "Lender treatment of self-employed income varies widely and changes over time.",
        "Add-backs depend on lender policy and your accountant's figures, and are noted for discussion only."
      ],
      warnings: [
        "A low score does not mean you cannot borrow, and a strong score does not guarantee approval.",
        "Income usability is determined by the lender based on its policy and your full circumstances."
      ]
    });
    MMD.renderLeadCapture(document.querySelector("[data-mmd-lead]"), {
      calcKey: KEY,
      ctaText: "Book a review so MortgageMD can assess which of your income may be usable.",
      getContext: function () { var r = compute(); return { score: r.score, maxScore: MAX_SCORE, band: r.band }; }
    });

    MMD.bind(INPUTS, render);
    MMD.on("se_form", "submit", function (e) { e.preventDefault(); render(); });
    MMD.on("se_reset", "click", reset);
    render();
  });
})();
