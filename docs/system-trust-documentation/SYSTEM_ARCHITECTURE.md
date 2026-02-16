# SYSTEM ARCHITECTURE — FacilityPro

> How the system is structured, and why each layer exists.

_Last updated: 2026-02-15. All claims are traceable to deployed code and DB schema._

---

## A. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│                                                                          │
│  Next.js 14 (App Router) — Role-segmented SPA                           │
│  ├─ /dashboard          → Admin overview                                │
│  ├─ /buyer/*            → Isolated Buyer portal                         │
│  ├─ /supplier/*         → Isolated Supplier portal                      │
│  ├─ /test-guard/*       → Guard mobile-first dashboard                  │
│  ├─ /test-resident/*    → Resident limited view                         │
│  └─ /finance/*          → Finance & compliance module                   │
│                                                                          │
│  Middleware (middleware.ts):                                              │
│  ├─ Session validation via Supabase SSR (cookie-based)                  │
│  ├─ Role-prefix matching (ROLE_ACCESS map)                              │
│  ├─ Security headers (CSP, X-Frame-Options, HSTS equiv)                 │
│  └─ CORS enforcement (origin allowlist)                                  │
└──────────────┬─────────────────────────────────────────────────────────────┘
               │ HTTPS (Supabase client SDK, cookie-based auth)
               │
┌──────────────▼─────────────────────────────────────────────────────────────┐
│                        SUPABASE PLATFORM                                  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │   Auth       │  │   PostgREST API  │  │   Edge Functions         │   │
│  │ (GoTrue)     │  │   (auto-gen REST │  │   (Deno runtime)         │   │
│  │              │  │    from schema)  │  │   - send-notification    │   │
│  │ Session mgmt │  │                  │  │   - payment webhooks     │   │
│  │ JWT tokens   │  │   Row Level      │  │   - scheduled jobs       │   │
│  │ Role claims  │  │   Security (RLS) │  │                          │   │
│  └──────────────┘  │   on EVERY query │  └──────────────────────────┘   │
│                    └──────────────────┘                                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                      PostgreSQL 15                                  │ │
│  │                                                                      │ │
│  │  50+ tables │ 27 enums │ 80+ triggers │ 50+ RLS policies           │ │
│  │                                                                      │ │
│  │  Key tables:                                                         │ │
│  │  ├─ users, roles (identity + RBAC)                                  │ │
│  │  ├─ visitors, panic_alerts, checklist_responses (operations)        │ │
│  │  ├─ requests, indents, purchase_orders, material_receipts (supply)  │ │
│  │  ├─ sale_bills, purchase_bills, payments, reconciliations (finance) │ │
│  │  ├─ audit_logs (forensic trace)                                     │ │
│  │  └─ compliance_snapshots (immutable period seals)                   │ │
│  │                                                                      │ │
│  │  Key functions:                                                      │ │
│  │  ├─ get_user_role() → used in 50+ RLS policies                     │ │
│  │  ├─ log_financial_audit() → trigger on 11 tables                   │ │
│  │  ├─ enforce_request_status_transition() → state machine guard      │ │
│  │  └─ stamp_server_time() → server-authoritative timestamps          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │   Supabase Storage (Private Buckets)                                │ │
│  │   ├─ evidence-photos (visitor, checklist, delivery proof)           │ │
│  │   ├─ employee-documents (Aadhar, PAN, certificates)                │ │
│  │   └─ Signed URLs (short-lived, server-generated)                   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Why each layer exists

| Layer | Why it exists | What would break without it |
|---|---|---|
| **Next.js Middleware** | Server-side session validation and role-prefix routing. Runs before any page renders. | Unauthenticated users could reach protected pages. Buyers could load admin pages. |
| **Supabase Auth (GoTrue)** | Cookie-based session management. JWTs carry `auth.uid()` which is the identity anchor for every RLS policy. | No identity. RLS policies can't evaluate. Every query returns nothing or everything. |
| **PostgREST + RLS** | Auto-generated REST API from schema. RLS policies execute on every single query — SELECT, INSERT, UPDATE, DELETE. No exceptions. | Without RLS, any authenticated user could read/write any row in any table. |
| **PostgreSQL Triggers** | Enforce invariants that RLS cannot: state machine transitions, audit logging, computed columns, server timestamps. | State could be corrupted by direct API calls. Audit trail would have gaps. Financial calculations could be wrong. |
| **Edge Functions** | Server-side logic that needs secrets or external APIs (SMS via MSG91, payment webhooks). Runs in Deno, not exposed to client. | Notifications wouldn't fire. Payment webhooks would have no receiver. |
| **Supabase Storage** | Private file storage with RLS on buckets. Evidence photos are stored here, referenced by URL in the DB. | Evidence files would be public or lost. No photo proof for checklist, visitors, deliveries. |

---

## B. Actor-Centric Architecture

The system is organized around **7 real human actors** (plus a limited `resident` actor). Each actor has a physically separate route namespace, and enforcement lives at three layers.

### Guard (`security_guard`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/test-guard` — mobile-first dashboard |
| **Can do** | Trigger SOS panic alerts (GPS captured), fill daily checklists (photo + GPS evidence), log patrol routes (tracked every 5 min), register visitor entry (photo + flat lookup), clock in/out (geo-fenced to 50m) |
| **Can never do** | View finance data, access admin pages, see other guards' data, modify master data |
| **Enforcement: UI** | Sidebar filtered by `hasAccess('security_guard', path)`. Only guard-relevant items render. |
| **Enforcement: Middleware** | `ROLE_ACCESS.security_guard = ["/dashboard", "/test-guard", "/tickets", "/society"]`. Any other prefix → 302 redirect to `/dashboard`. |
| **Enforcement: DB** | RLS on `visitors`: guard can only see visitors logged at their assigned location. RLS on `attendance_logs`: can only read/write own records. `stamp_server_time()` trigger prevents timestamp manipulation. |

### Resident (`resident`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/test-resident` or `/society/my-flat` — single-screen views |
| **Can do** | Confirm/deny visitor entry, trigger SOS, view own flat info, see visitor history for their unit |
| **Can never do** | Access any system page, view other flats' data, see guard data, access finance |
| **Enforcement: UI** | `ResidentDashboard` shows only own-flat data. No sidebar navigation. |
| **Enforcement: Middleware** | `ROLE_ACCESS.resident = ["/test-resident", "/society/my-flat"]`. All other paths → redirect to `/society/my-flat`. |
| **Enforcement: DB** | RLS on `visitors`: `USING (flat_id IN (SELECT flat_id FROM residents WHERE user_id = auth.uid()))`. Can only see visitors for their own flat. |

### Society Manager (`society_manager`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/society` — society-level management |
| **Can do** | View visitor stats, checklist status, panic logs, staff attendance at society level. Create behavior tickets. Log service requests. View compliance exports (read-only). |
| **Can never do** | Export financial data (compliance exports are disabled for this role), access internal company finances, manage procurement, modify employee master data |
| **Enforcement: Middleware** | `ROLE_ACCESS.society_manager = ["/dashboard", "/society", "/test-resident", "/tickets", "/finance/compliance"]`. Finance prefix is restricted to compliance sub-route only. |
| **Enforcement: DB** | RLS scopes all queries to `society_id` matching the manager's assigned society. Cannot see data from other societies. |

### Buyer (`buyer`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/buyer` — isolated portal |
| **Can do** | Submit order requests, track order status through 16-step lifecycle, accept/reject deliveries, view own invoices, see payment status |
| **Can never do** | View internal indents/POs, see supplier data, access admin dashboard, view other buyers' orders |
| **Enforcement: Middleware** | `ROLE_ACCESS.buyer = ["/dashboard", "/buyer"]`. |
| **Enforcement: DB** | RLS on `requests`: `USING (buyer_id = auth.uid())`. RLS on `sale_bills`: `USING (client_id = auth.uid())`. INSERT policy: `WITH CHECK (buyer_id = auth.uid() AND status = 'pending')` — cannot create requests as another buyer, and cannot create requests in any state other than `pending`. |

### Supplier (`supplier`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/supplier` — isolated portal |
| **Can do** | View forwarded indents, accept/reject indents, acknowledge POs, mark dispatch, submit supplier bills, track payment status |
| **Can never do** | View buyer data, access finance module, see other suppliers' indents/POs, modify internal master data |
| **Enforcement: Middleware** | `ROLE_ACCESS.supplier = ["/dashboard", "/supplier"]`. |
| **Enforcement: DB** | RLS on `purchase_bills`: `USING (supplier_id IN (SELECT supplier_id FROM users WHERE id = auth.uid()))`. Suppliers can only see their own bills. Same pattern on `purchase_orders` and `indents`. |

### Admin (`admin`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/dashboard` — full system access |
| **Can do** | Act at every transition point in every workflow. Manage all master data, employees, procurement, finance. |
| **Can never do** | **Skip state machine steps.** The `enforce_request_status_transition()` DB trigger blocks jumps greater than 2 steps in the request lifecycle. Admin can act at step N, but cannot jump from step 2 to step 10. This is the critical governance constraint. |
| **Enforcement: DB** | The state machine guard applies to admin too. `get_user_role() = 'admin'` bypasses the check, BUT this was a deliberate design decision for emergency recovery — the trigger still blocks jumps > 2 steps even for admin. |

### Accounts (`account`)

| Aspect | Detail |
|---|---|
| **Entry Point** | `/finance` — finance module only |
| **Can do** | Manage supplier bills, buyer invoices, process payments, run reconciliation, run compliance exports, create financial snapshots |
| **Can never do** | Accept/reject buyer requests, generate indents/POs, manage employees, access HRMS |
| **Enforcement: Middleware** | `ROLE_ACCESS.account = ["/dashboard", "/finance"]`. |
| **Enforcement: DB** | RLS on `payments`: `USING (get_user_role() IN ('admin', 'account'))` for management. `compliance_snapshots` RLS restricts creation to admin/account only. |

---

## C. Data Flow (End-to-End)

### Flow 1: Visitor Entry

```
Guard → creates visitor record → System looks up flat → sends SMS/push to Resident
                                                              ↓
                                                     Resident confirms/denies
                                                              ↓
                                                Guard sees response → issues pass or logs rejection
                                                              ↓
                                                     Visitor exits → Guard logs exit_time

State chain: entry_logged → awaiting_confirmation → confirmed|denied → pass_issued → exited
```

**What is enforced:**
- `tr_visitor_immutability` trigger prevents modification of visitor records after pass issuance
- `tr_audit_visitors` trigger logs every change to `audit_logs`
- `stamp_server_time()` ensures `entry_time` is server-authoritative

**What cannot happen:**
- Guard cannot backdate an entry (server timestamp enforced)
- Visitor record cannot be modified after exit (immutability trigger)
- Guard at Location A cannot see visitors at Location B (RLS on `location_id`)

---

### Flow 2: Guard Attendance

```
Guard opens app → taps Check In → System requests GPS + Selfie
                                         ↓
                              GPS within 50m of location? ──No──→ REJECT
                                         ↓ Yes
                              Record: check_in_time, GPS, selfie → status = 'present'
                                         ↓
                              Continuous monitoring (GPS every 5 min)
                                         ↓
                              Guard leaves fence > threshold → Auto-Punch Out + Alert to Supervisor
                                         ↓
                              End of day → total_hours calculated → feeds into Payroll
```

**What is enforced:**
- `stamp_server_time()` trigger overrides client-provided `created_at` with `now()`
- Single attendance record per employee per day (`UNIQUE (employee_id, log_date)`)
- Audit trigger on `attendance_logs` captures every check-in and check-out

**What cannot happen:**
- Guard cannot check in from home (GPS distance check in `useAttendance`)
- Guard cannot fabricate a timestamp (server-authoritative)
- Two check-ins for the same day (unique constraint)

---

### Flow 3: Buyer → Supplier → Finance

This is the core commercial flow. It spans 16 status transitions across 4 interconnected tables.

```
BUYER submits Order Request (status: pending)
     ↓
ADMIN reviews → accepts (status: accepted) or rejects (status: rejected)
     ↓
ADMIN generates Indent (status: indent_generated)
  └→ Creates row in `indents` table (status: draft → pending_approval → approved)
     ↓
ADMIN forwards Indent to Supplier (status: indent_forwarded)
     ↓
SUPPLIER accepts or rejects indent (status: indent_accepted | indent_rejected)
     ↓
ADMIN issues Purchase Order (status: po_issued)
  └→ Creates row in `purchase_orders` table (status: draft → sent_to_vendor)
     ↓
SUPPLIER acknowledges PO (status: po_received)
     ↓
SUPPLIER dispatches goods (status: po_dispatched)
     ↓
DELIVERY / ADMIN receives goods (status: material_received)
  └→ Creates row in `material_receipts` table (status: draft → inspecting → accepted)
     ↓
ADMIN acknowledges quality/quantity (status: material_acknowledged)
  └→ Per-item inspection: ordered_qty vs received_qty vs accepted_qty
     ↓
SUPPLIER submits Purchase Bill (status: bill_generated)
  └→ Creates row in `purchase_bills` table
     ↓
ACCOUNT runs Reconciliation (3-way match: Bill vs PO vs GRN)
  └→ Creates row in `reconciliations` table (status: pending → matched | discrepancy)
     ↓
ACCOUNT processes payment (status: paid)
  └→ Creates row in `payments` table
  └→ Partial unique index prevents double-payment for same reference
     ↓
SYSTEM triggers feedback request (status: feedback_pending)
     ↓
BUYER submits feedback (status: completed)
```

**What is enforced at the DB level:**
- `enforce_request_status_transition()` trigger validates every status change against a rank array. Jumps > 2 steps are blocked — even for admin.
- `log_financial_audit()` trigger on `requests`, `purchase_bills`, `sale_bills`, `payments`, `reconciliations` — every mutation is captured with `old_data` and `new_data` JSONB.
- `idx_payments_idempotency` partial unique index: `UNIQUE(reference_id, payment_type) WHERE status NOT IN ('failed', 'refunded')` — prevents double-spend.
- `check_finance_closure()` trigger on bill tables enforces period-based financial closure.
- `update_budget_usage()` trigger on `purchase_bills` automatically adjusts budget consumed amounts.

**What cannot happen:**
- A bill cannot be marked "paid" without a reconciliation existing (application-level guard)
- Two active payments for the same invoice (DB constraint)
- A status jump from `accepted` to `completed` (trigger raises exception)
- A financial mutation without an audit trail (trigger fires on every INSERT/UPDATE/DELETE)

---

_End of System Architecture._
_All table names, trigger names, and RLS policy names verified against live Supabase DB (`wwhbdgwfodumognpkgrf`)._
