# FacilityPro — 90-Day LinkedIn Building-in-Public Calendar

**Project**: FacilityPro — Enterprise Facility Management Platform
**Tagline**: One platform. Every facility role.
**Hashtags** (use on every post): `#BuildInPublic #IndieHacker #NextJS #Supabase #SaaS #FacilityManagement #WebDev #100DaysOfCode`
**LinkedIn handle**: _(add yours)_
**Landing page**: _(your URL)_

---

## Image Types Reference

| Type | Description | When to use |
|------|-------------|-------------|
| **Type A** | Bold headline + laptop mockup on right | Announcements, features |
| **Type B** | Large number center, minimal bg | Stats, milestones |
| **Type C** | Code snippet or architecture diagram | Technical posts |
| **Type D** | Split screen — problem left, solution right | Before/after, comparisons |
| **Type E** | Progress bar or checklist visual | Weekly recaps, milestones |

**Canva template**: Search "App Mockup LinkedIn Post" → customize
**Dimensions**: 1080×1350px (portrait)

---

## WEEK 1: THE PROBLEM (Days 1–7)

### Day 1 — The Introduction
**Image**: Type A — Your photo + "I'm building something for facility managers"

```
I'm building a SaaS app from scratch. Publicly.

For 90 days, I'll share everything:
→ What I'm building
→ Why I'm building it
→ Every technical decision, mistake, and win

Day 1 starts now.

FacilityPro — an enterprise facility management platform.

14 dashboards. 6 portals. One platform.

Follow along. 🧵

#BuildInPublic #IndieHacker #SaaS
```

---

### Day 2 — The Problem
**Image**: Type D — "The Chaos of Facility Management" split screen

```
Facility managers run on WhatsApp groups, Excel sheets, and prayers.

Security guard logs? WhatsApp.
Vendor orders? Excel.
Visitor records? Paper registers.
Panic alerts? A phone call at 2am.

This is a ₹XXX crore industry running on chaos.

I decided to fix it.

Day 2 of building FacilityPro. 👇

#BuildInPublic #FacilityManagement
```

---

### Day 3 — The 6 Roles
**Image**: Type A — 6 role icons (Guard, Admin, Buyer, Supplier, Resident, Delivery)

```
A single facility has 6 types of people with completely different needs:

🛡️ Guard — logs visitors, handles emergencies, does patrol
🏢 Admin — oversees everything, approves, reports
🛒 Buyer — orders services and supplies
🚚 Supplier — fulfills orders and raises bills
🏠 Resident — invites visitors, reports issues
📦 Delivery — logs material arrivals

One app. Six portals. Zero confusion.

This is what I'm building.

Day 3/90 — FacilityPro #BuildInPublic
```

---

### Day 4 — Why Existing Solutions Fail
**Image**: Type D — "Why current tools fail" comparison

```
I looked at every existing facility management tool.

Here's what I found:

❌ Too expensive for mid-sized facilities
❌ No India-specific workflows (PSARA compliance, etc.)
❌ Mobile apps that guards can't actually use
❌ No real supplier integration
❌ Requires an IT team to maintain
❌ No offline support

The gap was obvious.

So I started building.

Day 4/90 — FacilityPro #BuildInPublic #IndieHacker
```

---

### Day 5 — The Vision
**Image**: Type A — App hero screenshot

```
The vision for FacilityPro:

One platform where:
→ Guards log visitors from their phone
→ Buyers order services with one click
→ Suppliers receive purchase orders instantly
→ Residents invite guests digitally
→ Admins see everything in real-time

No spreadsheets.
No WhatsApp groups.
No paper registers.

Day 5/90 — Let's build this.

#BuildInPublic #SaaS #FacilityManagement
```

---

### Day 6 — Tech Stack Decision
**Image**: Type C — Stack logos (Next.js, Supabase, TailwindCSS, TypeScript)

```
Day 6: Choosing the tech stack.

After a lot of thought, I went with:

⚡ Next.js 16 (App Router) — SSR + API routes in one
🗄️ Supabase — Postgres + Auth + Realtime + Edge Functions
🎨 TailwindCSS + shadcn/ui — ship UI fast
📱 PWA — offline support for Guard mobile app
🔒 Row Level Security — multi-role data isolation

Why Supabase specifically?
→ Realtime subscriptions for live visitor and panic alerts
→ RLS for multi-role access control without extra middleware
→ Edge Functions for scheduled reminders and push notifications

Day 6/90 — FacilityPro #NextJS #Supabase #BuildInPublic
```

---

### Day 7 — Week 1 Recap
**Image**: Type E — Progress bar "7/90 days complete"

```
Week 1 done. Here's what we established:

✅ The problem (facility teams running on chaos)
✅ The 6 roles that need separate portals
✅ Why existing tools don't cut it
✅ The vision: one platform, no paper
✅ The tech stack: Next.js + Supabase

Week 2: I start building.

Follow me to watch FacilityPro get built from zero.

Day 7/90 🚀

#BuildInPublic #100DaysOfCode
```

---

## WEEK 2: FOUNDATION (Days 8–14)

### Day 8 — Database Schema Design
**Image**: Type C — ERD diagram or table list

```
Day 8: Designing the database.

Before writing a single line of UI, I mapped the full schema.

Key tables:
→ users / roles / locations / departments
→ visitors / guards / panic_alerts
→ indents / purchase_orders / grn_entries / bills
→ employees / attendance / leaves / payroll
→ assets / inventory / service_requests

Total: 60+ tables. Every relationship mapped before coding.

This is the foundation everything else builds on.

Day 8/90 — FacilityPro #Supabase #BuildInPublic
```

---

### Day 9 — Supabase Setup: Auth, RLS, First Migration
**Image**: Type C — Supabase dashboard screenshot

