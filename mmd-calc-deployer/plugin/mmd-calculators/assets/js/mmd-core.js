/* =========================================================
   MortgageMD Calculators — shared core (mmd-core.js)
   ---------------------------------------------------------
   ONE place for: number formatting, the stamp-duty + LMI rate
   engines, ALL compliance/disclaimer wording, the comparison-rate
   warning, and the lead-capture data layer.

   Every calculator depends on this file. Do NOT hand-write
   disclaimers inside individual calculators — call
   MMD.renderTopDisclaimer() / MMD.renderBottomDisclaimers() so the
   approved wording stays identical everywhere.

   ⚠️ MAINTENANCE: the rate tables in MMD.rates are INDICATIVE
   approximations (broadly 2024–25) and MUST be reviewed on the
   schedule in MAINTENANCE.md before and during production use.
   They are not authoritative and do not cover every concession,
   surcharge, scheme or lender.

   Compliance wording in MMD.DISCLAIMERS must be signed off by
   Cheyenne / AICS before launch (see COMPLIANCE.md).
   ========================================================= */
(function (global) {
  "use strict";

  var MMD = {};

  /* ----------------------------------------------------------
     1. FORMATTING
     ---------------------------------------------------------- */
  MMD.parseMoney = function (value) {
    if (value === null || value === undefined) return 0;
    var cleaned = String(value).replace(/[$,\s%]/g, "");
    if (cleaned === "") return 0;
    var n = parseFloat(cleaned);
    return (isFinite(n) && !isNaN(n)) ? n : 0;
  };
  MMD.finite = function (n) { return (isFinite(n) && !isNaN(n)) ? n : 0; };

  MMD.fmtCurrency = function (n, decimals) {
    n = MMD.finite(n);
    if (decimals === undefined) decimals = 2;
    var sign = n < 0 ? "-" : "";
    var p = Math.abs(n).toFixed(decimals).split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + p[0] + (p[1] ? "." + p[1] : "");
  };
  MMD.fmtCurrency0 = function (n) { return MMD.fmtCurrency(n, 0); };
  MMD.fmtPercent = function (n, decimals) {
    n = MMD.finite(n);
    return n.toFixed(decimals === undefined ? 2 : decimals) + "%";
  };
  MMD.fmtNumber = function (n, decimals) {
    n = MMD.finite(n);
    var p = n.toFixed(decimals === undefined ? 0 : decimals).split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p[1] ? p[0] + "." + p[1] : p[0];
  };

  /* small DOM helpers */
  MMD.$ = function (id) { return document.getElementById(id); };
  MMD.setText = function (id, text) { var e = MMD.$(id); if (e) e.textContent = text; };
  MMD.on = function (id, evt, cb) { var e = MMD.$(id); if (e) e.addEventListener(evt, cb); };
  // Live thousands-separator formatting for $-prefixed money inputs (e.g. 700000 -> 700,000).
  function fmtMoneyTyped(v) {
    var cleaned = String(v).replace(/[^0-9.]/g, "");
    var dot = cleaned.indexOf("."), hasDot = dot >= 0, intRaw, decRaw = "";
    if (hasDot) { intRaw = cleaned.slice(0, dot); decRaw = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2); }
    else { intRaw = cleaned; }
    intRaw = intRaw.replace(/^0+(?=\d)/, "");
    var intFmt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (intFmt === "") intFmt = hasDot ? "0" : "";
    return intFmt + (hasDot ? "." + decRaw : "");
  }
  function attachMoneyFormat(el) {
    el.addEventListener("input", function () {
      var caret = el.selectionStart;
      var digitsLeft = String(el.value).slice(0, caret).replace(/[^0-9]/g, "").length;
      var formatted = fmtMoneyTyped(el.value);
      if (formatted === el.value) return;
      el.value = formatted;
      var pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsLeft) {
        var c = formatted.charCodeAt(pos); if (c >= 48 && c <= 57) seen++; pos++;
      }
      try { el.setSelectionRange(pos, pos); } catch (e) {}
    });
  }
  function isMoneyInput(el) {
    if (!el.closest) return false;
    var wrap = el.closest(".mmd-input"); if (!wrap) return false;
    var pre = wrap.querySelector(".mmd-input__prefix");
    return !!(pre && pre.textContent.trim() === "$");
  }

  MMD.bind = function (ids, cb) {
    ids.forEach(function (id) {
      var e = MMD.$(id);
      if (!e) return;
      if (isMoneyInput(e)) attachMoneyFormat(e); // auto comma-format $ fields
      var evt = (e.tagName === "SELECT" || e.type === "checkbox" || e.type === "radio") ? "change" : "input";
      e.addEventListener(evt, cb);
      e.addEventListener("change", cb);
    });
  };

  /* ----------------------------------------------------------
     2. RATE ENGINES  (indicative — see header + MAINTENANCE.md)
     ---------------------------------------------------------- */
  // Transfer-duty scales: [lowerThreshold, baseDuty, ratePer$100AboveThreshold]
  var DUTY_SCALES = {
    NSW: [[0,0,1.25],[18000,225,1.50],[37000,510,1.75],[99000,1595,3.50],
          [372000,11152,4.50],[1243000,50345,5.50],[3721000,186635,7.00]], // FY2025-26 indexed
    QLD: [[0,0,0],[5000,0,1.50],[75000,1050,3.50],[540000,17325,4.50],[1000000,38025,5.75]],
    SA:  [[0,0,1.00],[12000,120,2.00],[30000,480,3.00],[50000,1080,3.50],[100000,2830,4.00],
          [200000,6830,4.25],[250000,8955,4.75],[300000,11330,5.00],[500000,21330,5.50]],
    WA:  [[0,0,1.90],[120000,2280,2.85],[150000,3135,3.80],[360000,11115,4.75],[725000,28453,5.15]],
    TAS: [[0,50,0],[3000,50,1.75],[25000,435,2.25],[75000,1560,3.50],[200000,5935,4.00],
          [375000,12935,4.25],[725000,27810,4.50]],
    ACT: [[0,20,0.49],[200000,980,2.20],[300000,3180,3.40],[500000,9980,4.32],
          [750000,20780,5.90],[1000000,35530,6.40]]
  };
  // QLD home concession scale — owner-occupiers (concessional rate on first $350k).
  var QLD_HOME = [[0,0,1.00],[350000,3500,3.50],[540000,10150,4.50],[1000000,30850,5.75]];
  function dutyFromScale(scale, price) {
    var b = scale[0];
    for (var i = 0; i < scale.length; i++) { if (price >= scale[i][0]) b = scale[i]; else break; }
    return b[1] + (price - b[0]) * b[2] / 100;
  }
  function dutyVIC(price) {
    if (price <= 25000) return price * 0.014;
    if (price <= 130000) return 350 + (price - 25000) * 0.024;
    if (price <= 960000) return 2870 + (price - 130000) * 0.06;
    if (price <= 2000000) return price * 0.055;
    return 110000 + (price - 2000000) * 0.065;
  }
  function dutyNT(price) {
    if (price <= 525000) { var v = price / 1000; return (0.06571441 * v * v) + 15 * v; }
    return price * 0.0495;
  }
  function baseStampDuty(state, price, ownerOcc) {
    if (price <= 0) return 0;
    if (state === "VIC") return dutyVIC(price);
    if (state === "NT")  return dutyNT(price);
    if (state === "QLD" && ownerOcc) return dutyFromScale(QLD_HOME, price); // QLD home concession
    var scale = DUTY_SCALES[state];
    return scale ? dutyFromScale(scale, price) : 0;
  }
  // First-home-buyer concession thresholds (owner-occupiers): [fullExemptUpTo, concessionUpTo]
  var FHB = {
    NSW:[800000,1000000], VIC:[600000,750000], QLD:[700000,800000], WA:[430000,530000],
    SA:[650000,650000], TAS:[600000,750000], ACT:[1000000,1000000], NT:[0,0]
  };
  function applyFHB(duty, state, price, isFHB, isOwnerOcc) {
    if (!isFHB || !isOwnerOcc) return duty;
    var band = FHB[state]; if (!band) return duty;
    var full = band[0], ceil = band[1];
    if (price <= full) return 0;
    if (ceil > full && price < ceil) return duty * (price - full) / (ceil - full);
    return duty;
  }
  var FOREIGN_SURCHARGE = { NSW:0.09, VIC:0.08, QLD:0.08, SA:0.07, WA:0.07, TAS:0.08, ACT:0, NT:0 };

  // Mortgage registration + transfer fees (indicative flat fees per state)
  var GOV_FEES = {
    NSW:{transfer:171.70,registration:171.70}, VIC:{transfer:121.10,registration:121.10},
    QLD:{transfer:0,registration:233.00}, SA:{transfer:0,registration:191.00},
    WA:{transfer:0,registration:222.10}, TAS:{transfer:251.61,registration:160.93},
    ACT:{transfer:0,registration:170.00}, NT:{transfer:165.00,registration:165.00}
  };

  MMD.stampDuty = function (state, price, opts) {
    opts = opts || {};
    var isOwnerOcc = opts.ownerOccupier !== false; // default owner-occupier
    var isNew = !!opts.newBuild;
    var duty = baseStampDuty(state, price, isOwnerOcc);
    if (state === "SA") {
      // SA first-home relief applies to NEW homes only (no value cap);
      // first-home buyers of ESTABLISHED homes pay full duty.
      if (opts.firstHomeBuyer && isOwnerOcc && isNew) duty = 0;
    } else if (state === "QLD" && opts.firstHomeBuyer && isOwnerOcc && isNew) {
      duty = 0; // QLD first home (new home) concession — no value cap
    } else {
      duty = applyFHB(duty, state, price, !!opts.firstHomeBuyer, isOwnerOcc);
    }
    if (opts.foreign) duty += price * (FOREIGN_SURCHARGE[state] || 0);
    return Math.max(0, Math.round(duty));
  };
  MMD.govFees = function (state) {
    var f = GOV_FEES[state] || { transfer:0, registration:0 };
    return { transfer: f.transfer, registration: f.registration, total: f.transfer + f.registration };
  };

  // LMI: indicative premium as % of loan, by LVR band AND loan-size band.
  // Premium rises with both LVR and loan amount. Nil at/below 80% LVR.
  // Columns = loan-amount upper bounds; rows = LVR upper bounds. INDICATIVE only.
  var LMI_LOAN_BANDS = [300000, 500000, 600000, 750000, 1000000, Infinity];
  var LMI_MATRIX = [
    [81,  [0.48, 0.57, 0.65, 0.69, 0.80, 0.90]],
    [82,  [0.57, 0.69, 0.78, 0.86, 0.97, 1.05]],
    [84,  [0.72, 0.82, 0.91, 1.02, 1.12, 1.23]],
    [85,  [0.80, 0.97, 1.06, 1.16, 1.30, 1.45]],
    [86,  [0.97, 1.12, 1.23, 1.36, 1.53, 1.70]],
    [88,  [1.23, 1.40, 1.53, 1.69, 1.90, 2.10]],
    [90,  [1.53, 1.79, 2.06, 2.31, 2.62, 2.90]],
    [91,  [2.00, 2.40, 2.70, 3.00, 3.30, 3.60]],
    [92,  [2.20, 2.60, 2.90, 3.30, 3.70, 4.00]],
    [94,  [2.80, 3.30, 3.70, 4.10, 4.55, 4.90]],
    [95,  [3.10, 3.70, 4.20, 4.70, 5.10, 5.50]],
    [200, [3.50, 4.10, 4.60, 5.10, 5.60, 6.00]]
  ];
  function lmiRate(lvr, loan) {
    if (lvr <= 80) return 0;
    var col = LMI_LOAN_BANDS.length - 1;
    for (var c = 0; c < LMI_LOAN_BANDS.length; c++) { if (loan <= LMI_LOAN_BANDS[c]) { col = c; break; } }
    for (var r = 0; r < LMI_MATRIX.length; r++) { if (lvr <= LMI_MATRIX[r][0]) return LMI_MATRIX[r][1][col]; }
    return 6.0;
  }
  MMD.lvr = function (loan, value) {
    if (!value || value <= 0) return 0;
    return MMD.finite(loan / value * 100);
  };
  MMD.lmi = function (loan, value) {
    if (value <= 0 || loan <= 0) return 0;
    var lvr = loan / value * 100;
    if (lvr <= 80) return 0;
    return Math.max(0, Math.round(loan * lmiRate(lvr, loan) / 100));
  };

  // Standard amortised repayment (per period). rateAnnualPct, years, periodsPerYear.
  MMD.repayment = function (principal, rateAnnualPct, years, periodsPerYear, interestOnly) {
    principal = MMD.finite(principal); periodsPerYear = periodsPerYear || 12;
    var n = Math.round(years * periodsPerYear);
    var i = (rateAnnualPct / 100) / periodsPerYear;
    if (n <= 0) return 0;
    if (interestOnly) return MMD.finite(principal * i);
    if (i === 0) return MMD.finite(principal / n);
    return MMD.finite(principal * i / (1 - Math.pow(1 + i, -n)));
  };

  // Australian resident income tax (2024-25 brackets) + 2% Medicare levy.
  // Indicative only — ignores offsets (LITO), Medicare reductions/surcharge, HELP, etc.
  MMD.incomeTaxAnnual = function (g) {
    g = MMD.finite(g); if (g <= 0) return 0;
    var t;
    if (g > 190000) t = 51638 + (g - 190000) * 0.45;
    else if (g > 135000) t = 31288 + (g - 135000) * 0.37;
    else if (g > 45000) t = 4288 + (g - 45000) * 0.30;
    else if (g > 18200) t = (g - 18200) * 0.16;
    else t = 0;
    var medicare = g > 26000 ? g * 0.02 : 0; // simplified low-income threshold
    return t + medicare;
  };
  MMD.netAnnualIncome = function (g) { return Math.max(0, MMD.finite(g) - MMD.incomeTaxAnnual(g)); };

  MMD.rates = {
    DUTY_SCALES: DUTY_SCALES, QLD_HOME: QLD_HOME, dutyVIC: dutyVIC, dutyNT: dutyNT,
    FHB: FHB, FOREIGN_SURCHARGE: FOREIGN_SURCHARGE, GOV_FEES: GOV_FEES,
    lmiRate: lmiRate, LMI_MATRIX: LMI_MATRIX, LMI_LOAN_BANDS: LMI_LOAN_BANDS,
    lastReviewed: "2026-06-07"  // update on each maintenance pass
  };

  MMD.STATES = [
    ["NSW","New South Wales"],["VIC","Victoria"],["QLD","Queensland"],["SA","South Australia"],
    ["WA","Western Australia"],["TAS","Tasmania"],["ACT","Aust. Capital Territory"],["NT","Northern Territory"]
  ];

  /* ----------------------------------------------------------
     3. COMPLIANCE WORDING  (sign off with Cheyenne / AICS)
     ---------------------------------------------------------- */
  MMD.DISCLAIMERS = {
    topShort:
      "This calculator provides general information and estimates only. It is not personal " +
      "credit advice and does not guarantee loan approval, borrowing capacity, eligibility, " +
      "interest rates or savings. Speak with MortgageMD before making a finance decision.",

    calculatorDisclaimer:
      "Results are estimates only and are provided for general information purposes. This " +
      "calculator does not constitute personal credit advice, financial advice, legal advice " +
      "or tax advice, and is not an offer of credit, a pre-approval or a guarantee of loan " +
      "approval. Results do not guarantee borrowing capacity, eligibility, interest rate, " +
      "savings or lender acceptance. Actual outcomes depend on lender policy, income " +
      "verification, credit history, expenses, liabilities, property or security type and your " +
      "personal circumstances. You should speak to a licensed MortgageMD credit adviser before " +
      "making a finance decision.",

    standardAssumptions: [
      "The figures you enter are accurate and complete.",
      "Government charges, lender fees, scheme rules, rates and policies can change and should be confirmed.",
      "Results do not take into account your full personal circumstances, income, expenses or liabilities."
    ],
    standardWarnings: [
      "Actual results may differ from these estimates.",
      "Loan eligibility and approval are always subject to lender assessment and policy.",
      "This calculator does not assess your full borrowing capacity or serviceability."
    ],
    comparisonWarning:
      "WARNING: Any interest rate shown is an example only and is not an offer of credit. A " +
      "comparison rate is true only for the example given and may not include all fees and " +
      "charges. Different terms, fees or loan amounts might result in a different comparison " +
      "rate. Rates are indicative and subject to change and lender approval.",

    nextStepDefault:
      "For a personalised assessment, speak with MortgageMD before entering into a contract or " +
      "making a finance decision.",

    acl:
      "MortgageMD is an Australian Credit Licensee — ACL 501419. Any credit assistance is " +
      "provided in line with our Credit Guide and Privacy Disclosure.",

    privacyConsent:
      "I agree that MortgageMD may collect and use my personal information to contact me about " +
      "my enquiry, in accordance with the MortgageMD Privacy Disclosure. I understand my " +
      "information may be exchanged with lenders, advisers, contractors and other parties, some " +
      "of whom may be located overseas."
  };

  // Lead tags (feed ActiveCampaign + Mercury). See LEAD-CAPTURE.md.
  MMD.TAGS = {
    "borrowing-power":      "Calculator - Borrowing Power",
    "repayments":           "Calculator - Repayments",
    "purchase-costs":       "Calculator - Purchase Costs",
    "lmi-lvr":              "Calculator - LMI",
    "refinance":            "Calculator - Refinance",
    "equity":               "Calculator - Equity",
    "self-employed":        "Calculator - Self Employed",
    "lmi-waiver":           "Calculator - LMI Waiver",
    "borrowing-power-drag": "Calculator - Borrowing Power Drag"
  };

  /* ----------------------------------------------------------
     4. DISCLAIMER RENDERERS  (inject the approved wording)
     ---------------------------------------------------------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]; }); }

  MMD.renderTopDisclaimer = function (el) {
    if (!el) return;
    el.className = "mmd-top-disclaimer";
    el.setAttribute("role", "note");
    el.innerHTML =
      '<svg class="mmd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>' +
      '<p>' + esc(MMD.DISCLAIMERS.topShort) + '</p>';
  };

  // opts: { calcName, assumptions:[], warnings:[], nextStep, showComparisonWarning }
  MMD.renderBottomDisclaimers = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var D = MMD.DISCLAIMERS;
    var assumptions = D.standardAssumptions.concat(opts.assumptions || []);
    var warnings = D.standardWarnings.concat(opts.warnings || []);
    var nextStep = opts.nextStep || D.nextStepDefault;

    function list(items) { return '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; }

    var html =
      '<div class="mmd-disc mmd-disc--full">' +
        '<h3><span class="dot"></span>Calculator Disclaimer</h3>' +
        '<p>' + esc(D.calculatorDisclaimer) + '</p>' +
        (opts.showComparisonWarning ? '<div class="mmd-comparison-warning">' + esc(D.comparisonWarning) + '</div>' : '') +
      '</div>' +
      '<div class="mmd-disc"><h3><span class="dot"></span>Assumptions</h3>' + list(assumptions) + '</div>' +
      '<div class="mmd-disc"><h3><span class="dot"></span>Warnings</h3>' + list(warnings) + '</div>' +
      '<div class="mmd-disc mmd-disc--full"><h3><span class="dot"></span>Next Step</h3><p>' + esc(nextStep) + '</p>' +
        '<p class="mmd-acl">' + esc(D.acl) + '</p>' +
      '</div>';

    el.className = "mmd-disclaimers";
    el.innerHTML = html;
  };

  /* ----------------------------------------------------------
     5. LEAD CAPTURE DATA LAYER
     ---------------------------------------------------------
     No backend here. Results are NEVER hidden behind a form.
     We push structured events that Prajwol wires to ActiveCampaign
     + Mercury (see LEAD-CAPTURE.md). Two integration points:
       - window.dataLayer (GTM-style array)
       - window.MMDLeadHook(payload)  (optional direct hook)
     ---------------------------------------------------------- */
  MMD.lead = {
    _push: function (payload) {
      try {
        global.dataLayer = global.dataLayer || [];
        global.dataLayer.push(payload);
        if (typeof global.MMDLeadHook === "function") global.MMDLeadHook(payload);
      } catch (e) { /* never break the calculator over analytics */ }
    },
    // Fire when a result is shown (engagement signal, no PII).
    track: function (calcKey, data) {
      MMD.lead._push({
        event: "mmd_calculator_result",
        calculator: calcKey,
        leadTag: MMD.TAGS[calcKey] || ("Calculator - " + calcKey),
        source: "MortgageMD Website Calculator",
        timestamp: new Date().toISOString(),
        data: data || {}
      });
    },
    // Optional "email me the detailed results" — requires consent. No PII leaves the
    // browser until Prajwol connects a backend/AC endpoint to these events.
    attachEmailForm: function (cfg) {
      var form = cfg.form, email = cfg.email, consent = cfg.consent, msg = cfg.msg;
      if (!form) return;
      var rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var addr = (email && email.value || "").trim();
        if (!rx.test(addr)) { if (msg) { msg.className = "mmd-lead__msg err"; msg.textContent = "Please enter a valid email address."; } return; }
        if (consent && !consent.checked) { if (msg) { msg.className = "mmd-lead__msg err"; msg.textContent = "Please tick the consent box so we can contact you."; } return; }
        MMD.lead._push({
          event: "mmd_lead_email",
          calculator: cfg.calcKey,
          leadTag: MMD.TAGS[cfg.calcKey] || ("Calculator - " + cfg.calcKey),
          source: "MortgageMD Website Calculator",
          timestamp: new Date().toISOString(),
          email: addr,
          consent: !!(consent && consent.checked),
          data: (typeof cfg.getContext === "function" ? cfg.getContext() : {})
        });
        if (msg) { msg.className = "mmd-lead__msg ok"; msg.textContent = "Thanks — we’ll send your detailed estimate and be in touch shortly."; }
        if (email) email.value = "";
        if (consent) consent.checked = false;
      });
    }
  };

  /* Build a standard lead-capture block (CTA + optional email + consent). */
  MMD.renderLeadCapture = function (el, cfg) {
    if (!el) return;
    cfg = cfg || {};
    var cta = cfg.ctaText || "Want us to run this properly against lender policy?";
    var bookUrl = cfg.bookUrl || "#book";
    var enquireUrl = cfg.enquireUrl || "#enquire";
    el.className = "mmd-lead";
    el.innerHTML =
      '<p class="mmd-lead__h">' + esc(cta) + '</p>' +
      '<p class="mmd-lead__p">See your estimate above. Book a free chat, or have a detailed version emailed to you.</p>' +
      '<div class="mmd-actions" style="margin-top:0">' +
        '<a class="mmd-btn mmd-btn--primary" href="' + esc(bookUrl) + '">Book a free chat with MortgageMD</a>' +
        '<a class="mmd-btn mmd-btn--blue" href="' + esc(enquireUrl) + '">Enquire now</a>' +
      '</div>' +
      '<form class="mmd-lead__form" novalidate style="margin-top:14px">' +
        '<div class="mmd-lead__row">' +
          '<div class="mmd-input"><span class="mmd-input__prefix">@</span>' +
            '<input type="email" placeholder="you@email.com" autocomplete="email" aria-label="Email address" data-mmd-email></div>' +
          '<button type="submit" class="mmd-btn mmd-btn--ghost">Email my results</button>' +
        '</div>' +
        '<label class="mmd-consent"><input type="checkbox" data-mmd-consent> ' + esc(MMD.DISCLAIMERS.privacyConsent) + '</label>' +
        '<p class="mmd-lead__msg" data-mmd-msg aria-live="polite"></p>' +
      '</form>';
    MMD.lead.attachEmailForm({
      form: el.querySelector(".mmd-lead__form"),
      email: el.querySelector("[data-mmd-email]"),
      consent: el.querySelector("[data-mmd-consent]"),
      msg: el.querySelector("[data-mmd-msg]"),
      calcKey: cfg.calcKey,
      getContext: cfg.getContext
    });
  };

  /* ----------------------------------------------------------
     6. PREVIEW CHROME  (standalone preview pages only)
     ---------------------------------------------------------
     This header/footer is for the standalone REVIEW pages so the
     calculators look on-brand while Michael/Prajwol test them.
     When embedding into the WordPress site, DROP this chrome and
     keep only the <section class="mmd-calc"> ... </section> block
     (see WORDPRESS-INTEGRATION.md). Elements:
       [data-mmd-header]  [data-mmd-footer]
     ---------------------------------------------------------- */
  MMD.LOGO_SVG =
    '<span class="mmd-logo" aria-label="MortgageMD">' +
    '<svg viewBox="0 0 128 104" height="30" aria-hidden="true">' +
    '<g fill="#49a9e8"><rect x="12.5" y="38" width="7" height="28" rx="3.5"/><rect x="21.5" y="31" width="7" height="42" rx="3.5"/><rect x="30.5" y="25" width="7" height="54" rx="3.5"/><rect x="39.5" y="20" width="7" height="64" rx="3.5"/><rect x="48.5" y="16" width="7" height="72" rx="3.5"/><rect x="57.5" y="13" width="7" height="78" rx="3.5"/></g>' +
    '<g fill="#5b5dbb"><rect x="63.5" y="13" width="7" height="78" rx="3.5"/><rect x="72.5" y="16" width="7" height="72" rx="3.5"/><rect x="81.5" y="20" width="7" height="64" rx="3.5"/><rect x="90.5" y="25" width="7" height="54" rx="3.5"/><rect x="99.5" y="31" width="7" height="42" rx="3.5"/><rect x="108.5" y="38" width="7" height="28" rx="3.5"/></g></svg>' +
    '<b style="font-weight:800;font-size:1.2rem;margin-left:9px"><span style="color:#344054">MORTGAGE</span><span style="color:#49a9e8">MD</span></b></span>';

  MMD.renderPreviewChrome = function (opts) {
    opts = opts || {};
    var hubHref = opts.hubHref || "../index.html";
    var header = document.querySelector("[data-mmd-header]");
    var footer = document.querySelector("[data-mmd-footer]");
    if (header) {
      header.innerHTML =
        '<div class="mmd-preview-bar">Preview build for internal review — not yet deployed. Final wording pending Cheyenne / AICS sign-off.</div>' +
        '<div class="mmd-preview-head">' +
          '<a href="' + hubHref + '" style="text-decoration:none">' + MMD.LOGO_SVG + '</a>' +
          '<div class="mmd-preview-contact">' +
            '<a href="tel:1300217227">1300 217 227</a> · ' +
            '<a href="mailto:info@mortgagemd.com.au">info@mortgagemd.com.au</a>' +
          '</div>' +
          '<a class="mmd-btn mmd-btn--ghost" href="' + hubHref + '">All calculators</a>' +
        '</div>';
    }
    if (footer) {
      footer.innerHTML =
        '<div class="mmd-preview-foot">' +
          '<p style="font-weight:800;margin:0 0 6px"><span style="color:#fff">MORTGAGE</span><span style="color:#49a9e8">MD</span></p>' +
          '<p style="margin:0 0 4px;font-size:.82rem">' + esc(MMD.DISCLAIMERS.acl) + '</p>' +
          '<p style="margin:0;font-size:.78rem;opacity:.75">10 Wirralee Street, South Wentworthville, NSW 2145 · 1300 217 227 · info@mortgagemd.com.au</p>' +
          '<p style="margin:8px 0 0;font-size:.74rem;opacity:.6">Preview build — no analytics, no data stored client-side. For Prajwol to integrate.</p>' +
        '</div>';
    }
  };

  global.MMD = MMD;
})(window);
