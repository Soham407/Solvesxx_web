# PRD vs. Codebase Audit Report

> **Generated:** 2026-02-18  
> **Scope:** Full audit of `enterprise-canvas-main` against `docs/PRD.md`  
> **Auditor:** Antigravity AI  

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented with real data |
| ⚠️ | UI-Only — renders but no real backend |
| ❌ | Implemented wrongly / broken |
| 🚫 | Missing entirely — not built |

---

## 🔴 FEATURES IMPLEMENTED WRONGLY

### 1. Smart Attendance — `hrms/attendance/page.tsx`
**PRD Requirement:** Selfie attendance with GPS geo-fencing, auto-punch out, real-time check-in.  
**What's Wrong:**V
- Page uses **hardcoded static mock data** (`const data: AttendanceRecord[] = [...]`) with 4 fake employees.
- The `useAttendance` hook (18KB) exists but is **never imported or used** in this page.
- GPS coordinates on the LiveMap are `Math.random() * 100` — completely fabricated.
- "Export Monthly" and "Manual Adjustment" buttons have no `onClick` handlers.

---

### 2. Role Master — `company/roles/page.tsx`
**PRD Requirement:** Manage roles with real RBAC control, linked to users.  
**What's Wrong:**
- Entirely **hardcoded mock data** (`const data: Role[]`) with 4 static roles.
- No Supabase hook or DB call of any kind.
- "Edit Permissions" and "Create New Role" buttons are non-functional.

---

### 3. Daily Checklists — `society/checklists/page.tsx`
**PRD Requirement:** Guards fill in real checklist items with photo evidence, linked to the Daily Checklist Master.  
**What's Wrong:**
- Uses **hardcoded static data** (`const data: ChecklistItem[]`).
- The `useGuardChecklist` hook (11KB) exists but is **not used** in this page.
- Stats (94% completion, 12 pending, 2 critical) are hardcoded numbers.
- "View Photo" button does nothing. "Create Schema" button does nothing.

---

### 4. Quality & Quantity Tickets — `tickets/quality/page.tsx`
**PRD Requirement:** Linked to GRN/PO system, photo evidence upload, shortage note generation, RTV workflow.  
**What's Wrong:**
- **100% hardcoded mock data** (`const data: QualityTicket[]`) with 3 fake tickets.
- The `useGRN` hook (32KB) exists but is not used.
- No real PO linkage or shortage note generation.
- "Log Discrepancy" button does nothing. Camera button has no handler.

---

### 5. Pest Control & Printing — Hardcoded Service UUIDs
**PRD Requirement:** Service requests should be dynamically linked to service categories.  
**What's Wrong:**
- `pest-control/page.tsx` line 33: `serviceId: "bf4442cc-cb5f-4c2a-bcf8-6ed387cd7630"` — hardcoded UUID.
- `printing/page.tsx` line 32: `serviceId: "e76b5c1c-333e-4b68-8a8b-3e5f7f38d330"` — hardcoded UUID.
- If these rows don't exist in the DB, the entire page shows empty with no error.

---

### 6. PPE Checklist (Pest Control) — Partially Hardcoded
**PRD Requirement:** Technicians must check off PPE items before starting a job, submitted to DB.  
**What's Wrong:**
- The "New Safety Check-in" card has **hardcoded static items** (lines 305–310 in pest-control page).
- The "Submit Site Readiness Report" button has **no `onClick` handler** — it does nothing.

---

### 7. Plantation Inventory — Hardcoded
**PRD Requirement:** Track seeds, manure, and tools inventory from the real inventory system.  
**What's Wrong:**
- The "Horticulture Inventory" sidebar card shows **hardcoded items** ("Organic Cow Manure - 24 kg", "Liquid Fertilizer - 2.5 L").
- Not connected to the real inventory/products system.

---

