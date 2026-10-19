/* Ultra Connect — Portal SPA (CRM, vendors, orders, invoices, finance) */
(function () {
  "use strict";

  var state = { user: null, products: [], notifications: [] };

  /* ---------- utils ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function money(n) { return "\u20B9" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
  function fmtDate(d) { if (!d) return "\u2014"; var s = String(d).slice(0, 10); var p = s.split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function toast(msg, isErr) {
    var t = document.createElement("div");
    t.className = "toast" + (isErr ? " is-error" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function api(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || ("Request failed (" + r.status + ")"));
        return data;
      });
    });
  }

  /* ---------- modal ---------- */
  function openModal(title, innerHtml, onMount) {
    var back = $("#modal-backdrop"), card = $("#modal-card");
    card.innerHTML = '<div class="modal-head"><h2>' + esc(title) + '</h2><button type="button" class="modal-close" aria-label="Close">\u2715</button></div><div class="modal-inner">' + innerHtml + "</div>";
    back.hidden = false;
    $(".modal-close", card).addEventListener("click", closeModal);
    back.addEventListener("click", function (e) { if (e.target === back) closeModal(); }, { once: true });
    if (onMount) onMount(card);
  }
  function closeModal() { $("#modal-backdrop").hidden = true; $("#modal-card").innerHTML = ""; }

  /* ================= AUTH ================= */
  function showLogin() {
    $("#login-view").hidden = false;
    $("#app-view").hidden = true;
    $("#vendor-register-view").hidden = true;
    $("#reset-view").hidden = true;
  }

  function doLogin(role, email, password) {
    var err = $("#login-error");
    err.hidden = true;
    api("POST", "/api/auth/login", { email: email, password: password })
      .then(function (d) {
        if (role === "vendor" && d.user.role !== "vendor") {
          toast("This account is not a vendor account.", true);
        }
        state.user = d.user;
        bootApp();
      })
      .catch(function (e) {
        err.textContent = e.message;
        err.hidden = false;
      });
  }

  function bootApp() {
    $("#login-view").hidden = true;
    $("#vendor-register-view").hidden = true;
    $("#reset-view").hidden = true;
    $("#app-view").hidden = false;
    $("#whoami").innerHTML = "<strong>" + esc(state.user.name) + "</strong><span>" + esc(state.user.role) + "</span>";
    buildNav();
    loadNotifications();
    route();
    setInterval(loadNotifications, 60000);
  }

  /* ================= NAV ================= */
  var ADMIN_NAV = [
    ["Dashboard", "#/dashboard", "\u25A3"],
    ["Leads (CRM)", "#/leads", "\u2630"],
    ["Follow-ups", "#/follow-ups", "\u23F0"],
    ["Field Visits", "#/visits", "\u2691"],
    ["Enquiries", "#/enquiries", "\u2709"],
    ["Orders", "#/orders", "\u25A4"],
    ["Invoices", "#/invoices", "\u2691"],
    ["Payments", "#/payments", "\u20B9"],
    ["Products", "#/products-admin", "\u25C8"],
    ["Inventory", "#/inventory", "\u25A6"],
    ["Vendors", "#/vendors", "\u2696"],
    ["Finance", "#/finance", "\u2211"],
    ["Team & Roles", "#/team", "\u263A"],
    ["Reports", "#/reports", "\u2193"],
    ["Notifications", "#/notifications", "\u25CF"]
  ];
  var EMPLOYEE_NAV = [
    ["Dashboard", "#/dashboard", "\u25A3"],
    ["Leads (CRM)", "#/leads", "\u2630"],
    ["Follow-ups", "#/follow-ups", "\u23F0"],
    ["Field Visits", "#/visits", "\u2691"],
    ["Enquiries", "#/enquiries", "\u2709"],
    ["Orders", "#/orders", "\u25A4"],
    ["Invoices", "#/invoices", "\u2691"],
    ["Payments", "#/payments", "\u20B9"],
    ["Products", "#/products-admin", "\u25C8"],
    ["Inventory", "#/inventory", "\u25A6"],
    ["Notifications", "#/notifications", "\u25CF"]
  ];
  var VENDOR_NAV = [
    ["Dashboard", "#/dashboard", "\u25A3"],
    ["My Products", "#/products-admin", "\u25C8"],
    ["Orders", "#/orders", "\u25A4"],
    ["Inventory", "#/inventory", "\u25A6"],
    ["Notifications", "#/notifications", "\u25CF"]
  ];

  function navFor() {
    if (state.user.role === "admin") return ADMIN_NAV;
    if (state.user.role === "vendor") return VENDOR_NAV;
    return EMPLOYEE_NAV;
  }
  function buildNav() {
    var nav = $("#sidebar-nav");
    nav.innerHTML = navFor().map(function (n) {
      return '<button type="button" class="side-link" data-href="' + n[1] + '"><span class="ico">' + n[2] + "</span>" + esc(n[0]) + "</button>";
    }).join("");
    $$(".side-link", nav).forEach(function (b) {
      b.addEventListener("click", function () {
        location.hash = b.getAttribute("data-href");
        $("#sidebar-nav").parentElement.classList.remove("is-open");
      });
    });
  }
  function setActiveNav(hash) {
    var base = "#/" + (hash.replace(/^#\//, "").split("/")[0] || "dashboard");
    $$(".side-link").forEach(function (b) {
      var bh = b.getAttribute("data-href");
      b.classList.toggle("is-active", bh === base || (base === "#/leads" && bh === "#/leads"));
    });
  }

  /* ================= ROUTER ================= */
  function route() {
    if (!state.user) return;
    var hash = location.hash || "#/dashboard";
    var parts = hash.replace(/^#\//, "").split("/");
    var name = parts[0], id = parts[1] || null;
    setActiveNav(hash);
    var map = {
      "dashboard": viewDashboard,
      "leads": function () { id ? viewLeadDetail(id) : viewLeads(); },
      "follow-ups": viewFollowUps,
      "visits": viewVisits,
      "enquiries": viewEnquiries,
      "orders": function () { id ? viewOrderDetail(id) : viewOrders(); },
      "invoices": function () { id ? viewInvoice(id) : viewInvoices(); },
      "payments": viewPayments,
      "products-admin": viewProductsAdmin,
      "inventory": viewInventory,
      "vendors": viewVendors,
      "finance": viewFinance,
      "team": viewTeam,
      "reports": viewReports,
      "notifications": viewNotifications
    };
    var fn = map[name] || viewDashboard;
    var roleGated = { finance: ["admin"], team: ["admin"], vendors: ["admin"], reports: ["admin", "employee"] };
    if (roleGated[name] && roleGated[name].indexOf(state.user.role) < 0) {
      setTitle("Dashboard");
      location.hash = "#/dashboard";
      return;
    }
    Promise.resolve(fn(id)).catch(function (e) {
      if (/Forbidden/i.test(e.message)) {
        setContent('<div class="panel"><div class="panel-body"><h2 style="margin-top:0">Access restricted</h2><p>This module is not available for your role.</p><a class="btn btn--ghost btn--sm" href="#/dashboard">Back to dashboard</a></div></div>');
      } else {
        toast(e.message, true);
      }
    });
  }
  window.addEventListener("hashchange", function () { if (state.user) route(); });

  function setContent(html) { $("#content").innerHTML = html; }
  function setTitle(t) { $("#page-title").textContent = t; }

  /* ================= DASHBOARD ================= */
  function viewDashboard() {
    setTitle("Dashboard");
    return api("GET", "/api/dashboard").then(function (d) {
      var s = d.dashboard, u = state.user;
      if (u.role === "admin") return renderAdminDash(s);
      if (u.role === "vendor") return renderVendorDash(s);
      return renderEmployeeDash(s);
    });
  }
  function badge(status) {
    var map = {
      "New": "badge--new", "Contacted": "badge--contacted", "Follow-up Scheduled": "badge--follow",
      "Closed-Won": "badge--won", "Closed-Lost": "badge--lost", "Placed": "badge--new", "Confirmed": "badge--contacted",
      "Dispatched": "badge--follow", "Delivered": "badge--won", "Cancelled": "badge--danger",
      "paid": "badge--ok", "issued": "badge--warn", "received": "badge--ok", "pending": "badge--warn",
      "active": "badge--ok", "rejected": "badge--danger", "overdue": "badge--danger", "done": "badge--ok"
    };
    return '<span class="badge ' + (map[status] || "badge--neutral") + '">' + esc(status) + "</span>";
  }
  function statCard(lbl, val, sub, cls) {
    return '<div class="stat-card' + (cls ? " " + cls : "") + '"><div class="lbl">' + esc(lbl) + '</div><div class="val">' + val + '</div>' + (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div>";
  }
  function renderAdminDash(s) {
    var pipeline = (s.pipeline || []).map(function (p) {
      var max = Math.max.apply(null, (s.pipeline || []).map(function (x) { return x.n; }).concat([1]));
      return '<div class="pipe-row"><span>' + esc(p.status) + '</span><div class="pipe-bar"><i style="width:' + Math.round(p.n / max * 100) + '%"></i></div><span class="num">' + p.n + "</span></div>";
    }).join("");
    var leads = (s.recentLeads || []).map(function (l) {
      return "<tr><td class='strong'><a href='#/leads/" + l.id + "'>" + esc(l.name) + "</a><br><span style='color:var(--muted);font-size:13px'>" + esc(l.organization || "") + "</span></td><td>" + badge(l.status) + "</td><td>" + esc(l.assignee_name || "Unassigned") + "</td><td class='num'>" + fmtDate(l.follow_up_date) + "</td></tr>";
    }).join("");
    var orders = (s.recentOrders || []).map(function (o) {
      return "<tr><td class='strong'><a href='#/orders/" + o.id + "'>" + esc(o.order_no) + "</a></td><td>" + esc(o.customer_name) + "</td><td>" + badge(o.status) + "</td><td class='num'>" + money(o.total) + "</td></tr>";
    }).join("");
    var top = (s.topProducts || []).map(function (p) {
      return "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.category) + "</td><td class='num'>" + p.units_sold + "</td></tr>";
    }).join("");
    setContent(
      '<div class="stat-grid">' +
      statCard("Total Leads", s.leads, s.newLeads + " new") +
      statCard("Closed Won", s.won, null, "is-ok") +
      statCard("Follow-ups Pending", s.pendingFu, s.overdueFu + " overdue", s.overdueFu ? "is-danger" : "") +
      statCard("Orders", s.orders, money(s.orderValue) + " value") +
      statCard("Payments Received", money(s.paymentsReceived), null, "is-ok") +
      statCard("Vendors", s.vendors, s.pendingVendors + " awaiting approval", s.pendingVendors ? "is-warn" : "") +
      statCard("Pending Products", s.pendingProducts, "need review", s.pendingProducts ? "is-warn" : "") +
      statCard("Low Stock Items", s.lowStock, "at or below 5 units", s.lowStock ? "is-warn" : "") +
      statCard("Enquiries", s.enquiries) +
      statCard("Net (Income−Expense)", money(s.income - s.expense), money(s.income) + " in / " + money(s.expense) + " out", (s.income - s.expense) >= 0 ? "is-ok" : "is-danger") +
      "</div>" +
      '<div class="panel"><div class="panel-head"><h2>Lead Pipeline</h2><a class="btn btn--ghost btn--sm" href="#/leads">Open CRM</a></div><div class="panel-body"><div class="pipe">' + (pipeline || '<div class="empty">No leads yet</div>') + "</div></div></div>" +
      '<div class="panel"><div class="panel-head"><h2>Recent Leads</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Status</th><th>Assigned</th><th>Follow-up</th></tr></thead><tbody>' + (leads || '<tr><td colspan="4" class="empty">No leads yet</td></tr>') + "</tbody></table></div></div>" +
      '<div class="panel"><div class="panel-head"><h2>Recent Orders</h2><a class="btn btn--ghost btn--sm" href="#/orders">All orders</a></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>' + (orders || '<tr><td colspan="4" class="empty">No orders yet</td></tr>') + "</tbody></table></div></div>" +
      '<div class="panel"><div class="panel-head"><h2>Best Sellers</h2><a class="btn btn--ghost btn--sm" href="/api/reports/sales.csv">Export sales CSV</a></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Category</th><th>Units Sold</th></tr></thead><tbody>' + (top || '<tr><td colspan="3" class="empty">No sales yet</td></tr>') + "</tbody></table></div></div>"
    );
  }
  function renderEmployeeDash(s) {
    var leads = (s.recentLeads || []).map(function (l) {
      return "<tr><td class='strong'><a href='#/leads/" + l.id + "'>" + esc(l.name) + "</a><br><span style='color:var(--muted);font-size:13px'>" + esc(l.organization || "") + "</span></td><td>" + badge(l.status) + "</td><td class='num'>" + fmtDate(l.follow_up_date) + "</td></tr>";
    }).join("");
    setContent(
      '<div class="stat-grid">' +
      statCard("My Leads", s.leads, s.newLeads + " new") +
      statCard("Closed Won", s.won, null, "is-ok") +
      statCard("Follow-ups Pending", s.pendingFu, s.overdueFu + " overdue", s.overdueFu ? "is-danger" : "") +
      statCard("My Orders", s.myOrders) +
      statCard("Field Visits Logged", s.myVisits) +
      "</div>" +
      '<div class="panel"><div class="panel-head"><h2>My Recent Leads</h2><div class="btn-row"><a class="btn btn--ghost btn--sm" href="#/leads">Open CRM</a><a class="btn btn--primary btn--sm" href="#/leads" data-new-lead>+ New Lead</a></div></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Status</th><th>Follow-up</th></tr></thead><tbody>' + (leads || '<tr><td colspan="3" class="empty">No leads assigned yet</td></tr>') + "</tbody></table></div></div>"
    );
  }
  function renderVendorDash(s) {
    var v = s.vendor || {};
    setContent(
      '<div class="stat-grid">' +
      statCard("Account Status", v.approved ? "Approved" : "Pending", v.approved ? "You can list products" : "Awaiting admin approval", v.approved ? "is-ok" : "is-warn") +
      statCard("My Products", s.myProducts || 0, (s.myPending || 0) + " pending approval") +
      statCard("Orders Containing My Items", (s.myOrderItems && s.myOrderItems.orders) || 0) +
      statCard("Order Value", money((s.myOrderItems && s.myOrderItems.value) || 0)) +
      "</div>" +
      '<div class="panel"><div class="panel-head"><h2>' + esc(v.company_name || "Vendor") + "</h2><a class='btn btn--primary btn--sm' href='#/products-admin'>Manage products</a></div><div class='panel-body'><p>List products, keep prices and stock current, and track orders containing your items. Every change you make is logged and visible to the Ultra Connect admin.</p></div></div>"
    );
  }

  /* ================= LEADS ================= */
  function viewLeads() {
    setTitle("Leads (CRM)");
    var params = new URLSearchParams();
    var statusFilter = state._leadStatus || "";
    var q = state._leadQuery || "";
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    return api("GET", "/api/leads?" + params.toString()).then(function (d) {
      var rows = d.leads.map(function (l) {
        return "<tr><td class='strong'><a href='#/leads/" + l.id + "'>" + esc(l.name) + "</a><br><span style='color:var(--muted);font-size:13px'>" + esc(l.organization || "") + "</span></td>" +
          "<td>" + (l.phone ? "<a href='tel:" + esc(l.phone) + "'>" + esc(l.phone) + "</a>" : "\u2014") + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(l.email || "") + "</span></td>" +
          "<td style='max-width:220px'>" + esc(l.products_interest || "\u2014") + "</td>" +
          "<td>" + badge(l.status) + "</td>" +
          "<td>" + esc(l.assignee_name || "Unassigned") + "</td>" +
          "<td class='num'>" + fmtDate(l.follow_up_date) + "</td>" +
          "<td><div class='btn-row'><a class='btn btn--ghost btn--sm' href='#/leads/" + l.id + "'>Open</a></div></td></tr>";
      }).join("");
      setContent(
        '<div class="toolbar">' +
        '<select class="pf-select" id="lead-status-filter"><option value="">All statuses</option>' +
        ["New", "Contacted", "Follow-up Scheduled", "Closed-Won", "Closed-Lost"].map(function (s) { return '<option' + (s === statusFilter ? " selected" : "") + ">" + s + "</option>"; }).join("") +
        '</select>' +
        '<input class="pf-input" id="lead-search" placeholder="Search name, school, phone\u2026" value="' + esc(q) + '">' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--primary btn--sm" id="new-lead-btn">+ New Lead</button>' +
        "</div>" +
        '<div class="panel"><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Contact</th><th>Interested In</th><th>Status</th><th>Assigned</th><th>Follow-up</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">No leads found. New website enquiries appear here automatically.</td></tr>') +
        "</tbody></table></div></div>"
      );
      $("#lead-status-filter").addEventListener("change", function () { state._leadStatus = this.value; viewLeads(); });
      var st; $("#lead-search").addEventListener("input", function () { var v = this.value; clearTimeout(st); st = setTimeout(function () { state._leadQuery = v; viewLeads(); }, 350); });
      $("#new-lead-btn").addEventListener("click", function () { leadForm(null); });
    });
  }

  function leadForm(lead) {
    var isEdit = !!lead;
    var interests = ["School ERP", "Interactive Flat Panels", "Website Design", "Biometric Systems", "STEM / Robotics Labs", "Adobe Education", "School Affiliation Support", "Higher Education Programs", "School Financing / Loans", "Library Books", "School & Office Furniture", "Grass Carpeting", "Water Fountains", "Automatic Period Bell", "Hostel Kitchen Setup", "Landscape & Construction", "Playground & Sports", "CCTV & Security", "School & Campus Security", "School & College Uniforms", "Indoor & Outdoor Play", "School Cinema", "School Branding", "Other"];
    openModal(isEdit ? "Edit Lead #" + lead.id : "New Lead", 
      '<div class="form-rows">' +
      field("lf-name", "Full name *", lead ? lead.name : "") +
      field("lf-org", "School / Organisation", lead ? lead.organization : "") +
      field("lf-desig", "Designation", lead ? lead.designation : "") +
      field("lf-phone", "Phone", lead ? lead.phone : "") +
      field("lf-email", "Email", lead ? lead.email : "", "email") +
      field("lf-city", "City", lead ? lead.city : "") +
      '<div class="full"><label class="pf-label">Address</label><textarea class="pf-textarea" id="lf-address" rows="2">' + esc(lead ? lead.address : "") + "</textarea></div>" +
      field("lf-students", "Number of students", lead ? lead.students : "") +
      '<div><label class="pf-label">Status</label><select class="pf-select" id="lf-status">' +
      ["New", "Contacted", "Follow-up Scheduled", "Closed-Won", "Closed-Lost"].map(function (s) { return '<option' + (lead && lead.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="full"><label class="pf-label">Products / solutions of interest</label><select class="pf-select" id="lf-interest" multiple size="5">' +
      interests.map(function (s) { var sel = lead && (lead.products_interest || "").indexOf(s) > -1 ? " selected" : ""; return "<option" + sel + ">" + s + "</option>"; }).join("") +
      "</select><input class='pf-input' id='lf-interest-other' placeholder='Or type custom (comma separated)' style='margin-top:8px' value='" + esc(lead ? lead.products_interest : "") + "'></div>" +
      '<div><label class="pf-label">Next follow-up date</label><input class="pf-input" type="date" id="lf-follow" value="' + esc(lead && lead.follow_up_date ? lead.follow_up_date : "") + '"></div>' +
      '<div><label class="pf-label">Follow-up notes</label><input class="pf-input" id="lf-follow-notes" placeholder="Optional"></div>' +
      '<div class="full"><label class="pf-label">Notes (A–Z details)</label><textarea class="pf-textarea" id="lf-notes" rows="3">' + esc(lead ? lead.notes : "") + "</textarea></div>" +
      (state.user.role === "admin" ? '<div class="full" id="assign-wrap"><label class="pf-label">Assign to</label><select class="pf-select" id="lf-assign"><option value="">Unassigned</option></select></div>' : "") +
      "</div>" +
      '<div class="btn-row" style="margin-top:20px"><button class="btn btn--primary" id="lf-save">' + (isEdit ? "Save changes" : "Create lead") + '</button><button class="btn btn--ghost" id="lf-cancel">Cancel</button></div>',
      function (card) {
        $("#lf-cancel", card).addEventListener("click", closeModal);
        if (state.user.role === "admin") {
          api("GET", "/api/admin/users").then(function (d) {
            var sel = $("#lf-assign", card);
            d.users.filter(function (u) { return u.role === "admin" || u.role === "employee"; }).forEach(function (u) {
              var o = document.createElement("option"); o.value = u.id; o.textContent = u.name + " (" + u.role + ")";
              if (lead && lead.assigned_to === u.id) o.selected = true;
              sel.appendChild(o);
            });
          });
        }
        $("#lf-save", card).addEventListener("click", function () {
          var selected = $$("#lf-interest option:selected", card).map(function (o) { return o.value; });
          var custom = $("#lf-interest-other", card).value.trim();
          var interest = custom || selected.join("; ");
          var payload = {
            name: $("#lf-name", card).value.trim(),
            organization: $("#lf-org", card).value.trim(),
            designation: $("#lf-desig", card).value.trim(),
            phone: $("#lf-phone", card).value.trim(),
            email: $("#lf-email", card).value.trim(),
            city: $("#lf-city", card).value.trim(),
            address: $("#lf-address", card).value.trim(),
            students: $("#lf-students", card).value.trim(),
            status: $("#lf-status", card).value,
            products_interest: interest,
            follow_up_date: $("#lf-follow", card).value || null,
            follow_up_notes: $("#lf-follow-notes", card).value.trim(),
            notes: $("#lf-notes", card).value.trim()
          };
          if (state.user.role === "admin") payload.assigned_to = $("#lf-assign", card).value || null;
          if (!payload.name) return toast("Name is required", true);
          var p = isEdit ? api("PUT", "/api/leads/" + lead.id, payload) : api("POST", "/api/leads", payload);
          p.then(function () { closeModal(); toast(isEdit ? "Lead updated" : "Lead created"); viewLeads(); }).catch(function (e) { toast(e.message, true); });
        });
      });
  }

  function field(id, label, value, type) {
    return '<div><label class="pf-label" for="' + id + '">' + esc(label) + '</label><input class="pf-input" type="' + (type || "text") + '" id="' + id + '" value="' + esc(value || "") + '"></div>';
  }

  function viewLeadDetail(id) {
    setTitle("Lead Detail");
    return api("GET", "/api/leads/" + id).then(function (d) {
      var l = d.lead;
      var history = (d.history || []).map(function (h) {
        return '<li><div class="t">' + esc(h.action) + " \u2014 " + esc(h.user_name || "System") + '</div><div class="d">' + esc(h.detail) + " \u00B7 " + esc(new Date(h.created_at + "Z").toLocaleString("en-IN")) + "</div></li>";
      }).join("");
      var visits = (d.visits || []).map(function (v) {
        return "<tr><td class='num'>" + fmtDate(v.visit_date) + "</td><td>" + esc(v.discussion) + "</td><td>" + esc(v.outcome) + "</td></tr>";
      }).join("");
      var fus = (d.followUps || []).map(function (f) {
        return "<tr><td class='num'>" + fmtDate(f.due_date) + "</td><td>" + esc(f.notes) + "</td><td>" + badge(f.status) + "</td><td>" + (f.status === "pending" ? "<button class='btn btn--ghost btn--sm' data-done-fu='" + f.id + "'>Mark done</button>" : "") + "</td></tr>";
      }).join("");
      var orders = (d.orders || []).map(function (o) {
        return "<tr><td><a href='#/orders/" + o.id + "'>" + esc(o.order_no) + "</a></td><td>" + badge(o.status) + "</td><td class='num'>" + money(o.total) + "</td></tr>";
      }).join("");
      setContent(
        '<div class="toolbar"><a class="btn btn--ghost btn--sm" href="#/leads">\u2190 Back to leads</a><div class="spacer"></div>' +
        '<button class="btn btn--ghost btn--sm" id="edit-lead">Edit lead</button>' +
        '<button class="btn btn--ghost btn--sm" id="add-visit">+ Log visit</button>' +
        '<button class="btn btn--ghost btn--sm" id="add-fu">+ Schedule follow-up</button>' +
        '<button class="btn btn--primary btn--sm" id="new-order">+ Create order</button>' +
        (state.user.role === "admin" ? '<button class="btn btn--danger btn--sm" id="del-lead">Delete</button>' : "") +
        "</div>" +
        '<div class="detail-grid">' +
        '<div class="panel"><div class="panel-head"><h2>' + esc(l.name) + "</h2>" + badge(l.status) + '</div><div class="panel-body"><dl class="kv">' +
        "<dt>Organisation</dt><dd>" + esc(l.organization || "\u2014") + "</dd>" +
        "<dt>Designation</dt><dd>" + esc(l.designation || "\u2014") + "</dd>" +
        "<dt>Phone</dt><dd>" + esc(l.phone || "\u2014") + "</dd>" +
        "<dt>Email</dt><dd>" + esc(l.email || "\u2014") + "</dd>" +
        "<dt>City</dt><dd>" + esc(l.city || "\u2014") + "</dd>" +
        "<dt>Address</dt><dd>" + esc(l.address || "\u2014") + "</dd>" +
        "<dt>Students</dt><dd>" + esc(l.students || "\u2014") + "</dd>" +
        "<dt>Interested in</dt><dd>" + esc(l.products_interest || "\u2014") + "</dd>" +
        "<dt>Assigned to</dt><dd>" + esc(l.assignee_name || "Unassigned") + "</dd>" +
        "<dt>Source</dt><dd>" + esc(l.source) + "</dd>" +
        "<dt>Next follow-up</dt><dd>" + fmtDate(l.follow_up_date) + "</dd>" +
        "<dt>Notes</dt><dd>" + esc(l.notes || "\u2014") + "</dd>" +
        "</dl></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Activity history</h2></div><div class="panel-body"><ul class="timeline">' + (history || "<li>No activity yet</li>") + "</ul></div></div>" +
        "</div>" +
        '<div class="panel"><div class="panel-head"><h2>Follow-ups</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Due</th><th>Notes</th><th>Status</th><th></th></tr></thead><tbody>' + (fus || '<tr><td colspan="4" class="empty">No follow-ups scheduled</td></tr>') + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Field visits</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Discussion</th><th>Outcome</th></tr></thead><tbody>' + (visits || '<tr><td colspan="3" class="empty">No visits logged</td></tr>') + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Orders</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Status</th><th>Total</th></tr></thead><tbody>' + (orders || '<tr><td colspan="3" class="empty">No orders yet</td></tr>') + "</tbody></table></div></div>"
      );
      $("#edit-lead").addEventListener("click", function () { leadForm(l); });
      $("#add-visit").addEventListener("click", function () { visitForm(l); });
      $("#add-fu").addEventListener("click", function () { followUpForm(l); });
      $("#new-order").addEventListener("click", function () { orderForm(l); });
      $$("[data-done-fu]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("POST", "/api/follow-ups/" + b.getAttribute("data-done-fu") + "/complete", {}).then(function () { toast("Follow-up completed"); route(); });
        });
      });
      var del = $("#del-lead");
      if (del) del.addEventListener("click", function () {
        if (!confirm("Delete this lead permanently?")) return;
        api("DELETE", "/api/leads/" + l.id).then(function () { toast("Lead deleted"); location.hash = "#/leads"; });
      });
    });
  }

  /* ================= FOLLOW-UPS ================= */
  function viewFollowUps() {
    setTitle("Follow-up Scheduler");
    return api("GET", "/api/follow-ups").then(function (d) {
      var rows = d.followUps.map(function (f) {
        var overdue = f.status === "pending" && f.due_date < today();
        return "<tr><td class='num'>" + fmtDate(f.due_date) + (overdue ? " " + badge("overdue") : "") + "</td>" +
          "<td class='strong'><a href='#/leads/" + f.lead_id + "'>" + esc(f.lead_name) + "</a><br><span style='color:var(--muted);font-size:13px'>" + esc(f.organization || "") + "</span></td>" +
          "<td>" + esc(f.notes || "\u2014") + "</td><td>" + badge(f.status) + "</td>" +
          "<td>" + (f.status === "pending" ? "<button class='btn btn--ghost btn--sm' data-done='" + f.id + "'>Mark done</button>" : "") + "</td></tr>";
      }).join("");
      setContent(
        '<div class="panel"><div class="panel-head"><h2>Follow-up schedule</h2><span class="badge badge--info">Default gap: 15 days</span></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Due date</th><th>Lead</th><th>Notes</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5" class="empty">No follow-ups scheduled</td></tr>') + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>How reminders work</h2></div><div class="panel-body"><p>One day before each due date the system notifies both the assigned team member and the customer (email + WhatsApp/SMS channel log). Overdue follow-ups are automatically flagged so nothing slips through.</p></div></div>'
      );
      $$("[data-done]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("POST", "/api/follow-ups/" + b.getAttribute("data-done") + "/complete", {}).then(function () { toast("Marked done"); viewFollowUps(); });
        });
      });
    });
  }
  function followUpForm(lead) {
    openModal("Schedule follow-up", 
      '<label class="pf-label">Due date</label><input class="pf-input" type="date" id="fu-date" value="' + addDays(15) + '">' +
      '<label class="pf-label">Notes</label><textarea class="pf-textarea" id="fu-notes" rows="3" placeholder="What should be discussed?"></textarea>' +
      '<div class="btn-row" style="margin-top:18px"><button class="btn btn--primary" id="fu-save">Schedule</button></div>',
      function (card) {
        $("#fu-save", card).addEventListener("click", function () {
          api("POST", "/api/follow-ups", { lead_id: lead.id, due_date: $("#fu-date", card).value, notes: $("#fu-notes", card).value }).then(function () {
            closeModal(); toast("Follow-up scheduled"); route();
          }).catch(function (e) { toast(e.message, true); });
        });
      });
  }

  /* ================= VISITS ================= */
  function viewVisits() {
    setTitle("Field Visit Tracking (CRM Diary)");
    return api("GET", "/api/visits").then(function (d) {
      var rows = d.visits.map(function (v) {
        return "<tr><td class='num'>" + fmtDate(v.visit_date) + "</td><td class='strong'>" + esc(v.lead_name || v.client_name) + "</td><td>" + esc(v.location || "\u2014") + "</td>" +
          "<td style='max-width:320px'>" + esc(v.discussion || "\u2014") + "</td><td>" + esc(v.outcome || "\u2014") + "</td><td>" + esc(v.user_name || "") + "</td></tr>";
      }).join("");
      setContent(
        '<div class="toolbar"><div class="spacer"></div><button class="btn btn--primary btn--sm" id="new-visit">+ Log field visit</button></div>' +
        '<div class="panel"><div class="panel-head"><h2>Visit diary</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Client</th><th>Location</th><th>Discussion</th><th>Outcome</th><th>By</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6" class="empty">No field visits logged yet</td></tr>') + "</tbody></table></div></div>"
      );
      $("#new-visit").addEventListener("click", function () { visitForm(null); });
    });
  }
  function visitForm(lead) {
    api("GET", "/api/leads").then(function (d) {
      openModal("Log field visit",
        (lead ? "" : '<label class="pf-label">Link to lead</label><select class="pf-select" id="vf-lead"><option value="">\u2014 No linked lead \u2014</option>' +
          d.leads.map(function (l) { return '<option value="' + l.id + '">' + esc(l.name + (l.organization ? " \u2014 " + l.organization : "")) + "</option>"; }).join("") + "</select>") +
        '<label class="pf-label">Visit date</label><input class="pf-input" type="date" id="vf-date" value="' + today() + '">' +
        '<label class="pf-label">Client / school name</label><input class="pf-input" id="vf-client" value="' + esc(lead ? lead.organization || lead.name : "") + '">' +
        '<label class="pf-label">Location</label><input class="pf-input" id="vf-location" placeholder="Campus / city">' +
        '<label class="pf-label">What was discussed *</label><textarea class="pf-textarea" id="vf-discussion" rows="3"></textarea>' +
        '<label class="pf-label">Outcome / next steps</label><textarea class="pf-textarea" id="vf-outcome" rows="2"></textarea>' +
        '<div class="btn-row" style="margin-top:18px"><button class="btn btn--primary" id="vf-save">Save visit</button></div>',
        function (card) {
          $("#vf-save", card).addEventListener("click", function () {
            var pid = lead ? lead.id : ($("#vf-lead", card) ? $("#vf-lead", card).value : null);
            var disc = $("#vf-discussion", card).value.trim();
            if (!disc) return toast("Please describe the discussion", true);
            api("POST", "/api/visits", {
              lead_id: pid || null, visit_date: $("#vf-date", card).value, client_name: $("#vf-client", card).value,
              location: $("#vf-location", card).value, discussion: disc, outcome: $("#vf-outcome", card).value
            }).then(function () { closeModal(); toast("Visit logged"); route(); }).catch(function (e) { toast(e.message, true); });
          });
        });
    });
  }

  /* ================= ENQUIRIES ================= */
  function viewEnquiries() {
    setTitle("Website Enquiries");
    return api("GET", "/api/enquiries").then(function (d) {
      var rows = d.enquiries.map(function (e) {
        return "<tr><td class='num'>" + fmtDate(e.created_at) + "</td><td class='strong'>" + esc(e.name) + "<br><span style='color:var(--muted);font-size:13px'>" + esc(e.organization || "") + "</span></td>" +
          "<td>" + esc(e.phone) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(e.email || "") + "</span></td>" +
          "<td>" + esc(e.interest || "General") + "</td><td style='max-width:300px'>" + esc(e.message || "\u2014") + "</td>" +
          "<td>" + (e.lead_id ? "<a class='btn btn--ghost btn--sm' href='#/leads/" + e.lead_id + "'>View lead #" + e.lead_id + "</a>" : badge(e.status)) + "</td></tr>";
      }).join("");
      setContent(
        '<div class="panel"><div class="panel-head"><h2>Enquiries / feedback</h2><a class="btn btn--ghost btn--sm" href="/api/reports/enquiries.csv">Export CSV</a></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Received</th><th>From</th><th>Contact</th><th>Interest</th><th>Message</th><th>CRM</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6" class="empty">No enquiries yet</td></tr>') + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-body"><p>Every published enquiry is auto-converted into a CRM lead, auto-assigned to a team member, and visible in the Leads module \u2014 no manual copy-paste.</p></div></div>'
      );
    });
  }

  /* ================= ORDERS ================= */
  function viewOrders() {
    setTitle("Orders");
    return api("GET", "/api/orders").then(function (d) {
      var rows = d.orders.map(function (o) {
        var due = o.total - o.paid;
        return "<tr><td class='strong'><a href='#/orders/" + o.id + "'>" + esc(o.order_no) + "</a>" + (o.is_bulk ? " " + badge("Bulk") : "") + "</td>" +
          "<td>" + esc(o.customer_name) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(o.customer_phone || "") + "</span></td>" +
          "<td>" + o.item_count + " item(s)</td><td>" + badge(o.status) + "</td><td class='num'>" + money(o.total) + "</td>" +
          "<td class='num'>" + (due <= 0 ? "<span style='color:#059669'>Paid</span>" : money(due) + " due") + "</td>" +
          "<td><a class='btn btn--ghost btn--sm' href='#/orders/" + o.id + "'>Open</a></td></tr>";
      }).join("");
      setContent(
        '<div class="toolbar"><div class="spacer"></div><button class="btn btn--primary btn--sm" id="new-order-btn">+ New order</button></div>' +
        '<div class="panel"><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th><th>Payment</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">No orders yet</td></tr>') + "</tbody></table></div></div>"
      );
      $("#new-order-btn").addEventListener("click", function () { orderForm(null); });
    });
  }

  function orderForm(lead) {
    Promise.all([api("GET", "/api/products"), api("GET", "/api/leads")]).then(function (res) {
      var products = res[0].products, leads = res[1].leads;
      openModal("Create order",
        (lead ? "" : '<label class="pf-label">Link to lead (optional)</label><select class="pf-select" id="of-lead"><option value="">\u2014</option>' +
          leads.map(function (l) { return '<option value="' + l.id + '">' + esc(l.name + (l.organization ? " \u2014 " + l.organization : "")) + "</option>"; }).join("") + "</select>") +
        '<label class="pf-label">Customer / school name *</label><input class="pf-input" id="of-name" value="' + esc(lead ? lead.organization || lead.name : "") + '">' +
        '<div class="pf-grid"><div><label class="pf-label">Phone</label><input class="pf-input" id="of-phone" value="' + esc(lead ? lead.phone : "") + '"></div>' +
        '<div><label class="pf-label">Email</label><input class="pf-input" id="of-email" value="' + esc(lead ? lead.email : "") + '"></div></div>' +
        '<label class="pf-label">Delivery address</label><textarea class="pf-textarea" id="of-address" rows="2">' + esc(lead ? lead.address : "") + "</textarea>" +
        '<label class="pf-label">Items (bulk quantities supported)</label>' +
        '<div id="of-items"></div>' +
        '<button class="btn btn--ghost btn--sm" type="button" id="of-add" style="margin-top:8px">+ Add item</button>' +
        '<label class="pf-label">Order notes</label><input class="pf-input" id="of-notes" placeholder="e.g. Bulk order for new session">' +
        '<label style="display:flex;gap:8px;align-items:center;margin-top:14px"><input type="checkbox" id="of-bulk" ' + (lead ? "" : "") + '> Mark as bulk order</label>' +
        '<div class="btn-row" style="margin-top:18px"><button class="btn btn--primary" id="of-save">Create order</button><span class="badge badge--info" id="of-total">Total: \u20B90</span></div>',
        function (card) {
          function addRow() {
            var div = document.createElement("div");
            div.className = "of-row";
            div.style.cssText = "display:flex;gap:8px;margin-bottom:8px";
            div.innerHTML = '<select class="pf-select of-prod" style="flex:2">' + products.map(function (p) { return '<option value="' + p.id + '" data-price="' + p.price + '">' + esc(p.name + " (" + money(p.price) + ")") + "</option>"; }).join("") + '</select>' +
              '<input class="pf-input of-qty" type="number" min="1" value="1" style="flex:0 0 90px">' +
              '<button type="button" class="btn btn--danger btn--sm of-del">\u2715</button>';
            card.querySelector("#of-items").appendChild(div);
            div.querySelector(".of-del").addEventListener("click", function () { div.remove(); calc(); });
            div.querySelectorAll("select,input").forEach(function (x) { x.addEventListener("change", calc); });
            calc();
          }
          function calc() {
            var total = 0;
            $$(".of-row", card).forEach(function (r) {
              var sel = r.querySelector(".of-prod"); var qty = Number(r.querySelector(".of-qty").value) || 0;
              total += Number(sel.options[sel.selectedIndex].getAttribute("data-price")) * qty;
            });
            $("#of-total", card).textContent = "Subtotal: " + money(total) + " (+ tax on save)";
          }
          if (lead && lead.products_interest) {
            var wanted = lead.products_interest.split(/[;,]/).map(function (s) { return s.trim().toLowerCase(); });
            products.forEach(function (p) {
              if (wanted.some(function (w) { return w && p.name.toLowerCase().indexOf(w) > -1; })) {
                addRow();
                var last = card.querySelector("#of-items").lastElementChild;
                last.querySelector(".of-prod").value = p.id;
                last.querySelector(".of-qty").value = 1;
              }
            });
          }
          if (!$$(".of-row", card).length) addRow();
          $("#of-add", card).addEventListener("click", addRow);
          $("#of-save", card).addEventListener("click", function () {
            var items = $$(".of-row", card).map(function (r) {
              return { product_id: Number(r.querySelector(".of-prod").value), qty: Number(r.querySelector(".of-qty").value) };
            }).filter(function (i) { return i.product_id && i.qty > 0; });
            var payload = {
              lead_id: lead ? lead.id : ($("#of-lead", card) ? $("#of-lead", card).value || null : null),
              customer_name: $("#of-name", card).value.trim(),
              customer_phone: $("#of-phone", card).value.trim(),
              customer_email: $("#of-email", card).value.trim(),
              customer_address: $("#of-address", card).value.trim(),
              notes: $("#of-notes", card).value.trim(),
              is_bulk: $("#of-bulk", card).checked ? 1 : 0,
              items: items
            };
            if (!payload.customer_name) return toast("Customer name required", true);
            if (!items.length) return toast("Add at least one item", true);
            api("POST", "/api/orders", payload).then(function (r) {
              closeModal(); toast("Order " + r.order_no + " created"); location.hash = "#/orders/" + r.id;
            }).catch(function (e) { toast(e.message, true); });
          });
        });
    });
  }

  function viewOrderDetail(id) {
    setTitle("Order Detail");
    return api("GET", "/api/orders/" + id).then(function (d) {
      var o = d.order, items = d.items, payments = d.payments, inv = d.invoice;
      var statuses = ["Placed", "Confirmed", "Dispatched", "Delivered", "Cancelled"];
      var itemRows = items.map(function (i) {
        return "<tr><td>" + esc(i.product_name) + "</td><td class='num'>" + i.qty + "</td><td class='num'>" + money(i.unit_price) + "</td><td class='num'>" + money(i.qty * i.unit_price) + "</td></tr>";
      }).join("");
      var payRows = payments.map(function (p) {
        return "<tr><td class='num'>" + fmtDate(p.received_at) + "</td><td>" + esc(p.mode) + "</td><td>" + esc(p.reference || "\u2014") + "</td><td class='num'>" + money(p.amount) + "</td><td>" + badge(p.status) + "</td></tr>";
      }).join("");
      var paid = payments.filter(function (p) { return p.status === "received"; }).reduce(function (s, p) { return s + p.amount; }, 0);
      setContent(
        '<div class="toolbar"><a class="btn btn--ghost btn--sm" href="#/orders">\u2190 Orders</a><div class="spacer"></div>' +
        (o.lead_id ? '<a class="btn btn--ghost btn--sm" href="#/leads/' + o.lead_id + '">View lead</a>' : "") +
        (state.user.role !== "vendor" ? (inv ? '<button class="btn btn--ghost btn--sm" id="view-inv">View invoice ' + esc(inv.invoice_no) + '</button>' : '<button class="btn btn--primary btn--sm" id="gen-inv">Generate invoice</button>') : "") +
        (state.user.role !== "vendor" ? '<button class="btn btn--primary btn--sm" id="add-pay">Record payment</button>' : "") +
        "</div>" +
        '<div class="detail-grid"><div class="panel"><div class="panel-head"><h2>' + esc(o.order_no) + "</h2>" + badge(o.status) + '</div><div class="panel-body"><dl class="kv">' +
        "<dt>Customer</dt><dd>" + esc(o.customer_name) + "</dd>" +
        "<dt>Phone</dt><dd>" + esc(o.customer_phone || "\u2014") + "</dd>" +
        "<dt>Email</dt><dd>" + esc(o.customer_email || "\u2014") + "</dd>" +
        "<dt>Address</dt><dd>" + esc(o.customer_address || "\u2014") + "</dd>" +
        "<dt>Bulk order</dt><dd>" + (o.is_bulk ? "Yes" : "No") + "</dd>" +
        "<dt>Notes</dt><dd>" + esc(o.notes || "\u2014") + "</dd>" +
        "<dt>Created</dt><dd>" + esc(new Date(o.created_at + "Z").toLocaleString("en-IN")) + "</dd>" +
        "</dl>" +
        (state.user.role !== "vendor" ? '<label class="pf-label" style="margin-top:16px">Update status</label><div class="btn-row" id="status-row">' +
          statuses.map(function (s) { return '<button class="btn btn--ghost btn--sm" data-status="' + s + '"' + (s === o.status ? ' style="background:var(--blue-50)"' : "") + ">" + s + "</button>"; }).join("") + "</div>" : "") +
        "</div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Payment summary</h2></div><div class="panel-body"><dl class="kv">' +
        "<dt>Subtotal</dt><dd class='num'>" + money(o.subtotal) + "</dd>" +
        "<dt>Tax</dt><dd class='num'>" + money(o.tax) + "</dd>" +
        "<dt>Total</dt><dd class='num'><strong>" + money(o.total) + "</strong></dd>" +
        "<dt>Received</dt><dd class='num'>" + money(paid) + "</dd>" +
        "<dt>Balance</dt><dd class='num'>" + money(Math.max(0, o.total - paid)) + "</dd></dl></div></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Items</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>' + itemRows + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Payments</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>' + (payRows || '<tr><td colspan="5" class="empty">No payments recorded</td></tr>') + "</tbody></table></div></div>"
      );
      $$("#status-row [data-status]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("PUT", "/api/orders/" + o.id + "/status", { status: b.getAttribute("data-status") })
            .then(function () { toast("Status updated"); viewOrderDetail(id); }).catch(function (e) { toast(e.message, true); });
        });
      });
      var gi = $("#gen-inv");
      if (gi) gi.addEventListener("click", function () {
        api("POST", "/api/invoices", { order_id: o.id }).then(function (r) { toast("Invoice " + r.invoice_no + " generated"); viewOrderDetail(id); }).catch(function (e) { toast(e.message, true); });
      });
      var vi = $("#view-inv");
      if (vi) vi.addEventListener("click", function () { location.hash = "#/invoices/" + inv.id; });
      var ap = $("#add-pay");
      if (ap) ap.addEventListener("click", function () { paymentForm(o, inv, Math.max(0, o.total - paid)); });
    });
  }

  function paymentForm(order, invoice, due) {
    openModal("Record payment",
      '<p style="color:var(--muted)">Order <strong>' + esc(order.order_no) + "</strong> \u00B7 Balance " + money(due) + "</p>" +
      '<label class="pf-label">Amount *</label><input class="pf-input" type="number" id="pf-amount" value="' + (due > 0 ? due : 0) + '">' +
      '<label class="pf-label">Payment mode *</label><select class="pf-select" id="pf-mode">' + ["UPI", "Bank Transfer", "Cash", "Cheque", "Card"].map(function (m) { return "<option>" + m + "</option>"; }).join("") + "</select>" +
      '<label class="pf-label">Reference / transaction ID</label><input class="pf-input" id="pf-ref" placeholder="e.g. UPI GRN-20261012-01">' +
      '<div class="btn-row" style="margin-top:18px"><button class="btn btn--primary" id="pf-save">Record &amp; send receipt</button></div>',
      function (card) {
        $("#pf-save", card).addEventListener("click", function () {
          api("POST", "/api/payments", { order_id: order.id, invoice_id: invoice ? invoice.id : null, amount: Number($("#pf-amount", card).value), mode: $("#pf-mode", card).value, reference: $("#pf-ref", card).value })
            .then(function () { closeModal(); toast("Payment recorded, receipt emailed"); viewOrderDetail(order.id); })
            .catch(function (e) { toast(e.message, true); });
        });
      });
  }

  /* ================= INVOICES ================= */
  function viewInvoices() {
    setTitle("Invoices");
    return api("GET", "/api/invoices").then(function (d) {
      var rows = d.invoices.map(function (i) {
        return "<tr><td class='strong'>" + esc(i.invoice_no) + "</td><td>" + esc(i.order_no || "\u2014") + "</td><td>" + esc(i.customer_name) + "</td>" +
          "<td class='num'>" + money(i.total) + "</td><td>" + badge(i.status) + "</td><td class='num'>" + fmtDate(i.created_at) + "</td>" +
          "<td><a class='btn btn--ghost btn--sm' href='#/invoices/" + i.id + "'>Open</a></td></tr>";
      }).join("");
      setContent('<div class="panel"><div class="panel-head"><h2>Invoices</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Issued</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="7" class="empty">No invoices yet. Generate one from an order.</td></tr>') + "</tbody></table></div></div>");
    });
  }

  function viewInvoice(id) {
    setTitle("Invoice");
    return api("GET", "/api/invoices/" + id).then(function (d) {
      var inv = d.invoice;
      setContent(
        '<div class="toolbar"><a class="btn btn--ghost btn--sm" href="#/invoices">\u2190 Invoices</a><div class="spacer"></div><button class="btn btn--primary btn--sm" id="print-inv">Print / Download PDF</button></div>' +
        '<div class="panel"><div class="panel-body"><dl class="kv">' +
        "<dt>Invoice no.</dt><dd>" + esc(inv.invoice_no) + "</dd>" +
        "<dt>Order</dt><dd>" + esc(inv.order_no || "\u2014") + "</dd>" +
        "<dt>Customer</dt><dd>" + esc(inv.customer_name) + "</dd>" +
        "<dt>Total</dt><dd>" + money(inv.total) + "</dd>" +
        "<dt>Status</dt><dd>" + badge(inv.status) + "</dd>" +
        "<dt>Issued</dt><dd>" + fmtDate(inv.created_at) + "</dd>" +
        "</dl></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Line items</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>' +
        inv.lines.map(function (l) { return "<tr><td>" + esc(l.name) + "</td><td class='num'>" + l.qty + "</td><td class='num'>" + money(l.unit_price) + "</td><td class='num'>" + money(l.amount) + "</td></tr>"; }).join("") +
        "</tbody></table></div></div>"
      );
      $("#print-inv").addEventListener("click", function () { printInvoice(inv); });
    });
  }

  function printInvoice(inv) {
    var root = $("#print-root");
    root.innerHTML =
      '<div class="print-bar"><button class="btn btn--ghost btn--sm" id="close-print">Close</button><button class="btn btn--primary btn--sm" id="do-print">Print</button></div>' +
      '<div class="invoice-doc">' +
      "<header><div><h1>ULTRA CONNECT</h1><div>Ultra Connect Multi Digi Service Pvt. Ltd.</div><div>Bengaluru, Karnataka, India</div></div>" +
      "<div style='text-align:right'><h2 style='margin:0'>TAX INVOICE</h2><div><strong>" + esc(inv.invoice_no) + "</strong></div><div>Date: " + fmtDate(inv.created_at) + "</div>" +
      (inv.order_no ? "<div>Order: " + esc(inv.order_no) + "</div>" : "") + "</div></header>" +
      "<div style='margin-bottom:16px'><strong>Bill To:</strong><br>" + esc(inv.customer_name) + "<br>" + esc(inv.customer_address || "") + (inv.customer_phone ? "<br>" + esc(inv.customer_phone) : "") + "</div>" +
      "<table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>" +
      inv.lines.map(function (l, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(l.name) + "</td><td>" + l.qty + "</td><td>" + money(l.unit_price) + "</td><td>" + money(l.amount) + "</td></tr>"; }).join("") +
      "</tbody></table>" +
      "<table class='totals'><tr><td>Subtotal</td><td style='text-align:right'>" + money(inv.subtotal) + "</td></tr>" +
      "<tr><td>Tax</td><td style='text-align:right'>" + money(inv.tax) + "</td></tr>" +
      "<tr class='grand'><td>Total</td><td style='text-align:right'>" + money(inv.total) + "</td></tr></table>" +
      "<p style='margin-top:36px;font-size:12px;color:#666'>This is a computer-generated invoice. Payment accepted via UPI, bank transfer, card, cheque or cash.</p>" +
      "</div>";
    root.hidden = false;
    $("#close-print").addEventListener("click", function () { root.hidden = true; root.innerHTML = ""; });
    $("#do-print").addEventListener("click", function () { window.print(); });
  }

  /* ================= PAYMENTS ================= */
  function viewPayments() {
    setTitle("Payments");
    return api("GET", "/api/payments").then(function (d) {
      var rows = d.payments.map(function (p) {
        return "<tr><td class='num'>" + fmtDate(p.received_at) + "</td><td>" + esc(p.order_no || "\u2014") + "</td><td>" + esc(p.invoice_no || "\u2014") + "</td>" +
          "<td>" + esc(p.mode) + "</td><td>" + esc(p.reference || "\u2014") + "</td><td class='num'>" + money(p.amount) + "</td><td>" + badge(p.status) + "</td></tr>";
      }).join("");
      var total = d.payments.filter(function (p) { return p.status === "received"; }).reduce(function (s, p) { return s + p.amount; }, 0);
      setContent(
        '<div class="stat-grid">' + statCard("Payments Received", money(total), d.payments.length + " transactions", "is-ok") + "</div>" +
        '<div class="panel"><div class="panel-head"><h2>Payment ledger</h2><span class="badge badge--info">UPI \u00B7 Bank \u00B7 Card \u00B7 Cheque \u00B7 Cash</span></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Order</th><th>Invoice</th><th>Mode</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">No payments recorded</td></tr>') + "</tbody></table></div></div>"
      );
    });
  }

  /* ================= PRODUCTS (ADMIN / VENDOR) ================= */
  function viewProductsAdmin() {
    setTitle(state.user.role === "vendor" ? "My Products" : "Product Catalog Management");
    return api("GET", "/api/admin/products").then(function (d) {
      var cards = d.products.map(function (p) {
        return '<div class="prod-card"><div class="prod-thumb" style="background:' + catColor(p.category) + '">' + esc(p.category) + "</div>" +
          '<div class="prod-meta"><div class="cat">' + esc(p.sku) + "</div><h3>" + esc(p.name) + "</h3>" +
          '<div class="price">' + (p.price > 0 ? money(p.price) : "On request") + "</div>" +
          '<div class="stock">Stock: ' + p.stock_on_hand + " \u00B7 Sold: " + p.units_sold + (p.vendor_name ? " \u00B7 Vendor: " + esc(p.vendor_name) : "") + "</div>" +
          "<div>" + badge(p.status) + (p.stock_on_hand <= 5 && p.status === "active" ? " " + badge("low stock") : "") + "</div></div>" +
          '<div class="prod-actions"><button class="btn btn--ghost btn--sm" data-edit="' + p.id + '">Edit</button>' +
          (state.user.role === "admin" ? '<button class="btn btn--ghost btn--sm" data-updates="' + p.id + '">Update log</button>' : "") +
          (state.user.role === "admin" && p.status === "pending" ? '<button class="btn btn--primary btn--sm" data-approve="' + p.id + '">Approve</button>' : "") +
          "</div></div>";
      }).join("");
      setContent(
        '<div class="toolbar"><input class="pf-input" id="ps-search" placeholder="Search products\u2026"><div class="spacer"></div>' +
        '<button class="btn btn--primary btn--sm" id="new-product">+ Add product</button></div>' +
        '<div class="prod-grid" id="prod-grid">' + (cards || '<div class="empty">No products yet</div>') + "</div>"
      );
      $("#new-product").addEventListener("click", function () { productForm(null); });
      $("#ps-search").addEventListener("input", function () {
        var v = this.value.toLowerCase();
        $$("#prod-grid .prod-card").forEach(function (c) { c.style.display = c.textContent.toLowerCase().indexOf(v) > -1 ? "" : "none"; });
      });
      $$("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () { productForm(d.products.filter(function (p) { return p.id === Number(b.getAttribute("data-edit")); })[0]); });
      });
      $$("[data-updates]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("GET", "/api/admin/products/" + b.getAttribute("data-updates") + "/updates").then(function (r) {
            openModal("Product update history",
              (r.updates.length ? '<ul class="timeline">' + r.updates.map(function (u) {
                return "<li><div class='t'>" + esc(u.user_name || "User") + " (" + esc(u.role) + ")</div><div class='d'>" + esc(u.changes) + "<br>" + esc(new Date(u.created_at + "Z").toLocaleString("en-IN")) + "</div></li>";
              }).join("") + "</ul>" : "<p>No changes logged yet.</p>"));
          });
        });
      });
      $$("[data-approve]").forEach(function (b) {
        b.addEventListener("click", function () {
          var pid = b.getAttribute("data-approve");
          var p = d.products.filter(function (x) { return x.id === Number(pid); })[0];
          var vid = null;
          api("GET", "/api/vendors").then(function (v) {
            var match = v.vendors.filter(function (x) { return x.company_name === p.vendor_name; })[0];
            vid = match ? match.id : null;
            if (!vid) return toast("Vendor not found for this product", true);
            api("POST", "/api/vendors/" + vid + "/products/" + pid + "/approve", {}).then(function () { toast("Product approved and live"); viewProductsAdmin(); });
          });
        });
      });
    });
  }
  function catColor(cat) {
    var colors = ["#0A1440", "#0040D9", "#1F6BFF", "#0E7490", "#7C3AED", "#B45309", "#047857", "#BE123C"];
    var i = 0; for (var k = 0; k < String(cat).length; k++) i += String(cat).charCodeAt(k);
    return "linear-gradient(135deg," + colors[i % colors.length] + ", " + colors[(i + 3) % colors.length] + ")";
  }
  function productForm(p) {
    var isEdit = !!p;
    var cats = ["Academic & Digital", "Institutional Support", "Campus & Infrastructure", "Safety & Security", "Student Experience", "General"];
    openModal(isEdit ? "Edit product" : "Add product",
      '<div class="pf-grid">' +
      (isEdit ? "" : field("pr-sku", "SKU *", "")) +
      field("pr-name", "Product name *", p ? p.name : "") +
      '<div><label class="pf-label">Category</label><select class="pf-select" id="pr-cat">' + cats.map(function (c) { return '<option' + (p && p.category === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      field("pr-price", "Price (\u20B9)", p ? p.price : "") +
      field("pr-mrp", "MRP (\u20B9)", p ? p.mrp : "") +
      field("pr-stock", "Stock on hand", p ? p.stock_on_hand : 0) +
      (state.user.role === "admin" ? '<div><label class="pf-label">Status</label><select class="pf-select" id="pr-status">' + ["active", "pending", "draft", "rejected"].map(function (s) { return '<option' + (p && p.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" : "") +
      "</div>" +
      '<label class="pf-label">Description</label><textarea class="pf-textarea" id="pr-desc" rows="3">' + esc(p ? p.description : "") + "</textarea>" +
      '<label class="pf-label">Specifications (one per line: Key: Value)</label><textarea class="pf-textarea" id="pr-specs" rows="4">' + esc(p ? Object.entries(p.specs || {}).map(function (e) { return e[0] + ": " + e[1]; }).join("\n") : "") + "</textarea>" +
      (state.user.role === "vendor" ? '<p style="font-size:13px;color:var(--muted);margin-top:10px">New vendor products require admin approval before going live. Every edit is logged and visible to the admin.</p>' : "") +
      '<div class="btn-row" style="margin-top:18px"><button class="btn btn--primary" id="pr-save">' + (isEdit ? "Save changes" : "Add product") + "</button></div>",
      function (card) {
        $("#pr-save", card).addEventListener("click", function () {
          var specs = {};
          $("#pr-specs", card).value.split("\n").forEach(function (line) {
            var idx = line.indexOf(":"); if (idx > 0) specs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          });
          var payload = {
            name: $("#pr-name", card).value.trim(), category: $("#pr-cat", card).value, price: Number($("#pr-price", card).value) || 0,
            mrp: Number($("#pr-mrp", card).value) || 0, stock_on_hand: Number($("#pr-stock", card).value) || 0,
            description: $("#pr-desc", card).value.trim(), specs: specs
          };
          if (state.user.role === "admin") payload.status = $("#pr-status", card).value;
          if (!isEdit) payload.sku = $("#pr-sku", card).value.trim();
          if (!payload.name) return toast("Product name required", true);
          var req = isEdit ? api("PUT", "/api/admin/products/" + p.id, payload) : api("POST", "/api/admin/products", payload);
          req.then(function (r) {
            closeModal(); toast(isEdit ? "Product updated" : (r.status === "pending" ? "Product submitted for approval" : "Product added"));
            viewProductsAdmin();
          }).catch(function (e) { toast(e.message, true); });
        });
      });
  }

  /* ================= INVENTORY ================= */
  function viewInventory() {
    setTitle("Stock & Inventory");
    return api("GET", "/api/inventory").then(function (d) {
      var rows = d.inventory.map(function (p) {
        return "<tr><td class='strong'>" + esc(p.name) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(p.sku) + "</span></td><td>" + esc(p.category) + "</td>" +
          "<td>" + esc(p.vendor_name || "Ultra Connect") + "</td><td class='num'>" + p.stock_on_hand + "</td><td class='num'>" + p.units_sold + "</td>" +
          "<td>" + (p.low_stock ? badge("low stock") : badge("ok")) + "</td><td>" + badge(p.status) + "</td></tr>";
      }).join("");
      setContent(
        '<div class="stat-grid">' + statCard("Tracked Products", d.inventory.length) + statCard("Low Stock Alerts", d.lowStock, "at or below 5 units", d.lowStock ? "is-warn" : "") + "</div>" +
        '<div class="panel"><div class="panel-head"><h2>Inventory levels</h2><a class="btn btn--ghost btn--sm" href="/api/reports/inventory.csv">Export CSV</a></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Category</th><th>Source</th><th>In stock</th><th>Sold</th><th>Alert</th><th>Status</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">No products</td></tr>') + "</tbody></table></div></div>"
      );
    });
  }

  /* ================= VENDORS (ADMIN) ================= */
  function viewVendors() {
    setTitle("Vendor Management");
    return Promise.all([api("GET", "/api/vendors"), api("GET", "/api/admin/products?status=pending")]).then(function (res) {
      var vendors = res[0].vendors, pending = res[1].products;
      var vRows = vendors.map(function (v) {
        return "<tr><td class='strong'>" + esc(v.company_name) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(v.contact_name) + " \u00B7 " + esc(v.email) + "</span></td>" +
          "<td>" + esc(v.city || "\u2014") + "</td><td>" + esc(v.gstin || "\u2014") + "</td><td class='num'>" + v.product_count + "</td>" +
          "<td>" + (v.approved ? badge("approved") : badge("pending")) + "</td>" +
          "<td>" + (v.approved ? "" : "<button class='btn btn--primary btn--sm' data-approve-v='" + v.id + "'>Approve vendor</button>") + "</td></tr>";
      }).join("");
      var pRows = pending.map(function (p) {
        return "<tr><td>" + esc(p.name) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(p.sku) + "</span></td><td>" + esc(p.vendor_name || "") + "</td>" +
          "<td class='num'>" + money(p.price) + "</td><td>" + badge(p.status) + "</td>" +
          "<td><button class='btn btn--primary btn--sm' data-approve-p='" + p.id + "'>Approve</button></td></tr>";
      }).join("");
      setContent(
        '<div class="panel"><div class="panel-head"><h2>Registered vendors</h2><button class="btn btn--primary btn--sm" id="add-vendor-user">+ Create vendor account</button></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Vendor</th><th>City</th><th>GSTIN</th><th>Products</th><th>Status</th><th></th></tr></thead><tbody>' +
        (vRows || '<tr><td colspan="6" class="empty">No vendors registered</td></tr>') + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Products awaiting approval</h2></div><div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Vendor</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>' +
        (pRows || '<tr><td colspan="5" class="empty">Nothing pending</td></tr>') + "</tbody></table></div></div>"
      );
      $$("[data-approve-v]").forEach(function (b) {
        b.addEventListener("click", function () { api("POST", "/api/vendors/" + b.getAttribute("data-approve-v") + "/approve", {}).then(function () { toast("Vendor approved"); viewVendors(); }); });
      });
      $$("[data-approve-p]").forEach(function (b) {
        b.addEventListener("click", function () {
          var pid = b.getAttribute("data-approve-p");
          var prod = pending.filter(function (x) { return x.id === Number(pid); })[0];
          var v = vendors.filter(function (x) { return x.company_name === prod.vendor_name; })[0];
          if (!v) return toast("Vendor not found", true);
          api("POST", "/api/vendors/" + v.id + "/products/" + pid + "/approve", {}).then(function () { toast("Product approved and live"); viewVendors(); });
        });
      });
      $("#add-vendor-user").addEventListener("click", function () {
        openModal("Create vendor account",
          field("nv-name", "Contact name *", "") + field("nv-company", "Company *", "") + field("nv-email", "Email *", "", "email") +
          field("nv-phone", "Phone", "") + field("nv-pass", "Password *", "", "password") +
          '<div class="btn-row" style="margin-top:16px"><button class="btn btn--primary" id="nv-save">Create account</button></div>',
          function (card) {
            $("#nv-save", card).addEventListener("click", function () {
              api("POST", "/api/admin/users", { name: $("#nv-name", card).value, email: $("#nv-email", card).value, password: $("#nv-pass", card).value, role: "vendor", phone: $("#nv-phone", card).value })
                .then(function () { toast("Vendor user created — they can now list products"); closeModal(); viewVendors(); }).catch(function (e) { toast(e.message, true); });
            });
          });
      });
    });
  }

  /* ================= FINANCE (ADMIN) ================= */
  function viewFinance() {
    setTitle("Finance (Income & Expense)");
    return api("GET", "/api/finance").then(function (d) {
      var s = d.summary;
      var rows = d.entries.map(function (e) {
        return "<tr><td class='num'>" + fmtDate(e.entry_date) + "</td><td>" + badge(e.type === "income" ? "closed-won" : "cancelled") + "</td>" +
          "<td>" + esc(e.category) + "</td><td>" + esc(e.note) + "</td><td>" + esc(e.ref || "\u2014") + "</td>" +
          "<td class='num' style='color:" + (e.type === "income" ? "#059669" : "#DC2626") + "'>" + (e.type === "income" ? "+" : "\u2212") + money(e.amount) + "</td>" +
          "<td>" + esc(e.created_by_name || "") + "</td></tr>";
      }).join("");
      setContent(
        '<div class="stat-grid">' + statCard("Total Income", money(s.income), null, "is-ok") + statCard("Total Expense", money(s.expense), null, "is-danger") + statCard("Net", money(s.net), null, s.net >= 0 ? "is-ok" : "is-danger") + "</div>" +
        '<div class="toolbar"><div class="spacer"></div><a class="btn btn--ghost btn--sm" href="/api/reports/finance.csv">Export CSV</a><button class="btn btn--primary btn--sm" id="add-entry">+ Add entry</button></div>' +
        '<div class="panel"><div class="panel-head"><h2>Ledger</h2><span class="badge badge--danger">Restricted: admin only</span></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th>Ref</th><th>Amount</th><th>By</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">No entries yet</td></tr>') + "</tbody></table></div></div>"
      );
      $("#add-entry").addEventListener("click", function () {
        openModal("Add finance entry",
          '<div class="pf-grid"><div><label class="pf-label">Type *</label><select class="pf-select" id="fe-type"><option value="income">Income</option><option value="expense">Expense</option></select></div>' +
          field("fe-cat", "Category", "") + field("fe-amount", "Amount (\u20B9) *", "") + field("fe-date", "Date", today(), "date") +
          field("fe-ref", "Reference", "") + "</div>" +
          '<label class="pf-label">Note</label><input class="pf-input" id="fe-note">' +
          '<div class="btn-row" style="margin-top:16px"><button class="btn btn--primary" id="fe-save">Save entry</button></div>',
          function (card) {
            $("#fe-save", card).addEventListener("click", function () {
              api("POST", "/api/finance", { type: $("#fe-type", card).value, category: $("#fe-cat", card).value, amount: Number($("#fe-amount", card).value), note: $("#fe-note", card).value, ref: $("#fe-ref", card).value, entry_date: $("#fe-date", card).value })
                .then(function () { closeModal(); toast("Entry saved"); viewFinance(); }).catch(function (e) { toast(e.message, true); });
            });
          });
      });
    });
  }

  /* ================= TEAM (ADMIN) ================= */
  function viewTeam() {
    setTitle("Team & Role Management");
    return api("GET", "/api/admin/users").then(function (d) {
      var rows = d.users.map(function (u) {
        return "<tr><td class='strong'>" + esc(u.name) + "<br><span style='font-size:13px;color:var(--muted)'>" + esc(u.email) + "</span></td>" +
          "<td>" + badge(u.role === "admin" ? "admin" : u.role === "employee" ? "active" : "pending") + " " + esc(u.role) + "</td>" +
          "<td>" + (u.role === "employee" ? u.lead_count + " leads" : (u.vendor_company || "\u2014")) + "</td>" +
          "<td class='num'>" + fmtDate(u.created_at) + "</td>" +
          "<td>" + (u.active ? badge("active") : badge("inactive")) + "</td>" +
          "<td>" + (u.role !== "admin" ? "<button class='btn btn--ghost btn--sm' data-toggle='" + u.id + "'>" + (u.active ? "Disable" : "Enable") + "</button>" : "") + "</td></tr>";
      }).join("");
      setContent(
        '<div class="toolbar"><div class="spacer"></div><button class="btn btn--primary btn--sm" id="add-user">+ Add team member</button></div>' +
        '<div class="panel"><div class="panel-head"><h2>Users</h2><span class="badge badge--info">Roles control lead visibility across the CRM</span></div>' +
        '<div class="panel-body panel-body--flush tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>"
      );
      $$("[data-toggle]").forEach(function (b) {
        b.addEventListener("click", function () { api("POST", "/api/admin/users/" + b.getAttribute("data-toggle") + "/toggle", {}).then(function () { toast("Updated"); viewTeam(); }); });
      });
      $("#add-user").addEventListener("click", function () {
        openModal("Add team member",
          field("nu-name", "Full name *", "") + field("nu-email", "Email *", "", "email") + field("nu-pass", "Password *", "", "password") +
          '<div><label class="pf-label">Role</label><select class="pf-select" id="nu-role"><option value="employee">Employee</option><option value="admin">Admin</option><option value="vendor">Vendor</option></select></div>' +
          '<div class="btn-row" style="margin-top:16px"><button class="btn btn--primary" id="nu-save">Create user</button></div>',
          function (card) {
            $("#nu-save", card).addEventListener("click", function () {
              api("POST", "/api/admin/users", { name: $("#nu-name", card).value, email: $("#nu-email", card).value, password: $("#nu-pass", card).value, role: $("#nu-role", card).value })
                .then(function () { closeModal(); toast("User created"); viewTeam(); }).catch(function (e) { toast(e.message, true); });
            });
          });
      });
    });
  }

  /* ================= REPORTS ================= */
  function viewReports() {
    setTitle("Reports & Exports");
    var reports = [
      ["leads", "Lead report", "All leads with status, interest and follow-up dates"],
      ["sales", "Sales / order report", "Every order with status and value"],
      ["inventory", "Inventory report", "Stock on hand and units sold per product"],
      ["enquiries", "Website enquiries", "Enquiries received from the website"],
    ];
    if (state.user.role === "admin") reports.push(["finance", "Finance report", "Income and expense ledger"]);
    setContent(
      '<div class="panel"><div class="panel-head"><h2>Weekly & on-demand reports</h2></div><div class="panel-body">' +
      '<div class="prod-grid">' + reports.map(function (r) {
        return '<div class="prod-card"><div class="prod-thumb" style="background:linear-gradient(135deg,#0A1440,#1F6BFF)">CSV</div><div class="prod-meta"><h3>' + esc(r[1]) + "</h3><p style='font-size:13px;color:var(--muted)'>" + esc(r[2]) + "</p></div><div class='prod-actions'><a class='btn btn--primary btn--sm' href='/api/reports/" + r[0] + ".csv'>Download CSV</a></div></div>";
      }).join("") + "</div></div></div>"
    );
  }

  /* ================= NOTIFICATIONS ================= */
  function loadNotifications() {
    if (!state.user) return;
    api("GET", "/api/notifications").then(function (d) {
      state.notifications = d.notifications;
      var b = $("#bell-badge");
      b.hidden = !d.unread;
      b.textContent = d.unread;
    }).catch(function () {});
  }
  function viewNotifications() {
    setTitle("Notifications");
    return api("GET", "/api/notifications").then(function (d) {
      var rows = d.notifications.map(function (n) {
        return '<div class="notif-item' + (n.read ? "" : " is-unread") + '"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body) + '</div><div class="m">' + esc(n.channel) + " \u00B7 " + esc(new Date(n.created_at + "Z").toLocaleString("en-IN")) + "</div></div>";
      }).join("");
      setContent(
        '<div class="panel"><div class="panel-head"><h2>All notifications</h2><button class="btn btn--ghost btn--sm" id="mark-all">Mark all read</button></div><div class="panel-body">' + (rows || '<div class="empty">No notifications</div>') + "</div></div>" +
        (state.user.role !== "vendor" ? '<div class="panel" id="email-panel"><div class="panel-head"><h2>Email / message log</h2><span class="badge badge--info">SMS &amp; WhatsApp share this notification layer</span></div><div class="panel-body" id="email-body">Loading\u2026</div></div>' : "")
      );
      $("#mark-all").addEventListener("click", function () {
        api("POST", "/api/notifications/read", {}).then(function () { toast("Marked read"); loadNotifications(); viewNotifications(); });
      });
      if (state.user.role !== "vendor") {
        api("GET", "/api/email-log").then(function (e) {
          $("#email-body").innerHTML = e.log.length ? '<ul class="timeline">' + e.log.map(function (l) {
            return "<li><div class='t'>" + esc(l.subject) + "</div><div class='d'>To: " + esc(l.to_addr) + " \u00B7 " + esc(l.purpose) + " \u00B7 " + esc(new Date(l.created_at + "Z").toLocaleString("en-IN")) + "</div></li>";
          }).join("") + "</ul>" : "<p>No messages logged yet.</p>";
        });
      }
    });
  }

  function openNotifDrawer() {
    api("GET", "/api/notifications").then(function (d) {
      $("#notif-list").innerHTML = d.notifications.length ? d.notifications.map(function (n) {
        return '<div class="notif-item' + (n.read ? "" : " is-unread") + '"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body) + '</div><div class="m">' + esc(new Date(n.created_at + "Z").toLocaleString("en-IN")) + "</div></div>";
      }).join("") : '<div class="empty">No notifications</div>';
      $("#notif-drawer").hidden = false;
      $("#notif-backdrop").hidden = false;
    });
  }
  $("#bell-btn").addEventListener("click", openNotifDrawer);
  $("#notif-backdrop").addEventListener("click", function () { $("#notif-drawer").hidden = true; $("#notif-backdrop").hidden = true; });
  $("#mark-read").addEventListener("click", function () {
    api("POST", "/api/notifications/read", {}).then(function () { toast("Marked read"); loadNotifications(); openNotifDrawer(); });
  });

  /* ================= login wiring ================= */
  var loginRole = "employee";
  $$(".login-tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".login-tab").forEach(function (x) { x.classList.remove("is-active"); });
      t.classList.add("is-active");
      loginRole = t.getAttribute("data-role");
    });
  });
  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    doLogin(loginRole, $("#login-email").value, $("#login-password").value);
  });
  $("#forgot-btn").addEventListener("click", function () { $("#forgot-box").hidden = !$("#forgot-box").hidden; });
  $("#forgot-submit").addEventListener("click", function () {
    api("POST", "/api/auth/forgot", { email: $("#forgot-email").value }).then(function (r) {
      var m = $("#forgot-msg"); m.hidden = false;
      m.innerHTML = esc(r.message) + (r.demoResetLink ? "<br>Demo reset link: <a href='" + r.demoResetLink + "'>" + esc(r.demoResetLink) + "</a>" : "");
    });
  });
  $("#vendor-register-btn").addEventListener("click", function () { $("#login-view").hidden = true; $("#vendor-register-view").hidden = false; });
  $("#vr-back").addEventListener("click", showLogin);
  $("#vendor-register-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#vr-error"), ok = $("#vr-ok");
    err.hidden = true; ok.hidden = true;
    api("POST", "/api/vendors/register", {
      name: $("#vr-name").value, company_name: $("#vr-company").value, email: $("#vr-email").value,
      phone: $("#vr-phone").value, gstin: $("#vr-gstin").value, city: $("#vr-city").value,
      state: $("#vr-state").value, address: $("#vr-address").value, password: $("#vr-password").value
    }).then(function (r) { ok.textContent = r.message; ok.hidden = false; })
      .catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
  });
  $("#logout-btn").addEventListener("click", function () {
    api("POST", "/api/auth/logout", {}).then(function () { state.user = null; showLogin(); });
  });
  $("#menu-toggle").addEventListener("click", function () { $(".sidebar").classList.toggle("is-open"); });

  /* ---------- boot ---------- */
  var hash = location.hash || "";
  var resetMatch = hash.match(/^#\/reset\/(.+)$/);
  if (resetMatch) {
    showLogin();
    $("#login-view").hidden = true;
    $("#reset-view").hidden = false;
    $("#reset-form").addEventListener("submit", function (e) {
      e.preventDefault();
      api("POST", "/api/auth/reset", { token: resetMatch[1], password: $("#reset-pass").value })
        .then(function () { toast("Password updated — please sign in"); location.hash = "#/dashboard"; location.reload(); })
        .catch(function (e2) { var er = $("#reset-error"); er.textContent = e2.message; er.hidden = false; });
    });
  } else {
    api("GET", "/api/auth/me").then(function (d) {
      if (d.user) { state.user = d.user; bootApp(); } else { showLogin(); }
    }).catch(function () { showLogin(); });
  }
})();
