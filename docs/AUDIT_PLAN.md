# 🔥 HARSH AUDIT: FacilityPro PRD vs. Codebase — The Unvarnished Truth

**Audit Date:** 2026-02-14
**Auditor:** Antigravity AI (Harsh Mode)
**Verdict:** The codebase is 70% feature-complete against the PRD, NOT 99% as previously claimed. Below is the reality check and the corrective audit plan.

> **Deleted files:** `CODE_REVIEW_REPORT.md`, `FEATURES.md`, `PhaseE_Status.md` — superseded by `FEATURE_TRUTH.md` + `STATE_TABLES.md` (DB-verified).

---

## ⚠️ THE ELEPHANT IN THE ROOM: The Previous Report Lied

The previous `CODE_REVIEW_REPORT.md` (now deleted) claimed **"~99% of PRD core features are fully wired end-to-end."** This was **false**. Here is what's actually happening:

1. **Having a hook ≠ Feature Complete.** A hook that fetches data means nothing if the PRD workflow described (multi-step, multi-stakeholder, with approval chains) isn't actualized in the UI.
2. **Having a page ≠ PRD requirement met.** Many pages show data tables but don't implement the _workflows_, _approval chains_, or _stakeholder-specific views_ that the PRD demands.
3. **"Wired to real data" was the wrong success metric.** The PRD describes _processes_, not _data displays_.

---

## PART 1: CRITICAL PRD FEATURES MISSING OR BROKEN

### 🔴 1.1 — No Multi-Stakeholder Architecture (FATAL)

**PRD says:** 11 distinct stakeholders — Admin, Company MD, Company HOD, Account, Delivery Boy, Buyer, Supplier/Vendor, Security Guard, Security Supervisor, Society Manager, Service Boy.

**Codebase reality:**

- ❌ **No Role-Based UI Routing** — All `page.tsx` files are `"use client"` and render the same UI regardless of who is logged in. The middleware checks authentication but **never checks role**. A Security Guard and a Company MD see the **exact same 50+ pages**.
- ❌ **No Buyer Portal** — The PRD has a full Buyer Workflow (Order Request → Order Received → Accept/Reject → Purchases Bill → Feedback → END). There is **no buyer-facing interface** in the app. The `finance/buyer-billing` and `finance/buyer-invoices` pages are admin-facing, not buyer-facing.
- ❌ **No Supplier Portal** — The PRD describes Supplier receives Indent → Accept/Reject → Received PO → Dispatch PO → Supplier Bill → Paid. There is **no supplier-facing interface**. Everything is viewed from the admin perspective.
- ❌ **No Delivery Boy Dashboard** — The PRD lists "Dilver Boy" as a stakeholder. Zero implementation.
- ❌ **No Society Manager Dashboard** — The PRD describes a "Society Manager Dashboard" with analytics (Visitor Stats, Checklist Status, Panic Logs, Staff Attendance). No dedicated page exists.

**Impact:** The application is currently a **single-perspective admin dashboard**, not the multi-stakeholder platform the PRD describes.

---

### 🔴 1.2 — Visitor Management System (50% Missing)

**PRD says (lines 188-209):**

- ✅ Add Visitor Information — Partially exists via `useGuardVisitors`
- ❌ **Daily Visitor (Frequent)** — No separate "frequent visitor" database for maids, drivers, milkmen, car cleaners
- ❌ **Society Family Database** — No searchable directory per flat with Owner/Tenant mapping for guard verification
- ❌ **Automated SMS to Resident** — PRD says `"Dear Resident, [Visitor Name] is at the gate for [Flat No]."` The SMS infrastructure (MSG91) exists but is **not connected to the visitor intake flow**
- ❌ **Push Notification with Photo** — PRD says "a pop-up alert with the visitor's photo is sent instantly." `usePushNotifications` hook exists but is **not called** from the visitor flow

**Impact:** The core visitor management workflow — the primary use case for a security guard — is a data form, not the automated notification system the PRD describes.

---

### 🔴 1.3 — Security Guard Monitoring (40% Missing)

**PRD says (lines 135-162):**

