---
name: scaffold-page
description: Scaffold a brand new Next.js page with its corresponding Supabase hook and navigation entries.
argument-hint: "[module-name] [feature-name]"
---

# Scaffold Page Guide

## Step 0: Context Verification (MANDATORY)

1. Check `.ai_context/PHASES.md` to ensure this page isn't already built.
2. If it's not in PHASES.md, add it under the appropriate module as 🔴 NOT BUILT.

## Step 1: Scaffold Hook

- Check `.ai_context/CONTEXT.md` to see if a hook for this entity exists.
- If not, create `hooks/use$ARGUMENTS[1].ts` using the standard hook pattern (check `/new-hook` or `CLAUDE.md` for the template).
- The hook must export `{ data, isLoading, error, createFn, updateFn, deleteFn, refresh }`.

## Step 2: Scaffold Page

- Create `app/(dashboard)/$ARGUMENTS[0]/$ARGUMENTS[1]/page.tsx`.
- Include `"use client"`.
- Add a `<PageHeader>` from `@/components/shared/PageHeader`.
- Add a `Skeleton` loading state that checks `isLoading` from the hook.
- Render a standard layout (e.g., a standard shadcn/ui Card containing a DataTable).

## Step 3: Scaffold Navigation

- Open `components/layout/AppSidebar.tsx` and add a new entry for `/$ARGUMENTS[0]/$ARGUMENTS[1]` under the appropriate section.
- Open `src/lib/auth/roles.ts` and ensure the role mapping includes `/$ARGUMENTS[0]` for the correct role.

## Step 4: Update Context

- Mark the feature as 🔵 UI-ONLY or 🟡 PARTIAL in `.ai_context/PHASES.md`.
- Add the new hook to `.ai_context/CONTEXT.md`.
