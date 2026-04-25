# FacilityPro — Implementation Phases & Module Status

> **Last Updated:** 2026-04-25 (Enhanced admin creation flow with temporary password generation and structured invitation UI for superadmins; cleanup of unused clipboard logic on admin management page)

> **Purpose:** This file is the single source of truth for what is built, what's partially built, and what's missing.
> Paste the relevant section when starting a new AI session.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ FULL | UI + Backend + Hooks fully connected. Data flows from Supabase → UI |
| 🟡 PARTIAL | UI exists but some data is mocked/hardcoded OR missing features from PRD |
| 🔵 UI-ONLY | Page exists with layout but uses hardcoded mock data (no hooks) |
| 🔴 NOT BUILT | Feature exists in PRD but has no page or code yet |
| ⚡ BACKEND-ONLY | Hook/DB/edge function exists but no dedicated page |

---

## Phase A — Foundation & Master Data ✅

All master data tables, auth, and app shell are complete.

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Role Master | `/company/roles` | ✅ FULL | `useRoles` hook, CRUD |
| Designation Master | `/company/designations` | ✅ FULL | CRUD with dialog |
| Employee Master | `/company/employees` | ✅ FULL | `useEmployees` hook, search, filter |
| User Master | `/company/users` | ✅ FULL | Supabase auth integration |
| Company Locations | `/company/locations` | ✅ FULL | GPS coords for geo-fencing |
| Product Categories | `/inventory/categories` | ✅ FULL | `useProducts` hook |
| Product Subcategories | `/inventory/subcategories` | ✅ FULL | Nested under categories |
| Product Master | `/inventory/products` | ✅ FULL | Full CRUD, search, rate display |
| Supplier Master | `/inventory/suppliers` | ✅ FULL | `useSuppliers` hook (17KB) |
| Supplier Wise Products | `/inventory/supplier-products` | ✅ FULL | `useSupplierProducts` hook |
| Supplier Wise Product Rate | `/inventory/supplier-rates` | ✅ FULL | `useSupplierRates` + Realtime subscription |
| Sale Product Rate | `/inventory/sales-rates` | ✅ FULL | `useSaleProductRates` + Realtime subscription |
| Daily Checklist Master | `/services/masters/checklists` | ✅ FULL | `useGuardChecklist` hook |
| Vendor Wise Services | `/services/masters/vendor-services` | ✅ FULL | `useVendorWiseServices` hook |
| Work Master | `/services/masters/work-master` | ✅ FULL | `useWorkMaster` hook |
| Services Wise Work Master | `/services/masters/service-tasks` | ✅ FULL | Mapped to services |
| Leave Type Master | — | ✅ FULL | Managed via `useLeaveApplications` |
| Holiday Master | `/hrms/holidays` | ✅ FULL | `useHolidays` hook |
| Company Events | `/hrms/events` | ✅ FULL | `useCompanyEvents` hook |
| App Shell (Layout, Sidebar, Theme) | `/` | ✅ FULL | Role-based sidebar, dark mode |

---

## Phase B — Core Workflows ✅

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Buyer Order Request | `/buyer/requests/new` | ✅ FULL | `useBuyerRequests` hook, material requests plus service deployment step with service type, grade/role, headcount, shift, start date, duration, and site location |
| Buyer Request List | `/buyer/requests` | ✅ FULL | DataTable with status badges. "Leave Feedback" button for `feedback_pending` rows → `BuyerFeedbackDialog` |
| Buyer Request Detail | `/buyer/requests/[id]` | ✅ FULL | Full lifecycle view |
| Admin Request Review | `/inventory/indents` | ✅ FULL | Accept/Pending/Reject actions |
| Indent Generation | `/inventory/indents` | ✅ FULL | `useIndents` hook (24KB) |
| Service Indent Generation | `/admin/service-indents` | ✅ FULL | Accepted service requests can now be matched to a supplier from `vendor_wise_services`, converted into an indent, and linked back to the originating buyer request |
| Indent Forward to Supplier | Via indent actions | ✅ FULL | Status transition workflow |
| Purchase Orders | `/inventory/purchase-orders` | ✅ FULL | `usePurchaseOrders` hook (40KB), full lifecycle |
| GRN (Goods Received Notes) | `/inventory/grn` | ✅ FULL | `useGRN` hook (32KB), quality/quantity checks |
| Supplier Bills | `/finance/supplier-bills` | ✅ FULL | `useSupplierBills` hook (34KB), approval workflow, real bill number generation via `generate_bill_number()` RPC, PO deduplication (eligible POs exclude those already billed), document upload to `bill-documents` storage |
| Sale Bills / Buyer Invoices | `/finance/buyer-invoices` | ✅ FULL | `useBuyerInvoices` hook (30KB) |
| Reconciliation | `/finance/reconciliation` | ✅ FULL | `useReconciliation` hook (48KB), PO↔GRN↔Bill matching |
| Supplier Portal Dashboard | `/supplier` | ✅ FULL | `useSupplierPortal` hook, real data, quick path into supplier self-service profile |
| Supplier Indent View | `/supplier/indents` | ✅ FULL | Accept/reject workflow for both material and service indents. Service rows render grade, headcount, shift, start date, and site location |
| Supplier PO View | `/supplier/purchase-orders` | ✅ FULL | Acknowledge/dispatch actions |
| Supplier Bills | `/supplier/bills` | ✅ FULL | Submit/track bills, real bill number generation, document upload to storage |
| Supplier Service Orders | `/supplier/service-orders` | ✅ FULL | `useSupplierPortal` hook. Supplier sees only own SPOs, can acknowledge sent SPOs, upload delivery notes, and read deployment acknowledgments |
| Supplier Profile | `/supplier/profile` | ✅ FULL | Self-service supplier details, banking, rates, availability, payment terms, and credit limit via `useSupplierPortal` |
| Warehouses | `/inventory/warehouses` | ✅ FULL | `useWarehouses` hook |
| Return To Vendor (RTV) | `/tickets/returns` | ✅ FULL | `useRTVTickets` hook, full lifecycle |

