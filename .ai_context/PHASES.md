# FacilityPro — Implementation Phases & Module Status

> **Last Updated:** 2026-03-15
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
| Buyer Order Request | `/buyer/requests/new` | ✅ FULL | `useBuyerRequests` hook, multi-step form |
| Buyer Request List | `/buyer/requests` | ✅ FULL | DataTable with status badges |
| Buyer Request Detail | `/buyer/requests/[id]` | ✅ FULL | Full lifecycle view |
| Admin Request Review | `/inventory/indents` | ✅ FULL | Accept/Pending/Reject actions |
| Indent Generation | `/inventory/indents` | ✅ FULL | `useIndents` hook (24KB) |
| Indent Forward to Supplier | Via indent actions | ✅ FULL | Status transition workflow |
| Purchase Orders | `/inventory/purchase-orders` | ✅ FULL | `usePurchaseOrders` hook (40KB), full lifecycle |
| GRN (Goods Received Notes) | `/inventory/grn` | ✅ FULL | `useGRN` hook (32KB), quality/quantity checks |
| Supplier Bills | `/finance/supplier-bills` | ✅ FULL | `useSupplierBills` hook (34KB), approval workflow |
| Sale Bills / Buyer Invoices | `/finance/buyer-invoices` | ✅ FULL | `useBuyerInvoices` hook (30KB) |
| Reconciliation | `/finance/reconciliation` | ✅ FULL | `useReconciliation` hook (48KB), PO↔GRN↔Bill matching |
| Supplier Portal Dashboard | `/supplier` | ✅ FULL | `useSupplierPortal` hook, real data |
| Supplier Indent View | `/supplier/indents` | ✅ FULL | Accept/reject workflow |
| Supplier PO View | `/supplier/purchase-orders` | ✅ FULL | Acknowledge/dispatch actions |
| Supplier Bills | `/supplier/bills` | ✅ FULL | Submit/track bills |
| Supplier Service Orders | `/supplier/service-orders` | ✅ FULL | `useServicePurchaseOrders` hook |
| Warehouses | `/inventory/warehouses` | ✅ FULL | `useWarehouses` hook |
| Return To Vendor (RTV) | `/tickets/returns` | ✅ FULL | `useRTVTickets` hook, full lifecycle |

---

## Phase C — Society & Security ✅

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Visitor Management | `/society/visitors` | ✅ FULL | `useVisitors` hook (19KB), photo capture, search |
| Guard Visitor Logging | `/test-guard` | ✅ FULL | `useResidentLookup` + `VisitorRegistrationDialog` |
| Panic Alert System | `/society/panic-alerts` | ✅ FULL | `usePanicAlert` + Realtime subscription |
| Panic Alert History | Via panic alerts page | ✅ FULL | `usePanicAlertHistory` (10KB) |
| Daily Checklists (Guard) | `/society/checklists` | ✅ FULL | `useGuardChecklist` hook (11KB) |
| Geo-fencing Attendance | Via HRMS attendance | ✅ FULL | Haversine distance check, `useAttendance` (19KB) |
| Inactivity Alerts | Edge functions | ✅ FULL | `check-guard-inactivity` + `inactivity-monitor` edge functions |
| Emergency Contacts | `/society/emergency` | ✅ FULL | `useEmergencyContacts` hook |
| Family/Resident Directory | `/society/residents` | ✅ FULL | `useResident` hook (9KB), flat/building lookup |
| Resident Dashboard | `/test-resident` | 🟡 PARTIAL | Uses `MOCK_RESIDENT_ID` — not dynamically fetching logged-in resident |
| Guard Dashboard Widget | `/dashboard` (guard role) | ✅ FULL | `GuardDashboard` component (51KB) |
| Society Manager Dashboard | `/dashboard` (manager role) | ✅ FULL | `SocietyManagerDashboard` component (26KB) |

---

## Phase D — Services & HRMS ✅

