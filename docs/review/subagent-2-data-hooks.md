# Data Layer & Hooks Audit Report
**FacilityPro — enterprise-canvas-main**
**Reviewed:** 2026-03-21
**Reviewer:** Subagent-2 (Data Hooks)

---

## SUMMARY — Top 20 Critical/High Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 CRITICAL | `hooks/useSupplierBills.ts` | Uses wrong column names — `purchase_order_id`, `material_receipt_id`, `status`, `subtotal`, `tax_amount`, `due_amount` — all absent from `purchase_bills` schema definition |
| 2 | 🔴 CRITICAL | `hooks/useBuyerFeedback.ts` (line 58) | Updates `.from("requests")` but actual table is `order_requests` — every feedback status update fails at runtime |
| 3 | 🔴 CRITICAL | `hooks/useBuyerRequests.ts` (line 114) | Queries `.from("requests")` and `.from("request_items")` but schema tables are `order_requests` / `order_request_items` |
| 4 | 🔴 CRITICAL | `hooks/usePayroll.ts` (line 274) | Queries `.from("payroll_cycles")` but reference schema only has `payroll_runs` — table name mismatch will silently return no data |
| 5 | 🔴 CRITICAL | `hooks/useServiceRequests.ts` (line 65) | Queries view `service_requests_with_details` which only exists in the Phase B archive, NOT in current deployed schema or migrations |
| 6 | 🔴 CRITICAL | `hooks/usePersonnelDispatches.ts` (line 58) | FK join `.from("locations")` does not exist in schema — correct table is `company_locations` — causes query failure |
| 7 | 🔴 CRITICAL | `hooks/usePanicAlertHistory.ts` + `usePanicAlertSubscription.ts` | Both use identical Realtime channel name `"panic-alerts-realtime"` — second subscription silently replaces first, causing message loss |
| 8 | 🟠 HIGH | `hooks/useGRN.ts` (lines 782–788) | N+1 query: `for (const [poItemId] of Object.entries(receivedByItem)) { await supabase.from("purchase_order_items").update(...)` — one DB round-trip per item; should use batch update |
| 9 | 🟠 HIGH | `hooks/useIndents.ts` (lines 537–543) | N+1 query: `for (const [itemId] of Object.entries(approvedQuantities)) { await supabase.from("indent_items").update(...)` — one DB round-trip per approved item |
| 10 | 🟠 HIGH | `hooks/usePersonnelDispatches.ts` (line 151) | Dual trigger: both Realtime subscription AND `useEffect([fetchDispatches])` call `fetchDispatches()` on mount; Realtime also calls it on any change, resulting in double initial fetch and double-update on each event |
| 11 | 🟠 HIGH | `hooks/useServiceDeliveryNotes.ts` (line 174) | Same dual-trigger pattern: both Realtime and a separate `useEffect` call `fetchNotes()` on mount — redundant fetch on every render cycle |
| 12 | 🟠 HIGH | `hooks/useNotifications.ts` | `markAsRead` and `markAllRead` silently ignore Supabase errors — failed `.update()` error is swallowed with only `console.error` |
| 13 | 🟠 HIGH | `hooks/useShortageNotes.ts` | `fetchNotes` swallows errors into `console.error` only — no `error` state is set, so the UI has no way to display fetch failures to the user |
| 14 | 🟠 HIGH | `hooks/useSupplierBills.ts` (lines 737, 762) | `recalculateBillTotals` issues two separate sequential Supabase calls without error handling on the second `.update()`; a failure silently leaves totals stale |
| 15 | 🟠 HIGH | `hooks/useGRN.ts` (lines 570–586) | `recalculateGRNTotals` suppresses errors via `console.error` only — silent failure leaves `total_received_value` stale in DB |
| 16 | 🟠 HIGH | `hooks/usePayroll.ts` (lines 797–800) | Fallback loop calls individual queries per employee when batch RPC fails — explicit N+1: `for (const employeeId of employeeIds) { await getEmployeeAttendanceFallback(...) }` |
| 17 | 🟠 HIGH | `hooks/useVisitors.ts` (line 1) | `// @ts-nocheck` suppresses the entire file — schema mismatches and runtime type errors are invisible to TypeScript compiler |
| 18 | 🟡 MEDIUM | `hooks/useSupabaseMutation.ts` | `useSupabaseMutation` does NOT auto-trigger a refetch of dependent queries after a mutation — callers must manually call `refresh()`, which is easy to forget and leads to stale UIs |
| 19 | 🟡 MEDIUM | `hooks/useSupabaseQuery.ts` (line 20) | `deps: any[] = []` — the `queryFn` closure is never included in dependencies by default; if `queryFn` captures variables that change (e.g. filters), the query will not re-run automatically |
| 20 | 🟡 MEDIUM | `hooks/useRTVTickets.ts` (lines 162–183) | Realtime subscription calls `fetchTickets()` (full re-fetch) on every change event — for high-volume tables this causes performance spikes; should apply optimistic local state update |