---

## Phase C — Society & Security ✅

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Visitor Management | `/society/visitors` | ✅ FULL | `useVisitors` hook (19KB), photo capture, search. 4 category tabs: In Building, Daily Helpers, Vendors & Contractors, Family Directory |
| Guard Visitor Logging | `/test-guard` | ✅ FULL | `useResidentLookup` + `VisitorRegistrationDialog` |
| Panic Alert System | `/society/panic-alerts` | ✅ FULL | `usePanicAlert` + Realtime subscription |
| Panic Alert History | Via panic alerts page | ✅ FULL | `usePanicAlertHistory` (10KB) |
| Daily Checklists (Guard) | `/society/checklists` | ✅ FULL | `useGuardChecklist` hook (11KB) |
| Geo-fencing Attendance | Via HRMS attendance | ✅ FULL | Haversine distance check, `useAttendance` (19KB) |
| Inactivity Alerts | Edge functions | ✅ FULL | `check-guard-inactivity` + `inactivity-monitor` edge functions |
| Emergency Contacts | `/society/emergency` | ✅ FULL | `useEmergencyContacts` hook |
| Family/Resident Directory | `/society/residents` | ✅ FULL | Listing now reads from the privacy-safe `resident_directory` view instead of raw `residents`; existing unlinked resident rows can be provisioned via `/api/residents/unlinked` |
| Resident Dashboard | `/test-resident` | ✅ FULL | `useResidentProfile` resolves strictly through `residents.auth_user_id = auth.uid()`; dead email fallback removed |
| Guard Dashboard Widget | `/dashboard` (guard role) | ✅ FULL | `GuardDashboard` component (51KB) |
| Society Manager Dashboard | `/dashboard` (manager role) | ✅ FULL | `SocietyManagerDashboard` component (26KB) |

---

## Phase D — Services & HRMS ✅

### Services

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| AC Services Dashboard | `/services/ac` | ✅ FULL | `useServiceRequests` + `useTechnicians` + `useInventory`, DataTable, photo upload |
| Pest Control Dashboard | `/services/pest-control` | ✅ FULL | `usePestControlInventory` (expiry_date, batch_number, expiringChemicals). Expiry warning banner for chemicals expiring within 30 days. "Spill Kits" tab with `useSpillKits` |
| Plantation Dashboard | `/services/plantation` | ✅ FULL | `usePlantation` for tasks/zones. Soil health, greenery density, and seasonal planner dynamically connected. |
| Printing & Advertising | `/services/printing` | ✅ FULL | `usePrintingMaster` for ad-spaces, `useServiceRequests`, `IDPrintingModule` for ID cards. "Book Space" button per available ad space → `AdBookingDialog` via `useAdBookings` |
| Security Command Center | `/services/security` | ✅ FULL | `useSecurityGuards` hook (12KB), grade filter, GPS tracking, live guard list |
| Service Boy Interface | `/service-boy` | ✅ FULL | `useJobSessions` + `useJobSessionSubscription`, GPS, before/after photos |
| Service Requests (Admin) | `/service-requests` | ✅ FULL | List + Board + Detail views, `useServiceRequests` (14KB) |

### HRMS

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Attendance | `/hrms/attendance` | ✅ FULL | `useAttendance` (19KB), selfie, geo-fence check, and hook-backed history/admin attendance reads. "Shift Compliance" tab with per-employee late minutes vs shift start |
| Employee Documents | `/hrms/documents` | ✅ FULL | `useEmployeeDocuments` (21KB), Aadhar/PAN/PSARA uploads |
| Employee Profiles | `/hrms/profiles` | ✅ FULL | `useEmployeeProfile` hook |
| Specialized Profiles | `/hrms/specialized-profiles` | ✅ FULL | For technicians, guards etc. |
| Shifts | `/hrms/shifts` | ✅ FULL | `useShifts` hook (9KB) |
| Leave Management | `/hrms/leave` | ✅ FULL | `useLeaveApplications` (12KB), apply/approve/reject |
| Payroll | `/hrms/payroll` | ✅ FULL | `usePayroll` (29KB), authoritative `generate_payroll_cycle()` RPC for payslip generation, `log_date`-backed attendance summaries |
| Recruitment | `/hrms/recruitment` | ✅ FULL | `useCandidates` (20KB), pipeline (Applicant→Interview→BGV→Hired). BGV panel with `useBackgroundVerifications` for candidates at `background_check` stage (police, address, education, employment tracking) |
| Holidays | `/hrms/holidays` | ✅ FULL | `useHolidays` hook |
| Events | `/hrms/events` | ✅ FULL | `useCompanyEvents` hook |
| Incidents | `/hrms/incidents` | ✅ FULL | Linked to behavior tickets |

