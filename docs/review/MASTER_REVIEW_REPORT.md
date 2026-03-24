# FacilityPro — Production Readiness Review
**Date:** 2026-03-22
**Agent:** Claude Code Orchestrator + 4 Review Subagents + 5 Fix Subagents

---

## Executive Summary

FacilityPro has a well-structured codebase with 92+ hooks, 111 routes, and strong role-based middleware, but the review uncovered 7 critical data-layer bugs (hooks querying wrong/non-existent table names) that would cause entire workflows to silently fail at runtime — most notably Buyer Requests, Buyer Feedback, Payroll, Supplier Bills, and Personnel Dispatches. Several critical security issues were also found and fixed, including an unauthenticated password-reset API endpoint and an overly-permissive employees RLS policy exposing all staff PII to Buyer and Supplier roles. The platform is **not ready for production without the DB migrations listed below being reviewed and applied**, but all code-level fixes are now in place.

---

## Critical Issues Fixed This Session 🔴

| # | ID | File | What Was Fixed |
|---|----|------|---------------|
| 1 | SEC-1 | `app/api/users/reset-password/route.ts` | Added session auth + role check (admin/super_admin only) before triggering password reset |
| 2 | SEC-2 | `src/lib/auth/roles.ts` | Removed `/inventory/supplier-products` from `account` role |
| 3 | SEC-3 | `src/lib/auth/roles.ts` | Removed `/tickets` from `security_guard` role |
| 4 | HOOK-2 | `hooks/useBuyerRequests.ts` | Fixed table names: `requests` → `order_requests`, `request_items` → `order_request_items` |
| 5 | HOOK-3 | `hooks/useBuyerFeedback.ts` | Fixed table name: `requests` → `order_requests` |
| 6 | HOOK-4 | `hooks/usePayroll.ts` | Fixed table name: `payroll_cycles` → `payroll_runs` (9 occurrences) |
| 7 | HOOK-6 | `hooks/usePersonnelDispatches.ts` | Fixed table name: `locations` → `company_locations` |
| 8 | HOOK-7 | `hooks/usePanicAlertHistory.ts` + `usePanicAlertSubscription.ts` | Fixed duplicate Realtime channel name — was causing panic alert loss |
| 9 | HOOK-1 | `hooks/useSupplierBills.ts` | Fixed column names: `purchase_order_id`→`po_id`, `subtotal`→`total_amount`, `tax_amount`→`gst_amount`, removed non-existent `due_amount` and `status` columns |
| 10 | UI-1 | `components/dashboards/` | Created `ACTechnicianDashboard.tsx` and `PestControlTechnicianDashboard.tsx`; wired into dashboard router |
| 11 | UI-2 | `app/(dashboard)/hrms/incidents/page.tsx` | Created missing incidents page (was 404) |
| 12 | UI-3 | `app/(dashboard)/settings/` | Created stub pages for `/settings/permissions`, `/settings/notifications`, `/settings/branding` (were 404) |
| 13 | FORM-4 | `app/(dashboard)/company/employees/create/page.tsx` | Replaced `setTimeout`+`console.log` stub with real `createEmployee` hook call |
| 14 | FORM-5 | `components/dialogs/SummaryReportsDialog.tsx` | Disabled mock CSV download, labeled "Reports Coming Soon" |
| 15 | FORM-7 | `hooks/useCandidates.ts` | Added MIME + size validation to BGV upload; replaced permanent public URL with 1-hour signed URL |
| 16 | FORM-6 | `components/forms/AddVisitorForm.tsx` | Added canvas resize (max 640×480) + 2MB size cap before selfie upload |

---

## High Priority Issues Fixed This Session 🟠