### 8. Printing — Internal Printing Tab is a Placeholder
**PRD Requirement:** Automatically generate Visitor Passes and Staff ID Cards.  
**What's Wrong:**
- The "Internal Printing" tab renders only: `"UI for automated generation of long-term Visitor Passes and ID Cards."` — a literal placeholder string in a dashed box.
- Zero implementation.

---

## 🟡 FEATURES THAT ARE UI-ONLY (No Real Backend)

| # | Feature | Location | Issue |
|---|---------|----------|-------|
| 9 | Visitor Family Directory Tab | `society/visitors/page.tsx` | Renders "Coming soon." placeholder |
| 10 | Panic Alert "Trigger Emergency" Button | `society/panic-alerts/page.tsx` | No `onClick` handler |
| 11 | Recruitment "Job Requisitions" Button | `hrms/recruitment/page.tsx` | No handler, no page |
| 12 | Recruitment "View Details" / "Edit Candidate" | `hrms/recruitment/page.tsx` | No `onClick` handlers |
| 13 | Payroll "Mark as Processed" Dropdown | `hrms/payroll/page.tsx` | No handler |
| 14 | AC Service "Schedule Visit" Button | `services/ac/page.tsx` | No `onClick` handler |
| 15 | AC Service "New Job Order" Button | `services/ac/page.tsx` | No `onClick` handler |
| 16 | AC Service Before/After Photo Upload | `services/ac/page.tsx` | Camera button is ghost with no handler |
| 17 | Plantation "Schedule Task" Button | `services/plantation/page.tsx` | No `onClick` handler |
| 18 | Plantation "History" Button | `services/plantation/page.tsx` | No `onClick` handler |
| 19 | Plantation "Open Store Manager" Button | `services/plantation/page.tsx` | No handler, no navigation |
| 20 | Printing "Personnel ID Portal" Card | `services/printing/page.tsx` | Clickable-looking card, no handler |
| 21 | Printing "Document Templates" Card | `services/printing/page.tsx` | Clickable-looking card, no handler |
| 22 | Printing "Bulk Print" Button | `services/printing/page.tsx` | No `onClick` handler |
| 23 | Printing "Register Ad Space" Button | `services/printing/page.tsx` | No `onClick` handler |
| 24 | Behavior Tickets "Dismiss Ticket" | `tickets/behavior/page.tsx` | No `onClick` handler |
| 25 | Behavior Tickets "Summary Reports" | `tickets/behavior/page.tsx` | No `onClick` handler |
| 26 | Quality Tickets "Log Discrepancy" Button | `tickets/quality/page.tsx` | No handler + uses mock data |
| 27 | Quality Tickets "Audit Logs" Button | `tickets/quality/page.tsx` | No handler |
| 28 | Checklist "Filter Logs" Button | `society/checklists/page.tsx` | No handler |
| 29 | Checklist "Create Schema" Button | `society/checklists/page.tsx` | No handler |
| 30 | Attendance "Export Monthly" Button | `hrms/attendance/page.tsx` | No handler |
| 31 | Attendance "Manual Adjustment" Button | `hrms/attendance/page.tsx` | No handler |

---

## 🚫 FEATURES COMPLETELY MISSING (Not Built At All)

### 32. Guard Mobile App / Guard-Facing Dashboard
**PRD Requirement:** Guards need a mobile-optimized interface with panic button, checklist submission, selfie attendance, and GPS check-in.  
**Reality:** `test-guard` is a test page only. No real deployable guard-facing screen exists.

---

### 33. Inactivity Alert System (Static Guard)
**PRD Requirement:** If guard's GPS doesn't change for 30 minutes, trigger an "Inactivity Alert" to the Manager.  
**Reality:** `useInactivityMonitor.ts` (3KB) exists as an isolated hook but has no UI page and no pg_cron/edge function wiring it to the panic alert system.

---

### 34. Checklist Reminder Automation
**PRD Requirement:** If checklist is not filled by 9:00 AM, send an automatic reminder to the guard.  
**Reality:** No pg_cron job or edge function for this. The `check-document-expiry` edge function exists but does not cover checklist reminders.

