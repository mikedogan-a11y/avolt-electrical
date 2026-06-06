// field-map.js
// ════════════════════════════════════════════════════════════════════════
//  THIS IS THE ONE FILE TO CALIBRATE against the live WordPress form.
//
//  It was built from the screenshots, so each field is matched by its VISIBLE
//  LABEL TEXT (the same way a person reads the form). That works for most
//  fields. Where a label appears more than once (e.g. "Annual Fee" shows up in
//  Lender Fees, in each loan column, and in Features) you'll want to replace
//  `label:` with an exact `selector:` once we can see the page HTML — open the
//  form, right-click the field → Inspect, copy its id/name, and paste it as
//  `selector: "#that-id"`. Everything else (login, build, print, PDF capture,
//  the phone trigger, AI mapping) is already wired and needs no changes.
// ════════════════════════════════════════════════════════════════════════

// --- WordPress login (standard wp-login.php selectors) ---
export const LOGIN = {
  username: "#user_login",
  password: "#user_pass",
  submit: "#wp-submit",
};

// --- Buttons / actions ---
export const ACTIONS = {
  buildButton: "Update & Build Doc", // matched by button text
  printButton: "Print now",
  // The "Client R&O" tab must be clicked before its fields are visible:
  clientRoTab: "Client R&O",
};

// Each descriptor: { label, path, type, tag?, selector? }
//   type: "text" | "select" | "textarea" | "date"
//   tag:  override the HTML tag to search for (defaults from type)
//   selector: explicit CSS selector — use this to override label matching
export const SIMPLE_FIELDS = [
  // Important dates
  { label: "Proposal Disclosure date", path: "dates.proposalDisclosure", type: "date" },
  { label: "Privacy Disclosure date", path: "dates.privacyDisclosure", type: "date" },

  // Applicant details
  { label: "Applicant name", path: "applicant.name", type: "text" },
  { label: "Address", path: "applicant.address", type: "text" },
  { label: "ApplyOnline ID", path: "applicant.applyOnlineId", type: "text" },
  { label: "Employment Status", path: "applicant.employmentStatus", type: "select" },
  { label: "Total Gross Annual Income", path: "applicant.grossAnnualIncome", type: "text" },

  // Household (Combined)
  { label: "Total Annual Income", path: "household.totalAnnualIncome", type: "text" },
  { label: "Total Monthly Living Expenses", path: "household.totalMonthlyLivingExpenses", type: "text" },
  { label: "Total Liabilities", path: "household.totalLiabilities", type: "text" },

  // Funding Summary — Funds Required
  { label: "Purchase Price", path: "funding.required.purchasePrice", type: "text" },
  { label: "Refinance Amount", path: "funding.required.refinanceAmount", type: "text" },
  { label: "Construction Cost", path: "funding.required.constructionCost", type: "text" },
  { label: "Debt Consolidation", path: "funding.required.debtConsolidation", type: "text" },
  { label: "Equity Access Sought", path: "funding.required.equityAccessSought", type: "text" },

  // Government Fees and Charges
  { label: "Purchase Stamp Duty", path: "funding.govFees.purchaseStampDuty", type: "text" },
  { label: "Mortgage Registration Fee", path: "funding.govFees.mortgageRegistrationFee", type: "text" },
  { label: "Transfer Registration Fee", path: "funding.govFees.transferRegistrationFee", type: "text" },

  // Lender Fees  (⚠ "Annual Fee" is ambiguous — calibrate with a selector)
  { label: "Establishment & Monthly Account", path: "funding.lenderFees.establishmentMonthlyAccount", type: "text" },
  { label: "Settlement or Legal Fee", path: "funding.lenderFees.settlementOrLegalFee", type: "text" },
  { label: "Discharge Fee", path: "funding.lenderFees.dischargeFee", type: "text" },
  { label: "Lenders Mortgage Insurance", path: "funding.lenderFees.lmi", type: "text" },

  // Funds Available
  { label: "Total Loans we will be applying for", path: "funding.available.totalLoans", type: "text" },
  { label: "Total Contribution from you", path: "funding.available.totalContribution", type: "text" },
  { label: "Government Grant", path: "funding.available.governmentGrant", type: "text" },

  // Estimate Of Fees & Commissions (financier side)
  { label: "Valuation Fee", path: "estimate.financier.valuationFee", type: "text" },
  { label: "Settlement Fee", path: "estimate.financier.settlementFee", type: "text" },
  { label: "Fees Apply", path: "estimate.feesApply", type: "select" },
  { label: "Referral Fees apply", path: "estimate.referralFeesApply", type: "select" },
  {
    label: "Is there any conflict of interest identified with the new proposed loan?",
    path: "estimate.conflictOfInterest",
    type: "select",
  },
];

