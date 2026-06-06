// automation.js
// The browser robot: log in → fill the form → build the doc → return the PDF.
// Uses Playwright (headless Chromium). Designed to locate fields the way a
// person does — by their visible label — so it survives most WordPress updates.

import { chromium } from "playwright";
import { get } from "./schema.js";
import {
  LOGIN,
  ACTIONS,
  SIMPLE_FIELDS,
  CLIENT_RO_FIELDS,
  CHECKBOXES,
  RADIO_GROUPS,
  LOAN_FIELDS,
} from "./field-map.js";

const env = (k, d) => process.env[k] ?? d;

// Quote a string for use inside an XPath expression.
function xq(s) {
  if (!s.includes('"')) return `"${s}"`;
  if (!s.includes("'")) return `'${s}'`;
  return "concat(" + s.split('"').map((p) => `"${p}"`).join(', \'"\', ') + ")";
}

// Find a control by an explicit selector, then by label, then by label-proximity.
async function locate(scope, { selector, label, tag }) {
  if (selector) return scope.locator(selector).first();
  // 1) Proper <label for> / aria-label association
  try {
    const byLabel = scope.getByLabel(label, { exact: false });
    if (await byLabel.count()) return byLabel.first();
  } catch {
    /* getByLabel can throw on odd markup — fall through */
  }
  // 2) The first control of `tag` that appears after the label text anywhere
  const t = tag || "input";
  const xpath = `xpath=(//label[normalize-space()=${xq(label)}] | //*[normalize-space(text())=${xq(label)}])[1]/following::${t}[1]`;
  return scope.locator(xpath).first();
}

const tagFor = (type) => (type === "select" ? "select" : type === "textarea" ? "textarea" : "input");

async function setField(scope, fd, value) {
  if (value == null || value === "") return;
  const control = await locate(scope, { selector: fd.selector, label: fd.label, tag: tagFor(fd.type) });
  if (!(await control.count())) {
    console.warn(`  · skipped (not found): ${fd.label}`);
    return;
  }
  if (fd.type === "select") {
    // Try by visible label first, then by value.
    try {
      await control.selectOption({ label: String(value) });
    } catch {
      await control.selectOption(String(value));
    }
  } else {
    await control.fill(String(value));
  }
  console.log(`  · ${fd.label} = ${value}`);
}

// Set a checkbox to checked/unchecked by its adjacent label text.
async function setCheckbox(page, label, on) {
  const xpath = `xpath=(//label[normalize-space()=${xq(label)}]/preceding-sibling::input[@type="checkbox"][1] | //label[normalize-space()=${xq(label)}]//input[@type="checkbox"] | //*[normalize-space(text())=${xq(label)}]/preceding::input[@type="checkbox"][1])[1]`;
  const box = page.locator(xpath).first();
  if (!(await box.count())) {
    console.warn(`  · checkbox not found: ${label}`);
    return;
  }
  if (on) await box.check({ force: true }).catch(() => {});
  else await box.uncheck({ force: true }).catch(() => {});
  console.log(`  · [${on ? "x" : " "}] ${label}`);
}

// Click the Yes/No radio under a heading.
async function setRadio(page, heading, value) {
  if (!value) return;
  const xpath = `xpath=(//*[normalize-space(text())=${xq(heading)}]/following::label[normalize-space()=${xq(value)}][1]/preceding-sibling::input[@type="radio"][1] | //*[normalize-space(text())=${xq(heading)}]/following::input[@type="radio"][1])[1]`;
  const radio = page.locator(xpath).first();
  if (await radio.count()) {
    await radio.check({ force: true }).catch(() => {});
    console.log(`  · (${value}) ${heading}`);
  } else {
    console.warn(`  · radio not found: ${heading}`);
  }
}

