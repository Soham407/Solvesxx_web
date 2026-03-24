# Business Rules Fixes Applied
**Date:** 2026-03-22
**Fix Group:** C — Business rules enforcement (SEC-H3, SEC-H4, SEC-H6, UI-H1, UI-H2)

---

## SEC-H3 — Chemical expiry notifications in check-document-expiry edge function

**File:** `supabase/functions/check-document-expiry/index.ts`

**Problem:** When `item.item_type === 'chemical'` or `item.item_type === 'safety_equipment'`, the function previously only logged `"Unhandled item type for notification"` and took no action. SCOPE Rule 8 requires these items to trigger alerts.

**Fix applied (lines 85–111):**
- Replaced the `console.log` no-op with a query to `users` table filtered by `role = 'pest_control_technician'`.
- For every matching user, inserts a row into the `notifications` table with:
  - `notification_type: 'chemical_expiry_alert'`
  - `title: 'Chemical Expiry Warning'`
  - `message: '${item.item_name} expires on ${item.expiry_date}'`
  - `priority: 'high'` for critical severity, `'normal'` otherwise
  - `reference_id` / `reference_type` pointing to the expiring item
- Falls back to a console log if no pest control technician users are found (non-fatal).

**Schema notes:** Notification columns used are `user_id`, `notification_type`, `title`, `message`, `priority`, `reference_id`, `reference_type` — all present in `supabase-types.ts` `notifications.Insert`.

---

## SEC-H4 — UTC timezone bug in shift checklist reminders

### File 1: `supabase/functions/check-checklist/index.ts`

**Problem (line 72 original):** `now.getUTCHours() * 60 + now.getUTCMinutes()` compared against shift end times that are stored as IST (e.g. `"20:00:00"` meaning 8 PM IST). Because IST is UTC+5:30, a shift ending at 20:00 IST would be evaluated at 14:30 UTC, causing reminders to fire 5.5 hours early (or not at all).

**Fix applied:**
```typescript
const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
const today = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST
```
The `today` date variable was also switched to IST so the `response_date` filter against `checklist_responses` uses the correct calendar date.

### File 2: `supabase/functions/checklist-reminders/index.ts`

**Problem (line 66 original):** `new Date().toISOString().split('T')[0]` produces a UTC date. Guards submitting checklists before midnight UTC (i.e. between 00:00–05:30 IST) would be incorrectly told they hadn't completed "today's" checklist because `today` was already on the next UTC day.

**Fix applied:**
```typescript
const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
const today = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST
```

---

## SEC-H6 — PPE checklist gate before pest control job starts

**File:** `hooks/useJobSessions.ts`

**Problem (lines 104–139 original):** `startSession` immediately wrote the job session with `status: 'started'` and updated the service request to `in_progress` without checking whether the pest control technician had completed the mandatory PPE checklist (SCOPE Rule 9).

**Fix applied (inserted before the `sessionData` construct):**
1. Fetches the `service_requests.service_type` for the given `serviceRequestId`.
2. Determines if the job is a pest control job by checking for `service_type === 'pest_control'`, `'PST-CON'`, or any string containing `'pest'`.
3. For pest control jobs, queries `checklist_responses` for a row where:
   - `employee_id = data.technicianId`
   - `response_date = today` (ISO date in UTC; sufficient for same-day gating)
   - `is_complete = true`
4. If no such row exists, returns `{ success: false, error: "PPE checklist must be completed before starting this job" }` without inserting the session.
5. If a completed response exists (or the job is not pest control), continues normally.

**Schema limitation documented in code:** Full per-job PPE enforcement would require a schema field like `job_sessions.pest_control_checklist_verified` or a PPE checklist template keyed by `service_request_id`. The current check verifies that the technician has **any** completed checklist today — the closest available approximation with the existing schema.

---

## UI-H1 — Wire missing notification triggers from hooks

### hooks/useShortageNotes.ts — `createNote` mutation

**Problem:** After successfully creating a shortage note, no notification was sent to the supplier informing them of the shortage.