---

## Phase E — Financial & Audit ✅

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Reconciliation Engine | `/finance/reconciliation` | ✅ FULL | 48KB hook, PO↔GRN↔Bill matching |
| Supplier Bills Lifecycle | `/finance/supplier-bills` | ✅ FULL | Approval/rejection workflow |
| Buyer Invoices | `/finance/buyer-invoices` | ✅ FULL | Invoice generation, payment tracking, and automatic society filtering for buyers |
| Buyer Billing (Sale Bills) | `/finance/sale-bills` | ✅ FULL | Admin generation workflow, request linkage, and payment management |
| Service Purchase Orders (SPO) | `/inventory/service-purchase-orders` | ✅ FULL | `useServicePurchaseOrders` hook |
| Financial Closure | `/finance/closure` | ✅ FULL | `useFinancialClosure` hook |
| Compliance Tracking | `/finance/compliance` | ✅ FULL | `useCompliance` hook, doc expiry alerts |
| Performance Audit | `/finance/performance-audit` | ✅ FULL | `usePerformanceAudit` hook |
| Budgeting | `/finance/budgeting` | ✅ FULL | `useBudgets` hook |
| Ledger | `/finance/ledger` | ✅ FULL | Financial overview |
| Payment Tracking | `/finance/payments` | ✅ FULL | Payment status management |
| Delivery Dashboard | `/test-delivery` | ✅ FULL | `DeliveryDashboard` component, material arrival with photo/vehicle log |

---

## Phase 4 — UX Polish ✅

- All ghost buttons wired to functional dialogs (Schedule Visit, New Job Order, Manual Adjustment, Summary Reports)
- All "Coming Soon" placeholders replaced (Family Directory, ID Printing)
- All hardcoded mock data replaced with real DB connections (**except items noted below**)
- Plantation inventory connected to `stock_levels` view
- Real geo-fencing with haversine distance calculation

---

## Dashboards (14 Role-Specific)


All located in `components/dashboards/`. Accessible via `/dashboard` with admin role switcher.

| Dashboard | Component | Status | Notes |
|-----------|-----------|--------|-------|
| Admin | `AdminView` (inline in page) | ✅ FULL | Real stats from `useMDStats`, `useServiceRequests`, `useReorderAlerts`. Revenue chart uses Recharts AreaChart with `mdStats.monthlyTrends` — fully connected. |
| Company MD | `MDDashboard.tsx` | ✅ FULL | All cards connected: YTD revenue from `useMDStats`, Growth Forecast AreaChart, Financial Metrics, PSARA Compliance %. No ComingSoon blocks remaining |
| Company HOD | `HODDashboard.tsx` | ✅ FULL | `useHODStats` hook |
| Account | `AccountsDashboard.tsx` | ✅ FULL | All hooks connected: `useSupplierBills`, `useBuyerInvoices`, `useReconciliation`, `useCompliance`. KPI cards, cash flow chart, quick actions — all real data |
| Delivery Boy | `DeliveryDashboard.tsx` | ✅ FULL | Material arrival logging with photo enforcement |
| Buyer | `BuyerDashboard.tsx` (widget) | ✅ FULL | KPI cards (Total/Pending/Active/Completed), Invoice Summary, Recent Requests — `useBuyerRequests` + `useBuyerInvoices`. Note: also the actual Buyer *page* (`/buyer`) is ✅ FULL |
| Supplier | `SupplierDashboard.tsx` (widget) | ✅ FULL | KPI cards (Open Indents/Active POs/Total Billed), Recent POs, Billing Summary — `useSupplierPortal`. Note: also the actual Supplier *pages* (`/supplier/*`) are ✅ FULL |
| Security Guard | `GuardDashboard.tsx` | ✅ FULL | 51KB — checklist, panic, attendance, GPS |
| Security Supervisor | `SecuritySupervisorDashboard.tsx` | ✅ FULL | `useSupervisorStats` hook |
| Society Manager | `SocietyManagerDashboard.tsx` | ✅ FULL | 26KB — visitor stats, checklist status, panic logs, live guard map. Imports `ComingSoonWidget` but doesn't render it |
| Storekeeper | `StorekeeperDashboard.tsx` | ✅ FULL | KPIs for GRNs, stock alerts, RTV, shortage notes |
| Site Supervisor | `SiteSupervisorDashboard.tsx` | ✅ FULL | KPIs for deployments, dispatches, incidents, attendance |
| Service Boy | `ServiceBoyDashboard.tsx` | ✅ FULL | Job sessions, GPS, photo evidence, stock alerts. Imports `ComingSoonWidget` but doesn't render it |
| AC Technician | `ACTechnicianDashboard.tsx` | ✅ FULL | Certifications panel, AC service PPE checklist, AC service requests list |
| Pest Control Technician | `PestControlTechnicianDashboard.tsx` | ✅ FULL | Chemical expiry warning banner, mandatory PPE checklist, pest control service requests list |

