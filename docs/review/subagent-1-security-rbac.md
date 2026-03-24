# FacilityPro — Security & RBAC Audit Report
**Reviewer:** Subagent 1 (Security-focused)
**Date:** 2026-03-21
**Scope:** RBAC/Route Guards, Business Rules Enforcement, RLS Spot Check, Edge Function Security

---

## SUMMARY — Top 20 Critical/High Issues

| # | Severity | File | One-line Description |
|---|----------|------|----------------------|
| 1 | 🔴 CRITICAL | `app/api/users/reset-password/route.ts` | No session or role check — any unauthenticated request can trigger a password-reset link for any email |
| 2 | 🔴 CRITICAL | `src/lib/auth/roles.ts` (line 29) | `account` role is granted `/inventory/supplier-products` — allows a Finance user to read/modify supplier pricing outside their mandate |
| 3 | 🔴 CRITICAL | `src/lib/auth/roles.ts` (line 34) | `security_guard` is granted `/tickets` — guards can create or browse behavior tickets, quality tickets, and RTV tickets intended for supervisors |
| 4 | 🔴 CRITICAL | `docs/reference_schema.sql` (line 1056) | `employees` table RLS has `"All users can view employees"` with `USING (true)` — buyer and supplier roles can read all employee PII |
| 5 | 🔴 CRITICAL | `docs/reference_schema.sql` (line 2544) | `payroll_runs` table has RLS enabled but **zero SELECT policies** — any authenticated user calling it directly gets either all rows (if no policy = open) or zero rows; no role-scoped policy exists in the reference schema |
| 6 | 🟠 HIGH | `middleware.ts` (line 95) | `FROZEN_ROUTES` / `isRouteFrozen` is **never called** in middleware — feature-flag-disabled routes like `/reports/*`, `/service-boy`, `/assets/*` are only hidden in the sidebar, not blocked server-side |
| 7 | 🟠 HIGH | `supabase/functions/inactivity-monitor/index.ts` (line 17) | `inactivity-monitor` edge function checks `x-cron-secret` but if `CRON_SECRET` env var is **unset**, `undefined !== undefined` is `false` — making the secret check fail by default and blocking the cron |
| 8 | 🟠 HIGH | `supabase/functions/check-guard-inactivity/index.ts` (line 37) | Service role key accepted as Bearer token — if the service role key leaks, it grants permanent unauthorized invocation of all cron functions |
| 9 | 🟠 HIGH | `supabase/functions/check-checklist/index.ts` (line 72) | Shift end-time comparison uses UTC (`now.getUTCHours()`) but shift times are stored in local (Indian) timezone — reminders fire at the wrong time for IST (UTC+5:30) deployments |
| 10 | 🟠 HIGH | `hooks/useInactivityMonitor.ts` (line 13) | Inactivity threshold hardcoded to 30 minutes — never reads from `system_config.guard_inactivity_threshold_minutes`, violating SCOPE Rule 14 |
| 11 | 🟠 HIGH | `supabase/functions/check-document-expiry/index.ts` (line 85–91) | Chemical/safety_equipment expiry items are silently skipped with a `console.log` — no notification is sent for chemical expiry (SCOPE Rule 8) |
| 12 | 🟠 HIGH | `docs/reference_schema.sql` (line 2614) | `visitors` RLS policy is `FOR ALL` (read + write) for `security_guard` — guards should only INSERT and SELECT, not UPDATE or DELETE visitor records |
| 13 | 🟠 HIGH | `src/lib/auth/roles.ts` (line 39) | `storekeeper` role is granted `/tickets` broadly — allows storekeeper to read/create behavior tickets (intended for managers/supervisors only) |
| 14 | 🟠 HIGH | `hooks/useJobSessions.ts` (line 104–139) | `startSession` sets job status to `in_progress` without checking if the PPE checklist is complete for pest control technicians — SCOPE Rule 9 not enforced at the hook level |
| 15 | 🟠 HIGH | `docs/reference_schema.sql` (line 267) | `generate_payroll_cycle` SQL function is `GRANT EXECUTE TO authenticated` — any authenticated user (buyer, supplier, guard) can call this SECURITY DEFINER function and trigger payroll runs |
| 16 | 🟠 HIGH | `supabase/migrations/20260316000013_system_config.sql` | `system_config` table has no RLS enabled in this migration itself; enforcement depends entirely on the later patch in `20260317000002_fix_critical_rls.sql` — if migrations run out of order, the table is unprotected |
| 17 | 🟠 HIGH | `hooks/useAttendance.ts` (line 235) | Geo-fence check is purely client-side (`state.isWithinRange`) — a malicious actor can bypass it by spoofing GPS or calling Supabase directly; no server-side (RLS/trigger) geo-fence enforcement exists |
| 18 | 🟠 HIGH | `supabase/functions/checklist-reminders/index.ts` (line 66) | Date computed with `new Date().toISOString()` (UTC) for `response_date` comparison — will miss reminders or double-send on the day boundary for IST deployments |
| 19 | 🟡 MEDIUM | `src/lib/auth/roles.ts` (line 42) | `ac_technician` and `pest_control_technician` are both granted `/inventory` (full prefix) — they can potentially browse sale rates, warehouse data, and all supplier products, not just their own parts |
| 20 | 🟡 MEDIUM | `app/api/assets/generate-qr-batch/route.ts` (line 38–39) | `QR_MANAGEMENT_ROLES` includes `security_supervisor` — this role is not listed in SCOPE §15 as having QR code management rights; the role list was added without a corresponding SCOPE approval |

