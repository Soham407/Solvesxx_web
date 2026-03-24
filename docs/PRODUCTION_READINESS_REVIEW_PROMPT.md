# FacilityPro — Claude Code Orchestrated Review & Fix Agent

> **How to use:** Paste this entire file as your prompt in Claude Code.
> Claude Code will automatically spawn subagents using its Agent tool.
> You can walk away — the orchestrator manages everything.

---

## ORCHESTRATOR INSTRUCTIONS

You are the **main orchestrator agent** for a deep production-readiness review of the
FacilityPro codebase. Your job is to:

1. Read the context files first (listed below)
2. Pre-create the output directory
3. Spawn 4 parallel review subagents using the Agent tool
4. Wait for ALL 4 to finish and write their findings files
5. Synthesize all findings yourself
6. Spawn targeted fix subagents **sequentially** for every Critical (🔴) and High (🟠) issue
7. Review each fix subagent's work before approving it
8. Run a build check to catch broken imports
9. Write the final master report

**Start immediately. Do not ask for confirmation. Use the Agent tool now.**

---

## STEP 0 — PRE-FLIGHT SETUP

Before reading anything, run these two commands to ensure output directories exist:

```bash
mkdir -p docs/review
```

Then verify the following files exist before proceeding (if any are missing, stop and
report which file is missing rather than hallucinating its content):

- `.ai_context/CONTEXT.md`
- `.ai_context/SCOPE.md`
- `.ai_context/PHASES.md`
- `.ai_context/STATE.md`
- `src/lib/auth/roles.ts`
- `middleware.ts`
- `src/lib/featureFlags.ts`
- `components/layout/AppSidebar.tsx`
- `docs/reference_schema.sql`

---

## STEP 1 — READ THESE FILES BEFORE SPAWNING ANYTHING

Read all of these yourself before spawning any subagent:

- `.ai_context/CONTEXT.md` — tech stack, 95+ hooks, conventions, architecture
- `.ai_context/SCOPE.md` — 18 roles, access matrix (§15), 15 business rules (§16), all workflows
- `.ai_context/PHASES.md` — module status matrix (✅/🟡/🔵/🔴)
- `.ai_context/STATE.md` — current implementation state snapshot
- `src/lib/auth/roles.ts` — RBAC route mapping (18 roles)
- `middleware.ts` — route guard implementation
- `src/lib/constants.ts` — status enums
- `src/lib/featureFlags.ts` — feature flag system
- `components/layout/AppSidebar.tsx` — sidebar nav (all hidden items)
- `docs/reference_schema.sql` — canonical DB schema (first 200 lines minimum)
- `docs/PRODUCTION_READINESS_FIX_PLAN.md` — prior analysis (if exists — do not hallucinate, just skip if absent)

Once you have read these, proceed to Step 2.

---

## STEP 2 — SPAWN 4 PARALLEL REVIEW SUBAGENTS

Use the **Agent tool** to spawn all 4 subagents at the same time (parallel, single message).
Each subagent writes its own findings file and exits.
You wait for all 4 before proceeding.

**Context window note:** Each subagent must write a **SUMMARY section at the very top**
of their findings file listing only the top 20 Critical/High issues. The full detail
follows below the summary. This allows the orchestrator to synthesize from summaries
without blowing its context window.

---

### SUBAGENT 1 — SECURITY & ACCESS REVIEW

**Subagent type:** general-purpose
**Description:** "Security, RBAC, and business rule enforcement audit"

**Prompt:**

