# UNIFIED REMEDIATION CHECKLIST — FacilityPro

This document synthesizes findings from the Aggressive Code Review, Operational Reality Review, UX Review, and System Trust Documentation into a surgical, execution-ready remediation plan.

--------------------------------------------------
SECTION 1 — CRITICAL (Must fix before anything else)
--------------------------------------------------
**Criteria:** Data corruption risk, Security / access violation, Financial inconsistency, Irreversible trust damage.

1. **Enable RLS on 49 "Dead Policy" Tables** [COMPLETED]
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 10)
   - **Why it is critical:** 49 tables have RLS policies written but `ENABLE ROW LEVEL SECURITY` was never executed. Data is currently wide open via public API.
   - **Layer:** Database
   - **Fixability:** Fixable immediately (Single migration script)

2. **Fix `useAuth` Security Bypass (`getSession` → `getUser`)** [COMPLETED]
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 1), `UX_REVIEW.md` (Item 2.4)
   - **Why it is critical:** `getSession()` trusts local storage without server-side validation. Allows session forgery and role spoofing in the client shell.
   - **Layer:** Hook / Middleware
   - **Fixability:** Fixable immediately

3. **Secure `SECURITY DEFINER` Views** [COMPLETED]
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 10a)
   - **Why it is critical:** 17 views (including payslips and financial details) bypass RLS by running as the creator. RLS on base tables is ignored.
   - **Layer:** Database (Views)
   - **Fixability:** Requires policy/design decision (Switch to `SECURITY INVOKER`)

4. **Remove Hardcoded Mock IDs from Production Dashboards** [COMPLETED]
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 2)
   - **Why it is critical:** Real users in Guard/Supervisor roles are served data for a fake hardcoded UUID (`1111...`) instead of their actual employee record.
   - **Layer:** UI / Hook
   - **Fixability:** Fixable immediately

5. **Stop Login Error Leaks (Email Enumeration)** [COMPLETED]
   - **Source file(s)::** `UX_REVIEW.md` (Item 2.1)
   - **Why it is critical:** Exposing specific Supabase errors ("User not found") allows attackers to map valid user emails.
   - **Layer:** UI
   - **Fixability:** Fixable immediately

6. **Add Confirmations for Strategic Financial Mutations** [COMPLETED]
   - **Source file(s)::** `UX_REVIEW.md` (Item 9.1, 9.2, 11.1)
   - **Why it is critical:** "Force Match" and "Write Off" are one-click actions with no undo, no confirmation, and no mandatory justification trail in the UI.
   - **Layer:** UI / API
   - **Fixability:** Requires design decision (Standardize `AlertDialog` + Reason prompt)

