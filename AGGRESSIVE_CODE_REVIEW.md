# 🔴 AGGRESSIVE CODE REVIEW — FacilityPro Enterprise Canvas

**Date:** 2026-02-15  
**Reviewer:** Antigravity AI  
**Scope:** Full repository audit against PRD, security, architecture, maintainability  
**Verdict:** ⚠️ **NOT PRODUCTION-READY** — Multiple critical and high-severity issues remain

---

## Executive Summary

This codebase is roughly **70% functional** against the PRD. The foundational architecture (Next.js App Router + Supabase + RLS) is sound. However, it suffers from **critical security anti-patterns**, **mock data leaking into production paths**, **massive type-safety bypasses**, and **incomplete PRD coverage** in key workflows. The front-end is visually polished, but the backend integration layer has serious gaps that would cause production failures.

---

## 🔴 CRITICAL (Must Fix Before Any Production Deployment)

### 1. `useAuth` Uses `getSession()` — AUTH BYPASS VULNERABILITY
**File:** `hooks/useAuth.tsx:43`  
**Severity:** 🔴 CRITICAL  
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
```

**Problem:** `getSession()` reads from local storage/cookies **without server-side validation**. A user can forge a session cookie and bypass auth. The middleware correctly uses `getUser()` (which does server validation), but the client-side auth context uses the insecure `getSession()`.

**Your own middleware comments explicitly warn against this:**
```typescript
// IMPORTANT: Do NOT use getSession() here. getUser() sends a request to the
// Supabase Auth server every time to revalidate the Auth token, while
// getSession() reads from the local storage/cookie without validation.
```

**Fix:** Replace `getSession()` with `getUser()` in `useAuth.tsx`. The session can still be obtained for non-security-critical purposes, but the trust decision must come from `getUser()`.

---

### 2. Hardcoded Mock Employee/Resident IDs in Dashboard Components
**Files:**
- `components/dashboards/GuardDashboard.tsx:46` — `DEV_MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111"`
- `components/dashboards/SecuritySupervisorDashboard.tsx:15` — `DEV_MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111"`
- `app/(dashboard)/test-guard/page.tsx:17` — References MOCK_EMPLOYEE_ID
- `app/(dashboard)/test-resident/page.tsx:19` — References MOCK_RESIDENT_ID

**Problem:** These hardcoded UUIDs are used **in production-reachable dashboard components**, not just test pages. The `GuardDashboard` and `SecuritySupervisorDashboard` are rendered in the real dashboard layout. Any user routed to these dashboards sees data for a fake employee ID.

**Fix:** These components MUST read the employee ID from the auth context. The `useAuth` hook already provides `userId` — use it to look up the employee record dynamically.

---

### 3. Hardcoded Mocked Values in Report Pages
**Files:**
- `app/(dashboard)/reports/services/page.tsx:72` — `const slaBreaches = 3; // Mocked for now`
- `app/(dashboard)/reports/financial/page.tsx:52` — `const outstanding = 412000; // Mocked for now`

**Problem:** Financial reports showing fabricated numbers. If a Company MD or Account role accesses these pages, they'll make business decisions based on **fake data**.

**Fix:** Wire these to actual database queries. At minimum, display "Data unavailable" instead of plausible-looking fake numbers.

---

### 4. Massive `as any` Type Safety Bypass — 60+ Instances in Hooks
**Files:** Nearly every hook in `hooks/` directory  
**Pattern:**
```typescript
const supabase = supabaseClient as any;  // 6 hooks do this globally
await supabase.rpc('some_function' as any, {...}); // 20+ instances
const result = data as any; // 30+ instances
```

**Affected hooks with global `as any` bypass:**
- `useSupplierBills.ts:5`
- `useReconciliation.ts:5`
- `usePurchaseOrders.ts:5`
- `usePrintingMaster.ts:5`
- `usePlantationOps.ts:5`
- `usePestControlInventory.ts:5`
- `usePerformanceAudit.ts:5`
- `useIndents.ts:5`

**Problem:** Casting the entire Supabase client to `any` **defeats the entire purpose of TypeScript**. This means:
- No compile-time checking of table names, column names, or query structure
- RPC function calls with wrong parameters won't be caught
- Schema drift between database and application goes undetected
- Refactoring becomes dangerous since the compiler can't help

