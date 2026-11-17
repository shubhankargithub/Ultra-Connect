/* Ultra Connect v2 — layout + block renderers */
"use strict";
const fs = require("fs");
const products = require("./data/products.json");

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "\u20B9" + Number(n || 0).toLocaleString("en-IN");

const NAV = [
  ["index.html", "Home"], ["solutions.html", "Solutions"], ["products.html", "Products"],
  ["about.html", "About"], ["why.html", "Why Us"], ["partners.html", "Partners"],
  ["team.html", "Team"], ["contact.html", "Contact"]
];

function head(p) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="theme-color" content="#05070c">
<link rel="icon" href="assets/favicon-32.png">
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/inter-400.woff2" crossorigin>
<link rel="stylesheet" href="assets/fonts/inter.css">
<link rel="stylesheet" href="assets/style.css">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:type" content="website">
</head>
<body>
<div class="progress" aria-hidden="true"></div>
<canvas id="ambient" aria-hidden="true"></canvas>
<div class="grid-overlay" aria-hidden="true"></div>
<div class="cursor-glow" aria-hidden="true"></div>
<div class="scanline" aria-hidden="true"></div>`;
}

function header() {
  return `<header class="site-header">
  <a class="brand" href="index.html" aria-label="Ultra Connect home">
    <img src="assets/ultra-connect-logo-nav.png" alt="Ultra Connect" width="640" height="427">
    <span class="brand__text"><b>Ultra Connect</b><span>Multi Digi Service</span></span>
  </a>
  <nav class="nav" aria-label="Main navigation">
    ${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("\n    ")}
    <a class="nav__cta" href="portal.html">Portal ↗</a>
  </nav>
  <button class="menu-btn" type="button" aria-label="Open menu">☰</button>
</header>
<nav class="drawer" aria-label="Mobile navigation">
  ${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("\n  ")}
  <a href="portal.html">Portal ↗</a>
</nav>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="index.html"><img src="assets/ultra-connect-logo-nav.png" alt="Ultra Connect" width="640" height="427" style="height:32px"></a>
        <p style="margin-top:18px;max-width:34ch">Complete education transformation. ERP, digital infrastructure, campus solutions and partner enablement — in one connected ecosystem.</p>
        <p class="mono" style="color:var(--cyan);margin-top:18px">SYSTEM_ACTIVE_V2</p>
      </div>
      <div><h4>Company</h4><a href="about.html">About us</a><a href="team.html">Our team</a><a href="why.html">Why Ultra Connect</a><a href="contact.html">Contact</a></div>
      <div><h4>Ecosystem</h4><a href="solutions.html">Solutions</a><a href="products.html">Products</a><a href="partners.html">Partners</a><a href="portal.html">Partner portal</a></div>
      <div><h4>Get in touch</h4><p>Call: [PHONE]</p><p>WhatsApp: [WHATSAPP]</p><p>Email: [EMAIL]</p><p>Bengaluru, India</p></div>
    </div>
    <div class="footer-bottom"><span>© <span data-year>2026</span> Ultra Connect Multi Digi Service Pvt. Ltd.</span><span><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · All rights reserved</span></div>
  </div>
