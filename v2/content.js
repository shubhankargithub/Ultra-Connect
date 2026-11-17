/* Ultra Connect v2 — page content (same business data, new presentation) */
"use strict";

const SOLUTION_CARDS = [
  { span: "wide", num: "01 / CORE", icon: "AI", title: "AI-enabled, school-owned ERP", text: "200+ modules across admissions, attendance, exams, fees, transport and HR — white-labelled to your school's identity.", tags: ["White label", "200+ modules", "AI insights"], link: "solutions.html" },
  { span: "half", num: "02 / DIGITAL", icon: "4K", title: "Interactive flat panels", text: "65\", 75\", 86\" and 98\" 4K panels with Android, OPS slots and dual-pen support.", tags: ["65–98 inch", "4K UHD"], link: "products.html" },
  { span: "third", num: "03", icon: "WEB", title: "Websites & integration", text: "School websites wired into WhatsApp, ERP and social channels.", link: "solutions.html" },
  { span: "third", num: "04", icon: "BIO", title: "Biometrics & identity", text: "Attendance and access control built for Indian campuses.", link: "products.html" },
  { span: "third", num: "05", icon: "STEM", title: "Labs & STEM", text: "Robotics, coding, ATL and composite labs for future-ready learners.", link: "solutions.html" },
  { span: "third", num: "06", icon: "AFF", title: "Affiliation support", text: "CBSE, ICSE, IB and IGCSE affiliation guidance.", link: "solutions.html" },
  { span: "third", num: "07", icon: "CCTV", title: "Safety & security", text: "CCTV, monitoring, biometrics and campus access systems.", link: "products.html" },
  { span: "third", num: "08", icon: "INFRA", title: "Campus infrastructure", text: "Furniture, water, landscaping and playground delivery.", link: "solutions.html" },
  { span: "half", num: "09 / EXPERIENCE", icon: "BRAND", title: "Student experience", text: "Uniforms, play items, school cinema and campus branding that makes a school feel like its own.", tags: ["Uniforms", "Cinema", "Branding"], link: "products.html" },
  { span: "half", num: "10 / PARTNERS", icon: "NET", title: "Partner & vendor network", text: "A transparent vendor portal with product approvals, orders, invoices and finance — all in one place.", tags: ["Vendor onboarding", "Order lifecycle"], link: "partners.html" }
];

const FLOW = [
  { title: "Discover", text: "We map your school's academic, operational and infrastructure reality." },
  { title: "Design", text: "A connected blueprint across ERP, digital, campus and safety layers." },
  { title: "Deploy", text: "White-labelled rollout with training, vendor coordination and support." },
  { title: "Scale", text: "Continuous insights, upgrades and partner-led expansion." }
];

const TEAM = [
  { initials: "UC", name: "Leadership", role: "Strategy & vision", text: "Setting the direction for connected education." },
  { initials: "ER", name: "ERP & AI", role: "Academic technology", text: "Building the 200-module school operating system." },
  { initials: "DI", name: "Digital", role: "Experience & web", text: "Websites, panels and creative learning tools." },
  { initials: "IN", name: "Infrastructure", role: "Campus delivery", text: "Furniture, safety, water and playground projects." },
  { initials: "PA", name: "Partnerships", role: "Vendor network", text: "Onboarding and enabling partners across India." },
  { initials: "SU", name: "Customer Success", role: "Support", text: "Training, onboarding and 360° hand-holding." },
  { initials: "FI", name: "Finance", role: "Operations", text: "Orders, invoicing and transparent reporting." },
  { initials: "QA", name: "Quality", role: "Delivery assurance", text: "Checking every deployment against the promise." }
];

const TIMELINE = [
  { when: "01 / CONSULT", title: "Understand the campus", text: "Stakeholder workshops, infrastructure audit and requirement mapping." },
  { when: "02 / ARCHITECT", title: "Design the ecosystem", text: "Solution stack, integrations, rollout sequence and success metrics." },
  { when: "03 / EXECUTE", title: "Deploy & train", text: "White-labelled ERP, hardware installation and team enablement." },
  { when: "04 / EVOLVE", title: "Measure & scale", text: "Usage insights, new modules and partner-led expansion." }
];

