# FAILURE & ABUSE DEFENSE — FacilityPro

> What happens when things go wrong — deliberately or accidentally. Every scenario, its defense, and the honest residual risk.

_Last updated: 2026-02-15. Based on adversarial analysis of deployed system._

---

## Philosophy

This document assumes:
1. **Users are careless.** They will double-click buttons, submit forms twice, lose network mid-request, and enter bad data.
2. **Some users are malicious.** They will inspect network traffic, modify API calls, attempt to access data they shouldn't see, and try to game financial flows.
3. **Infrastructure fails.** Supabase may have downtime. Edge functions may timeout. Network connections drop mid-transaction.

The goal is not "prevent all failures" but "ensure the system remains correct, auditable, and non-exploitable under all conditions."

---

## A. ABUSE SCENARIOS

### A1. Role Escalation — "What if a buyer tries to access admin pages?"

**Attack:** User with `buyer` role manually navigates to `/finance/payments` or crafts an API call to an admin-only table.

**Defense (3 layers):**

| Layer | Defense | Effect |
|---|---|---|
| **Middleware** | `ROLE_ACCESS.buyer = ["/dashboard", "/buyer"]` — prefix check runs before page renders | → 302 redirect to `/dashboard` |
| **Database (RLS)** | `USING (buyer_id = auth.uid())` on `requests`; buyer has no RLS policy for `payments` table | → Query returns 0 rows |
| **Component** | `if (!canSeeCompliance) return <AccessDenied />` | → "Access Denied" UI (last resort) |

**Residual risk:** None for data access. UI chrome (sidebar items for other modules) is already filtered by role. The middleware runs server-side before any client code executes.

---

### A2. Data Theft via API — "What if a supplier queries another supplier's bills?"

**Attack:** Supplier modifies the Supabase client query to remove `.eq('supplier_id', myId)` and tries to fetch all purchase bills.

**Defense:**

```sql
-- RLS on purchase_bills (SELECT policy)
CREATE POLICY supplier_bills_select ON purchase_bills
  FOR SELECT USING (
    supplier_id IN (SELECT supplier_id FROM users WHERE id = auth.uid())
    OR get_user_role() IN ('admin', 'account')
  );
```

The RLS policy runs **inside the database** on every query. Even if the client SDK sends a `SELECT *` without filters, the database automatically appends the `WHERE` clause from the RLS policy. The supplier will only ever see their own bills.

**Residual risk:** None. RLS is enforced at the query planner level — not middleware, not application code. It cannot be bypassed from the client.

---

### A3. State Machine Manipulation — "What if admin tries to jump a request from 'pending' to 'paid'?"

**Attack:** Admin sends an API call: `UPDATE requests SET status = 'paid' WHERE id = '...'`

**Defense:**

```sql
-- enforce_request_status_transition() trigger
-- Calculates rank of old and new status in the allowed_states array
-- Blocks if: new_rank - old_rank > 2 (prevents skip-logic)
-- Blocks if: new_rank < old_rank (prevents backward movement, except for rejection states)

RAISE EXCEPTION 'Status jump too large: pending → paid';
```

The database will reject the UPDATE with an exception. The request stays at `pending`.

**Residual risk:** This trigger only protects the `requests` table. Other state machines (`indents`, `purchase_orders`, `material_receipts`) enforce transitions at the application layer only. A determined attacker with knowledge of the API could potentially bypass application-level guards by crafting direct Supabase SDK calls. See "Residual Risks" section below.

---

### A4. Double-Spend — "What if a payment is submitted twice?"

**Attack:** User clicks "Pay" rapidly, network is slow, two payment requests arrive at the server.

**Defense:**

```sql
CREATE UNIQUE INDEX idx_payments_idempotency 
  ON public.payments (reference_id, payment_type) 
  WHERE (status != 'failed' AND status != 'refunded');
```

First INSERT succeeds. Second INSERT fails with `unique_violation`. The database rejects the duplicate.

**Additional defense:** The UI disables the Pay button after click and shows a loading state, preventing rapid submission at the UI layer.

**Residual risk:** If the `reference_id` is different for each payment attempt (e.g., client generates a new UUID each time), the constraint won't catch it. However, our payment flow generates the `reference_id` from the bill ID + payment type, making it deterministic. Two payments for the same bill generate the same `reference_id`.

