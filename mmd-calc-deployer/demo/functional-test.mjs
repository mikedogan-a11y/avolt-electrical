#!/usr/bin/env node
// Proves the embedded calculator actually COMPUTES — by loading the real
// mmd-core.js + home-loan-repayment.js into the real embeddable markup (the
// exact <section> the shortcode outputs) and driving it like a user would.
//
// This is the "it works once embedded" proof that doesn't need a browser.

import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PLUGIN = new URL('../plugin/mmd-calculators/', import.meta.url);
const read = (p) => readFileSync(new URL(p, PLUGIN), 'utf8');

// 1) Extract the same embeddable <section> the WordPress shortcode emits.
const calcHtml = read('calculators/home-loan-repayment.html');
const section = calcHtml.slice(
  calcHtml.indexOf('<section', calcHtml.indexOf('EMBEDDABLE UNIT START')),
  calcHtml.indexOf('</section>', calcHtml.indexOf('EMBEDDABLE UNIT START')) + '</section>'.length
);

const core = read('assets/js/mmd-core.js');
const calc = read('assets/js/home-loan-repayment.js');

// 2) Build the page exactly as the plugin would: core BEFORE calc.
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>${section}
   <script>${core}</script>
   <script>${calc}</script>
   </body></html>`,
  { runScripts: 'dangerously', pretendToBeVisual: true }
);

const { window } = dom;
const { document } = window;

function fail(msg) { console.error('FAIL:', msg); process.exit(1); }

window.addEventListener('load', run);
// jsdom fires DOMContentLoaded during parse; also call run on next tick as a guard.
setTimeout(run, 50);

let ran = false;
function run() {
  if (ran) return; ran = true;
  try {
    // 3) Core ran? The disclaimer is injected centrally into [data-mmd-top].
    const top = document.querySelector('[data-mmd-top]');
    const disclaimerInjected = top && top.textContent.trim().length > 0;

    // 4) Enter a realistic scenario and submit, like a user.
    const set = (id, v) => { const e = document.getElementById(id); e.value = String(v); };
    set('rp_loan', '650000');
    set('rp_rate', '6.5');
    set('rp_term', '30');
    document.getElementById('rp_type').value = 'pi';
    document.getElementById('rp_freq').value = '12';
    document.getElementById('rp_form').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));

    // 5) Read the computed outputs.
    const payment = document.getElementById('rpr_payment')?.textContent?.trim() || '';
    const interest = document.getElementById('rpr_interest')?.textContent?.trim() || '';
    const total = document.getElementById('rpr_total')?.textContent?.trim() || '';

    console.log('--- Functional test: Home Loan Repayment ---');
    console.log('  Disclaimer injected by core:', disclaimerInjected ? 'yes' : 'NO');
    console.log('  Scenario: $650,000 @ 6.50% over 30y, P&I, monthly');
    console.log('  → Monthly repayment:', payment);
    console.log('  → Total interest:   ', interest);
    console.log('  → Total repaid:     ', total);

    if (!disclaimerInjected) fail('core did not inject the disclaimer');
    const n = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
    const pay = n(payment);
    // Independent check: amortisation formula → ~$4,108/month.
    if (!(pay > 4090 && pay < 4125)) fail(`monthly repayment ${payment} outside expected ~$4,108`);
    if (!(n(total) > n(interest) && n(interest) > 0)) fail('interest/total figures not sane');

    console.log('  ✓ computes correctly inside the embedded markup');
    process.exit(0);
  } catch (e) {
    fail(e.stack || e.message);
  }
}