---

## PART A — RBAC & ROUTE GUARD AUDIT

### A1. Missing Session Check on Password Reset API

🔴 CRITICAL
**File:** `app/api/users/reset-password/route.ts` (line 4–28)
**Issue:** The `POST /api/users/reset-password` handler reads `email` from the request body and immediately calls `supabaseAdmin.auth.admin.generateLink()` using the **service role key**. There is no `getUser()` call, no role check, and no rate limiting. Any unauthenticated party that discovers this endpoint can generate password-reset links for any user — including admins and super_admins.
**Fix:** Add a server-side session check using `createClient` from `@/src/lib/supabase/server`, verify the caller is authenticated, and verify `get_my_app_role()` returns `admin` or `super_admin` before proceeding. Return HTTP 401 if no session, HTTP 403 if role is insufficient.

---

### A2. Account Role Can Access Inventory/Supplier-Products

🔴 CRITICAL
**File:** `src/lib/auth/roles.ts` (line 29)
**Issue:** `account: ["/dashboard", "/finance", "/reports", "/hrms/payroll", "/inventory/supplier-products"]`. The `/inventory/supplier-products` prefix grants an Account user access to all inventory sub-routes that begin with that prefix. More importantly, the general `/inventory` route is NOT in their list, but if any middleware prefix check is loose, partial overlap can occur. Additionally, per SCOPE §15, Account role is limited to financial management — reading raw supplier products is a supply chain function outside their lane.
**Fix:** Remove `/inventory/supplier-products` from the `account` role. If Account needs to view negotiated rates, add only `/finance/supplier-rates` (a more restricted path) or expose rates via the `/finance` module.

---

### A3. Security Guard Granted Access to /tickets

🔴 CRITICAL
**File:** `src/lib/auth/roles.ts` (line 34)
**Issue:** `security_guard: ["/dashboard", "/guard", "/test-guard", "/tickets", "/society", ...]`. The `/tickets` prefix covers behavior tickets (`/tickets/behavior`), quality tickets, and RTV (`/tickets/returns`). SCOPE §15 specifies guards access the Guard App only. Behavior tickets are raised BY supervisors and society managers AGAINST staff — guards reading or creating them is a security concern.
**Fix:** Remove `/tickets` from `security_guard` ROLE_ACCESS. If guards need to view only their own incident tickets, create a dedicated sub-path (e.g., `/guard/my-tickets`) and add only that.

---

### A4. Feature-Flag-Disabled Routes Not Blocked in Middleware

🟠 HIGH
**File:** `middleware.ts` (entire file); `src/lib/featureFlags.ts`
**Issue:** `featureFlags.ts` exports `FROZEN_ROUTES`, `isRouteFrozen()`, and `FROZEN_NAV_HREFS` but `middleware.ts` **never imports or calls any of these**. Routes like `/reports`, `/reports/attendance`, `/service-boy`, `/assets`, `/assets/qr-codes`, `/finance/budgeting`, etc. are only hidden in the sidebar via `filterNavigation()`. A user who knows the URL can navigate directly to these routes and the middleware will pass them through (assuming their role has the parent-prefix access). For example, a `company_hod` role can access `/hrms/*` — if `LEAVE_CONFIG_ADMIN` is disabled, `/hrms/leave/config` is only hidden from the sidebar but still reachable.
**Fix:** Import `isRouteFrozen` in `middleware.ts` and add a check after the RBAC check: if `isRouteFrozen(pathname)` returns true, return a 403 JSON response for API routes or redirect to `/dashboard?error=feature_disabled` for UI routes.

---

### A5. Buyer Role — Finance and Inventory Access

**File:** `src/lib/auth/roles.ts` (line 31)
**Verdict:** ✅ Buyer is correctly limited to `["/dashboard", "/buyer"]`. A buyer cannot reach `/finance/*` or `/inventory/*`.

