# FacilityPro — UI & Scope Gap Analysis
**Reviewer:** Subagent 3 (UI/Scope Gap Analysis)
**Date:** 2026-03-21
**Codebase:** enterprise-canvas-main / branch: main

---

## SUMMARY — Top 20 Critical/High Issues

| # | Severity | File / Location | One-Line Description |
|---|----------|-----------------|----------------------|
| 1 | CRITICAL | `components/dashboards/` | `ACTechnicianDashboard.tsx` and `PestControlTechnicianDashboard.tsx` do not exist — both roles use generic `ServiceBoyDashboard` |
| 2 | CRITICAL | `app/(dashboard)/hrms/incidents/` | `/hrms/incidents` directory exists in PHASES.md as ✅ FULL but `page.tsx` does not exist on disk |
| 3 | CRITICAL | `app/(dashboard)/settings/` | Sidebar links to `/settings/permissions`, `/settings/notifications`, `/settings/branding` — none of these pages exist |
| 4 | HIGH | `src/lib/notifications.ts` | 22 of 28 SCOPE.md notification triggers have no implementation — no code inserts rows into the `notifications` table for most events |
| 5 | HIGH | `components/dashboards/GuardLiveMap.tsx` | Guard live map renders a CSS grid dot simulation instead of a real map provider — no Leaflet, Google Maps, or Mapbox integration |
| 6 | HIGH | `hooks/usePatrolLogs.ts` | Patrol log hook is read-only; no `createPatrolLog` mutation exists — guard cannot log a patrol from the UI |
| 7 | HIGH | SCOPE.md §11.1 Super Admin | Super Admin has zero dedicated screens (Platform Dashboard, Admin Management, Audit Logs, System Config) — only reuses AdminView |
| 8 | HIGH | SCOPE.md §11.6 Storekeeper | "Stock Issue" screen (log parts/items issued to technicians) is entirely missing — no route, no hook, no UI |
| 9 | HIGH | SCOPE.md §11.3 Company MD | "Approval Queue" (high-value / escalated requests requiring MD sign-off) is not implemented — no dedicated screen or workflow |
| 10 | HIGH | `components/dialogs/ServiceDeliveryNoteDialog.tsx` | SDN dialog only creates a record; no PDF generation or download button for the delivery note |
| 11 | HIGH | SCOPE.md §16 Rule 5 | Shortage Note auto-dispatch notification to supplier after GRN short-receipt is not triggered — no `sendNotification` call in `useShortageNotes.ts` |
| 12 | HIGH | SCOPE.md §16 Rule 6 | Feedback-required gate before order closure: `feedback_pending` status exists in UI but no server-side enforcement prevents closing an order without feedback |
| 13 | HIGH | `app/(dashboard)/assets/qr-codes/page.tsx` | QR scanning for asset check-in/check-out is missing — `html5-qrcode` is installed only in the `.worktrees` branch, not in main |
| 14 | HIGH | `app/(dashboard)/buyer/` | Buyer "Profile & Account Settings" screen (SCOPE.md §11.8) does not exist — no route at `/buyer/profile` or `/buyer/settings` |
| 15 | MEDIUM | `app/(dashboard)/supplier/` | Supplier "Profile" screen (SCOPE.md §11.9) does not exist — no route at `/supplier/profile` |
| 16 | MEDIUM | `src/lib/constants.ts` | SCOPE.md §6 state machine missing `closed` status for Service Request — constants only define `open/assigned/in_progress/on_hold/completed/cancelled` |
| 17 | MEDIUM | `app/(dashboard)/inventory/indents/` | No `/inventory/indents` list page exists (only `/indents/create` and `/indents/verification`) — the list view for all indents is missing |
| 18 | MEDIUM | `app/(dashboard)/society/` | Visitor state machine missing: `pre_approved` and `arrived` states not reflected in UI — `VISITOR_STATUS` constants entirely absent from `constants.ts` |
| 19 | MEDIUM | `app/api/waitlist/route.ts` | Waitlist submission inserts to Supabase but sends no confirmation email to the submitter |
| 20 | MEDIUM | `app/(dashboard)/reports/` | Reports module and all sub-routes are gated behind `REPORTS_MODULE` feature flag — all four report pages are hidden by default without env var override |

---

## PART A — SCREEN COMPLETENESS PER ROLE

### Role Mapping Summary
SCOPE.md §11 defines screens for 16 roles. The codebase has 18 `AppRole` types in `src/lib/auth/roles.ts` (includes `vendor` and `super_admin` not enumerated separately in SCOPE §2).

---

### 11.1 Super Admin
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Platform Dashboard | N/A | ❌ | No dedicated super_admin dashboard. `renderDashboard()` falls through to `<AdminView />` — same as admin |
| Admin Management | N/A | ❌ | No page to create/suspend Admin accounts |
| Role & Permission Manager | `/company/roles` | ⚠️ | Exists but uses same page as Admin — no RBAC matrix editor |
| Audit Logs | N/A | ❌ | No audit logs page |
| System Configuration | N/A | ❌ | No system config page (system_config table exists but no UI) |

**Overall: ❌ Not Implemented** — Super Admin reuses Admin dashboard. No platform-level screens exist.

---

### 11.2 Admin
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Admin Dashboard | `/dashboard` (AdminView) | ✅ | Real data via `useMDStats`, `useServiceRequests`, `useReorderAlerts` |
| Request Management | `/inventory/indents` | ⚠️ | No `/inventory/indents` list page — only `/inventory/indents/create` |
| Indent Management | `/inventory/indents/create` | ✅ | Full CRUD |
| Purchase Order | `/inventory/purchase-orders` | ✅ | Full lifecycle |
| Material Acknowledgment | `/inventory/grn` | ✅ | |
| Supplier Management | `/inventory/suppliers` | ✅ | |
| Sale Bill Management | `/finance/buyer-billing` | ✅ | |
| Purchases Bill Management | `/finance/supplier-bills` | ✅ | |
| Master Data (All) | Various | ✅ | |
| HRMS Panel | `/hrms/*` | ✅ | |
| Reports & Analytics | `/reports/*` | ⚠️ | Gated behind `REPORTS_MODULE` feature flag — off by default |

