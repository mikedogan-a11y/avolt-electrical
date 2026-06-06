// schema.js
// The canonical shape of a proposal's data. This mirrors every field in the
// MortgageMD WordPress proposal form (see /screenshots). Your *other* Claude
// session should output JSON in this shape (see claude-session-prompt.md).
//
// JSON_SCHEMA below is also used to constrain the AI mapping step (ai-map.js)
// when you paste free-text notes instead of clean JSON.

// Helper: read a nested value by dotted path, e.g. get(data, "applicant.name").
export function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// A loan/split block (the "Proposed Finance" columns — up to 3 side by side).
const loanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    lender: { type: "string", description: "Lender name, e.g. Resimac" },
    productRecommended: { type: "string", enum: ["Yes", "No"] },
    product: { type: "string", description: "Product name, e.g. SE Prime - Alt - doc" },
    loanAmount: { type: "string" },
    contractTerm: { type: "string", description: "Years, e.g. 30" },
    interestRate: { type: "string", description: "e.g. 6.92" },
    monthlyRepayment: { type: "string" },
    variableOrFixed: { type: "string", enum: ["Variable", "Fixed"] },
    repaymentType: { type: "string", description: "e.g. Principal & Interest" },
    applicationFee: { type: "string" },
    monthlyFee: { type: "string" },
    annualFee: { type: "string" },
    features: {
      type: "object",
      additionalProperties: false,
      properties: {
        portability: { type: "string", enum: ["Yes", "No"] },
        offsetAccount: { type: "string", enum: ["Yes", "No"] },
        splitLoanFacility: { type: "string", enum: ["Yes", "No"] },
        packageFacility: { type: "string", enum: ["Yes", "No"] },
        redrawAllowed: { type: "string", enum: ["Yes", "No"] },
        estimatedSecurity: { type: "string" },
        offsetAcctFee: { type: "string" },
        redrawFee: { type: "string" },
      },
    },
  },
};

export const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    dates: {
      type: "object",
      additionalProperties: false,
      properties: {
        proposalDisclosure: { type: "string", description: "dd/mm/yyyy" },
        privacyDisclosure: { type: "string", description: "dd/mm/yyyy" },
      },
    },
    applicant: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        address: { type: "string" },
        applyOnlineId: { type: "string" },
        employmentStatus: { type: "string", description: "e.g. Self-Employed, PAYG" },
        grossAnnualIncome: { type: "string" },
      },
    },
    household: {
      type: "object",
      additionalProperties: false,
      properties: {
        totalAnnualIncome: { type: "string" },
        totalMonthlyLivingExpenses: { type: "string" },
        totalLiabilities: { type: "string" },
      },
    },
    funding: {
      type: "object",
      additionalProperties: false,
      properties: {
        required: {
          type: "object",
          additionalProperties: false,
          properties: {
            purchasePrice: { type: "string" },
            refinanceAmount: { type: "string" },
            constructionCost: { type: "string" },
            debtConsolidation: { type: "string" },
            equityAccessSought: { type: "string" },
          },
        },
        govFees: {
          type: "object",
          additionalProperties: false,
          properties: {
            purchaseStampDuty: { type: "string" },
            mortgageRegistrationFee: { type: "string" },
            transferRegistrationFee: { type: "string" },
          },
        },
        lenderFees: {
          type: "object",
          additionalProperties: false,
          properties: {
            establishmentMonthlyAccount: { type: "string" },
            annualFee: { type: "string" },
            settlementOrLegalFee: { type: "string" },
            dischargeFee: { type: "string" },
            lmi: { type: "string", description: "Lenders Mortgage Insurance" },
          },
        },
        available: {
          type: "object",
          additionalProperties: false,
          properties: {
            totalLoans: { type: "string" },
            totalContribution: { type: "string" },
            governmentGrant: { type: "string" },
          },
        },
      },
    },
    loans: {
      type: "array",
      description: "Proposed Finance columns (1-3). Each is a loan or split.",
      items: loanSchema,
    },
    estimate: {
      type: "object",
      additionalProperties: false,
      properties: {
        commission: {
          type: "array",
          description: "Reasonable estimate of commission payable to us: [{percent, dollar}]",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              percent: { type: "string" },
              dollar: { type: "string" },
            },
          },
        },
        feesApply: { type: "string", enum: ["Yes", "No"] },
        financier: {
          type: "object",
          additionalProperties: false,
          properties: {
            establishmentMonth: { type: "string" },
            valuationFee: { type: "string" },
            settlementFee: { type: "string" },
          },
        },
        referralFeesApply: { type: "string", enum: ["Yes", "No"] },
        conflictOfInterest: { type: "string", enum: ["Yes", "No"] },
        conflictComments: { type: "string" },
      },
    },
    clientRO: {
      type: "object",
      description: "The 'Client R&O' tab.",
      additionalProperties: false,
      properties: {
        objectives: { type: "string" },
        loanPurpose: { type: "string", description: "e.g. Refinance, Purchase" },
        loanTerm: { type: "string" },
        termWhyImportant: { type: "string" },
        features: {
          type: "object",
          additionalProperties: false,
          properties: {
            principalAndInterest: { type: "boolean" },
            interestOnly: { type: "boolean" },
            variable: { type: "boolean" },
            fixed: { type: "boolean" },
            split: { type: "boolean" },
            offsetAccount: { type: "boolean" },
            redrawFacility: { type: "boolean" },
          },
        },
        featuresMostImportant: { type: "string" },
        refinanceCostBenefit: { type: "string" },
        lenderPreferences: { type: "string" },
        retirementAge: { type: "string" },
        loanRepaidBy: {
          type: "object",
          additionalProperties: false,
          properties: {
            ongoingIncome: { type: "boolean" },
            partnerIncome: { type: "boolean" },
            saleOfAssets: { type: "boolean" },
            savings: { type: "boolean" },
            superLumpSum: { type: "boolean" },
            superRecurring: { type: "boolean" },
            otherInvestments: { type: "boolean" },
            downsizing: { type: "boolean" },
            other: { type: "boolean" },
          },
        },
        debtConsolidationConsiderations: { type: "string", enum: ["Yes", "No"] },
        anticipatedChanges: { type: "string", enum: ["Yes", "No"] },
        assumptions: { type: "string", enum: ["Yes", "No"] },
        additionalInfo: { type: "string" },
      },
    },
  },
};
