# FacilityPro — Production Readiness Synthesis
**Date:** 2026-03-22
**Sources:** subagent-1-security-rbac.md, subagent-2-data-hooks.md, subagent-3-ui-scope-gaps.md, subagent-4-forms-quality.md

---

## CRITICAL ISSUES 🔴 (Must fix before demo or client handoff)

### Security Domain

**SEC-1** `app/api/users/reset-password/route.ts`
No session or role check — any unauthenticated caller can trigger a password reset for any email using the service key.
Fix: Add `createClient` from server, verify session + role is `admin` or `super_admin` before calling `generateLink()`.

**SEC-2** `src/lib/auth/roles.ts` (line 29)
`account` role granted `/inventory/supplier-products` — Finance user can read/modify supplier pricing.
Fix: Remove `/inventory/supplier-products` from `account` role.

**SEC-3** `src/lib/auth/roles.ts` (line 34)
`security_guard` granted `/tickets` — guards can browse/create behavior, quality, and RTV tickets intended for supervisors.
Fix: Remove `/tickets` from `security_guard` ROLE_ACCESS.

**SEC-4** `docs/reference_schema.sql` (line 1056)
`employees` table RLS: `"All users can view employees"` with `USING(true)` — buyer and supplier roles can read all employee PII.
Fix: Write migration to replace policy with `auth.jwt() ->> 'user_role' IN ('admin','super_admin','company_md','company_hod','account','storekeeper','site_supervisor','security_supervisor','society_manager')`.

**SEC-5** `docs/reference_schema.sql` (line 2544) + `docs/reference_schema.sql` (line 267)
`payroll_runs` has RLS enabled but zero SELECT policies. `generate_payroll_cycle()` is `GRANT EXECUTE TO authenticated` — any authenticated user (buyer, guard, supplier) can trigger a payroll run.
Fix: Add RLS SELECT policy for `account` and `admin`/`super_admin` only. Revoke `authenticated` from function, grant to specific roles.

### Hook / Data Layer Domain

**HOOK-1** `hooks/useSupplierBills.ts`
Queries wrong column names: `purchase_order_id`, `material_receipt_id`, `status`, `subtotal`, `tax_amount`, `due_amount` — all absent from `purchase_bills` schema. Every query/mutation fails silently at runtime.
Fix: Map column names to actual schema: `po_id`, `gst_amount`, `grand_total`. Read `purchase_bills` definition from migrations.

**HOOK-2** `hooks/useBuyerRequests.ts` (line 114)
Queries `.from("requests")` and `.from("request_items")` but schema tables are `order_requests` / `order_request_items`.
Fix: Replace all references to `"requests"` → `"order_requests"` and `"request_items"` → `"order_request_items"`.

**HOOK-3** `hooks/useBuyerFeedback.ts` (line 58)
Updates `.from("requests")` — same wrong table as above. Every feedback status update fails.
Fix: Replace `"requests"` → `"order_requests"`.

**HOOK-4** `hooks/usePayroll.ts` (line 274)
Queries `.from("payroll_cycles")` — table is `payroll_runs` in live schema. Silently returns no data.
Fix: Replace all `"payroll_cycles"` references with `"payroll_runs"`. Verify column names against migrations.

**HOOK-5** `hooks/useServiceRequests.ts` (line 65)
Queries view `service_requests_with_details` which exists only in the Phase B archive, not in deployed schema.
Fix: Replace view query with a direct `service_requests` table query with explicit joins/selects.

**HOOK-6** `hooks/usePersonnelDispatches.ts` (line 58)
FK join references `.from("locations")` — correct table is `company_locations`.
Fix: Replace `"locations"` → `"company_locations"`.

**HOOK-7** `hooks/usePanicAlertHistory.ts` + `hooks/usePanicAlertSubscription.ts`
Both use identical Realtime channel name `"panic-alerts-realtime"` — second subscription silently replaces first, causing alert message loss.
Fix: Rename one to `"panic-alerts-history"` and the other `"panic-alerts-live"`.

### UI / Scope Domain

**UI-1** `components/dashboards/`
`ACTechnicianDashboard.tsx` and `PestControlTechnicianDashboard.tsx` do not exist on main branch. Both roles fall through to generic `ServiceBoyDashboard`. PHASES.md incorrectly marks them ✅.
Fix: Create minimal role-specific dashboard components for AC Technician and Pest Control Technician.