```
You are a security-focused code reviewer for FacilityPro, a Next.js + Supabase
enterprise platform. Read .ai_context/CONTEXT.md and .ai_context/SCOPE.md fully
before starting.

IMPORTANT: Write your findings to docs/review/subagent-1-security-rbac.md
Start the file with a SUMMARY section listing only the top 20 Critical/High issues
(file path + one-line description). Full detail follows below.

---

PART A — RBAC & ROUTE GUARD AUDIT
Read src/lib/auth/roles.ts and middleware.ts completely.
Note: there are 18 roles total in this codebase.

For every route directory under app/(dashboard)/, verify:
- The route is listed in roles.ts with the correct allowed roles per SCOPE.md §15
- middleware.ts enforces it server-side (not just sidebar hiding)
- Feature-flag-hidden routes (featureFlags.ts) are ALSO blocked in middleware,
  not just removed from the sidebar

Check these specific gaps:
- Can a buyer role reach any finance/ or inventory/ route?
- Can a supplier role reach hrms/ routes?
- Can security_guard reach anything outside society/ and guard routes?
- Can service_boy reach any route other than their dedicated page?
- Is system_config writable only by super_admin?
- Do app/api/ routes verify the caller's session AND role before any write?
- Does app/api/users/reset-password/route.ts verify the caller is admin/super_admin?
- Does app/api/assets/generate-qr-batch/route.ts verify role before using service key?

PART B — BUSINESS RULES ENFORCEMENT
For each of the 15 rules in SCOPE.md §16, find where it is enforced and classify:
✅ Enforced at DB/RLS level
⚠️ Enforced only in UI (bypassable)
❌ Not enforced at all

Rules to check:
1. Geo-fencing 50m check-in → useAttendance hook + company_locations
2. Indent required before PO → usePurchaseOrders creation path
3. Material acknowledgment before bill → useSupplierBills + useGRN
4. Bad material blocked from inventory → GRN quality ticket flow
5. Shortage auto-calculated → useShortageNotes + GRN
6. Feedback required for closure → useBuyerFeedback + order close path
7. Supplier rate vs sale rate both maintained → useSupplierRates + useSaleProductRates
8. Chemical expiry alerts → usePestControlInventory + edge functions
9. PPE checklist gate before job in_progress → useJobSessions status transition
10. BGV required for onboarding → useBackgroundVerifications + employee status
11. Single active deployment per guard → useSecurityGuards + deployment creation
12. Service acknowledgment before supplier bill → service bill flow
13. OT only beyond standard shift → usePayroll + useShifts calculation
14. Guard inactivity threshold from system_config → useInactivityMonitor
15. RBAC extensible without schema changes → roles.ts structure

PART C — RLS SPOT CHECK
Read supabase/scripts/ for RLS test scripts (skip if directory does not exist).
Mentally verify using docs/reference_schema.sql RLS policies:
- employees table not readable by buyer or supplier roles
- payroll_cycles not readable by any field-staff role
- visitors only readable by guard, guard_supervisor, society_manager, admin
- system_config only writable by super_admin
- panic_alerts only insertable by security_guard role

PART D — EDGE FUNCTION SECURITY
Read all functions in supabase/functions/:
send-notification, checklist-reminders, inactivity-monitor,
check-checklist, check-document-expiry, check-guard-inactivity,
check-inactivity, check-incomplete-checklists

For each, check:
- Is there an auth/cron-secret guard before execution?
- Is there deduplication to prevent double notifications?
- Does it read inactivity threshold from system_config, not hardcode it?
- Does check-document-expiry also handle chemical expiry (SCOPE rule 8)?
- Do checklist functions use local timezone, not UTC?

Write ALL findings to: docs/review/subagent-1-security-rbac.md

Format each issue as:
🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW
File: path/to/file.ts (line N)
Issue: description
Fix: exact recommendation

Do not apply any fixes. Write findings only. Exit when done.
```

---

### SUBAGENT 2 — DATA LAYER & HOOKS REVIEW

**Subagent type:** general-purpose
**Description:** "Hook correctness, data integrity, and query quality audit"

**Prompt:**