```
Day 9: Setting up Supabase.

Three things I did today:

1. Created the project and enabled Row Level Security on every table
2. Set up the role-based auth system (6 roles, each with different data access)
3. Ran the first migration — 12 base tables

The RLS approach:
Every user has a role. Each role has policies that define what they can SELECT, INSERT, UPDATE.

A Guard can see visitors at their location.
A Supplier can only see their own purchase orders.
An Admin can see everything.

One auth system. Six completely isolated data views.

Day 9/90 — FacilityPro #Supabase #BuildInPublic
```

---

### Day 10 — Building the First Hook
**Image**: Type C — useVisitors hook code snippet

```
Day 10: The hook pattern that powers the entire app.

I built useVisitors today — here's the pattern I use for every data entity:

const { visitors, isLoading, error, logEntry, logExit } = useVisitors()

Every hook:
→ Fetches data from Supabase
→ Handles loading and error states
→ Exposes typed mutation functions
→ Subscribes to Realtime changes

92 hooks follow this exact pattern.

One consistent pattern. Zero inline queries in components.

Day 10/90 — FacilityPro #NextJS #BuildInPublic
```

---

### Day 11 — App Router File Structure
**Image**: Type C — Folder structure diagram

```
Day 11: The file structure decision.

With Next.js App Router, I went with route groups:

app/
  (dashboard)/     ← Protected routes (all 14 modules)
    admin/
    buyer/
    supplier/
    guard/
    resident/
    delivery/
  (marketing)/     ← Public routes (landing page)
  api/             ← Server-side API routes

hooks/             ← 92 hooks, one per entity
components/        ← Shared + feature components
src/lib/           ← Utils, auth, Supabase clients

Took 30 minutes to plan. Saved weeks of confusion.

Day 11/90 — FacilityPro #NextJS #BuildInPublic
```

---

### Day 12 — Role-Based Auth Middleware
**Image**: Type C — Middleware code snippet

```
Day 12: Building the auth middleware.

Every request goes through a 3-step check:

1. Is the path public? (login, landing page) → allow
2. Is the user authenticated? → if not, redirect to /login
3. Does the user's role have access to this route? → RBAC check

The role map looks like:
Admin → can access /dashboard, /hrms, /finance, /services...
Guard → can only access /society/visitors, /society/panic-alerts...
Supplier → only /supplier/*

Six roles. 30+ route prefixes. Middleware enforces it all.

Day 12/90 — FacilityPro #BuildInPublic
```

---

### Day 13 — First Dashboard Renders
**Image**: Type A — Admin dashboard screenshot

```
Day 13: First real dashboard!

The Admin dashboard is live. It shows:
→ Active visitors count (real-time)
→ Open service requests
→ Pending purchase orders
→ Guard attendance today
→ Recent panic alerts

Every number pulled from Supabase.
Zero hardcoded data.

That moment when the dashboard loads real data for the first time? Unmatched.

Day 13/90 — FacilityPro #BuildInPublic
```

---

### Day 14 — Week 2 Stats
**Image**: Type B — Large stats: "8 tables. 3 pages. 14 hours."

```
Week 2 stats:

📊 Tables created: 18
📄 Pages built: 3 (Admin dashboard + 2 auth pages)
🪝 Hooks written: 4
⏱️ Hours coded: ~14
☕ Coffees: I've lost count

Week 3: Supply chain. The core business workflow.

Day 14/90 — FacilityPro #BuildInPublic #100DaysOfCode
```

---

## WEEKS 3–4: SUPPLY CHAIN (Days 15–21)

### Day 15 — The Supply Chain Problem
**Image**: Type D — Supply chain flow diagram

```
Day 15: The supply chain problem.

Here's how a facility's purchase workflow currently works:

Buyer WhatsApps vendor → Vendor sends quote on email →
Buyer screenshots quote → Sends to manager on WhatsApp →
Manager approves via phone call → Order placed →
Delivery arrives, no one's there → Bill raised manually →
Finance reconciles via Excel, 2 weeks later.

Here's how FacilityPro handles it:

Indent → Purchase Order → GRN (Goods Received Note) → Bill → Auto-reconciliation

Every step tracked. Every document linked. Zero WhatsApp.

Day 15/90 — FacilityPro #BuildInPublic
```

---

### Day 16 — Building the Buyer Portal
**Image**: Type A — Buyer portal screenshot

```
Day 16: Buyer portal is live.

The Buyer can:
→ Create service/material indent requests
→ Track request status (Pending → Approved → PO Issued)
→ View all purchase orders
→ Review and approve invoices
→ Leave feedback on completed services

One portal. Everything a procurement manager needs.

Day 16/90 — FacilityPro #BuildInPublic
```

---

### Day 17 — Building the Supplier Portal
**Image**: Type A — Supplier portal screenshot

```
Day 17: Supplier portal is live.

The Supplier can:
→ View indents they've been invited to quote on
→ Submit quotes and delivery dates
→ View and accept purchase orders
→ Submit bills against GRNs
→ Track payment status

Previously: suppliers got purchase orders via email and lost them.
Now: Everything in one place, with Realtime notifications.

Day 17/90 — FacilityPro #BuildInPublic
```

---

### Day 18 — Purchase Orders Workflow
**Image**: Type C — PO workflow state diagram

```
Day 18: Purchase Orders — the hardest workflow to model.

A PO has 8 possible states:
Draft → Pending Approval → Approved → Issued →
Partially Delivered → Fully Delivered → Invoiced → Closed

The transition logic lives in a Postgres function.
State changes trigger Realtime notifications to the relevant parties.

The buyer sees a different view than the supplier.
The admin sees everything.

One table. Six views. Infinite workflow.

Day 18/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 19 — GRN: The Quality Check Layer
**Image**: Type C — GRN form screenshot

```
Day 19: GRN — the step most tools skip.

GRN = Goods Received Note.

When material arrives:
1. Delivery team logs receipt with photo proof
2. Quantity checked against PO
3. Quality inspector verifies (Accept / Partial Accept / Reject)
4. GRN created, linked to PO

