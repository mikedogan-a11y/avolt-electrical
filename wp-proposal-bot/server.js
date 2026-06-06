// server.js
// Tiny web service. Serves a mobile-friendly page where you paste the proposal
// data (JSON or free-text notes) and tap Generate; it logs into WordPress,
// builds the document, and streams the PDF back. Works from phone or PC.

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateProposalPdf } from "./automation.js";
import { mapTextToProposal } from "./ai-map.js";
import { JSON_SCHEMA } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const TOKEN = process.env.TRIGGER_TOKEN || "";

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/schema", (_req, res) => res.json(JSON_SCHEMA));

app.post("/generate", async (req, res) => {
  try {
    const { token, mode, payload } = req.body || {};
    if (!TOKEN || token !== TOKEN) {
      return res.status(401).json({ error: "Wrong or missing access token." });
    }

    // Build the structured data object.
    let data;
    if (mode === "text") {
      data = await mapTextToProposal(String(payload || ""));
    } else {
      data = typeof payload === "string" ? JSON.parse(payload) : payload;
    }
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "No proposal data provided." });
    }

    console.log(`\n=== Generating proposal for: ${data?.applicant?.name || "(unknown)"} ===`);
    const pdf = await generateProposalPdf(data);

    const safeName = (data?.applicant?.name || "proposal").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="proposal-${safeName}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error("generate failed:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proposal bot listening on http://localhost:${port}`));