---

### 35. Real Geo-Fencing for Attendance
**PRD Requirement:** The "Check-in" button only works if the guard is within a 50-meter radius of the registered Company Location.  
**Reality:** The attendance page uses mock data. The `useAttendance` hook may have the logic but the web UI does not enforce geo-fencing. This is effectively a mobile-only feature with no real web implementation.

---

### 36. Supplier Wise Services Master
**PRD Requirement:** A master that links vendors to specific service categories (e.g., "AC Repair" → only AC vendors shown when raising a request).  
**Reality:** `useSupplierProducts` exists for material products. No "Supplier Wise Services" master page found.

---

### 37. Work Master & Services Wise Work Master
**PRD Requirement:** A library of all job types (Filter Cleaning, Gas Top-up, Lawn Mowing, Chemical Spraying) mapped to service categories.  
**Reality:** No dedicated Work Master page found in the codebase.

---

### 38. Service Purchase Order (SPO) for Staffing/Security
**PRD Requirement:** After a supplier accepts a service indent, a formal Service Purchase Order is issued as a legal contract for the deployment.  
**Reality:** The PO system in inventory handles material POs only. There is no separate SPO flow for service deployments (security guards, housekeeping staff, etc.).

---

### 39. Service Delivery Note & Service Acknowledgment
**PRD Requirement:** Supplier uploads a digital Delivery Note with deployed staff names/credentials. Admin performs a Service Acknowledgment confirming headcount and skill level.  
**Reality:** The supplier portal handles indents but there is no "Service Delivery Note" or "Service Acknowledgment" workflow.

---

### 40. Buyer Feedback / Check Feedback (End of Cycle)
**PRD Requirement:** After bill payment, the buyer is prompted to rate performance (was the guard professional? was housekeeping punctual?).  
**Reality:** No feedback/rating system exists in the buyer portal or financial closure flow. The PRD explicitly marks this as the final step before `END`.

---

### 41. HRMS — Shift-Based Attendance Validation
**PRD Requirement:** Attendance check-in should validate against the employee's assigned shift timings.  
**Reality:** `hrms/shifts` route and `useShifts` hook exist, but the attendance page uses mock data and doesn't validate against shift assignments.

---

### 42. Employee Leave — Approval Notification
**PRD Requirement:** Manager receives an SMS/app notification to Approve or Reject a leave application.  
**Reality:** `useLeaveApplications` hook exists. The `send-notification` edge function exists. But leave approval does **not** trigger the notification edge function.

---

### 43. Material Supply Services (Dedicated Module)
**PRD Requirement:** Hot & Cold Beverages, Eco-Friendly Disposables, Cleaning Essentials, Air Fresheners, Stationery, Corporate Gifting — each as a trackable supply category with its own workflow.  
**Reality:** The inventory system handles products generically. There is no dedicated "Material Supply Services" module with category-specific procurement workflows.

---

## ✅ FEATURES PROPERLY IMPLEMENTED