---

### A6. Supplier Role — HRMS Access

**File:** `src/lib/auth/roles.ts` (line 32)
**Verdict:** ✅ `supplier` is `["/dashboard", "/supplier"]` — no access to `/hrms`.

---

### A7. Security Guard — Routes Outside Society/Guard

🟡 MEDIUM (in addition to CRITICAL above)
**File:** `src/lib/auth/roles.ts` (line 34)
**Issue:** Beyond `/tickets` (covered above), `security_guard` also has `/society` which is correct per SCOPE. However, `/hrms/attendance` grants guards access to HR attendance pages that show ALL employees' attendance, not just their own. The middleware uses prefix matching — `/hrms/attendance` will match `/hrms/attendance`, `/hrms/attendance/report`, etc.
**Fix:** Confirm that the `/hrms/attendance` page restricts its Supabase query to the current user's records. If the page shows all employees, add an RLS policy or a query filter on `employee_id = auth_user_employee_id`.

---

### A8. Service Boy — Route Scope

**File:** `src/lib/auth/roles.ts` (line 37)
**Issue:** `service_boy: ["/dashboard", "/service-boy", "/service-requests"]`. Per SCOPE §11.15, service boys should only access My Tasks and Leave Application. `/service-requests` is a broad prefix that includes the full service request list and board (admin-level views).
**Fix:** Restrict service_boy to `/service-requests/my` or create a dedicated sub-path. At minimum, ensure the `/service-requests` page has server-side filtering by assigned technician.

---

### A9. system_config Writability

**File:** `supabase/migrations/20260317000002_fix_critical_rls.sql` (line 25–28)
**Verdict:** ✅ After the patch migration, `system_config` has `"system_config_admin_full"` with `USING(get_my_app_role() IN ('admin', 'super_admin'))`. Only admin/super_admin can write. All authenticated users can read (required for client-side thresholds).
**Caveat:** The `system_config` table itself has no RLS enabled in its creation migration (`20260316000013_system_config.sql`). RLS is only enabled in the later fix migration. If migrations run in partial order, the table is unprotected. See issue #16 in Summary.

---

### A10. API Route Role Verification

**File:** `app/api/users/reset-password/route.ts`
**Issue:** As documented in A1 — no session or role check. 🔴 CRITICAL.

**File:** `app/api/assets/generate-qr-batch/route.ts`
**Verdict:** ✅ This route correctly calls `authenticateRequest()` (verifies JWT via `supabase.auth.getUser()`) and then `authorizeQrManagement()` (queries `employees.role` to verify the caller is in `QR_MANAGEMENT_ROLES`). The service role key is only used after authentication is confirmed.
**Minor concern:** `security_supervisor` is included in `QR_MANAGEMENT_ROLES` (line 39) but this is not specified in SCOPE §15 — see issue #20 in Summary.

---

### A11. Resident Role — Missing /dashboard

**File:** `src/lib/auth/roles.ts` (line 38)
**Issue:** `resident: ["/resident", "/test-resident", "/society/my-flat"]` — the resident role does NOT include `/dashboard`. However, `hasAccess()` line 58 has a special case: `if (pathname === "/dashboard") return true` for all roles. This means a resident can reach `/dashboard` even though it's not in their allowed list. Ensure the dashboard page itself handles the resident role gracefully (show a role-appropriate view, not the full admin KPI grid).

---

## PART B — BUSINESS RULES ENFORCEMENT

### Rule 1: Geo-fencing 50m Check-in

**Hook:** `hooks/useAttendance.ts`
**Enforcement:** ⚠️ **Enforced only in UI (bypassable)**
The geo-fence check is performed client-side in `clockIn()` (line 235): `if (!employeeId || !state.isWithinRange || !state.gateLocation)`. The `isWithinRange` flag comes from `navigator.geolocation` in the browser — it can be spoofed. There is no server-side RLS trigger or Postgres function that re-validates GPS coordinates against `company_locations.geo_fence_radius` before inserting the `attendance_record`. A determined user can call the Supabase `attendance_records` table directly with arbitrary coordinates.
**Fix:** Create a Postgres trigger or SECURITY DEFINER function that, on INSERT into `attendance_records`, validates that `(check_in_latitude, check_in_longitude)` is within `geo_fence_radius` meters of the assigned `company_location`. Reject the insert if out of range.

---

### Rule 2: Indent Required Before PO