</footer>
<script src="assets/app.js"></script>
</body>
</html>`;
}

/* ---------- block renderers ---------- */
function block(b) {
  switch (b.type) {
    case "metrics":
      return `<section class="section section--tight"><div class="wrap"><div class="metrics reveal">
        ${b.items.map((m) => `<div class="metric"><b class="grad" data-count="${m.n}" data-suffix="${m.suffix || ""}" data-prefix="${m.prefix || ""}">0</b><span>${esc(m.label)}</span></div>`).join("\n        ")}
      </div></div></section>`;

    case "bento":
      return `<section class="section"><div class="wrap">
        <div class="section-head reveal"><span class="eyebrow">${esc(b.kicker)}</span>
          <h2 class="h-section">${b.title}</h2>${b.lead ? `<p class="lead">${esc(b.lead)}</p>` : ""}</div>
        <div class="bento">${b.cards.map((c, i) => `<article class="glass card card--${c.span || "third"} tilt reveal" style="--d:${(i * .07).toFixed(2)}s">
          <div class="card__num">${esc(c.num || "0" + (i + 1))}</div>
          ${c.icon ? `<div class="card__icon">${esc(c.icon)}</div>` : ""}
          <h3 class="h-card">${c.title}</h3>
          ${c.text ? `<p>${esc(c.text)}</p>` : ""}
          ${c.tags ? `<ul>${c.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          ${c.link ? `<p style="margin-top:20px"><a class="btn btn--ghost btn--sm" href="${c.link}">Explore <span class="arrow">→</span></a></p>` : ""}
        </article>`).join("\n        ")}</div>
      </div></section>`;

    case "flow":
      return `<section class="section section--tight"><div class="wrap">
        <div class="section-head reveal"><span class="eyebrow">${esc(b.kicker)}</span><h2 class="h-section">${b.title}</h2></div>
        <div class="flow">${b.steps.map((s, i) => `<div class="flow__step reveal" style="--d:${(i * .1).toFixed(2)}s">
          <div class="flow__node">${String(i + 1).padStart(2, "0")}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
        </div>`).join("\n        ")}</div>
      </div></section>`;

    case "products": {
      const list = products.slice(0, b.limit || 31);
      const cats = ["all", ...Array.from(new Set(list.map((p) => p.category)))];
      return `<section class="section" id="catalogue"><div class="wrap">
        <div class="section-head reveal"><span class="eyebrow">${esc(b.kicker || "Live catalogue")}</span><h2 class="h-section">${b.title}</h2>
        ${b.lead ? `<p class="lead">${esc(b.lead)}</p>` : ""}</div>
        ${b.filter === false ? "" : `<div class="filters reveal">${cats.map((c, i) => `<button class="filter ${i === 0 ? "is-active" : ""}" data-filter="${esc(c)}" type="button">${esc(c === "all" ? "All solutions" : c)}</button>`).join("")}</div>`}
        <div class="prod-grid">${list.map((p, i) => `<article class="glass prod tilt reveal" style="--d:${((i % 6) * .06).toFixed(2)}s" data-cat="${esc(p.category)}">
          <div class="prod__visual"><span class="prod__code">${esc(p.sku)}</span></div>
          <div class="prod__body"><span class="prod__cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
            <div class="prod__foot"><span class="prod__price">${inr(p.price)} <s>${inr(p.mrp)}</s></span><span class="mono">${esc(p.sku.split("-")[1] || "UC")}</span></div>
          </div>
        </article>`).join("\n        ")}</div>
      </div></section>`;
    }

    case "quote":
      return `<section class="section section--tight"><div class="wrap quote reveal">
        <div class="mark">“</div><blockquote>${b.text}</blockquote><cite>— ${esc(b.by)}</cite>
      </div></section>`;

    case "split": {
      let visual = "";
      if (b.visual === "terminal") {
        visual = `<div class="glass split__visual tilt reveal"><div class="terminal" style="margin:26px"><div class="terminal__bar"><i></i><i></i><i></i><span>LIVE_REASONING_LOG</span></div><div class="terminal__body"></div></div></div><div class="glass" aria-hidden="true"></div>`;
      } else if (b.visual === "orb") {
        visual = `<div class="split__visual reveal"><div class="orbit"><div class="orbit__ring"></div><div class="orbit__ring"></div><div class="orbit__ring"></div><div class="orbit__ring"></div><div class="orbit__core"><div><b>360°</b><br><span>CONNECTED</span></div></div><i class="orbit__sat a"></i><i class="orbit__sat b"></i><i class="orbit__sat c"></i></div></div>`;
      } else {
        visual = `<div class="glass split__visual tilt reveal" style="padding:34px;display:grid;place-content:center;gap:20px">
          <span class="card__num">PLATFORM_CORE</span><h3 class="h-card">One ecosystem.<br><span class="grad-cyan">Every touchpoint.</span></h3>
          <p class="lead" style="font-size:15px">${esc(b.visualText || "CRM · Vendor network · Orders · Invoicing · Finance · Reports")}</p>
          <div class="hairline"></div><p class="mono">15 MODULES / SINGLE SOURCE OF TRUTH</p></div><div class="glass" aria-hidden="true"></div>`;
      }
      return `<section class="section"><div class="wrap split">
        <div class="reveal"><span class="eyebrow">${esc(b.kicker)}</span><h2 class="h-section" style="margin:22px 0">${b.title}</h2>
          <p class="lead">${esc(b.lead)}</p>
          ${b.points ? `<ul class="points">${b.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${b.btn ? `<p style="margin-top:32px"><a class="btn btn--primary magnetic" href="${b.btnHref || "contact.html"}">${esc(b.btn)} <span class="arrow">→</span></a></p>` : ""}
        </div>${visual}
      </div></section>`;
    }

    case "marquee":
      return `<div class="marquee reveal"><div class="marquee__track">${[0, 1].map(() => b.items.map((i) => `<span><i>◆</i>${esc(i)}</span>`).join("")).join("")}</div></div>`;

    case "timeline":
      return `<section class="section"><div class="wrap split">
        <div class="reveal"><span class="eyebrow">${esc(b.kicker)}</span><h2 class="h-section" style="margin:22px 0">${b.title}</h2><p class="lead">${esc(b.lead || "")}</p></div>
        <div class="timeline">${b.items.map((t, i) => `<div class="tl-item reveal" style="--d:${(i * .08).toFixed(2)}s"><span>${esc(t.when)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`).join("")}</div>
      </div></section>`;

    case "team": {
      const people = b.people;
      return `<section class="section"><div class="wrap">
        <div class="section-head reveal"><span class="eyebrow">${esc(b.kicker)}</span><h2 class="h-section">${b.title}</h2><p class="lead">${esc(b.lead || "")}</p></div>
        <div class="team-grid">${people.map((p, i) => `<article class="glass person tilt reveal" style="--d:${(i * .06).toFixed(2)}s"><div class="person__av">${esc(p.initials)}</div><h3>${esc(p.name)}</h3><span>${esc(p.role)}</span><p>${esc(p.text || "")}</p></article>`).join("")}</div>
      </div></section>`;
    }

    case "text":
      return `<section class="section section--tight"><div class="wrap" style="max-width:860px">
        ${b.items.map((s, i) => `<div class="reveal" style="margin-bottom:48px"><span class="card__num">${String(i + 1).padStart(2, "0")}</span><h2 class="h-card" style="margin:14px 0">${esc(s.title)}</h2><p class="lead" style="font-size:16px">${esc(s.text)}</p></div>`).join("")}
      </div></section>`;

    case "cta":
      return `<section class="cta-band"><div class="wrap reveal"><span class="eyebrow">${esc(b.kicker || "Start a conversation")}</span>
        <h2 style="margin:24px 0">${b.title}</h2><p class="lead" style="margin:0 auto 34px;text-align:center">${esc(b.text)}</p>
        <a class="btn btn--primary magnetic" href="${b.href || "contact.html"}">${esc(b.btn || "Let’s talk")} <span class="arrow">→</span></a>
      </div></section>`;

    case "contact":
      return `<section class="section"><div class="wrap split">
        <div class="reveal"><span class="eyebrow">${esc(b.kicker)}</span><h2 class="h-section" style="margin:22px 0">${b.title}</h2><p class="lead">${esc(b.lead)}</p>
          <ul class="points"><li>Call / WhatsApp: [PHONE]</li><li>Email: [EMAIL]</li><li>Bengaluru, India — PAN India delivery</li></ul>
        </div>
        <div class="glass reveal" style="padding:clamp(24px,4vw,44px)">
          <form id="contact-form" class="form-grid">
            <div class="field"><label>Your name</label><input name="name" required placeholder="Full name"></div>
            <div class="field"><label>Organisation</label><input name="school" placeholder="School / company"></div>
            <div class="field"><label>Email</label><input name="email" type="email" required placeholder="you@example.com"></div>
            <div class="field"><label>Phone</label><input name="phone" placeholder="Mobile number"></div>
            <div class="field field--full"><label>I'm interested in</label><select name="interest"><option>School ERP &amp; AI</option><option>Interactive flat panels</option><option>Infrastructure &amp; safety</option><option>Partnership / vendor</option><option>Something else</option></select></div>
            <div class="field field--full"><label>Tell us more</label><textarea name="message" placeholder="Your requirements..."></textarea></div>
            <div class="field field--full"><button class="btn btn--primary magnetic" type="submit">Send enquiry <span class="arrow">→</span></button><p class="form-note">We usually respond within one working day.</p></div>
          </form>
          <div class="form-success"><h3 class="h-card grad-cyan">Signal received.</h3><p class="lead" style="margin:14px auto 0">Thank you — our team will be in touch shortly.</p></div>
        </div>
      </div></section>`;
    default: return "";
  }
}

function page(cfg) {
  const hero = cfg.hero
    ? `<section class="page-hero"><div class="page-hero__glow"></div><div class="wrap">
        <div class="breadcrumb reveal"><a href="index.html">Home</a> / ${esc(cfg.nav)}</div>
        <div class="eyebrow reveal" style="margin-top:26px">${esc(cfg.hero.kicker)}</div>
        <h1 class="reveal">${cfg.hero.title}</h1>
        <p class="lead reveal">${esc(cfg.hero.lead)}</p>
        ${cfg.hero.btn ? `<p class="reveal" style="margin-top:34px"><a class="btn btn--primary magnetic" href="${cfg.hero.btnHref || "contact.html"}">${esc(cfg.hero.btn)} <span class="arrow">→</span></a></p>` : ""}
      </div></section>`
    : `<section class="hero"><div class="wrap hero__grid">
        <div>
          <span class="status reveal"><i class="dot"></i> Ultra Connect · System online</span>
          <h1 class="h-display hero__title reveal"><span class="line">Engineering the</span><span class="line"><span class="grad" data-type="Future of Learning.|Future of Commerce.|Future of Campuses.">Future of Learning.</span></span></h1>
          <p class="lead hero__sub reveal">One connected ecosystem for schools, educators and partners — AI-enabled ERP, digital infrastructure, campus solutions and a vendor network built to scale.</p>
          <div class="hero__actions reveal"><a class="btn btn--primary magnetic" href="solutions.html">Explore ecosystem <span class="arrow">→</span></a><a class="btn btn--ghost magnetic" href="contact.html">Talk to us</a></div>
          <div class="hero__meta reveal">
            <div><b>22+</b><span>Solutions</span></div><div><b>200+</b><span>ERP modules</span></div><div><b>5</b><span>Practice areas</span></div><div><b>360°</b><span>Support</span></div>
          </div>
        </div>
        <div class="reveal"><div class="orbit"><div class="orbit__ring"></div><div class="orbit__ring"></div><div class="orbit__ring"></div><div class="orbit__ring"></div>
          <div class="orbit__core"><div><b>UC</b><br><span>ONE NETWORK</span></div></div><i class="orbit__sat a"></i><i class="orbit__sat b"></i><i class="orbit__sat c"></i></div></div>
      </div>
      <div class="scroll-cue"><i></i><span>Scroll to explore</span></div></section>`;

  return head(cfg) + header() + `<main class="page">` + hero + cfg.blocks.map(block).join("\n") + `</main>` + footer();
}

module.exports = { page, esc, inr, NAV, products };