---

## PART A — SHARED HOOK INFRASTRUCTURE

### useSupabaseQuery

🟢 LOW
File: `hooks/lib/useSupabaseQuery.ts` (line 23)
Issue: `isLoading` is initialized to `true` which is correct. On refetch `setIsLoading(true)` is called before the query. Error is cleared with `setError(null)` on each fetch. This is functionally correct.
Fix: No fix needed.

🟡 MEDIUM
File: `hooks/lib/useSupabaseQuery.ts` (line 20)
Issue: `deps: any[] = []` parameter. The `queryFn` closure is never included in dependencies (eslint-disable comment confirms this is intentional). If a caller passes a `queryFn` that closes over changing props/state, the query will NOT re-run when those values change — it relies entirely on the caller-provided `deps` array. This is a subtle contract that is easy to misuse.
Fix: Document this explicitly in the JSDoc. Consider requiring `queryFn` to be stable (wrapped in `useCallback` at the call site) or add a warning in dev mode.

🟡 MEDIUM
File: `hooks/lib/useSupabaseMutation.ts` (line 38–53)
Issue: `useSupabaseMutation` does not invalidate/refresh any dependent queries after a successful mutation. Callers receive `{ success, data }` but must manually call `refresh()` themselves. This is fragile and frequently forgotten, causing stale UIs.
Fix: Accept an optional `onSuccess` callback or a `refresh` function reference in `MutationOptions`, and call it automatically after a successful mutation.

🟢 LOW
File: `hooks/lib/useSupabaseMutation.ts` (line 47)
Issue: When `err.message` is undefined and `options.errorMessage` is also undefined, the fallback is `"Operation failed"` — acceptable but generic.
Fix: Encourage callers to always supply `errorMessage`.

---

## PART B — CRITICAL HOOK AUDIT

### usePurchaseOrders

🟡 MEDIUM
File: `hooks/usePurchaseOrders.ts` (line 5)
Issue: `const supabase = supabaseClient as any` — full cast to `any` removes TypeScript safety for all Supabase calls in this file.
Fix: Remove the `as any` cast. Use the typed import directly, or cast individual RPC calls with their specific return types.

🟠 HIGH
File: `hooks/usePurchaseOrders.ts` (lines 950, 977, 1007, 1034, 1085)
Issue: Multiple `.rpc('transition_po_status' as any, ...)` calls. The `as any` cast hides argument type mismatches. Additionally, `rpcResult as any` means errors embedded in the result object are undetected.
Fix: Define a TypeScript interface for the RPC result and cast to it, removing the blanket `as any`.

🟢 LOW
File: `hooks/usePurchaseOrders.ts` (lines 227, 304, 527, 540)
Issue: `.select("*")` on `purchase_orders` and `indents` without `.limit()` or `.range()`. These tables can grow large.
Fix: Add `.limit(500)` as a safety ceiling or implement pagination.

### useIndents

🟠 HIGH
File: `hooks/useIndents.ts` (lines 537–543)
Issue: N+1 query pattern in `approveIndent`. When `approvedQuantities` is provided, a separate `await supabase.from("indent_items").update(...)` is issued per item in a `for` loop.
Fix: Use a PostgreSQL function (RPC) to apply all approvals in one call, or batch with a `Promise.all` (still N concurrent, but non-sequential). The proper fix is a stored procedure.