Only after GRN → can supplier raise a bill.
Only bill with matching GRN → gets approved for payment.

This is how enterprises prevent fraud. Now it's built-in.

Day 19/90 — FacilityPro #BuildInPublic
```

---

### Day 20 — Bill Reconciliation Engine
**Image**: Type C — Reconciliation matching diagram

```
Day 20: The reconciliation engine.

Three documents need to match before payment is approved:
→ Purchase Order (what was ordered)
→ GRN (what was received)
→ Bill (what supplier is charging)

Built a Postgres function that:
1. Matches bill to PO by reference
2. Validates quantities against GRN
3. Flags discrepancies (over-billed, under-delivered)
4. Sets status: Matched / Partially Matched / Disputed

Finance closure at month end went from 3 days to 3 clicks.

Day 20/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 21 — Supply Chain Module Complete
**Image**: Type A — Supplier portal demo GIF / full workflow screenshot

```
Day 21: Supply chain module — complete.

What we built in one week:
✅ Buyer portal (indent creation, PO tracking, invoice review)
✅ Supplier portal (quotes, PO acceptance, bill submission)
✅ Purchase order workflow (8 states, Postgres transitions)
✅ GRN with photo proof enforcement
✅ Bill reconciliation engine (3-way match: PO + GRN + Bill)

The entire paper-based procurement process. Digitized.

Next week: Security & Visitors.

Day 21/90 — FacilityPro #BuildInPublic
```

---

## WEEK 5: SECURITY & VISITORS (Days 22–28)

### Day 22 — Visitor Management System
**Image**: Type A — Visitor log screenshot

```
Day 22: Visitor management — 4 categories.

Not all visitors are the same. FacilityPro handles:

🏢 In-Building Visitors — meeting someone inside
🏠 Daily Helpers — maids, drivers (recurring schedule)
🔧 Vendors — contractors and service personnel
👨‍👩‍👧 Family/Guests — resident invited visitors

Each category has different:
→ Verification requirements
→ Badge/pass types
→ Approval workflows
→ Access zones

One system. Four visitor types. Every scenario covered.

Day 22/90 — FacilityPro #BuildInPublic
```

---

### Day 23 — Building the Guard Portal (Mobile-First)
**Image**: Type A — Guard portal on mobile screenshot

```
Day 23: Building the Guard portal.

Guards don't sit at desks. They're on their feet.

So the Guard portal is:
→ Mobile-first (works on any phone browser)
→ Touch-optimized (large buttons, no tiny dropdowns)
→ Offline-capable (PWA — works without internet)
→ Photo-enforced (visitor photo required for entry)
→ One-tap panic alert button (always visible)

The most important portal in the app — designed for the person least likely to use software daily.

Day 23/90 — FacilityPro #BuildInPublic #PWA
```

---

### Day 24 — PANIC ALERT SYSTEM (Realtime)
**Image**: Type C — Panic alert Realtime flow diagram

```
Day 24: The feature I'm most proud of.

PANIC ALERT — Realtime WebSocket emergency system.

How it works:
1. Guard taps the SOS button (always visible, single tap)
2. Alert written to Supabase in <100ms
3. Supabase Realtime broadcasts to ALL connected admin clients
4. Admin dashboard shows live alert with location, guard name, timestamp
5. Edge Function fires push notification via FCM to manager phones

From tap to manager phone: under 2 seconds.

In an emergency, 2 seconds matters.

Day 24/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 25 — Guard GPS Attendance
**Image**: Type C — Geo-fence diagram

```
Day 25: Guard attendance with geo-fencing.

The problem: Guards signing attendance without being present.

The solution:
→ Guard punches in via phone browser
→ Browser Geolocation API captures coordinates
→ Server checks distance from facility boundary
→ If outside geo-fence: punch blocked
→ Selfie required (anti-proxy fraud)

All handled server-side via Supabase Edge Function.
No native app required. Works in any phone browser.

Day 25/90 — FacilityPro #BuildInPublic
```

---

### Day 26 — Guard Offline PWA
**Image**: Type C — PWA architecture diagram

```
Day 26: Making the Guard app work offline.

Guards in basements and parking lots lose signal.

How I solved it with PWA:
→ next-pwa + Workbox for service worker
→ Core UI assets cached on first load
→ Visitor log form works offline (queue stored locally)
→ Syncs to Supabase when connection returns
→ "You're offline" banner with sync status

The guard's job doesn't stop when the WiFi does.

Day 26/90 — FacilityPro #BuildInPublic #PWA
```

---

### Day 27 — Society Manager Dashboard
**Image**: Type A — Society dashboard with live guard map

```
Day 27: The Society Manager dashboard.

What the Society Manager sees in real-time:
→ Live map showing active guard positions (GPS)
→ Panic alert feed with status updates
→ Today's visitor count by category
→ Guard attendance status
→ Open checklist items by zone

Every number updating live via Supabase Realtime subscriptions.
Reload not required.

Day 27/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 28 — Security Module Stats
**Image**: Type B — Stats roundup

```
Security module: complete.

What we built this week:

✅ Visitor log — 4 categories, photo enforcement
✅ Guard portal — mobile-first, touch-optimized
✅ Panic SOS — Realtime alert, < 2 second delivery
✅ GPS attendance — geo-fenced, selfie-verified
✅ Offline PWA — works in basements and parking lots
✅ Society Manager dashboard — live, no reload

Week 6: Services.

Day 28/90 — FacilityPro #BuildInPublic
```

---

## WEEKS 6–7: SERVICES & HRMS (Days 29–42)

### Day 29 — AC Services Module
**Image**: Type A — AC service request dashboard

```
Day 29: AC Services module.

Facilities run on air conditioning. AC services module:

→ Schedule preventive maintenance visits
→ Log AMC (Annual Maintenance Contract) details
→ Track service completion with technician notes
→ Set maintenance intervals and get automated reminders
→ Track parts used and replacement costs

Every AC unit. Every visit. Every cost. Tracked.

Day 29/90 — FacilityPro #BuildInPublic
```