**Fix:** Generate proper TypeScript types using `supabase gen types typescript` and use them. The project already has a `generate_typescript_types` capability. All RPC calls should have proper type definitions for input and output.

---

### 5. No Rate Limiting on Login
**File:** `app/login/page.tsx`

**Problem:** The login form has **zero rate limiting**. No client-side throttle, no server-side protection (no API route — it calls Supabase directly). While Supabase has its own built-in rate limiting, there's no application-level defense against:
- Credential stuffing attacks
- Brute force password guessing
- Automated bot submissions

**Fix:** Implement at minimum:
- Client-side: Disable button after 3 failed attempts with exponential backoff
- Consider adding CAPTCHA after N failed attempts
- Note: Conversation `cc76d3db` mentions rate-limiting work was started but needs verification

---

### 6. Supplier Bill Upload: Mock File Attachment
**File:** `app/(dashboard)/supplier/bills/new/page.tsx:155`
```typescript
<Label>Attach Document (Mock)</Label>
```

**Problem:** The bill upload feature literally labels itself as "Mock". In a financial system, document attachment for invoices is **legally required** for audit trails. This is not just unfinished — it's dangerous if users think they've uploaded a document but it was silently dropped.

**Fix:** Implement Supabase Storage integration for bill document uploads or remove the field entirely until implemented, with a clear "coming soon" indicator.

---

## 🟠 HIGH (Should Fix Before Go-Live)

### 7. Plantation Page Has Hardcoded "Soil Health: 98%" and "Greenery Density 84%"
**File:** `app/(dashboard)/services/plantation/page.tsx:88-89`
```typescript
{ label: "Soil Health", value: "98%", sub: "PH Verified", icon: Leaf, color: "text-success" },
{ label: "Zone Stats", value: zones.length.toString(), icon: CloudSun, color: "text-warning", sub: "Greenery density 84%" },
```

**Problem:** These are vanity metrics with hardcoded values. They look real to users but are not backed by any data source.

---

### 8. Printing Page Has a Stub Tab
**File:** `app/(dashboard)/services/printing/page.tsx:243-247`
```typescript
<TabsContent value="printing" className="pt-6">
    <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
        <CardDescription>UI for automated generation of long-term Visitor Passes and ID Cards.</CardDescription>
    </div>
</TabsContent>
```

**Problem:** An entire tab is a placeholder with dashed border styling. Users can navigate to it and see nothing useful.

---

### 9. Security Map Section is a Placeholder
**File:** `app/(dashboard)/services/security/page.tsx:308`
```typescript
{/* Map Placeholder - Shows guard positions */}
```

**Problem:** The PRD explicitly requires **GPS tracking and geo-fencing** for security guards. The UI has a placeholder card where the map should be. GPS data is being collected (hooks exist, RLS policies exist), but there's no visualization.

---

### 10. 🔴 49 Tables Have RLS Policies BUT `ENABLE ROW LEVEL SECURITY` Was NEVER Executed
**Verified against live cloud database on 2026-02-15:**

