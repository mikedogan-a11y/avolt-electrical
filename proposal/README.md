# Proposal Generator

A self-contained, single-file tool for producing branded client proposals (or quotes / estimates / recommendations) and saving them as PDF.

No login, no server, no install — it's one HTML file that runs in any browser.

## How to use

1. Open `proposal/index.html` in a browser (double-click it, or visit `/proposal/` if the site is hosted).
2. Fill in your business details on the left — they're **remembered on your device**, so you only do this once.
3. Add the client, a summary, line items (totals + optional GST calculate automatically), scope and terms.
4. Watch the document build live on the right.
5. Click **⬇ Save as PDF** — in the browser's print dialog choose *Save as PDF* as the destination. Send that file to the client.

## Buttons

- **Save as PDF** — opens the print dialog (pick "Save as PDF").
- **New proposal** — clears the client + line items but keeps your business details and logo.
- **Reset all** — wipes everything, including saved business details.

## Notes

- Everything is stored locally in your browser (`localStorage`) — nothing is uploaded anywhere, and no client data leaves your machine.
- A logo can be uploaded (optional); it's embedded into the document.
- The page is marked `noindex` so search engines won't list it.

## Why not "log into WordPress and auto-fill"?

That approach (a robot that opens wp-admin, types, and clicks submit) needs your password stored somewhere, a machine to run it, and breaks whenever WordPress changes its screens. This tool skips all of that and delivers the actual goal — a polished proposal to send clients. If you do later want it published into a real WordPress site, the cleanest path is the WordPress REST API; ask and that can be added as a one-click "Send to WordPress" button.