**UI-2** `app/(dashboard)/hrms/incidents/`
Directory exists, `page.tsx` does not — causes 404 for `/hrms/incidents` which is listed as ✅ FULL in PHASES.md.
Fix: Create a `page.tsx` (even a minimal one listing behavior_tickets relevant to HRMS incidents).

**UI-3** `app/(dashboard)/settings/`
Sidebar links to `/settings/permissions`, `/settings/notifications`, `/settings/branding` — none of these pages exist, causing 404s when the `SETTINGS_MODULE` flag is on.
Fix: Either create stub pages with "Coming Soon" or remove those sidebar links / gate them behind a feature flag.

### Forms / Quality Domain

**FORM-1** `components/dialogs/AdBookingDialog.tsx` (L20–26)
No cross-field date validation — `end_date >= start_date` not enforced; bookings with reversed dates silently accepted.
Fix: Add `.refine()` to Zod schema to enforce `end_date >= start_date`.

**FORM-2** `components/dialogs/AdBookingDialog.tsx` (L24)
`agreed_rate` accepts negative values — Zod only validates string `.min(1)`, not numeric minimum.
Fix: Change to `z.coerce.number().min(0.01, "Rate must be positive")`.

**FORM-3** `components/dialogs/ServiceAcknowledgmentDialog.tsx` (L31)
Notes field is `optional()` even when `hasMismatch === true` — headcount discrepancy can be silently submitted without explanation.
Fix: Add `.superRefine()` or manual `form.setError()` in `handleSubmit` before API call when mismatch + empty notes.

**FORM-4** `app/(dashboard)/company/employees/create/page.tsx` (L27, L43–46)
Submit handler is a stub (`setTimeout` + `console.log`) — no employee is ever written to the database.
Fix: Wire up `useEmployees` hook `createEmployee` function in the submit handler.

**FORM-5** `components/dialogs/SummaryReportsDialog.tsx` (L67, L86–87)
Report generation entirely mocked — users download hardcoded "Sample Value" CSVs.
Fix: Wire up real data queries or clearly mark as "coming soon" and disable the download button.

**FORM-6** `hooks/useCandidates.ts` (L643–661)
`uploadBGVDocument` has zero MIME or size validation and exposes compliance documents via permanent public URLs.
Fix: Validate MIME type (PDF only) and size (≤5MB) before upload. Use `createSignedUrl` instead of `getPublicUrl`.

**FORM-7** `components/forms/AddVisitorForm.tsx` (L199–222)
Webcam selfie uploaded at full resolution with no size cap — can be >3MB per upload.
Fix: Add canvas resize to 640×480 max before `toDataURL`, and add a 2MB check before upload.

---

## HIGH PRIORITY ISSUES 🟠 (Fix in this session)

### Security
- **SEC-H1** `middleware.ts`: Feature-flag frozen routes never checked in middleware — sidebar-only gating. Fix: Import `isRouteFrozen` and call it after RBAC check.
- **SEC-H2** `hooks/useInactivityMonitor.ts` (L13): Inactivity threshold hardcoded to 30 min — must read from `system_config`. Fix: Query `system_config` for `guard_inactivity_threshold_minutes` on init.
- **SEC-H3** `supabase/functions/check-document-expiry/index.ts`: Chemical expiry items silently skipped — SCOPE Rule 8 never notified. Fix: Handle `chemical`/`safety_equipment` category and insert notification row.
- **SEC-H4** `supabase/functions/check-checklist/index.ts` (L72): UTC hours compared against IST shift times — reminders fire at wrong time. Fix: Convert to IST (UTC+5:30) before comparison.
- **SEC-H5** `src/lib/auth/roles.ts` (L39): `storekeeper` granted `/tickets` broadly — should not access behavior tickets. Fix: Replace `/tickets` with `/tickets/quality` and `/tickets/returns` only.
- **SEC-H6** `hooks/useJobSessions.ts` (L104–139): `startSession` does not check PPE checklist for pest control technicians — SCOPE Rule 9. Fix: Add guard before mutation.