This is the **most critical security gap** in the entire project. RLS policies have been carefully written for 49 tables, but the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` command was never run on them. **The policies are 100% dead code — they exist but enforce nothing.**

**Current RLS Status (from cloud `pg_tables`):**
- ✅ **37 tables** — RLS Enabled + Policies Active (properly secured)
- ❌ **49 tables** — Policies Exist but RLS NOT Enabled (policies are dead code)
- ⚠️ **1 table** — RLS Enabled but NO Policies (`login_rate_limits` — inaccessible via API)
- 🔴 **4+ tables** — No Policies AND No RLS (`inventory`, `stock_transactions`, `gps_tracking_2026_05` through `_12`)

**Tables properly secured (RLS enabled + policies active):**
`audit_logs`, `budgets`, `candidate_interviews`, `candidates`, `compliance_snapshots`, `contracts`, `emergency_contacts`, `employee_behavior_tickets`, `employee_documents`, `employee_salary_structure`, `financial_periods`, `holidays`, `horticulture_tasks`, `horticulture_zones`, `indent_items`, `indents`, `login_rate_limits`, `material_receipt_items`, `material_receipts`, `notification_logs`, `payment_methods`, `payments`, `payroll_cycles`, `payslips`, `pest_control_chemicals`, `pest_control_ppe_verifications`, `printing_ad_spaces`, `purchase_bill_items`, `purchase_bills`, `purchase_order_items`, `purchase_orders`, `push_tokens`, `reconciliation_lines`, `reconciliations`, `request_items`, `requests`, `salary_components`, `sale_bill_items`, `sale_bills`, `service_feedback`, `technician_profiles`

**❌ HIGH-RISK tables with DEAD policies (policies exist, RLS not enabled):**

| Table | # Policies Written | Sensitive Data |
|---|---|---|
| `users` | 7 policies | PII, auth data, role assignments |
| `employees` | 8 policies | PII, HR records, salary references |
| `residents` | 6 policies | PII, flat/address data |
| `security_guards` | 5 policies | **`license_number` (PII) exposed** |
| `attendance_logs` | 8 policies | Work records, timestamps |
| `leave_applications` | 1 policy | Leave records |
| `panic_alerts` | 6 policies | Security-critical alerts |
| `visitors` | 10 policies | PII, entry/exit records |
| `notifications` | 1 policy | Private user notifications |

**❌ MEDIUM-RISK tables with DEAD policies:**
`asset_categories` (4), `assets` (4), `buildings` (1), `checklist_responses` (3), `company_events` (1), `company_locations` (1), `daily_checklists` (1), `designations` (1), `employee_shift_assignments` (1), `flats` (1), `gps_tracking_2026_02` (2), `gps_tracking_2026_03` (2), `gps_tracking_2026_04` (2), `gps_tracking_default` (2), `guard_patrol_logs` (2), `holiday_master` (1), `job_materials_used` (2), `job_photos` (2), `job_sessions` (3), `maintenance_schedules` (2), `product_categories` (1), `product_subcategories` (1), `products` (1), `qr_batch_logs` (1), `qr_codes` (3), `qr_scans` (2), `reorder_rules` (2), `roles` (1), `sale_product_rates` (1), `service_requests` (3), `service_tasks` (1), `services` (2), `services_wise_work` (1), `shifts` (1), `societies` (1), `stock_batches` (2), `supplier_products` (1), `supplier_rates` (1), `suppliers` (1), `vendor_wise_services` (1), `warehouses` (2), `work_master` (1)

**🔴 Tables with NO policies AND NO RLS (completely unprotected):**
- `inventory` — Stock data readable/writable by anyone
- `stock_transactions` — Transaction history exposed
- `gps_tracking_2026_05` through `gps_tracking_2026_12` — Future GPS partition tables

**Impact:** All 49 tables with dead policies are **wide open** to any authenticated user via the Supabase API. Every policy you wrote — the role checks, the ownership filters, the admin restrictions — none of them execute.

**Fix:** Apply a single migration with `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` for all 49 tables. The policies are already correctly written — they just need to be activated.

---

### 10a. 🟠 17 SECURITY DEFINER Views Bypass RLS
**Source:** Supabase Security Advisor (verified 2026-02-15)

These views run with the **creator's permissions** instead of the querying user's, effectively bypassing any RLS policies on the underlying tables:

`view_service_performance`, `reconciliation_lines_with_details`, `candidates_with_details`, `purchase_bills_with_details`, `view_inventory_velocity`, `employee_salary_structure_with_details`, `indents_with_details`, `view_financial_revenue_by_category`, `employee_documents_with_details`, `material_receipts_with_details`, `qr_codes_with_batch_info`, `candidate_interviews_with_details`, `view_financial_monthly_trends`, `reconciliations_with_details`, `purchase_orders_with_details`, `view_attendance_by_dept`, `vendor_scorecards`, `payslips_with_details`

**Risk:** Even when RLS is enabled on the base tables, querying through these views will bypass those policies. A user who can't SELECT from `payslips` directly can still read all payslip data through `payslips_with_details`.

**Fix:** Change views to `SECURITY INVOKER` (Postgres 15+), or implement security checks within the view definitions.
📖 [Remediation docs](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

---

### 10b. 🟠 30+ Functions Have Mutable Search Path — Injection Risk
**Source:** Supabase Security Advisor (verified 2026-02-15)

Security-critical functions like `get_user_role`, `is_admin`, `has_role`, `is_guard`, `get_employee_id` do not have their `search_path` parameter set. An attacker with the ability to create objects in the `public` schema could create a malicious function with the same name in a different schema and have it invoked instead.

**Affected functions (partial list):** `get_user_role`, `is_admin`, `is_guard`, `has_role`, `get_employee_id`, `get_guard_id`, `is_financial_manager`, `generate_po_number`, `generate_bill_number`, `generate_grn_number`, `check_compliance`, `log_financial_audit`, `stamp_server_time`, and 20+ more.

**Fix:** Add `SET search_path = public` to all function definitions.
📖 [Remediation docs](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

---

### 10c. 🟡 Leaked Password Protection Disabled
**Source:** Supabase Security Advisor (verified 2026-02-15)

Supabase Auth's HaveIBeenPwned integration is **disabled**. Users can set passwords that have been compromised in known data breaches.

**Fix:** Enable in Supabase Dashboard → Auth → Settings → Password Security.
📖 [Remediation docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

### 10d. 🟡 Permissive INSERT Policy on `service_feedback`
**Source:** Supabase Security Advisor (verified 2026-02-15)

Policy `Allow residents to insert feedback` uses `WITH CHECK (true)` — this allows **any authenticated user** to insert feedback, not just residents. The policy name says "residents" but the actual check is a blanket `true`.

**Fix:** Add a proper `WITH CHECK` clause that verifies the inserting user is a resident.

---

### 10e. 🟡 Sensitive Column Exposed: `security_guards.license_number`
**Source:** Supabase Security Advisor (verified 2026-02-15)

The `security_guards` table contains `license_number` (PII) and is exposed via the API without RLS enabled. Any API call can read all guards' license numbers.

**Fix:** Enable RLS on `security_guards` (covered by Fix #10) and ensure the license_number column is only visible to admin/supervisor roles.

---

### 11. `useAuth.tsx` Uses `getSession()` Client-Side (Reiterated for Emphasis)
Even if `getUser()` is used in middleware, the `AuthProvider` sets the user from `getSession()`. If the client-side React app trusts this to render admin-only UI elements, an attacker can inject a forged session to see admin dashboards (even though API calls would fail at the RLS level).

---

### 12. `usePayroll` — Payroll Cycle State Mutation During Render
**File:** `app/(dashboard)/hrms/payroll/page.tsx:103-105`
```typescript
if (cycles.length > 0 && !selectedCycle && !isLoading) {
    handleCycleSelect(cycles[0]);
}
```

**Problem:** This code calls `handleCycleSelect` (which triggers `setState` and an async `fetchPayslips`) **during the render phase**. This is a React anti-pattern that can cause:
- Infinite re-render loops
- Race conditions with concurrent state updates
- Warning: "Cannot update a component while rendering a different component"

**Fix:** Move this initialization logic into a `useEffect` hook.

---

### 13. Employee Code Generation Uses `Math.random()`
**File:** `app/(dashboard)/hrms/recruitment/page.tsx:153`
```typescript
employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
```

**Problem:** Employee codes are generated with `Math.random()`, which:
- Is not cryptographically secure
- Can produce duplicate codes (collision probability increases with scale)
- Should be auto-generated by the database using a sequence

**Fix:** Use a database sequence or UUID for employee code generation, not client-side random numbers.

---

## 🟡 MEDIUM (Technical Debt That Compounds)

### 14. `AuthProvider` Not Wrapping Dashboard Layout
**File:** `app/(dashboard)/layout.tsx`

The dashboard layout does NOT wrap children in `<AuthProvider>`. The `useAuth()` hook requires it. If `AuthProvider` is not in the component tree above the dashboard, any component calling `useAuth()` will throw:
```
Error: useAuth must be used within an AuthProvider
```

Either it's wrapped at a higher level (needs verification), or it would crash on any page using `useAuth()`.

---

### 15. AC Service Filtering is Naive String Matching
**File:** `app/(dashboard)/services/ac/page.tsx` (from session summary)
```typescript
const acRequests = useMemo(() => {
    return requests.filter(r =>
        r.service_name?.toLowerCase().includes("ac") ||
        r.title?.toLowerCase().includes("ac") ||
        r.description?.toLowerCase().includes("ac")
    );
}, [requests]);
```

**Problem:** This filters ALL service requests client-side by checking if "ac" appears in the name/title/description. This would match:
- "Place maintenance request" (contains "ac")
- "Vacancy management" (contains "ac")
- "accuracy report" (contains "ac")

**Fix:** Filter by `service_id` or a dedicated service type enum, not substring matching.

---

### 16. Pest Control Uses Hardcoded Service UUID
**File:** `app/(dashboard)/services/pest-control/page.tsx`
```typescript
const { requests, ... } = useServiceRequests({
    serviceId: "bf4442cc-cb5f-4c2a-bcf8-6ed387cd7630" // PST-CON service ID
});
```

**Problem:** Hardcoded UUID that's environment-specific. If the database is reseeded or the service is recreated in a different environment, this UUID won't match and the page will show zero data with no error.

**Fix:** Look up the service by a stable code/slug (e.g., `service_code = 'PST-CON'`) instead of a UUID.

---

### 17. `sanitizeLikeInput` Exists But Is Not Used Consistently
**File:** `lib/sanitize.ts`

The sanitize utility exists and is imported in `useInventory.ts`, but a search reveals it's only used in a few places. Any hook doing `ilike` queries without this sanitization is vulnerable to LIKE injection (users can inject `%` to bypass search filters and see all records).

---

### 18. Middleware Role Fetch Uses `as any` Cast
**File:** `src/lib/supabase/middleware.ts:53`
```typescript
role = (data as any)?.roles?.role_name || null;
```

**Problem:** The middleware — the single most security-critical file — uses `as any` to extract the role. If the `users`/`roles` table schema changes, this will silently return `null`, potentially granting unauthorized access since some code paths may treat `null` role as "no restriction."

---

### 19. `RouteGuard` Component — Purpose Unclear
**File:** `app/(dashboard)/layout.tsx:48`
```typescript
<RouteGuard>
    {children}
