# MortgageMD Calculators — deployment app (end-to-end proof)

**Question this answers:** *Can we deploy the calculators ourselves, end-to-end,
without paying a developer to hand-embed each one — and prove it works before
approaching Prajwol?*

**Answer: yes.** This folder is a working proof. It turns Prajwol's per-calculator
manual checklist into **install one plugin + one shortcode (or one API call)**, and
ships a harness that demonstrates the whole flow on a throwaway WordPress — without
touching the live site.

> The proof runs on a *disposable* WordPress (real WordPress, SQLite, no Docker).
> Nothing here connects to mortgagemd.com.au. On production it's the same plugin.

---

## What Prajwol would do by hand vs. what this does

| Per-calculator task (from the embed kit) | Manual (Prajwol) | This app |
|---|---|---|
| Upload JS, edit `functions.php`, enqueue with correct dependency order | ~hand-edit theme | plugin enqueues itself, page-scoped, core-before-calc |
| Paste the `<section>` block into an Elementor HTML widget | manual copy/paste | `[mmd_calc id="…"]` shortcode emits the real block |
| Create the SEO landing page + set Rank Math title/meta/focus kw | manual | `deploy.mjs` over the REST API |
| Avoid SiteGround "Combine JS" reordering | manual exclusion | correct `wp_enqueue` dependency = load order guaranteed |
| Wire the lead hook to ActiveCampaign + Mercury | custom dev (×1, shared) | one server-side REST endpoint, hook auto-injected |

The only genuinely custom one-time work — filling in the ActiveCampaign + Mercury
API calls — is isolated to two clearly-marked functions in the plugin
(`mmd_calc_forward_activecampaign`, `mmd_calc_forward_mercury`).

---

## Contents

```
plugin/mmd-calculators/      ← the WordPress plugin (install once)
  mmd-calculators.php        ← shortcode, self-enqueue, lead endpoint, SEO meta
  assets/                    ← the real calculator CSS/JS (vendored from the preview repo)
  calculators/               ← the source HTML the shortcode extracts the block from
deploy/deploy.mjs            ← creates an SEO landing page per calculator over the REST API
demo/run-demo.sh             ← spins up a throwaway WordPress and proves all of the above
demo/functional-test.mjs     ← proves the calculator actually computes once embedded
demo/sample-run-output.txt   ← a captured passing run (8/8)
```

## Run the proof yourself

Requirements: `php` (with `pdo_sqlite`), `node`, `git`, `curl`, and network access
to github.com. Then:

```bash
cd mmd-calc-deployer/demo
PORT=9800 bash run-demo.sh
```

It will: fetch WordPress core + a SQLite drop-in from GitHub, assemble a clean
site, install the plugin, **deploy two calculators over the REST API**, then verify
the page renders, the assets load in the right order, the lead hook is wired, the
SEO meta is set, a lead is captured server-side, and the calculator computes
correctly. Expected result: **8 passed, 0 failed** (see `demo/sample-run-output.txt`).

## Using it on the real site (when ready)

1. Zip `plugin/mmd-calculators/` and install it once via **Plugins → Add New → Upload**.
2. Put `[mmd_calc id="home-loan-repayment"]` on a page (Elementor *Shortcode* widget,
   or run `deploy/deploy.mjs` with a WordPress Application Password to create the
   SEO page automatically).
3. One-time: paste the ActiveCampaign + Mercury keys into the two forwarder
   functions; confirm the disclaimer wording (it's injected centrally).

Calculators #3–#9 are then just another shortcode each — no per-calculator dev.

---

### Honest scope notes

- This proves the **mechanism**. On the live site you still want a human eye on
  the final visual/mobile QA and the AICS disclaimer sign-off, and the one-time
  CRM wiring needs the real API credentials.
- The demo uses small local-only shims (allowing Application Passwords over plain
  http) that are **not** needed on the live HTTPS site — they're clearly marked
  `DEMO ONLY` in `run-demo.sh`.
