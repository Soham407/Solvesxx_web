---
paths:
  - "supabase/migrations/**/*.sql"
---

# Migration Conventions

When creating database migrations:

1. **File naming** — `supabase/migrations/YYYYMMDD_description.sql` (e.g., `20260316000012_pest_control_schedules.sql`)
2. **RLS policies** — Always add Row Level Security policies for relevant roles (admin, buyer, supplier, guard, resident, delivery).
3. **Existing schema** — Check `docs/reference_schema.sql` and `supabase-types.ts` for existing tables before creating new ones.
4. **Realtime** — If the table needs live updates, include `ALTER PUBLICATION supabase_realtime ADD TABLE your_table;` in the migration.
5. **Foreign keys** — Reference existing tables (e.g., `facilities`, `users`, `services`) with proper ON DELETE behavior.
6. **Timestamps** — Always include `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`.
7. **After migration** — Run `generate_typescript_types` via the Supabase MCP to regenerate types.
8. **Never hardcode UUIDs** — Use dynamic lookups by `service_code` or slugs.
