# Hook Domain Fixes Applied
**Date:** 2026-03-22
**Session:** Fix Group B — hooks/ data layer (HOOK-1 through HOOK-7, HOOK-H1 through HOOK-H6)

---

## Files Changed

### hooks/useBuyerRequests.ts — HOOK-2
**What changed:** Replaced all 5 occurrences of wrong table names in Supabase queries:
- `.from("requests")` → `.from("order_requests")` (3 occurrences: fetchRequests, createRequest, updateRequestStatus)
- `.from("request_items")` → `.from("order_request_items")` (2 occurrences: fetchRequestItems, createRequest items insert)

**Why:** The schema defines `order_requests` and `order_request_items` tables. The hook was targeting non-existent tables `requests` and `request_items`, causing every read and write to silently fail.

---

### hooks/useBuyerFeedback.ts — HOOK-3
**What changed:** Replaced 1 occurrence of wrong table name in `submitFeedback`:
- `.from("requests")` → `.from("order_requests")` in the status update after feedback insert

**Why:** Same issue as HOOK-2. The `buyer_feedback` insert was correct, but the follow-up `requests` table update was targeting the wrong table, so order status was never updated to `completed`.

---

### hooks/usePayroll.ts — HOOK-4
**What changed:** Replaced all references to the wrong table `payroll_cycles` with `payroll_runs`:
- `.from("payroll_cycles")` → `.from("payroll_runs")` in `fetchPayrollCycles`, `createPayrollCycle`, `approvePayrollCycle`, `disbursePayrollCycle` (5 query calls total)
- FK join aliases `payroll_cycles!payroll_cycle_id` → `payroll_runs!payroll_cycle_id` in `fetchPayslips` and `getPayslipsByEmployee` (2 occurrences)
- Data accessor `ps.payroll_cycles?.cycle_code` → `ps.payroll_runs?.cycle_code` (2 occurrences)

**Why:** The live schema table is `payroll_runs`. The hook was querying a non-existent `payroll_cycles` table. Column names like `payroll_cycle_id` (FK column in `payslips` table) were NOT changed — those are column names, not table names.

---

### hooks/usePersonnelDispatches.ts — HOOK-6 + HOOK-H5
**HOOK-6:** Replaced wrong table name in FK join:
- `locations!deployment_site_id (name)` → `company_locations!deployment_site_id (name)`

**Why:** The actual table is `company_locations`. Using `locations` caused the join to fail silently — `site_name` was always undefined.

**HOOK-H5:** Removed duplicate `useEffect` fetch that caused double-fetching on mount:
- Removed standalone `useEffect(() => { fetchDispatches(); }, [fetchDispatches])`
- Merged the initial `fetchDispatches()` call into the Realtime subscription `useEffect`, calling it before `.subscribe()`

**Why:** The hook had both a Realtime subscription useEffect (which calls `fetchDispatches` on every change event) AND a standalone useEffect that called `fetchDispatches` on mount. This caused two sequential fetches on every mount.

---

### hooks/usePanicAlertHistory.ts — HOOK-7
**What changed:** Renamed the Realtime channel:
- `.channel("panic-alerts-realtime")` → `.channel("panic-alerts-history")`

**Why:** Both `usePanicAlertHistory` and `usePanicAlertSubscription` were using the identical channel name `"panic-alerts-realtime"`. Supabase Realtime treats duplicate channel names as the same channel — the second subscription silently replaces the first, causing alert loss when both hooks are mounted.

---

### hooks/usePanicAlertSubscription.ts — HOOK-7
**What changed:** Renamed the Realtime channel:
- `.channel("panic-alerts-realtime")` → `.channel("panic-alerts-live")`

**Why:** Same as above — each hook needs a unique channel name.

---

### hooks/useNotifications.ts — HOOK-H3
**What changed:** Fixed swallowed errors in `markAsRead` and `markAllRead`:
- Changed both functions to destructure `{ error }` from the Supabase `.update()` call
- Added `if (error) throw error` after each Supabase call
- Added `throw err` in the `catch` block so callers can handle the error