**Hook:** `hooks/usePurchaseOrders.ts`
**Enforcement:** ⚠️ **Enforced only in UI (partially)**
`createPOFromIndent()` (line 511) does check `indent.status !== "approved"` before proceeding. However, `createPO()` (line 480) allows creating a PO with `indent_id` as optional — meaning a PO can be created without any indent reference. The `purchase_orders` table schema shows `indent_forward_id UUID REFERENCES indent_forwards(id)` as nullable (no `NOT NULL` constraint, reference_schema.sql line 631). There is no DB-level constraint forcing a PO to have an indent.
**Fix:** Add a `NOT NULL` constraint on `purchase_orders.indent_forward_id` at the DB level (migration), or add a CHECK constraint / trigger that blocks PO creation if no approved indent exists for the supplier/product combination.

---

### Rule 3: Material Acknowledgment Before Bill

**Hook:** `hooks/useSupplierBills.ts`
**Enforcement:** ⚠️ **Enforced only in UI**
`createBillFromGRN()` (line 326) does verify `grn.status IN ('accepted', 'partial_accepted')` (line 344) before creating a bill. However, the `createBill()` function (line ~480) allows creating a supplier bill without any GRN reference — `material_receipt_id` is optional in the schema. A supplier bill can be submitted without a material acknowledgment if created via the direct path.
**Fix:** Add a DB-level `NOT NULL` constraint or a BEFORE INSERT trigger that validates `material_receipt_id IS NOT NULL` when creating a `purchase_bills` record.

---

### Rule 4: Bad Material Blocked from Inventory

**Enforcement:** ⚠️ **Enforced only in UI**
The GRN quality ticket flow checks material condition, but the block is enforced in the front-end GRN hook logic. There is no DB trigger on `inventory` or `stock_transactions` that prevents inserting items linked to a rejected GRN. A direct DB insert would bypass this gate.
**Fix:** Add a Postgres trigger on `stock_transactions INSERT` that checks the linked GRN's quality status and rejects inserts for items with `condition IN ('damaged', 'expired', 'leaking', 'defective')`.

---

### Rule 5: Shortage Auto-Calculated

**Hook:** `hooks/useGRN.ts` (line 918: `calculateShortage`)
**Enforcement:** ⚠️ **Enforced only in UI**
`calculateShortage()` is a client-side function. Shortage notes are created via `useShortageNotes.createShortageNote()`. There is no DB trigger that auto-generates a shortage note when `grn_items.received_quantity < ordered_quantity`. The automatic calculation relies on the client calling the function and creating the note.
**Fix:** Create a Postgres trigger on `grn_items` that auto-inserts into `shortage_notes` when `received_quantity < ordered_quantity`.

---

### Rule 6: Feedback Required for Order Closure

**Hook:** `hooks/useBuyerFeedback.ts` (line 56–61)
**Enforcement:** ⚠️ **Enforced only in UI**
`submitFeedback()` updates the request status to `completed` AFTER submitting feedback. However, there is no DB-level CHECK or trigger that prevents `requests.status` from being set to `completed` without a corresponding `buyer_feedback` record existing. An admin could directly update status to `completed` without feedback.
**Fix:** Add a Postgres trigger `BEFORE UPDATE` on `requests` that, when `NEW.status = 'completed'`, verifies a `buyer_feedback` record with `request_id = NEW.id` exists.

---

### Rule 7: Supplier Rate vs. Sale Rate Both Maintained

**Hooks:** `useSupplierRates`, `useSaleProductRates`
**Enforcement:** ✅ **Partially enforced at DB level**
Both `supplier_product_rates` and `sale_product_rates` are separate tables. The application maintains them independently. There is no DB constraint forcing a `sale_product_rate` to exceed the corresponding `supplier_product_rate` (margin check). The separation itself is enforced.
**Note:** No single point of enforcement prevents selling below cost — margin validation is UI-only in rate management screens.

---

### Rule 8: Chemical Expiry Alerts

**Function:** `supabase/functions/check-document-expiry/index.ts` (line 85–91)
**Enforcement:** ❌ **Not enforced (chemical path silently skipped)**
The `check-document-expiry` function handles `item.item_type === 'document'` properly but for `item.item_type === 'chemical'` or `'safety_equipment'`, it only logs a message: `console.log('[check-document-expiry] Unhandled item type...')`. No notification is sent. SCOPE Rule 8 requires alerts for chemical expiry.
The `detect_expiring_items` RPC is expected to return chemical expiry items (via `supabase/migrations/20260316000006_chemical_expiry.sql`), but the edge function does nothing with them.
**Fix:** Implement the chemical notification branch: fetch admin/storekeeper user IDs and call `send-notification` with the chemical expiry details.

---

### Rule 9: PPE Checklist Gate Before Job in_progress