---

### 11.3 Company MD
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Executive Dashboard | `/dashboard` → `MDDashboard` | ✅ | Real data, connected |
| Approval Queue | N/A | ❌ | No approval queue page for high-value/escalated requests |
| Reports (read-only) | `/reports/*` | ⚠️ | Gated behind `REPORTS_MODULE` feature flag |

---

### 11.4 Company HOD
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Department Dashboard | `/dashboard` → `HODDashboard` | ✅ | |
| Request Submission | `/service-requests/new` | ✅ | |
| Staff Overview | `/hrms/attendance`, `/company/employees` | ✅ | |
| Behaviour Ticket Review | `/tickets/behavior` | ✅ | |

---

### 11.5 Account
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Financial Dashboard | `/dashboard` → `AccountsDashboard` | ✅ | |
| Purchases Bill | `/finance/supplier-bills` | ✅ | |
| Sale Bill | `/finance/buyer-billing` | ✅ | |
| Payroll Processing | `/hrms/payroll` | ✅ | PDF download via jsPDF |
| Rate Management | `/inventory/supplier-rates`, `/inventory/sales-rates` | ✅ | |
| Financial Reports | `/reports/financial` | ⚠️ | Behind REPORTS_MODULE flag |

---

### 11.6 Storekeeper / Inventory Manager
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Inventory Dashboard | `/dashboard` → `StorekeeperDashboard` | ✅ | |
| Material Receipt | `/inventory/grn` | ✅ | |
| Quality & Quantity Ticket | `/tickets/quality` | ✅ | |
| Return to Vendor (RTV) | `/tickets/returns` | ✅ | |
| **Stock Issue** | N/A | ❌ | **No page exists to log parts/items issued to technicians or departments** |
| Inventory Reports | `/reports/inventory` | ⚠️ | Behind REPORTS_MODULE flag |

---

### 11.7 Site Supervisor
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Site Dashboard | `/dashboard` → `SiteSupervisorDashboard` | ✅ | |
| Service Acknowledgment | Via `/inventory/service-purchase-orders` (ServiceAcknowledgmentDialog) | ✅ | |
| Behaviour Ticket | `/tickets/behavior` | ✅ | |
| Staff Attendance View | `/hrms/attendance` | ✅ | |
| Service Job Tracking | `/service-requests` | ✅ | |

---

### 11.8 Buyer (Admin)
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Buyer Dashboard | `/buyer` | ✅ | |
| New Order / Service Request | `/buyer/requests/new` | ✅ | |
| Active Services | `/buyer` (inline section) | ✅ | |
| Order History | `/buyer/requests` | ✅ | |
| Bills & Payments | `/buyer/invoices` | ✅ | |
| Feedback Submission | Via `BuyerFeedbackDialog` | ✅ | |
| **Profile & Account Settings** | N/A | ❌ | **No `/buyer/profile` or `/buyer/settings` page** |

---

### 11.9 Supplier / Vendor
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Supplier Dashboard | `/supplier` | ✅ | |
| Indent Management | `/supplier/indents` | ✅ | |
| Purchase Order Tracking | `/supplier/purchase-orders` | ✅ | |
| Personnel Dispatch | `/supplier/service-orders` (ServiceDeliveryNoteDialog) | ✅ | |
| Supplier Bill | `/supplier/bills` | ✅ | |
| Payment Status | `/supplier/bills` (inline) | ✅ | |
| **Profile** | N/A | ❌ | **No `/supplier/profile` page** |

---

### 11.10 Security Guard
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Home (SOS + quick actions) | `/guard` | ✅ | Hold-to-trigger panic, links to checklist/emergency |
| Attendance | `/hrms/attendance` | ✅ | |
| Daily Checklist | `/society/checklists` | ✅ | |
| Visitor Entry | Via `VisitorRegistrationDialog` on `/guard` | ✅ | |
| Daily Visitor List | `/society/visitors` | ✅ | |
| Emergency Contacts | `/society/emergency` | ✅ | |
| Leave Application | `/hrms/leave` | ✅ | |

**Note:** SCOPE requires guard to use `/test-guard` as legacy interface; `/guard` is the new dedicated page. Both exist.

---

### 11.11 Security Supervisor
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Supervisor Dashboard | `/dashboard` → `SecuritySupervisorDashboard` | ✅ | |
| Guard Monitoring | `GuardLiveMap` component | ⚠️ | Live GPS list exists but map visualization is a CSS simulation (no real map provider) |
| Alert Log | `/society/panic-alerts` | ✅ | |
| Behaviour Ticket | `/tickets/behavior` | ✅ | |
| Attendance Overview | `/hrms/attendance` | ✅ | |

---

### 11.12 Society Manager
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Manager Dashboard | `/dashboard` → `SocietyManagerDashboard` | ✅ | |
| Visitor Management | `/society/visitors` | ✅ | |
| Material Ticket | `/tickets/quality` | ✅ | |
| Behaviour Ticket | `/tickets/behavior` | ✅ | |
| Service Requests | `/service-requests` | ✅ | |
| Company Events | `/hrms/events` | ✅ | |
| Staff Attendance | `/hrms/attendance` | ✅ | |

---

