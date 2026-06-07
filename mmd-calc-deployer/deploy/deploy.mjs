#!/usr/bin/env node
// Deploys one calculator as an SEO landing page over the WordPress REST API.
// This is the automated version of Prajwol's per-calculator manual steps:
// create the page, drop the calculator on it, set the Rank Math title/meta/
// focus keyword, publish (indexable). No dashboard clicking.
//
// Usage:
//   WP_URL=http://127.0.0.1:9400 WP_USER=admin WP_APP_PASSWORD='xxxx ...' \
//     node deploy.mjs <calculator-id>
//
// Auth uses a WordPress Application Password (Basic auth) — exactly what you'd
// generate once on the live SiteGround site for an automation user.

const WP_URL = (process.env.WP_URL || '').replace(/\/$/, '');
const WP_USER = process.env.WP_USER || '';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || '';

// The SEO copy per calculator (straight from the embed kits). Extend as the
// rollout proceeds; this is the only thing that changes per calculator.
const SEO = {
  'home-loan-repayment': {
    title: 'Home Loan Repayment Calculator',
    slug: 'home-loan-repayment-calculator',
    seoTitle: 'Home Loan Repayment Calculator | MortgageMD',
    metaDesc:
      'Estimate your home loan repayments and see how extra repayments or a lump sum could cut your interest and pay your loan off sooner. Free, indicative tool.',
    focusKw: 'home loan repayment calculator',
  },
  'lmi-lvr': {
    title: 'LMI & LVR Calculator',
    slug: 'lmi-lvr-calculator',
    seoTitle: 'LMI & LVR Calculator | MortgageMD',
    metaDesc:
      'Work out your loan-to-value ratio (LVR) and estimate Lenders Mortgage Insurance (LMI) on your purchase. Free, indicative tool.',
    focusKw: 'lmi lvr calculator',
  },
};

if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
  console.error('Missing WP_URL / WP_USER / WP_APP_PASSWORD env.');
  process.exit(2);
}

const id = process.argv[2];
if (!id || !SEO[id]) {
  console.error(`Pass a known calculator id. Known: ${Object.keys(SEO).join(', ')}`);
  process.exit(2);
}
const seo = SEO[id];
const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

async function api(path, opts = {}) {
  // The ?rest_route= form requires the route in one param and any filters as
  // their own query params (they must not be folded into the encoded route).
  const { query = {}, ...rest } = opts;
  let url = `${WP_URL}/?rest_route=${encodeURIComponent(path)}`;
  for (const [k, v] of Object.entries(query)) {
    url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      ...(rest.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from ${path} (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

async function findExistingPage(slug) {
  const pages = await api(`/wp/v2/pages`, { query: { slug, status: 'publish,draft' } });
  return Array.isArray(pages) && pages.length ? pages[0] : null;
}

(async () => {
  console.log(`→ Deploying "${id}" to ${WP_URL}`);

  const payload = {
    title: seo.title,
    slug: seo.slug,
    status: 'publish',
    content: `[mmd_calc id="${id}"]`, // the whole page body — one shortcode
    meta: {
      rank_math_title: seo.seoTitle,
      rank_math_description: seo.metaDesc,
      rank_math_focus_keyword: seo.focusKw,
    },
  };

  const existing = await findExistingPage(seo.slug);
  const page = existing
    ? await api(`/wp/v2/pages/${existing.id}`, { method: 'POST', body: JSON.stringify(payload) })
    : await api(`/wp/v2/pages`, { method: 'POST', body: JSON.stringify(payload) });

  console.log(`  ${existing ? 'updated' : 'created'} page #${page.id}`);
  console.log(`  URL:   ${page.link}`);
  console.log(`  slug:  ${page.slug}`);
  console.log(`  SEO title:    ${page.meta?.rank_math_title || '(unset)'}`);
  console.log(`  SEO meta:     ${page.meta?.rank_math_description || '(unset)'}`);
  console.log(`  focus kw:     ${page.meta?.rank_math_focus_keyword || '(unset)'}`);

  // Emit machine-readable result for the demo harness.
  console.log('RESULT_JSON=' + JSON.stringify({ id: page.id, link: page.link, slug: page.slug, meta: page.meta }));
})().catch((e) => {
  console.error('Deploy failed:', e.message);
  process.exit(1);
});