---

### Day 30 — Pest Control with Chemical Expiry Tracking
**Image**: Type A — Pest control dashboard with chemical tracker

```
Day 30: Pest control. The regulatory nightmare.

Pest control in facilities involves:
→ Scheduled treatments (monthly, quarterly)
→ Chemical usage logs (regulatory requirement)
→ Chemical expiry date tracking
→ Technician certification tracking

New feature I added today: Chemical Expiry Alerts.
→ Every chemical in inventory has an expiry date
→ 30-day warning before expiry
→ Blocked from use once expired

This isn't just feature building — it's compliance.

Day 30/90 — FacilityPro #BuildInPublic
```

---

### Day 31 — Plantation Care
**Image**: Type A — Plantation dashboard

```
Day 31: Plantation care module.

Enterprise facilities often have landscaped areas, indoor plants, gardens.

FacilityPro tracks:
→ Plant inventory (species, location, quantity)
→ Watering and fertilizer schedules
→ Soil health monitoring
→ Seasonal care instructions
→ Vendor visits and costs

The only facility platform I know of that tracks soil pH.

Day 31/90 — FacilityPro #BuildInPublic
```

---

### Day 32 — Printing & Advertising (Ad Space Booking)
**Image**: Type A — Ad space booking calendar

```
Day 32: The module I didn't expect to build.

Printing & Advertising — facilities with display screens, notice boards, and common areas rent out ad space.

FacilityPro handles:
→ Ad space inventory (screen, hoarding, notice board)
→ Booking calendar (no double-booking)
→ Print job tracking
→ Cost per placement
→ Revenue dashboard for the facility

Surprisingly complex. Satisfyingly useful.

Day 32/90 — FacilityPro #BuildInPublic
```

---

### Day 33 — HRMS: Employee Profiles
**Image**: Type A — Employee profile page

```
Day 33: HRMS begins.

Facilities employ a LOT of people: guards, cleaners, technicians, supervisors.

Employee profiles include:
→ Personal and contact information
→ Role, department, reporting hierarchy
→ Documents (ID proof, certificates, BGV reports)
→ Employment history
→ Emergency contacts

Not just an HR database — integrated with attendance, payroll, and leave.

Day 33/90 — FacilityPro #BuildInPublic
```

---

### Day 34 — Attendance with Selfie + Geo-Fence
**Image**: Type C — Attendance verification flow

```
Day 34: Attendance verification.

Same system I built for guards — extended to all employees.

Punch-in requirements:
✅ Must be within facility geo-fence (configurable radius)
✅ Selfie photo captured and stored
✅ Timestamp with timezone recorded

Anti-fraud measures:
→ GPS coordinates logged server-side (can't be spoofed via URL)
→ Photo compared against profile (manual review for now)
→ Late arrivals flagged automatically

Old way: paper registers or a biometric machine that breaks.
New way: this.

Day 34/90 — FacilityPro #BuildInPublic
```

---

### Day 35 — Leave Management
**Image**: Type A — Leave calendar and approval workflow

```
Day 35: Leave management.

Simple in theory. Surprisingly complex in reality.

Features:
→ Multiple leave types (CL, SL, EL, LOP, Comp Off)
→ Leave balance tracking per employee
→ Approval workflow (manager → HR)
→ Team calendar view (who's absent this week)
→ Holiday calendar integration
→ LOP auto-calculation in payroll

The leave policy config screen alone took 2 hours.

Day 35/90 — FacilityPro #BuildInPublic
```

---

### Day 36 — Payroll Module
**Image**: Type C — Payroll calculation breakdown

```
Day 36: Payroll. The scary one.

Payroll calculation pulls from 4 data sources:
→ Employee base salary (from profile)
→ Attendance (days present, LOP count)
→ Approved leaves (paid vs unpaid)
→ Overtime hours

Outputs:
→ Gross earnings
→ Deductions (PF, ESI, TDS, advance recovery)
→ Net payable
→ Payslip PDF generation

This is the feature managers ask for first. And the one most tools get wrong.

Day 36/90 — FacilityPro #BuildInPublic
```

---

### Day 37 — Recruitment with BGV Tracking
**Image**: Type A — Recruitment pipeline dashboard

```
Day 37: Recruitment + Background Verification.

Facilities hire constantly. Turnover is high.

Recruitment module:
→ Job openings with requirements
→ Candidate pipeline (Applied → Interviewed → Selected → Onboarded)
→ Document checklist per candidate
→ Background verification (BGV) status tracking
→ Agency and direct hire tracking

BGV is legally required for security staff.
Now tracked per employee with expiry reminders.

Day 37/90 — FacilityPro #BuildInPublic
```

---

### Day 38 — 92 Hooks: The Pattern
**Image**: Type C — Hook architecture diagram

```
Day 38: I've written 92 React hooks. Here's the pattern.

Every hook follows the same structure:

function useEntity() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch
  async function fetchData() { ... }

  // Mutations
  async function createItem(payload) { ... }
  async function updateItem(id, changes) { ... }
  async function deleteItem(id) { ... }

  // Realtime subscription
  useEffect(() => { channel.subscribe() ... }, [])

  return { data, isLoading, error, createItem, updateItem, deleteItem, refresh }
}

Pages never touch Supabase directly.
All queries live in hooks.
All pages are dumb.

92 hooks. Same pattern. Consistent, testable, replaceable.

Day 38/90 — FacilityPro #BuildInPublic #NextJS
```

---

### Day 39 — Shared Hook Utils
**Image**: Type C — useSupabaseQuery code snippet