### 11.13 AC Technician
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| **My Jobs (dashboard)** | `/dashboard` → uses `ServiceBoyDashboard` | ⚠️ | **AC-specific dashboard (`ACTechnicianDashboard.tsx`) does not exist in main branch** — PHASES.md marks it ✅ FULL but only exists in `.worktrees/production-readiness-fix` |
| Job Detail | `/service-requests/[id]` | ✅ | |
| Job Execution | `/service-boy` | ⚠️ | Behind `SERVICE_BOY_PAGE` feature flag, off by default |
| Parts Request | No dedicated screen | ❌ | No "request parts from inventory" workflow for technicians |
| Attendance | `/hrms/attendance` | ✅ | |
| Leave Application | `/hrms/leave` | ✅ | |

---

### 11.14 Pest Control Technician
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| **My Jobs (dashboard)** | `/dashboard` → uses `ServiceBoyDashboard` | ⚠️ | **`PestControlTechnicianDashboard.tsx` does not exist in main branch** |
| Job Detail | `/service-requests/[id]` | ✅ | |
| **PPE Checklist (pre-job)** | Not in service-boy interface | ❌ | The mandatory pre-job PPE checklist listed in SCOPE §11.14 is not implemented as a separate screen in `/service-boy` |
| Job Execution | `/service-boy` | ⚠️ | Behind `SERVICE_BOY_PAGE` flag |
| Chemical Request | No dedicated screen | ❌ | No "request chemicals from store" workflow |
| Attendance | `/hrms/attendance` | ✅ | |

---

### 11.15 Service Boy
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Attendance | `/hrms/attendance` | ✅ | |
| My Tasks | `/service-boy` | ⚠️ | Behind `SERVICE_BOY_PAGE` flag |
| Task Update | `/service-boy` | ⚠️ | Behind `SERVICE_BOY_PAGE` flag |
| Leave Application | `/hrms/leave` | ✅ | |

---

### 11.16 Delivery Boy
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Dashboard | `/test-delivery` or `/delivery` | ✅ | `DeliveryDashboard` component, real data |

---

### 11.17 Resident
| Required Screen | Route | Status | Notes |
|-----------------|-------|--------|-------|
| Resident Dashboard | `/resident` or `/test-resident` | ✅ | Dynamic data via `useResidentProfile` |
| Visitor Invitation | `/society/my-flat` | ✅ | |
| Guest Invitation action | Sidebar link commented out | ⚠️ | `href: "/society/my-flat?action=invite"` is `/* Temporarily hidden */` in AppSidebar |

---

## PART B — DASHBOARD COMPLETENESS

### Dashboard File Inventory
| Role | Component File | Exists? | Real Data? |
|------|---------------|---------|-----------|
| Admin | `AdminView` (inline in page) | ✅ | ✅ Real (`useMDStats`, `useServiceRequests`, `useReorderAlerts`) |
| Company MD | `MDDashboard.tsx` | ✅ | ✅ |
| Company HOD | `HODDashboard.tsx` | ✅ | ✅ |
| Account | `AccountsDashboard.tsx` | ✅ | ✅ |
| Delivery Boy | `DeliveryDashboard.tsx` | ✅ | ✅ |
| Buyer | `BuyerDashboard.tsx` | ✅ | ✅ |
| Supplier/Vendor | `SupplierDashboard.tsx` | ✅ | ✅ |
| Security Guard | `GuardDashboard.tsx` | ✅ | ✅ |
| Security Supervisor | `SecuritySupervisorDashboard.tsx` | ✅ | ✅ |
| Society Manager | `SocietyManagerDashboard.tsx` | ✅ | ✅ |
| Storekeeper | `StorekeeperDashboard.tsx` | ✅ | ✅ |
| Site Supervisor | `SiteSupervisorDashboard.tsx` | ✅ | ✅ |
| Service Boy | `ServiceBoyDashboard.tsx` | ✅ | ✅ |
| Resident | `ResidentDashboard.tsx` | ✅ | ✅ |
| **AC Technician** | `ACTechnicianDashboard.tsx` | **❌** | **Only in `.worktrees/production-readiness-fix`** |
| **Pest Control Technician** | `PestControlTechnicianDashboard.tsx` | **❌** | **Only in `.worktrees/production-readiness-fix`** |
| Super Admin | (none) | ❌ | Falls through to `AdminView` |

**Findings:**
- PHASES.md and dashboard/page.tsx both state `ac_technician` and `pest_control_technician` use `ServiceBoyDashboard` (lines 128–129 in page.tsx). PHASES.md §Dashboards claims `ACTechnicianDashboard` and `PestControlTechnicianDashboard` are ✅ FULL — this is **incorrect**. The dedicated files only exist in the production-readiness worktree branch, not merged to `main`.
- Total implemented in main: **14 dashboards** (not 16 as claimed in PHASES.md "14 of 14" note — two technician dashboards are missing).
- Super Admin shows `AdminView` which is sufficient for current usage, but is not a true platform-level admin view.

---

## PART C — COMINGSOON AUDIT

A full-text search across all `.tsx` and `.ts` files in the main branch (excluding `.worktrees` and `node_modules`) for `ComingSoonChart` and `ComingSoonWidget` returned **zero matches**.

**Conclusion:** All `ComingSoon` placeholder components have been replaced with real implementations. This is consistent with PHASES.md "Known Mock Data" section noting no remaining mocks.

The `ComingSoon` components themselves still exist in `components/shared/ComingSoon.tsx` (available for future use) but are not rendered anywhere in the current application.

---

## PART D — WORKFLOW GAP ANALYSIS