---

### A5. Audit Log Tampering — "What if admin deletes incriminating audit entries?"

**Attack:** Admin tries to DELETE rows from `audit_logs` to hide a fraudulent status change.

**Defense:**

```sql
-- RLS on audit_logs
-- INSERT: allowed for all (triggers use SECURITY DEFINER)
-- UPDATE: denied for all application roles
-- DELETE: denied for all application roles
-- Only service_role (Supabase infrastructure) can modify audit logs
```

The admin's DELETE query will silently return 0 rows affected. The audit entries remain.

**Residual risk:** A Supabase dashboard admin with `service_role` access could delete audit logs. However:
1. `service_role` access requires the Supabase dashboard password.
2. Supabase's own platform audit trail logs `service_role` operations.
3. This is equivalent to a DBA with root access — it's outside the application's trust boundary.

---

### A6. Timestamp Manipulation — "What if a guard submits a 9 AM checklist at 2 PM?"

**Attack:** Guard (or modified client app) sends `created_at: '2026-02-15T09:00:00Z'` in the checklist submission payload.

**Defense:**

```sql
-- stamp_server_time() trigger on checklist_responses, attendance_logs, visitors, etc.
CREATE OR REPLACE FUNCTION stamp_server_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := now();  -- Overwrites any client-provided value
  RETURN NEW;
END;
$$;
```

The database **overwrites** the client-provided timestamp with the actual server time. The guard's manipulation has no effect.

**Residual risk:** Clock skew between the PostgreSQL server and reality is negligible (NTP-synced). Not a practical attack vector.

---

### A7. Budget Bypass — "What if a bill exceeds the budget and no one notices?"

**Attack:** An approved bill pushes the department's spending over its allocated budget.

**Defense:**

```sql
-- update_budget_usage() trigger on purchase_bills
-- When a bill status changes to 'approved':
-- 1. Finds the linked budget
-- 2. Increments consumed_amount
-- 3. If consumed > allocated → creates a budget_alert record
-- 4. Budget alert appears on admin/account dashboards
```

The budget is updated atomically in the same transaction as the bill approval. There's no window where the bill is approved but the budget isn't updated.

**Residual risk:** Budget alerts don't BLOCK the transaction — they only ALERT. A conscious decision was made to allow over-budget spending with alerts rather than blocking, because real-world procurement sometimes requires emergency spending. The alert trail documents who knew about the overspend.

---

### A8. Visitor Data Leakage — "What if Guard A sees visitors logged by Guard B at a different gate?"

**Attack:** Guard at Gate A queries visitors to see entries at Gate B.

**Defense:**

RLS on `visitors` table scopes reads by location assignment. Guards can only see visitors at their assigned `entry_location_id`. Cross-gate visibility requires supervisor or admin role.

**Residual risk:** If a guard's `location_id` assignment is incorrectly set in the `employee_assignments` table, they could see wrong-gate data. This is a data quality issue, not a security bypass.

---

## B. FAILURE SCENARIOS

### B1. Network Drop During Payment

**Scenario:** User initiates payment, network drops after the payment is created in the DB but before the UI receives confirmation.

**What happens:**
1. Payment row is inserted in `payments` table (status: `pending` or `processing`).
2. Client receives a network error.
3. User sees "error" and tries to pay again.
4. Second INSERT fails because `idx_payments_idempotency` catches the duplicate.
5. User sees "payment already exists" error.
6. User refreshes → sees the payment with correct status.

**System state:** Correct. One payment exists. No double-charge.

---

### B2. Edge Function Timeout (SMS Notification)

**Scenario:** `send-notification` edge function times out when trying to send visitor SMS via MSG91.

**What happens:**
1. Visitor record is already created in the DB (INSERT happened before the Edge Function call).
2. Edge Function fails → SMS not delivered.
3. Visitor entry is logged correctly, but resident is not notified.

**System state:** Data is correct. Notification is lost.

**Mitigation:** The UI shows the visitor status as "awaiting_confirmation" regardless of SMS delivery. The guard can manually inform the resident via phone call (fallback).

**Residual risk:** There's no retry queue for failed SMS delivery. A failed notification is simply lost. See "Recommendations" below.

---

### B3. Concurrent Status Updates