### Services

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| AC Services Dashboard | `/services/ac` | ✅ FULL | `useServiceRequests` + `useTechnicians` + `useInventory`, DataTable, photo upload |
| Pest Control Dashboard | `/services/pest-control` | ✅ FULL | `usePestControlInventory`, chemical stock, PPE checklists |
| Plantation Dashboard | `/services/plantation` | 🟡 PARTIAL | `usePlantationOps` for tasks/zones, but **"Soil Health 98%" and "Seasonal Planner" are hardcoded** |
| Printing & Advertising | `/services/printing` | ✅ FULL | `usePrintingMaster` for ad-spaces, `useServiceRequests`, `IDPrintingModule` for ID cards |
| Security Command Center | `/services/security` | ✅ FULL | `useSecurityGuards` hook (12KB), grade filter, GPS tracking, live guard list |
| Service Boy Interface | `/service-boy` | ✅ FULL | `useJobSessions` + `useJobSessionSubscription`, GPS, before/after photos |
| Service Requests (Admin) | `/service-requests` | ✅ FULL | List + Board + Detail views, `useServiceRequests` (14KB) |

### HRMS

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Attendance | `/hrms/attendance` | ✅ FULL | `useAttendance` (19KB), selfie, geo-fence check |
| Employee Documents | `/hrms/documents` | ✅ FULL | `useEmployeeDocuments` (21KB), Aadhar/PAN/PSARA uploads |
| Employee Profiles | `/hrms/profiles` | ✅ FULL | `useEmployeeProfile` hook |
| Specialized Profiles | `/hrms/specialized-profiles` | ✅ FULL | For technicians, guards etc. |
| Shifts | `/hrms/shifts` | ✅ FULL | `useShifts` hook (9KB) |
| Leave Management | `/hrms/leave` | ✅ FULL | `useLeaveApplications` (12KB), apply/approve/reject |
| Payroll | `/hrms/payroll` | ✅ FULL | `usePayroll` (29KB), salary calc, payslip generation |
| Recruitment | `/hrms/recruitment` | ✅ FULL | `useCandidates` (20KB), pipeline (Applicant→Interview→BGV→Hired) |
| Holidays | `/hrms/holidays` | ✅ FULL | `useHolidays` hook |
| Events | `/hrms/events` | ✅ FULL | `useCompanyEvents` hook |
| Incidents | `/hrms/incidents` | ✅ FULL | Linked to behavior tickets |

---

## Phase E — Financial & Audit ✅

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Reconciliation Engine | `/finance/reconciliation` | ✅ FULL | 48KB hook, PO↔GRN↔Bill matching |
| Supplier Bills Lifecycle | `/finance/supplier-bills` | ✅ FULL | Approval/rejection workflow |
| Buyer Invoices | `/finance/buyer-invoices` | ✅ FULL | Invoice generation, payment tracking |
| Buyer Billing (Sale Bills) | `/finance/buyer-billing` | ✅ FULL | Sale bill generation |
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

## Dashboards (12 Role-Specific)

All located in `components/dashboards/`. Accessible via `/dashboard` with admin role switcher.

| Dashboard | Component | Status | Notes |
|-----------|-----------|--------|-------|
| Admin | `AdminView` (inline in page) | 🟡 PARTIAL | Real stats from `useMDStats`, `useServiceRequests`, `useReorderAlerts`. **Revenue chart uses `ComingSoonChart` placeholder** |
| Company MD | `MDDashboard.tsx` | ✅ FULL | `useMDStats` hook |
| Company HOD | `HODDashboard.tsx` | ✅ FULL | `useHODStats` hook |
| Account | `AccountsDashboard.tsx` | ✅ FULL | Financial overview |
| Delivery Boy | `DeliveryDashboard.tsx` | ✅ FULL | Material arrival logging with photo enforcement |
| Buyer | `BuyerDashboard.tsx` (component) | ✅ FULL | Summary widget |
| Supplier | `SupplierDashboard.tsx` | ✅ FULL | Summary widget |
| Security Guard | `GuardDashboard.tsx` | ✅ FULL | 51KB — checklist, panic, attendance, GPS |
| Security Supervisor | `SecuritySupervisorDashboard.tsx` | ✅ FULL | `useSupervisorStats` hook |
| Society Manager | `SocietyManagerDashboard.tsx` | ✅ FULL | 26KB — visitor stats, checklist status, panic logs |
| Service Boy | `ServiceBoyDashboard.tsx` | ✅ FULL | Job sessions, GPS, photo evidence |
| Resident | `ResidentDashboard.tsx` | 🟡 PARTIAL | 30KB but uses `MOCK_RESIDENT_ID` |

---

