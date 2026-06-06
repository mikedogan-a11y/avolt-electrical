# Avolt Electrical — Website

A fast, professional, mobile-first static website for **Avolt Electrical** (Mehmet Kaan Süzen), with a working enquiry form.

No build tools, no Node, no dependencies — just plain HTML, CSS and JavaScript that runs anywhere.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — hero, services overview, why-us, stats, process, testimonials, service area, CTA |
| `services.html` | Full services grid, process, FAQ |
| `about.html` | Story, values, credentials |
| `contact.html` | Contact details + **working enquiry form** |
| `assets/css/styles.css` | All styling (electric-blue on charcoal theme) |
| `assets/js/main.js` | Nav toggle, scroll reveal, current year |
| `assets/js/form.js` | Enquiry form validation + Web3Forms submission |
| `assets/img/favicon.svg` | Lightning-bolt favicon/logo mark |
| `assets/img/og-image.png` | 1200×630 share-preview image (WhatsApp/Facebook/SMS link cards) |
| `assets/img/apple-touch-icon.png`, `favicon-32/16.png` | Home-screen / browser-tab icons |
| `sitemap.xml`, `robots.txt`, `site.webmanifest` | SEO + PWA metadata |
| `404.html` | Branded not-found page |

### SEO & sharing built in
- **Open Graph + Twitter Card** tags on every page, so a shared link shows a proper image, title and description instead of a bare URL.
- **`LocalBusiness`/`Electrician` structured data** (JSON-LD) on the home page for Google local search.
- Canonical URLs, sitemap, robots.txt, favicons and a web manifest.
- The share image and icons were generated from `_build/og-card.html` / `_build/icon-src.html` using headless Edge — edit those and re-render if the branding changes.
- Absolute URLs use the deployed site address; if the site ever moves, update the `og:url`, `canonical`, `sitemap.xml` and JSON-LD `url` values (all currently point at the GitHub Pages address).

## Preview locally

From PowerShell, run the bundled static server, then open the URL it prints:

```powershell
powershell -ExecutionPolicy Bypass -File ".\static-server.ps1"
# then visit http://localhost:8124/
```

(Or just double-click `index.html` — but the server gives the most accurate result.)

## Make the enquiry form deliver real emails (2 minutes)

The form is fully wired to **[Web3Forms](https://web3forms.com/)** — a free service that emails form submissions to an inbox. No account or backend needed. Until a key is added it runs in **demo mode** (validates and shows the success message, but doesn't send).

To make it live:

1. Go to **https://web3forms.com/** and enter the email address where Mehmet wants enquiries to land (e.g. `hello@avoltelectrical.com.au`).
2. They'll email you a free **Access Key** (a string like `a1b2c3d4-...`).
3. Open **`assets/js/form.js`** and replace the placeholder on the `ACCESS_KEY` line:

   ```js
   var ACCESS_KEY = "PASTE-YOUR-KEY-HERE";
   ```

4. (Optional but recommended) also update the hidden field in **`contact.html`**:

   ```html
   <input type="hidden" name="access_key" value="PASTE-YOUR-KEY-HERE" />
   ```

That's it — submissions now arrive in the inbox. The free plan covers 250 submissions/month, includes spam filtering, and a honeypot field is already built in.

## Things to personalise before going live

Search-and-replace these placeholders across the `.html` files:

- **Phone:** `0400 000 000` / `tel:+61400000000`
- **Email:** `hello@avoltelectrical.com.au`
- **ABN:** `ABN 00 000 000 000`
- **Licence:** `Lic. No. REC 00000`
- **Service area / suburbs:** currently "greater Melbourne" + inner-north suburbs
- **Social links:** the footer `href="#"` links → real Facebook / Instagram / Google Business URLs
- **Testimonials:** replace with real customer reviews when available
- **Stats:** years/jobs numbers on the home and about pages

## Hosting (when ready)

Being pure static files, this can be hosted free on **Netlify, Cloudflare Pages, GitHub Pages or Vercel** — drag the folder in, point the domain, done. The Web3Forms form keeps working on any of them.

---
Palette: electric blue `#2563EB` on charcoal `#0F172A`. Font: Inter.