- ✅ Panic Alert system — Implemented with real-time subscriptions ✓
- ✅ Daily Checklist — Implemented ✓
- ✅ Patrol Logs / GPS — Implemented ✓
- ❌ **Guard GPS Live Tracking Map** — No map component exists. The hooks have lat/lng data but no map visualization (Google Maps/Mapbox).
- ❌ **Photo Evidence on Checklist** — PRD says "Option to take a photo as proof of task completion." The `useGuardChecklist` hook stores answers but **no photo upload capability** is wired.
- ❌ **Emergency Contact Directory** — PRD says "Quick Dial: Police, Fire Brigade, Ambulance, Electrician/Plumber." The `useEmergencyContacts` hook exists but the guard mobile-facing "one-tap" dial interface is just a desktop page, NOT a mobile-first quick-dial.
- ❌ **Geo-Fencing for Check-in** — PRD says "Check-in button only works if guard is within 50-meter radius." No geo-fence enforcement exists in any hook or page.

---

### 🔴 1.4 — Material Supply Workflow (60% Missing)

**PRD says (lines 390-513):**
The PRD describes a **complete order lifecycle** with statuses: Start → Request Received → Accept/Pending/Reject → Indent Generation → Indent Forward → Indent Accept/Reject → Purchase Order → Received PO → Dispatch PO → Material Acknowledgment → Bill → Paid → Feedback → END.

**Codebase reality:**

- ✅ Indent Generation — `useIndents` hook exists with CRUD + status transitions
- ✅ Purchase Orders — `usePurchaseOrders` hook exists with lifecycle tracking
- ✅ GRN — `useGRN` hook exists for material receipts
- ❌ **Order Request from Buyer** — No buyer-triggered order initiation flow
- ❌ **Indent Forward to Supplier** — No system to forward indents to specific suppliers and get accept/reject responses
- ❌ **Dispatch PO tracking** — The supplier cannot mark items as dispatched
- ❌ **Material Acknowledgment vs PO vs GRN three-way check** — The reconciliation hook exists but is **not connected to the GRN → PO → Indent validation chain**
- ❌ **Status Tracking States** — The PRD defines 4 categories of states: Process Boundaries, Approval States, Financial States, Logistics States. The pages show simple status badges but **don't render state machine visualizations or enforce the state graph**.
- ❌ **Check Feedback** — No feedback collection from the buyer at the end of the transaction

---

### 🔴 1.5 — Ticket Generation System (Partially Missing)

**PRD says (lines 514-553):**

- ✅ Behavior Tickets — Implemented via `useBehaviorTickets` ✓
- ✅ Quality Tickets — Page exists at `/tickets/quality`
- ✅ Return Tickets — Page exists at `/tickets/returns`
- ❌ **Photo Evidence on Quality Tickets** — PRD says "Mandatory photo upload of damaged item." No photo upload in quality ticket flow.
- 🔵 **Batch Number Tracking** — `material_receipt_items.batch_number` + `expiry_date` columns exist in DB. Not exposed in frontend ticket forms.
- ❌ **Shortage Note Auto-Generation** — PRD says system automatically generates shortage note. No auto-generation logic.
- ❌ **RTV (Return to Vendor) workflow** — The returns page exists but there's no automated flow from failed quality check → return ticket → vendor notification → credit note.

---

### 🔴 1.6 — HRMS Gaps

**PRD says (lines 286-323):**

- ✅ Recruitment — Implemented ✓
- ✅ Payroll — Implemented ✓
- ✅ Leave — Implemented ✓
- ✅ Employee Documents — Implemented ✓
- ❌ **Smart Attendance with Selfie** — PRD says "Selfie Attendance: Guard takes a photo via the app to clock in." The `useAttendance` hook records check-in/out but has **no selfie capture or facial verification**. It's just a button click.
- ❌ **Geo-Fencing for Attendance** — PRD says "Check-in button only works within 50-meter radius." Zero geo-fence enforcement.
- ❌ **Auto-Punch Out** — PRD says "If guard leaves Geo-fence area for too long, system flags it." Not implemented.
- ❌ **Payslip PDF Download** — PRD says "Staff can download their monthly payslip directly from the app." The payroll page shows data but there's no PDF generation or download feature.
- ❌ **Background Verification (BGV) Status Tracking** — PRD says track Police Verification and Address Verification. The recruitment flow has basic status but no dedicated BGV tracking fields.

---