```
You are a data-layer code reviewer for FacilityPro, a Next.js + Supabase platform.
Read .ai_context/CONTEXT.md fully before starting. Pay special attention to the 95+
hooks section and the Supabase client usage patterns described there.

IMPORTANT: Write your findings to docs/review/subagent-2-data-hooks.md
Start the file with a SUMMARY section listing only the top 20 Critical/High issues
(file path + one-line description). Full detail follows below.

---

PART A — SHARED HOOK INFRASTRUCTURE
Read hooks/lib/useSupabaseQuery.ts and hooks/lib/useSupabaseMutation.ts fully.
Verify:
- Loading state is set correctly on initial fetch AND refetch
- Error state is cleared on new requests and set on failure
- Mutations trigger refetch of dependent queries correctly
- No hook subscribes to Realtime AND polls simultaneously (double updates)

PART B — CRITICAL HOOK AUDIT
For each hook below, read the full implementation and check:
- Correct Supabase table name (cross-check docs/reference_schema.sql)
- All queried columns exist in that table
- No RLS-sensitive query uses the service-role client
- Mutations surface errors to the caller (not silently catch)
- Realtime subscriptions have cleanup on unmount (no memory leaks)
- No hardcoded UUID strings anywhere

Hooks to audit:
usePurchaseOrders, useIndents, useGRN, useSupplierBills, usePayroll,
useAttendance, useLeaveApplications, useVisitors, useGuardChecklist,
usePanicAlert, usePanicAlertSubscription, useJobSessions, useServiceRequests,
useServiceDeliveryNotes, usePersonnelDispatches, useBuyerRequests,
useBuyerFeedback, useShortageNotes, useRTVTickets, useNotifications

PART C — SUPABASE CLIENT MISUSE SCAN
Scan ALL hooks and components for:
- Any 'use client' component importing from src/lib/supabase/server.ts (critical bug)
- Any file mixing supabaseClient.ts singleton AND createClient() in same component
- Any .from('table').select() call that does not handle the .error field
- Any place user id or role is read from localStorage or URL params
  instead of the Supabase session

PART D — PERFORMANCE & N+1 QUERIES
Find all patterns like:
  for (const item of items) {
    await supabase.from('table').select().eq('id', item.related_id)
  }
Flag every instance — fix is .in() batch query or a join.

Find all .select('*') queries on these large tables WITHOUT .range() or .limit():
employees, visitors, purchase_orders, indents, attendance_records,
leave_applications, notifications, behavior_tickets, supplier_bills,
sale_bills, job_sessions

Count total active Realtime subscriptions on any single page — flag if > 5 channels.

PART E — TYPE SAFETY
- List all uses of 'as any' and @ts-ignore with their file and line
- List all TODO and FIXME comments by file
- List any hardcoded UUID strings in hooks or components

Write ALL findings to: docs/review/subagent-2-data-hooks.md

Format each issue as:
🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW
File: path/to/file.ts (line N)
Issue: description
Fix: exact recommendation

Do not apply any fixes. Write findings only. Exit when done.
```

---

### SUBAGENT 3 — UI COMPLETENESS & SCOPE GAP REVIEW

**Subagent type:** general-purpose
**Description:** "UI completeness vs SCOPE.md and missing feature gap analysis"

**Prompt:**

