---
name: new-feature
description: Use when building a new page or feature, or extending an existing one. Loads the necessary context for UI components, roles, workflows, and build status.
argument-hint: "[module-name] [feature-name]"
---

# New Feature Guide

## Step 0: Load Context (MANDATORY)

Before writing any code, read these files in order:
1. `.ai_context/PHASES.md` — Check if the feature is already built (✅), partially done (🟡), UI-only (🔵), or not built (🔴).
2. `.ai_context/CONTEXT.md` — Full architecture & all 82+ existing hooks. **Search for an existing hook before creating one.**
3. `.ai_context/SCOPE.md` — PRD screens, API specs, and DB schema. Follow the exact design described here.
4. `CLAUDE.md` — Coding conventions, guardrails, and patterns.

> If the feature already exists as ✅ FULL, STOP and tell the user. If it's 🟡/🔵, identify what's missing.

## Step 1: Database

- [ ] Check if the table(s) already exist in `supabase-types.ts` (search for the table name)
- [ ] If not, create a migration: `supabase/migrations/YYYYMMDD_description.sql`
- [ ] Add RLS policies for relevant roles (admin, buyer, supplier, guard, resident, delivery)
- [ ] Enable Realtime if live updates are needed: `ALTER PUBLICATION supabase_realtime ADD TABLE your_table;`
- [ ] Run `generate_typescript_types` via Supabase MCP after migration

## Step 2: Types

- [ ] Add TypeScript types/interfaces to the appropriate file in `src/types/`
- [ ] Add status enums, labels, and badge colors to `src/lib/constants.ts`

## Step 3: Hook

- [ ] Verify no duplicate exists in CONTEXT.md hook list
- [ ] Create `hooks/use[Entity].ts` with the standard return pattern:
  ```ts
  { data, isLoading, error, createFn, updateFn, deleteFn, refresh }
  ```
- [ ] Use `createBrowserClient` from `@supabase/ssr` or `supabase` from `@/src/lib/supabaseClient`
- [ ] Add Realtime subscription with cleanup if needed

## Step 4: Page

- [ ] Create page at `app/(dashboard)/$0/$1/page.tsx`
- [ ] Add `"use client"` directive
- [ ] Use `PageHeader` from `@/components/shared/PageHeader`
- [ ] Use `DataTable` from `@/components/shared/` for tabular data
- [ ] Use `Skeleton` or `Loader2` for loading states
- [ ] Use `formatCurrency()` for monetary values
- [ ] Use shadcn/ui components from `@/components/ui/`
- [ ] Use semantic color tokens (never hardcoded hex)

## Step 5: Navigation

- [ ] Add nav entry to `components/layout/AppSidebar.tsx`
- [ ] Add route prefix to `ROLE_ACCESS` in `src/lib/auth/roles.ts`
- [ ] If experimental, add feature flag in `src/lib/featureFlags.ts`

## Step 6: Update Context Files

- [ ] Update module status in `.ai_context/PHASES.md` (🔴 → ✅/🟡)
- [ ] Add new hook to hookl list in `.ai_context/CONTEXT.md`