**Hook:** `hooks/useJobSessions.ts` (line 104–139)
**Enforcement:** ⚠️ **Enforced only in UI (partially)**
`startSession()` directly inserts a `job_sessions` record with `status: "started"` and updates the service request to `in_progress` without checking if a PPE checklist has been completed. The PPE gate is shown in the UI (via `JobSessionPanel`), but the hook itself does not enforce it. A pest control technician could call `startSession()` directly or via an API without completing the PPE checklist.
**Fix:** Add a check in `startSession()`: if the service request is of type `pest_control`, verify a `ppe_checklist_responses` record with `is_complete = true` exists for this technician and date before inserting. Alternatively, enforce this via an RLS WITH CHECK or a Postgres trigger.

---

### Rule 10: BGV Required for Onboarding

**Hook:** `hooks/useBackgroundVerifications.ts`
**Enforcement:** ⚠️ **Enforced only in UI**
The BGV hook tracks verification status but there is no DB-level constraint that prevents an employee from being set to `is_active = true` (onboarded) if their `background_verifications` are incomplete or rejected. The onboarding flow in the UI may check this, but a direct DB update bypasses it.
**Fix:** Add a Postgres trigger `BEFORE UPDATE` on `employees` that, when `NEW.is_active = true AND OLD.is_active = false`, checks that at least one `background_verification` with `status = 'verified'` exists for `employee_id = NEW.id`.

---

### Rule 11: Single Active Deployment Per Guard

**Hook:** `hooks/useSecurityGuards.ts`
**Enforcement:** ❌ **Not enforced at DB level**
`useSecurityGuards` does not contain any logic to prevent creating a second active deployment for a guard. The `security_guards` table has `is_active BOOLEAN` but no UNIQUE constraint prevents two rows with `employee_id = X AND is_active = true`. A guard could be deployed twice simultaneously.
**Fix:** Add a UNIQUE partial index: `CREATE UNIQUE INDEX uq_active_guard_per_employee ON security_guards(employee_id) WHERE is_active = true;`

---

### Rule 12: Service Acknowledgment Before Supplier Bill

**Hook:** `hooks/useSupplierBills.ts`
**Enforcement:** ⚠️ **Enforced only in UI**
The `createBillFromGRN()` path checks GRN status, but for service bills (staffing/SPO), there is no check that a `service_acknowledgments` record with `status = 'acknowledged'` exists before allowing a supplier bill to be submitted for that SPO. The UI shows the service acknowledgment dialog, but the bill creation hook doesn't validate it.
**Fix:** In the service bill creation path, add a DB-level check (trigger or constraint) that a `service_acknowledgments` record exists for the SPO before a `supplier_bills` record can be inserted with status `submitted`.

---

### Rule 13: OT Only Beyond Standard Shift

**Hook:** `hooks/usePayroll.ts` (line 186–207)
**Enforcement:** ⚠️ **Enforced only in UI (UI calculation only)**
The `calculateSalary()` function in `usePayroll.ts` uses `attendance.overtime_hours` directly without validating it against shift-standard hours. The comment on line 186 notes this is "UI preview only" — the authoritative calculation is in the DB function `calculate_employee_salary`. The DB function should enforce this, but verifying whether it does requires reading the full payroll SQL function in `20260211_payroll_calculation_function.sql`. The `overtime_hours` column on `attendance_logs` can be set by anyone with write access to that table (admins with wide access), so DB-level enforcement should validate OT hours.

---

### Rule 14: Guard Inactivity Threshold from system_config

**Hook:** `hooks/useInactivityMonitor.ts` (line 13)
**Enforcement:** ❌ **Not enforced — hardcoded**
`const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes` — the threshold is hardcoded to 30 minutes. It never queries `system_config` for `guard_inactivity_threshold_minutes`. Despite the system_config table having this key with a default of 30, the hook ignores it.
Similarly, `supabase/functions/check-inactivity/index.ts` (line 74) hardcodes `INACTIVITY_THRESHOLD_MINUTES = 20`, and `supabase/functions/inactivity-monitor/index.ts` (line 53) hardcodes 30 minutes. Only `check-guard-inactivity` reads the threshold as a query param (line 79), but it defaults to 15 minutes — inconsistent with the 30-minute system_config value.
**Fix:** In `useInactivityMonitor`, fetch `system_config` for `guard_inactivity_threshold_minutes` on mount and use it instead of the hardcoded constant. Update all three edge functions similarly.

---

### Rule 15: RBAC Extensible Without Schema Changes

**File:** `src/lib/auth/roles.ts`
**Enforcement:** ✅ **Partially satisfied**
New roles can be added to the `AppRole` union type and `ROLE_ACCESS` map without schema changes. The `user_role` Postgres ENUM (reference_schema.sql line 15) must be extended for new DB-level roles, but the middleware/TypeScript RBAC layer supports addition without migrations. The `get_my_app_role()` function looks up roles dynamically via the `roles` table (not a hardcoded enum check).

