# Security Fixes Applied — Group A
**Date:** 2026-03-22
**Issues covered:** SEC-1, SEC-2, SEC-3, SEC-4, SEC-5, SEC-H1, SEC-H2, SEC-H5

---

## Files Changed

### 1. `app/api/users/reset-password/route.ts`
**Issue:** SEC-1 — No session or role check; any unauthenticated caller could trigger a password reset for any email using the service key.

**Changes (lines 1–62, full rewrite):**
- Added import of `createClient as createServerClient` from `@/src/lib/supabase/server` (line 3)
- On entry to `POST`, call `createServerClient()` and `supabase.auth.getUser()` (lines 12–20)
- Return `401 Unauthorized` if no session (lines 22–24)
- Query `users` table with join to `roles` to resolve `role_name` for the caller (lines 27–35)
- Return `403 Forbidden` if role is not `admin` or `super_admin` (lines 37–43)
- Original `generateLink` logic preserved and only reached after auth+authz pass (lines 45–57)

---

### 2. `src/lib/auth/roles.ts`
**Issues:** SEC-2, SEC-3, SEC-H5

**Changes:**
- **Line 29** (SEC-2): Removed `/inventory/supplier-products` from `account` role. Before: `["/dashboard", "/finance", "/reports", "/hrms/payroll", "/inventory/supplier-products"]`. After: `["/dashboard", "/finance", "/reports", "/hrms/payroll"]`.
- **Line 34** (SEC-3): Removed `/tickets` from `security_guard` role. Before: `["/dashboard", "/guard", "/test-guard", "/tickets", "/society", "/hrms/attendance", "/hrms/leave"]`. After: `["/dashboard", "/guard", "/test-guard", "/society", "/hrms/attendance", "/hrms/leave"]`.
- **Line 39** (SEC-H5): Replaced broad `/tickets` with scoped paths for `storekeeper`. Before: `["/dashboard", "/inventory", "/tickets"]`. After: `["/dashboard", "/inventory", "/tickets/quality", "/tickets/returns"]`.

---

### 3. `middleware.ts`
**Issue:** SEC-H1 — Feature-flag frozen routes only gated client-side via sidebar; not blocked at the server/middleware level.

**Changes:**
- **Line 4** (new): Added `import { isRouteFrozen } from "@/src/lib/featureFlags";`
- **Lines 91–99** (new block inserted before `return supabaseResponse`): After the RBAC `hasAccess` check passes, call `isRouteFrozen(pathname)`. If the route is frozen: return `403 JSON` for `/api/` requests; redirect to `/dashboard?error=feature_disabled` for UI requests.

---

### 4. `hooks/useInactivityMonitor.ts`
**Issue:** SEC-H2 — Inactivity threshold hardcoded to 30 minutes; cannot be configured per deployment without a code change.

**Changes:**
- **Line 3**: Added `useState` to the React import.
- **Line 14** (new): Added `const [threshold, setThreshold] = useState(30)` — state variable with 30-minute default.
- **Lines 17–38** (new `useEffect`): On mount, queries `system_config` table for `key = 'guard_inactivity_threshold_minutes'`. Parses the integer value and calls `setThreshold` if valid. Silently keeps the 30-minute default on any error or missing key.
- **Line 40** (changed): `INACTIVITY_THRESHOLD_MS` is now `threshold * 60 * 1000` (derived from state) instead of the hardcoded `30 * 60 * 1000`.
- Removed the old hardcoded `const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000` comment line.

---

### 5. `supabase/migrations/20260322000001_fix_employees_rls.sql` *(new file)*
**Issue:** SEC-4 — `employees` table RLS has `USING(true)` permitting buyer and supplier roles to read all employee PII.

**Contents:**
- Disable + re-enable RLS to force a clean policy slate.
- `DROP POLICY IF EXISTS "All users can view employees"` — removes the permissive policy.
- `CREATE POLICY "Internal staff can view employees"` — SELECT allowed only for `admin`, `super_admin`, `company_md`, `company_hod`, `account`, `storekeeper`, `site_supervisor`, `security_supervisor`, `society_manager`.
- `CREATE POLICY "Employee can view own record"` — each employee can SELECT their own row via `users.employee_id = auth.uid()` join.
- `CREATE POLICY "Admin can modify employees"` — ALL operations (INSERT/UPDATE/DELETE) restricted to `admin` and `super_admin`.

---

### 6. `supabase/migrations/20260322000002_fix_payroll_rls.sql` *(new file)*
**Issue:** SEC-5 — `payroll_runs` has RLS enabled but zero SELECT policies (no one can read). `generate_payroll_cycle()` is `GRANT EXECUTE TO authenticated`, allowing any authenticated user to trigger a payroll run.

**Contents:**
- `CREATE POLICY "Account and admin can view payroll_runs"` — SELECT allowed for `admin`, `super_admin`, `account`.
- `CREATE POLICY "Admin can modify payroll_runs"` — ALL operations restricted to `admin`, `super_admin`.
- `REVOKE EXECUTE ON FUNCTION generate_payroll_cycle FROM authenticated` — removes broad execute grant.
- `GRANT EXECUTE ON FUNCTION generate_payroll_cycle TO service_role` — restricts execution to the Supabase service role (used by server-side admin calls only).

---

## Summary Table

| Issue  | File                                              | Type            | Status |
|--------|---------------------------------------------------|-----------------|--------|
| SEC-1  | `app/api/users/reset-password/route.ts`           | Auth/Authz gate | Fixed  |
| SEC-2  | `src/lib/auth/roles.ts` line 29                   | RBAC scope      | Fixed  |
| SEC-3  | `src/lib/auth/roles.ts` line 34                   | RBAC scope      | Fixed  |
| SEC-4  | `supabase/migrations/20260322000001_fix_employees_rls.sql` | Migration (unrun) | Written |
| SEC-5  | `supabase/migrations/20260322000002_fix_payroll_rls.sql`   | Migration (unrun) | Written |
| SEC-H1 | `middleware.ts` lines 4, 91–99                    | Middleware guard | Fixed  |
| SEC-H2 | `hooks/useInactivityMonitor.ts` lines 3, 14–40    | Config from DB  | Fixed  |
| SEC-H5 | `src/lib/auth/roles.ts` line 39                   | RBAC scope      | Fixed  |