| Resident | `ResidentDashboard.tsx` | ✅ FULL | 30KB — Dynamically fetches correct logged-in user's resident record |

---

## Buyer Portal (Dedicated at `/buyer`)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Buyer Dashboard | `/buyer` (page.tsx) | ✅ FULL | Fully dynamic. "Ongoing Services" and "Ending Soon" use computed boundaries. Active services list uses actual `headcount`, `shift`, and `duration_months`. Buttons are wired with base interaction. |
| Buyer Requests List | `/buyer/requests` | ✅ FULL | DataTable with all statuses. "Leave Feedback" button for `feedback_pending` rows |
| Buyer New Request | `/buyer/requests/new` | ✅ FULL | Multi-step request creation form for material requests and service deployments |
| Buyer Request Detail | `/buyer/requests/[id]` | ✅ FULL | Full lifecycle view |
| Buyer Invoices | `/buyer/invoices` | ✅ FULL | `useBuyerInvoices` hook, payment tracking |

---

## Tickets System

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Behavior Tickets | `/tickets/behavior` | ✅ FULL | `useBehaviorTickets` + `useEmployees` hooks, create/resolve dialogs, CRUD |
| Quality Tickets | `/tickets/quality` | ✅ FULL | Derived from `useGRN` — scans GRN items for quality issues, real data. "Shortage Notes" tab with `useShortageNotes` (auto-calculates expected_qty - received_qty per GRN line) |
| Return to Vendor (RTV) | `/tickets/returns` | ✅ FULL | `useRTVTickets` hook, `rtv_tickets` Supabase table, Realtime subscription, CRUD (create + status update), stats computed from live data |

---

## Assets Module

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Asset List | `/assets` | ✅ FULL | `useAssets` hook |
| Asset Detail | `/assets/[id]` | ✅ FULL | Detail view with history |
| Asset Categories | `/assets/categories` | ✅ FULL | `useAssetCategories` hook |
| Asset Maintenance | `/assets/maintenance` | ✅ FULL | `useMaintenanceSchedules` hook. Due schedules can now create linked service requests, and `markAsPerformed` only advances after a completed linked request |
| QR Codes | `/assets/qr-codes` | ✅ FULL | `useQrCodes` hook, batch generation routed through the hook layer, `/scan/[id]` records scans and resolves linked assets |

---

## Reports Module

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Reports Hub | `/reports` | ✅ FULL | Links to sub-reports |
| Attendance Reports | `/reports/attendance` | ✅ FULL | `useAttendance` data |
| Financial Reports | `/reports/financial` | ✅ FULL | KPI cards (YTD Collected, Outstanding AR, Profit Retention, Net Margin) + PieChart (Revenue Distribution) + AreaChart (Monthly Profitability) via `useAnalyticsData` |
| Inventory Reports | `/reports/inventory` | ✅ FULL | Stock level analytics |
| Service Reports | `/reports/services` | ✅ FULL | Service request analytics |

---

## Platform Features

| Feature | Status | Notes |
|---------|--------|-------|
| Notification Bell | ✅ FULL | `useNotifications` hook ✅, `NotificationBell.tsx` component ✅ (badge, dropdown, mark-all-read, Realtime). Wired into `TopNav.tsx` line 195 |
| Admin Invitation Flow | ✅ FULL | Temporary password generation and structured invitation UI for superadmins. Lives in `/settings/admins` |
| Guard Mobile PWA | ✅ FULL | `public/manifest.json` ✅, `<link rel="manifest">` in layout ✅. `next-pwa` installed, `withPWA` in `next.config.ts`, service worker generated on prod build |
| Auto-Punch-Out Cron | ✅ FULL | `auto_punch_out_idle_employees()` pg_cron job, forward-fixed by `20260330000006_hr_001_hrms_audit_fixes.sql` to set `is_auto_punch_out`, `absent_breach`, `total_hours`, and idempotent scheduling |
| Chemical Expiry Cron | ✅ FULL | `detect_chemical_expiry()` pg_cron job via migration `20260316000006_chemical_expiry.sql` |

---

## ⚠️ Known Mock Data / Hardcoded Areas

No known mocked data areas remain. All dashboards, pages, and widgets use live Supabase data. (Supplier bill creation and document upload now fully implemented.)

---

## 🔴 Features in PRD — Remaining Gaps