| Feature | Hook / Page | Status |
|---------|------------|--------|
| Visitor Management (entry/exit/pass/photo) | `useVisitors` + `society/visitors` | ✅ Real |
| Panic Alert History & Resolution | `usePanicAlertHistory` + `society/panic-alerts` | ✅ Real + Realtime |
| Recruitment Pipeline (Candidate → Employee) | `useCandidates` + `hrms/recruitment` | ✅ Full workflow + BGV upload |
| Payroll Cycle Creation & Payslip Generation | `usePayroll` + `hrms/payroll` | ✅ Real hooks + RPC |
| Employee Documents Upload | `useEmployeeDocuments` + `hrms/documents` | ✅ Supabase Storage |
| Employee Leave Applications | `useLeaveApplications` + `hrms/leave` | ✅ Real hooks |
| Behavior Tickets (Create + Status Update) | `useBehaviorTickets` + `tickets/behavior` | ✅ Real hooks |
| Inventory (Products, Categories, Suppliers) | `useInventory` + `inventory/*` | ✅ Real hooks |
| Purchase Orders (Material) | `usePurchaseOrders` + `inventory/purchase-orders` | ✅ Full workflow |
| GRN (Goods Received Note) | `useGRN` + `inventory/grn` | ✅ Real hooks |
| Supplier Bills & Buyer Invoices | `useSupplierBills` + `useBuyerInvoices` | ✅ Real hooks |
| Financial Reconciliation | `useReconciliation` + `finance/reconciliation` | ✅ Real hooks |
| Buyer Portal (Requests, Invoices) | `useBuyerRequests` + `buyer/*` | ✅ Real hooks |
| Supplier Portal (Indents, Bills, POs) | `useSupplierPortal` + `supplier/*` | ✅ Real hooks |
| AC Services (Service Requests + Inventory) | `useServiceRequests` + `services/ac` | ✅ Real hooks (filtered) |
| Pest Control (Service Requests + Chemicals) | `usePestControlInventory` + `services/pest-control` | ✅ Real hooks |
| Plantation Operations | `usePlantationOps` + `services/plantation` | ✅ Real hooks |
| Printing & Ad-Space Master | `usePrintingMaster` + `services/printing` | ✅ Real hooks |
| Emergency Contacts | `useEmergencyContacts` + `society/emergency` | ✅ Real hooks |
| Panic Alert Realtime Subscription | `usePanicAlertSubscription` | ✅ Realtime |
| MSG91 SMS Notifications | `send-notification` edge function | ✅ Deployed |
| Document Expiry Alerts | `check-document-expiry` edge function + pg_cron | ✅ Automated |
| Reorder Alerts | `useReorderAlerts` | ✅ Real hooks |
| Asset Management & QR Codes | `useAssets` + `useQrCodes` | ✅ Real hooks |

---

## 📋 Priority Fix Roadmap

### 🔴 Critical (Breaks Core PRD Promise)

| # | Task | File to Fix |
|---|------|------------|
| 1 | Replace mock data with `useAttendance` hook | `hrms/attendance/page.tsx` |
| 2 | Replace mock data with `useGuardChecklist` hook | `society/checklists/page.tsx` |
| 3 | Replace mock data with `useGRN` hook | `tickets/quality/page.tsx` |
| 4 | Replace mock data with real Supabase roles query | `company/roles/page.tsx` |

### 🟠 High (Core Workflow Gaps)

| # | Task |
|---|------|
| 5 | Implement Before/After photo upload in AC service job workflow |
| 6 | Make PPE checklist submission functional (write to DB) |
| 7 | Add Buyer Feedback/Rating system after bill payment |
| 8 | Build Service Purchase Order (SPO) flow for staffing deployments |
| 9 | Wire leave approval to `send-notification` edge function |

### 🟡 Medium (PRD Completeness)

| # | Task |
|---|------|
| 10 | Remove hardcoded service UUIDs (pest control, printing) — fetch dynamically |
| 11 | Build Work Master & Services Wise Work Master pages |
| 12 | Build Supplier Wise Services Master page |
| 13 | Implement inactivity alert automation (pg_cron → panic alert) |
| 14 | Implement checklist reminder automation (pg_cron → SMS) |
| 15 | Build Service Delivery Note & Service Acknowledgment workflow |

### 🟢 Low (Polish & UX)

| # | Task |
|---|------|
| 16 | Wire all ghost buttons (Schedule Visit, New Job Order, etc.) to dialogs/pages |
| 17 | Implement Visitor Family Directory tab |
| 18 | Build Printing — Internal Printing tab (Visitor Pass / ID Card generation) |
| 19 | Connect Plantation Inventory sidebar to real inventory system |
| 20 | Add real geo-fencing validation to attendance check-in |

---

*End of Audit Report*