---

## PART C — RLS SPOT CHECK

### C1. employees — Buyer and Supplier Can Read All Employee PII

🔴 CRITICAL
**File:** `docs/reference_schema.sql` (line 1056–1059)
```sql
CREATE POLICY "All users can view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);
```
This policy grants every authenticated user — including `buyer` and `supplier` — full read access to ALL employee records, including PII fields (phone, address, emergency contact, date of birth, bank details). This is a serious data exposure issue.
**Fix:** Replace the broad read policy with role-scoped policies: admin/company_hod/account/site_supervisor can read all; guards/technicians can read their own record only; buyers and suppliers should have no access to employees.

---

### C2. payroll_runs / payroll_cycles — No Role-Scoped RLS

🟠 HIGH
**File:** `docs/reference_schema.sql` (line 2544)
RLS is enabled (`ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY`) but the reference schema contains **no SELECT/INSERT/UPDATE policy** for `payroll_runs` or `payroll_cycles`. The "Sample RLS Policies" section (line 2590) covers payslips but not the payroll run itself. If no policy exists for authenticated users, Supabase defaults to denying access (which causes dashboard breakage) — but this depends on whether the default is deny-by-default. Neither deny-by-default nor an open policy is documented.
Additionally, `GRANT EXECUTE ON FUNCTION generate_payroll_cycle(UUID, UUID) TO authenticated` (migration line 267) means any authenticated user — including buyers and guards — can invoke the payroll calculation function.
**Fix:** Add explicit policies for `payroll_runs`: only `admin`, `super_admin`, and `account` roles should be able to SELECT/INSERT/UPDATE. Restrict the `generate_payroll_cycle` GRANT to `GRANT EXECUTE ON FUNCTION generate_payroll_cycle(UUID, UUID) TO service_role`.

---

### C3. visitors — Guard Can UPDATE/DELETE

🟠 HIGH
**File:** `docs/reference_schema.sql` (line 2614–2617)
```sql
CREATE POLICY "Guards can manage visitors"
    ON visitors FOR ALL
    TO authenticated
    USING (get_user_role() IN ('security_guard', 'security_supervisor', 'society_manager', 'admin'));
```
`FOR ALL` grants SELECT, INSERT, UPDATE, and DELETE. Guards should only INSERT (register visitors) and SELECT (look up residents). Allowing UPDATE and DELETE means a guard can modify or erase visitor records — a security/audit concern.
**Fix:** Split into two policies: `FOR INSERT` and `FOR SELECT` for `security_guard`; `FOR ALL` for `security_supervisor`, `society_manager`, and `admin`.

---

### C4. system_config — Write Access Correctly Restricted