### Active Gaps
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **Guard Mobile PWA** | ✅ FULL | `next-pwa` installed, `next.config.ts` wraps config with `withPWA` (disabled in dev, enabled in prod). Service worker auto-generated to `public/sw.js` on build. Supabase API routes use NetworkFirst caching |
| 2 | **Notification Bell in Nav** | ✅ FULL | `useNotifications` hook + `NotificationBell.tsx` component wired into `components/layout/TopNav.tsx` (line 195) |
| 3 | **Material Supply Services** | ✅ FULL | "Materials & Supplies" section added to buyer service catalog. `/buyer/requests/new?category=<slug>` auto-selects product category and pre-fills title. Products filtered by `product_categories` via `useProducts` join |
| 4 | **Resident/Tenant Push Notifications** | ✅ FULL | `sendVisitorArrivalNotification()` called in `useGuardVisitors.ts:231` on check-in. Resident approval via `approve_visitor` RPC in `useResident.ts` and `useVisitors.ts` |
| 5 | **FCM Push for Panic Alerts** | ✅ FULL | `usePanicAlert.ts` calls `sendPanicAlertNotification()` after insert, notifying all supervisors via both FCM + SMS |

### Completed This Session (2026-03-16)
All items from `previousplan.md` Sprints 1–5 completed:
- ✅ Storekeeper + Site Supervisor roles (`src/lib/auth/roles.ts` + migration)
- ✅ Service Delivery Note workflow (hook + dialog + supplier service-orders page)
- ✅ Buyer Feedback Flow (hook + dialog + buyer requests page)
- ✅ Recruitment BGV Status Tracking UI (hook + inline BGV panel)
- ✅ Chemical Expiry Alerts (migration + expiry_date/batch_number in hook + banner)
- ✅ Spill Kit Inventory (migration + `useSpillKits` hook + tab on pest control page)
- ✅ Ad-Space Booking Workflow (migration + `useAdBookings` hook + dialog + printing page)
- ✅ Shortage Notes Auto-Calculation (migration + `useShortageNotes` hook + quality tickets tab)
- ✅ Personnel Dispatch Tracking (migration + `usePersonnelDispatches` hook)
- ✅ Notification Bell component (`useNotifications` + `NotificationBell.tsx`) + wired into `TopNav.tsx` (line 195)
- ✅ AccountsDashboard real data (all ComingSoon replaced)
- ✅ MDDashboard revenue + compliance cards (all ComingSoon replaced)
- ✅ Revenue Analytics Dashboard (KPI cards + PieChart + AreaChart)
- ✅ Shift-Based Attendance Cross-Validation ("Shift Compliance" tab)
- ✅ Auto-Punch-Out cron (migration applied)
- ✅ Visitor category separation (4-tab strip)
- ✅ Guard Mobile PWA manifest

---

## Edge Functions (8 Deployed)

| Function | Purpose | Status |
|----------|---------|--------|
| `check-checklist` | Verify daily checklist completion | ✅ Active |
| `check-document-expiry` | Compliance doc expiry alerts | ✅ Active |
| `check-guard-inactivity` | GPS-based static guard detection | ✅ Active |
| `check-inactivity` | General inactivity monitoring | ✅ Active |
| `check-incomplete-checklists` | Flag incomplete daily checklists | ✅ Active |
| `checklist-reminders` | Send reminder if checklist not filled by 9AM | ✅ Active |
| `inactivity-monitor` | Continuous guard monitoring | ✅ Active |
| `send-notification` | SMS via MSG91 + push via FCM | ✅ Active |

---

## Migrations History

| Migration File | Purpose |
|----------------|---------|
| `20260209_link_resident_auth.sql` | Link resident records to Supabase auth users |
| `20260211_*.sql` (×3) | Payroll calc, PO transitions, reconciliation, visitor approval functions |
| `20260315120000_add_rtv_tickets.sql` | RTV tickets table + Realtime |
| `20260315123000_add_rtv_ticket_number_seq.sql` | Server-side RTV number sequence |
| `20260315233000_fix_mocked_dashboards.sql` | headcount/shift/duration_months on requests; soil_health/greenery_density on horticulture_zones; horticulture_seasonal_plans table |
| `20260316000001_add_missing_roles.sql` | Insert storekeeper + site_supervisor into roles table |
| `20260316000002_auto_punch_out.sql` | auto_punch_out_idle_employees() pg_cron @ 1AM daily |
| `20260316000003_service_delivery_notes.sql` | service_delivery_notes table + RLS |
| `20260316000004_buyer_feedback.sql` | buyer_feedback table + RLS |
| `20260316000005_background_verifications.sql` | background_verifications table + RLS |
| `20260316000006_chemical_expiry.sql` | expiry_date + batch_number on pest_control_chemicals; detect_chemical_expiry() cron |
| `20260316000007_spill_kits.sql` | pest_control_spill_kits table |
| `20260316000008_ad_bookings.sql` | printing_ad_bookings table |
| `20260316000009_shortage_notes.sql` | shortage_notes + shortage_note_items tables |
| `20260316000010_personnel_dispatches.sql` | personnel_dispatches table |
| `20260316000010_service_acknowledgments.sql` | service_acknowledgments table (SPO headcount/grade verification) + RLS |
| `20260316000011_notifications.sql` | notifications table + RLS |
| `20260316000011_system_config.sql` | system_config key-value table (guard_inactivity_threshold_minutes default 30) |
| `20260330000006_hr_001_hrms_audit_fixes.sql` | auto punch-out cron forward-fix (`pg_cron` guard, `attendance_logs.notes`, `is_auto_punch_out`, `absent_breach`, `total_hours`) |
| `20260331000001_service_deployment_indent_flow.sql` | request service deployment fields (`service_type`, `service_grade`, `start_date`, `site_location_id`) plus indent linkage fields (`service_request_id`, `supplier_id`) |