7. **Fix Role-Based View Switcher Exposure** [COMPLETED]
   - **Source file(s):** `UX_REVIEW.md" (Item 3.1)
   - **Why it is critical:** Any authenticated user can switch their view to "Admin" or "MD" dashboards, exposing internal metrics and UI structures.
   - **Layer:** UI / Middleware
   - **Fixability:** Fixable immediately (Gate behind env flag)

--------------------------------------------------
SECTION 2 — HIGH PRIORITY (Fix soon, but not blocking)
--------------------------------------------------
**Criteria:** Inconsistent behavior, Admin-only recovery required, UX that causes real mistakes, Performance issues under scale.

1. **Eradicate `as any` Type Safety Bypasses (60+ instances)**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 4)
   - **Why it is high priority:** Entire data-fetching layer is untyped. Schema drifts will cause silent production failures and runtime crashes.
   - **Layer:** Hook / API
   - **Fixability:** Requires design decision (Run `supabase gen types` and refactor)

2. **Fix Mutable Function Search Paths**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 10b)
   - **Why it is high priority:** 30+ security functions (like `is_admin`) are vulnerable to search-path injection attacks.
   - **Layer:** Database (Functions)
   - **Fixability:** Fixable immediately (SQL `SET search_path = public`)

3. **Implement Storage Lifecycle Rules (Cost Control)**
   - **Source file(s):** `OPERATIONAL_REALITY_REVIEW.md` (Item 1.4)
   - **Why it is high priority:** High-frequency guard selfies and visitor photos will cause storage costs to balloon exponentially without 30/60/90 day purging.
   - **Layer:** Infra (Supabase Storage)
   - **Fixability:** Requires infra/policy

4. **Wire Mocked Report Metrics to Live Data**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 3, Item 7)
   - **Why it is high priority:** Financial and Service reports currently show "Planted" fake numbers (e.g., SLA breaches set to static 3).
   - **Layer:** API / UI
   - **Fixability:** Requires design decision (Map to actual SQL Aggregations)

5. **Complete PRD Map Visualization for GPS Tracking**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 9), `UX_REVIEW.md` (Item 10.2)
   - **Why it is high priority:** PRD requires guard tracking; backend exists but UI is a "Coming Soon" dashed border. Competitor-facing gap.
   - **Layer:** UI
   - **Fixability:** Requires design decision (Leaflet/Mapbox integration)

6.  **Implement Login Rate Limiting**
    - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 5)
    - **Why it is high priority:** No application-level defense against brute force/credential stuffing.
    - **Layer:** UI / Middleware
    - **Fixability:** Fixable immediately

--------------------------------------------------
SECTION 3 — MEDIUM PRIORITY (Track & schedule)
--------------------------------------------------
**Criteria:** Operational friction, Maintainability concerns, Non-blocking UX issues, Manual processes that should be automated later.

1. **Standardize Loading/Error States via `AsyncBoundary`**
   - **Source file(s):** `UX_REVIEW.md` (Item 6.1, 6.2)
   - **Why it is medium priority:** Inconsistent patterns (loaders vs "..." vs skeletons) make the app feel unpolished and broken under latency.
   - **Layer:** UI (Component Pattern)
   - **Fixability:** Requires design decision

2. **Notification Table Archival Policy**
   - **Source file(s):** `OPERATIONAL_REALITY_REVIEW.md` (Item 1.1)
   - **Why it is medium priority:** Prevents table bloat from slowing down dashboard queries over 6+ months.
   - **Layer:** Database (Cron)
   - **Fixability:** Requires design decision

3. **Accessibility (A11y) Audit — `aria-labels` and Font Sizes**
   - **Source file(s):** `UX_REVIEW.md` (Item 7.1, 7.3)
   - **Why it is medium priority:** Font sizes as low as 8px and missing labels make the app unusable for the core persona (guards/technicians in the field).
   - **Layer:** UI / CSS
   - **Fixability:** Fixable immediately

4. **Fix AC Service Filtering (Sub-string matching)**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 15)
   - **Why it is medium priority:** Filtering for "ac" matches "v**ac**ancy" and "m**ac**hine", leading to incorrect service lists.
   - **Layer:** Hook / UI
   - **Fixability:** Fixable immediately

5. **Payroll Render-Phase State Mutation**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 12)
   - **Why it is medium priority:** React anti-pattern causing potential infinite loops or race conditions on the payroll page.
   - **Layer:** Hook
   - **Fixability:** Fixable immediately

6. **Add DB-Level State Machine Triggers for Secondary Tables**
   - **Source file(s):** `FAILURE_ABUSE_DEFENSE.md` (Item R1), `TRUST_MODEL.md` (line 169)
   - **Why it is medium priority:** `indents`, `purchase_orders`, `material_receipts`, and `reconciliations` enforce state transitions only in application code. A crafted Supabase SDK call can skip states on these tables. Only `requests` has the DB trigger.
   - **Layer:** Database (Triggers)
   - **Fixability:** Requires design decision (Define allowed transitions per table, deploy `BEFORE UPDATE` triggers)

--------------------------------------------------
SECTION 4 — LOW PRIORITY / ACCEPTABLE DEBT
--------------------------------------------------
**Criteria:** Known tradeoffs, Cosmetic UX, Things explicitly documented as “acceptable for now”.

1. **Supabase Client Import Inconsistency**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 25)
   - **Layer:** Infra / DevEx
2. **Hardcoded Year Range (2024-2027) in Payroll Selectors**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 22)
   - **Layer:** UI
3. **Public visibility of `/test-guard` and `/test-resident` routes**
   - **Source file(s):** `AGGRESSIVE_CODE_REVIEW.md` (Item 21)
   - **Layer:** Infra / Routing
4. **"shadwow-premium" Typo in RouteGuard**
   - **Source file(s):** `UX_REVIEW.md` (Item 10.5)
   - **Layer:** CSS
5. **Supabase Storage Files Deletable by `service_role`**
   - **Source file(s):** `FAILURE_ABUSE_DEFENSE.md` (Item R5)
   - **Layer:** Infra (Supabase Storage)
   - **Note:** DB retains the URL reference; file would 404. Acceptable given platform-level limitation.
6. **Behavior Ticket Status is VARCHAR, Not Enum**
   - **Source file(s):** `FAILURE_ABUSE_DEFENSE.md` (Item R6)
   - **Layer:** Database (Schema)
   - **Note:** No DB-level enforcement of valid status values. Application validates. Migration deferred.

--------------------------------------------------
SECTION 5 — ALREADY RESOLVED (DO NOT TOUCH)
--------------------------------------------------
**Items completed in recent UX/Nav refinement (Ref: `a12cdc8c`):**

- **Sidebar Simplification:** Reduction of 70+ links and regrouping (e.g., merging Society & Residents).
- **Navigation Orientation:** Implementation of auto-generated **Breadcrumbs** across all pages.
- **Improved Sidebar Naming:** Renaming confusing sections like "My Jobs" to "Field Queue".
- **Command Palette Enhancement:** Addition of OS-specific keyboard shortcuts (Alt+K for Windows) and expansion beyond static routes.

--------------------------------------------------
TOP 5 RISK REDUCTION FIXES
--------------------------------------------------
1. **Enable RLS on 49 Tables:** Eliminates the #1 security hole where data is public via API.
2. **`useAuth` Security Hardening:** Prevents malicious users from forging sessions and spoofing roles.
3. **Fix SECURITY DEFINER Views:** Closes the back-door that currently bypasses table-level RLS.
4. **Production Data Integrity:** Remove hardcoded Mock IDs from Guard/Supervisor dashboards.
5. **Enforce Financial Confirmations:** Adds `AlertDialog` prompts for "Force Match" and "Write Off" to prevent accidental/unauthenticated data corruption.

--------------------------------------------------
What NOT to fix yet
--------------------------------------------------
- **Cryptographic Signing of Snapshots:** Deferred for future compliance phases as per `FAILURE_ABUSE_DEFENSE.md` (Item R4).
- **Offline-First Capabilities:** Significant architectural rewrite required; current SOP-based mitigation is acceptable for v1 launch.
- **SMS Retry Queue:** Infrastructure complexity outweighs immediate risk.
- **Full `as any` rewrite:** While high priority, this should be done *after* RLS and Auth fixes have stabilized the system.

