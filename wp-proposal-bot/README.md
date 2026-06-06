# MortgageMD Proposal Bot

Replaces the manual data-entry step. Instead of a person logging into the
MortgageMD WordPress proposal builder and typing ~40 fields, this service does
it automatically: **log in → fill the form → click "Update & Build Doc" →
return the PDF.** You trigger it from your phone or PC.

```
  Your Claude session  ─►  JSON  ─►  [ this bot ]  ─►  logs into WordPress,
                                                       fills form, builds doc
                                                            │
                                                            ▼
                                                      proposal PDF
```

---

## What's here

| File | Purpose |
|------|---------|
| `server.js` | Web service + the phone/PC trigger page |
| `public/index.html` | The page you open to paste data and tap Generate |
| `automation.js` | The browser robot (Playwright): login → fill → build → PDF |
| `field-map.js` | **The one file to calibrate** — maps each form field |
| `schema.js` | The data shape (mirrors every form field) |
| `ai-map.js` | Optional: turn free-text notes → structured JSON |
| `run-once.js` | Run once from the command line (testing / PC use) |
| `sample-proposal.json` | A real filled example (the Kartal proposal) |
| `claude-session-prompt.md` | Paste into your other Claude session so it emits this JSON |

---

## Setup (one time)

1. Install Node.js 18+.
2. In this folder:
   ```bash
   npm install            # also downloads the headless browser
   cp .env.example .env    # then edit .env with your real values
   ```
3. Fill in `.env`:
   - `WP_FORM_URL` — the page your Nepal team opens to fill the proposal form.
   - `WP_USERNAME` / `WP_PASSWORD` — the WordPress login.
   - `TRIGGER_TOKEN` — make up a long random secret (gate for the web page).
   - `ANTHROPIC_API_KEY` — only if you want the free-text mode.

## Try it on your own computer first

```bash
# Watch the browser do it (set HEADLESS=false in .env), using the sample:
node run-once.js sample-proposal.json
# → writes out/proposal-alican-kartal.pdf
```

This first run is also the **calibration pass** (see below).

## Run the phone/PC service

```bash
npm start
# open http://localhost:3000  → paste JSON → tap Generate
```

---

## The one calibration step

The field map was built from screenshots, not the live HTML, so a handful of
fields may need their selectors confirmed against the real site. On the first
`run-once.js`, watch the console: any line like `· skipped (not found): X` tells
you which field needs attention. To fix one:

1. Open the proposal form in Chrome, right-click the field → **Inspect**.
2. Copy its `id` or `name` (e.g. `id="loan_amount_1"`).
3. In `field-map.js`, add `selector: "#loan_amount_1"` to that field's entry.

The fields most likely to need this are the ones whose labels repeat across the
form (e.g. **Annual Fee**, which appears in Lender Fees, in each loan column, and
in Features). Login, the build/print step, PDF capture, the phone trigger, and
AI mapping all work as-is.

Also confirm `automation.js` captures the right page as PDF: after **Update &
Build Doc**, we render the resulting page with `page.pdf()` (more reliable than
the OS "Print now" dialog, which a headless browser can't drive). If the build
opens the document on a new URL/tab, point the capture at it.

---

## Deploy so you can trigger from your phone (recommended)

This needs to run on an always-on machine. Any of these host a Node + Playwright
app cheaply (a few $/month) and give you an HTTPS URL to open on your phone:

- **Render** / **Railway** / **Fly.io** — push this folder, set the `.env`
  values as their "environment variables", and they build it for you.

Keep `TRIGGER_TOKEN` secret and never commit `.env`. The WordPress password
lives only in the host's environment variables, never in the repo.

---

## Security notes

- The bot acts as a real WordPress user — use a dedicated login with only the
  access it needs.
- `TRIGGER_TOKEN` stops anyone else from running it. Treat it like a password.
- No client data is stored by the bot; it flows through and comes back as a PDF.
