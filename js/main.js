/* Ultra Connect — main.js */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var iconsBase = "assets/icons.svg#";

  /* ---------- Sprite injection (for reliability) ---------- */
  function ensureSprite() {
    if (document.getElementById("uc-icons")) return;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "assets/icons.svg", true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        var doc = new DOMParser().parseFromString(xhr.responseText, "image/svg+xml");
        var svg = doc.querySelector("svg");
        if (svg) {
          svg.id = "uc-icons";
          svg.style.display = "none";
          document.body.insertBefore(svg, document.body.firstChild);
        }
      }
    };
    xhr.send();
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" aria-hidden="true" focusable="false"><use href="' + iconsBase + name + '"></use></svg>';
  }

  /* ---------- Sticky header ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 10) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile drawer ---------- */
  var drawer = document.querySelector(".drawer");
  var menuBtn = document.querySelector(".menu-btn");
  var drawerClose = document.querySelector(".drawer-close");
  var lastFocused = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var closeBtn = drawer.querySelector(".drawer-close");
    if (closeBtn) closeBtn.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }
  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawer) {
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) closeDrawer();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) closeDrawer();
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.is-open").forEach(function (m) { closeModal(m); });
      document.querySelectorAll(".modal-overlay.is-open").forEach(function (o) { closeModal(o); });
    }
  });

  /* ---------- Drawer accordion ---------- */
  document.querySelectorAll(".drawer-cat").forEach(function (btn) {
    if (btn.hasAttribute("data-menu")) return;
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var sub = btn.nextElementSibling;
      document.querySelectorAll(".drawer-cat[aria-expanded=\"true\"]").forEach(function (other) {
        if (other !== btn) {
          other.setAttribute("aria-expanded", "false");
          other.nextElementSibling.style.maxHeight = "0px";
        }
      });
      btn.setAttribute("aria-expanded", String(!expanded));
      if (sub) sub.style.maxHeight = !expanded ? sub.scrollHeight + "px" : "0px";
    });
  });

  /* ---------- Mega menu population ---------- */
  var megaGrid = document.querySelector(".mega-grid");
  if (megaGrid && window.UC_SOLUTIONS) {
    var html = "";
    window.UC_SOLUTIONS.groups.forEach(function (g) {
      html += '<div class="mega-col"><div class="mega-title">' + icon(g.icon) + g.label + "</div>";
      g.solutions.forEach(function (s) {
        html += '<a class="mega-link" href="solutions.html#' + s.id + '">' +
          icon(s.icon) + "<span><span class=\"mega-link-name\">" + s.name + "</span>" +
          '<span class="mega-link-desc">' + s.desc + "</span></span></a>";
      });
      html += "</div>";
    });
    megaGrid.innerHTML = html;
  }

  /* ---------- Mobile drawer solutions ---------- */
  var drawerCats = document.querySelectorAll(".drawer-cat[data-menu]");
  drawerCats.forEach(function (btn) {
    if (!window.UC_SOLUTIONS) return;
    var g = window.UC_SOLUTIONS.groups.filter(function (x) { return x.id === btn.getAttribute("data-menu"); })[0];
    if (!g) return;
    var sub = btn.nextElementSibling;
    var inner = sub.querySelector(".drawer-sub-inner");
    var html = "";
    g.solutions.forEach(function (s) {
      html += '<a href="solutions.html#' + s.id + '">' + s.name + "</a>";
    });
    inner.innerHTML = html;
    sub.style.maxHeight = "none";
    var open = sub.getBoundingClientRect().height;
    sub.style.maxHeight = "0px";
    var menuName = btn.querySelector(".drawer-cat-name");
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".drawer-cat[aria-expanded=\"true\"]").forEach(function (o) {
        if (o !== btn) {
          o.setAttribute("aria-expanded", "false");
          o.nextElementSibling.style.maxHeight = "0px";
        }
      });
      btn.setAttribute("aria-expanded", String(!expanded));
      sub.style.maxHeight = expanded ? "0px" : open + "px";
    });
  });

  /* ---------- Mega menu keyboard toggle ---------- */
  document.querySelectorAll(".nav-link[data-mega]").forEach(function (link) {
    link.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var expanded = link.getAttribute("aria-expanded") === "true";
        link.setAttribute("aria-expanded", String(!expanded));
        if (!expanded) link.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      }
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Modals ---------- */
  function openModal(id) {
    var ov = document.querySelector('.modal-overlay[data-modal="' + id + '"]');
    var modal = document.getElementById(id);
    if (ov) ov.classList.add("is-open");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      var head = modal.querySelector(".modal-head");
      if (head) head.focus();
      else modal.setAttribute("tabindex", "-1"), modal.focus();
      document.body.style.overflow = "hidden";
    }
  }
  function closeModal(elm) {
    if (elm.classList.contains("modal-overlay")) {
      var id = elm.getAttribute("data-modal");
      var modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
      }
      elm.classList.remove("is-open");
      var opener = document.querySelector('[data-open-modal="' + id + '"]');
      if (opener) opener.focus();
      document.body.style.overflow = "";
    } else {
      document.querySelectorAll(".modal.is-open, .modal-overlay.is-open").forEach(function (m) { m.classList.remove("is-open"); });
      document.body.style.overflow = "";
    }
  }
  document.querySelectorAll("[data-open-modal]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal(btn.getAttribute("data-open-modal"));
    });
  });
  document.querySelectorAll(".modal-overlay").forEach(function (ov) {
    ov.addEventListener("click", function () { closeModal(ov); });
  });
  document.querySelectorAll(".modal .modal-close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById("lead-form");
  if (form) {
    var preset = new URLSearchParams(window.location.search).get("interest");
    var interestSelect = document.getElementById("interest");
    if (preset && interestSelect) {
      var matched = Array.prototype.filter.call(interestSelect.options, function (o) {
        return o.value.toLowerCase() === preset.toLowerCase();
      });
      if (matched.length) interestSelect.value = matched[0].value;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      ["name", "school", "phone", "email"].forEach(function (id) {
        var f = document.getElementById(id);
        if (!f) return;
        var field = f.closest(".form-field");
        if (!f.value.trim()) {
          f.setAttribute("aria-invalid", "true");
          if (field) field.classList.add("has-error");
          valid = false;
        } else {
          f.removeAttribute("aria-invalid");
          if (field) field.classList.remove("has-error");
        }
      });
      var phone = document.getElementById("phone");
      if (phone && phone.value.trim() && !/^[0-9+\-\s]{7,15}$/.test(phone.value.trim())) {
        phone.setAttribute("aria-invalid", "true");
        phone.closest(".form-field").classList.add("has-error");
        valid = false;
      }
      var email = document.getElementById("email");
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.setAttribute("aria-invalid", "true");
        email.closest(".form-field").classList.add("has-error");
        valid = false;
      }
      if (!valid) return;
      var success = document.getElementById("form-success");
      if (success) success.classList.add("is-visible");
      form.hidden = true;
      success.setAttribute("tabindex", "-1");
      if (success) success.focus();
    });

    form.querySelectorAll(".form-input, .form-select, .form-textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".form-field");
        if (field && field.classList.contains("has-error") && input.value.trim()) {
          input.removeAttribute("aria-invalid");
          field.classList.remove("has-error");
        }
      });
    });
  }

  /* ---------- Smooth anchor offset ---------- */
  if (header && !reduced) {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var hash = a.getAttribute("href");
        if (hash.length < 2) return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 8;
        window.scrollTo({ top: top, behavior: "smooth" });
        history.replaceState(null, "", hash);
      });
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  ensureSprite();
})();
