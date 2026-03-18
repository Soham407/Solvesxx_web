# FacilityPro — Fix Implementation Plan
> Generated: 2026-03-18 | Start here in a new chat session.

## What Was Done This Session
- Deep per-file audit of the full app
- Discovered the AI context files (PHASES.md, STATE.md) were **wrong** — the app is NOT feature-complete
- Created `supabase/migrations/20260318000001_audit_logs.sql` ✅
- Created `hooks/useAuditLogs.ts` ✅
- **Stopped mid-implementation** — start from item #2 below

---

## Real Issues Found (what PHASES.md got wrong)

### 🔴 BROKEN — Not working at all

| # | File | Route | Issue |
|---|------|-------|-------|
| 1 | `app/(dashboard)/finance/ledger/page.tsx` | `/finance/ledger` | `audit_logs` table was missing → shows empty forever. **Migration + hook now created.** Page still needs to be updated to use `useAuditLogs`. |
| 2 | `app/(dashboard)/finance/compliance/page.tsx` | `/finance/compliance` | Hardcoded UUID `b33501b1-684f-4450-adc7-69cb58d9d564` passed to `createMonthlySnapshot()`. Stats cards show hardcoded strings: `"100%"`, `"4 Modules"`, `"Active"`, `"Paise"`. Audit log export disabled. |
| 3 | `app/(dashboard)/inventory/indents/verification/page.tsx` | `/inventory/indents/verification` | Price override approvals stored in `localStorage` (lines 280-415) — lost on browser clear, invisible to other users. |
| 4 | `app/(dashboard)/society/my-flat/page.tsx` | `/society/my-flat` | `import React from "react"` is on line 26 but `<React.Suspense>` is used on line 12. Import appears after usage. Bundler hoisting masks this at runtime but it's incorrect code. Fix: move the import to the top of the file. |

### 🟡 PARTIAL — Non-functional buttons (implement fully)

| # | File | What's broken |
|---|------|---------------|
| 5 | `app/(dashboard)/company/users/page.tsx` | Reset Password, Manage MFA, Deactivate User dropdown items have no `onClick`. "Provision New User" has CSS typo `shadow-sh-primary`. Uses direct Supabase (no hook — violates CLAUDE.md). |
| 6 | `app/(dashboard)/finance/budgeting/page.tsx` | "Create Budget", "History", "Allocation View" buttons — empty `onClick`. Stat "Active Periods" hardcoded as `"2"`. |
| 7 | `app/(dashboard)/hrms/leave/config/page.tsx` | "Define Leave Type" + row Settings buttons — no `onClick`. |
| 8 | `app/(dashboard)/hrms/recruitment/page.tsx` | "Org Chart", "View Details" icon + dropdown — no `onClick`. |
| 9 | `app/(dashboard)/hrms/payroll/page.tsx` | "Generate Payslips" in empty state — no `onClick` (header version works). |
| 10 | `app/(dashboard)/tickets/behavior/page.tsx` | "Dismiss Ticket" dropdown — no handler. |
| 11 | `app/(dashboard)/tickets/quality/page.tsx` | "Audit Logs", "Log Discrepancy" buttons — empty `onClick`. |
| 12 | `app/(dashboard)/services/security/page.tsx` | "Dispatch Guard" button — empty `onClick`. Map is hardcoded placeholder. |
| 13 | `app/(dashboard)/supplier/service-orders/page.tsx` | "View", "New Service Order" — no `onClick`. Direct Supabase (no hook). |
| 14 | `app/(dashboard)/services/masters/tasks/page.tsx` | Row Settings + MoreHorizontal — no `onClick`. `priority` + `estimatedDuration` are mocked (comment says so at line 49). |
| 15 | `app/(dashboard)/reports/attendance/page.tsx` | "Trend View", "Download Report" — empty `onClick`. Hardcoded `"3"` for absent alerts (line 131). |
| 16 | `app/(dashboard)/reports/financial/page.tsx` | "Tax Summary", "Audit Pack (PDF)" — empty `onClick`. Badge percentages `+14.2%`, `+2%` hardcoded. |
| 17 | `app/(dashboard)/reports/inventory/page.tsx` | "Stock Alerts", "PO Manifest (XL)" — empty `onClick`. |
| 18 | `app/(dashboard)/reports/services/page.tsx` | "KPI Trends", "Download Report" — empty `onClick`. `total_breaches` not in TS interface (line 72). |