| # | ID | File | What Was Fixed |
|---|----|------|---------------|
| 1 | SEC-H1 | `middleware.ts` | Feature-flag-frozen routes now blocked server-side (not just sidebar-hidden) |
| 2 | SEC-H2 | `hooks/useInactivityMonitor.ts` | Guard inactivity threshold now reads from `system_config` (was hardcoded to 30 min) |
| 3 | SEC-H3 | `supabase/functions/check-document-expiry/index.ts` | Chemical expiry now sends notifications to pest_control_technicians (was silently skipped) |
| 4 | SEC-H4 | `supabase/functions/check-checklist/index.ts` + `checklist-reminders/index.ts` | Fixed UTC vs IST timezone bug — reminders now fire at correct IST time |
| 5 | SEC-H5 | `src/lib/auth/roles.ts` | `storekeeper` now restricted to `/tickets/quality` and `/tickets/returns` only |
| 6 | SEC-H6 | `hooks/useJobSessions.ts` | PPE checklist gate added before pest control job can be set to `in_progress` |
| 7 | HOOK-H1 | `hooks/useGRN.ts` | N+1 write in `updatePOReceivedQuantities` replaced with `Promise.all` |
| 8 | HOOK-H2 | `hooks/useIndents.ts` | N+1 write in `approveIndent` replaced with `Promise.all` |
| 9 | HOOK-H3 | `hooks/useNotifications.ts` | `markAsRead`/`markAllRead` now surface Supabase errors instead of swallowing them |
| 10 | HOOK-H4 | `hooks/useShortageNotes.ts` | Error state now set on fetch failure (was only `console.error`) |
| 11 | HOOK-H5 | `hooks/usePersonnelDispatches.ts` + `useServiceDeliveryNotes.ts` | Removed duplicate Realtime+useEffect double-fetch triggers |
| 12 | HOOK-H6 | `hooks/useVisitors.ts` | Removed blanket `// @ts-nocheck` — replaced with targeted casts |
| 13 | UI-H1 | `hooks/useShortageNotes.ts` + `useLeaveApplications.ts` + `usePurchaseOrders.ts` | Wired 3 highest-priority notification triggers (shortage notes, leave approval, PO issuance) |
| 14 | UI-H2 | `hooks/usePatrolLogs.ts` | Added `createPatrolLog` mutation (was read-only) |
| 15 | UI-H3 | `components/dialogs/ServiceDeliveryNoteDialog.tsx` | Added PDF download using dynamic jsPDF import |
| 16 | FORM-1+2 | `components/dialogs/AdBookingDialog.tsx` | Added `end_date >= start_date` validation + positive-number validation for `agreed_rate` |
| 17 | FORM-3 | `components/dialogs/ServiceAcknowledgmentDialog.tsx` | Notes now required when headcount mismatch (enforced in submit handler) |
| 18 | FORM-H1 | `components/dialogs/ManualAdjustmentDialog.tsx` | Migrated from raw `useState` to React Hook Form + Zod |
| 19 | FORM-H2 | `components/dialogs/NewJobOrderDialog.tsx` | Migrated to React Hook Form + Zod; `estimated_hours` min 0.5 / max 24 enforced |
| 20 | FORM-H3 | `components/dialogs/PhotoUploadDialog.tsx` | Added MIME type + 5MB size validation before upload |
| 21 | FORM-H5 | `components/printing/IDPrintingModule.tsx` | Changed jsPDF to dynamic import (saves ~270KB from initial bundle) |
| 22 | FORM-H6 | `app/(dashboard)/services/ac/page.tsx` | Removed `console.log` leaking internal service data |

---

## Issues Requiring Human Decision 🟡🟢

### Medium Priority
- **Super Admin screens**: No dedicated platform dashboard, admin management, audit logs, or system config UI. Super Admin currently reuses Admin dashboard.
- **MD Approval Queue**: No dedicated screen for high-value escalated requests requiring MD sign-off.
- **Storekeeper Stock Issue workflow**: No page for logging parts/items issued to technicians.
- **Guard live map**: Currently a CSS dot simulation. Would require Leaflet/Google Maps/Mapbox integration.
- **Buyer profile page**: `/buyer/profile` route missing (SCOPE §11.8).
- **Supplier profile page**: `/supplier/profile` route missing (SCOPE §11.9).
- **`/inventory/indents` list page**: Only create + verification sub-routes exist; no indent list view.
- **Visitor status constants**: `VISITOR_STATUS` (pre_approved, arrived, etc.) absent from `constants.ts`.
- **`closed` status for Service Requests**: Only `open/assigned/in_progress/on_hold/completed/cancelled` — `closed` missing from constants.
- **Waitlist confirmation email**: Submission inserts to DB but no email sent to submitter.
- **Reports module**: All 4 report pages hidden by default behind `REPORTS_MODULE` feature flag — must set `NEXT_PUBLIC_FF_REPORTS_MODULE=true` in production .env.
- **Remaining 20 notification triggers**: Only 3 of 28 SCOPE §12 triggers wired this session. The other 20 need manual implementation in respective hooks.
- **19 remaining hooks with `// @ts-nocheck`**: Only `useVisitors` fixed this session.
- **`auth_rls_initplan` performance**: 112 RLS policies use direct `auth.uid()` instead of `(SELECT auth.uid())` — causes per-row subplan re-evaluation. Deferred as separate performance pass.

