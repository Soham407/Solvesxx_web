# FacilityPro — AI Coding Instructions

> This file is automatically loaded by Claude Code / Cursor at session start.
> It defines project conventions, guardrails, and patterns that all AI sessions must follow.

---

## Project Identity

- **Name**: FacilityPro (enterprise-canvas-main)
- **Type**: Next.js 16 App Router + Supabase + TailwindCSS
- **Context files**: Read `CONTEXT.md` for full architecture & hook reference. Read `PHASES.md` for module status & PRD gaps.

---

## ⚡ Before You Start Coding

1. **Check PHASES.md** — It has the real status of every module (✅ FULL / 🟡 PARTIAL / 🔵 UI-ONLY / 🔴 NOT BUILT). This prevents building something that already exists.
2. **Check the hooks list** — `CONTEXT.md` has all 92 hooks categorized. Always search for an existing hook before creating one.
3. **Check the "Known Mock Data" section** — PHASES.md lists every place where data is still hardcoded. If you're working on a module, check if it has known mocks.
4. **Check the "Not Yet Built" section** — Lists PRD features with actionable "What's Needed" columns.

---

## Coding Conventions

### TypeScript
- `strict: false`, `strictNullChecks: false` — don't add strict null checks to existing code
- Use TypeScript interfaces/types for all component props and hook return values
- Import Supabase types from `@/supabase-types` or `@/src/types/supabase`
- **Never edit** `supabase-types.ts` or `src/types/supabase.ts` directly — they are auto-generated

### Components
- Use shadcn/ui primitives from `@/components/ui/` (Button, Card, Dialog, etc.)
- Follow existing component patterns — check similar components before creating new ones
- All data tables should use the shared `DataTable` component from `@/components/shared/`
- Dialogs go in `@/components/dialogs/`
- Feature components go in `@/components/[feature-name]/`
- Page headers use `PageHeader` from `@/components/shared/PageHeader`
- Loading states use `Skeleton` from `@/components/ui/skeleton` or `Loader2` spinner

### Hooks
- One hook per domain entity: `hooks/use[Entity].ts`
- Hooks handle ALL data fetching, mutations, subscriptions, and state
- Pages should NEVER have inline Supabase queries — always go through hooks
- Use `@supabase/ssr` for client creation, never raw `createClient`
- Pattern: `const supabase = createBrowserClient(...)` inside hooks
- Return pattern: `{ data, isLoading, error, createFn, updateFn, deleteFn, refresh }`

### Styling
- TailwindCSS 3.4 with HSL CSS variable theming
- Use semantic color tokens: `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `critical`, `info`
- Dark mode via `next-themes` (class-based)
- Shadcn component variants via `class-variance-authority`
- Use existing animation utilities from tailwind.config.js (fade-in, slide-in, scale-in, etc.)
- Badge styling pattern: `text-[10px] uppercase font-bold` with colored bg/text/border variants

### File Structure
- Pages: `app/(dashboard)/[module]/[feature]/page.tsx`
- API routes: `app/api/[route]/route.ts`
- Hooks: `hooks/use[Entity].ts`
- Components: `components/[feature]/[Component].tsx`
- Utils: `lib/` or `src/lib/`

### Forms
- React Hook Form + Zod for validation
- Use `@hookform/resolvers` for Zod integration
- Wrap forms in shadcn Dialog components when triggered by buttons

### Imports
- Use `@/` path alias (maps to project root)
- Example: `import { Button } from "@/components/ui/button"`
- Example: `import { useVisitors } from "@/hooks/useVisitors"`
- Example: `import { formatCurrency } from "@/src/lib/utils/currency"`

---

## Do NOT

1. **Don't edit auto-generated files**: `supabase-types.ts`, `src/types/supabase.ts`, `docs/reference_schema.sql`
2. **Don't hardcode UUIDs**: Always fetch IDs dynamically from the database. Use `service_code` or slug-based lookups (e.g., find pest control service by `service_code === "PST-CON"`)
3. **Don't use mock/hardcoded data**: Every data display must connect to Supabase via hooks. If implementing a new feature, create the hook first.
4. **Don't create inline Supabase queries in pages**: Create or extend a hook instead.
5. **Don't add new npm packages** without checking if an existing dependency already covers the use case.
6. **Don't modify RLS policies** without understanding the existing role structure.
7. **Don't use `createClient` directly**: Use helpers from `src/lib/supabase/`.
8. **Don't remove `ignoreBuildErrors: true`** from next.config.ts — the massive type file causes TS2589.
9. **Don't duplicate hooks**: Check the hooks list in CONTEXT.md before creating. 92 hooks already exist.
10. **Don't roll your own loading/error/toast in new hooks**: Use `useSupabaseQuery` and `useSupabaseMutation` from `hooks/lib/` instead (see Shared Hook Utils below).

---

## Shared Hook Utils

> **For new hooks only** — do NOT rewrite existing hooks to use these.

Located in `hooks/lib/`:

### `useSupabaseQuery` — standardized reads

```typescript
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";

export function useMyData() {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase.from("my_table").select("*");
    if (error) throw error;
    return data ?? [];
  });
  // Returns: { data, isLoading, error, refresh }
}
```

### `useSupabaseMutation` — standardized writes

```typescript
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";