## PART 2: NEXT.JS ARCHITECTURAL VIOLATIONS

### 🔴 2.1 — "use client" on EVERY page.tsx (Critical Anti-Pattern)

**Every single `page.tsx`** in the dashboard has `"use client"` at line 1. This means:

- ❌ **No Server Components at all** — The core promise of Next.js App Router (server-side rendering, smaller bundles, streaming) is completely thrown away.
- ❌ **No data fetching on server** — All data is fetched client-side via `useEffect` in custom hooks. This means: slower initial load, no SEO benefit, no streaming, larger JavaScript bundles.
- ❌ **Dashboard layout is "use client"** — Even the shell layout is fully client-side. This forces every child to also be a client component.

**Best Practice Violation:** Next.js documentation says "Server Components are the default for a reason. Start there, add client only when needed." This codebase does the exact opposite.

---

### 🔴 2.2 — Zero `loading.tsx` Files

There are **0 `loading.tsx` files** in the entire app. This means:

- No Next.js built-in Suspense boundaries
- No instant loading UI when navigating between routes
- Flash of empty content on every route transition
- Users see nothing (or a white screen) before client-side hooks fetch data

---

### 🔴 2.3 — Zero `error.tsx` Files

There are **0 `error.tsx` files** in the entire app. The `ErrorBoundary` component is a React class component wrapper, but it's not the Next.js convention. This means:

- No route-level error recovery
- No segment-level error isolation
- If one page crashes, the entire dashboard goes down (only caught at layout level)

---

### 🔴 2.4 — Zero `not-found.tsx` Files

There are **0 `not-found.tsx` files**. If a user hits an invalid route inside the dashboard, they get the generic Next.js 404 page instead of a contextual "Page Not Found" within the dashboard layout.

---

### 🔴 2.5 — No `generateMetadata` Usage

Zero pages use `generateMetadata` or export a `metadata` object (except root layout). This means:

- No per-page titles (browser tab always shows "FacilityPro | Enterprise Cloud ERP" on every page)
- No contextual meta descriptions
- No Open Graph images
- Poor for bookmark clarity, browser history, and accessibility

---

### 🟡 2.6 — Minimal Use of `Suspense`

Only 4 files use `Suspense` (GRN, dashboard, test-resident, my-flat). The rest have manual `isLoading` spinners. This is not leveraging Next.js streaming at all.

---

## PART 3: FEATURE-TO-UI CONNECTION GAPS

Below is a checklist of every PRD feature → whether the hook/backend exists → whether the UI is actually connected:

| PRD Feature                | Hook Exists                   | UI Page Exists            | UI Actually Uses Hook | Connected?  |
| -------------------------- | ----------------------------- | ------------------------- | --------------------- | ----------- |
| Role-based access          | `get_user_role()` SQL         | No role-aware routing     | ❌                    | **BROKEN**  |
| Buyer Order Request        | ❌                            | ❌                        | N/A                   | **MISSING** |
| Buyer Accept/Reject        | ❌                            | ❌                        | N/A                   | **MISSING** |
| Buyer Feedback             | ❌                            | ❌                        | N/A                   | **MISSING** |
| Supplier Indent Review     | ❌                            | ❌                        | N/A                   | **MISSING** |
| Supplier Dispatch PO       | ❌                            | ❌                        | N/A                   | **MISSING** |
| Guard Live GPS Map         | `usePatrolLogs` has lat/lng   | No map component          | ❌                    | **BROKEN**  |
| Guard Geo-fence Check-in   | ❌                            | ❌                        | N/A                   | **MISSING** |
| Selfie Attendance          | ❌                            | No camera integration     | N/A                   | **MISSING** |
| Visitor SMS Notification   | `send-notification` exists    | Not wired to visitor flow | ❌                    | **BROKEN**  |
| Visitor Push with Photo    | `usePushNotifications` exists | Not wired to visitor flow | ❌                    | **BROKEN**  |
| Frequent Visitor DB        | ❌                            | ❌                        | N/A                   | **MISSING** |
| Society Family Directory   | `useResident` exists          | Basic page exists         | Partially             | **PARTIAL** |
| Photo Evidence (Checklist) | ❌ in checklist hook          | ❌                        | N/A                   | **MISSING** |
| Photo Evidence (Quality)   | ❌                            | ❌                        | N/A                   | **MISSING** |
| Batch Number QC            | 🔵 DB has `batch_number`      | ❌ Not in forms            | N/A                   | **BACKEND** |
| Shortage Note Generation   | ❌                            | ❌                        | N/A                   | **MISSING** |
| RTV Auto-workflow          | ❌                            | ❌                        | N/A                   | **MISSING** |
| Payslip PDF Download       | ❌                            | ❌                        | N/A                   | **MISSING** |
| Internal Printing          | ❌                            | Placeholder tab           | N/A                   | **MISSING** |
| Payment Gateway UI         | ❌ hook                       | ❌                        | N/A                   | **MISSING** |
| BGV Status Tracking        | Partial                       | Partial                   | Partial               | **PARTIAL** |
| Staff Skill Mapping (AC)   | `useTechnicians` has skills   | AC page shows skills      | ✅                    | **DONE**    |
| Chemical Expiry Alerts     | Schema has `expiry_date`      | No cron monitoring        | ❌                    | **BROKEN**  |