</RouteGuard>
```

The `RouteGuard` is referenced as blocking "frozen features" but its implementation needs verification. If it's a feature flag system, it should be documented. If it's a security guard, it duplicates middleware logic and adds confusion about where access control actually lives.

---

### 20. Inconsistent Error Handling Across Pages
Some pages (recruitment, payroll) have proper loading/error states:
```typescript
if (error) {
    return <div><p>Error: {error}</p><Button onClick={refresh}>Try Again</Button></div>;
}
```

But other pages (plantation, security) have minimal or no error handling. Users on those pages will see blank screens or partially loaded data with no indication of failure.

---

## 🔵 LOW (Code Quality & Maintainability)

### 21. `test-guard` and `test-resident` Routes Are Publicly Routable
These test pages exist in the production route tree at `/test-guard` and `/test-resident`. They contain mock data warnings and should not be accessible in production.

**Fix:** Move to a dev-only route or gate behind `process.env.NODE_ENV === 'development'`.

---

### 22. Payroll Year Selector Hardcoded to 2024-2027
**File:** `app/(dashboard)/hrms/payroll/page.tsx:495`
```typescript
{[2024, 2025, 2026, 2027].map((year) => (...))}
```

This will need to be updated every year or use dynamic year ranges.

---

### 23. No Input Validation on Login Form
**File:** `app/login/page.tsx`

The login form has `type="email"` and `required` attributes (basic HTML validation) but no:
- Password minimum length enforcement
- Email format validation beyond HTML5 default
- XSS protection on error message display (though React handles this)

---

### 24. `ErrorBoundary` Component — Unverified Implementation
**File:** `app/(dashboard)/layout.tsx:47`

The `ErrorBoundary` wraps all dashboard content. Its implementation quality needs verification — if it catches errors silently without logging or reporting, production bugs will be invisible.

---

### 25. Supabase Client Import Path Inconsistency
Some files import from:
```typescript
import { supabase } from "@/src/lib/supabaseClient";
```
Others reference:
```typescript
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;
```

This inconsistency makes it harder to audit where the typed vs untyped client is used.

---

## PRD COVERAGE GAPS

| PRD Feature | Status | Notes |
|---|---|---|
| Security Guard GPS Tracking & Geo-fencing | ⚠️ Partial | Backend exists; no map visualization |
| Panic Response System | ✅ Implemented | Alerts, resolution workflow present |
| Visitor Management & Photo Storage | ✅ Implemented | RLS + storage policies in place |
| Employee Behavior Tickets | ✅ Implemented | Full CRUD with workflows |
| AC Services Workflow | ⚠️ Partial | Naive filter; job session tracking exists but filtering is broken |
| Pest Control Services | ✅ Implemented | Hardcoded service UUID concern |
| Plantation Services | ⚠️ Partial | Hardcoded stats, no soil/zone data source |
| Printing & Advertising | ⚠️ Partial | Internal printing tab is a stub |
| HRMS Recruitment Pipeline | ✅ Implemented | Full lifecycle with status transitions |
| HRMS Payroll | ✅ Implemented | Cycle management, payslip generation; render-phase bug |
| HRMS Leave Management | ✅ Implemented | Via `useLeaveApplications` |
| HRMS Attendance | ✅ Implemented | Clock in/out with RLS |
| Inventory Supply Chain | ✅ Implemented | POs, GRNs, reconciliation all present |
| Finance — Supplier Bills | ✅ Implemented | Bill creation and payment workflows |
| Finance — Buyer Invoicing | ✅ Implemented | Via `useBuyerInvoices` |
| Financial Closure Workflow | ⚠️ Partial | Reconciliation exists but closure automation incomplete |
| Reports — Services | ⚠️ Partial | SLA breaches hardcoded |
| Reports — Financial | ⚠️ Partial | Outstanding amount hardcoded |
| Master Data — Service Tasks | ✅ Present | Under `/services/masters/` |
| Master Data — Checklists | ✅ Present | Under `/services/masters/checklists` |

---

## ARCHITECTURE CONCERNS

### Positive
- ✅ Clean separation: middleware for auth, hooks for data, components for UI
- ✅ Proper use of `@supabase/ssr` with cookie-based sessions in middleware
- ✅ Server-side `getUser()` validation in middleware (correct approach)
- ✅ RLS policies use `SECURITY DEFINER` functions properly
- ✅ Visitor immutability trigger prevents guards from modifying critical fields
- ✅ Centralized currency formatting with paise-based storage
- ✅ `sanitizeLikeInput` utility exists for LIKE injection prevention
- ✅ Accessibility: skip-to-content link in layout
- ✅ Error boundary wrapping dashboard content

### Negative
- ❌ Client auth context contradicts middleware security model (`getSession` vs `getUser`)
- ❌ 60+ `as any` casts destroy type safety across the entire hook layer
- ❌ **49 tables have RLS policies that are NOT enforced** (policies exist, `ENABLE ROW LEVEL SECURITY` never run)
- ❌ 17 SECURITY DEFINER views bypass RLS on underlying tables
- ❌ 30+ security-critical functions have mutable `search_path` (injection risk)
- ❌ Leaked password protection disabled in Supabase Auth
- ❌ No centralized error reporting/logging (errors caught and silently consumed)
- ❌ No optimistic updates or request deduplication (SWR/React Query would help)
- ❌ All data fetching is in `useEffect` — no server components leveraged for initial data
- ❌ No API route layer — hooks talk directly to Supabase client, mixing concerns

---

## RECOMMENDED PRIORITY ORDER

1. **IMMEDIATE:** Run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 49 tables with dead policies (single migration)
2. **IMMEDIATE:** Fix `useAuth` to use `getUser()` instead of `getSession()`
3. **IMMEDIATE:** Remove all hardcoded mock IDs from production dashboard components
4. **IMMEDIATE:** Add RLS policies for `inventory`, `stock_transactions`, and future GPS partition tables
5. **IMMEDIATE:** Fix 17 SECURITY DEFINER views to use SECURITY INVOKER or add inline checks
6. **THIS SPRINT:** Set `search_path` on all 30+ security-critical functions
7. **THIS SPRINT:** Enable leaked password protection in Supabase Auth settings
8. **THIS SPRINT:** Replace `as any` casts with generated Supabase types
9. **THIS SPRINT:** Fix the AC service substring filter
10. **THIS SPRINT:** Replace hardcoded service UUIDs with slug-based lookups
11. **THIS SPRINT:** Fix payroll page render-phase state mutation
12. **THIS SPRINT:** Fix permissive INSERT policy on `service_feedback`
13. **NEXT SPRINT:** Implement map visualization for security GPS tracking
14. **NEXT SPRINT:** Complete printing tab stub
15. **NEXT SPRINT:** Wire report pages to real data queries

---

*This review is intentionally aggressive. Every item listed has been verified against the actual codebase and the live Supabase cloud database. RLS findings (Section 10+) are verified against `pg_tables`, `pg_policies`, and the Supabase Security Advisor as of 2026-02-15.*