```
Day 39: Eliminating boilerplate with shared hook utils.

After writing 50 hooks the hard way, I extracted two utilities:

useSupabaseQuery — standardized reads
→ Handles loading state
→ Catches errors, shows toast
→ Returns { data, isLoading, error, refresh }

useSupabaseMutation — standardized writes
→ Handles loading state
→ Shows success/error toasts
→ Returns { execute, isLoading }

New hooks now take 10 lines instead of 60.

I did NOT rewrite old hooks (unnecessary churn).
Only new hooks use the utils.

Day 39/90 — FacilityPro #BuildInPublic #NextJS
```

---

### Day 40 — Services Module Complete
**Image**: Type E — Services module checklist

```
Day 40: Services module — complete.

What we built:

✅ AC Services — maintenance scheduling, AMC tracking
✅ Pest Control — treatment logs, chemical expiry tracking
✅ Plantation Care — plant inventory, soil health, schedules
✅ Printing & Ads — ad space booking calendar, print tracking
✅ HRMS — employee profiles, attendance, leave, payroll, recruitment, BGV

40 days in. The foundation is solid.

Day 40/90 — FacilityPro #BuildInPublic
```

---

## WEEKS 8–9: FINANCIAL & ASSETS (Days 43–56)

### Day 43 — Reconciliation Engine Deep Dive
**Image**: Type C — 3-way match diagram

```
Day 43: The reconciliation engine — how it actually works.

The 3-way match:
PO (what was ordered) + GRN (what was received) + Bill (what's being charged)

The Postgres function:
1. Finds bill's linked PO
2. Sums all GRN quantities for that PO
3. Compares bill line items vs GRN quantities
4. Status = "Matched" if quantities and amounts agree
5. Status = "Disputed" if over-billed or under-delivered

Runs in <10ms per bill.
Finance team reviews disputes, approves matches.
Month-end close went from 3 days to 3 hours.

Day 43/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 44 — Financial Closure Workflow
**Image**: Type A — Finance closure dashboard

```
Day 44: Financial closure.

Month-end used to mean:
→ Collect all bills
→ Cross-check with orders in email
→ Verify delivery in WhatsApp
→ Enter in Excel
→ Get manager approval on paper

Now:
→ All bills already in system (submitted by suppliers)
→ All matched to GRNs (auto-reconciled)
→ Disputed items flagged for review
→ One-click closure with digital approval trail

Month-end: from chaos to clicks.

Day 44/90 — FacilityPro #BuildInPublic
```

---

### Day 45 — PSARA Compliance Tracking
**Image**: Type A — PSARA compliance dashboard

```
Day 45: India-specific compliance — PSARA.

PSARA (Private Security Agencies Regulation Act) compliance is mandatory for facility security operations in India.

FacilityPro tracks:
→ PSARA license validity per agency
→ Guard PSARA certification status
→ Renewal deadline alerts
→ Audit-ready reports

Most generic SaaS tools don't know what PSARA is.

FacilityPro is built for the Indian market.

Day 45/90 — FacilityPro #BuildInPublic #FacilityManagement
```

---

### Day 46 — Budgeting Module
**Image**: Type A — Budget vs actual comparison chart

```
Day 46: Budgeting.

Facilities have annual budgets broken by:
→ Department
→ Service category
→ Month

FacilityPro's budgeting module:
→ Set budget allocations at the start of year
→ Track actuals as POs and bills are processed
→ Budget vs actual comparison (bar chart)
→ Variance alerts when spending exceeds threshold
→ Department-wise drill-down

Previously: spreadsheet updated monthly by finance.
Now: updates the moment a PO is approved.

Day 46/90 — FacilityPro #BuildInPublic
```

---

### Day 47 — Asset Management with QR Codes
**Image**: Type A — Asset QR code scan → profile page

```
Day 47: Asset management with QR codes.

Every physical asset in a facility (ACs, generators, fire extinguishers, furniture) gets:
→ A unique asset ID
→ A printable QR code label
→ A digital profile (make, model, warranty, location)
→ Maintenance history
→ Current assigned user

Scan the QR code → see the asset's full history.
Maintenance due? Alert sent.
Warranty expiring? Alert sent.

Day 47/90 — FacilityPro #BuildInPublic
```

---

### Day 48 — Inventory with Reorder Alerts
**Image**: Type A — Inventory dashboard with low stock alerts

```
Day 48: Inventory management.

Facilities consume consumables constantly: cleaning supplies, PPE, stationery.

FacilityPro inventory:
→ Product catalog with categories
→ Warehouse/location-wise stock levels
→ Reorder level configuration per product
→ Automatic alert when stock drops below reorder level
→ Linked to purchase order workflow (reorder creates indent)

The reorder alert → auto-indent creation flow:
Stock drops below level → Alert fires → Buyer creates indent in 1 click → PO issued.

Day 48/90 — FacilityPro #BuildInPublic
```

---

### Day 49 — Return-to-Vendor (RTV) with Realtime
**Image**: Type A — RTV ticket dashboard with live status

```
Day 49: Return-to-Vendor tickets with Realtime.

Sometimes goods arrive damaged, wrong, or in excess.

RTV workflow:
1. Quality team raises RTV ticket (with photos, reason)
2. Supplier portal shows new RTV ticket in real-time
3. Supplier acknowledges and arranges pickup
4. Credit note raised against original bill
5. Inventory adjusted automatically

The Realtime part: supplier sees the ticket appear without refreshing.
Built on Supabase Postgres Changes + WebSocket subscription.

Day 49/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 50 — Halfway Milestone Post
**Image**: Type B — "50/90" large number with stat grid

```
Halfway.

50 days of building FacilityPro.

Here's where we are:

📊 Dashboards: 14
🪝 React Hooks: 92
🗄️ DB Tables: 60+
📦 Migrations: 18
⚡ Edge Functions: 5
🔐 RLS Policies: 40+
📄 Pages: 80+
💾 Mock data remaining: 0

Every feature you've seen over the past 50 days is connected to a real database.
Zero hardcoded data.

40 days left. Let's finish this.

Day 50/90 — FacilityPro #BuildInPublic #IndieHacker
```

---

### Days 51–56 — Finance Wrap-up