## Buyer Portal (Dedicated at `/buyer`)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Buyer Dashboard | `/buyer` (page.tsx) | 🟡 PARTIAL | **UI is polished** with metrics, service catalog, active services, pending bills. Uses `useBuyerRequests` + `useBuyerInvoices` hooks. However: (1) "Ongoing Services" falls back to `3` if empty, (2) "Ending Soon" is `Math.max(0, active - 2)` — **mocked**, (3) Active services list mocks headcount/shift/endDate per item, (4) "Raise a Ticket" and "Cancel a Service" buttons are **non-functional** (no onClick handlers) |
| Buyer Requests List | `/buyer/requests` | ✅ FULL | DataTable with all statuses |
| Buyer New Request | `/buyer/requests/new` | ✅ FULL | Multi-step request creation form |
| Buyer Request Detail | `/buyer/requests/[id]` | ✅ FULL | Full lifecycle view |
| Buyer Invoices | `/buyer/invoices` | ✅ FULL | `useBuyerInvoices` hook, payment tracking |

---

## Tickets System

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Behavior Tickets | `/tickets/behavior` | ✅ FULL | `useBehaviorTickets` + `useEmployees` hooks, create/resolve dialogs, CRUD |
| Quality Tickets | `/tickets/quality` | ✅ FULL | Derived from `useGRN` — scans GRN items for quality issues, real data |
| Return to Vendor (RTV) | `/tickets/returns` | ✅ FULL | `useRTVTickets` hook, `rtv_tickets` Supabase table, Realtime subscription, CRUD (create + status update), stats computed from live data |

---

## Assets Module

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Asset List | `/assets` | ✅ FULL | `useAssets` hook |
| Asset Detail | `/assets/[id]` | ✅ FULL | Detail view with history |
| Asset Categories | `/assets/categories` | ✅ FULL | `useAssetCategories` hook |
| Asset Maintenance | `/assets/maintenance` | ✅ FULL | `useMaintenanceSchedules` hook |
| QR Codes | `/assets/qr-codes` | ✅ FULL | `useQrCodes` hook, generate + print |

---

## Reports Module

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Reports Hub | `/reports` | ✅ FULL | Links to sub-reports |
| Attendance Reports | `/reports/attendance` | ✅ FULL | `useAttendance` data |
| Financial Reports | `/reports/financial` | ✅ FULL | `useFinance` data |
| Inventory Reports | `/reports/inventory` | ✅ FULL | Stock level analytics |
| Service Reports | `/reports/services` | ✅ FULL | Service request analytics |

---

## ⚠️ Known Mock Data / Hardcoded Areas

These are specific places where data is still mocked despite the page being connected to hooks:

1. **`/buyer` page (line ~54)**: `endingSoonCount` = `Math.max(0, activeServicesCount - 2)` — not derived from real expiry dates
2. **`/buyer` page (line ~59)**: `activeServicesCount || 3` — fallback mock value when no data
3. **`/buyer` page (lines ~84-93)**: Active services list mocks `headcount`, `shift`, `startDate`, `endDate` per request
4. **`/buyer` page (lines ~331-336)**: "Raise a Ticket" and "Cancel a Service" buttons are non-functional
5. ~~`/tickets/returns`~~ — **RESOLVED** (2026-03-15): Now connected to `rtv_tickets` table via `useRTVTickets` hook with Realtime
6. **`/services/plantation` (line ~89)**: `"98%"` hardcoded for Soil Health, `"Greenery density 84%"` hardcoded
7. **`/services/plantation` (lines ~153-174)**: Seasonal Planner is entirely hardcoded (Feb/Mar entries)
8. **`/dashboard` Admin view (line ~268)**: Revenue Analytics chart uses `ComingSoonChart` placeholder
9. **`/dashboard` Admin view (line ~340-343)**: `AdminChart` (unused) uses hardcoded chart data
10. **`/test-resident`**: Uses `MOCK_RESIDENT_ID` — not the actual logged-in user's resident record

---

## 🔴 Features in PRD But NOT YET Built

These features are described in the PRD but have **no page or code** yet:

### Critical
| # | Feature | PRD Section | What's Needed |
|---|---------|-------------|---------------|
| 1 | **Guard Mobile App** | Security Guard Monitoring System | Deployable mobile-optimized interface (not just `/test-guard` test page). Needs: responsive PWA or React Native wrapper. Panic button, checklist, patrol, GPS — backend exists already |
| 2 | **Service Delivery Note & Acknowledgment** | Deployment section | Formal staff deployment confirmation. When Supplier dispatches personnel, Admin confirms arrival with headcount/skill verification. Needs: new DB table + hook + UI page |
| 3 | **Material Supply Services** | Material Supply Svcs | Category-specific procurement for: Security Panel materials, Hot/Cold Beverages, Eco-Friendly Disposable, Cleaning Essentials, Pest Control Materials, Air Fresheners, Stationery, Corporate Gifting. Needs: category-aware buyer request flow |