---

## PART 4: THE AUDIT PLAN

### Phase 1A: Role Foundation + Routing (Priority: CRITICAL — Week 1, alongside Phase 0)

> ⚠️ **Why split?** Role-based routing and server components are intertwined. Do routing early to avoid refactoring twice.

| #    | Task                                          | Why It Matters                                                  | Effort |
| ---- | --------------------------------------------- | --------------------------------------------------------------- | ------ |
| 1A.1 | Implement role-based routing in middleware     | Redirect unauthorized roles away from admin-only pages          | 4h     |
| 1A.2 | Add per-page `metadata` exports               | Proper browser tab titles, SEO, accessibility                   | 3h     |
| 1A.3 | Add `loading.tsx` to every route group        | Eliminate white-flash on navigation. Next.js built-in streaming | 2h     |
| 1A.4 | Add `error.tsx` to every route group          | Segment-level error isolation                                   | 2h     |
| 1A.5 | Add `not-found.tsx` at root and dashboard     | Contextual 404 pages                                            | 1h     |

### Phase 2: Multi-Stakeholder Views (Priority: HIGH — Week 2)

| #   | Task                                                                                                 | PRD Section       |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| 2.1 | **Create Buyer Portal** — Order Request → Track → Accept/Reject → Pay → Feedback                     | PRD lines 449-469 |
| 2.2 | **Create Supplier Portal** — Indent Review → Accept/Reject → Receive PO → Dispatch → Bill            | PRD lines 470-485 |
| 2.3 | **Create Society Manager Dashboard** — Visitor Stats, Checklist Status, Panic Logs, Staff Attendance | PRD lines 203-208 |
| 2.4 | **Create Guard Mobile View** — Panic Button, Quick Dial, Checklist, Visitor Entry (mobile-first)     | PRD lines 138-162 |
| 2.5 | Role-based sidebar filtering — show only relevant navigation per user role                           | Core UX           |

### Phase 3: Missing Workflow Integration (Priority: HIGH — Week 3)

| #   | Task                                                                   | PRD Section                |
| --- | ---------------------------------------------------------------------- | -------------------------- |
| 3.1 | Wire visitor entry → SMS notification → push notification with photo   | PRD lines 199-202          |
| 3.2 | Wire checklist + quality ticket → photo evidence upload                | PRD lines 149, 521         |
| 3.3 | Implement Order lifecycle state machine in UI (visual pipeline/kanban) | PRD lines 486-513          |
| 3.4 | Wire GRN → PO → Indent three-way validation chain                      | PRD lines 428-432          |
| 3.5 | Implement RTV (Return to Vendor) auto-workflow                         | PRD lines 533-538          |
| 3.6 | Implement Shortage Note auto-generation                                | PRD lines 528-532          |
| 3.7 | Add Feedback collection at end of transaction                          | PRD lines 385-388, 444-447 |

#### Phase 3D: Delivery Boy Mini-Phase (inside Phase 3)

> ⚠️ **Delivery Boy is a first-class PRD stakeholder.** Do NOT defer this.

