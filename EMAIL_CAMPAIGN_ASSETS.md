# Ultra Connect — Premium School Transformation Email
## Campaign Assets & Delivery Notes

**File:** `email/ultra-connect-email.html` (the email itself; the repo root `index.html` is the live website homepage — do not overwrite)
**Brand reference:** https://shubhankargithub.github.io/Ultra-Connect/

> **v2 (compact redesign):** 20KB HTML (Gmail clips at 102KB — v1 was 122KB and got truncated/broken). No placeholder/example-domain links, 9 links total, `List-Unsubscribe` header added at send time. Mobile stacks to 1 column, no horizontal overflow from 280px up. Live preview: https://shubhankargithub.github.io/Ultra-Connect/email/ultra-connect-email.html

---

## 1. SUBJECT LINES (3 options)

Avoid all-caps, spam words ("free", "guaranteed", "act now") and excessive punctuation.

| # | Subject line | Length |
|---|--------------|--------|
| 1 | Transform Your School with Ultra Connect | 43 chars |
| 2 | Everything Your School Needs — One Connected Partner | 56 chars |
| 3 | Build a Smarter, Future-Ready School with Ultra Connect | 58 chars |

**Recommended default:** Option 2 — it states the complete offer and the differentiator (one partner).

---

## 2. PREHEADER TEXT (one per subject line)

The preheader is already embedded at the top of `index.html` (hidden preview text). Copy/override with the matching one below in your ESP:

| Subject | Preheader |
|---------|-----------|
| Transform Your School with Ultra Connect | Technology, infrastructure, academics, safety and student experience — one partner for complete school transformation. Explore how. |
| Everything Your School Needs — One Connected Partner | 22+ school solutions across six categories, delivered through one coordinated ecosystem. Book a school consultation. |
| Build a Smarter, Future-Ready School with Ultra Connect | From AI-enabled ERP and STEM labs to CCTV, infrastructure and uniforms — discover how Ultra Connect builds future-ready campuses. |

---

## 3. MUST-REPLACE PLACEHOLDERS (before sending)

Search the HTML for each of these and replace:

| Placeholder | Replace with |
|-------------|--------------|
| `https://shubhankargithub.github.io/Ultra-Connect` | Your production website / image CDN domain (this is the GitHub Pages image host; keep it until the final host is ready) |
| `https://www.ultraconnect.example/...` | Real website URLs (solutions page, contact page, home, privacy, unsubscribe) |
| `mailto:consult@ultraconnect.example` | Your real consultation inbox |
| `[PHONE]` | Real phone number |
| `[EMAIL]` | Real email address |
| `[WHATSAPP]` | Real WhatsApp number (the link format is `https://wa.me/<number>`) |
| `[ADDRESS]` | Registered office / contact address |
| `{{PrincipalName}}` | Personalization token for the greeting. A fully styled greeting block ("Dear {{PrincipalName}} / School Leadership Team,") is already in the HTML at the top of the introduction section — wire your ESP's merge field to `{{PrincipalName}}`, or replace the whole line with a static greeting. |

---

## 4. IMAGES

All images use **absolute URLs** so they render inside email clients.

- `assets/logo/` — actual Ultra Connect logo PNGs (copied from the brand assets)
- `assets/icons/` — 20 flat white icons generated to match the brand blue (#0050F8 → #1F6BFF), including `icon-grid.png`
- `assets/images/` — `icon-preview-sheet.png` (visual QA of every icon) + drop future photos here

**IMPORTANT — deploy the images before sending:** the email references the GitHub Pages host
(`https://shubhankargithub.github.io/Ultra-Connect/assets/...`). Only the nav logo at
`assets/ultra-connect-logo-nav.png` is currently live on that host. Push the whole `assets/` folder
(logo/, icons/, images/) to the repo (or upload to your production CDN) so every icon and logo
resolves, then re-verify the URLs return 200 before the first send.

**Recommended compression:** re-save all PNGs with TinyPNG/ImageOptim before uploading to the host.
**Recommended sizing:** icons display at 28–40px from 512px sources (crisp on retina). If the file
is too heavy for your ESP, regenerate icons at 256px — still sharp at these display sizes.

To add real photography later (campus, labs, classrooms), drop the file into `assets/images/`
and reference it as `https://<your-domain>/assets/images/school-campus.jpg` with `width`, `height`,
meaningful `alt` text and `display:block`.

---

## 5. BRAND & CONTENT INTEGRITY (what was verified from the website)

- Logo used: the actual `ultra-connect-logo-nav.png` brand file (header + footer + "one partner" panel)
- Colors: navy `#060B2E`, blue `#0050F8`/`#1F6BFF`/`#4D8DFF`/`#85B0FF`, ink `#0A1330`, muted `#66748E`, soft `#F5F8FF` — all lifted from `css/core.css`
- Typography: Manrope (headings) + Inter (body), Arial fallback for Outlook
- Partners shown (all present on the real site): Clara SoftTech, Intellipaat, Adobe Express, CBSE • ICSE • IB • IGCSE
- "22+ solutions" — quoted from the site itself; no other statistics were fabricated
- Affiliation disclaimer — mirrors the site's own wording ("assistance-only, approvals rest with the boards")
- Contact details — the website only ships `[PHONE]`, `[EMAIL]`, `[WHATSAPP]` placeholders, so the email keeps the same placeholders instead of inventing data

---

## 6. COMPATIBILITY NOTES

- Table-based layout, inline styles, MSO VML bulletproof buttons (Outlook desktop)
- Media queries at 620px (Gmail app, Apple Mail, Outlook app, Yahoo) — cards stack, buttons go full-width
- Mobile behavior: if a client renders the email wider than the device screen (no viewport meta), it auto-scales to fit — standard email behavior, no horizontal scrollbar. Clients that honor the media queries lay out fluidly at the device width
- No JavaScript, no external dependencies, no CSS-grid dependency; graceful fallback if advanced CSS is stripped
- Full email preview available by opening `index.html` in any browser

---

## 7. SEND CHECKLIST

- [ ] Swap all placeholder links/contacts (Section 3)
- [ ] Upload `assets/logo` + `assets/icons` to the production host and update the base URL
- [ ] Set subject + preheader (Sections 1–2)
- [ ] Send a test to Gmail, Outlook desktop, Apple Mail, Yahoo, and a mobile phone
- [ ] Confirm no horizontal scroll at 320px width, images load, buttons click through