### High Priority
| # | Feature | PRD Section | What's Needed |
|---|---------|-------------|---------------|
| 4 | **Shift-Based Attendance Validation** | Smart Attendance (HRMS) | Clock-in must validate against assigned shift timings (8AM-8PM, 8PM-8AM). Hook `useShifts` exists but attendance check-in doesn't cross-validate shift assignment |
| 5 | **Auto-Punch-Out** | Smart Attendance (HRMS) | If guard leaves geo-fence for too long → auto clock-out + flag. Needs: edge function or pg_cron job |
| 6 | **Check Feedback (Buyer Rating)** | Financial Closure | After bill paid, Buyer rates service quality. Field exists in PRD but no dedicated feedback form/flow |
| 7 | ~~**RTV (Return to Vendor) Backend**~~ | Ticket Generation System | ✅ **COMPLETED** (2026-03-15): `rtv_tickets` table migrated, `useRTVTickets` hook created, Realtime enabled, page connected |

### Medium Priority
| # | Feature | PRD Section | What's Needed |
|---|---------|-------------|---------------|
| 8 | **Resident/Tenant App** | Notification System | Visitor approval via push notification. Backend for visitors/residents exists, needs: push notification flow for visitor arrival |
| 9 | **Security Supervisor Dashboard (Dedicated Portal)** | Application Stakeholders | Widget exists in `SecuritySupervisorDashboard.tsx` but no dedicated `/security-supervisor` route with full management features |
| 10 | **Society Manager Analytics** | Visitor Management (Society Manager Dashboard) | Manager dashboard widget exists but lacks: visitor stats charts, checklist green/red indicators, staff attendance log-in/log-out analytics |
| 11 | **Recruitment BGV Status Tracking** | HRMS Recruitment | Candidate pipeline exists but Background Verification (Police Verification, Address Verification) specific status fields need dedicated UI tracking |
| 12 | **Chemical Expiry Alerts** | Pest Control Services | `usePestControlInventory` tracks stock but doesn't have expiry date field or alert system for near-expiry chemicals |
| 13 | **Spill Kit Inventory** | Pest Control Services | Tracking absorbent materials & neutralizers — not yet added to pest control inventory |
| 14 | **Ad-Space Booking Workflow** | Printing & Advertising | Ad-Space Master exists with `usePrintingMaster`, but no booking/client management workflow for ad placement |
| 15 | **Revenue Analytics Dashboard** | Admin Dashboard | Revenue chart currently shows `ComingSoonChart` — needs real revenue data aggregation from sale bills |

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

## Recent Session Handoffs

### Session: 2026-03-15 — RTV Backend Implementation
- **What was done**: Applied `rtv_tickets` migration to Supabase, regenerated TypeScript types, created `useRTVTickets` hook with CRUD + Realtime, rewired `/tickets/returns` page from mocked data to live Supabase data.
- **Key decisions**: RTV number generated client-side with random suffix (server-side generation ideal for production). Realtime enabled on `rtv_tickets` for live dashboard updates.
- **Files modified**: `supabase/migrations/20260315120000_add_rtv_tickets.sql`, `hooks/useRTVTickets.ts`, `app/(dashboard)/tickets/returns/page.tsx`, `src/types/phaseB.ts`, `src/types/supabase.ts` (regenerated), `src/lib/constants.ts`
- **Status**: RTV fully connected. No mock data remaining on this page.

### Session: 2026-03-13 — AI Context Files + Buyer Dashboard
- **What was done**: Created `.ai_context/` directory with CONTEXT.md, PHASES.md, CLAUDE.md, .cursorrules. Implemented Buyer Dashboard page.
- **Key decisions**: Buyer dashboard uses existing hooks (`useBuyerRequests`, `useBuyerInvoices`). Some metrics are mocked for demo purposes.
- **Files modified**: `.ai_context/*`, `app/(dashboard)/buyer/page.tsx`
- **Status**: Context files complete. Buyer dashboard functional but has mocked areas (see Known Mock Data section above).
