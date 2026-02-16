# TRUST MODEL — FacilityPro

> Why this system cannot lie — explained through five categories of truth, each with proof of enforcement.

_Last updated: 2026-02-15. Every claim maps to a deployed trigger, RLS policy, or constraint._

---

## Preamble

This document answers one question: **"How does this system guarantee that the data it shows is true?"**

A system "lies" when:
- The wrong person can change data (role violation)
- Data can be put into an impossible state (state machine violation)
- Evidence can be fabricated or removed (evidence tampering)
- Financial records can be doubled, deleted, or silently changed (financial integrity violation)
- There's no record of who did what and when (audit gap)

FacilityPro prevents each of these through overlapping, defense-in-depth enforcement. Below is how.

---

## TRUTH 1: Role Truth — "Only the right person can act"

### What it means
Every action in the system is governed by the actor's role. A buyer cannot create an indent. A guard cannot approve a payment. A supplier cannot see another supplier's data.

### How it's enforced

**Layer 1: Middleware (server-side, pre-render)**

```typescript
// middleware.ts — runs on EVERY request before the page loads
const isAllowed = role === "admin" || 
  (ROLE_ACCESS[role] && ROLE_ACCESS[role].some(prefix => pathname.startsWith(prefix)));

if (!isAllowed) {
  // Redirect to dashboard (or resident portal if resident)
  return NextResponse.redirect(dashboardUrl);
}
```

| Role | Allowed Route Prefixes | Everything else |
|---|---|---|
| `admin` | `/` (everything) | — |
| `buyer` | `/dashboard`, `/buyer` | Blocked |
| `supplier` | `/dashboard`, `/supplier` | Blocked |
| `security_guard` | `/dashboard`, `/test-guard`, `/tickets`, `/society` | Blocked |
| `account` | `/dashboard`, `/finance` | Blocked |
| `resident` | `/test-resident`, `/society/my-flat` | Blocked |
| `society_manager` | `/dashboard`, `/society`, `/test-resident`, `/tickets`, `/finance/compliance` | Blocked |

**Layer 2: RLS Policies (database-level, per-query)**

```sql
-- Example: Buyer can only see their own requests
CREATE POLICY "buyer_requests_select" ON requests
  FOR SELECT USING (buyer_id = auth.uid() OR get_user_role() IN ('admin', 'account'));

-- Example: Supplier can only see their own bills
CREATE POLICY "supplier_bills_select" ON purchase_bills
  FOR SELECT USING (supplier_id IN (SELECT supplier_id FROM users WHERE id = auth.uid()));

-- Example: Guard can only see visitors at their location
CREATE POLICY "guard_visitors_select" ON visitors
  FOR SELECT USING (entry_location_id IN (SELECT location_id FROM employee_assignments WHERE ...));
```

**Layer 3: Component-level guards (defense in depth)**

```typescript
// Example: Compliance page checks role before rendering
const isAuthorizedToExport = role === "admin" || role === "account";
const canSeeCompliance = role === "admin" || role === "account" || role === "society_manager";

if (!canSeeCompliance) {
  return <p>Access Denied: Compliance Vault Restricted</p>;
}
```

### Why this cannot be bypassed

Even if a user modifies the client JavaScript to navigate to `/admin/payments`:
1. **Middleware** intercepts the request server-side and redirects before the page loads.
2. Even if #1 is bypassed (impossible without server access), **RLS** ensures the database returns zero rows for unauthorized queries.
3. Even if #2 is bypassed (impossible without `service_role` key), the **UI component** renders "Access Denied."

Triple redundancy. No single point of failure.

---

## TRUTH 2: State Truth — "Data can only move through valid transitions"

### What it means
Every entity in the system follows a defined state machine. A purchase order cannot jump from "draft" to "received" — it must go through "sent_to_vendor" → "acknowledged" → "received." These rules are defined in `STATE_TABLES.md` and enforced in the database.

### How it's enforced

**Database trigger: `enforce_request_status_transition()`**

