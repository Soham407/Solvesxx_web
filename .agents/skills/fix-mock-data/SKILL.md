---
name: fix-mock-data
description: Use when replacing hardcoded or mocked data with real database calls. Loads context to identify all mock locations and available hooks.
argument-hint: "[module-name]"
---

# Fix Mock Data Guide

## Step 0: Load Context (MANDATORY)

1. Read `.ai_context/PHASES.md` — Find the **"Known Mock Data"** section for exact file locations and line numbers.
2. Read `.ai_context/CONTEXT.md` — Check existing hooks that may already fetch the data you need.
3. Read `CLAUDE.md` — Review the "Replacing Mock Data" checklist.

## Step 1: Identify ALL mocks in the module

For the module `$ARGUMENTS`, find:
- Hardcoded arrays/objects used as data sources
- Hardcoded stat numbers (e.g., `const totalOrders = 42`)
- `ComingSoonChart` / `ComingSoonWidget` components
- Non-functional buttons (onClick handlers that do nothing)

## Step 2: Check Infrastructure

- [ ] Does the DB table exist? Search `supabase-types.ts` for the table name.
- [ ] Does a hook exist? Search `hooks/` directory and CONTEXT.md hook list.
- [ ] If no table → create migration first (use `/new-migration`)
- [ ] If no hook → create hook first (use `/new-hook`)

## Step 3: Replace Mocks

- [ ] Replace hardcoded arrays with `const { data } = useMyHook()`
- [ ] Replace hardcoded stats with computed values: `const total = data?.length ?? 0`
- [ ] Replace `ComingSoonChart` with real Recharts chart using hook data
- [ ] Wire up non-functional buttons with actual hook handlers (`createFn`, `updateFn`, `deleteFn`)
- [ ] Replace hardcoded UUIDs with `service_code` lookups (e.g., `"PST-CON"`)

## Step 4: Test & Verify

- [ ] Check that the page loads without errors
- [ ] Verify loading states appear correctly (Skeleton/Loader2)
- [ ] Verify empty states if table has no data yet
- [ ] Create seed data if needed

## Step 5: Update Context

- [ ] Update `.ai_context/PHASES.md` — Change status from 🔵/🟡 to ✅
- [ ] Remove the entry from "Known Mock Data" section