// Fill the Nth Proposed-Finance column for one loan object.
async function setLoanColumn(page, loan, columnIndex) {
  for (const fd of LOAN_FIELDS) {
    const value = get(loan, fd.path);
    if (value == null || value === "") continue;
    const t = tagFor(fd.type);
    // The (columnIndex+1)-th control of type `t` that follows the row label.
    const xpath = `xpath=(//*[normalize-space(text())=${xq(fd.rowLabel)}]/following::${t})[${columnIndex + 1}]`;
    const control = page.locator(xpath).first();
    if (!(await control.count())) {
      console.warn(`  · loan${columnIndex + 1} skipped (not found): ${fd.rowLabel}`);
      continue;
    }
    if (fd.type === "select") {
      try {
        await control.selectOption({ label: String(value) });
      } catch {
        await control.selectOption(String(value));
      }
    } else {
      await control.fill(String(value));
    }
    console.log(`  · loan${columnIndex + 1} ${fd.rowLabel} = ${value}`);
  }
}

/**
 * Run the full flow and return a PDF Buffer.
 * @param {object} data  Proposal data matching schema.js
 * @returns {Promise<Buffer>}
 */
export async function generateProposalPdf(data) {
  const required = ["WP_LOGIN_URL", "WP_FORM_URL", "WP_USERNAME", "WP_PASSWORD"];
  const missing = required.filter((k) => !env(k));
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);

  const headless = env("HEADLESS", "true") !== "false";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    // 1) Log in
    console.log("→ Logging in…");
    await page.goto(env("WP_LOGIN_URL"), { waitUntil: "domcontentloaded" });
    await page.fill(LOGIN.username, env("WP_USERNAME"));
    await page.fill(LOGIN.password, env("WP_PASSWORD"));
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      page.click(LOGIN.submit),
    ]);

    // 2) Open the proposal form
    console.log("→ Opening proposal form…");
    await page.goto(env("WP_FORM_URL"), { waitUntil: "domcontentloaded" });

    // 3) Fill the main form
    console.log("→ Filling main fields…");
    for (const fd of SIMPLE_FIELDS) await setField(page, fd, get(data, fd.path));

    // 3b) Proposed Finance columns
    const loans = Array.isArray(data.loans) ? data.loans : [];
    for (let i = 0; i < loans.length; i++) await setLoanColumn(page, loans[i], i);

    // 3c) Estimate — Nil radio + commission rows (positional)
    const commission = data?.estimate?.commission || [];
    for (let i = 0; i < commission.length; i++) {
      const pct = page.locator(`xpath=(//*[contains(normalize-space(.),"is equal to")]/preceding::input)[${i + 1}]`).first();
      // Best-effort; calibrate if the commission rows don't fill.
      if (commission[i].percent && (await pct.count())) await pct.fill(String(commission[i].percent)).catch(() => {});
    }

    // 4) Client R&O tab
    console.log("→ Client R&O tab…");
    const tab = page.getByText(ACTIONS.clientRoTab, { exact: false }).first();
    if (await tab.count()) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    for (const fd of CLIENT_RO_FIELDS) await setField(page, fd, get(data, fd.path));
    for (const cb of CHECKBOXES) {
      const v = get(data, cb.path);
      if (v != null) await setCheckbox(page, cb.label, !!v);
    }
    for (const rg of RADIO_GROUPS) await setRadio(page, rg.heading, get(data, rg.path));

    // 5) Build the document
    console.log("→ Building document…");
    const buildBtn = page.getByRole("button", { name: ACTIONS.buildButton }).first();
    const buildFallback = page.getByText(ACTIONS.buildButton, { exact: false }).first();
    const btn = (await buildBtn.count()) ? buildBtn : buildFallback;
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      btn.click(),
    ]);
    await page.waitForTimeout(1500);

    // 6) Capture the rendered document as a PDF.
    // We render the page to PDF directly (more reliable than clicking the OS
    // "Print now" dialog, which a headless browser can't drive).
    console.log("→ Capturing PDF…");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    return pdf;
  } catch (err) {
    // Leave a screenshot behind to make calibration easy.
    await page.screenshot({ path: `debug-${Date.now()}.png`, fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}