**Scenario:** Two admins simultaneously try to advance a request's status — one from `accepted` to `indent_generated`, another from `accepted` to `rejected`.

**What happens:**
1. Both UPDATE queries arrive at the database.
2. PostgreSQL's MVCC serializes them — one runs first.
3. First UPDATE succeeds: status changes from `accepted` to (e.g.) `indent_generated`.
4. Second UPDATE fails: the `WHERE status = 'accepted'` clause no longer matches (status is now `indent_generated`). Zero rows affected.
5. If the second query uses a different approach and matches on ID only, the `enforce_request_status_transition()` trigger catches the invalid transition from `indent_generated` to `rejected` — this is a backward movement and is blocked.

**System state:** Correct. Only one status transition succeeds.

---

### B4. Supabase Downtime

**Scenario:** Supabase is unreachable for 15 minutes.

**What happens:**
1. All database queries fail.
2. Middleware session validation fails (uses Supabase Auth).
3. Users are logged out or see loading states.
4. No data mutations are possible.

**System state when restored:** Correct. No data was written during downtime, so no inconsistency exists.

**Residual risk:** If a user was mid-workflow (e.g., filling out a long form) and loses their session, they lose their unsaved work. This is standard web application behavior. There's no offline-first capability.

---

### B5. Financial Period Already Closed

**Scenario:** Account tries to create a bill with a `bill_date` falling within a closed financial period.

**What happens:**

```sql
-- check_finance_closure() trigger
-- Checks if the bill_date falls within a period where status = 'closed'
-- If yes: RAISE EXCEPTION 'Cannot create transactions in a closed period'
```

The INSERT is rejected. The UI shows an error message.

**System state:** Correct. Closed periods are immutable.

---

### B6. Orphaned Records

**Scenario:** An indent is created with `request_id` pointing to a request, but the request is somehow deleted.

**What happens:**
1. Foreign key constraint on `indents.request_id → requests.id` prevents the delete:
   ```
   ERROR: update or delete on table "requests" violates foreign key constraint
   ```
2. The request cannot be deleted while indents reference it.

**System state:** Correct. Referential integrity maintained by PostgreSQL FK constraints.

**Residual risk:** `ON DELETE CASCADE` is NOT used on financial tables. This is intentional — we prefer orphan prevention over silent deletion.

---

## C. RESIDUAL RISKS — Honest Assessment

These are known gaps that remain after Phase 7 hardening. They are documented here for transparency.

| # | Risk | Severity | Why it remains | Mitigation |
|---|---|---|---|---|
| R1 | **Secondary state machines lack DB triggers.** Only `requests.status` has `enforce_request_status_transition()`. Tables `indents`, `purchase_orders`, `material_receipts`, `reconciliations` enforce transitions in application code only. | **Medium** | Adding triggers to every state table was deferred to keep migration scope manageable. | Application-layer validation exists. RLS prevents unauthorized access. Audit trail catches any anomaly. |
| R2 | **No SMS retry queue.** Failed `send-notification` calls are lost. | **Low** | No dead-letter queue infrastructure in current Supabase plan. | Guard can call resident manually. Visitor record is unaffected. |
| R3 | **No offline-first capability.** Guards in low-connectivity areas lose unsaved work. | **Medium** | Service Worker implementation would require significant frontend rewrite. | Guards are trained to complete forms before moving to low-signal areas. |
| R4 | **`compliance_snapshots` are immutable but not cryptographically signed.** | **Low** | Adding hash-chain verification would require custom DB extension. | Snapshots are append-only via RLS. Any modification would be logged in audit trail. |
| R5 | **Supabase Storage files can be deleted by `service_role`.** | **Low** | This is a platform-level limitation. Storage RLS restricts delete to `service_role` only. | DB still references the file URL. Audit trail shows what was there. Cross-reference with Supabase's infrastructure logs. |
| R6 | **Behavior ticket status is VARCHAR, not enum.** No DB-level enforcement of valid states. | **Low** | Identified in schema gap analysis. Migration deferred. | Application validates allowed values. Audit trail catches deviations. |
| R7 | **Admin can bypass state machine trigger with `service_role` access.** | **Low** | This is inherent to any system — the DB superuser can do anything. | `service_role` key is not in client code. Only accessible via Supabase dashboard. Platform audit logs track `service_role` operations. |

---