export function useMyData() {
  const { execute: createItem, isLoading } = useSupabaseMutation(
    async (payload: NewItem) => {
      const { data, error } = await supabase.from("my_table").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    { successMessage: "Item created" }
  );
  // execute returns: { success, data?, error? }
  return { createItem, isLoading };
}
```

---

## Supabase Patterns

### Client-side (hooks)
```typescript
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Realtime subscriptions
```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'my_table' }, handler)
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

### Edge Functions (Deno)
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req: Request) => { ... });
```

### Service lookup by code (not UUID)
```typescript
const { services } = useServices();
const pestService = services.find(s => s.service_code === "PST-CON" || 
  s.service_name?.toLowerCase().includes("pest"));
```

---

## Testing Roles

| Role | Login Route | Key Permission |
|------|------------|----------------|
| Admin | `/login` → admin dashboard | Full CRUD on all modules |
| Buyer | `/login` → `/buyer` | Order requests, invoices, feedback |
| Supplier | `/login` → `/supplier` | Indent response, bills, POs |
| Guard | `/login` → `/guard` | SOS panic, visitor registration, resident verification |
| Resident | `/login` → `/resident` | Visitor invitation |
| Delivery | `/login` → `/delivery` | Material arrival logging |

---

## Common Gotchas

1. **Build may show TS errors** but the app runs fine — this is expected due to `ignoreBuildErrors`.
2. **Large type file** (`supabase-types.ts` at 606KB) can slow IDE autocomplete. This is normal.
3. **Feature flags** in `src/lib/featureFlags.ts` can gate features — check before assuming something is broken.
4. **Supabase Realtime** requires the table to have Realtime enabled in the Supabase dashboard.
5. **Edge functions** need secrets set via `supabase secrets set` — they don't read `.env.local`.
6. **`/tickets/returns` is now live** — connected to `rtv_tickets` table via `useRTVTickets` hook with Realtime subscription.
7. **Buyer, Plantation, and Resident dashboards** are fully dynamic. Refer to PHASES.md for any remaining mocked UI-ONLY areas.
8. **`formatCurrency()`** handles paise-to-rupee conversion — always use it for monetary values.
9. **When filtering services by type**, use `service_code` lookup (e.g., `PST-CON`, `PRN-ADV`) instead of hardcoded UUIDs.
10. **Sidebar has hidden items** — Some nav items are `/* Temporarily hidden */` via comments in `AppSidebar.tsx`. Unhide them when the feature is ready.
11. **Two Supabase client imports coexist** — Older hooks use `import { supabase } from "@/src/lib/supabaseClient"` (singleton), newer hooks use `import { createClient } from "@/src/lib/supabase/client"`. Both work. Be consistent within a file.

---

## 🔧 Checklist: Adding a New Feature

Follow these steps in order when implementing a new module/page:

### Step 1: Database
- [ ] Check if table(s) already exist in `docs/reference_schema.sql` or `supabase-types.ts`
- [ ] If not, create SQL migration in `supabase/migrations/` named `YYYYMMDD_description.sql`
- [ ] Add RLS policies for relevant roles
- [ ] Enable Realtime on the table if live updates are needed

### Step 2: Types
- [ ] Add TypeScript types to `src/types/operations.ts` (assets, service requests, jobs, inventory, RTV) or `src/types/supply-chain.ts` (suppliers, rates) — or create a new domain type file (e.g., `src/types/security.ts`)
- [ ] Add status enums/labels/colors to `src/lib/constants.ts`

### Step 3: Hook
- [ ] Check if a hook already exists (see CONTEXT.md hooks list)
- [ ] Create `hooks/use[Entity].ts` following the return pattern: `{ data, isLoading, error, createFn, updateFn, deleteFn, refresh }`
- [ ] Import Supabase via `import { supabase } from "@/src/lib/supabaseClient"`
- [ ] Add Realtime subscription if needed

### Step 4: Page
- [ ] Create page at `app/(dashboard)/[module]/[feature]/page.tsx`
- [ ] Add `"use client"` directive at top
- [ ] Use `PageHeader` for the page header
- [ ] Use `DataTable` for any tabular data
- [ ] Use `Skeleton` or `Loader2` for loading states
- [ ] Use `formatCurrency()` for any monetary values
- [ ] Prefer shadcn/ui components from `@/components/ui/`
- [ ] Use semantic color tokens (not hardcoded hex colors)

### Step 5: Navigation
- [ ] Add nav entry to `navigation` array in `components/layout/AppSidebar.tsx`
- [ ] Add route prefix to `ROLE_ACCESS` in `src/lib/auth/roles.ts` for appropriate roles
- [ ] If experimental, add feature flag to `src/lib/featureFlags.ts`

### Step 6: Update Context Files
- [ ] Update the module status in `PHASES.md` from 🔴 to ✅/🟡
- [ ] Add the new hook to the hooks list in `CONTEXT.md`

---

## 🔧 Checklist: Replacing Mock Data

When fixing a 🟡 PARTIAL or 🔵 UI-ONLY page:

1. **Identify the mocks** — Check PHASES.md "Known Mock Data" section for exact locations
2. **Check if hook exists** — If not, create one (see checklist above)
3. **Check if DB table exists** — If not, create migration first
4. **Replace hardcoded arrays** with hook data (e.g., `const { data } = useMyHook()`)
5. **Replace hardcoded stats** with computed values from hook data
6. **Replace placeholder sections** with real Recharts chart using hook data
7. **Wire up non-functional buttons** with actual handlers from hooks
8. **Test with real data** — Create seed data if table is empty
9. **Update PHASES.md** — Change status from 🔵/🟡 to ✅