```
You are a product completeness reviewer for FacilityPro. Your job is to find every gap
between what SCOPE.md requires and what is actually implemented in the codebase.
Read .ai_context/SCOPE.md fully (all 16 sections) and .ai_context/CONTEXT.md and
.ai_context/PHASES.md before starting.

IMPORTANT: Write your findings to docs/review/subagent-3-ui-scope-gaps.md
Start the file with a SUMMARY section listing only the top 20 Critical/High issues
(file path + one-line description). Full detail follows below.

---

PART A — SCREEN COMPLETENESS PER ROLE
Read SCOPE.md §11 (UI Screens Per Role) completely.
There are 18 roles in this codebase — check all of them.
For each role, map required screens to actual routes in app/(dashboard)/ AND
app/(landing)/ (landing page and waitlist are separate routes).
For each route, open the page file and check:
- Does it render real data or ComingSoonChart / ComingSoonWidget placeholders?
- Does it have a loading skeleton / Suspense boundary?
- Does it handle empty state (no data)?
- Does it handle error state (Supabase error)?

PART B — DASHBOARD COMPLETENESS
Check app/(dashboard)/dashboard/:
- Are all 18 role-specific dashboards implemented? (not just 12)
- Do MD and HOD dashboards use useMDStats / useHODStats with real data?
- Are KPI numbers from live Supabase queries or hardcoded mock values?

PART C — COMINGSOON AUDIT
Find EVERY usage of ComingSoonChart and ComingSoonWidget across the entire codebase.
For each usage, check:
- Does a hook in /hooks/ already exist that could supply real data?
- If yes: flag as "hook exists, just needs wiring"
- If no: flag as "hook + UI both missing"

PART D — WORKFLOW GAP ANALYSIS
Read .ai_context/SCOPE.md §5 (Core Workflows) completely.
For each workflow step, find the UI + hook + DB path.
Mark as: ✅ Complete / ⚠️ Partial / ❌ Missing

Specifically verify these high-risk items:
- Shortage Note auto-dispatch to supplier after GRN short-receipt (Rule 5)
- Feedback-required gate before order closure (Rule 6)
- Service Delivery Note PDF generation and download
- Payslip PDF generation per employee per payroll cycle
- QR code scanning for asset check-in/check-out (not just generation)
- Guard live location map view for supervisors
- Patrol log creation from guard mobile interface
- BGV status update and document upload for HR
- Material Return (RTV) full workflow: raise → approve → dispatch → supplier credit
- Ad Booking workflow: useAdBookings → billing → delivery confirmation
- Landing page waitlist: form submission → Supabase insert → confirmation email

PART E — NOTIFICATION COVERAGE
Read .ai_context/SCOPE.md §12 (Notification & Alert Triggers).
For each trigger event, find where the notification is inserted into the
notifications table and/or sent via FCM.
Mark as: ✅ Implemented / ❌ Missing

PART F — SIDEBAR HIDDEN ITEMS
Read components/layout/AppSidebar.tsx fully.
List every nav item commented out with "Temporarily hidden".
For each, determine: page exists but hidden, OR page not built at all?

PART G — STATE MACHINE VERIFICATION
For each entity, verify status transitions match .ai_context/SCOPE.md §6:
- Order Request: pending → accepted/rejected → ... → closed
- Indent: draft → submitted → approved/rejected → fulfilled
- Purchase Order: draft → issued → dispatched → received → closed
- GRN: pending → acknowledged → partial/complete
- Supplier Bill: pending → approved → paid
- Service Request: open → assigned → in_progress → completed → closed
- Job Session: open → in_progress → completed
- Leave Application: pending → approved/rejected
- Visitor: pre_approved/arrived/checked_in → checked_out
- Panic Alert: active → acknowledged → resolved

Verify status constants in src/lib/constants.ts match DB ENUM values in schema.
Verify UI dropdowns/buttons only show valid next states from current state.

Write ALL findings to: docs/review/subagent-3-ui-scope-gaps.md

Use this format for the gap table:
| Feature | Status | Notes |
|---------|--------|-------|
| ... | ✅/⚠️/❌ | ... |

For bugs, use:
🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW
File: path/to/file.ts (line N)
Issue: description
Fix: exact recommendation

Do not apply any fixes. Write findings only. Exit when done.
```

---

### SUBAGENT 4 — FORMS, UX & CODE QUALITY REVIEW

**Subagent type:** general-purpose
**Description:** "Form validation, error UX, and code quality audit"

**Prompt:**

