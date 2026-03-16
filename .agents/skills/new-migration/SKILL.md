---
name: new-migration
description: Use when creating a Supabase migration for a new database table or altering an existing one.
argument-hint: "[table_name]"
---

# New Migration Guide

## Step 0: Check Existing Schema (MANDATORY)

1. Read `.ai_context/SCOPE.md` section 14 — Your new tables MUST follow the schema described there.
2. Search `supabase-types.ts` for the table name — it may already exist.
3. Read `.ai_context/CONTEXT.md` for RLS policy patterns and role structure.
4. Check `supabase/migrations/` for the latest migration number to determine your file sequence.

## Step 1: Create the Migration File

- **Filename**: `supabase/migrations/YYYYMMDD_$ARGUMENTS.sql`
- Use today's date and a sequential number if needed (e.g., `20260316000012_$ARGUMENTS.sql`)

## Step 2: SQL Template

```sql
-- ============================================
-- Migration: $ARGUMENTS
-- Description: [describe what this table/change does]
-- ============================================

CREATE TABLE IF NOT EXISTS public.$ARGUMENTS (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  -- Add your columns here
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.$ARGUMENTS ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin full access on $ARGUMENTS"
  ON public.$ARGUMENTS FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin'))
  );

-- Enable Realtime (if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.$ARGUMENTS;

-- Indexes
CREATE INDEX idx_${ARGUMENTS}_facility_id ON public.$ARGUMENTS(facility_id);
CREATE INDEX idx_${ARGUMENTS}_created_at ON public.$ARGUMENTS(created_at);
```

## Step 3: Apply & Regenerate Types

After creating the migration:
1. Apply via Supabase MCP: `apply_migration`
2. Regenerate types: `generate_typescript_types`
3. The regenerated types will update `supabase-types.ts` automatically

## Step 4: Update Context

- [ ] Note the new table in `.ai_context/PHASES.md` if it enables a new feature