**File:** `supabase/migrations/20260317000002_fix_critical_rls.sql` (line 25–32)
**Verdict:** ✅ After the fix migration, only `admin` and `super_admin` can write. All authenticated users can read. The earlier migration (`20260316000013`) did not enable RLS — RLS is enabled in the fix migration. This order dependency is a concern (see issue #16 in Summary).

---

### C5. panic_alerts — Guard Insert Only

**File:** `docs/reference_schema.sql` (line 1145–1153)
```sql
CREATE POLICY "Guards can create panic alerts"
    ON panic_alerts FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'security_guard');
```
**Verdict:** ✅ Guards can only INSERT. Supervisors and managers can manage (ALL). This is correctly scoped.
**Minor note:** The `get_user_role()` function uses the older `user_role` enum from the reference schema. Newer migrations use `get_my_app_role()`. If both functions coexist in production, ensure they return consistent results from the same source table.

---

## PART D — EDGE FUNCTION SECURITY

### D1. send-notification — Auth Guard

**File:** `supabase/functions/send-notification/index.ts`
**Auth:** ✅ `validateAuth()` at line 54 validates a Supabase JWT via `supabase.auth.getUser()`. The service role key shortcut was explicitly removed (comment at line 50).
**CORS:** ⚠️ Falls back to `'*'` if `ALLOWED_ORIGIN` is not set (line 13). In production this must be configured. If left unset, any origin can call this function with a valid JWT.
**Deduplication:** ❌ No deduplication — if called multiple times for the same event, multiple SMS/push notifications will be sent.
**Fix:** Add deduplication: before sending, check `notification_logs` for a recent entry with the same `user_id`, `title`, and `sent_at` within the last N minutes.

---

### D2. checklist-reminders — Auth and UTC Issue

**File:** `supabase/functions/checklist-reminders/index.ts`
**Auth:** ✅ `x-cron-secret` is checked at line 23.
**Edge Case:** 🟠 If `CRON_SECRET` env var is not set, `Deno.env.get('CRON_SECRET')` returns `undefined`. The check `cronSecret !== Deno.env.get('CRON_SECRET')` becomes `undefined !== undefined` which is `false` — meaning the check **passes** when no secret is configured. This is the opposite of the issue in `inactivity-monitor` — here, a missing secret allows unauthenticated access.
**UTC/Timezone Issue:** 🟠 HIGH — `today = new Date().toISOString().split('T')[0]` (line 66) is UTC date. For IST (UTC+5:30) deployments, this will use the wrong date from 18:30 to midnight local time, potentially sending duplicate or missed reminders around midnight.
**Deduplication:** ✅ Checks for existing `checklist_responses` before sending.
**Fix:** Change date calculation to use IST offset: `const now = new Date(); now.setHours(now.getHours() + 5, now.getMinutes() + 30); today = now.toISOString().split('T')[0];` Or use a `pg_timezone` lookup.

---

### D3. inactivity-monitor — Auth Bypass When CRON_SECRET Unset

🟠 HIGH
**File:** `supabase/functions/inactivity-monitor/index.ts` (line 23–25)
```typescript
const cronSecret = req.headers.get('x-cron-secret');
if (cronSecret !== Deno.env.get('CRON_SECRET')) {
```
When `CRON_SECRET` is not set in Supabase secrets, `Deno.env.get('CRON_SECRET')` returns `undefined`. `req.headers.get('x-cron-secret')` returns `null` for a missing header. `null !== undefined` is `true`, so the auth check FAILS and returns 401 — the cron job is blocked. But if an attacker sends `x-cron-secret: undefined` as a string, `"undefined" !== undefined` is `true`, still blocked. The issue is the function silently breaks when the env var is not set rather than failing safe.
**Fix:** Explicitly guard against an unset `CRON_SECRET`: `if (!cronSecret || cronSecret !== Deno.env.get('CRON_SECRET')) { return 401; }`

---

### D4. check-guard-inactivity — Service Role Key as Bearer Token

🟠 HIGH
**File:** `supabase/functions/check-guard-inactivity/index.ts` (line 35–39)
```typescript
const authHeader = req.headers.get('Authorization');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
  return true;
}
```
Accepting the service role key as a Bearer token is a security anti-pattern. If the service role key leaks (e.g., in logs, a misconfigured CI/CD, or a compromised environment), any party can call this function with full admin privileges indefinitely. The same pattern exists in `check-checklist/index.ts`, `check-inactivity/index.ts`, and `check-incomplete-checklists/index.ts`.
**Fix:** Remove the service role key Bearer token fallback. Use only `x-cron-secret` for cron authentication. For function-to-function calls (internal), use Supabase's built-in function invocation with `Authorization: Bearer <service_role_key>` only within the Supabase network, and document it as an internal-only pattern with no public exposure.

---

### D5. check-document-expiry — Chemical Expiry Not Handled

🟠 HIGH
**File:** `supabase/functions/check-document-expiry/index.ts` (line 85–91)
As noted in Rule 8, `chemical` and `safety_equipment` item types are silently skipped. No notification is sent for chemical expiry, violating SCOPE Rule 8.
**Fix:** Add a branch to look up the responsible admin/storekeeper user IDs and invoke `send-notification` for chemical and safety_equipment expiry items.

---

### D6. check-checklist — UTC Time for IST Shift Comparison

🟠 HIGH
**File:** `supabase/functions/check-checklist/index.ts` (line 72–73)
```typescript
const now = new Date();
const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
```
Shift `end_time` values (e.g., `"20:00:00"`) are stored in IST (local time). `now.getUTCHours()` returns UTC hours, which is 5.5 hours behind IST. A guard with a shift ending at 20:00 IST would have their checklist reminder triggered at ~14:30 UTC instead of 18:00–19:30 IST (the 90–150 minute window before shift end).
**Fix:** Convert `nowMinutes` to IST: `const IST_OFFSET_MINUTES = 330; const nowMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + IST_OFFSET_MINUTES) % 1440;`

---

### D7. check-inactivity — Hardcoded Threshold, Ignores system_config

🟠 HIGH
**File:** `supabase/functions/check-inactivity/index.ts` (line 74)
`const INACTIVITY_THRESHOLD_MINUTES = 20;` is hardcoded. System config has `guard_inactivity_threshold_minutes = 30`. The function and the system_config are inconsistent. An operator cannot change the threshold without redeploying the function.
**Fix:** Before the main loop, query `system_config` for `guard_inactivity_threshold_minutes` and use that value. Fall back to 20 if not found.

---

### D8. check-incomplete-checklists — Wildcard CORS

🟡 MEDIUM
**File:** `supabase/functions/check-incomplete-checklists/index.ts` (line 14)
`'Access-Control-Allow-Origin': '*'` — while cron functions should not be called from browsers, a wildcard CORS policy on a cron function accepting `x-cron-secret` is unnecessary exposure. `check-checklist` correctly sets `ALLOWED_ORIGIN` from env (though it falls back to `''` if unset).
**Fix:** Set `'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || ''` consistently across all cron functions.

---

### D9. send-notification — Role Authorization Gap

🟡 MEDIUM
**File:** `supabase/functions/send-notification/index.ts`
**Issue:** `validateAuth()` verifies the caller has a valid JWT (is authenticated) but does NOT check the caller's role. Any authenticated user — including a `buyer`, `resident`, or `security_guard` — can call `send-notification` and send arbitrary SMS/push notifications to any `user_id` they know. This is a notification spam/phishing vector.
**Fix:** After JWT validation, query the caller's role and restrict invocation to `admin`, `super_admin`, `security_guard` (panic alerts only), or internal service-role callers only.

---

### D10. checklist-reminders — Missing ALLOWED_ORIGIN

🟡 MEDIUM
**File:** `supabase/functions/checklist-reminders/index.ts` (line 11–13)
`corsHeaders` uses `'Access-Control-Allow-Origin': '*'` (hardcoded wildcard), unlike `check-checklist` and `check-inactivity` which read from `ALLOWED_ORIGIN`. Inconsistency across functions.
**Fix:** Align all functions to use `Deno.env.get('ALLOWED_ORIGIN') || ''`.

---

## ADDITIONAL FINDINGS

### E1. Two Competing RLS Helper Functions

🟡 MEDIUM
**Files:** `docs/reference_schema.sql` (line 1017: `get_user_role()`), `supabase/migrations/20260317000001_fix_rtv_tickets_rls.sql` (line 22: `get_my_app_role()`)
Two separate SECURITY DEFINER functions exist for role lookup. The reference schema uses `get_user_role()` while the newer migrations use `get_my_app_role()`. Both look up `role_name` from the `roles`/`users` join. If the underlying `users.role_id` data is inconsistent between environments, the two functions might return different results. Additionally, older policies in the reference schema use `get_user_role()` which only knows the 12 original `user_role` enum values — not the newer roles (`resident`, `storekeeper`, `site_supervisor`, `super_admin`, `ac_technician`, `pest_control_technician`).
**Fix:** Consolidate to `get_my_app_role()` and migrate all legacy policies to use it. Deprecate `get_user_role()`.

---

### E2. test-guard/test-resident/test-delivery Routes in Production Access

🟡 MEDIUM
**File:** `src/lib/auth/roles.ts` (lines 30, 34, 35, 38)
Routes like `/test-guard`, `/test-resident`, and `/test-delivery` are in the production ROLE_ACCESS map. Per the context, these are "test interface" routes. If deployed to production, these routes exist and are accessible to their respective roles. The PWA manifest (`public/manifest.json`) even sets `start_url: /test-guard`. These test interfaces should either be renamed to production route names or explicitly blocked behind a `NODE_ENV !== 'production'` check.
**Fix:** Rename test routes to production-ready names (e.g., `/guard`, `/resident`, `/delivery`). Update `manifest.json` accordingly.

---

### E3. delivery_boy Role Allowed /logistics — Route Doesn't Exist

🟢 LOW
**File:** `src/lib/auth/roles.ts` (line 30)
`delivery_boy: ["/dashboard", "/delivery", "/test-delivery", "/logistics"]` — there is no `/logistics` directory under `app/(dashboard)/`. This entry is dead but harmless. It may be a placeholder for a future module.

---

### E4. CORS `ALLOWED_ORIGIN` Not Set in send-notification

🟠 HIGH
**File:** `supabase/functions/send-notification/index.ts` (line 13)
Falls back to `'*'` if `ALLOWED_ORIGIN` env var is not set. Given this function sends real SMS messages via MSG91, a wildcard CORS policy combined with any valid JWT allows any cross-origin attacker (with a valid session) to send SMS to arbitrary numbers.
**Fix:** Ensure `ALLOWED_ORIGIN` is always set via `supabase secrets set ALLOWED_ORIGIN=https://app.facilitypro.in` before production deploy. Add a startup assertion that crashes the function if `ALLOWED_ORIGIN` is unset or equals `'*'` in production.

---

*Report generated by subagent-1-security-rbac. No fixes were applied. All findings are for review only.*