🟢 LOW
File: `hooks/useIndents.ts` (line 5)
Issue: `const supabase = supabaseClient as any` — same type-erasure issue as usePurchaseOrders.
Fix: Remove the `as any` cast.

### useGRN

🔴 CRITICAL (see summary #8)
File: `hooks/useGRN.ts` (lines 782–788)
Issue: `updatePOReceivedQuantities` loops over `Object.entries(receivedByItem)` and issues one `await supabase.from("purchase_order_items").update(...)` per item. This is a classic N+1 write pattern.
Fix: Replace with a Postgres function `update_po_item_quantities(p_updates jsonb)` that applies all updates in a single transaction.

🟠 HIGH
File: `hooks/useGRN.ts` (lines 570–586)
Issue: `recalculateGRNTotals` swallows errors silently (`console.error` only). If this fails, `total_received_value` in the DB remains incorrect with no UI feedback.
Fix: Propagate the error to the caller via `throw` or return `{ success: false }`.

🟢 LOW
File: `hooks/useGRN.ts` (lines 145–157)
Issue: `formatCurrency`, `toRupees`, and `toPaise` are re-defined locally in `useGRN.ts` instead of importing from `@/src/lib/utils/currency`. Creates inconsistency risk if the canonical implementation changes.
Fix: Remove the local definitions and import from `@/src/lib/utils/currency`.

### useSupplierBills

🔴 CRITICAL (see summary #1)
File: `hooks/useSupplierBills.ts` (multiple lines)
Issue: The hook queries and inserts to `purchase_bills` using columns `purchase_order_id`, `material_receipt_id`, `status` (draft/submitted/approved/disputed), `subtotal`, `tax_amount`, `discount_amount`, `due_amount`. The reference schema defines `purchase_bills` with `po_id` (NOT NULL, non-nullable FK), `gst_amount`, `grand_total` — no `purchase_order_id`, `material_receipt_id`, `status`, `subtotal`, `tax_amount`, or `due_amount` columns. Every query and mutation in this hook will fail at runtime.
Fix: Either (a) run a migration to add the missing columns and rename `po_id` → `purchase_order_id`, or (b) rewrite the hook to match the actual schema. Given the hook is significantly more advanced (status workflow, partial payment), option (a) with a proper migration is recommended.

🟠 HIGH
File: `hooks/useSupplierBills.ts` (lines 737–779)
Issue: `recalculateBillTotals` — the second `await supabase.from("purchase_bills").update(...)` at line 767 has no error handling. A failure silently leaves the bill total stale.
Fix: Add `if (updateError) throw updateError` and surface the error.

### usePayroll

🔴 CRITICAL (see summary #4)
File: `hooks/usePayroll.ts` (lines 272–276)
Issue: `supabase.from("payroll_cycles").select("*")` — the reference schema does not have a `payroll_cycles` table. The `archive/PhaseC/schema_phaseC.sql` defines it, and `20260211_payroll_calculation_function.sql` references it, but there is no migration in `supabase/migrations/` that creates `payroll_cycles`. The production-deployed schema uses `payroll_runs`. This query will return an empty set or error.
Fix: Create a migration to add the `payroll_cycles` table (modeled from PhaseC archive), or rename all usages to `payroll_runs` and align the hook types accordingly.

🟠 HIGH
File: `hooks/usePayroll.ts` (lines 797–800)
Issue: Fallback N+1 loop — if the batch RPC is unavailable, individual per-employee attendance queries are issued in a `for` loop.
Fix: This fallback should be removed once the batch function is confirmed deployed. Log a hard error instead of silently falling back to N+1.

🟡 MEDIUM
File: `hooks/usePayroll.ts` (lines 612, 614)
Issue: Two `// @ts-ignore` directives around jsPDF usage. While PDF generation is peripheral, this hides any future type errors in the PDF code path.
Fix: Import proper `@types/jspdf-autotable` types or use a type assertion with an explanatory comment.

### useAttendance

🟢 LOW
File: `hooks/useAttendance.ts` (lines 123–127)
Issue: Queries `attendance_logs` — matches the schema. However, `select("*")` is used on this large time-series table.
Fix: Select only the required columns: `check_in_time, check_out_time, check_in_selfie_url, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude`.

### useLeaveApplications

🟡 MEDIUM
File: `hooks/useLeaveApplications.ts` (line 73)
Issue: Uses `useToast` from `@/components/ui/use-toast` while most newer hooks use `toast` from `sonner`. Inconsistent toast systems.
Fix: Standardize on `sonner` (already used by `useSupabaseQuery` and `useSupabaseMutation`).

🟢 LOW
File: `hooks/useLeaveApplications.ts` (line 91)
Issue: `leave_types` table queried with `select('*')`. Table is small but consistent column selection is better practice.
Fix: Select only required columns.

### useVisitors

🟠 HIGH
File: `hooks/useVisitors.ts` (line 1)
Issue: `// @ts-nocheck` disables all TypeScript checks for a 500+ line hook that handles visitor creation, check-out, approval, and denial workflows. Any schema column name typos or wrong argument types are invisible.
Fix: Remove `// @ts-nocheck`. Fix the specific type errors that caused it (likely the RPC call type signatures at lines 363, 406, 445).

🟡 MEDIUM
File: `hooks/useVisitors.ts` (lines 197–219)
Issue: `fetchStats` issues 4 separate sequential `COUNT` queries to the `visitors` table. These could be a single aggregation query or a single RPC.
Fix: Create a SQL function `get_visitor_stats(today DATE)` that returns all 4 counts in one round-trip.

### useGuardChecklist

🟢 LOW
File: `hooks/useGuardChecklist.ts`
Issue: No issues found. Error handling is correct (throws `checklistError`). No Realtime subscription, no hardcoded UUIDs. Uses correct table `daily_checklists`.

### usePanicAlert

🟢 LOW
File: `hooks/usePanicAlert.ts`
Issue: Guard identity is derived server-side via `auth.getUser()` followed by an employee + guard lookup. This is the correct pattern. No hardcoded UUIDs. Good.
Fix: No fix required. The cleanup of `holdIntervalRef` and `triggerTimeoutRef` on unmount should be verified (not visible in the 80-line read, but documented as correct in comments).

### usePanicAlertSubscription + usePanicAlertHistory

🔴 CRITICAL (see summary #7)
File: `hooks/usePanicAlertSubscription.ts` (line 144) + `hooks/usePanicAlertHistory.ts` (line 298)
Issue: Both hooks subscribe using the same Supabase Realtime channel name `"panic-alerts-realtime"`. Supabase channels are identified by name — a second `.channel("panic-alerts-realtime")` call replaces the first channel subscription. If both hooks are mounted on the same page (e.g., a Society Manager dashboard), one of them will silently stop receiving events.
Fix: Use unique channel names: `"panic-alerts-subscription"` and `"panic-alerts-history"`, respectively.

### useJobSessions

🟢 LOW
File: `hooks/useJobSessions.ts`
Issue: No Realtime subscription — relies on `useJobSessionSubscription` for that. The `fetchSessions` query uses `select('*, job_photos(*), service_request:service_requests(*, location:company_locations(location_name)))` which is unbounded for large job session histories.
Fix: Add `.limit(200)` and consider date-range filtering for production scale.

### useServiceRequests

🔴 CRITICAL (see summary #5)
File: `hooks/useServiceRequests.ts` (line 65)
Issue: Queries the view `service_requests_with_details` which is defined only in `supabase/archive/PhaseB/schema_phaseB.sql`. There is no migration in `supabase/migrations/` that creates this view in the live database. The hook will receive a PostgREST "relation does not exist" error at runtime.
Fix: Either create a migration to deploy the view, or rewrite the query to directly join `service_requests` with the needed related tables.

🟡 MEDIUM
File: `hooks/useServiceRequests.ts` (line 168)
Issue: `// TODO: Calculate based on SLA` — `overdueRequests` is hardcoded to `0` in stats. SLA-based overdue calculation is missing.
Fix: Implement SLA-based overdue calculation or remove from stats until ready.

### useServiceDeliveryNotes

🟠 HIGH (see summary #11)
File: `hooks/useServiceDeliveryNotes.ts` (lines 163–174)
Issue: Realtime subscription is set up in one `useEffect`, and a separate `useEffect([fetchNotes])` also calls `fetchNotes()` on mount. This triggers two fetches on initial render, and any Realtime change triggers an extra fetch in addition to the one from the subscription handler.
Fix: Remove the redundant `useEffect(() => { fetchNotes(); }, [fetchNotes])` and call `fetchNotes()` directly in the Realtime subscription `useEffect`.

### usePersonnelDispatches

🔴 CRITICAL (see summary #6)
File: `hooks/usePersonnelDispatches.ts` (line 58)
Issue: The join `.from("personnel_dispatches").select('*, locations!deployment_site_id (name)')` references a table `locations` which does not exist in the schema. The correct table is `company_locations`, and the column is `location_name`. This join will silently return `null` for `site_name` (or fail with a schema mismatch depending on PostgREST version).
Fix: Change to `company_locations!deployment_site_id (location_name)` and update the mapping at line 75 from `d.locations?.name` to `d.company_locations?.location_name`.

🟠 HIGH (see summary #10)
File: `hooks/usePersonnelDispatches.ts` (lines 140–151)
Issue: Both a Realtime subscription (line 140–149) AND a separate `useEffect([fetchDispatches])` (line 151) exist. On mount: 2 fetches fire. On any Realtime change: another fetch fires on top of the subscription handler already calling `fetchDispatches()`.
Fix: Remove the standalone `useEffect(() => { fetchDispatches(); }, [fetchDispatches])`. Call `fetchDispatches()` once inside the Realtime `useEffect`.

### useBuyerRequests

🔴 CRITICAL (see summary #3)
File: `hooks/useBuyerRequests.ts` (lines 114, 141, 167, 195)
Issue: All queries and mutations use `.from("requests")` and `.from("request_items")`. The schema tables are `order_requests` and `order_request_items`. Every operation in this hook will fail with a "relation does not exist" error.
Fix: Replace all `"requests"` with `"order_requests"` and `"request_items"` with `"order_request_items"`.

### useBuyerFeedback

🔴 CRITICAL (see summary #2)
File: `hooks/useBuyerFeedback.ts` (line 58)
Issue: `supabase.from("requests").update({ status: "completed" })` — same wrong table name. Will silently fail (error is thrown but caught and returned as `{ success: false }`).
Fix: Change to `"order_requests"`.

🟡 MEDIUM
File: `hooks/useBuyerFeedback.ts` (lines 78–84)
Issue: `getFeedbackForRequest` uses `.from("buyer_feedback").select("*").eq("request_id", ...).single()` but does not handle the `error` field from the result. If the query fails, `null` is returned silently.
Fix: Destructure `{ data, error }` and throw or return the error.

### useShortageNotes

🟠 HIGH (see summary #13)
File: `hooks/useShortageNotes.ts` (lines 91–95)
Issue: `fetchNotes` catches errors with `console.error` only — no `error` state is set. The component using this hook has no way to detect or display fetch errors.
Fix: Add an `error` state variable and set it in the catch block. Return `error` from the hook.

### useRTVTickets

🟡 MEDIUM
File: `hooks/useRTVTickets.ts` (lines 162–183)
Issue: Realtime subscription calls `fetchTickets()` (full table re-fetch) on every `*` change event. For a high-volume returns workflow, this is wasteful. The optimistic local state update pattern used by `usePanicAlertSubscription` is better.
Fix: On INSERT payload, append the new ticket locally; on UPDATE, patch it locally; on DELETE, remove locally. Only call `fetchTickets()` for full refresh on demand.

### useNotifications

🟠 HIGH (see summary #12)
File: `hooks/useNotifications.ts` (lines 44–57, 59–72)
Issue: Both `markAsRead` and `markAllRead` call `await supabase.from("notifications").update(...)` but do not check the `error` field. A DB error silently leaves the notification unread.
Fix: Destructure `{ error }` from the Supabase call and surface the error to the caller (or via `toast.error`).

🟢 LOW
File: `hooks/useNotifications.ts` (line 30)
Issue: `.select("*").limit(50)` — good that limit is applied. No other issues.

---

## PART C — SUPABASE CLIENT MISUSE SCAN

### 'use client' importing server client

🟢 LOW
File: `app/api/waitlist/route.ts`
Issue: This is a server-side API Route Handler (Next.js `route.ts`), which correctly imports from `src/lib/supabase/server`. No `'use client'` files import the server client. No critical misuse found here.

### Mixed client imports in the same file

🟡 MEDIUM
File: Multiple hooks use `supabase as any` pattern (see full list in Part E)
Issue: Approximately 20 hooks use `const supabase = supabaseTyped as any` or `const supabase = supabaseClient as any`. This is a blanket type-erasure workaround. It is not a security bug, but it removes all compile-time safety for database calls.
Fix: Resolve the underlying TypeScript errors (usually from generated type mismatches) and remove the `as any` casts.

No file was found mixing both `supabaseClient.ts` singleton AND `createClient()` in the same component.

### `.select()` without error handling

🟡 MEDIUM
File: `hooks/useBuyerFeedback.ts` (lines 78–84)
Issue: `.select("*").eq("request_id", ...).single()` — result destructuring only captures `data`, not `error`. A DB failure returns `null` silently.
Fix: `const { data, error } = await ...` and handle `error`.

🟡 MEDIUM
File: `hooks/useNotifications.ts` (lines 44–57)
Issue: `await supabase.from("notifications").update(...)` — result is not destructured at all.
Fix: Destructure `{ error }` and surface errors.

🟡 MEDIUM
File: `hooks/useShortageNotes.ts` (lines 156–160)
Issue: `resolveNote` calls `.update()` and checks `error` — this one is OK. But `fetchNotes` at line 71 does not set error state (only `console.error`).
Fix: Set error state in catch block.

### User identity from localStorage or URL params

🟢 LOW
All audited hooks derive user identity from `supabase.auth.getUser()` — the correct server-verified pattern. No instances of reading `user_id` or `role` from `localStorage` or URL params were found in the audited hooks. The only `localStorage` comment found in `useIndents.ts` (line 71) is a comment noting that localStorage has been replaced by DB columns.

---

## PART D — PERFORMANCE & N+1 QUERIES

### N+1 Patterns

🟠 HIGH
File: `hooks/useGRN.ts` (lines 782–788)
Issue: `updatePOReceivedQuantities` — `for (const [poItemId, receivedQty] of Object.entries(receivedByItem)) { await supabase.from("purchase_order_items").update(...).eq("id", poItemId) }` — one sequential DB write per item.
Fix: Use a Postgres function `UPDATE purchase_order_items SET received_quantity = v.qty FROM (VALUES (...)) AS v(id, qty) WHERE purchase_order_items.id = v.id::uuid`.

🟠 HIGH
File: `hooks/useIndents.ts` (lines 537–543)
Issue: `approveIndent` — `for (const [itemId, approvedQty] of Object.entries(approvedQuantities)) { await supabase.from("indent_items").update(...).eq("id", itemId) }` — one write per item.
Fix: Same approach — create an RPC or use a single `UPDATE ... FROM (VALUES ...)` pattern.

🟠 HIGH
File: `hooks/usePayroll.ts` (lines 797–800)
Issue: Fallback attendance loop — `for (const employeeId of employeeIds) { const attendance = await getEmployeeAttendanceFallback(employeeId, ...) }` — one read per employee.
Fix: Remove the fallback entirely once the batch RPC is confirmed deployed, or replace with a single `.in("employee_id", employeeIds)` query.

🟡 MEDIUM
File: `hooks/useGRN.ts` (lines 854–867)
Issue: `rejectGRN` — `const updatePromises = items.map((item) => supabase.from("material_receipt_items").update(...).eq("id", item.id))` followed by `await Promise.all(updatePromises)`. This fires N concurrent writes — not sequential, but still N round-trips.
Fix: Use a single `UPDATE material_receipt_items SET ... WHERE id = ANY($1::uuid[])` via RPC.

### Unbounded `.select('*')` on Large Tables

🟡 MEDIUM
File: `hooks/usePayroll.ts` (line 274)
Issue: `supabase.from("payroll_cycles").select("*")` — no `.limit()` or `.range()`. Payroll cycles grow linearly; an organization with 5 years of history would load 60 rows — acceptable, but still missing a limit.
Fix: Add `.limit(24)` (2 years of monthly cycles) or paginate.

🟡 MEDIUM
File: `hooks/useAttendance.ts` (line 124)
Issue: `supabase.from("attendance_logs").select("*")` — `attendance_logs` is a time-series partitioned table and will become very large. However, this is filtered by `employee_id` and `log_date` (today only), so only one row is fetched. Low risk.
Fix: Explicitly select only needed columns to reduce payload size.

🟡 MEDIUM
File: `hooks/useLeaveApplications.ts` (line 111)
Issue: `supabase.from("leave_applications").select(...)` — no `.limit()`. For an organization with many employees and years of leave records, this could return thousands of rows.
Fix: Add `.limit(500)` or paginate. For admin views, add date-range filters.

🟡 MEDIUM
File: `hooks/useServiceRequests.ts` (line 64)
Issue: Uses `service_requests_with_details` view with `{ count: "exact" }` — this triggers a `COUNT(*)` scan over the full view. For large service request histories, this is expensive.
Fix: Use `.range()` pagination and avoid `count: "exact"` on every page load.

### Realtime Channel Count

The following Realtime channels are active in the codebase:
1. `audit_logs_realtime` — useAuditLogs
2. `job-sessions-${employeeId}` — useJobSessionSubscription
3. `job-photos-${employeeId}` — useJobSessionSubscription
4. `notifications-realtime` — useNotifications
5. `panic-alerts-realtime` — **usePanicAlertHistory** AND **usePanicAlertSubscription** (COLLISION)
6. `personnel-dispatches-realtime` — usePersonnelDispatches
7. `stock-levels-changes` — useReorderAlerts
8. `rtv_tickets_changes` — useRTVTickets
9. `supplier-rates-${id}` — useSupplierRateSubscription
10. `gps-tracking-realtime` — useSecurityGuards
11. `delivery-notes-realtime` — useServiceDeliveryNotes
12. `service-requests-${employeeId}` — useServiceRequestSubscription
13. `sale-rates-*` — useSaleRateSubscription
14. `visitors-realtime` — useVisitors

🟠 HIGH
If a Society Manager dashboard mounts `usePanicAlertSubscription` + `usePanicAlertHistory` + `useVisitors` + `useNotifications` + `usePersonnelDispatches` simultaneously, that is 5+ channels. Supabase's default limit is 200 channels per client, but the naming collision on `panic-alerts-realtime` (items 5 and 5 above) is a functional bug regardless.

🟡 MEDIUM
A service-boy page mounting `useJobSessionSubscription` creates 2 channels (`job-sessions-*` and `job-photos-*`) simultaneously. This is fine but worth noting.

---

## PART E — TYPE SAFETY

### `@ts-nocheck` Files (Hooks)

The following hooks have `// @ts-nocheck` suppressing all TypeScript checks:

| File | Risk Level |
|------|-----------|
| `hooks/useAnalyticsData.ts` | Medium — analytics queries may have wrong columns |
| `hooks/useAdBookings.ts` | Low |
| `hooks/useBuyerFeedback.ts` | **High** — hides the wrong table name bug |
| `hooks/useCompliance.ts` | Medium |
| `hooks/useAuditLogs.ts` | Low |
| `hooks/useBackgroundVerifications.ts` | Low |
| `hooks/useNotifications.ts` | **High** — hides missing error handling |
| `hooks/usePersonnelDispatches.ts` | **High** — hides wrong table join bug |
| `hooks/useServiceDeliveryNotes.ts` | Medium |
| `hooks/useShortageNotes.ts` | Medium |
| `hooks/useSupplierPortal.ts` | Medium |
| `hooks/useSocietyAudit.ts` | Low |
| `hooks/useSpillKits.ts` | Low |
| `hooks/useTechnicians.ts` | Low |
| `hooks/useVisitors.ts` | **High** — 500+ line critical hook with no type checking |

### `@ts-ignore` Directives

| File | Line | Context |
|------|------|---------|
| `hooks/usePayroll.ts` | 612 | jsPDF usage |
| `hooks/usePayroll.ts` | 614 | jsPDF usage |
| `hooks/useWorkMaster.ts` | 128 | Supabase query builder type issue |

### `as any` Usage in Hooks (Selected Critical Instances)

Full count of `as any` patterns in hooks: **~75 instances** across 30+ hooks.

Key high-risk instances:

| File | Usage | Risk |
|------|-------|------|
| `hooks/usePurchaseOrders.ts` (line 5) | `supabase = supabaseClient as any` | Entire hook loses type safety |
| `hooks/useIndents.ts` (line 5) | Same pattern | Entire hook loses type safety |
| `hooks/useGRN.ts` (line 5) | Same pattern | Entire hook loses type safety |
| `hooks/useSupplierBills.ts` (line 5) | Same pattern | Entire hook loses type safety |
| `hooks/useServiceRequests.ts` (line 5) | Same pattern | Entire hook loses type safety |
| `hooks/useBuyerRequests.ts` (line 5) | Same pattern | Entire hook loses type safety |

### TODO / FIXME Comments in Hooks

| File | Line | Comment |
|------|------|---------|
| `hooks/useServiceRequests.ts` | 168 | `// TODO: Calculate based on SLA` — `overdueRequests` hardcoded to `0` |
| `hooks/useReorderAlerts.ts` | 225 | `// TODO: Implement when purchase_orders table is created` — purchase_orders exists but notification implementation is missing |
| `hooks/useFinance.ts` | 7 | `// FIX: Cast at import level instead of @ts-nocheck on entire file` — acknowledged but not resolved |

### Hardcoded UUID Strings

No hardcoded UUID strings were found in any of the audited hooks. All IDs are fetched dynamically. The `service_code` lookup pattern (e.g., `PST-CON`, `PRN-ADV`) is used correctly where applicable.

---

## ADDITIONAL FINDINGS

### useAttendance — Table Name Drift

🟡 MEDIUM
File: `hooks/useAttendance.ts` (line 123)
Issue: Queries `attendance_logs` which matches the reference schema (`CREATE TABLE attendance_logs`). However, `CONTEXT.md` and several other files refer to this as `attendance_records`. This naming inconsistency in documentation may mislead future developers.
Fix: Confirm `attendance_logs` is the live table name and update any documentation references to `attendance_records`.

### useLeaveApplications — Dual Toast Systems

🟢 LOW
File: `hooks/useLeaveApplications.ts` (line 5)
Issue: Imports `useToast` from `@/components/ui/use-toast` (shadcn toast), while most newer hooks use `toast` from `sonner`. Both will work, but the UX is inconsistent (different toast styling).
Fix: Standardize all hooks on `sonner`.

### useSupplierBills — formatCurrency Dependency

🟡 MEDIUM
File: `hooks/useSupplierBills.ts` (line 143)
Issue: Imports `toRupees`, `toPaise`, `formatCurrency` from `@/src/lib/utils/currency` correctly. Then at line 901 uses `formatCurrency(payment.amount)` inside `recordPayment` to embed payment info in a notes field. This is correct but the notes field grows unboundedly with each payment record appended.
Fix: Extract payment history to a separate `bill_payments` table rather than appending to the notes field.

### useGRN — Local formatCurrency Redefinition

🟢 LOW
File: `hooks/useGRN.ts` (lines 145–157)
Issue: Defines its own `formatCurrency`, `toRupees`, and `toPaise` functions locally instead of importing from `@/src/lib/utils/currency`.
Fix: Remove local definitions; import from the canonical utility file.