```
You are a frontend quality reviewer for FacilityPro. Read .ai_context/CONTEXT.md
before starting.

IMPORTANT: Write your findings to docs/review/subagent-4-forms-quality.md
Start the file with a SUMMARY section listing only the top 20 Critical/High issues
(file path + one-line description). Full detail follows below.

---

PART A — FORM VALIDATION AUDIT
Find all forms using React Hook Form + Zod (useForm, zodResolver).
For each form, verify:
- Required fields have Zod .min(1) or equivalent — not just UI asterisks
- Date range fields validate to_date >= from_date (leave, events, deployments)
- Numeric fields have min/max matching business rules (rating 1–5, quantity > 0)
- File upload fields validate MIME type and max size
- Indian mobile phone numbers validated where applicable (+91, 10 digits)
- Supabase errors from mutations (e.g. unique constraint) surface to user via toast
  — not silently caught

PART B — DIALOG COMPONENT AUDIT
Read all files in components/dialogs/ and verify each dialog has:
- Submit button shows loading state (disabled + spinner during mutation)
- Dialog closes automatically after successful mutation
- Form resets fully after close (no stale data on reopen)
- Error message shown inside dialog if mutation fails

PART C — LARGE FILE DETECTION
Find any single file that:
- Imports from 10+ different hooks simultaneously
- Imports recharts, jspdf, or similar heavy libs at top level (not dynamic import)
- Has more than 600 lines of JSX/TSX — candidate for splitting

PART D — FILE UPLOAD SECURITY
Find all file upload flows (Storage uploads) and verify:
- File type validated before upload (not just extension — check MIME)
- File size capped before upload (recommend 5MB for documents, 2MB for images)
- Selfie/photo uploads are not storing raw full-resolution images without resize
- Storage bucket URLs in API responses are signed/expiring, not public permanent

PART E — ENVIRONMENT VARIABLE AUDIT
Scan all source files for:
- Any NEXT_PUBLIC_ variable that contains a secret key or private value
  (only SUPABASE_URL, SUPABASE_ANON_KEY, and FIREBASE_ vars should be public)
- Any hardcoded API URL, bucket name, or project ref that should be an env var
- Any .env value used directly in client-side code that bypasses the env var system

PART F — CONSOLE & DEBUG CLEANUP
Find all console.log, console.warn, console.error statements in production code paths
(ignore test files and scripts/).
List every instance — these should be removed or replaced with proper error handling
before production.

PART G — ACCESSIBILITY BASICS
Do a quick scan of major pages for:
- Interactive elements (buttons, links) missing aria-label when icon-only
- Form inputs missing associated label elements
- Images missing alt text

Write ALL findings to: docs/review/subagent-4-forms-quality.md

Format each issue as:
🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW
File: path/to/file.ts (line N)
Issue: description
Fix: exact recommendation

Do not apply any fixes. Write findings only. Exit when done.
```

---

## STEP 3 — ORCHESTRATOR SYNTHESIZES ALL FINDINGS

After ALL 4 subagents have finished and their findings files exist, do the following yourself:

1. Read the **SUMMARY section only** from each of the 4 findings files:
   - `docs/review/subagent-1-security-rbac.md` (summary section)
   - `docs/review/subagent-2-data-hooks.md` (summary section)
   - `docs/review/subagent-3-ui-scope-gaps.md` (summary section)
   - `docs/review/subagent-4-forms-quality.md` (summary section)

2. For any issue you need more detail on, read only the relevant section of the full file.

3. Deduplicate — multiple subagents may have flagged the same file for different reasons.
   Merge overlapping issues into one entry.

4. Build a **prioritized fix list** in this order:
   - All 🔴 Critical issues (must fix before any demo or client handoff)
   - All 🟠 High issues (fix within this session if possible)
   - 🟡 Medium and 🟢 Low issues are NOT fixed now — only documented

5. Write `docs/review/SYNTHESIS.md` with the deduplicated prioritized list.
   Group issues by domain: Security, Hooks, UI/Scope, Forms.