---

### Completed This Session (2026-04-25)
- ✅ Enhanced admin creation flow with temporary password generation and improved invitation UI.
- ✅ Structured invitation alert with individual copy buttons for setup link and password.
- ✅ Cleanup of unused clipboard logic on the admin management page.

### Completed This Session (2026-03-31)
- ✅ Service deployment buyer flow extended with grade/role, headcount, shift, start date, duration, and site location capture
- ✅ Admin service-indent handoff page added at `/admin/service-indents`
- ✅ `useIndents` and `useBuyerRequests` linked service requests to supplier-scoped indents
- ✅ Supplier indent portal now renders service deployment details and accepts/rejects service indents without invoking the material-only PO RPC

### Session: 2026-03-31 - SALE-BILL-001 Sale Bill Generation
- **What was done**: Built the Admin sale bill generation workflow. Added `request_id` and `paid_at` columns to `sale_bills`. Created `useSaleBills` Admin hook and `finance/sale-bills` management page.
- **Key implementation**:
  1. **Sale Bills Page** — Admin interface at `/finance/sale-bills` with a functional "Generate Bill" dialog that links to accepted requests and societies.
  2. **useSaleBills Hook** — Admin-scoped hook with `createBill` (header + items) and `markPaid` (updates `paid_at`).
  3. **Buyer RLS & Filtering** — Added a migration to fix buyer RLS on `sale_bills` and updated `useBuyerInvoices` to automatically filter by the buyer's society.
  4. **Invoice Number Sequence** — Added `sale_invoice_seq` and a trigger to auto-generate unique invoice numbers for sale bills.
- **Files modified**: `app/(dashboard)/finance/sale-bills/page.tsx`, `hooks/useSaleBills.ts`, `hooks/useBuyerInvoices.ts`, `components/layout/AppSidebar.tsx`, `supabase/migrations/20260401000008_sale_bills_enhancements.sql`, `.ai_context/PHASES.md`
- **Status**: SALE-BILL-001 complete. Admin can now generate bills and buyers can see their own invoices.

## Recent Session Handoffs

### Session: 2026-03-24 — Storekeeper & Site Supervisor Dashboards
- **What was done**: Implemented dedicated dashboards for Storekeeper and Site Supervisor roles.
- **Key implementation**:
  1. **StorekeeperDashboard** — integrated `useGRN`, `useReorderAlerts`, `useRTVTickets`, and `useShortageNotes`. Displays KPIs for pending GRNs, critical stock, and open returns.
  2. **SiteSupervisorDashboard** — integrated `useServiceRequests`, `usePersonnelDispatches`, `useBehaviorTickets`, and `useAnalyticsData("attendance")`. Displays KPIs for active deployments, today's dispatches, incidents, and attendance.
  3. **Wired into Dashboard Page** — updated `app/(dashboard)/dashboard/page.tsx` with role-based switching and admin role switcher entries for both roles.
- **Files modified**: `components/dashboards/StorekeeperDashboard.tsx`, `components/dashboards/SiteSupervisorDashboard.tsx`, `app/(dashboard)/dashboard/page.tsx`, `.ai_context/PHASES.md`
- **Status**: 14 of 14 role-specific dashboards now implemented.

### Session: 2026-03-16 — Full Context Sync
- **What was done**: Comprehensive audit and sync of all 4 AI context files. Cross-referenced every hook (91), migration (21), edge function (8), page (99), dashboard (12), and dialog (10) against what was documented.
- **Key corrections**:
  1. Added 2 missing migrations: `service_acknowledgments` (SPO headcount/grade verification) and `system_config` (configurable guard inactivity threshold).
  2. Added `ServiceAcknowledgmentDialog` to CONTEXT.md dialogs list and SCOPE.md schema.
  3. Added `CommandMenu.tsx` to layout components reference.
  4. Updated migration count from 18 → 21 across all files.
  5. Added `service_acknowledgments` and `system_config` to key tables list.
  6. Cleaned up stale "Known Mock Data" section (all entries were already resolved).
- **Files modified**: `.ai_context/PHASES.md`, `.ai_context/CONTEXT.md`, `.ai_context/SCOPE.md`, `.ai_context/CLAUDE.md`
- **Status**: All 4 context files verified accurate against codebase.

### Session: 2026-03-16 — Final Gap Closure + Context Audit
- **What was done**: Audited all 5 "Active Gaps" from PHASES.md against real code. Found 3 were already fully implemented (Notification Bell in TopNav, FCM Push for Panic Alerts via `usePanicAlert.ts`, Resident Push via `useGuardVisitors.ts`). Implemented the 2 remaining real gaps:
  1. **Guard Mobile PWA** — installed `next-pwa`, rewrote `next.config.ts` with `withPWA` wrapper, NetworkFirst caching for Supabase API routes, disabled in dev.
  2. **Material Supply Services** — rewrote `app/(dashboard)/buyer/requests/new/page.tsx` to support `?category=<slug>` URL param: derives product categories from `useProducts` join, auto-selects category, auto-fills title via `CATEGORY_TITLE_MAP`, filters product dropdown. Added "Materials & Supplies" section to `app/(dashboard)/buyer/page.tsx` service catalog with 5 procurement links.