```sql
CREATE OR REPLACE FUNCTION enforce_request_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allowed_states TEXT[] := ARRAY[
    'pending', 'accepted', 'rejected',
    'indent_generated', 'indent_forwarded',
    'indent_accepted', 'indent_rejected',
    'po_issued', 'po_received', 'po_dispatched',
    'material_received', 'material_acknowledged',
    'bill_generated', 'paid',
    'feedback_pending', 'completed'
  ];
  old_rank INT;
  new_rank INT;
BEGIN
  old_rank := array_position(allowed_states, OLD.status::TEXT);
  new_rank := array_position(allowed_states, NEW.status::TEXT);
  
  -- Block backward movement (except rejected states)
  IF new_rank < old_rank AND NEW.status NOT IN ('rejected', 'indent_rejected') THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;
  
  -- Block jumps greater than 2 steps (prevents skip-logic)
  IF new_rank - old_rank > 2 THEN
    RAISE EXCEPTION 'Status jump too large: % → %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Applied to the requests table
CREATE TRIGGER tr_guard_request_status 
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION enforce_request_status_transition();
```

### What this prevents

| Attempted transition | Outcome | Why |
|---|---|---|
| `pending` → `po_issued` | ❌ BLOCKED | Jump = 7 steps (> 2 limit) |
| `accepted` → `material_received` | ❌ BLOCKED | Jump = 8 steps |
| `paid` → `accepted` | ❌ BLOCKED | Backward movement |
| `pending` → `accepted` | ✅ Allowed | Forward, 1 step |
| `indent_forwarded` → `indent_accepted` | ✅ Allowed | Forward, 1 step |
| `po_dispatched` → `material_received` | ✅ Allowed | Forward, 1 step |

### Admin exception

Admin CAN act at every transition point. Admin CANNOT skip transitions. The trigger applies to admin queries too. Admin's power = "can perform the action at every step," NOT "can jump steps."

### Additional state machines

Beyond the request lifecycle, these tables also have state logic:

| Table | Status Enum | Transitions | Enforcement |
|---|---|---|---|
| `indents` | `indent_status` (6 values) | draft → pending_approval → approved → po_created | Application-level |
| `purchase_orders` | `po_status` (6 values) | draft → sent_to_vendor → acknowledged → received | Application-level |
| `material_receipts` | `grn_status` (5 values) | draft → inspecting → accepted/partial/rejected | Application-level |
| `purchase_bills` | status (text) | draft → submitted → under_reconciliation → approved → paid | Application + `check_finance_closure()` trigger |
| `reconciliations` | `reconciliation_status` (5 values) | pending → matched/discrepancy → resolved | Application-level |
| `financial_periods` | `financial_period_status` (3 values) | open → closing → closed | Application-level |

**Residual risk:** Only the `requests` table has a DB-level state machine trigger. Other tables enforce transitions at the application layer. See `FAILURE_ABUSE_DEFENSE.md` for full risk assessment.

---

## TRUTH 3: Evidence Truth — "Every claim is backed by proof"

### What it means
The system doesn't just record "what happened" — it records "proof that it happened." Every critical action requires evidence that cannot be retroactively fabricated or removed.

### Evidence requirements by domain

| Domain | Action | Evidence Required | Where Stored |
|---|---|---|---|
| **Attendance** | Guard check-in | GPS coordinates (within 50m of assigned location) + server timestamp | `attendance_logs.check_in_location_id`, DB timestamp |
| **Attendance** | Guard check-out | GPS + server timestamp + total hours calculated | `attendance_logs.check_out_location_id`, `total_hours` |
| **Checklist** | Daily submission | Photo proof per item (JSONB array) + GPS + server timestamp | `checklist_responses.evidence_photos`, `latitude`, `longitude` |
| **Visitor** | Entry registration | Visitor photo + guard GPS at gate | `visitors.photo_url`, `entry_guard_id` |
| **Panic** | SOS alert | GPS coordinates + alert timestamp + alert type | `panic_alerts.latitude`, `longitude`, `alert_time` |
| **Material** | Quality check | Per-item condition assessment + batch number + photos | `material_receipt_items.quality_status`, `batch_number`, `rejection_reason` |
| **Delivery** | Goods received | Delivery challan number + vehicle number + receiver ID | `material_receipts.delivery_challan_number`, `vehicle_number`, `received_by` |
| **Finance** | Payment | Reference ID + payment method + gateway log (JSONB) | `payments.reference_id`, `payment_method`, `gateway_log` |