---

## STEP 4 — SPAWN FIX SUBAGENTS (SEQUENTIAL — ONE AT A TIME)

**CRITICAL:** Spawn fix subagents ONE AT A TIME in the order below.
Do NOT spawn in parallel — subagents may edit overlapping files.
Wait for each to finish and review its output before spawning the next.

---

### FIX GROUP A — Security & API Route Fixes (spawn first)

```
Read docs/review/SYNTHESIS.md and filter for all 🔴 and 🟠 issues
in these paths: app/api/, middleware.ts, src/lib/auth/roles.ts

For each issue, apply the recommended fix.
After each fix, verify the change is consistent with:
- .ai_context/CONTEXT.md conventions
- The existing pattern in surrounding code
- .ai_context/SCOPE.md access matrix (18 roles)

Do NOT touch: supabase/migrations/, supabase-types.ts, src/types/supabase.ts
Do NOT touch: hooks/, components/

If a fix requires a DB migration (new constraint, RLS policy):
Write it to supabase/migrations/YYYYMMDD_security_fixes.sql
Do NOT run it — write only.

When done, write a summary of every change made to:
docs/review/fixes-applied-security.md
```

---

### FIX GROUP B — Hook & Data Layer Fixes (spawn after A completes)

```
Read docs/review/SYNTHESIS.md and filter for all 🔴 and 🟠 issues
in these paths: hooks/, src/lib/supabase/

For each issue, apply the recommended fix.
Priority order:
1. Memory leaks (missing Realtime unsubscribe)
2. Swallowed errors (silent catch blocks)
3. Missing .error handling on Supabase queries
4. Server client used in client components
5. N+1 queries on critical paths

Do NOT change hook interfaces (function signatures, return shapes)
unless absolutely required by the fix — other components depend on them.
Do NOT touch: app/api/, middleware.ts, src/lib/auth/, components/

When done, write a summary of every change made to:
docs/review/fixes-applied-hooks.md
```

---

### FIX GROUP C — Business Rule Enforcement Fixes (spawn after B completes)

```
Read docs/review/subagent-1-security-rbac.md, section PART B.
Find all rules marked ❌ (not enforced) or ⚠️ (UI only).

For each ❌ rule:
1. Add enforcement in the relevant hook (guard before mutation fires)
2. If enforcement requires a DB constraint or RLS policy,
   write SQL to supabase/migrations/YYYYMMDD_business_rules.sql
   Do NOT run it.

For each ⚠️ rule:
1. Keep existing UI enforcement
2. Add hook-level guard as a second layer

Business rules reference: .ai_context/SCOPE.md §16
Hooks reference: .ai_context/CONTEXT.md hooks list (95+ hooks)

Do NOT touch: app/api/, middleware.ts, components/dialogs/
Files in scope: hooks/ only (and migration SQL if needed)

When done, write a summary to: docs/review/fixes-applied-business-rules.md
```

---

### FIX GROUP D — Form & Dialog Fixes (spawn after C completes)

```
Read docs/review/SYNTHESIS.md and filter for all 🔴 and 🟠 issues
in these paths: components/dialogs/, components/forms/,
any page file with a form.

For each issue, apply the fix.
Priority order:
1. Missing loading state on submit buttons
2. Form not resetting after dialog close
3. Supabase errors not surfaced to user
4. Missing required field validation in Zod schema
5. File upload without MIME/size validation

Reference the existing dialog pattern in components/dialogs/ for
correct implementation style before making changes.

Do NOT touch: hooks/, app/api/, middleware.ts, src/lib/auth/

When done, write a summary to: docs/review/fixes-applied-forms.md
```

---

## STEP 5 — BUILD CHECK

After all 4 fix groups complete, run:

```bash
npx next build 2>&1 | tail -80
```