**Day 51**: Reports Hub — 4 report types (financial, attendance, inventory, services)
**Day 52**: Ledger module — supplier and buyer ledger views
**Day 53**: Payment tracking — payment status, outstanding, overdue alerts
**Day 54**: Supplier credit notes and advance management
**Day 55**: Finance dashboard — full P&L-style summary view
**Day 56**: Finance module complete — stats and demo

_(Write captions following the Day 43–50 style)_

---

## WEEKS 10–11: POLISH & HARDENING (Days 57–70)

### Day 57 — Database Performance: 184 Indexes
**Image**: Type C — Query explain plan before/after

```
Day 57: Adding 184 foreign key indexes.

The problem: with 60+ tables and millions of rows, unindexed foreign keys mean full table scans.

Every foreign key column got an index today.

Before: complex dashboard query took 800ms
After: same query in 40ms

184 indexes. One migration. 20x faster queries.

Performance isn't a feature. It's a requirement.

Day 57/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 58 — RLS Smoke Tests
**Image**: Type C — Test cases table

```
Day 58: Verifying role isolation with RLS smoke tests.

I wrote 30 manual tests verifying that:
→ Guard cannot see other locations' visitors
→ Supplier cannot see other suppliers' POs
→ Buyer cannot see financial closure data
→ Resident cannot see other residents' data

Method: log in as each role, attempt unauthorized queries, confirm 0 rows returned.

Not a single data leak found (good architecture from day 1).
But the peace of mind from testing is worth it.

Day 58/90 — FacilityPro #BuildInPublic
```

---

### Day 59 — Playwright E2E Tests
**Image**: Type C — Playwright test output

```
Day 59: End-to-end tests with Playwright.

3 core flows tested:
1. Guard logs visitor → Admin sees real-time update
2. Buyer creates indent → Supplier receives PO notification
3. Guard triggers SOS → Admin dashboard alert fires

Playwright runs these against the actual Supabase dev database.

Not mocked. Not faked. Real data, real auth, real Realtime.

Day 59/90 — FacilityPro #BuildInPublic
```

---

### Day 60 — Husky Pre-commit TypeScript Check
**Image**: Type C — Terminal showing pre-commit hook

```
Day 60: Preventing broken code from entering the repo.

Added Husky pre-commit hook:
→ Runs tsc --noEmit before every commit
→ Blocks commit if TypeScript errors exist
→ Runs lint on staged files

The codebase has TS strict mode disabled (by design — the auto-generated type file is 606KB and causes TS2589).

But obvious type errors still get caught.

Quality gates: because future-me will thank present-me.

Day 60/90 — FacilityPro #BuildInPublic
```

---

### Day 61 — Notification Bell (Realtime Alerts)
**Image**: Type A — Notification bell dropdown

```
Day 61: The notification bell.

Every role gets relevant real-time alerts:

Admin: Panic alerts, overdue POs, compliance expirations
Buyer: PO approvals, bill submissions, delivery confirmations
Supplier: New POs, GRN confirmations, payment updates
Guard: Visitor approvals, shift reminders

All via Supabase Realtime → toast + notification badge.

Day 61/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 62 — Dark Mode Implementation
**Image**: Type D — Light vs Dark mode split screen

```
Day 62: Dark mode.

Implemented via next-themes + TailwindCSS class strategy.

→ System preference detected on first load
→ Manual toggle in settings
→ Preference persisted to localStorage
→ All 60+ semantic color tokens adapt automatically
→ No hardcoded hex colors anywhere in the codebase

The HSL CSS variable system paid off today.
Change one token → entire app adapts.

Day 62/90 — FacilityPro #BuildInPublic
```

---

### Day 63 — Mobile Responsiveness Audit
**Image**: Type A — Dashboard on mobile

```
Day 63: Mobile audit.

Went through every page on a 375px viewport.

Issues found and fixed:
→ 14 data tables: added horizontal scroll on mobile
→ 8 dialogs: increased minimum width handling
→ 4 chart components: added responsive container wrappers
→ Sidebar: already collapsible (built-in from day 1)

Guard portal was mobile-first from the start.
Admin dashboards took more work.

Day 63/90 — FacilityPro #BuildInPublic
```

---

### Day 64 — Edge Function: Guard Inactivity Alerts
**Image**: Type C — Edge function code + Supabase dashboard

```
Day 64: Edge Function — Guard inactivity alert.

The scenario: a guard stops responding. Is something wrong?

The solution:
→ Supabase cron job runs every 15 minutes
→ Edge Function checks last guard activity timestamp
→ If inactive > 30 minutes during active shift: alert fires
→ Admin notified via push notification

Built in Deno on Supabase Edge Functions.
No server to manage. No uptime to monitor.
Just an automatic guardian for your guards.

Day 64/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 65 — Edge Function: Document Expiry Reminders
**Image**: Type C — Reminder notification screenshot

```
Day 65: Edge Function — Document expiry reminders.

Documents in a facility expire:
→ PSARA licenses (annual)
→ Employee BGV certificates
→ Chemical approvals
→ Equipment calibration certificates
→ Contractor insurance policies

Daily cron job scans all documents.
30 days before expiry → reminder email + in-app alert.
7 days → escalation alert.
Expired → blocked from use.

Set it once. Never miss a renewal.

Day 65/90 — FacilityPro #BuildInPublic
```

---

### Day 66 — Edge Function: Push Notifications for Panic Alerts
**Image**: Type C — FCM push notification flow

```
Day 66: Push notifications for panic alerts.

The panic SOS system needed one more layer: phone push notifications.

Even if the admin has the dashboard closed.

Stack:
→ Guard taps SOS → Supabase row insert
→ Postgres trigger fires Edge Function
→ Edge Function calls FCM (Firebase Cloud Messaging)
→ Push notification sent to all admin devices
→ Tap notification → opens panic alert dashboard

From Guard SOS tap to Admin phone notification: < 3 seconds.