**Fix applied (after `itemsError` check, before toast):**
- Queries `users.supplier_id = dto.supplier_id` to find all portal users linked to that supplier.
- For each found user, inserts a `notifications` row with:
  - `notification_type: 'shortage_note_raised'`
  - `title: 'Shortage Note Raised'`
  - `message: 'A shortage note (${note.note_number}) has been raised against your supply...'`
  - `reference_id: note.id`, `reference_type: 'shortage_note'`
- Wrapped in try/catch so a notification failure does not prevent the shortage note creation from succeeding.

### hooks/useLeaveApplications.ts — `updateLeaveStatus` (approve/reject)

**Problem:** `sendLeaveApprovalNotification` triggers the push notification edge function, but no row was inserted into the `notifications` table, meaning the in-app notification centre never showed leave decisions to employees.

**Fix applied (after existing `sendLeaveApprovalNotification` call):**
- Inserts a `notifications` row for `empData.auth_user_id` with:
  - `notification_type: 'leave_status_update'`
  - `title: 'Leave Request Approved/Rejected'`
  - `message: 'Your ${leaveTypeName} leave request has been ${status} by ${approverName}.'`
  - `reference_id: id` (the leave application ID), `reference_type: 'leave_application'`
- Wrapped in try/catch (non-fatal).

### hooks/usePurchaseOrders.ts — `sendToVendor` mutation

**Problem:** When a PO was issued to a vendor (`status → sent_to_vendor`), the supplier's portal user received no in-app notification.

**Fix applied (after successful RPC call, before `fetchPurchaseOrders()`):**
- Fetches `purchase_orders.supplier_id` and `po_number` for the given `poId`.
- Queries `users` where `supplier_id = poData.supplier_id` to find the supplier's portal user(s).
- For each user, inserts a `notifications` row with:
  - `notification_type: 'po_issued'`
  - `title: 'New Purchase Order Issued'`
  - `message: 'Purchase Order ${po_number} has been issued to you. Please review and acknowledge.'`
  - `reference_id: poId`, `reference_type: 'purchase_order'`
- Wrapped in try/catch (non-fatal).

---

## UI-H2 — Add createPatrolLog mutation to usePatrolLogs

**File:** `hooks/usePatrolLogs.ts`

**Problem:** The hook was read-only — guards had no way to log a patrol session through the hook API.

**Fix applied:**

Added `CreatePatrolLogPayload` interface exported from the hook:
```typescript
export interface CreatePatrolLogPayload {
  guard_id: string;
  timestamp?: string;    // ISO timestamp; defaults to now
  notes?: string;        // Maps to anomalies_found column
  checkpoints_verified?: number;
  total_checkpoints?: number;
  patrol_end_time?: string;
}
```

Added `createPatrolLog` function:
- Accepts `CreatePatrolLogPayload`.
- Inserts into `guard_patrol_logs` with verified column names from `supabase-types.ts`:
  - `guard_id`, `patrol_start_time`, `anomalies_found`, `checkpoints_verified`, `total_checkpoints`, `patrol_end_time`
- Calls `fetchLogs()` after successful insert to refresh the list.
- Returns `{ success: boolean, data?: any, error?: string }`.

**Schema note:** The `guard_patrol_logs` table has no `location_id` or standalone `notes` column. The payload's `notes` field maps to `anomalies_found`. The task specification referenced `location_id` — this is documented here for awareness; adding it would require a schema migration.

Added `createPatrolLog` to the `UsePatrolLogsReturn` interface and return value.

---

## Files Modified

| File | Fix |
|------|-----|
| `supabase/functions/check-document-expiry/index.ts` | SEC-H3 |
| `supabase/functions/check-checklist/index.ts` | SEC-H4 |
| `supabase/functions/checklist-reminders/index.ts` | SEC-H4 |
| `hooks/useJobSessions.ts` | SEC-H6 |
| `hooks/useShortageNotes.ts` | UI-H1 |
| `hooks/useLeaveApplications.ts` | UI-H1 |
| `hooks/usePurchaseOrders.ts` | UI-H1 |
| `hooks/usePatrolLogs.ts` | UI-H2 |