Review the output:
- If build succeeds: note it in the master report
- If build fails with NEW errors (not pre-existing TS2589): spawn one more targeted
  fix subagent to resolve only the broken import/type (do not touch auto-generated files)
- Pre-existing errors from supabase-types.ts / ignoreBuildErrors are expected — ignore them

---

## STEP 6 — ORCHESTRATOR REVIEWS ALL FIXES

After all fix subagents complete, do the following yourself:

1. Read each fixes-applied file:
   - `docs/review/fixes-applied-security.md`
   - `docs/review/fixes-applied-hooks.md`
   - `docs/review/fixes-applied-business-rules.md`
   - `docs/review/fixes-applied-forms.md`

2. For each fix applied, open the actual changed file and verify:
   - The fix follows .ai_context/CONTEXT.md conventions
   - The fix does not break the existing component/hook interface
   - No new hardcoded UUIDs were introduced
   - No server client was accidentally used in a client component
   - No auto-generated file was edited

3. If any fix looks wrong or introduces a new problem, either correct it yourself
   or spawn one more targeted subagent to fix only that specific issue.

---

## STEP 7 — WRITE THE MASTER REPORT

Write `docs/review/MASTER_REVIEW_REPORT.md` with this exact structure:

```markdown
# FacilityPro — Production Readiness Review
**Date:** [today]
**Agent:** Claude Code Orchestrator + 4 Review Subagents + Fix Subagents

---

## Executive Summary
[2–3 sentences: overall production readiness verdict]

---

## Critical Issues Fixed This Session 🔴
[Every critical issue that was found AND fixed, with file + what changed]

## High Priority Issues Fixed This Session 🟠
[Every high issue fixed]

## Issues Requiring Human Decision 🟡🟢
[Medium and low issues — not auto-fixed, needs developer review]

## Build Status
[Output of `next build` — pass or fail, any new errors introduced]

## Pending DB Migrations (NOT yet applied)
[List every .sql file written in supabase/migrations/ by this session]
[Human must review and run: supabase db push]

---

## Feature Completeness Matrix
[Copy the full table from subagent-3-ui-scope-gaps.md]

---

## Business Rule Coverage
| Rule | Enforcement Level | Status |
|------|------------------|--------|
[One row per business rule from SCOPE.md §16]

---

## RBAC Coverage Summary (18 Roles)
[Pass/Fail per role from subagent-1 findings]

---

## Remaining Work Estimate
| Category | Items Remaining | Estimated Effort |
|----------|----------------|-----------------|
| Missing screens | N | Nh |
| Unwired ComingSoon widgets | N | Nh |
| Medium-priority fixes | N | Nh |
| DB migrations to review/apply | N | 30m |

---

## Recommended Next Steps
1. [Most important action]
2. ...
```

---

## AGENT OPERATING RULES (ENFORCED THROUGHOUT)

- **Never edit:** `supabase-types.ts`, `src/types/supabase.ts`, `docs/reference_schema.sql`
- **Never run migrations:** Only write `.sql` files to `supabase/migrations/` — never execute
- **Never hardcode UUIDs** — always use `service_code` lookup
- **Never mix Supabase clients** in one file — pick singleton OR createClient(), not both
- **Server client is async** (`await createClient()`) — only in Server Components/Route Handlers
- **Currency** — always `formatCurrency()` from `@/src/lib/utils/currency`
- **Context files are in `.ai_context/`** — never read CONTEXT.md from root (it doesn't exist there)
- **18 roles total** — not 16. Always check all 18 in RBAC audits.
- **95+ hooks total** — not 92. List from .ai_context/CONTEXT.md is authoritative.
- **Ignore:** TypeScript errors in auto-generated type files (expected, intentional)
- **Ignore:** `test-guard/`, `test-delivery/`, `test-resident/` routes — intentional test pages
- **Ignore:** `ignoreBuildErrors: true` in next.config.ts — intentional (TS2589 on deep types)
- **After every phase, save progress to disk before moving on**