### 5.1 Admin Workflow (Material Supply)
| Step | UI | Hook | DB | Status | Notes |
|------|----|----|-----|--------|-------|
| Buyer submits Order Request | `/buyer/requests/new` | `useBuyerRequests` | `requests` | ✅ | |
| Admin Accept/Pending/Reject | `/inventory/indents/create` | `useIndents` | `indents` | ✅ | |
| Indent Generation + Forward | `/inventory/indents/create` | `useIndents` | `indents` | ✅ | |
| Issue PO to Supplier | `/inventory/purchase-orders` | `usePurchaseOrders` | `purchase_orders` | ✅ | |
| Supplier Receives + Dispatches PO | `/supplier/purchase-orders` | `useSupplierPortal` | | ✅ | |
| Storekeeper Acknowledge Material | `/inventory/grn` | `useGRN` | `material_receipts` | ✅ | |
| Process Supplier Bill → Paid | `/finance/supplier-bills` | `useSupplierBills` | | ✅ | |
| Check Feedback | `/buyer/requests` + dialog | `useBuyerFeedback` | `buyer_feedback` | ⚠️ | Feedback is submitted but no admin screen specifically consolidates feedback review |

### Specific High-Risk Items

| Item | Status | Notes |
|------|--------|-------|
| **Shortage Note auto-dispatch to supplier (Rule 5)** | ❌ | `useShortageNotes.ts` creates shortage notes but does NOT call `sendNotification()` or insert into `notifications` table for the supplier. No auto-dispatch trigger on GRN short-receipt. |
| **Feedback-required gate before order closure (Rule 6)** | ⚠️ | `feedback_pending` status exists in the buyer request flow. The UI shows a "Leave Feedback" button only for `feedback_pending` rows. However, no server-side enforcement (DB constraint or RLS policy) prevents an admin from moving an order to `closed`/`end` without feedback being submitted. |
| **Service Delivery Note PDF generation and download** | ❌ | `ServiceDeliveryNoteDialog.tsx` only creates a DB record. No jsPDF call, no download button for the SDN document itself. |
| **Payslip PDF generation per employee per payroll cycle** | ✅ | `hooks/usePayroll.ts` contains `downloadPayslipPdf` using jsPDF (dynamic import). Wired to payroll page. |
| **QR code scanning for asset check-in/check-out** | ❌ | `QrBatchGenerator` only generates QR codes (uses `qrcode.react`). No QR scanner component in main branch (`html5-qrcode` only installed in `.worktrees`). `/scan` route referenced in `QR_CODE_CONFIG.SCAN_PATH` does not exist. |
| **Guard live location map view for supervisors** | ⚠️ | `GuardLiveMap.tsx` fetches real GPS coordinates via `useGuardLiveLocation` but renders them as CSS dot overlays on a simulated grid, not a real map. Comment in code: "In a real app, we'd use Leaflet or Google Maps here." |
| **Patrol log creation from guard mobile interface** | ❌ | `usePatrolLogs` is read-only — only fetches from `guard_patrol_logs` table. No `createPatrolLog` mutation. No UI form for a guard to log a patrol on `/guard` or `/test-guard`. |
| **BGV status update and document upload for HR** | ✅ | `useBackgroundVerifications.ts` has `uploadDocument()`. Recruitment page (`/hrms/recruitment`) has a BGV dialog with file upload at line 215. |
| **Material Return (RTV) full workflow** | ✅ | raise → approve → dispatch → supplier credit — all via `useRTVTickets`, status transitions mapped in `RTV_STATUS` constants. |
| **Ad Booking workflow** | ✅ | `useAdBookings` → booking status → delivery confirmation — implemented in printing page with `AdBookingDialog`. |
| **Landing page waitlist** | ⚠️ | Form submission (`app/page.tsx`) → API route (`/api/waitlist`) → Supabase insert → ✅ works. Confirmation email to submitter: ❌ not implemented. |

---

## PART E — NOTIFICATION COVERAGE

Source of truth: `src/lib/notifications.ts` + `hooks/` + edge functions.

| # | Trigger Event | Implemented? | Where |
|---|--------------|-------------|-------|
| 1 | Buyer submits Order Request → Admin | ❌ | No notification triggered in `useBuyerRequests.ts` create flow |
| 2 | Admin accepts Order Request → Buyer | ❌ | No notification in `useIndents.ts` or `useBuyerRequests.ts` accept flow |
| 3 | Admin rejects Order Request → Buyer | ❌ | Not triggered |
| 4 | Admin forwards Indent to Supplier | ❌ | Not triggered in `useIndents.ts` forward action |
| 5 | Supplier accepts Indent → Admin | ❌ | Not triggered in `useSupplierPortal.ts` |
| 6 | Supplier rejects Indent → Admin | ❌ | Not triggered |
| 7 | Admin issues PO → Supplier | ❌ | Not triggered in `usePurchaseOrders.ts` |
| 8 | Supplier dispatches goods → Admin, Storekeeper | ❌ | Not triggered |
| 9 | Storekeeper acknowledges material → Admin | ❌ | Not triggered in `useGRN.ts` |
| 10 | Bad Material flagged → Admin, Supplier | ❌ | Not triggered |
| 11 | Quantity shortage detected → Admin, Supplier | ❌ | Not triggered in `useShortageNotes.ts` |
| 12 | Sale Bill generated → Buyer | ❌ | Not triggered in `useBuyerInvoices.ts` |
| 13 | Buyer pays Sale Bill → Admin, Account | ❌ | Not triggered |
| 14 | Guard triggers Panic/SOS → Manager, Committee | ✅ | `usePanicAlert.ts` calls `sendPanicAlertNotification()` which invokes `send-notification` edge function |
| 15 | Guard inactivity → Manager, Supervisor | ✅ | `check-guard-inactivity` edge function + `inactivity-monitor` |
| 16 | Checklist not filled → Guard | ✅ | `check-incomplete-checklists` + `checklist-reminders` edge functions |
| 17 | Visitor arrives → Resident | ✅ | `useGuardVisitors.ts` line ~231 calls `sendVisitorArrivalNotification()` |
| 18 | Leave application submitted → HOD/Manager | ❌ | `useLeaveApplications.ts` has no notification call on submission |
| 19 | Leave approved/rejected → Employee | ⚠️ | `sendLeaveApprovalNotification()` exists in `notifications.ts` but is not called anywhere in `useLeaveApplications.ts` |
| 20 | Low stock alert → Admin, Storekeeper | ❌ | `sendReorderAlertNotification()` exists in `notifications.ts` but is not called from `useReorderAlerts.ts` |
| 21 | Chemical nearing expiry → Admin, Storekeeper | ✅ | `detect_chemical_expiry()` cron — inserts into `notifications` |
| 22 | Buyer service expiring soon → Buyer | ❌ | Not implemented |
| 23 | Behaviour ticket raised → Admin, HOD | ❌ | `useBehaviorTickets.ts` create flow has no notification call |
| 24 | Technician completes job → Manager, Admin | ❌ | `useJobSessions.ts` complete flow has no notification call |
| 25 | Payslip generated → Employee | ❌ | `usePayroll.ts` `generatePayslips()` has no notification call |
| 26 | Checklist submitted → Supervisor, Manager | ✅ | Implied via `check-checklist` edge function |
| 27 | Deployment confirmed → Buyer, Admin | ❌ | `useServiceDeliveryNotes.ts` / `usePersonnelDispatches.ts` no notification |
| 28 | Supplier bill submitted → Admin, Account | ❌ | `useSupplierBills.ts` / `useSupplierPortal.ts` no notification |

