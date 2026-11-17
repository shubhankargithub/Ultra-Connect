/* Ultra Connect v2 — motion engine */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- scroll progress + header ---------- */
  var progress = $(".progress"), header = $(".site-header");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    if (header) header.classList.toggle("is-scrolled", h.scrollTop > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile drawer ---------- */
  var menu = $(".menu-btn"), drawer = $(".drawer");
  if (menu && drawer) {
    menu.setAttribute("aria-label", "Open menu");
    menu.addEventListener("click", function () {
      var open = drawer.classList.toggle("is-open");
      menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.textContent = open ? "✕" : "☰";
    });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", function () { drawer.classList.remove("is-open"); menu.textContent = "☰"; }); });
  }

  /* ---------- active nav ---------- */
  var here = location.pathname.split("/").pop() || "index.html";
  $$('.nav a[href$=".html"], .drawer a[href$=".html"]').forEach(function (a) {
    if (a.getAttribute("href") === here) a.classList.add("is-active");
  });

  /* ---------- reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el, i) {
      if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", (Math.min(i % 6, 5) * 0.075) + "s");
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- counters ---------- */
  var counters = $$("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    if (reduced) { el.textContent = prefix + target + suffix; return; }
    var start = performance.now(), dur = 1600;
    function tick(t) {
      var p = Math.min((t - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else { counters.forEach(runCounter); }

  /* ---------- hero typewriter ---------- */
  var typed = $("[data-type]");
  if (typed && !reduced) {
    var words = (typed.getAttribute("data-type") || "").split("|");
    var wi = 0, ci = 0, deleting = false;
    function typeStep() {
      var w = words[wi] || "";
      ci += deleting ? -1 : 1;
      typed.textContent = w.slice(0, ci);
      var delay = deleting ? 55 : 105;
      if (!deleting && ci === w.length) { deleting = true; delay = 1900; }
      else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 350; }
      setTimeout(typeStep, delay);
    }
    typeStep();
  }

  /* ---------- live terminal ---------- */
  var logs = [
    "SIGNAL :: campus telemetry stream initialized",
    "ERP SYNC :: attendance ledger verified <b>OK</b>",
    "DEPLOY :: academic workspace provisioned",
    "AI ENGINE :: intent model confidence <b>98.4%</b>",
    "SECURE :: access control handshake complete",
    "PARTNER :: vendor catalogue indexed <b>31</b> items",
    "INSIGHT :: student engagement trend rising",
    "NETWORK :: 5 practice clusters online <b>OK</b>"
  ];
  var term = $(".terminal__body");
  if (term && !reduced) {
    var li = 0;
    function addLog() {
      var p = document.createElement("p");
      var t = new Date().toTimeString().slice(0, 8);
      p.innerHTML = "<b>[" + t + "]</b> " + logs[li % logs.length];
      term.appendChild(p);
      while (term.children.length > 6) term.removeChild(term.firstChild);
      li++;
    }
    for (var k = 0; k < 5; k++) addLog();
    setInterval(addLog, 2600);
  }

  /* ---------- cursor glow ---------- */
  if (!reduced && window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("pointermove", function (e) {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });
  }

  /* ---------- ambient particle canvas ---------- */
  var canvas = $("#ambient");
  if (canvas && !reduced) {
    var ctx = canvas.getContext("2d"), w = 0, h = 0, dots = [], mouse = { x: -999, y: -999 };
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(70, Math.floor((w * h) / 26000));
      dots = [];
      for (var i = 0; i < count; i++) dots.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
        r: Math.random() * 1.3 + .5
      });
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        var md = Math.hypot(mouse.x - d.x, mouse.y - d.y);
        if (md < 150) { d.x += (d.x - mouse.x) * .008; d.y += (d.y - mouse.y) * .008; }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,211,238,.5)"; ctx.fill();
        for (var j = i + 1; j < dots.length; j++) {
          var o = dots[j], dist = Math.hypot(d.x - o.x, d.y - o.y);
          if (dist < 125) {
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = "rgba(34,211,238," + (0.1 * (1 - dist / 125)) + ")";
            ctx.lineWidth = .6; ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    size(); frame();
  }

  /* ---------- tilt cards ---------- */
  if (!reduced && window.matchMedia("(pointer:fine)").matches) {
    $$(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = "perspective(900px) rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg) translateY(-6px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduced && window.matchMedia("(pointer:fine)").matches) {
    $$(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .16).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * .22).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- product filters ---------- */
  var filters = $$(".filter"), prods = $$(".prod");
  filters.forEach(function (f) {
    f.addEventListener("click", function () {
      filters.forEach(function (x) { x.classList.remove("is-active"); });
      f.classList.add("is-active");
      var cat = f.getAttribute("data-filter");
      prods.forEach(function (p) {
        p.hidden = cat !== "all" && p.getAttribute("data-cat") !== cat;
      });
    });
  });

  /* ---------- contact form (static demo: acknowledge locally) ---------- */
  var form = $("#contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.hidden = true;
      var ok = $(".form-success");
      if (ok) { ok.classList.add("is-visible"); ok.setAttribute("tabindex", "-1"); ok.focus(); }
    });
  }

  /* ---------- footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