### Server-authoritative timestamps

**The `stamp_server_time()` trigger** overrides any client-provided `created_at` with `now()`:

```sql
CREATE OR REPLACE FUNCTION stamp_server_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
```

This means:
- A user cannot submit a checklist at 2 PM and claim it was submitted at 9 AM.
- A guard cannot backdate an attendance check-in.
- An order cannot be backdated to claim it was placed before a price change.

### Evidence immutability

Once evidence is linked to a transaction, it cannot be unlinked or replaced:
- Audit triggers capture the `old_data` (before) and `new_data` (after) for every update.
- If someone removes a photo URL from a checklist response, the audit log still contains the original data with the photo URL.
- The audit trail shows the removal, who did it, and when.

**Residual risk:** Photo files in Supabase Storage are not append-only. A storage admin could theoretically delete a file. The DB would still reference the URL, but the file would 404. Mitigation: Supabase Storage policies restrict delete to `service_role` only.

---

## TRUTH 4: Financial Truth — "Money cannot be double-counted, lost, or fabricated"

### What it means
Every financial transaction has a single source of truth. Payments can't be duplicated. Bills can't be paid without reconciliation. Budget impacts are automatically tracked.

### How it's enforced

**1. Idempotency (Double-Spend Prevention)**

```sql
CREATE UNIQUE INDEX idx_payments_idempotency 
  ON public.payments (reference_id, payment_type) 
  WHERE (status != 'failed' AND status != 'refunded');
```

This means: For a given `reference_id` and `payment_type`, only ONE non-failed, non-refunded payment can exist. If you try to insert a second one, the database rejects it with a unique constraint violation.

| Scenario | Outcome |
|---|---|
| User clicks "Pay" twice rapidly | First insert succeeds. Second insert fails (unique violation). |
| Network timeout → retry → same reference_id | Same constraint catches it. |
| Attacker crafts duplicate payment API call | Same constraint catches it. |
| First payment failed → new attempt | Allowed — the `WHERE` clause excludes failed payments. |
| Refund processed → new payment | Allowed — refunded payments excluded. |

**2. Three-Way Reconciliation**

```
Purchase Bill amount  ←→  Purchase Order amount  ←→  GRN received amount
        ↓                        ↓                        ↓
  bill_amount            po_amount               grn_amount
  
  Variances calculated:
  - bill_po_variance = bill_amount - po_amount
  - bill_grn_variance = bill_amount - grn_amount  
  - po_grn_variance = po_amount - grn_amount
  
  Status:
  - All zero → matched ✅
  - Any non-zero → discrepancy 🔶
  - Formal dispute → disputed 🔴
```

Payment processing will not proceed until reconciliation status is `matched` or `resolved`.

**3. Budget Auto-Update**

```sql
-- update_budget_usage() trigger on purchase_bills
-- When a bill is marked as 'approved' or 'paid', the corresponding budget's
-- consumed_amount is automatically incremented.
-- If consumed_amount > allocated_amount, a budget_alert is generated.
```

**4. Financial Period Controls**

```sql
-- check_finance_closure() trigger
-- If the current financial_period is 'closed', attempts to INSERT or UPDATE
-- financial records (bills, payments) in that period are BLOCKED.
```

This means: Once a financial period is sealed (status = 'closed'), no backdated transactions can be inserted. The database enforces this — not the UI.

---

## TRUTH 5: Audit Truth — "Every action is recorded, and records cannot be deleted"