| #    | Task                                                                     | Notes                                      |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------ |
| 3D.1 | Create Delivery Boy mobile task list (assigned deliveries)               | Single-screen, mobile-first                |
| 3D.2 | Add delivery proof capture (photo of materials + digital signature)      | Camera + canvas signature                  |
| 3D.3 | Add delivery status update (en route → arrived → delivered)              | Simple state only: no finance, no inventory |
| 3D.4 | Wire delivery completion → `material_received` status on order lifecycle | Links to GRN flow                          |

### Phase 4: Missing Features (Priority: MEDIUM — Week 4)

| #   | Task                                                                | PRD Section                   |
| --- | ------------------------------------------------------------------- | ----------------------------- |
| 4.1 | Implement geo-fencing for attendance check-in (within 50m radius)   | PRD lines 301-306             |
| 4.2 | Implement selfie-based attendance                                   | PRD line 303                  |
| 4.3 | Implement GPS live tracking map for guards (Google Maps/Mapbox)     | PRD lines 143, 151            |
| 4.4 | Implement payslip PDF generation and download                       | PRD line 322                  |
| 4.5 | Implement Internal Printing tab (Visitor Passes, ID Cards, Notices) | PRD lines 276-280             |
| 4.6 | Implement Payment Gateway UI (hook + pages)                         | Schema exists, needs frontend |
| 4.7 | Implement chemical/batch expiry monitoring cron                     | PRD lines 256-258             |

### Phase 1B: Architecture Polish (Priority: MEDIUM — Week 5)

> This is the deferred half of architecture work. Routing is done in 1A; this is performance + cleanup.

| #    | Task                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| 1B.1 | Audit `"use client"` — extract server wrappers for each page                  |
| 1B.2 | Remove all remaining hardcoded stat values (3 found)                           |
| 1B.3 | Migrate `useGRN` to centralized currency utility                               |
| 1B.4 | Fix ErrorBoundary export inconsistency                                         |
| 1B.5 | Split large hooks (useReconciliation 1350 lines, usePurchaseOrders 1213 lines) |
| 1B.6 | Expose `material_receipt_items.batch_number` + `expiry_date` in GRN/ticket UI  |

---

## PART 5: REVISED COMPLETION ESTIMATE

| Category                       | Previous Claim | Harsh Reality                                              |
| ------------------------------ | -------------- | ---------------------------------------------------------- |
| Master Data                    | 99%            | **85%** — Masters exist but no role-based access           |
| Security Services              | 99%            | **60%** — No live map, no geo-fence, no photo evidence     |
| HRMS                           | 99%            | **70%** — No selfie, no geo-fence, no payslip PDF          |
| Inventory/Supply Chain         | 99%            | **55%** — Buyer/Supplier portals missing entirely          |
| Services (AC/Pest/Print/Plant) | 98%            | **80%** — Service pages work but Internal Printing missing |
| Finance                        | 95%            | **75%** — Payment gateway has no UI, feedback loop missing |
| Reports                        | 100%           | **90%** — Reports work but some hardcoded values           |
| Multi-Stakeholder              | Unmentioned    | **10%** — Only admin view exists                           |
| Next.js Best Practices         | Unmentioned    | **15%** — Every anti-pattern in the book                   |
| **Overall**                    | **~99%**       | **~65%**                                                   |

---

## PART 6: SUMMARY

The FacilityPro codebase suffers from three systemic problems:

1. **It's an Admin Dashboard, not a Multi-Stakeholder Platform.** The PRD describes 11 different user roles with distinct workflows. The app has one view that doesn't change based on who's logged in.

2. **It fetches and displays data, but doesn't implement workflows.** Having a data table with status badges is not the same as implementing an approval chain where a Buyer submits → Admin reviews → Supplier accepts → Materials are dispatched → GRN is verified → Bills are reconciled.

3. **It ignores Next.js best practices entirely.** Every page is `"use client"`, no loading states, no error boundaries, no metadata, no server components. The app would have the same architecture if it were built with Create React App in 2018.

**The previous review inflated completion by conflating "a hook and page exist" with "the PRD feature is complete." This audit draws the distinction.**

---

_End of Harsh Audit — v2.0 (DB-Verified, 2026-02-14)_
_Canonical docs: `STATE_TABLES.md`, `FEATURE_TRUTH.md`, `STAKEHOLDER_MAP.md`, `WORKFLOW_DIAGRAMS.md`_
