/* Ultra Connect v2 — generate static pages */
"use strict";
const fs = require("fs");
const path = require("path");
const { page } = require("./site-lib");
const { PAGES } = require("./content");

const OUT = __dirname;
for (const p of PAGES) {
  fs.writeFileSync(path.join(OUT, p.file), page(p), "utf8");
  console.log("built", p.file);
}

/* 404 */
const notFound = {
  file: "404.html", nav: "404",
  title: "Page not found — Ultra Connect",
  desc: "The page you are looking for could not be found.",
  hero: {
    kicker: "Signal lost / 404",
    title: "This page went <span class='grad'>off-grid.</span>",
    lead: "The link may have moved. Let's get you back to the connected ecosystem.",
    btn: "Back to home", btnHref: "index.html"
  },
  blocks: [
    { type: "bento", kicker: "Try these", title: "Useful <span class='grad-cyan'>signals.</span>", cards: [
      { span: "third", num: "01", icon: "HOME", title: "Home", text: "The Ultra Connect overview.", link: "index.html" },
      { span: "third", num: "02", icon: "SOL", title: "Solutions", text: "Five practice areas, one partner.", link: "solutions.html" },
      { span: "third", num: "03", icon: "CON", title: "Contact", text: "Talk to our team.", link: "contact.html" }
    ] }
  ]
};
fs.writeFileSync(path.join(OUT, notFound.file), page(notFound), "utf8");
console.log("built 404.html");

/* portal handoff — the full CRM runs on a separate secure host.
   Change PORTAL_TARGET in one place when the Node/Render host goes live. */
const PORTAL_TARGET = "https://ultra-connect.vercel.app/portal.html";
const portal = {
  file: "portal.html", nav: "Portal",
  title: "Partner Portal — Ultra Connect",
  desc: "Access the Ultra Connect partner and vendor portal to manage your catalogue, orders and invoices.",
  hero: {
    kicker: "Secure access / handoff",
    title: "Your partner <span class='grad'>workspace.</span>",
    lead: "The portal runs as a separate secure application. Continue to log in and manage your catalogue, orders, invoices and payments.",
    btn: "Open Partner Portal ↗", btnHref: PORTAL_TARGET
  },
  blocks: [
    { type: "bento", kicker: "Inside the portal", title: "Everything in <span class='grad-cyan'>one place.</span>", cards: [
      { span: "third", num: "01", icon: "CAT", title: "Your catalogue", text: "Add products, pricing and specs. Approved items go live across the network." },
      { span: "third", num: "02", icon: "ORD", title: "Order lifecycle", text: "New orders land in your dashboard with complete status visibility." },
      { span: "third", num: "03", icon: "INV", title: "Invoices & payments", text: "Track billing and payment status without chasing anyone." },
      { span: "half", num: "04", icon: "SEC", title: "Role-based access", text: "Admin, sales, counsellor and vendor roles each see exactly what they need." },
      { span: "half", num: "05", icon: "ALRT", title: "Smart follow-ups", text: "Reminders and alerts keep every enquiry and order moving." }
    ] },
    { type: "cta", kicker: "Ready when you are", title: "Continue to the <span class='grad'>portal.</span>", text: "Secure login for partners, vendors and internal teams.", btn: "Open Partner Portal ↗", href: PORTAL_TARGET }
  ]
};
fs.writeFileSync(path.join(OUT, portal.file), page(portal), "utf8");
console.log("built portal.html");

/* sitemap */
const base = "https://ultra-connect-v2.vercel.app/";
const urls = ["index.html", "solutions.html", "products.html", "about.html", "why.html", "partners.html", "team.html", "contact.html", "portal.html", "privacy.html", "terms.html"];
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join("\n")}\n</urlset>\n`, "utf8");
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`, "utf8");
console.log("built sitemap.xml, robots.txt");