const CTA = { type: "cta", kicker: "Next signal", title: "Let's build your <span class='grad'>connected campus.</span>", text: "Tell us where you are in your transformation journey. We'll map the right stack for your school.", btn: "Start the conversation" };

const PAGES = [];

PAGES.push({
  file: "index.html", nav: "Home",
  title: "Ultra Connect — Engineering the Future of Learning",
  desc: "AI-enabled school ERP, interactive panels, campus infrastructure, safety and a partner network — one connected ecosystem for education.",
  blocks: [
    { type: "metrics", items: [ { n: 22, suffix: "+", label: "Solutions delivered" }, { n: 200, suffix: "+", label: "ERP modules" }, { n: 5, label: "Practice areas" }, { n: 360, suffix: "°", label: "Partner support" } ] },
    { type: "bento", kicker: "The ecosystem", title: "One network. <span class='grad'>Every layer of campus life.</span>", lead: "From the classroom to the accounts office, Ultra Connect connects the systems, people and partners that make a school work.", cards: SOLUTION_CARDS },
    { type: "flow", kicker: "How we work", title: "From signal to <span class='grad-cyan'>scale.</span>", steps: FLOW },
    { type: "products", kicker: "Live catalogue", title: "Built for <span class='grad'>real campuses.</span>", lead: "A snapshot of the solutions schools and partners deploy with us.", limit: 9 },
    { type: "quote", text: "We don't just supply technology. We connect an entire education ecosystem — and stay with it as it grows.", by: "The Ultra Connect Promise" },
    { type: "split", kicker: "Connected operations", title: "The platform behind <span class='grad-cyan'>the promise.</span>", lead: "A single operating layer for enquiries, leads, orders, vendors, invoices, payments and finance — with role-based access for every team.", points: ["Enquiries convert to assigned leads automatically", "Vendors manage their own catalogue and approvals", "Orders flow into invoices, payments and finance", "Reports and alerts keep leadership in the loop"], btn: "Explore the platform", btnHref: "why.html", visual: "platform" },
    { type: "marquee", items: ["School ERP", "Interactive Panels", "Campus Safety", "STEM Labs", "Vendor Network", "Student Experience", "Affiliation Support", "Smart Classrooms"] },
    CTA
  ]
});

PAGES.push({
  file: "solutions.html", nav: "Solutions",
  title: "Solutions — Ultra Connect",
  desc: "Explore the five Ultra Connect practice areas: academic and digital, institutional support, campus infrastructure, safety and student experience.",
  hero: { kicker: "Ecosystem / 05 practices", title: "Solutions that <span class='grad'>connect the campus.</span>", lead: "Five practice areas, one delivery partner. Pick a layer or take the whole stack.", btn: "Talk to an expert" },
  blocks: [
    { type: "bento", kicker: "Practice areas", title: "Find your <span class='grad'>layer.</span>", cards: SOLUTION_CARDS },
    { type: "flow", kicker: "Delivery model", title: "Simple by <span class='grad-cyan'>design.</span>", steps: FLOW },
    { type: "split", kicker: "Need a custom stack?", title: "We'll design it <span class='grad'>with you.</span>", lead: "Every campus is different. Our team maps your requirements into a practical, phased rollout.", btn: "Request a proposal", visual: "terminal" },
    CTA
  ]
});

PAGES.push({
  file: "products.html", nav: "Products",
  title: "Products & Services — Ultra Connect",
  desc: "Browse the Ultra Connect catalogue: ERP, panels, biometrics, labs, furniture, safety systems, uniforms and more.",
  hero: { kicker: "Catalogue / live", title: "Everything your campus <span class='grad'>needs.</span>", lead: "Filter by practice area and explore the products and services we deploy every day." },
  blocks: [
    { type: "products", kicker: "Full catalogue", title: "The <span class='grad-cyan'>inventory.</span>", lead: "Indicative pricing. Talk to us for a campus-specific quote.", limit: 31 },
    CTA
  ]
});

