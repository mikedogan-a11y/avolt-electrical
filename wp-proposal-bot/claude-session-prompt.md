# Prompt for your "proposal answers" Claude session

Paste this at the **end** of your existing Claude session (the one that already
produces the proposal answers). It tells that session to hand you a single JSON
block that this bot can consume directly — so there's no manual data entry and
no second AI step.

---

> From now on, when you've finished working out the proposal, output the result
> as a **single JSON code block** in exactly this shape (omit any field you
> don't have a value for — never invent figures). Money values are plain
> strings. Yes/No fields must be exactly `"Yes"` or `"No"`. `loans` is an array
> with one entry per loan/split.
>
> ```json
> {
>   "applicant": { "name": "", "address": "", "applyOnlineId": "", "employmentStatus": "", "grossAnnualIncome": "" },
>   "household": { "totalAnnualIncome": "", "totalMonthlyLivingExpenses": "", "totalLiabilities": "" },
>   "funding": {
>     "required": { "purchasePrice": "", "refinanceAmount": "", "constructionCost": "", "debtConsolidation": "", "equityAccessSought": "" },
>     "govFees": { "purchaseStampDuty": "", "mortgageRegistrationFee": "", "transferRegistrationFee": "" },
>     "lenderFees": { "establishmentMonthlyAccount": "", "annualFee": "", "settlementOrLegalFee": "", "dischargeFee": "", "lmi": "" },
>     "available": { "totalLoans": "", "totalContribution": "", "governmentGrant": "" }
>   },
>   "loans": [
>     {
>       "lender": "", "productRecommended": "Yes", "product": "", "loanAmount": "", "contractTerm": "",
>       "interestRate": "", "monthlyRepayment": "", "variableOrFixed": "Variable", "repaymentType": "Principal & Interest",
>       "applicationFee": "", "monthlyFee": "", "annualFee": "",
>       "features": { "portability": "Yes", "offsetAccount": "Yes", "splitLoanFacility": "No", "packageFacility": "No", "redrawAllowed": "Yes", "estimatedSecurity": "", "offsetAcctFee": "", "redrawFee": "" }
>     }
>   ],
>   "estimate": {
>     "commission": [ { "percent": "", "dollar": "" } ],
>     "feesApply": "Yes",
>     "financier": { "establishmentMonth": "", "valuationFee": "", "settlementFee": "" },
>     "referralFeesApply": "No",
>     "conflictOfInterest": "No"
>   },
>   "clientRO": {
>     "objectives": "", "loanPurpose": "", "loanTerm": "", "termWhyImportant": "",
>     "features": { "principalAndInterest": true, "interestOnly": false, "variable": false, "fixed": false, "split": false, "offsetAccount": false, "redrawFacility": false },
>     "featuresMostImportant": "", "refinanceCostBenefit": "", "lenderPreferences": "",
>     "retirementAge": "",
>     "loanRepaidBy": { "ongoingIncome": true, "partnerIncome": false, "saleOfAssets": false, "savings": false, "superLumpSum": false, "superRecurring": false, "otherInvestments": false, "downsizing": false, "other": false },
>     "debtConsolidationConsiderations": "No", "anticipatedChanges": "No", "assumptions": "No",
>     "additionalInfo": ""
>   }
> }
> ```

---

Then copy that JSON block, paste it into the bot's web page, and tap **Generate**.
`sample-proposal.json` in this folder is a filled-in real example to compare against.