**Summary:** 5 of 28 notification triggers are implemented (triggers #14, #15, #16, #17, #21 via edge functions or direct hooks). 23 triggers are missing.

---

## PART F — SIDEBAR HIDDEN ITEMS

Reading `components/layout/AppSidebar.tsx`:

```
/* Temporarily hidden
{ title: "Guest Invitation", href: "/society/my-flat?action=invite" },
*/
```

**Only 1 nav item is explicitly commented out.** The sidebar relies on feature flags to hide other items dynamically rather than using code comments.

**Feature-flag-hidden items** (hidden when env flags are OFF, i.e., default production state):
| Nav Item | Route | Page Exists? | Flag |
|----------|-------|-------------|------|
| Kanban Board | `/service-requests/board` | ✅ | `KANBAN_BOARD` |
| Attendance Analysis | `/reports/attendance` | ✅ | `REPORTS_MODULE` |
| Financial Health | `/reports/financial` | ✅ | `REPORTS_MODULE` |
| Operational Excellence | `/reports/services` | ✅ | `REPORTS_MODULE` |
| Resource Consumption | `/reports/inventory` | ✅ | `REPORTS_MODULE` |
| Assets & Maintenance | `/assets` | ✅ | `ASSET_MODULE` |
| Asset Registry | `/assets` | ✅ | `ASSET_MODULE` |
| QR Code Lab | `/assets/qr-codes` | ✅ | `ASSET_MODULE` |
| Maintenance Schedules | `/assets/maintenance` | ✅ | `MAINTENANCE_SCHEDULING` |
| Warehouses | `/inventory/warehouses` | ✅ | `MULTI_WAREHOUSE` |
| Asset Categories | `/assets/categories` | ✅ | `ASSET_CATEGORY_HIERARCHY` |
| Indent Verification | `/inventory/indents/verification` | ✅ | `INDENT_VERIFICATION` |
| Leave Config | `/hrms/leave/config` | ✅ | `LEAVE_CONFIG_ADMIN` |
| Specialized Profiles | `/hrms/specialized-profiles` | ✅ | `SPECIALIZED_PROFILES` |
| My Jobs (Service Boy) | `/service-boy` | ✅ | `SERVICE_BOY_PAGE` |
| Settings (all) | `/settings/*` | ⚠️ | `SETTINGS_MODULE` — pages for `/settings/permissions`, `/settings/notifications`, `/settings/branding` do NOT exist despite the flag |

**Critical finding:** The sidebar shows links to `/settings/permissions`, `/settings/notifications`, and `/settings/branding` in the navigation array, but these routes have no corresponding `page.tsx` files. When `SETTINGS_MODULE` flag is enabled, navigating to these routes will produce a 404.

---

## PART G — STATE MACHINE VERIFICATION

### Order Request (requests table)
| Defined in Code | SCOPE.md Expected |
|-----------------|------------------|
| `pending`, `accepted`, `rejected`, `indent_generated`, `po_issued`, `dispatched`, `delivered`, `material_acknowledged`, `bill_generated`, `feedback_pending`, `closed`, `end` | `pending → accepted/rejected → indent_generated → po_issued → dispatched → delivered → billed → paid → end` |
| | |

**Gaps:**
- SCOPE.md status `billed` is not in the hook — uses `bill_generated` instead (acceptable rename).
- SCOPE.md status `paid` is not defined in buyer request status — the payment is tracked on the bill, not the order.
- `feedback_pending` and `closed` exist but the transition gate (Rule 6) is not enforced server-side.

### Indent Status
| Defined in `useIndents.ts` | SCOPE.md §14.9 |
|---------------------------|----------------|
| `draft`, `pending_approval`, `approved`, `rejected`, `cancelled`, `forwarded`, `fulfilled` | `drafted → forwarded → accepted → rejected` |

**Gaps:** SCOPE.md uses `drafted` but codebase uses `draft`. Minor naming mismatch but functionally equivalent.

### Purchase Order Status
| Defined in `usePurchaseOrders.ts` | SCOPE.md §14.10 |
|----------------------------------|----------------|
| `draft`, `issued`, `acknowledged`, `dispatched`, `received`, `partially_received`, `closed` | `issued → received → dispatched → delivered` |

**Gaps:** `delivered` → codebase uses `received` and `partially_received`. No `closed` status in SCOPE.md but exists in code.

### GRN Status
| Defined in `useGRN.ts` | SCOPE.md Expectation |
|------------------------|---------------------|
| `draft`, `inspecting`, `accepted`, `partial_accepted`, `rejected` | `pending → acknowledged → partial/complete` |

**Gaps:** `pending` not defined — uses `draft`. `acknowledged` is not a distinct status. Names differ from SCOPE.md but semantically complete.

### Supplier Bill Status
| Defined in `useSupplierBills.ts` / `useBuyerInvoices.ts` | SCOPE.md |
|---------------------------------------------------------|---------|
| `pending`, `approved`, `rejected`, `paid`, `overdue` | `pending → approved → paid` |

✅ Full match. `rejected` and `overdue` are additions beyond SCOPE.

### Service Request Status
| Defined in `constants.ts` | SCOPE.md §14.19 |
|--------------------------|----------------|
| `open`, `assigned`, `in_progress`, `on_hold`, `completed`, `cancelled` | `open → assigned → in_progress → completed → closed` |

**Gap:** `closed` status is defined in SCOPE.md §14.19 but missing from `SERVICE_REQUEST_STATUS` constants. The transition from `completed` to `closed` (after manager review) cannot be performed.

### Job Session Status
| Defined in `constants.ts` | SCOPE.md |
|--------------------------|---------|
| `started`, `paused`, `completed`, `cancelled` | `open → in_progress → completed` |

**Gap:** `open` is not a defined status — only `started`. Jobs that are assigned but not yet started have no status value.

### Leave Application Status
| Defined in `useLeaveApplications.ts` | SCOPE.md §14.18 |
|--------------------------------------|----------------|
| `pending`, `approved`, `rejected`, `cancelled` | `pending → approved/rejected` |

✅ Full match plus `cancelled` extension.

### Visitor Status
| Defined in code | SCOPE.md §8 Expectation |
|-----------------|------------------------|
| No `VISITOR_STATUS` constants in `constants.ts` | `pre_approved/arrived/checked_in → checked_out` |

**Gap:** Visitor status constants are entirely absent from `src/lib/constants.ts`. The `visitors` table presumably has a status column but there is no centralized status machine defined for the UI.

### Panic Alert Status
| Defined in `usePanicAlertHistory.ts` | SCOPE.md Expectation |
|--------------------------------------|---------------------|
| `active`, `acknowledged`, `resolved` | `active → acknowledged → resolved` |

✅ Full match. `resolveAlert()` mutation exists. The `acknowledged` intermediate state is present.

### Status Constants vs DB ENUMs
- Service Request: constants use `on_hold` — DB likely has `on_hold` ENUM value but `closed` is missing from both.
- Visitor: no constants defined at all.
- Panic Alert: `acknowledged` status likely not in original SCOPE §14.16 schema but has been added correctly.

---

## Detailed Bug/Gap Register

### CRITICAL Issues

🔴 CRITICAL
File: `components/dashboards/` (missing files)
Issue: `ACTechnicianDashboard.tsx` and `PestControlTechnicianDashboard.tsx` are claimed ✅ FULL in PHASES.md but do not exist in the main branch. Both roles fall through to `ServiceBoyDashboard`, which shows generic technician data without AC certifications panel, PPE checklist, or pest-specific chemical views.
Fix: Merge or re-implement from `.worktrees/production-readiness-fix/components/dashboards/ACTechnicianDashboard.tsx` into main.

---

🔴 CRITICAL
File: `app/(dashboard)/hrms/incidents/` (missing page)
Issue: PHASES.md lists `/hrms/incidents` as ✅ FULL ("Linked to behavior tickets") but the directory exists without a `page.tsx` file. Any navigation to `/hrms/incidents` will 404.
Fix: Create `app/(dashboard)/hrms/incidents/page.tsx` that wraps or redirects to `/tickets/behavior`.

---

🔴 CRITICAL
File: `app/(dashboard)/settings/` (missing sub-pages)
Issue: `AppSidebar.tsx` navigation array declares routes `/settings/permissions`, `/settings/notifications`, and `/settings/branding` as sidebar children. These pages do not exist. When `SETTINGS_MODULE` feature flag is enabled, clicking these nav items causes 404.
Fix: Either create placeholder pages for these routes, or remove them from the sidebar navigation array until implemented.

---

### HIGH Issues

🟠 HIGH
File: `src/lib/notifications.ts` + all domain hooks
Issue: 23 of 28 SCOPE.md notification triggers (#1–13, #18, #20, #22–25, #27–28) are not implemented. Notification helper functions exist (`sendLeaveApprovalNotification`, `sendReorderAlertNotification`, etc.) but are never called from hooks. The `notifications` table exists but is only populated by 5 triggers.
Fix: Wire each helper into the corresponding hook mutation: e.g., call `sendLeaveApprovalNotification()` in `useLeaveApplications.ts` approve/reject action; call `sendReorderAlertNotification()` in `useReorderAlerts.ts` on low stock detection.

---

🟠 HIGH
File: `components/dashboards/GuardLiveMap.tsx` (line ~57)
Issue: Guard live location map uses CSS dot simulation. Comment in code explicitly states: "In a real app, we'd use Leaflet or Google Maps here." Supervisors and Society Managers cannot actually see guard positions on a real map.
Fix: Integrate a map provider (Leaflet via `react-leaflet`, or a free tile provider) to render actual GPS coordinates as map markers.

---

🟠 HIGH
File: `hooks/usePatrolLogs.ts`
Issue: Hook is read-only — fetches from `guard_patrol_logs` table but provides no `createPatrolLog` mutation. No UI form exists for a guard to submit a patrol log from `/guard` or `/test-guard`.
Fix: Add `createPatrolLog(params)` mutation to the hook and add a "Log Patrol" button/form to the guard interface.

---

🟠 HIGH
File: SCOPE.md §11.1 — Super Admin screens
Issue: Super Admin has no dedicated platform-level screens. The `system_config` table exists (for guard inactivity threshold) but has no admin UI. No platform dashboard, no admin management, no audit logs screen.
Fix: Create `/settings/platform` and `/settings/audit-logs` pages; restrict to `super_admin` role; wire to `system_config` table.

---

🟠 HIGH
File: SCOPE.md §11.6 — Storekeeper Stock Issue
Issue: No "Stock Issue" screen or workflow exists for the Storekeeper to log items/parts issued to technicians or departments. SCOPE.md §11.6 explicitly requires this screen. No route, no hook (`useInventory` has no issue mutation), no UI.
Fix: Add `issueStock(params)` to `useInventory` hook; create `/inventory/issue` page for storekeeper role.

---

🟠 HIGH
File: SCOPE.md §11.3 — Company MD Approval Queue
Issue: Company MD has no "Approval Queue" for high-value or escalated requests requiring MD sign-off. `MDDashboard` shows KPIs but no actionable approval list.
Fix: Add an approval queue section to `MDDashboard` or create `/approvals` page filtered to escalated/high-value requests.

---

🟠 HIGH
File: `components/dialogs/ServiceDeliveryNoteDialog.tsx`
Issue: Dialog creates a `service_delivery_notes` DB record but provides no way to download or print the SDN as a PDF. SCOPE.md §5.4 implies a physical delivery note document is required.
Fix: Add jsPDF generation to `ServiceDeliveryNoteDialog` after successful creation, auto-triggering a PDF download with personnel details.

---

🟠 HIGH
File: `hooks/useShortageNotes.ts` — Rule 5
Issue: Shortage notes are created (manual or auto-calculated from GRN) but no notification is sent to the supplier on creation. SCOPE.md §16 Rule 5 requires "Shortage Note auto-dispatch to supplier after GRN short-receipt."
Fix: In `useShortageNotes.ts` `createShortageNote()`, after successful insert, call `sendNotification()` targeting the supplier's user account.

---

🟠 HIGH
File: `app/(dashboard)/assets/qr-codes/page.tsx` — QR Scanning
Issue: QR generation exists via `QrBatchGenerator`. QR scanning for asset check-in/check-out (listed in CONTEXT.md tech stack as `html5-qrcode`) is not available in main branch. The `QR_CODE_CONFIG.SCAN_PATH` constant points to a `/scan` route that does not exist.
Fix: Create `/assets/qr-scan` page using `html5-qrcode` scanner; implement check-in/out mutation in `useAssets` hook.

---

🟠 HIGH
File: SCOPE.md §11.8 — Buyer Profile & SCOPE.md §11.9 — Supplier Profile
Issue: Buyer has no "Profile & Account Settings" page (`/buyer/profile`). Supplier has no "Profile" page (`/supplier/profile`). Both are listed in SCOPE.md §11.8 and §11.9 respectively.
Fix: Create `/buyer/profile` and `/supplier/profile` pages with basic editable profile fields.

---

### MEDIUM Issues

🟡 MEDIUM
File: `src/lib/constants.ts`
Issue: `SERVICE_REQUEST_STATUS` does not include `closed`. The transition from `completed` → `closed` (after manager review, per SCOPE.md §14.19) cannot be performed. DB column may also lack this ENUM value.
Fix: Add `CLOSED: 'closed'` to `SERVICE_REQUEST_STATUS` in constants.ts; verify DB ENUM includes `closed`; add "Close" action button in service request detail page.

---

🟡 MEDIUM
File: `app/(dashboard)/inventory/indents/` (missing list page)
Issue: No `/inventory/indents` index list page exists — only `/inventory/indents/create` (the creation + management page) and `/inventory/indents/verification`. The admin cannot see a flat list of all indents via the sidebar "Requests & Approvals" link which goes to `/inventory/indents/create`.
Fix: Either rename the route or ensure `/inventory/indents/create` covers the full list — currently it does cover both creation and list, so the sidebar label "Requests & Approvals" pointing to `/inventory/indents/create` is functionally acceptable but unintuitive.

---

🟡 MEDIUM
File: `src/lib/constants.ts` — Visitor Status
Issue: `VISITOR_STATUS` constants are entirely absent. The visitors table likely has status values (`pre_approved`, `arrived`, `checked_in`, `checked_out`) but no centralized constants.ts definition exists for visitor state machine. UI inconsistencies may arise.
Fix: Add `VISITOR_STATUS`, `VISITOR_STATUS_LABELS`, `VISITOR_STATUS_COLORS` to `constants.ts`.

---

🟡 MEDIUM
File: `app/api/waitlist/route.ts`
Issue: Waitlist endpoint inserts to Supabase and returns a success message but sends no confirmation email to the submitter. This is standard practice for waitlist flows and creates poor UX.
Fix: After successful insert, invoke Supabase Edge Function or a third-party email API to send a confirmation email to the registered address.

---

🟡 MEDIUM
File: `src/lib/featureFlags.ts` — Reports Module gating
Issue: All four report pages (`/reports/attendance`, `/reports/financial`, `/reports/services`, `/reports/inventory`) are gated behind the `REPORTS_MODULE` feature flag which defaults to `false`. SCOPE.md §11.3 (MD) and §11.5 (Account) both require "Reports" access. A production deployment without this env var will hide all reports.
Fix: Remove `REPORTS_MODULE` from `ROUTE_FLAG_MAP` (make reports always visible) OR ensure deployment documentation clearly states this env var must be set.

---

🟡 MEDIUM
File: `app/(dashboard)/hrms/payroll/page.tsx`
Issue: Payroll page has `downloadPayslipPdf()` hooked up correctly. However, there is no mechanism for individual employees (service_boy, guard, technician roles) to view or download their own payslips. The payroll page is admin/account only per ROLE_ACCESS.
Fix: Create an employee-facing payslip view accessible via `/hrms/payroll/my-payslips` or similar, gated to employee roles.

---

🟡 MEDIUM
File: `hooks/usePanicAlert.ts`
Issue: `triggerPanic()` does not insert a record into the `notifications` table for the Society Manager — it only calls `sendPanicAlertNotification()` (FCM/SMS). If FCM is not configured, managers would receive no in-app notification bell update.
Fix: In `usePanicAlert.ts` after inserting the panic alert, also insert a row into `notifications` for each supervisor/manager.

---

🟡 MEDIUM
File: SCOPE.md §16 Rule 4 — Bad Material Block
Issue: Quality status `damaged`, `rejected` etc. exist in `useGRN.ts`. However, no code enforces that items with bad quality status are blocked from entering inventory. `useGRN.ts` does not update `stock_levels` conditionally — this may be handled at the DB level via RLS/trigger but is not verifiable from the codebase alone.
Fix: Verify the `material_receipts` → `stock_levels` update path. If done via DB trigger, document it. If not, add conditional inventory update logic in `useGRN.ts`.

---

🟡 MEDIUM
File: `app/(dashboard)/hrms/incidents/` directory
Issue: The directory `hrms/incidents` exists in the filesystem but contains no `page.tsx`. This causes a silent 404 at `/hrms/incidents`. PHASES.md marks it ✅ FULL as "Linked to behavior tickets."
Fix: Create `app/(dashboard)/hrms/incidents/page.tsx` that either redirects to `/tickets/behavior` or renders a filtered view of behavior tickets.

---

### LOW Issues

🟢 LOW
File: `hooks/useLeaveApplications.ts`
Issue: `sendLeaveApprovalNotification()` helper exists in `notifications.ts` but is never called in the leave approval/rejection flow. Notification trigger #19 is partially addressed by the helper existing, but no actual notification is sent.
Fix: Import and call `sendLeaveApprovalNotification()` inside the `approveLeave()` and `rejectLeave()` mutations in `useLeaveApplications.ts`.

---

🟢 LOW
File: `app/(dashboard)/guard/page.tsx`
Issue: The `/guard` page (new Guard Station) exists but is not linked from the guard's ROLE_ACCESS in `roles.ts`. `security_guard` role has `/guard` in ROLE_ACCESS (line 34) — this is correct. However, the old `/test-guard` route also still exists. There are now two overlapping guard interfaces.
Fix: Deprecate `/test-guard` for guards and redirect to `/guard`, OR keep both for backward compatibility and document which is canonical.

---

🟢 LOW
File: `AppSidebar.tsx` (line ~187)
Issue: `/* Temporarily hidden */ { title: "Guest Invitation", href: "/society/my-flat?action=invite" }` — the `?action=invite` query param is not handled in `/society/my-flat/page.tsx` — the page renders the same regardless.
Fix: Either implement the `action=invite` behavior in `my-flat/page.tsx` to auto-open an invitation dialog, or remove the hidden nav item.

---

🟢 LOW
File: `src/lib/constants.ts` — Job Session Status
Issue: `JOB_SESSION_STATUS` defines `started`, `paused`, `completed`, `cancelled`. SCOPE.md §14.19 expects `open` as an initial state before a technician starts work. The `open` state is in the service_request entity but not the job_session entity.
Fix: Add `OPEN: 'open'` to `JOB_SESSION_STATUS` if the DB supports it, or document the intentional omission.

---

🟢 LOW
File: `hooks/usePatrolLogs.ts`
Issue: Patrol log data model joins to `guard → employee` but `checkpoint` field in the interface is not populated from the DB — it's derived from `guard.employee.first_name + last_name`, with the actual checkpoint location hardcoded as `"Main Gate"` in the fetch transform.
Fix: Include actual checkpoint/location data from the `guard_patrol_logs` table join in the query.

---

## Feature Completeness Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| AC Technician dedicated dashboard | ❌ | Missing in main |
| Pest Control Technician dedicated dashboard | ❌ | Missing in main |
| Super Admin platform screens | ❌ | Not implemented |
| Stock Issue workflow (Storekeeper) | ❌ | Not implemented |
| MD Approval Queue | ❌ | Not implemented |
| SDN PDF download | ❌ | Hook only, no PDF |
| Shortage Note auto-notification (Rule 5) | ❌ | Not triggered |
| QR asset check-in/check-out scanning | ❌ | Only in worktree |
| Buyer profile/settings page | ❌ | Route missing |
| Supplier profile page | ❌ | Route missing |
| Guard live map (real provider) | ⚠️ | CSS simulation |
| Patrol log creation by guard | ❌ | Hook read-only |
| Feedback gate enforcement (Rule 6) | ⚠️ | UI only, no server gate |
| Notification bell triggers (23 of 28) | ❌ | Only 5 wired |
| Settings sub-pages (/permissions, /notifications, /branding) | ❌ | 404 when flag enabled |
| Waitlist confirmation email | ❌ | Not implemented |
| Incidents page (/hrms/incidents) | ❌ | Missing page.tsx |
| Service Request 'closed' status | ⚠️ | Missing from constants |
| Employee payslip self-service view | ❌ | Admin-only page |
| Visitor status constants | ❌ | Not in constants.ts |
| Reports module hidden by default | ⚠️ | Feature flag off |
| Payroll → notification to employee | ❌ | Helper exists, not called |
| Leave → notification to employee | ❌ | Helper exists, not called |
| Service completion → notification | ❌ | Helper exists, not called |
| Bad Material Block (Rule 4) | ⚠️ | May be DB-level, unverifiable from code |
| Buyer Order Request → Admin notification | ❌ | Not triggered |
| Indent forwarded → Supplier notification | ❌ | Not triggered |
| PO issued → Supplier notification | ❌ | Not triggered |
| Payslip generated → Employee notification | ❌ | Not triggered |
| Supplier bill submitted → Admin notification | ❌ | Not triggered |
| Deployment confirmed → Buyer/Admin notification | ❌ | Not triggered |