PAGES.push({
  file: "about.html", nav: "About",
  title: "About — Ultra Connect",
  desc: "Ultra Connect Multi Digi Service Pvt. Ltd. builds connected education ecosystems for schools, educators and partners.",
  hero: { kicker: "Company / identity", title: "Built for the way <span class='grad'>schools actually work.</span>", lead: "We bring technology, infrastructure and people together so institutions can focus on what matters: learning." },
  blocks: [
    { type: "split", kicker: "Our identity", title: "Technology with a <span class='grad-cyan'>human centre.</span>", lead: "Ultra Connect is an education technology and infrastructure company. We combine AI-enabled software, digital hardware and on-ground delivery under one accountable roof.", points: ["School-owned, white-labelled technology", "PAN India partner and vendor network", "One team from consultation to support"], btn: "See our solutions", btnHref: "solutions.html", visual: "orb" },
    { type: "metrics", items: [ { n: 22, suffix: "+", label: "Solutions" }, { n: 5, label: "Practice areas" }, { n: 31, label: "Catalogue items" }, { n: 360, suffix: "°", label: "Support" } ] },
    { type: "timeline", kicker: "Operating model", title: "How we <span class='grad'>show up.</span>", lead: "A repeatable, transparent way to transform a campus.", items: TIMELINE },
    { type: "quote", text: "We aren't just building tools. We're building the connected infrastructure for the next generation of learning.", by: "Ultra Connect" },
    CTA
  ]
});

PAGES.push({
  file: "why.html", nav: "Why Us",
  title: "Why Ultra Connect — Ultra Connect",
  desc: "One accountable partner for ERP, infrastructure, safety, student experience and the platform that runs it all.",
  hero: { kicker: "Difference / 05 reasons", title: "One partner. <span class='grad'>Zero gaps.</span>", lead: "Most vendors sell a product. We deliver a connected ecosystem — and stay accountable for it." },
  blocks: [
    { type: "bento", kicker: "Why schools choose us", title: "The <span class='grad'>advantage.</span>", cards: [
      { span: "wide", num: "01", icon: "ONE", title: "One throat to choke", text: "Software, hardware, infrastructure and support from a single accountable partner.", tags: ["Single vendor", "Clear ownership"] },
      { span: "half", num: "02", icon: "AI", title: "AI where it matters", text: "Insights and automation inside the school ERP, not bolted on as an afterthought." },
      { span: "third", num: "03", icon: "IN", title: "PAN India reach", text: "A partner network that can deliver on ground, across cities." },
      { span: "third", num: "04", icon: "PLT", title: "Platform-grade ops", text: "CRM, orders, invoices, finance and reports on one role-based platform." },
      { span: "third", num: "05", icon: "360", title: "Long-term support", text: "Training, upgrades and hand-holding beyond go-live." }
    ] },
    { type: "split", kicker: "Proof in the system", title: "Built to be <span class='grad-cyan'>measured.</span>", lead: "Every enquiry, lead, order and payment is tracked — so you always know where things stand.", btn: "See the platform", btnHref: "portal.html", visual: "terminal" },
    { type: "quote", text: "Clarity, speed and accountability — in every interaction, at every scale.", by: "The Ultra Connect Standard" },
    CTA
  ]
});

PAGES.push({
  file: "partners.html", nav: "Partners",
  title: "Partners & Vendors — Ultra Connect",
  desc: "Join the Ultra Connect partner network. Register as a vendor, list products and grow with a nationwide education ecosystem.",
  hero: { kicker: "Network / partner first", title: "Grow with the <span class='grad'>network.</span>", lead: "Manufacturers, integrators and service partners — list your products, receive orders and get paid through one transparent portal.", btn: "Become a partner", btnHref: "portal.html#vendor-register" },
  blocks: [
    { type: "bento", kicker: "Partner ecosystem", title: "Built for <span class='grad'>specialists.</span>", cards: [
      { span: "half", num: "01", icon: "REG", title: "Simple registration", text: "Create a vendor account, add your company details and get reviewed quickly." },
      { span: "half", num: "02", icon: "CAT", title: "Your own catalogue", text: "Add products with pricing and specs. Approved items go live across the network." },
      { span: "third", num: "03", icon: "ORD", title: "Order flow", text: "New orders land in your dashboard with full visibility." },
      { span: "third", num: "04", icon: "INV", title: "Invoices & payments", text: "Track invoices and payment status in one place." },
      { span: "third", num: "05", icon: "ALERT", title: "Smart alerts", text: "Follow-up reminders and notifications keep nothing pending." }
    ] },
    { type: "marquee", items: ["Manufacturers", "System integrators", "EdTech providers", "Infrastructure partners", "Safety vendors", "Service teams"] },
    CTA
  ]
});