---

## Implementation Steps (pick up from here)

### ✅ Already Done
- `supabase/migrations/20260318000001_audit_logs.sql` — created
- `hooks/useAuditLogs.ts` — created

### Step 0 — Fix `society/my-flat/page.tsx` (trivial)
Move `import React from "react"` from line 26 to the top of the file (line 1), before all other code. One-line fix.

### Step 1 — Fix `finance/ledger/page.tsx`
Replace disabled `useEffect` fetch with `useAuditLogs()` hook:
```tsx
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
const { logs, isLoading, refresh } = useAuditLogs();
```
- Columns: `created_at`, `entity_type`, `action`, `actor_name`, "Inspect Change" dialog showing `old_data`/`new_data`
- Add Refresh button calling `refresh()`

### Step 2 — Fix `finance/compliance/page.tsx`
1. Replace hardcoded UUID with a dynamic fetch of the current/latest financial period:
```tsx
const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
// on mount: supabase.from("financial_periods").select("id").order("created_at", {ascending:false}).limit(1).single()
```
2. Replace the 4 hardcoded stat cards with computed values from `snapshots` (from `useCompliance()`):
   - "Audit Integrity" → `snapshots.length > 0 ? "Verified" : "No Snapshots"`
   - "Export Ready" → `"4 Modules"` is fine (it's UI config, not data)
   - Keep the other cards or compute from snapshot data
3. Wire `handleExportAuditLogs` to `useAuditLogs().logs` and use the existing `exportToCSV` helper

### Step 3 — Fix `inventory/indents/verification` (localStorage → DB)
1. Create migration `20260318000002_indent_price_overrides.sql`:
```sql
ALTER TABLE indent_items
  ADD COLUMN IF NOT EXISTS override_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMPTZ;
```
2. In `hooks/useIndents.ts` add:
```ts
updateIndentItemOverride: async (itemId: string, reason: string, approvedBy: string) => {
  await supabase.from("indent_items").update({
    override_approved_by: approvedBy,
    override_reason: reason,
    override_approved_at: new Date().toISOString()
  }).eq("id", itemId);
}
```
3. In `inventory/indents/verification/page.tsx` — find all `localStorage.getItem/setItem` for `override_*` keys and replace with hook calls. The override state should come from `indentItems` data, not localStorage.

### Step 4 — Fix `company/users/page.tsx`
1. Create `hooks/useUsers.ts`:
```ts
// Fetches from `users` table joined with `roles`
// Returns: { users, isLoading, deactivateUser, activateUser, refresh }
```
2. Create API route `app/api/users/reset-password/route.ts`:
```ts
// POST body: { email: string }
// Uses supabase.auth.admin.generateLink({ type: 'recovery', email })
// Requires SUPABASE_SERVICE_ROLE_KEY env var
```
3. Wire dropdown items:
   - "Reset Password" → call API route → `toast.success("Reset link sent")`
   - "Deactivate User" → `useUsers.deactivateUser(userId)` → toggle `is_active = false`
   - "Manage MFA" → open an informational `Dialog` (MFA is managed via Supabase dashboard)
4. Fix CSS typo: `shadow-sh-primary` → `shadow-primary/20`
5. Refactor page to use `useUsers` hook instead of direct `useEffect + supabase.from(...)`

### Step 5 — Fix `finance/budgeting/page.tsx`
1. Wire "Create Budget" → open `Dialog` with form (name, period, amount, category) → call `useBudgets` existing `createFn`
2. Wire "History" → add state `showHistory: boolean` → filter table: `budgets.filter(b => b.status === 'closed')`
3. Wire "Allocation View" → toggle a different column set in DataTable
4. Fix "Active Periods" stat: `budgets.filter(b => b.status === 'active').length.toString()`

### Step 6 — Fix `hrms/leave/config/page.tsx`
1. Create `hooks/useLeaveTypes.ts`:
```ts
// Table: leave_types (check if exists, may need migration)
// Returns: { leaveTypes, isLoading, createLeaveType, updateLeaveType }
```
2. Wire "Define Leave Type" → `Dialog` with fields: name, max_days, is_paid, carry_forward
3. Wire row Settings buttons → edit `Dialog` pre-populated with existing leave type

### Step 7 — Fix `hrms/recruitment/page.tsx`
1. Wire "View Details" (icon button line ~350 + dropdown "View Details" line ~360) → open `CandidateDetailDialog` or navigate to `/hrms/recruitment/[id]`
2. Wire "Org Chart" → replace with `toast.info("Org Chart coming soon")` or hide button

### Step 8 — Fix `hrms/payroll/page.tsx`
1. Find the empty-state "Generate Payslips" button (line ~458)
2. Wire it to the same `handleGeneratePayslips` function used by the header button

### Step 9 — Fix `tickets/behavior/page.tsx`
1. Find "Dismiss Ticket" in the dropdown (line ~196-197)
2. Wire it to: `useBehaviorTickets.updateTicket(ticket.id, { status: 'dismissed' })`

### Step 10 — Fix `tickets/quality/page.tsx`
1. Wire "Log Discrepancy" → `Dialog` to create a quality issue record from a GRN line
2. Wire "Audit Logs" → filtered view using `useAuditLogs("quality_ticket")`

### Step 11 — Fix `services/security/page.tsx`
1. Wire "Dispatch Guard" → `Dialog` to assign guard to location/shift using existing `usePersonnelDispatches.createDispatch()`

### Step 12 — Fix `supplier/service-orders/page.tsx`
1. Refactor: replace `useEffect + supabase.from(...)` direct query with `useServicePurchaseOrders` hook (already exists at `hooks/useServicePurchaseOrders.ts`)
2. Wire "View" → navigate to `/inventory/service-purchase-orders` or open detail dialog
3. Wire "New Service Order" → create SPO dialog (check if `ServiceAcknowledgmentDialog` in `components/dialogs/` can be reused)

### Step 13 — Fix `services/masters/tasks/page.tsx`
1. Create migration `20260318000003_work_master_fields.sql`:
```sql
ALTER TABLE work_master
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
-- priority: 'low' | 'medium' | 'high'
```
2. Update `hooks/useWorkMaster.ts` to include new fields in select
3. Wire row Settings button → edit task dialog
4. Wire MoreHorizontal → dropdown with Delete action

### Step 14 — Fix all 4 Report pages (CSV export)
All 4 pages use `useAnalyticsData(type)`. Implement a shared CSV export utility:
```ts
// lib/utils/csvExport.ts
export function downloadCSV(filename: string, rows: object[]) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => r[h]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}_${Date.now()}.csv`; a.click();
}
```
Then for each report page:
- "Download Report" → `downloadCSV(...)` with the hook's data array
- "Audit Pack (PDF)" → `window.print()` (wrapped in `<style media="print">`)
- Fix `reports/financial` badge percentages → compute from `useAnalyticsData("financial")` month-over-month trends
- Fix `reports/attendance` hardcoded `"3"` → compute from actual absent count in hook data
- Fix `reports/services` `total_breaches` → add to `useAnalyticsData` return type or default to `0`

---

## Files Already Created (don't recreate)
- `supabase/migrations/20260318000001_audit_logs.sql`
- `hooks/useAuditLogs.ts`

## Files Still Needed (create fresh)
- `supabase/migrations/20260318000002_indent_price_overrides.sql`
- `supabase/migrations/20260318000003_work_master_fields.sql`
- `hooks/useUsers.ts`
- `hooks/useLeaveTypes.ts`
- `app/api/users/reset-password/route.ts`
- `src/lib/utils/csvExport.ts` (or inline in each report page)

## Key Conventions to Follow
- Use `import { supabase } from "@/src/lib/supabaseClient"` in hooks
- All pages use `"use client"` directive
- Money values → `formatCurrency()` from `@/src/lib/utils/currency`
- Dialogs → shadcn `Dialog` from `@/components/ui/dialog`
- Never edit `supabase-types.ts` or `src/types/supabase.ts` (auto-generated)
- `strict: false` — no strict null checks