- **Context fixes**: Corrected stale Sprint 1-5 handoff note (NotificationBell was already wired). Updated all 5 Active Gaps to ✅ FULL in this file. Updated `CLAUDE.md` Gotcha #7.
- **Files modified**: `next.config.ts`, `app/(dashboard)/buyer/page.tsx`, `app/(dashboard)/buyer/requests/new/page.tsx`, `.ai_context/PHASES.md`, `.ai_context/CLAUDE.md`
- **Status**: Zero remaining gaps. All PRD features are ✅ FULL.

### Session: 2026-03-16 — Code Structure Refactor
- **What was done**: Cleaned up all phase-based naming across the entire codebase. Moved misplaced files at root level into proper folders. Renamed all phase-coded component/type paths to domain-based names.
- **Key structural changes**:
  - Root SQL files → `supabase/scripts/`; root TS scripts → `scripts/`; planning docs → `docs/`
  - `supabase/PhaseA–E/` → `supabase/archive/`; seed files → `supabase/seeds/`
  - `components/phaseA/` → `components/emergency/`
  - `components/phaseB/` split into: `components/assets/`, `components/service-requests/`, `components/jobs/`, `components/maintenance/`, `components/qr-codes/`, `components/inventory-ops/` (PPE/Photo dialogs → `components/dialogs/`)
  - `src/types/phaseB.ts` → `src/types/operations.ts`
  - `src/types/phaseD.ts` → `src/types/supply-chain.ts`
- **Import paths updated**: 43 files across `hooks/`, `app/`, `components/` — all now use domain-based paths
- **Verified**: Zero broken references (grep scan confirmed). All 14 affected pages and all hooks resolve correctly.
- **Files modified**: 14 pages in `app/(dashboard)/`, 31 hooks in `hooks/`, 12 moved components, `CLAUDE.md`, `.ai_context/*`
- **Status**: Complete. No functional changes — purely structural.

### Session: 2026-03-16 — Sprint 1–5 Full Implementation (previousplan.md)
- **What was done**: Implemented all 20 features from the gap analysis plan. New roles (storekeeper, site_supervisor), 8 new hooks, 3 new dialogs, 11 new migrations. All dashboard ComingSoon placeholders replaced with real data in AccountsDashboard and MDDashboard. Visitor category tabs, BGV tracking, chemical expiry alerts, spill kits, ad bookings, shortage notes, personnel dispatches, notification bell component + nav wiring.
- **Files modified**: See "Migrations History" and all files under git status `M` and `??`.
- **Status**: 20 of 20 planned items complete. All gaps closed.

### Session: 2026-03-16 — Context File Accuracy Audit
- **What was done**: Audited all three AI context files (`CONTEXT.md`, `PHASES.md`, `CLAUDE.md`) against the actual codebase. Found and corrected significant discrepancies.
- **Key corrections**: Hook count updated 82→83 (with 4 missing hooks added to reference list). Dashboard widget statuses corrected — `BuyerDashboard.tsx`, `SupplierDashboard.tsx`, `AccountsDashboard.tsx` widgets were wrongly marked ✅ FULL but are 🔵 UI-ONLY (100% `ComingSoon`). `MDDashboard.tsx` was wrongly ✅ FULL but is 🟡 PARTIAL. Known Mock Data section expanded. The actual portal *pages* (`/buyer/*`, `/supplier/*`, `/finance/*`) remain correctly ✅ FULL.
- **Files modified**: `.ai_context/CONTEXT.md`, `.ai_context/PHASES.md`, `.ai_context/CLAUDE.md`
- **Status**: All context files now accurately reflect the codebase.

### Session: 2026-03-15 — Fixing Mocked Dashboards (Buyer, Plantation, Resident)
- **What was done**: Replaced hardcoded and mocked data across three key dashboards. Extended `requests` table with `headcount`, `shift`, and `duration_months`. Extended `horticulture_zones` with `soil_health` and `greenery_density`. Created `horticulture_seasonal_plans` table. Removed `MOCK_RESIDENT_ID` from the resident dashboard.
- **Key decisions**: The active services count and ending soon logic in the Buyer dashboard are now dynamically derived from actual request parameters and timestamp offsets. Plantation dashboard zone stats are accurately aggregated.
- **Files modified**: `supabase/migrations/20260315233000_fix_mocked_dashboards.sql`, `hooks/useBuyerRequests.ts`, `hooks/usePlantationOps.ts`, `app/(dashboard)/buyer/page.tsx`, `app/(dashboard)/services/plantation/page.tsx`, `app/(dashboard)/test-resident/page.tsx`, `CLAUDE.md`, `PHASES.md`.
- **Status**: The Buyer page, Plantation, and Resident dashboards are fully connected with no mock data remaining.

