---
paths:
  - "app/(dashboard)/**/*.tsx"
  - "app/(dashboard)/**/*.ts"
---

# Page Conventions

When creating or editing dashboard pages:

1. **"use client"** directive at the top of every page.
2. **PageHeader** — Use `<PageHeader>` from `@/components/shared/PageHeader` for the page title.
3. **DataTable** — Use the shared `DataTable` from `@/components/shared/` for tabular data.
4. **Loading states** — Use `Skeleton` from `@/components/ui/skeleton` or `Loader2` spinner.
5. **No inline Supabase queries** — All data fetching must go through hooks in `hooks/use[Entity].ts`.
6. **Semantic colors** — Use tokens like `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning` — never raw hex.
7. **shadcn/ui** — Always prefer components from `@/components/ui/` (Button, Card, Dialog, Badge, etc.).
8. **Money** — Use `formatCurrency()` for all monetary displays.
9. **Placeholders** — Use `ComingSoonChart` / `ComingSoonWidget` from `@/components/shared/ComingSoon` only as temporary holders; replace when real data is available.