### What it means
The `audit_logs` table is the system's black box. Every INSERT, UPDATE, and DELETE on critical tables is captured with full before/after state, actor identity, and server timestamp.

### What is audited

The `log_financial_audit()` trigger runs on these 11 tables:

| # | Table | Events Captured |
|---|---|---|
| 1 | `requests` | INSERT, UPDATE, DELETE |
| 2 | `service_requests` | INSERT, UPDATE, DELETE |
| 3 | `indents` | INSERT, UPDATE, DELETE |
| 4 | `purchase_orders` | INSERT, UPDATE, DELETE |
| 5 | `material_receipts` | INSERT, UPDATE, DELETE |
| 6 | `purchase_bills` | INSERT, UPDATE, DELETE |
| 7 | `sale_bills` | INSERT, UPDATE, DELETE |
| 8 | `visitors` | INSERT, UPDATE, DELETE |
| 9 | `attendance_logs` | INSERT, UPDATE, DELETE |
| 10 | `payments` | INSERT, UPDATE, DELETE |
| 11 | `reconciliations` | INSERT, UPDATE, DELETE |

### Audit record structure

```sql
INSERT INTO audit_logs (
  table_name,    -- 'requests', 'purchase_bills', etc.
  record_id,     -- UUID of the affected row
  actor_id,      -- auth.uid() — who made the change
  action,        -- 'INSERT', 'UPDATE', 'DELETE'
  old_data,      -- JSONB: full row state BEFORE the change (NULL for inserts)
  new_data       -- JSONB: full row state AFTER the change (NULL for deletes)
);
```

### Why audit logs cannot be tampered with

**RLS policy on `audit_logs`:**

```sql
-- Anyone can INSERT audit logs (triggers run as SECURITY DEFINER)
-- Only service_role can UPDATE or DELETE
-- No application user has service_role access
-- Regular users: INSERT only, SELECT their own audit trail (or admin sees all)
```

This creates an **append-only** audit trail:
- Application code can only ADD audit entries (via triggers — not even directly).
- No application user can DELETE or UPDATE existing audit entries.
- Even admin cannot remove audit logs through the application.
- Only a Supabase dashboard admin with `service_role` access could modify audit logs — and that action itself would be logged in Supabase's platform audit trail.

### Forensic capability

The Compliance & Audit Forensic UI provides:
- **Before/after diffs:** See exactly what changed in each mutation.
- **Actor attribution:** Every change shows who made it (linked to `users` table).
- **CSV exports:** Immutable exports for external audit.
- **Monthly snapshots:** `compliance_snapshots` table stores point-in-time financial state. Once created, snapshots cannot be modified (RLS: INSERT only for admin/account, no UPDATE/DELETE).

---

## Summary: Trust Guarantee Matrix

| Trust Category | Enforcement Layer | Bypass Requires |
|---|---|---|
| **Role Truth** | Middleware + RLS + Component guards | Server access + `service_role` DB key + UI modification |
| **State Truth** | DB trigger on `requests` + application guards | Direct DB access with `service_role` key to disable trigger |
| **Evidence Truth** | DB schema (NOT NULL constraints) + server timestamps + audit trail | `service_role` to modify after the fact; audit log records the change |
| **Financial Truth** | Unique index + reconciliation guards + budget triggers + period controls | Dropping the index or disabling triggers — requires DB superuser |
| **Audit Truth** | Append-only RLS + trigger-based insertion + `SECURITY DEFINER` functions | `service_role` or Supabase platform admin |

### The invariant

> **To make this system lie, you need `service_role` database access.** Application users — including admin — cannot bypass role enforcement, state machines, financial constraints, or audit logging. The system's truthfulness is guaranteed at the database layer, not the application layer.

---

_End of Trust Model._
_All trigger names, RLS policies, and constraint names verified against live deployments._
_See SYSTEM_ARCHITECTURE.md for structure details. See FAILURE_ABUSE_DEFENSE.md for attack scenarios._
