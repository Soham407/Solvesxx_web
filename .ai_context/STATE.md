# FacilityPro — Session State (GSD STATE.md)

> **Purpose:** Living scratchpad for cross-session continuity. Update this at the END of every session.
> Do NOT duplicate PHASES.md (status ledger) or CONTEXT.md (architecture reference).
> Last Updated: 2026-04-22 (Enhanced admin creation flow built)

---

## Current Status

**Sprint:** Admin Management Enhancements ✅ DONE.

**Overall health:** All 14 role dashboards ✅, all PRD gaps closed ✅, zero known mocks ✅, RLS verified ✅, 184 FK indexes applied ✅, pre-commit type-check active ✅, E2E tests wired ✅.

---

## Last Completed

| Date | What | Key Files |
|------|------|-----------|
| 2026-04-22 | **Admin Management Enhancements** — Enhanced admin creation flow with temporary password generation and improved invitation UI. | `app/api/super-admin/admins/route.ts`, `app/(dashboard)/settings/admins/page.tsx`, `src/types/platform.ts` |
| 2026-03-31 | **SALE-BILL-001 Sale Bill Generation** — Built Admin generation workflow, request linkage, and buyer society filtering. | `app/(dashboard)/finance/sale-bills/page.tsx`, `hooks/useSaleBills.ts`, `hooks/useBuyerInvoices.ts`, `supabase/migrations/20260401000008_sale_bills_enhancements.sql` |
| 2026-03-30 | **SEC-001 Guard / Security Hardening** — Panic alert resolution audit fields, shift status in `/guard`, GPS clock-in enforcement. | `supabase/migrations/20260330000001_sec_001_guard_security_fixes.sql`, `components/dashboards/GuardDashboard.tsx`, `hooks/useAttendance.ts` |
| 2026-03-30 | **HR-001 HRMS Audit Fixes** — Payroll attendance logic, BGV status tracking, auto punch-out cron hardening. | `supabase/migrations/20260330000006_hr_001_hrms_audit_fixes.sql`, `hooks/usePayroll.ts`, `hooks/useAttendance.ts` |
| 2026-03-30 | **ASSET-001 Asset Workflow Hardening** — Batch QR generation, maintenance → service request linkage, job session sync. | `supabase/migrations/20260330000007_asset_001_asset_flow_fixes.sql`, `app/(dashboard)/assets/qr-codes/page.tsx`, `hooks/useMaintenanceSchedules.ts` |

---

## Next Up

> Fill this in at the start of a new task. Clear it when done.

- [ ] _(empty — awaiting new task from user)_

---

## Active Decisions

> Open architectural/design choices that haven't been resolved yet.

- **sale_invoice_seq**: Added a PostgreSQL sequence for sale bill invoice numbers (INV-YYYY-NNNN). This ensures uniqueness across multiple admin sessions.
- **buyer_society_filtering**: For the 'buyer' role, we now resolve `society_id` via `residents -> flats -> buildings -> societies` join. This is the authoritative path for residents.
- **auth_rls_initplan**: 112 RLS policies still call `auth.uid()` directly instead of `(SELECT auth.uid())`. This causes a subplan re-evaluation per row. Fixing requires reading and regenerating all affected policies — deferred as a separate pass when performance becomes a concern.

---

## Blockers

_(none)_

---

## Key Files Being Modified

> List files actively being edited in the current session. Clear when session ends.

_(none — session complete)_

---

## How to Use This File

**At session start:** Read this file to understand what was last worked on and what's next.

**During a session:** Update "Key Files Being Modified" and "Next Up" as you work.

**At session end:**
1. Move completed "Next Up" items to "Last Completed"
2. Clear "Key Files Being Modified"
3. Record any new "Active Decisions" or "Blockers"
4. Update the "Last Updated" date at the top
5. Update `PHASES.md` for any status changes on status ledger.
