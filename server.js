/* Ultra Connect Platform — Express server (site + CRM + vendor portal + orders + finance) */
"use strict";
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const { db } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

/* Behind a hosting proxy (Render/Railway/Fly) so secure cookies + IPs work */
app.set("trust proxy", 1);

/* Cross-origin access: allows the static site (e.g. Vercel) to reach this API.
   Set CORS_ORIGINS to a comma-separated allowlist in production; empty = reflect any origin. */
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (CORS_ORIGINS.length === 0 || CORS_ORIGINS.indexOf(origin) !== -1)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* Serving the portal from this origin keeps the session cookie first-party. */
const crossSite = CORS_ORIGINS.length > 0 && process.env.SAME_SITE !== "lax";
app.use(
  session({
    name: "uc.sid",
    secret: process.env.SESSION_SECRET || "ultra-connect-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    proxy: crossSite,
    cookie: {
      httpOnly: true,
      sameSite: crossSite ? "none" : "lax",
      secure: crossSite,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------- helpers ---------- */
const now = () => new Date().toISOString();
function localDateStr(d) {
  const x = d || new Date();
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}
function nextSeq(key) {
  db.prepare("INSERT INTO counters (key,value) VALUES (?,0) ON CONFLICT(key) DO NOTHING").run(key);
  db.prepare("UPDATE counters SET value = value + 1 WHERE key = ?").run(key);
  return db.prepare("SELECT value FROM counters WHERE key = ?").get(key).value;
}
function pad(n, w) { return String(n).padStart(w, "0"); }
function getSetting(key, fallback) {
  const r = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return r ? r.value : fallback;
}
function notify(userId, title, body, channel, link) {
  db.prepare("INSERT INTO notifications (user_id,title,body,channel,link) VALUES (?,?,?,?,?)")
    .run(userId ?? null, title, body, channel || "inapp", link || "");
  if (channel === "email" || !channel) {
    const u = userId ? db.prepare("SELECT email FROM users WHERE id=?").get(userId) : null;
    db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
      .run(u ? u.email : "team@ultraconnect.in", title, body, "notification");
  }
}
function leadHistory(leadId, userId, action, detail) {
  db.prepare("INSERT INTO lead_history (lead_id,user_id,action,detail) VALUES (?,?,?,?)")
    .run(leadId, userId ?? null, action, detail || "");
}
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
function publicProduct(p) {
  let specs = {};
  try { specs = JSON.parse(p.specs || "{}"); } catch {}
  return { ...p, specs, vendor_name: p.vendor_name || null };
}

/* ---------- auth (M1) ---------- */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

app.post("/api/auth/forgot", (req, res) => {
  const { email } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase().trim());
  if (!user) return res.json({ ok: true, message: "If that email exists, a reset link has been generated." });
  const token = crypto.randomBytes(16).toString("hex");
  const exp = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  db.prepare("INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)").run(user.id, token, exp);
  const link = `/portal.html#/reset/${token}`;
  db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
    .run(user.email, "Password reset — Ultra Connect", `Reset your password: ${link}`, "password_reset");
  notify(user.id, "Password reset requested", `Use this link: ${link}`, "email");
  res.json({ ok: true, message: "If that email exists, a reset link has been generated.", demoResetLink: link });
});

app.post("/api/auth/reset", (req, res) => {
  const { token, password } = req.body || {};
  const row = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0").get(token || "");
  if (!row || new Date(row.expires_at) < new Date()) return res.status(400).json({ error: "Invalid or expired token" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(String(password), 10), row.user_id);
  db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { oldPassword, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.user.id);
  if (!bcrypt.compareSync(oldPassword || "", user.password_hash)) return res.status(400).json({ error: "Old password is incorrect" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(String(password), 10), user.id);
  res.json({ ok: true });
});

/* ---------- public catalog (M4) ---------- */
app.get("/api/products", (req, res) => {
  const { q, category, vendor } = req.query;
  let sql = `SELECT p.*, v.company_name AS vendor_name FROM products p
             LEFT JOIN vendors v ON v.id = p.vendor_id
             WHERE p.status = 'active'`;
  const args = [];
  if (q) { sql += " AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category) { sql += " AND p.category = ?"; args.push(category); }
  if (vendor === "ultra") { sql += " AND p.vendor_id IS NULL"; }
  if (vendor === "partner") { sql += " AND p.vendor_id IS NOT NULL"; }
  sql += " ORDER BY p.featured DESC, p.name ASC";
  const rows = db.prepare(sql).all(...args).map(publicProduct);
  res.json({ products: rows });
});

app.get("/api/products/categories", (_req, res) => {
  const rows = db.prepare("SELECT category, COUNT(*) n FROM products WHERE status='active' GROUP BY category ORDER BY category").all();
  res.json({ categories: rows });
});

app.get("/api/products/:id", (req, res) => {
  const p = db.prepare(`SELECT p.*, v.company_name AS vendor_name FROM products p
    LEFT JOIN vendors v ON v.id = p.vendor_id WHERE p.id = ?`).get(req.params.id);
  if (!p || p.status !== "active") return res.status(404).json({ error: "Product not found" });
  res.json({ product: publicProduct(p) });
});

/* ---------- enquiries (M9) ---------- */
app.post("/api/enquiries", (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: "Name and phone are required" });
  const r = db.prepare(
    `INSERT INTO enquiries (name,organization,designation,phone,email,city,students,interest,message)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(b.name, b.organization || "", b.designation || "", b.phone, b.email || "", b.city || "", b.students || "", b.interest || "", b.message || "");
  const interestName = b.interest || "General enquiry";
  const lead = db.prepare(
    `INSERT INTO leads (name,organization,designation,city,phone,email,students,products_interest,notes,status,source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(b.name, b.organization || "", b.designation || "", b.city || "", b.phone, b.email || "", b.students || "", interestName, b.message || "", "New", "website");
  const leadId = lead.lastInsertRowid;
  db.prepare("UPDATE enquiries SET status='converted', lead_id=? WHERE id=?").run(leadId, r.lastInsertRowid);
  leadHistory(leadId, null, "created", "Auto-created from website enquiry #" + r.lastInsertRowid);
  const employees = db.prepare("SELECT id,name FROM users WHERE role='employee' AND active=1").all();
  if (employees.length) {
    const pick = employees[db.prepare("SELECT COUNT(*) c FROM leads WHERE assigned_to IS NOT NULL").get().c % employees.length];
    db.prepare("UPDATE leads SET assigned_to=? WHERE id=?").run(pick.id, leadId);
    leadHistory(leadId, null, "assigned", "Auto-assigned to " + pick.name);
    notify(pick.id, "New website enquiry", `${b.name} from ${b.organization || "an institution"} is interested in ${interestName}.`, "email", "/portal.html#/leads");
  }
  db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
    .run("team@ultraconnect.in", `New enquiry: ${b.name}`, JSON.stringify(b), "enquiry");
  res.json({ ok: true, id: r.lastInsertRowid, leadId });
});

app.get("/api/enquiries", requireRole("admin", "employee"), (req, res) => {
  res.json({ enquiries: db.prepare("SELECT * FROM enquiries ORDER BY id DESC LIMIT 200").all() });
});

/* ---------- leads / CRM (M2) ---------- */
function leadScope(user, sql, args) {
  if (user.role === "admin") return [sql, args];
  return [sql + " AND (l.assigned_to = ? OR l.assigned_to IS NULL)", [...args, user.id]];
}

app.get("/api/leads", requireAuth, (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT l.*, u.name AS assignee_name FROM leads l
             LEFT JOIN users u ON u.id = l.assigned_to WHERE 1=1`;
  const args = [];
  if (status) { sql += " AND l.status = ?"; args.push(status); }
  if (q) { sql += " AND (l.name LIKE ? OR l.organization LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  const [fsql, fargs] = leadScope(req.session.user, sql, args);
  res.json({ leads: db.prepare(fsql + " ORDER BY l.updated_at DESC").all(...fargs) });
});

app.get("/api/leads/:id", requireAuth, (req, res) => {
  const l = db.prepare(`SELECT l.*, u.name AS assignee_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to WHERE l.id=?`).get(req.params.id);
  if (!l) return res.status(404).json({ error: "Lead not found" });
  if (req.session.user.role !== "admin" && l.assigned_to !== req.session.user.id && l.assigned_to != null) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const history = db.prepare(`SELECT h.*, u.name AS user_name FROM lead_history h LEFT JOIN users u ON u.id=h.user_id WHERE h.lead_id=? ORDER BY h.id DESC`).all(l.id);
  const visits = db.prepare("SELECT * FROM visits WHERE lead_id=? ORDER BY visit_date DESC").all(l.id);
  const followUps = db.prepare("SELECT * FROM follow_ups WHERE lead_id=? ORDER BY due_date").all(l.id);
  const orders = db.prepare("SELECT * FROM orders WHERE lead_id=? ORDER BY id DESC").all(l.id);
  res.json({ lead: l, history, visits, followUps, orders });
});

app.post("/api/leads", requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "Name is required" });
  const assigned = b.assigned_to != null ? b.assigned_to : (req.session.user.role === "employee" ? req.session.user.id : null);
  const r = db.prepare(
    `INSERT INTO leads (name,organization,designation,address,city,phone,email,students,products_interest,notes,status,assigned_to,source,follow_up_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(b.name, b.organization || "", b.designation || "", b.address || "", b.city || "", b.phone || "", b.email || "", b.students || "", b.products_interest || "", b.notes || "", b.status || "New", assigned, b.source || "manual", b.follow_up_date || null);
  const id = r.lastInsertRowid;
  leadHistory(id, req.session.user.id, "created", "Lead created");
  if (b.follow_up_date) {
    db.prepare("INSERT INTO follow_ups (lead_id,due_date,notes,created_by) VALUES (?,?,?,?)").run(id, b.follow_up_date, b.follow_up_notes || "Follow-up scheduled at lead creation", req.session.user.id);
  }
  res.json({ ok: true, id });
});

app.put("/api/leads/:id", requireAuth, (req, res) => {
  const l = db.prepare("SELECT * FROM leads WHERE id=?").get(req.params.id);
  if (!l) return res.status(404).json({ error: "Lead not found" });
  if (req.session.user.role !== "admin" && l.assigned_to !== req.session.user.id) return res.status(403).json({ error: "Forbidden" });
  const b = req.body || {};
  const fields = ["name","organization","designation","address","city","phone","email","students","products_interest","notes","status","follow_up_date"];
  const changes = [];
  for (const f of fields) {
    if (b[f] !== undefined && String(b[f] ?? "") !== String(l[f] ?? "")) {
      changes.push(`${f}: "${l[f]}" → "${b[f]}"`);
      db.prepare(`UPDATE leads SET ${f} = ? WHERE id = ?`).run(b[f] || (f === "follow_up_date" ? null : ""), l.id);
    }
  }
  if (b.assigned_to !== undefined && Number(b.assigned_to) !== l.assigned_to && req.session.user.role === "admin") {
    changes.push(`assigned_to: ${l.assigned_to} → ${b.assigned_to}`);
    db.prepare("UPDATE leads SET assigned_to=? WHERE id=?").run(b.assigned_to || null, l.id);
    if (b.assigned_to) notify(Number(b.assigned_to), "Lead reassigned to you", `Lead #${l.id} (${l.name}) was assigned to you by ${req.session.user.name}.`, "inapp", "/portal.html#/leads");
  }
  if (b.status && b.status !== l.status) {
    if (b.status === "Closed-Won" && l.source !== "order") {
      // nothing special — finance entry is created on payment
    }
  }
  if (changes.length) {
    db.prepare("UPDATE leads SET updated_at=datetime('now') WHERE id=?").run(l.id);
    leadHistory(l.id, req.session.user.id, "updated", changes.join("; "));
  }
  if (b.follow_up_date && b.follow_up_date !== l.follow_up_date) {
    db.prepare("INSERT INTO follow_ups (lead_id,due_date,notes,created_by) VALUES (?,?,?,?)").run(l.id, b.follow_up_date, b.follow_up_notes || "Follow-up scheduled", req.session.user.id);
  }
  res.json({ ok: true });
});

app.delete("/api/leads/:id", requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM lead_history WHERE lead_id=?").run(req.params.id);
  db.prepare("DELETE FROM follow_ups WHERE lead_id=?").run(req.params.id);
  db.prepare("DELETE FROM visits WHERE lead_id=?").run(req.params.id);
  db.prepare("DELETE FROM leads WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

/* ---------- follow-ups (M3) ---------- */
app.get("/api/follow-ups", requireAuth, (req, res) => {
  const user = req.session.user;
  let sql = `SELECT f.*, l.name AS lead_name, l.organization, l.phone, l.email, l.status AS lead_status
             FROM follow_ups f JOIN leads l ON l.id = f.lead_id WHERE 1=1`;
  const args = [];
  if (user.role !== "admin") { sql += " AND (l.assigned_to = ? OR l.assigned_to IS NULL)"; args.push(user.id); }
  if (req.query.status) { sql += " AND f.status = ?"; args.push(req.query.status); }
  res.json({ followUps: db.prepare(sql + " ORDER BY f.due_date ASC").all(...args) });
});

app.post("/api/follow-ups", requireAuth, (req, res) => {
  const { lead_id, due_date, notes } = req.body || {};
  const l = db.prepare("SELECT * FROM leads WHERE id=?").get(lead_id);
  if (!l) return res.status(404).json({ error: "Lead not found" });
  db.prepare("INSERT INTO follow_ups (lead_id,due_date,notes,created_by) VALUES (?,?,?,?)").run(lead_id, due_date, notes || "", req.session.user.id);
  db.prepare("UPDATE leads SET follow_up_date=?, updated_at=datetime('now') WHERE id=?").run(due_date, lead_id);
  leadHistory(lead_id, req.session.user.id, "follow_up", `Follow-up scheduled for ${due_date}`);
  res.json({ ok: true });
});

app.post("/api/follow-ups/:id/complete", requireAuth, (req, res) => {
  const f = db.prepare("SELECT * FROM follow_ups WHERE id=?").get(req.params.id);
  if (!f) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE follow_ups SET status='done' WHERE id=?").run(f.id);
  leadHistory(f.lead_id, req.session.user.id, "follow_up_done", `Follow-up on ${f.due_date} marked done`);
  res.json({ ok: true });
});

// Daily scheduler: reminders 1 day before + overdue flags
function runFollowUpSweep() {
  const today = new Date();
  const tomorrow = localDateStr(new Date(today.getTime() + 86400000));
  const todayStr = localDateStr(today);
  const due = db.prepare(
    `SELECT f.*, l.name lead_name, l.organization, l.phone, l.email, l.assigned_to, u.name assignee_name, u.email assignee_email
     FROM follow_ups f JOIN leads l ON l.id=f.lead_id LEFT JOIN users u ON u.id=l.assigned_to
     WHERE f.status='pending' AND f.reminded=0 AND f.due_date = ?`
  ).all(tomorrow);
  for (const f of due) {
    const title = "Follow-up reminder (tomorrow)";
    const body = `Follow-up with ${f.lead_name}${f.organization ? " — " + f.organization : ""} is due on ${f.due_date}.`;
    if (f.assigned_to) notify(f.assigned_to, title, body + ` Notes: ${f.notes || "-"}`, "email", "/portal.html#/follow-ups");
    if (f.email) {
      db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
        .run(f.email, "Follow-up reminder — Ultra Connect", `Dear ${f.lead_name}, a friendly reminder about our follow-up on ${f.due_date}. — Ultra Connect team`, "follow_up_reminder");
      notify(f.assigned_to, "Customer reminder logged", `Reminder email logged for ${f.lead_name} (${f.email}).`, "whatsapp");
    }
    db.prepare("UPDATE follow_ups SET reminded=1 WHERE id=?").run(f.id);
  }
  const overdue = db.prepare(
    `UPDATE follow_ups SET status='overdue' WHERE status='pending' AND due_date < ? AND reminded=1`
  ).run(todayStr);
  if (overdue.changes > 0) {
    const rows = db.prepare(
      `SELECT f.*, l.name lead_name, l.assigned_to FROM follow_ups f JOIN leads l ON l.id=f.lead_id
       WHERE f.status='overdue' AND f.due_date = date(?, '-1 day')`
    ).all(todayStr);
    for (const f of rows) {
      if (f.assigned_to) notify(f.assigned_to, "Overdue follow-up", `${f.lead_name}'s follow-up on ${f.due_date} was missed.`, "inapp", "/portal.html#/follow-ups");
    }
  }
}
setInterval(runFollowUpSweep, 1000 * 60 * 30);
runFollowUpSweep();

/* ---------- field visits / CRM diary (M7) ---------- */
app.get("/api/visits", requireAuth, (req, res) => {
  const user = req.session.user;
  let sql = `SELECT v.*, u.name user_name, l.name lead_name, l.organization FROM visits v
             LEFT JOIN users u ON u.id=v.user_id LEFT JOIN leads l ON l.id=v.lead_id WHERE 1=1`;
  const args = [];
  if (user.role !== "admin") { sql += " AND (v.user_id = ? OR l.assigned_to = ? OR l.assigned_to IS NULL)"; args.push(user.id, user.id); }
  res.json({ visits: db.prepare(sql + " ORDER BY v.visit_date DESC").all(...args) });
});

app.post("/api/visits", requireAuth, (req, res) => {
  const { lead_id, visit_date, client_name, location, discussion, outcome } = req.body || {};
  const r = db.prepare(
    "INSERT INTO visits (lead_id,user_id,visit_date,client_name,location,discussion,outcome) VALUES (?,?,?,?,?,?,?)"
  ).run(lead_id || null, req.session.user.id, visit_date || localDateStr(), client_name || "", location || "", discussion || "", outcome || "");
  if (lead_id) leadHistory(lead_id, req.session.user.id, "visit", `Visit logged on ${visit_date}: ${outcome || discussion || ""}`);
  res.json({ ok: true, id: r.lastInsertRowid });
});

/* ---------- vendors (M5) ---------- */
app.post("/api/vendors/register", (req, res) => {
  const { name, email, password, company_name, phone, gstin, address, city, state } = req.body || {};
  if (!email || !password || !company_name) return res.status(400).json({ error: "Email, password and company name required" });
  const exists = db.prepare("SELECT id FROM users WHERE email=?").get(String(email).toLowerCase().trim());
  if (exists) return res.status(400).json({ error: "An account with this email already exists" });
  const r = db.prepare("INSERT INTO users (email,password_hash,name,role,phone) VALUES (?,?,?,?,?)")
    .run(String(email).toLowerCase().trim(), bcrypt.hashSync(String(password), 10), name || company_name, "vendor", phone || "");
  db.prepare("INSERT INTO vendors (user_id,company_name,gstin,address,city,state,phone,approved) VALUES (?,?,?,?,?,?,?,0)")
    .run(r.lastInsertRowid, company_name, gstin || "", address || "", city || "", state || "", phone || "");
  const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
  for (const a of admins) notify(a.id, "New vendor registration", `${company_name} registered as a vendor and is awaiting approval.`, "email", "/portal.html#/vendors");
  res.json({ ok: true, message: "Registration received. Your account is pending admin approval." });
});

app.get("/api/vendors", requireRole("admin"), (_req, res) => {
  const rows = db.prepare(
    `SELECT v.*, u.email, u.name contact_name,
      (SELECT COUNT(*) FROM products p WHERE p.vendor_id = v.id) product_count
     FROM vendors v JOIN users u ON u.id = v.user_id ORDER BY v.id DESC`
  ).all();
  res.json({ vendors: rows });
});

app.post("/api/vendors/:id/approve", requireRole("admin"), (req, res) => {
  const v = db.prepare("SELECT * FROM vendors WHERE id=?").get(req.params.id);
  if (!v) return res.status(404).json({ error: "Vendor not found" });
  db.prepare("UPDATE vendors SET approved=1 WHERE id=?").run(v.id);
  notify(v.user_id, "Vendor account approved", "Your vendor account is now active. Your approved products will appear on the catalog.", "email");
  res.json({ ok: true });
});

app.post("/api/vendors/:id/products/:pid/approve", requireRole("admin"), (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id=? AND vendor_id=?").get(req.params.pid, req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  db.prepare("UPDATE products SET status='active', updated_at=datetime('now') WHERE id=?").run(p.id);
  notify(db.prepare("SELECT user_id FROM vendors WHERE id=?").get(req.params.id).user_id, "Product approved", `"${p.name}" is now live on the catalog.`, "email");
  res.json({ ok: true });
});

/* ---------- products management ---------- */
app.get("/api/admin/products", requireRole("admin", "employee", "vendor"), (req, res) => {
  const user = req.session.user;
  let sql = `SELECT p.*, v.company_name vendor_name, v.user_id vendor_user_id FROM products p
             LEFT JOIN vendors v ON v.id = p.vendor_id WHERE 1=1`;
  const args = [];
  if (user.role === "vendor") {
    const v = db.prepare("SELECT id FROM vendors WHERE user_id=?").get(user.id);
    sql += " AND p.vendor_id = ?";
    args.push(v ? v.id : -1);
  }
  if (req.query.status) { sql += " AND p.status = ?"; args.push(req.query.status); }
  res.json({ products: db.prepare(sql + " ORDER BY p.updated_at DESC").all(...args).map(publicProduct) });
});

app.post("/api/admin/products", requireRole("admin", "vendor"), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.sku) return res.status(400).json({ error: "SKU and name required" });
  let vendorId = null;
  if (req.session.user.role === "vendor") {
    const v = db.prepare("SELECT * FROM vendors WHERE user_id=?").get(req.session.user.id);
    if (!v) return res.status(403).json({ error: "No vendor profile" });
    vendorId = v.id;
    if (!v.approved) return res.status(403).json({ error: "Vendor account not yet approved" });
  }
  const status = req.session.user.role === "admin" ? (b.status || "active") : "pending";
  try {
    const r = db.prepare(
      `INSERT INTO products (sku,name,category,description,specs,price,mrp,stock_on_hand,vendor_id,status,featured)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(b.sku, b.name, b.category || "General", b.description || "", JSON.stringify(b.specs || {}), Number(b.price) || 0, Number(b.mrp) || 0, Number(b.stock_on_hand) || 0, vendorId, status, b.featured ? 1 : 0);
    res.json({ ok: true, id: r.lastInsertRowid, status });
  } catch (e) {
    res.status(400).json({ error: "SKU already exists" });
  }
});

app.put("/api/admin/products/:id", requireRole("admin", "vendor"), (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  if (req.session.user.role === "vendor") {
    const v = db.prepare("SELECT id FROM vendors WHERE user_id=?").get(req.session.user.id);
    if (!v || v.id !== p.vendor_id) return res.status(403).json({ error: "Forbidden" });
  }
  const b = req.body || {};
  const map = { name: b.name, category: b.category, description: b.description, price: b.price, mrp: b.mrp, stock_on_hand: b.stock_on_hand, status: b.status, featured: b.featured };
  const changes = [];
  for (const [f, val] of Object.entries(map)) {
    if (val === undefined) continue;
    let nv = val;
    if (["price", "mrp"].includes(f)) nv = Number(val) || 0;
    if (["stock_on_hand", "featured"].includes(f)) nv = Number(val) || 0;
    if (String(p[f] ?? "") !== String(nv ?? "")) {
      changes.push(`${f}: "${p[f]}" → "${nv}"`);
      db.prepare(`UPDATE products SET ${f} = ? WHERE id = ?`).run(nv, p.id);
    }
  }
  if (b.specs !== undefined) {
    const ns = JSON.stringify(b.specs);
    if (ns !== p.specs) { changes.push("specs updated"); db.prepare("UPDATE products SET specs=? WHERE id=?").run(ns, p.id); }
  }
  if (changes.length) {
    db.prepare("UPDATE products SET updated_at=datetime('now') WHERE id=?").run(p.id);
    db.prepare("INSERT INTO product_update_log (product_id,user_id,changes) VALUES (?,?,?)").run(p.id, req.session.user.id, changes.join("; "));
    const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
    if (req.session.user.role === "vendor") {
      for (const a of admins) notify(a.id, "Vendor product updated", `Vendor product #${p.id} (${p.name}): ${changes.join("; ")}`, "inapp", "/portal.html#/products-admin");
    }
  }
  res.json({ ok: true });
});

app.get("/api/admin/products/:id/updates", requireRole("admin"), (req, res) => {
  const rows = db.prepare(
    `SELECT log.*, u.name user_name, u.role FROM product_update_log log LEFT JOIN users u ON u.id=log.user_id
     WHERE log.product_id=? ORDER BY log.id DESC`
  ).all(req.params.id);
  res.json({ updates: rows });
});

/* ---------- orders (M6) ---------- */
function visibleOrdersWhere(user, extra) {
  if (user.role === "admin") return [`1=1 ${extra || ""}`, []];
  if (user.role === "employee") return [`1=1 ${extra || ""}`, []];
  const v = db.prepare("SELECT id FROM vendors WHERE user_id=?").get(user.id);
  return [
    `o.id IN (SELECT oi.order_id FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE p.vendor_id = ?) ${extra || ""}`,
    [v ? v.id : -1],
  ];
}

app.get("/api/orders", requireAuth, (req, res) => {
  const [w, a] = visibleOrdersWhere(req.session.user, "");
  const rows = db.prepare(
    `SELECT o.*, u.name created_by_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id=o.id) item_count,
      (SELECT COALESCE(SUM(amount),0) FROM payments py WHERE py.order_id=o.id AND py.status='received') paid
     FROM orders o LEFT JOIN users u ON u.id=o.created_by WHERE ${w} ORDER BY o.id DESC`
  ).all(...a);
  res.json({ orders: rows });
});

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  if (req.session.user.role === "vendor") {
    const v = db.prepare("SELECT id FROM vendors WHERE user_id=?").get(req.session.user.id);
    const has = db.prepare("SELECT 1 FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? AND p.vendor_id=?").get(o.id, v ? v.id : -1);
    if (!has) return res.status(403).json({ error: "Forbidden" });
  }
  const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);
  const payments = db.prepare("SELECT * FROM payments WHERE order_id=? ORDER BY id DESC").all(o.id);
  const invoice = db.prepare("SELECT * FROM invoices WHERE order_id=?").get(o.id);
  res.json({ order: o, items, payments, invoice });
});

app.post("/api/orders", requireAuth, (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items.filter((i) => i.product_id && i.qty > 0) : [];
  if (!items.length) return res.status(400).json({ error: "At least one item is required" });
  if (!b.customer_name) return res.status(400).json({ error: "Customer name is required" });
  let sub = 0;
  const resolved = [];
  for (const it of items) {
    const p = db.prepare("SELECT * FROM products WHERE id=? AND status='active'").get(it.product_id);
    if (!p) return res.status(400).json({ error: `Product ${it.product_id} not found` });
    if (p.stock_on_hand < Number(it.qty) && p.stock_on_hand >= 0) {
      return res.status(400).json({ error: `Insufficient stock for ${p.name} (available: ${p.stock_on_hand})` });
    }
    const price = Number(it.unit_price) > 0 ? Number(it.unit_price) : p.price;
    sub += price * Number(it.qty);
    resolved.push({ p, qty: Number(it.qty), price });
  }
  const rate = Number(getSetting("tax_rate_percent", "18"));
  const tax = Math.round(sub * rate) / 100;
  const total = sub + tax;
  const orderNo = getSetting("order_prefix", "UC/ORD/2026/") + pad(nextSeq("order_seq"), 4);
  const r = db.prepare(
    `INSERT INTO orders (order_no,lead_id,customer_name,customer_phone,customer_email,customer_address,status,is_bulk,subtotal,tax,total,notes,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(orderNo, b.lead_id || null, b.customer_name, b.customer_phone || "", b.customer_email || "", b.customer_address || "", "Placed", b.is_bulk || items.some((i) => i.qty >= 10) ? 1 : 0, sub, tax, total, b.notes || "", req.session.user.id);
  const oid = r.lastInsertRowid;
  for (const { p, qty, price } of resolved) {
    db.prepare("INSERT INTO order_items (order_id,product_id,product_name,qty,unit_price) VALUES (?,?,?,?,?)").run(oid, p.id, p.name, qty, price);
    db.prepare("UPDATE products SET stock_on_hand=stock_on_hand-?, units_sold=units_sold+?, updated_at=datetime('now') WHERE id=?").run(qty, qty, p.id);
    if (p.stock_on_hand - qty <= 5) {
      const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
      for (const a of admins) notify(a.id, "Low stock alert", `${p.name} is low on stock (remaining: ${p.stock_on_hand - qty}).`, "inapp", "/portal.html#/inventory");
    }
    if (p.vendor_id) {
      const v = db.prepare("SELECT user_id FROM vendors WHERE id=?").get(p.vendor_id);
      if (v) notify(v.user_id, "New order for your product", `${qty} × ${p.name} ordered (order ${orderNo}).`, "email", "/portal.html#/orders");
    }
  }
  if (b.lead_id) {
    leadHistory(b.lead_id, req.session.user.id, "order", `Order ${orderNo} placed — total ₹${total.toFixed(2)}`);
    db.prepare("UPDATE leads SET status='Closed-Won', updated_at=datetime('now') WHERE id=? AND status NOT LIKE 'Closed%'").run(b.lead_id);
  }
  res.json({ ok: true, id: oid, order_no: orderNo, total });
});

app.put("/api/orders/:id/status", requireRole("admin", "employee"), (req, res) => {
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  const { status } = req.body || {};
  if (!["Placed", "Confirmed", "Dispatched", "Delivered", "Cancelled"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(status, o.id);
  if (status === "Cancelled") {
    const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);
    for (const it of items) db.prepare("UPDATE products SET stock_on_hand=stock_on_hand+?, units_sold=MAX(0,units_sold-?) WHERE id=?").run(it.qty, it.qty, it.product_id);
  }
  if (o.lead_id) leadHistory(o.lead_id, req.session.user.id, "order_status", `Order ${o.order_no} → ${status}`);
  if (o.customer_email) {
    db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
      .run(o.customer_email, `Order ${o.order_no} — ${status}`, `Your order ${o.order_no} is now "${status}". — Ultra Connect`, "order_status");
  }
  res.json({ ok: true });
});

/* ---------- invoices (M11) ---------- */
app.get("/api/invoices", requireRole("admin", "employee"), (_req, res) => {
  const rows = db.prepare(
    `SELECT i.*, o.order_no FROM invoices i LEFT JOIN orders o ON o.id=i.order_id ORDER BY i.id DESC`
  ).all();
  res.json({ invoices: rows });
});

app.get("/api/invoices/:id", requireRole("admin", "employee"), (req, res) => {
  const inv = db.prepare(
    `SELECT i.*, o.order_no, o.customer_phone, o.customer_email FROM invoices i LEFT JOIN orders o ON o.id=i.order_id WHERE i.id=?`
  ).get(req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  let lines = [];
  try { lines = JSON.parse(inv.line_items); } catch {}
  res.json({ invoice: { ...inv, lines } });
});

app.post("/api/invoices", requireRole("admin", "employee"), (req, res) => {
  const { order_id } = req.body || {};
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(order_id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  const existing = db.prepare("SELECT id FROM invoices WHERE order_id=?").get(o.id);
  if (existing) return res.status(400).json({ error: "Invoice already exists for this order", id: existing.id });
  const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);
  const lines = items.map((it) => ({ name: it.product_name, qty: it.qty, unit_price: it.unit_price, amount: it.qty * it.unit_price }));
  const invoiceNo = getSetting("invoice_prefix", "UC/INV/2026/") + pad(nextSeq("invoice_seq"), 4);
  const r = db.prepare(
    `INSERT INTO invoices (invoice_no,order_id,lead_id,customer_name,customer_address,line_items,subtotal,tax,total,status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(invoiceNo, o.id, o.lead_id, o.customer_name, o.customer_address, JSON.stringify(lines), o.subtotal, o.tax, o.total, "issued");
  res.json({ ok: true, id: r.lastInsertRowid, invoice_no: invoiceNo });
});

/* ---------- payments (M8) ---------- */
app.post("/api/payments", requireRole("admin", "employee"), (req, res) => {
  const { order_id, invoice_id, amount, mode, reference } = req.body || {};
  if (!["UPI", "Bank Transfer", "Cash", "Cheque", "Card"].includes(mode)) return res.status(400).json({ error: "Invalid payment mode" });
  if (!(Number(amount) > 0)) return res.status(400).json({ error: "Amount must be positive" });
  const o = order_id ? db.prepare("SELECT * FROM orders WHERE id=?").get(order_id) : null;
  const inv = invoice_id ? db.prepare("SELECT * FROM invoices WHERE id=?").get(invoice_id) : o ? db.prepare("SELECT * FROM invoices WHERE order_id=?").get(o.id) : null;
  const r = db.prepare(
    "INSERT INTO payments (order_id,invoice_id,amount,mode,reference,status,created_by) VALUES (?,?,?,?,?,?,?)"
  ).run(order_id || null, inv ? inv.id : null, Number(amount), mode, reference || "", "received", req.session.user.id);
  if (inv) {
    const paid = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE invoice_id=? AND status='received'").get(inv.id).s;
    if (paid >= inv.total) db.prepare("UPDATE invoices SET status='paid' WHERE id=?").run(inv.id);
  }
  db.prepare("INSERT INTO finance_entries (type,category,amount,note,ref,entry_date,created_by) VALUES (?,?,?,?,?,?,?)")
    .run("income", "Sales", Number(amount), `Payment ${mode}${reference ? " ref " + reference : ""}${o ? " — " + o.customer_name : ""}`, inv ? inv.invoice_no : (o ? o.order_no : ""), localDateStr(), req.session.user.id);
  if (o && o.customer_email) {
    db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
      .run(o.customer_email, `Payment received — ${inv ? inv.invoice_no : o.order_no}`, `We have received ₹${Number(amount).toFixed(2)} via ${mode}${reference ? " (" + reference + ")" : ""}. Thank you! — Ultra Connect`, "payment_receipt");
    if (o.lead_id) notify(req.session.user.id, "Payment confirmation logged", `Receipt email logged to ${o.customer_email} for ₹${Number(amount).toFixed(2)}.`, "inapp");
  }
  res.json({ ok: true, id: r.lastInsertRowid });
});

app.get("/api/payments", requireRole("admin", "employee"), (_req, res) => {
  const rows = db.prepare(
    `SELECT py.*, o.order_no, i.invoice_no FROM payments py
     LEFT JOIN orders o ON o.id=py.order_id LEFT JOIN invoices i ON i.id=py.invoice_id
     ORDER BY py.id DESC LIMIT 200`
  ).all();
  res.json({ payments: rows });
});

/* ---------- inventory (M10) ---------- */
app.get("/api/inventory", requireRole("admin", "employee", "vendor"), (req, res) => {
  const user = req.session.user;
  let sql = `SELECT p.id,p.sku,p.name,p.category,p.stock_on_hand,p.units_sold,p.status,v.company_name vendor_name
             FROM products p LEFT JOIN vendors v ON v.id=p.vendor_id WHERE 1=1`;
  const args = [];
  if (user.role === "vendor") {
    const v = db.prepare("SELECT id FROM vendors WHERE user_id=?").get(user.id);
    sql += " AND p.vendor_id=?";
    args.push(v ? v.id : -1);
  }
  const rows = db.prepare(sql).all(...args).map((r) => ({ ...r, low_stock: r.stock_on_hand <= 5 }));
  res.json({ inventory: rows, lowStock: rows.filter((r) => r.low_stock).length });
});

/* ---------- finance (M12) — admin only ---------- */
app.get("/api/finance", requireRole("admin"), (req, res) => {
  const { from, to } = req.query;
  let sql = "SELECT f.*, u.name created_by_name FROM finance_entries f LEFT JOIN users u ON u.id=f.created_by WHERE 1=1";
  const args = [];
  if (from) { sql += " AND f.entry_date >= ?"; args.push(from); }
  if (to) { sql += " AND f.entry_date <= ?"; args.push(to); }
  const rows = db.prepare(sql + " ORDER BY f.entry_date DESC, f.id DESC").all(...args);
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  res.json({ entries: rows, summary: { income, expense, net: income - expense } });
});

app.post("/api/finance", requireRole("admin"), (req, res) => {
  const { type, category, amount, note, ref, entry_date } = req.body || {};
  if (!["income", "expense"].includes(type)) return res.status(400).json({ error: "Type must be income or expense" });
  if (!(Number(amount) > 0)) return res.status(400).json({ error: "Amount must be positive" });
  const r = db.prepare(
    "INSERT INTO finance_entries (type,category,amount,note,ref,entry_date,created_by) VALUES (?,?,?,?,?,?,?)"
  ).run(type, category || "General", Number(amount), note || "", ref || "", entry_date || localDateStr(), req.session.user.id);
  res.json({ ok: true, id: r.lastInsertRowid });
});

/* ---------- users & admin ---------- */
app.get("/api/admin/users", requireRole("admin"), (_req, res) => {
  const rows = db.prepare(
    `SELECT u.id,u.email,u.name,u.role,u.phone,u.active,u.created_at,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to=u.id) lead_count,
      v.company_name vendor_company, v.approved vendor_approved
     FROM users u LEFT JOIN vendors v ON v.user_id=u.id ORDER BY u.role,u.name`
  ).all();
  res.json({ users: rows });
});

app.post("/api/admin/users", requireRole("admin"), (req, res) => {
  const { name, email, password, role, phone } = req.body || {};
  if (!["admin", "employee", "vendor"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (!email || !password || !name) return res.status(400).json({ error: "Name, email and password required" });
  try {
    const r = db.prepare("INSERT INTO users (email,password_hash,name,role,phone) VALUES (?,?,?,?,?)")
      .run(String(email).toLowerCase().trim(), bcrypt.hashSync(String(password), 10), name, role, phone || "");
    res.json({ ok: true, id: r.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/admin/users/:id/toggle", requireRole("admin"), (req, res) => {
  db.prepare("UPDATE users SET active = 1 - active WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/settings", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings: map });
});

app.put("/api/settings", requireRole("admin"), (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k, String(v));
  }
  res.json({ ok: true });
});

/* ---------- notifications (M15) ---------- */
app.get("/api/notifications", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY id DESC LIMIT 50"
  ).all(req.session.user.id);
  const unread = db.prepare("SELECT COUNT(*) c FROM notifications WHERE read=0 AND (user_id IS NULL OR user_id=?)").get(req.session.user.id).c;
  res.json({ notifications: rows, unread });
});

app.post("/api/notifications/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(req.session.user.id);
  res.json({ ok: true });
});

app.get("/api/email-log", requireRole("admin", "employee"), (_req, res) => {
  res.json({ log: db.prepare("SELECT * FROM email_log ORDER BY id DESC LIMIT 100").all() });
});

/* ---------- dashboard (M14) ---------- */
app.get("/api/dashboard", requireAuth, (req, res) => {
  const user = req.session.user;
  const mine = user.role !== "admin";
  const uid = user.id;
  const leadWhere = mine ? "assigned_to = ? OR assigned_to IS NULL" : "1=1";
  const args = mine ? [uid] : [];
  const leads = db.prepare(`SELECT COUNT(*) c FROM leads WHERE ${leadWhere}`).get(...args).c;
  const newLeads = db.prepare(`SELECT COUNT(*) c FROM leads WHERE (${leadWhere}) AND status='New'`).get(...args).c;
  const won = db.prepare(`SELECT COUNT(*) c FROM leads WHERE (${leadWhere}) AND status='Closed-Won'`).get(...args).c;
  const pendingFu = db.prepare(
    `SELECT COUNT(*) c FROM follow_ups f JOIN leads l ON l.id=f.lead_id WHERE f.status='pending' AND (${leadWhere})`
  ).get(...args).c;
  const overdueFu = db.prepare(
    `SELECT COUNT(*) c FROM follow_ups f JOIN leads l ON l.id=f.lead_id WHERE f.status='overdue' AND (${leadWhere})`
  ).get(...args).c;
  const recentLeads = db.prepare(
    `SELECT l.*, u.name assignee_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to
     WHERE ${leadWhere} ORDER BY l.updated_at DESC LIMIT 8`
  ).all(...args);
  const stats = { leads, newLeads, won, pendingFu, overdueFu, recentLeads };

  if (user.role === "admin") {
    stats.orders = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
    stats.orderValue = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'Cancelled'").get().s;
    stats.paymentsReceived = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status='received'").get().s;
    stats.vendors = db.prepare("SELECT COUNT(*) c FROM vendors").get().c;
    stats.pendingVendors = db.prepare("SELECT COUNT(*) c FROM vendors WHERE approved=0").get().c;
    stats.pendingProducts = db.prepare("SELECT COUNT(*) c FROM products WHERE status='pending'").get().c;
    stats.lowStock = db.prepare("SELECT COUNT(*) c FROM products WHERE status='active' AND stock_on_hand<=5").get().c;
    stats.enquiries = db.prepare("SELECT COUNT(*) c FROM enquiries").get().c;
    stats.income = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM finance_entries WHERE type='income'").get().s;
    stats.expense = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM finance_entries WHERE type='expense'").get().s;
    stats.recentOrders = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 8").all();
    stats.topProducts = db.prepare(
      `SELECT name, units_sold, category FROM products WHERE status='active' ORDER BY units_sold DESC LIMIT 8`
    ).all();
    stats.pipeline = db.prepare("SELECT status, COUNT(*) n FROM leads GROUP BY status").all();
  } else if (user.role === "employee") {
    stats.myOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE created_by=?").get(uid).c;
    stats.myVisits = db.prepare("SELECT COUNT(*) c FROM visits WHERE user_id=?").get(uid).c;
  } else {
    const v = db.prepare("SELECT id, company_name, approved FROM vendors WHERE user_id=?").get(uid);
    stats.vendor = v;
    if (v) {
      stats.myProducts = db.prepare("SELECT COUNT(*) c FROM products WHERE vendor_id=?").get(v.id).c;
      stats.myPending = db.prepare("SELECT COUNT(*) c FROM products WHERE vendor_id=? AND status='pending'").get(v.id).c;
      stats.myOrderItems = db.prepare(
        `SELECT COUNT(DISTINCT oi.order_id) orders, COALESCE(SUM(oi.qty*oi.unit_price),0) value
         FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE p.vendor_id=?`
      ).get(v.id);
    }
  }
  res.json({ dashboard: stats, user });
});

/* ---------- reports CSV (M14) ---------- */
app.get("/api/reports/:type.csv", requireRole("admin", "employee"), (req, res) => {
  const type = req.params.type;
  let rows = [];
  if (type === "leads") {
    rows = db.prepare("SELECT id,name,organization,city,phone,email,status,products_interest,follow_up_date,created_at FROM leads").all();
  } else if (type === "sales") {
    rows = db.prepare("SELECT o.order_no,o.customer_name,o.status,o.total,o.created_at FROM orders o").all();
  } else if (type === "inventory") {
    rows = db.prepare("SELECT sku,name,category,stock_on_hand,units_sold,status FROM products").all();
  } else if (type === "finance") {
    rows = db.prepare("SELECT entry_date,type,category,amount,note,ref FROM finance_entries ORDER BY entry_date").all();
  } else if (type === "enquiries") {
    rows = db.prepare("SELECT id,name,organization,phone,email,interest,status,created_at FROM enquiries").all();
  } else {
    return res.status(404).json({ error: "Unknown report" });
  }
  if (!rows.length) return res.send("");
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=ultra-connect-${type}-report.csv`);
  res.send(csv);
});

/* ---------- static site ---------- */
/* Never expose backend source, config or the database over HTTP. */
const PRIVATE_FILE = /^\/(server\.js|db\.js|package(-lock)?\.json|render\.yaml|vercel\.json|\.vercelignore|\.env|__.*\.js)$/i;
app.use((req, res, next) => {
  const p = req.path;
  if (PRIVATE_FILE.test(p) || p.startsWith("/data/") || p.startsWith("/node_modules/") || p.startsWith("/.git/")) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(__dirname, { extensions: ["html"], dotfiles: "ignore" }));
app.get("/portal", (_req, res) => res.redirect("/portal.html"));
app.get("/products", (_req, res) => res.redirect("/products.html"));
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ultra Connect platform running at http://localhost:${PORT}`);
  console.log(`Portal: http://localhost:${PORT}/portal.html`);
});
