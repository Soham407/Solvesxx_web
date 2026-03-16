---
paths:
  - "hooks/**/*.ts"
---

# Hook Conventions

When creating or editing hooks in this project:

1. **Check for duplicates first** — 82+ hooks already exist. Read `.ai_context/CONTEXT.md` hook list before creating.
2. **One hook per entity** — File naming: `hooks/use[Entity].ts`
3. **Standard return shape**:
   ```ts
   { data, isLoading, error, createFn, updateFn, deleteFn, refresh }
   ```
4. **Client creation** — Use `createBrowserClient` from `@supabase/ssr`, or `supabase` from `@/src/lib/supabaseClient` for older patterns. Be consistent within a file.
5. **Realtime** — Add `supabase.channel().on('postgres_changes', ...).subscribe()` with cleanup in `useEffect` return.
6. **No inline Supabase queries in pages** — All data access goes through hooks.
7. **Service lookups** — Use `service_code` (e.g., `"PST-CON"`) not hardcoded UUIDs.
8. **Money values** — Always use `formatCurrency()` from `@/src/lib/utils/currency`.