Day 66/90 — FacilityPro #BuildInPublic
```

---

### Day 69 — The 606KB Type File (Honest Post)
**Image**: Type B — "606 KB" large, "one file" below it

```
Day 69: The funny/honest one.

FacilityPro has a 606KB auto-generated TypeScript file.

supabase-types.ts — generated by Supabase CLI from the database schema.

It contains TypeScript types for every table, view, function, and enum in the database.

It makes IDE autocomplete slow.
It makes tsc think about life choices.
It causes TypeScript error TS2589 ("type instantiation is excessively deep").

So I added ignoreBuildErrors: true to next.config.ts.

The app runs perfectly.
The type file stays.
The IDE takes a breath.

Day 69/90 — FacilityPro #BuildInPublic #TypeScript
```

---

### Day 70 — Zero Mock Data
**Image**: Type E — Checklist with all items checked

```
Day 70: Zero mock data remaining.

At day 1, I committed: "Every data display will connect to Supabase. No hardcoded arrays."

Day 70: commitment honored.

Every dashboard stat → live query
Every table → real database rows
Every chart → real data, Recharts
Every counter → computed from hook

Not a single `const mockData = [...]` remains.

This is what "production-ready" means.

Day 70/90 — FacilityPro #BuildInPublic
```

---

## WEEKS 11–12: RESIDENT & DELIVERY (Days 71–77)

### Day 71 — Resident Dashboard
**Image**: Type A — Resident portal screenshot

```
Day 71: Resident dashboard — fully dynamic.

The Resident portal fetches everything based on the logged-in user:
→ Their flat/unit details
→ Their visitor history
→ Their pending visitor approvals
→ Community notices
→ Maintenance requests

No hardcoded resident data.
One component tree. Infinite residents.

Day 71/90 — FacilityPro #BuildInPublic
```

---

### Day 72 — Visitor Invitation from Resident Portal
**Image**: Type A — Visitor invite flow

```
Day 72: Resident sends a visitor invitation.

The flow:
1. Resident fills visitor name, expected time, purpose
2. System generates a pre-approval token
3. Guard sees the pre-approved visitor in their queue
4. Visitor arrives → Guard confirms entry with one tap (no approval wait)

Result: faster entry for expected visitors, full audit trail for the facility.

Day 72/90 — FacilityPro #BuildInPublic
```

---

### Day 73 — Delivery Boy Portal
**Image**: Type A — Delivery portal screenshot

```
Day 73: Delivery Boy portal.

The delivery team has one job: log material arrivals accurately.

The portal enforces:
→ Delivery photo (mandatory — no photo, no entry)
→ Supplier reference number
→ Item count and condition
→ Receiving location
→ Timestamp and GPS location

Every delivery logged creates a GRN draft.
Finance sees it. Buyer sees it. Supplier confirms it.

No paper delivery challan. No lost receipts.

Day 73/90 — FacilityPro #BuildInPublic
```

---

### Day 74 — Delivery Dashboard Stats
**Image**: Type B — Stats: deliveries today, pending GRNs, pending photos

```
Day 74: Delivery dashboard.

The dashboard the delivery supervisor sees:
→ Deliveries expected today (from open POs)
→ Deliveries logged today
→ Pending GRN confirmations
→ Photos missing (flagged for review)
→ Delivery aging report (how long items wait for GRN)

Every number live. Every click actionable.

Day 74/90 — FacilityPro #BuildInPublic
```

---

## FINAL STRETCH: LAUNCH PREP (Days 78–90)

### Day 78 — Full Module Status Review
**Image**: Type E — Module checklist, all green

```
Day 78: Every module, reviewed.

✅ Supply Chain (Indent → PO → GRN → Bill → Reconciliation)
✅ Security & Visitors (4 types, SOS, GPS, offline PWA)
✅ Services (AC, Pest, Plantation, Printing)
✅ HRMS (Profiles, Attendance, Leave, Payroll, BGV)
✅ Finance (Reconciliation, Closure, Ledger, Compliance)
✅ Asset Management (QR codes, maintenance)
✅ Inventory (Products, reorder alerts, RTV)
✅ Reports Hub (4 report categories)
✅ Resident Portal (dynamic, no mock data)
✅ Delivery Portal (photo-enforced, GRN-linked)

14 dashboards. All green.

Day 78/90 — FacilityPro #BuildInPublic
```

---

### Day 82 — The Numbers Post
**Image**: Type B — Numbers grid

```
92 days of building. Here are the numbers:

🪝 92 React hooks
🗄️ 60+ database tables
📦 21+ Supabase migrations
⚡ 8 Edge Functions
📄 99+ pages
🔐 40+ RLS policies
📊 14 dashboards
👤 6 role portals
🧪 3 Playwright E2E test flows
💾 0 lines of mock data

One developer.
One platform.
90 days.

Day 82/90 — FacilityPro #BuildInPublic #IndieHacker
```

---

### Day 83 — What I'd Do Differently
**Image**: Type D — "Then vs Now" thinking

```
Day 83: The one thing I'd do differently.

I wrote the first 50 hooks without shared utilities.
Each hook had 60+ lines of boilerplate: loading states, error handling, toast messages.

At day 50, I extracted useSupabaseQuery and useSupabaseMutation.
New hooks now take 10 lines.

The lesson: extract shared patterns earlier. Don't wait until you've written it 50 times.

I didn't rewrite old hooks (unnecessary churn).
But new code is 6x faster to write.

Do it on hook 3, not hook 53.

Day 83/90 — FacilityPro #BuildInPublic
```

---

### Day 84 — Architecture Diagram
**Image**: Type C — Full system architecture diagram

```
Day 84: The full architecture.

┌─────────────────────────────────────┐
│         Next.js 16 App Router       │
│  (Dashboard) │ (Marketing) │ /api   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       92 React Hooks (Client)       │
│   useVisitors │ usePurchaseOrders   │
│   useGuards   │ usePayroll  │ ...   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│              Supabase               │
│  Postgres DB │ Auth │ Realtime      │
│  Storage     │ Edge Functions       │
│  Row-Level Security (6 roles)       │
└─────────────────────────────────────┘

