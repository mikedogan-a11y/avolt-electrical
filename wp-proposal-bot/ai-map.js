// ai-map.js
// OPTIONAL: turn free-text proposal notes into structured proposal JSON.
//
// You only need this if you paste raw notes instead of clean JSON. The cleanest
// setup is to have your *other* Claude session emit JSON directly (see
// claude-session-prompt.md) — then this step is skipped entirely.

import Anthropic from "@anthropic-ai/sdk";
import { JSON_SCHEMA } from "./schema.js";

const SYSTEM = `You convert a mortgage broker's free-text proposal notes into a single JSON object describing a MortgageMD credit proposal.
Rules:
- Output ONLY data that is stated or clearly implied by the notes. Leave anything unknown out (do not invent figures).
- Money fields are plain strings without currency symbols unless the form expects them.
- Yes/No fields must be exactly "Yes" or "No".
- "loans" is an array, one entry per loan/split mentioned.`;

export async function mapTextToProposal(text) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("AI mapping needs ANTHROPIC_API_KEY set. Or paste structured JSON instead.");
  }
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: `Notes:\n\n${text}` }],
    output_config: {
      format: { type: "json_schema", schema: JSON_SCHEMA },
    },
  });

  // With output_config.format, the first text block is valid JSON for our schema.
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("AI mapping returned no text output.");
  return JSON.parse(block.text);
}
