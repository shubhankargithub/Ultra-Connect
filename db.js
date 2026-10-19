/* Ultra Connect — SQLite database (node:sqlite) + seed */
"use strict";
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const DATA_DIR = process.env.DB_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = process.env.DB_PATH || path.join(DATA_DIR, "ultraconnect.db");
const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL;");

function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','employee','vendor')),
    phone TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    gstin TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    specs TEXT DEFAULT '{}',
    price REAL NOT NULL DEFAULT 0,
    mrp REAL DEFAULT 0,
    stock_on_hand INTEGER NOT NULL DEFAULT 0,
    units_sold INTEGER NOT NULL DEFAULT 0,
    vendor_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','rejected','draft')),
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS product_update_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    changes TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organization TEXT DEFAULT '',
    designation TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    students TEXT DEFAULT '',
    products_interest TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    follow_up_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lead_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','overdue')),
    reminded INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    user_id INTEGER,
    visit_date TEXT NOT NULL,
    client_name TEXT DEFAULT '',
    location TEXT DEFAULT '',
    discussion TEXT DEFAULT '',
    outcome TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    lead_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT DEFAULT '',
    customer_email TEXT DEFAULT '',
    customer_address TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Placed' CHECK(status IN ('Placed','Confirmed','Dispatched','Delivered','Cancelled')),
    is_bulk INTEGER NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    order_id INTEGER,
    lead_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_address TEXT DEFAULT '',
    line_items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','paid','void')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    invoice_id INTEGER,
    amount REAL NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('UPI','Bank Transfer','Cash','Cheque','Card')),
    reference TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','pending','failed')),
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by INTEGER
  );
  CREATE TABLE IF NOT EXISTS finance_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    category TEXT DEFAULT '',
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    ref TEXT DEFAULT '',
    entry_date TEXT NOT NULL,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organization TEXT DEFAULT '',
    designation TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    city TEXT DEFAULT '',
    students TEXT DEFAULT '',
    interest TEXT DEFAULT '',
    message TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_review','converted','closed')),
    lead_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    channel TEXT NOT NULL DEFAULT 'inapp' CHECK(channel IN ('inapp','email','sms','whatsapp')),
    link TEXT DEFAULT '',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_addr TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT DEFAULT '',
    purpose TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );
  `);
}

function seed(force) {
  init();
  const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (userCount > 0 && !force) return;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const insUser = db.prepare(
    "INSERT INTO users (email, password_hash, name, role, phone) VALUES (?,?,?,?,?)"
  );
  insUser.run("admin@ultraconnect.in", hash("Admin@123!"), "Admin Owner", "admin", "+91 90000 00001");
  insUser.run("sales@ultraconnect.in", hash("Sales@123!"), "Sales Executive", "employee", "+91 90000 00002");
  insUser.run("counsellor@ultraconnect.in", hash("Sales@123!"), "School Counsellor", "employee", "+91 90000 00003");
  insUser.run("vendor@demo.in", hash("Vendor@123!"), "Demo Vendor", "vendor", "+91 90000 00004");
  const vendorUserId = db.prepare("SELECT id FROM users WHERE email=?").get("vendor@demo.in").id;

  db.prepare(
    `INSERT INTO vendors (user_id, company_name, gstin, address, city, state, phone, approved)
     VALUES (?,?,?,?,?,?,?,1)`
  ).run(vendorUserId, "DemoTech Supplies Pvt Ltd", "29ABCDE1234F1Z5", "12 Industrial Area", "Bengaluru", "Karnataka", "+91 90000 00004");

  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('default_follow_up_days','15')").run();
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('tax_rate_percent','18')").run();
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('company_name','Ultra Connect Multi Digi Service Pvt. Ltd.')").run();
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('invoice_prefix','UC/INV/2026/')").run();
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('order_prefix','UC/ORD/2026/')").run();

  const groups = [
    ["Academic & Digital", [
      ["UC-ERP-001","School-Owned ERP — AI Enabled","AI-enabled, white-labelled school ERP with 200+ modules: admissions, attendance, exams, fees, transport, HR & more.",149999,199999,12,1,{"Deployment":"Cloud / On-preise","Branding":"White-label","Modules":"200+","Support":"24×7 onboarding"},"Schools & school groups",1],
      ["UC-PNL-65","Interactive Flat Panel 65\"","4K UHD interactive panel with built-in Android + OPS slot, anti-glare glass and dual-pen support.",64999,79999,40,18,{"Size":"65 inch","Resolution":"4K UHD","Touch":"20-point","Warranty":"3 years"},"Classrooms",1],
      ["UC-PNL-75","Interactive Flat Panel 75\"","Large-format 4K interactive panel for higher classrooms and smart lecture halls.",89999,109999,28,11,{"Size":"75 inch","Resolution":"4K UHD","Touch":"20-point","Warranty":"3 years"},"Higher classrooms",1],
      ["UC-PNL-86","Interactive Flat Panel 86\"","Flagship 86\" interactive panel with powerful speakers and wireless screen mirroring.",124999,149999,15,6,{"Size":"86 inch","Resolution":"4K UHC","Touch":"20-point","Warranty":"3 years"},"Auditoriums / labs",1],
      ["UC-PNL-98","Interactive Flat Panel 98\"","Ultra-large panel for auditoriums and digital campus walls.",249999,299999,5,2,{"Size":"98 inch","Resolution":"4K UHD","Touch":"20-point","Warranty":"3 years"},"Auditoriums",0],
      ["UC-WEB-001","Website Designing & Integration","School website design integrated with WhatsApp, ERP enquiry forms and social media.",34999,49999,99,7,{"Pages":"Up to 15","Integrations":"ERP, WhatsApp, SEO","Delivery":"15 working days"},"Schools",0],
      ["UC-BIO-001","Biometric Attendance Machine","Fingerprint + card + face hybrid biometric device with ERP-ready attendance export.",12999,15999,60,32,{"Auth":"Fingerprint / Card / Face","Users":"1000+","Connectivity":"WiFi / Ethernet / USB"},"Schools & offices",1],
      ["UC-LAB-STEM","STEM & Robotics Lab Setup","Complete STEM, robotics, coding and ATL lab design with kits, furniture and curriculum support.",349999,449999,8,3,{"Grades":"1–12","Includes":"Kits, furniture, curriculum","Training":"Teacher training 2 days"},"Schools",1],
      ["UC-ADOBE-001","Adobe Education Solutions","Adobe Express free access, educator training and AI-powered creative learning programs.",0,0,999,15,{"Access":"Adobe Express for Education","Training":"Virtual + on-site","Focus":"AI creative learning"},"Schools",0]
    ]],
    ["Institutional Support", [
      ["UC-AFF-CBSE","School Affiliation Support — CBSE","End-to-end assistance for CBSE affiliation: documentation, NOC coordination, inspection readiness.",299999,399999,20,1,{"Board":"CBSE","Includes":"Docs, filing, inspection prep"},"School founders",1],
      ["UC-AFF-ICSE","School Affiliation Support — ICSE/ISC","ICSE/ISC affiliation guidance and application management.",249999,329999,20,0,{"Board":"ICSE / ISC","Includes":"Docs & filing"},"School founders",0],
      ["UC-AFF-IB","School Affiliation Support — IB / IGCSE","International board programme candidacy and consultation support.",399999,549999,10,0,{"Board":"IB / IGCSE","Includes":"Consultation & documentation"},"International schools",0],
      ["UC-HED-001","Higher Education Programs","B.Tech and industry-aligned programs delivered with Intellipaat.",0,0,50,2,{"Partner":"Intellipaat","Programs":"B.Tech & certificate"},"Colleges & universities",0],
      ["UC-FIN-001","School Financing / Loans","Guidance on school financing and loan solutions with banking partners.",0,0,99,0,{"Partners":"NBFC & banks","Service":"Advisory"},"School founders",0],
      ["UC-LIB-001","Library Books — Bulk Supply","Curated library and reference book sets with bulk institutional pricing.",25000,35000,150,40,{"Catalogue":"CBSE/ICSE aligned","Delivery":"Pan-India"},"Schools",0]
    ]],
    ["Campus & Infrastructure", [
      ["UC-FUR-001","School & Office Furniture","Durable classroom, lab, office and hostel furniture sets.",45000,60000,80,22,{"Materials":"Steel / Wood","Warranty":"5 years"},"Schools",1],
      ["UC-GRS-001","Grass Carpeting","Playground grass carpeting and surface solutions.",35000,45000,30,5,{"Area":"Up to 500 sq ft / unit","Install":"Included"},"Playgrounds",0],
      ["UC-WTR-001","Water Fountains","Safe drinking water fountains for campuses (RO-enabled options).",18999,24999,25,9,{"Capacity":"10–40 L/hr","Filtration":"RO + UV optional"},"Schools",0],
      ["UC-BEL-001","Automatic Period Bell / Ringer","Programmable automatic period bell with one-way or two-way broadcasting.",7999,9999,45,18,{"Modes":"One-way / Two-way","Schedule":"Programmable timetable"},"Schools",1],
      ["UC-KIT-001","Hostel Kitchen Setup","Complete institutional kitchen setup for large student capacity.",499999,649999,6,1,{"Capacity":"200–1000 meals/turn","Includes":"Equipment & layout"},"Hostels",0],
      ["UC-LND-001","School Landscape & Construction","Landscaping and civil construction support for campus development.",0,0,10,0,{"Service":"Design + build"},"Campus development",0],
      ["UC-SPT-001","Playground Setup & Sports Items","Playground layout with sports equipment and indoor/outdoor items.",85000,120000,18,6,{"Includes":"Equipment + layout"},"Schools",0]
    ]],
    ["Safety & Security", [
      ["UC-CCTV-001","CCTV Installation & Monitoring","IP CCTV design, installation and AMC monitoring for campuses.",55000,75000,35,14,{"Cameras":"4–64 channel","AMC":"Optional"},"Schools & offices",1],
      ["UC-SEC-001","Campus Security Technology","Access control, biometric gates and integrated campus security systems.",95000,125000,12,4,{"Includes":"Access control, gates, integration"},"Campuses",0]
    ]],
    ["Student Experience", [
      ["UC-UNI-SET","School Uniform Set — Custom","Premium uniform set customised with school logo — shirt, pants/skirt, tie, belt, shoes option.",1299,1799,500,210,{"Fabric":"Poly-cotton premium","Customisation":"School logo & colours","Sizes":"XS–XXL"},"Students",1],
      ["UC-PLA-IND","Indoor & Outdoor Play Items","Age-appropriate indoor and outdoor play equipment for young learners.",45000,60000,20,7,{"Age group":"2–12 years","Safety":"IS certified"},"Pre-primary & primary",0],
      ["UC-CIN-001","School Cinema","On-campus cinema experience with light and music systems.",299999,399999,4,1,{"Includes":"Projector, audio, lighting","Seats":"Configurable"},"Schools",0],
      ["UC-BRD-001","School Branding Solutions","Customised “I ♥ School” and full campus branding solutions.",39999,59999,25,8,{"Includes":"Murals, signage, merch"},"Schools",0]
    ]]
  ];

  const insProd = db.prepare(
    `INSERT INTO products (sku,name,category,description,specs,price,mrp,stock_on_hand,units_sold,vendor_id,status,featured)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const [cat, items] of groups) {
    for (const it of items) {
      const [sku, name, desc, price, mrp, stock, sold, specs, aud, featured] = it;
      insProd.run(sku, name, cat, desc, JSON.stringify(specs), price, mrp, stock, sold, null, "active", featured);
    }
  }
  // Vendor-listed product (approved)
  insProd.run("VD-TAB-10","Vendor: 10\" Educational Tablet Bundle","Academic & Digital","Rugged 10-inch learning tablets preloaded with NCERT content, sold by DemoTech Supplies.",JSON.stringify({"Screen":"10 inch","OS":"Android","Warranty":"1 year"}),11999,14999,50,9,vendorUserId===0?1:db.prepare("SELECT id FROM vendors WHERE user_id=?").get(vendorUserId).id,"active",0);
  // Pending vendor product for approval flow demo
  insProd.run("VD-CHG-001","Vendor: Charging Cart 32-Port","Campus & Infrastructure","Mobile charging cart for 32 devices, pending admin approval.",JSON.stringify({"Ports":"32","Lock":"Yes"}),34999,39999,10,0,db.prepare("SELECT id FROM vendors WHERE user_id=?").get(vendorUserId).id,"pending",0);

  // Demo lead + follow-up + visit
  const insLead = db.prepare(
    `INSERT INTO leads (name,organization,designation,address,city,phone,email,students,products_interest,notes,status,assigned_to,source,follow_up_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const salesId = db.prepare("SELECT id FROM users WHERE email=?").get("sales@ultraconnect.in").id;
  const adminId = db.prepare("SELECT id FROM users WHERE email=?").get("admin@ultraconnect.in").id;
  const r1 = insLead.run("Mr. Ramesh Kumar","Greenwood International School","Principal","42 MG Road, Bengaluru","Bengaluru","+91 98450 11111","principal@greenwood.edu.in","1200","Interactive Flat Panels; STEM Lab","Wants panels for grades 6–9 and a robotics lab before June.","Contacted",salesId,"website",null);
  const lead1 = r1.lastInsertRowid;
  db.prepare("INSERT INTO lead_history (lead_id,user_id,action,detail) VALUES (?,?,?,?)").run(lead1,salesId,"created","Lead captured from website enquiry");
  db.prepare("INSERT INTO follow_ups (lead_id,due_date,notes,status,created_by) VALUES (?,?,?,?,?)").run(lead1,"2026-10-25","Confirm panel size decision and demo date","pending",salesId);
  db.prepare("UPDATE leads SET follow_up_date=? WHERE id=?").run("2026-10-25", lead1);
  db.prepare("INSERT INTO visits (lead_id,user_id,visit_date,client_name,location,discussion,outcome) VALUES (?,?,?,?,?,?,?)").run(lead1,salesId,"2026-10-12","Greenwood International School","Bengaluru campus","Introduced Ultra Connect ecosystem; principal interested in 75\" panels and STEM lab pricing.","Follow-up demo scheduled");

  const r2 = insLead.run("Ms. Fatima Sheikh","Little Hearts Pre-School","Director","HSR Layout, Bengaluru","Bengaluru","+91 98450 22222","director@littlehearts.in","180","School Uniform Set; Indoor Play Items","Uniforms for next academic year.","New",salesId,"website",null);
  const lead2 = r2.lastInsertRowid;
  db.prepare("INSERT INTO lead_history (lead_id,user_id,action,detail) VALUES (?,?,?,?)").run(lead2,salesId,"created","Lead captured from website enquiry");

  // Demo order + invoice + payment
  const adminId2 = adminId;
  const orderNo = "UC/ORD/2026/0001";
  const p1 = db.prepare("SELECT id,name,price FROM products WHERE sku='UC-PNL-75'").get();
  const p2 = db.prepare("SELECT id,name,price FROM products WHERE sku='UC-BIO-001'").get();
  const sub = p1.price * 6 + p2.price * 2;
  const tax = Math.round(sub * 0.18 * 100) / 100;
  const tot = sub + tax;
  const ro = db.prepare(
    `INSERT INTO orders (order_no,lead_id,customer_name,customer_phone,customer_email,customer_address,status,is_bulk,subtotal,tax,total,notes,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(orderNo, lead1, "Greenwood International School", "+91 98450 11111", "principal@greenwood.edu.in", "42 MG Road, Bengaluru", "Confirmed", 1, sub, tax, tot, "Bulk order: 6 panels + 2 biometric devices", adminId2);
  const oid = ro.lastInsertRowid;
  db.prepare("INSERT INTO order_items (order_id,product_id,product_name,qty,unit_price) VALUES (?,?,?,?,?)").run(oid,p1.id,p1.name,6,p1.price);
  db.prepare("INSERT INTO order_items (order_id,product_id,product_name,qty,unit_price) VALUES (?,?,?,?,?)").run(oid,p2.id,p2.name,2,p2.price);
  db.prepare("UPDATE products SET stock_on_hand=stock_on_hand-6, units_sold=units_sold+6 WHERE id=?").run(p1.id);
  db.prepare("UPDATE products SET stock_on_hand=stock_on_hand-2, units_sold=units_sold+2 WHERE id=?").run(p2.id);

  const invNo = "UC/INV/2026/0001";
  const lines = JSON.stringify([
    { name: p1.name, qty: 6, unit_price: p1.price, amount: p1.price * 6 },
    { name: p2.name, qty: 2, unit_price: p2.price, amount: p2.price * 2 }
  ]);
  const ri = db.prepare(
    `INSERT INTO invoices (invoice_no,order_id,lead_id,customer_name,customer_address,line_items,subtotal,tax,total,status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(invNo, oid, lead1, "Greenwood International School", "42 MG Road, Bengaluru", lines, sub, tax, tot, "paid");
  const invid = ri.lastInsertRowid;
  db.prepare(
    `INSERT INTO payments (order_id,invoice_id,amount,mode,reference,status,created_by) VALUES (?,?,?,?,?,?,?)`
  ).run(oid, invid, tot, "UPI", "UPI-GRNWD-261012-01", "received", adminId2);

  db.prepare("INSERT INTO finance_entries (type,category,amount,note,ref,entry_date,created_by) VALUES (?,?,?,?,?,?,?)")
    .run("income","Sales",tot,"Payment received — Greenwood International School",invNo,"2026-10-12",adminId2);
  db.prepare("INSERT INTO finance_entries (type,category,amount,note,ref,entry_date,created_by) VALUES (?,?,?,?,?,?,?)")
    .run("expense","Marketing",45000,"School expo stall charges — Bengaluru Edu Expo","EXP-2026-014","2026-10-05",adminId2);

  db.prepare("INSERT INTO notifications (user_id,title,body,channel,link) VALUES (?,?,?,?,?)")
    .run(salesId,"Follow-up due soon","Follow-up with Greenwood International School is due on 2026-10-25.","inapp","/portal.html#/leads");
  db.prepare("INSERT INTO email_log (to_addr,subject,body,purpose) VALUES (?,?,?,?)")
    .run("principal@greenwood.edu.in","Follow-up reminder — Ultra Connect","Dear Mr. Ramesh Kumar, this is a reminder about our scheduled follow-up on 2026-10-25. — Ultra Connect","follow_up_reminder");

  db.prepare("INSERT OR REPLACE INTO counters (key,value) VALUES ('lead_seq',2)").run();
  db.prepare("INSERT OR REPLACE INTO counters (key,value) VALUES ('order_seq',1)").run();
  db.prepare("INSERT OR REPLACE INTO counters (key,value) VALUES ('invoice_seq',1)").run();
}

init();
seed(false);

module.exports = { db, seed };