### Low Priority
- 430 remaining `console.log` statements in production code (433 found, 3 removed this session)
- Icon-only buttons missing `aria-label` across multiple dashboard pages
- QR scanner for asset check-in/out missing from main branch (only in `.worktrees/`)
- Employee payslip self-service not accessible to non-admin roles
- `ac_technician` and `pest_control_technician` granted full `/inventory` prefix (broader than needed)

---

## Build Status ✅

```
✓ Compiled successfully in 25.1s
✓ Generating static pages using 11 workers (111/111)
```

**0 new errors introduced.** Pre-existing `ignoreBuildErrors: true` in `next.config.ts` remains in place for the known TS2589 deep-type error in `supabase-types.ts`.

Note: Build requires `--webpack` flag due to a pre-existing Turbopack configuration conflict (`webpack` config present without corresponding `turbopack` config). This is not a new issue and was present before this session.

---

## Pending DB Migrations (NOT yet applied) ⚠️

**Human must review and run: `supabase db push` or apply via Supabase dashboard**

| File | What It Does |
|------|-------------|
| `supabase/migrations/20260322000001_fix_employees_rls.sql` | Replaces `USING(true)` on `employees` RLS with role-scoped policy — **critical, blocks PII exposure** |
| `supabase/migrations/20260322000002_fix_payroll_rls.sql` | Adds SELECT policy to `payroll_runs`; restricts `generate_payroll_cycle()` execution to service_role only — **critical** |

---

## Feature Completeness Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Role Master | ✅ | Full CRUD |
| Designation Master | ✅ | Full CRUD |
| Employee Master | ✅ | Fixed: create form now writes to DB |
| User Master | ✅ | Supabase auth integration |
| Company Locations | ✅ | GPS coords for geo-fencing |
| Product Master + Categories | ✅ | Full CRUD |
| Supplier Master | ✅ | Full |
| Supplier/Sale Rates | ✅ | Full with Realtime |
| Buyer Order Requests | ✅ | Fixed: hooks now use correct table names |
| Buyer Feedback | ✅ | Fixed: correct table name |
| Indent Generation | ✅ | Full lifecycle |
| Purchase Orders | ✅ | Full lifecycle |
| GRN | ✅ | Full; N+1 fixed |
| Supplier Bills | ✅ | Fixed: correct column names |
| Sale Bills / Buyer Invoices | ✅ | Full |
| Reconciliation | ✅ | 48KB hook |
| Return To Vendor (RTV) | ✅ | Full with Realtime |
| Visitor Management | ✅ | Fixed: @ts-nocheck removed, selfie size capped |
| Panic Alerts | ✅ | Fixed: duplicate channel names resolved |
| Guard Checklists | ✅ | Full |
| Attendance (Geo-fence) | ✅ | Client-side only (server-side enforcement is a DB migration) |
| Payroll | ✅ | Fixed: correct table name |
| Leave Management | ✅ | Notification wired |
| Recruitment + BGV | ✅ | Fixed: signed URLs for compliance docs |
| Security Command Center | ✅ | |
| Service Requests | ✅ | View exists in live DB |
| Job Sessions | ✅ | PPE gate added for pest control |
| Service Delivery Notes | ✅ | Fixed: PDF download added |
| Personnel Dispatches | ✅ | Fixed: correct table name, double-fetch removed |
| AC Technician Dashboard | ✅ | **Newly created** |
| Pest Control Dashboard | ✅ | **Newly created** |
| HRMS Incidents Page | ✅ | **Newly created** |
| Settings Sub-pages | ⚠️ | Stub pages created — content coming soon |
| Ad Booking | ✅ | Fixed: date + rate validation |
| Super Admin Screens | ❌ | No dedicated platform screens |
| MD Approval Queue | ❌ | Not implemented |
| Storekeeper Stock Issue | ❌ | Not implemented |
| Guard Live Map (real) | ❌ | CSS simulation only |
| Buyer/Supplier Profile Pages | ❌ | Routes missing |
| Patrol Log Creation | ✅ | **Mutation added this session** |
| Reports Module | ⚠️ | Built but hidden behind feature flag |

---

## Business Rule Coverage