6 roles. 14 dashboards. 1 platform.

Day 84/90 — FacilityPro #BuildInPublic
```

---

### Day 85 — Beta Launch Announcement
**Image**: Type A — Landing page screenshot + "Beta is open"

```
Day 85: Beta is open.

90 days of building. Today: first real users.

FacilityPro is now in limited beta.

What's included:
→ Admin dashboard
→ Buyer + Supplier portals
→ Guard portal (mobile-first, offline)
→ Resident + Delivery portals
→ Full supply chain, security, HRMS, finance modules

If you manage a facility (housing society, corporate campus, industrial plant):

👉 Link in bio to request access.

Day 85/90 — FacilityPro #BuildInPublic #SaaS
```

---

### Day 87 — The Hardest Bug I Fixed
**Image**: Type C — Bug description + fix

```
Day 87: The bug that cost me 6 hours.

Supabase Realtime was dropping events intermittently.

Symptoms: Admin dashboard would miss panic alerts ~20% of the time.

Root cause:
→ The Realtime channel was being re-created on every re-render
→ Each re-creation triggered an unsubscribe + resubscribe cycle
→ Events fired during the gap were missed

Fix:
→ Moved channel creation outside the effect
→ Stable channel reference with useRef
→ Proper cleanup in effect return

6 hours of debugging. 4 lines of fix. Classic.

Day 87/90 — FacilityPro #BuildInPublic #Supabase
```

---

### Day 88 — Total Hours and Cost
**Image**: Type B — Numbers: hours, cost, lines of code

```
Day 88: The honest numbers.

⏱️ Hours coded: ~400
📝 Lines of code: ~45,000
💰 Infrastructure cost per month: ~$25

Supabase Pro: $25/month
Vercel (hobby): $0
Domain: $12/year

Total infrastructure for a platform that handles:
→ 6 portals
→ 14 dashboards
→ Real-time alerts
→ Edge Functions
→ Push notifications

$25/month. No DevOps team required.

The economics of modern SaaS are wild.

Day 88/90 — FacilityPro #BuildInPublic #IndieHacker
```

---

### Day 89 — What's Next
**Image**: Type A — Roadmap visual

```
Day 89: What's next for FacilityPro.

The 90-day build: done.
The product journey: just starting.

Roadmap:
Q2 2026 → Mobile apps (React Native) for Guard and Delivery portals
Q2 2026 → Visitor QR code pre-registration
Q3 2026 → Multi-facility support (one org, many campuses)
Q3 2026 → API for third-party integrations (access control systems)
Q4 2026 → AI-powered maintenance prediction
Q4 2026 → WhatsApp integration for notifications

The platform that replaces WhatsApp — now integrating WhatsApp as a notification channel. (Sometimes you have to meet users where they are.)

Day 89/90 — FacilityPro #BuildInPublic
```

---

### Day 90 — THE LAUNCH POST
**Image**: Type A — Hero landing page screenshot + confetti

```
Day 90. 🚀

90 days ago, I started with a blank Next.js project and a problem:

Facility managers run on WhatsApp groups, Excel sheets, and prayers.

Today, FacilityPro is live.

What we built:
✅ 6 portals (Admin, Guard, Buyer, Supplier, Resident, Delivery)
✅ 14 dashboards, zero mock data
✅ 92 React hooks, all connected to real data
✅ 21+ database migrations, zero breaking changes
✅ Real-time panic SOS system (< 2 second alert delivery)
✅ Offline-capable Guard PWA
✅ Full supply chain: Indent → PO → GRN → Bill → Reconciliation
✅ PSARA compliance tracking
✅ 8 Edge Functions running on Supabase

One developer. ~400 hours. $25/month infrastructure.

FacilityPro is now in open beta.

👉 Link in bio. Free to try. No credit card.

Thank you for following along. The real journey starts now.

Day 90/90 — FacilityPro 🏢

#BuildInPublic #IndieHacker #SaaS #NextJS #Supabase #FacilityManagement
```

---

## Quick Reference: Hook Formulas

**Opening line formulas** (most important — controls whether people stop scrolling):

| Formula | Example |
|---------|---------|
| Question | "Why do facility managers still run on WhatsApp?" |
| Number lead | "92 hooks. 21 migrations. 90 days. Here's what I built." |
| Contrast | "Most SaaS apps have 1 dashboard. FacilityPro has 14." |
| Bold claim | "I built a full enterprise platform in 90 days. Here's proof." |
| Problem statement | "Facility managers run on WhatsApp groups, Excel sheets, and prayers." |
| Stat surprise | "The bug that cost me 6 hours? Fixed in 4 lines." |

---

## Scheduling Notes

- Post **daily at the same time** (best: 8–9am or 12–1pm on weekdays)
- **Buffer** or **LinkedIn Creator Tools** for scheduling in advance
- Write posts in batches (write 7 at a time, one week ahead)
- Keep a Notion or Google Sheet with all 90 captions for easy editing
- Add screenshots/recordings to images **before scheduling**
- Reply to every comment within the first hour (boosts reach)

---

## Pre-Launch Checklist

- [ ] LinkedIn profile banner updated (Canva, 1584×396px, FacilityPro branding)
- [ ] LinkedIn headline updated to include "Building FacilityPro in Public"
- [ ] Featured section on profile → link to landing page
- [ ] Landing page live and accepting waitlist emails
- [ ] At least 7 post images created in Canva before Day 1
- [ ] Buffer / scheduling tool connected to LinkedIn
- [ ] First 14 post captions written and ready
- [ ] Screenshots of all major modules taken (Admin, Guard, Buyer, Supplier)
- [ ] Screen recordings of key flows (SOS alert, supply chain, visitor log)