PAGES.push({
  file: "team.html", nav: "Team",
  title: "Team — Ultra Connect",
  desc: "The teams behind Ultra Connect: leadership, ERP and AI, digital, infrastructure, partnerships, support, finance and quality.",
  hero: { kicker: "People / practices", title: "The people behind <span class='grad'>the platform.</span>", lead: "Eight focused practices. One shared obsession: making connected education work." },
  blocks: [
    { type: "team", kicker: "Our practices", title: "Meet the <span class='grad'>teams.</span>", lead: "Every part of the ecosystem has a team that owns it end to end.", people: TEAM },
    { type: "timeline", kicker: "How we operate", title: "From brief to <span class='grad-cyan'>go-live.</span>", items: TIMELINE },
    { type: "quote", text: "Great education infrastructure is a team sport.", by: "Ultra Connect" },
    CTA
  ]
});

PAGES.push({
  file: "contact.html", nav: "Contact",
  title: "Contact — Ultra Connect",
  desc: "Talk to Ultra Connect about school ERP, digital infrastructure, campus solutions or becoming a partner.",
  hero: { kicker: "Contact / signal in", title: "Let's start a <span class='grad'>conversation.</span>", lead: "Tell us what you're building. We'll bring the right team to the table." },
  blocks: [
    { type: "contact", kicker: "Reach us", title: "Send a <span class='grad-cyan'>signal.</span>", lead: "Share a few details and our team will get back to you within one working day." },
    { type: "marquee", items: ["Schools", "Colleges", "Partners", "Vendors", "Educators", "Institutions"] }
  ]
});

PAGES.push({
  file: "privacy.html", nav: "Privacy",
  title: "Privacy Policy — Ultra Connect",
  desc: "How Ultra Connect handles information shared through this website and platform.",
  hero: { kicker: "Legal / privacy", title: "Privacy <span class='grad'>policy.</span>", lead: "How we handle the information you share with us." },
  blocks: [ { type: "text", items: [
    { title: "Information we collect", text: "We collect details you submit through enquiry and registration forms — such as your name, organisation, email, phone and the nature of your requirement." },
    { title: "How we use it", text: "Information is used to respond to enquiries, deliver and support our services, manage partner relationships and improve the platform." },
    { title: "Sharing", text: "We do not sell personal information. Data may be shared internally with the teams responsible for serving your request, and with service providers bound by confidentiality." },
    { title: "Your choices", text: "You may request access, correction or deletion of your information by contacting us using the details on the contact page." }
  ] } ]
});

PAGES.push({
  file: "terms.html", nav: "Terms",
  title: "Terms & Conditions — Ultra Connect",
  desc: "Terms governing the use of the Ultra Connect website and platform.",
  hero: { kicker: "Legal / terms", title: "Terms & <span class='grad'>conditions.</span>", lead: "The ground rules for using this website and our platform." },
  blocks: [ { type: "text", items: [
    { title: "Use of this site", text: "This website is provided for information about Ultra Connect and its products and services. You agree to use it only for lawful purposes." },
    { title: "Product information", text: "Specifications, illustrations and indicative pricing are provided for guidance. Final scope and commercial terms are confirmed in a written proposal or order." },
    { title: "Intellectual property", text: "Content, branding and design on this site belong to Ultra Connect Multi Digi Service Pvt. Ltd. or its licensors and may not be reused without permission." },
    { title: "Contact", text: "Questions about these terms can be raised through the contact page." }
  ] } ]
});

module.exports = { PAGES };
