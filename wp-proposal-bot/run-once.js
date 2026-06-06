// run-once.js
// Run the bot once from the command line (no web server). Good for testing/PC use.
//   node run-once.js sample-proposal.json
// Writes the PDF to out/proposal-<name>.pdf

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { generateProposalPdf } from "./automation.js";

const file = process.argv[2] || "sample-proposal.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const pdf = await generateProposalPdf(data);
fs.mkdirSync("out", { recursive: true });
const name = (data?.applicant?.name || "proposal").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
const outPath = path.join("out", `proposal-${name}.pdf`);
fs.writeFileSync(outPath, pdf);
console.log(`\n✓ Saved ${outPath}`);