// Fields on the "Client R&O" tab (filled after clicking that tab).
export const CLIENT_RO_FIELDS = [
  { label: "Client Objectives", path: "clientRO.objectives", type: "textarea" },
  { label: "Loan Purpose", path: "clientRO.loanPurpose", type: "select" },
  { label: "Loan Term", path: "clientRO.loanTerm", type: "text" },
  { label: "Why is this term important?", path: "clientRO.termWhyImportant", type: "select" },
  { label: "Which features are most important and why?", path: "clientRO.featuresMostImportant", type: "textarea" },
  { label: "Refinance Cost-Benefit Summary", path: "clientRO.refinanceCostBenefit", type: "textarea" },
  { label: "Lender Preferences", path: "clientRO.lenderPreferences", type: "textarea" },
  { label: "At what age does the client plan to retire?", path: "clientRO.retirementAge", type: "text" },
  { label: "Additional Relevant Information", path: "clientRO.additionalInfo", type: "textarea" },
];

// Checkbox groups — each entry's value is read from a boolean at `path`.
export const CHECKBOXES = [
  // Loan Features (Client R&O tab)
  { label: "Principal & Interest", path: "clientRO.features.principalAndInterest" },
  { label: "Interest Only", path: "clientRO.features.interestOnly" },
  { label: "Variable", path: "clientRO.features.variable" },
  { label: "Fixed", path: "clientRO.features.fixed" },
  { label: "Split (part fixed / part variable)", path: "clientRO.features.split" },
  { label: "Offset Account", path: "clientRO.features.offsetAccount" },
  { label: "Redraw Facility", path: "clientRO.features.redrawFacility" },

  // How will the loan be repaid?
  { label: "Ongoing income prior to retirement", path: "clientRO.loanRepaidBy.ongoingIncome" },
  { label: "Partner/co-applicant's income", path: "clientRO.loanRepaidBy.partnerIncome" },
  { label: "Sale of assets", path: "clientRO.loanRepaidBy.saleOfAssets" },
  { label: "Savings", path: "clientRO.loanRepaidBy.savings" },
  { label: "Superannuation (lump sum)", path: "clientRO.loanRepaidBy.superLumpSum" },
  { label: "Superannuation (recurring income)", path: "clientRO.loanRepaidBy.superRecurring" },
  { label: "Income from other investments", path: "clientRO.loanRepaidBy.otherInvestments" },
  { label: "Downsizing", path: "clientRO.loanRepaidBy.downsizing" },
];

// Yes/No radio groups (Client R&O tab). Value is the string "Yes"/"No".
export const RADIO_GROUPS = [
  { heading: "Debt Consolidation Considerations Applicable", path: "clientRO.debtConsolidationConsiderations" },
  { heading: "Anticipated Changes", path: "clientRO.anticipatedChanges" },
  { heading: "Assumptions", path: "clientRO.assumptions" },
];

// Proposed Finance columns — one set of fields per loan/split (max 3).
// In automation we fill column 0 from loans[0], column 1 from loans[1], etc.
// `path` is RELATIVE to a single loan object.
export const LOAN_FIELDS = [
  { rowLabel: "Funds Required", path: "lender", type: "select" }, // row labelled "Funds Required" holds the lender
  { rowLabel: "Product Recommended", path: "productRecommended", type: "select" },
  { rowLabel: "Product", path: "product", type: "text" },
  { rowLabel: "Loan Amount", path: "loanAmount", type: "text" },
  { rowLabel: "Contract Term", path: "contractTerm", type: "text" },
  { rowLabel: "Interest Rate", path: "interestRate", type: "text" },
  { rowLabel: "Monthly Repayment", path: "monthlyRepayment", type: "text" },
  { rowLabel: "Variable or Fixed", path: "variableOrFixed", type: "select" },
  { rowLabel: "Repayment Type", path: "repaymentType", type: "select" },
  { rowLabel: "Application Fee", path: "applicationFee", type: "text" },
  { rowLabel: "Monthly Fee", path: "monthlyFee", type: "text" },
  { rowLabel: "Annual Fee", path: "annualFee", type: "text" },
  { rowLabel: "Portability", path: "features.portability", type: "select" },
  { rowLabel: "Offset Account", path: "features.offsetAccount", type: "select" },
  { rowLabel: "Split Loan Facility", path: "features.splitLoanFacility", type: "select" },
  { rowLabel: "Package Facility", path: "features.packageFacility", type: "select" },
  { rowLabel: "Redraw Allowed", path: "features.redrawAllowed", type: "select" },
  { rowLabel: "Offset Acct Fee", path: "features.offsetAcctFee", type: "text" },
  { rowLabel: "Redraw Fee", path: "features.redrawFee", type: "text" },
];