## D. DEFENSE SUMMARY

### What is defended at the database level (cannot be bypassed by application code):

| Defense | Mechanism |
|---|---|
| Role-based data access | RLS policies (50+) using `auth.uid()` and `get_user_role()` |
| Request status integrity | `enforce_request_status_transition()` BEFORE UPDATE trigger |
| Payment idempotency | `idx_payments_idempotency` partial unique index |
| Server-authoritative timestamps | `stamp_server_time()` BEFORE INSERT trigger |
| Financial audit trail | `log_financial_audit()` AFTER INSERT/UPDATE/DELETE trigger on 11 tables |
| Audit log immutability | RLS: INSERT-only for application roles |
| Financial period controls | `check_finance_closure()` trigger blocks mutations in closed periods |
| Budget impact tracking | `update_budget_usage()` trigger on bill status changes |
| Referential integrity | Foreign key constraints (no cascading deletes on financial tables) |
| Data uniqueness | Unique constraints on attendance (employee_id + log_date), employee codes, bill numbers |

### What is defended at the application level (can be bypassed with crafted API calls):

| Defense | Mechanism | Risk if bypassed |
|---|---|---|
| Indent/PO/GRN state transitions | Application-layer validation in hooks | State inconsistency (but audited) |
| Geo-fence enforcement | `useAttendance` GPS check | Attendance from wrong location (but GPS logged) |
| Photo evidence requirements | UI enforces photo capture before form submit | Record created without photo (but flagged in compliance checks) |
| Budget alert blocking | Application chooses to allow over-budget with alert vs block | Over-budget spending (but alerted and audited) |

---

## E. ATTACK SURFACE DIAGRAM

```
                    ┌─────────────────────────────────┐
                    │        INTERNET                  │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │     Next.js Middleware           │
                    │  ┌─ Auth check (session valid?)  │
                    │  ├─ Role check (prefix allowed?)│
                    │  ├─ Security headers             │
                    │  └─ CORS (origin allowlist)      │
                    │                                  │ ← GATE 1: Rejects unauthenticated
                    │  Blocked: unauthenticated,       │    and unauthorized route access
                    │  wrong-role-for-prefix            │
                    └──────────┬──────────────────────┘
                               │ Authenticated + authorized prefix
                    ┌──────────▼──────────────────────┐
                    │     Supabase PostgREST           │
                    │                                  │
                    │  All queries pass through RLS    │ ← GATE 2: Enforces row-level
                    │  auth.uid() → USING clause       │    data isolation per query
                    │  get_user_role() → policy check  │
                    │                                  │
                    │  Blocked: cross-tenant reads,    │
                    │  unauthorized table access        │
                    └──────────┬──────────────────────┘
                               │ RLS-filtered query
                    ┌──────────▼──────────────────────┐
                    │     PostgreSQL Triggers          │
                    │                                  │
                    │  BEFORE triggers:                │ ← GATE 3: Enforces data integrity
                    │  ├─ State machine validation     │    rules on every mutation
                    │  ├─ Server timestamp stamping    │
                    │  ├─ Financial period checks      │
                    │                                  │
                    │  AFTER triggers:                 │
                    │  ├─ Audit logging (11 tables)    │
                    │  ├─ Budget usage updates         │
                    │                                  │
                    │  Unique constraints:             │
                    │  ├─ Payment idempotency          │
                    │  ├─ Attendance uniqueness        │
                    │                                  │
                    │  Blocked: invalid state jumps,   │
                    │  duplicate payments, timestamp   │
                    │  manipulation, unaudited changes  │
                    └─────────────────────────────────┘
```

**To compromise the system, an attacker must:**
1. Obtain a valid Supabase session (requires real credentials)  → bypasses Gate 1
2. Have the correct role for the data they want (assigned by admin in DB)  → bypasses Gate 2
3. Have `service_role` access to disable triggers  → bypasses Gate 3
4. Have Supabase dashboard access to modify audit logs  → erases evidence

Steps 3 and 4 are outside the application's trust boundary. They require infrastructure-level access.

---

_End of Failure & Abuse Defense._
_This document should be reviewed whenever new tables, triggers, or RLS policies are added._
_Cross-reference: SYSTEM_ARCHITECTURE.md for structure, TRUST_MODEL.md for enforcement proof._