### Hooks
- **HOOK-H1** `hooks/useGRN.ts` (L782–788): N+1 write in `updatePOReceivedQuantities` — one DB call per item. Fix: Write RPC or batch with `Promise.all`.
- **HOOK-H2** `hooks/useIndents.ts` (L537–543): N+1 write in `approveIndent`. Fix: Same pattern.
- **HOOK-H3** `hooks/useNotifications.ts`: `markAsRead`/`markAllRead` swallow errors silently. Fix: Surface errors to return value.
- **HOOK-H4** `hooks/useShortageNotes.ts`: `fetchNotes` swallows errors, no error state set. Fix: Set `error` state.
- **HOOK-H5** `hooks/usePersonnelDispatches.ts` + `hooks/useServiceDeliveryNotes.ts`: Dual Realtime + useEffect trigger causing double fetches. Fix: Remove standalone `useEffect` fetch — let Realtime subscription handle updates.
- **HOOK-H6** `hooks/useVisitors.ts` (L1): `// @ts-nocheck` suppresses entire file. Fix: Remove and fix resulting type errors.

### UI/Scope
- **UI-H1** `src/lib/notifications.ts`: 22/28 notification triggers not wired — most events never insert into `notifications` table. Fix: Call notification helpers from hooks after successful mutations.
- **UI-H2** `hooks/usePatrolLogs.ts`: Read-only, no `createPatrolLog` mutation. Fix: Add insert mutation.
- **UI-H3** `components/dialogs/ServiceDeliveryNoteDialog.tsx`: SDN dialog creates DB record but no PDF generation. Fix: Add jsPDF download button using existing payslip pattern.

### Forms
- **FORM-H1** `components/dialogs/ManualAdjustmentDialog.tsx`: Raw `useState` form, no Zod. Fix: Migrate to React Hook Form + Zod.
- **FORM-H2** `components/dialogs/NewJobOrderDialog.tsx`: No Zod, `estimated_hours` accepts negatives. Fix: Add Zod schema with `z.number().min(0.5)`.
- **FORM-H3** `components/dialogs/PhotoUploadDialog.tsx`: No MIME or size validation. Fix: Check `file.type` starts with `image/` and `file.size <= 5242880`.
- **FORM-H4** `components/dashboards/HODDashboard.tsx` (L3): Recharts top-level import. Fix: Use `dynamic(() => import('recharts'), { ssr: false })`.
- **FORM-H5** `components/printing/IDPrintingModule.tsx` (L20): jsPDF top-level import (+270KB). Fix: Dynamic import inside the print handler.
- **FORM-H6** `app/(dashboard)/services/ac/page.tsx` (L42): `console.log` leaks service data. Fix: Remove.

---

## MEDIUM / LOW ISSUES 🟡🟢 (Document only — not auto-fixed)

- Super Admin has no dedicated screens (platform dashboard, admin management, audit logs, system config UI)
- MD Approval Queue not implemented
- Storekeeper Stock Issue workflow entirely missing
- Guard live map is CSS simulation, not real map integration
- Buyer and Supplier profile pages missing
- `/inventory/indents` list page missing (only create + verification)
- `closed` status missing from SERVICE_REQUEST_STATUS constants
- Visitor status constants absent from `constants.ts`
- Waitlist confirmation email not sent
- Reports module hidden by default behind feature flag
- Employee payslip self-service for non-admin roles
- `ac_technician` and `pest_control_technician` granted full `/inventory` prefix
- `auth_rls_initplan`: 112 RLS policies use `auth.uid()` directly (subplan re-eval per row)
- 17 hooks with `// @ts-nocheck` (beyond useVisitors)
- 433 `console.log` statements in production code paths
- Icon-only buttons missing `aria-label` across dashboards
- Patrol log QR scanner missing from main (only in worktree branch)
- `useSupabaseMutation` doesn't auto-refresh dependent queries

---

## FIX ORDER

1. **Fix Group A** — `app/api/`, `middleware.ts`, `src/lib/auth/roles.ts` (SEC-1 through SEC-5, SEC-H1, SEC-H2, SEC-H5)
2. **Fix Group B** — `hooks/` data layer (HOOK-1 through HOOK-7, HOOK-H1 through HOOK-H6)
3. **Fix Group C** — Business rules enforcement in hooks (SEC-H3, SEC-H4, SEC-H6, UI-H1, UI-H2)
4. **Fix Group D** — Forms and dialogs (FORM-1 through FORM-7, FORM-H1 through FORM-H6)
5. **Fix Group E** — Missing UI pages (UI-1, UI-2, UI-3, UI-H3)