### Session: 2026-03-15 — RTV Backend Implementation
- **What was done**: Applied `rtv_tickets` migration to Supabase, regenerated TypeScript types, created `useRTVTickets` hook with CRUD + Realtime, rewired `/tickets/returns` page from mocked data to live Supabase data.
- **Key decisions**: RTV number generated client-side with random suffix (server-side generation ideal for production). Realtime enabled on `rtv_tickets` for live dashboard updates.
- **Files modified**: `supabase/migrations/20260315120000_add_rtv_tickets.sql`, `hooks/useRTVTickets.ts`, `app/(dashboard)/tickets/returns/page.tsx`, `src/types/operations.ts`, `src/types/supabase.ts` (regenerated), `src/lib/constants.ts`
- **Status**: RTV fully connected. No mock data remaining on this page.

### Session: 2026-03-13 — AI Context Files + Buyer Dashboard
- **What was done**: Created `.ai_context/` directory with CONTEXT.md, PHASES.md, CLAUDE.md, .cursorrules. Implemented Buyer Dashboard page.
- **Key decisions**: Buyer dashboard uses existing hooks (`useBuyerRequests`, `useBuyerInvoices`). Some metrics are mocked for demo purposes.
- **Files modified**: `.ai_context/*`, `app/(dashboard)/buyer/page.tsx`
- **Status**: Context files complete. Buyer dashboard functional but has mocked areas (see Known Mock Data section above).

### Session: 2026-03-29 - Procurement Workflow Hardening
- **What was done**: Aligned `dispatched` as a first-class PO status across admin hooks, receipt pages, and the server-side PO transition RPCs. Updated GRN completion to move linked buyer requests from `po_received` or `po_dispatched` to `material_received` once material passes receipt checks.
- **Key decisions**: Kept the change set focused on the verified breakpoints. Did not redesign the broader indent-generation or supplier-indent data-model gaps because those require a larger workflow change.
- **Files modified**: `hooks/usePurchaseOrders.ts`, `app/(dashboard)/inventory/purchase-orders/page.tsx`, `hooks/useGRN.ts`, `app/(dashboard)/inventory/grn/page.tsx`, `supabase/migrations/20260329000001_fix_procurement_po_dispatched_flow.sql`, `tests/unit/procurement-po-status-guards.test.ts`
- **Status**: The dispatch-to-receipt handoff no longer stalls on an unrecognized PO status, and accepted GRNs now expose the buyer acknowledgment step through `material_received`.

### Session: 2026-03-30 - SEC-001 Guard / Security Hardening
- **What was done**: Patched the guard/security breakpoints from the SEC-001 audit. Panic alert resolution now stores `resolved_by` as `employees.id`, `/guard` now exposes live shift status with a direct path into the attendance console, and guard clock-in refuses to proceed without a live GPS fix.
- **Database hardening**: Added `20260330000001_sec_001_guard_security_fixes.sql` to recreate the live panic-alert update policy with `WITH CHECK`, tighten `validate_clock_in_geofence()` for self-service guard inserts, realign `detect_inactive_guards()` with `gps_tracking.employee_id -> security_guards.id`, and schedule `detect_stationary_guards()` via `pg_cron`.
- **Tests updated**: Added `tests/unit/security-guard-module.contract.test.ts` and tightened `e2e/society-security-interactions.spec.ts` so panic-alert resolution must persist `resolved_by`.

### Session: 2026-03-30 - HR-001 HRMS Audit Fixes
- **What was done**: Removed the misleading client-side payroll calculator export, fixed payroll attendance summaries to use the real `log_date` column without missing RPC fallbacks, moved HRMS attendance page reads behind `useAttendance`, and verified recruitment remains wired to `background_verifications`.
- **Database hardening**: Added `20260330000006_hr_001_hrms_audit_fixes.sql` to guard `pg_cron`, add `attendance_logs.notes` if missing, and make scheduled auto punch-out persist `is_auto_punch_out`, `status = 'absent_breach'`, and `total_hours`.
- **Tests updated**: Added `tests/unit/hrms-module.contract.test.ts` to lock the attendance, payroll, BGV, and auto punch-out fixes in place.

### Session: 2026-03-30 - ASSET-001 Asset Workflow Hardening
- **What was done**: Closed the ASSET-001 split-path regressions across assets, QR, maintenance, and service execution. Batch QR generation now logs against `auth.users`, the asset list opens a real QR dialog, and `/scan/[id]` records scans and resolves the linked asset.
- **Database hardening**: Added `20260330000007_asset_001_asset_flow_fixes.sql` so `start_service_task` always opens or reuses a `job_sessions` row and `complete_service_task` always closes the session while persisting the required after-photo evidence.
- **Maintenance path**: The maintenance page now creates linked service requests from due schedules, and `markAsPerformed` only advances `last_performed_date` / `next_due_date` after a completed linked service request exists.
- **Tests updated**: Added `tests/unit/asset-module.contract.test.ts` and extended `tests/api/generate-qr-batch.contract.spec.ts`.