**Why:** Both mutation functions called `await supabase...` without capturing the return value. DB errors were caught by the `catch` block but only `console.error`'d — callers had no way to detect failure and update UI accordingly.

---

### hooks/useShortageNotes.ts — HOOK-H4
**What changed:**
1. Added `error` state: `const [error, setError] = useState<string | null>(null)`
2. In `fetchNotes`: added `setError(null)` at the start, renamed local `error` variable to `fetchError` to avoid shadowing, changed `catch` block to call `setError(msg)` instead of only `console.error`
3. Added `error` to the return value

**Why:** The `fetchNotes` function was swallowing fetch errors — only logging to console, never setting any state. Components using this hook had no way to know if data failed to load.

---

### hooks/useServiceDeliveryNotes.ts — HOOK-H5
**What changed:** Removed duplicate `useEffect` fetch that caused double-fetching on mount:
- Removed standalone `useEffect(() => { fetchNotes(); }, [fetchNotes])`
- Merged the initial `fetchNotes()` call into the Realtime subscription `useEffect`, calling it before `.subscribe()`

**Why:** Same double-fetch pattern as `usePersonnelDispatches`. Two sequential fetches on every mount — one from the standalone effect, one from the Realtime subscription effect.

---

### hooks/useVisitors.ts — HOOK-H6
**What changed:** Removed `// @ts-nocheck` comment from line 1.

**Why:** The blanket `@ts-nocheck` was suppressing TypeScript checking for the entire 650-line file. On inspection, the actual type issues were already handled with targeted casts:
- `(data || []) as unknown as Visitor[]` for the main query result (line 164)
- `"checkout_visitor" as any`, `"approve_visitor" as any`, `"deny_visitor" as any` for untyped RPC calls (lines 363, 406, 445)
- `result as any` for RPC result objects (lines 370, 413, 453)

These targeted casts are sufficient — removing the blanket suppression allows TypeScript to check the rest of the file normally.

---

### hooks/useSupplierBills.ts — HOOK-1
**What changed:** Fixed multiple column name mismatches between the hook and the actual `purchase_bills` schema:

Schema reference (`docs/reference_schema.sql` lines 733–754):
- Actual columns: `po_id`, `receipt_id`, `total_amount`, `gst_amount`, `grand_total`, `payment_status`, `paid_amount`, `payment_date`, `payment_reference`
- Missing from schema: `purchase_order_id`, `material_receipt_id`, `subtotal`, `tax_amount`, `due_amount`, `status` (bill workflow)

Changes made in Supabase query strings only:
1. **FK join in `fetchSupplierBills`**: `purchase_orders!purchase_order_id` → `purchase_orders!po_id`; `material_receipts!material_receipt_id` → `material_receipts!receipt_id`
2. **Filter queries**: `.eq("purchase_order_id", ...)` → `.eq("po_id", ...)`; `.eq("material_receipt_id", ...)` → `.eq("receipt_id", ...)`
3. **`createBill` insert**: `purchase_order_id` → `po_id`, `material_receipt_id` → `receipt_id`, `subtotal` → `total_amount`, `tax_amount` → `gst_amount`, `total_amount` → `grand_total`; removed `status: "draft"` (schema has no bill status column) and `due_amount` (not in schema)
4. **`createBillFromGRN` insert**: Same column name corrections as createBill
5. **`createBillFromPO` insert**: Same column name corrections as createBill
6. **`recalculateBillTotals` update**: `subtotal` → `total_amount`, `tax_amount` → `gst_amount`, `total_amount` → `grand_total`; removed `due_amount`
7. **`recordPayment` update**: removed `due_amount` (not in schema); added `payment_date` and `payment_reference` (schema columns) from payment input
8. **`updateBill`**: added mapping from hook's `subtotal`/`tax_amount` to schema's `total_amount`/`gst_amount`/`grand_total`; deleted non-schema keys (`subtotal`, `tax_amount`, `due_amount`) from updateData before sending to Supabase