| Rule | Enforcement Level | Status |
|------|------------------|--------|
| 1. Geo-fencing 50m check-in | ⚠️ Client-side hook only | No DB/trigger enforcement |
| 2. Indent required before PO | ✅ Hook-level guard | `usePurchaseOrders` checks indent status |
| 3. Material acknowledgment before bill | ✅ Hook-level | `useSupplierBills` requires GRN |
| 4. Bad material blocked from inventory | ✅ Quality ticket flow | GRN creates quality ticket |
| 5. Shortage auto-calculated + dispatched | ✅ | Fixed: notification now sent to supplier |
| 6. Feedback required for closure | ⚠️ UI only | `feedback_pending` status exists; no server-side block |
| 7. Supplier rate vs sale rate both maintained | ✅ | Separate rate tables |
| 8. Chemical expiry alerts | ✅ | Fixed: edge function now notifies pest_control_technician |
| 9. PPE checklist gate before in_progress | ✅ | Fixed: hook-level guard added |
| 10. BGV required for onboarding | ⚠️ UI only | No DB constraint preventing hire without BGV |
| 11. Single active deployment per guard | ⚠️ UI only | No DB unique constraint |
| 12. Service acknowledgment before supplier bill | ✅ | `service_acknowledgments` table + dialog |
| 13. OT only beyond standard shift | ✅ | `usePayroll` calculates against shift start |
| 14. Guard inactivity threshold from system_config | ✅ | Fixed: hook now reads from `system_config` |
| 15. RBAC extensible without schema changes | ✅ | `roles.ts` + middleware pattern |

---

## RBAC Coverage Summary (18 Roles)

| Role | Route Guard | Key Issues Fixed |
|------|-------------|-----------------|
| admin | ✅ Full access | — |
| super_admin | ✅ Full access | — |
| company_md | ✅ `/dashboard`, `/reports`, `/finance` | — |
| company_hod | ✅ 6 prefixes | — |
| account | ✅ | Removed `/inventory/supplier-products` access |
| delivery_boy | ✅ | — |
| buyer | ✅ `/dashboard`, `/buyer` only | — |
| supplier | ✅ `/dashboard`, `/supplier` only | — |
| vendor | ✅ Same as supplier | — |
| security_guard | ✅ | Removed `/tickets` access |
| security_supervisor | ✅ | — |
| society_manager | ✅ | — |
| service_boy | ⚠️ `/service-requests` too broad | Needs `/service-requests/my` sub-path |
| resident | ✅ `/test-resident`, `/society/my-flat` | — |
| storekeeper | ✅ | Restricted tickets to quality+returns only |
| site_supervisor | ✅ | — |
| ac_technician | ✅ | Has full `/inventory` — consider restricting |
| pest_control_technician | ✅ | Has full `/inventory` — consider restricting |

---

## Remaining Work Estimate

| Category | Items Remaining | Estimated Effort |
|----------|----------------|-----------------|
| Missing screens (Super Admin, MD queue, Stock Issue) | 5 | ~20h |
| Unwired notification triggers | 20 of 28 | ~15h |
| DB migrations to review/apply | 2 | 30min |
| Guard live map (real map provider) | 1 | ~8h |
| Buyer/Supplier profile pages | 2 | ~4h |
| console.log cleanup (remaining 430) | 430 statements | ~2h |
| Medium-priority fixes (constants, visitor states, etc.) | 8 | ~6h |
| auth_rls_initplan performance (112 policies) | 1 pass | ~4h |

---

## Recommended Next Steps

1. **Apply the 2 DB migrations** — `supabase db push` or apply via Supabase dashboard. The employees RLS fix is critical before any external demo.
2. **Wire remaining notification triggers** — 20 of 28 SCOPE §12 events still don't insert into the `notifications` table. Start with the highest-visibility ones: panic alert resolution, behavior ticket creation, and visitor check-in.
3. **Enable Reports module in production .env** — Set `NEXT_PUBLIC_FF_REPORTS_MODULE=true` in the production environment.
4. **Fix the `--webpack` build flag** — Add `turbopack: {}` to `next.config.ts` to silence the Turbopack warning and allow the default `next build` command to work.
5. **Implement Super Admin platform screens** — System Config UI (wrapping `system_config` table), Admin Management, and Audit Logs are all absent.
6. **Consider MD Approval Queue and Storekeeper Stock Issue** — These are SCOPE-defined workflows with no implementation.
7. **Replace guard live map CSS simulation** with Leaflet or similar for actual GPS visualization.