**Note:** Variable names in component logic (e.g., `bill.subtotal`, `bill.tax_amount`, `bill.due_amount`) were NOT changed — only the string arguments passed to Supabase query methods were updated. The TypeScript interface `SupplierBill` still contains these fields as they may be used in rendering logic.

---

### hooks/useGRN.ts — HOOK-H1
**What changed:** Replaced sequential `for...of` loop with `Promise.all` in `updatePOReceivedQuantities`:
```ts
// Before: N sequential awaits
for (const [poItemId, receivedQty] of Object.entries(receivedByItem)) {
  await supabase.from("purchase_order_items").update(...).eq("id", poItemId);
}

// After: parallel writes
await Promise.all(
  Object.entries(receivedByItem).map(([poItemId, receivedQty]) =>
    supabase.from("purchase_order_items").update({ received_quantity: receivedQty }).eq("id", poItemId)
  )
);
```

**Why:** Each loop iteration awaited the previous, meaning N items = N sequential round-trips. `Promise.all` sends all writes concurrently, reducing total time from O(N) sequential to approximately O(1) parallel.

---

### hooks/useIndents.ts — HOOK-H2
**What changed:** Replaced sequential `for...of` loop with `Promise.all` in `approveIndent`:
Same pattern as HOOK-H1 — N+1 sequential writes for `indent_items` quantity updates replaced with parallel `Promise.all`.

**Why:** Same reason as HOOK-H1. When approving an indent with many items, each quantity update was awaited serially.

---

## HOOK-5 — useServiceRequests.ts — No Change Required
The hook queries the `service_requests_with_details` view (line 65). Per instructions:
- The view does NOT appear in `docs/reference_schema.sql`
- However, the view IS present in `supabase-types.ts` (auto-generated from the live DB) at line 8003 as `service_requests_with_details`
- The `ServiceRequestWithDetails` type in `src/types/operations.ts` references this view from the DB types

**Conclusion:** The view exists in the deployed database (created by a migration not present in the reference schema file). The hook is left unchanged per the fix instructions ("If the view DOES exist in a migration [or live DB], leave it as-is").

---

## Summary

| Fix ID | File | Change Type | Status |
|--------|------|------------|--------|
| HOOK-1 | hooks/useSupplierBills.ts | Column name corrections (8 sites) | Applied |
| HOOK-2 | hooks/useBuyerRequests.ts | Table name × 5 | Applied |
| HOOK-3 | hooks/useBuyerFeedback.ts | Table name × 1 | Applied |
| HOOK-4 | hooks/usePayroll.ts | Table name × 9 (queries + join aliases + accessors) | Applied |
| HOOK-5 | hooks/useServiceRequests.ts | View exists in live DB — no change needed | Skipped (intentional) |
| HOOK-6 | hooks/usePersonnelDispatches.ts | Table name × 1 (FK join) | Applied |
| HOOK-7 | hooks/usePanicAlertHistory.ts | Channel rename | Applied |
| HOOK-7 | hooks/usePanicAlertSubscription.ts | Channel rename | Applied |
| HOOK-H1 | hooks/useGRN.ts | N+1 → Promise.all | Applied |
| HOOK-H2 | hooks/useIndents.ts | N+1 → Promise.all | Applied |
| HOOK-H3 | hooks/useNotifications.ts | Surface errors in markAsRead/markAllRead | Applied |
| HOOK-H4 | hooks/useShortageNotes.ts | Add error state, set on fetchNotes failure | Applied |
| HOOK-H5 | hooks/usePersonnelDispatches.ts | Remove duplicate useEffect fetch | Applied |
| HOOK-H5 | hooks/useServiceDeliveryNotes.ts | Remove duplicate useEffect fetch | Applied |
| HOOK-H6 | hooks/useVisitors.ts | Remove @ts-nocheck (targeted casts already present) | Applied |
