-- ============================================
-- Migration: plantation_001_module
-- Description: Normalize horticulture tables for the Plantation Services module
-- ============================================

CREATE TABLE IF NOT EXISTS public.horticulture_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
  area_sqft NUMERIC,
  plant_types TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horticulture_seasonal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.horticulture_zones(id) ON DELETE CASCADE,
  season TEXT,
  plan_description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horticulture_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.horticulture_seasonal_plans(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.horticulture_zones(id) ON DELETE CASCADE,
  task_name TEXT,
  task_type TEXT,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  photo_evidence TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_horticulture_zones_updated_at ON public.horticulture_zones;
DROP TRIGGER IF EXISTS update_horticulture_tasks_updated_at ON public.horticulture_tasks;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_zones'
      AND column_name = 'zone_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_zones'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.horticulture_zones RENAME COLUMN zone_name TO name;
  END IF;
END $$;

ALTER TABLE public.horticulture_zones
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plant_types TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.horticulture_zones
SET plant_types = '{}'::TEXT[]
WHERE plant_types IS NULL;

UPDATE public.horticulture_zones
SET name = COALESCE(NULLIF(TRIM(name), ''), 'Unnamed Zone')
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE public.horticulture_zones
  DROP COLUMN IF EXISTS society_id,
  DROP COLUMN IF EXISTS health_status,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS last_maintained_at,
  DROP COLUMN IF EXISTS soil_health,
  DROP COLUMN IF EXISTS greenery_density,
  DROP COLUMN IF EXISTS updated_at;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_seasonal_plans'
      AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_seasonal_plans'
      AND column_name = 'plan_description'
  ) THEN
    ALTER TABLE public.horticulture_seasonal_plans RENAME COLUMN description TO plan_description;
  END IF;
END $$;

ALTER TABLE public.horticulture_seasonal_plans
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.horticulture_zones(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season TEXT,
  ADD COLUMN IF NOT EXISTS plan_description TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_seasonal_plans'
      AND column_name = 'month'
  ) THEN
    EXECUTE $sql$
      UPDATE public.horticulture_seasonal_plans
      SET season = COALESCE(NULLIF(TRIM(month), ''), 'General')
      WHERE season IS NULL OR TRIM(season) = ''
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_seasonal_plans'
      AND column_name = 'title'
  ) THEN
    EXECUTE $sql$
      UPDATE public.horticulture_seasonal_plans
      SET plan_description = COALESCE(NULLIF(TRIM(plan_description), ''), NULLIF(TRIM(title), ''), 'Seasonal work plan')
      WHERE plan_description IS NULL OR TRIM(plan_description) = ''
    $sql$;
  END IF;
END $$;

UPDATE public.horticulture_seasonal_plans
SET season = COALESCE(NULLIF(TRIM(season), ''), 'General')
WHERE season IS NULL OR TRIM(season) = '';

UPDATE public.horticulture_seasonal_plans
SET plan_description = COALESCE(NULLIF(TRIM(plan_description), ''), 'Seasonal work plan')
WHERE plan_description IS NULL OR TRIM(plan_description) = '';

UPDATE public.horticulture_seasonal_plans
SET status = CASE
  WHEN LOWER(COALESCE(status, 'planned')) IN ('planned', 'in_progress', 'completed', 'cancelled') THEN LOWER(status)
  WHEN LOWER(COALESCE(status, 'planned')) IN ('active', 'open') THEN 'in_progress'
  WHEN LOWER(COALESCE(status, 'planned')) IN ('done', 'closed') THEN 'completed'
  ELSE 'planned'
END;

ALTER TABLE public.horticulture_seasonal_plans
  DROP COLUMN IF EXISTS month,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS updated_at;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_tasks'
      AND column_name = 'next_due_date'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_tasks'
      AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE public.horticulture_tasks RENAME COLUMN next_due_date TO scheduled_date;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_tasks'
      AND column_name = 'last_completed_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_tasks'
      AND column_name = 'completed_date'
  ) THEN
    ALTER TABLE public.horticulture_tasks RENAME COLUMN last_completed_at TO completed_date;
  END IF;
END $$;

ALTER TABLE public.horticulture_tasks
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.horticulture_seasonal_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_name TEXT,
  ADD COLUMN IF NOT EXISTS task_type TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS photo_evidence TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.horticulture_tasks
SET task_name = COALESCE(NULLIF(TRIM(task_name), ''), NULLIF(TRIM(task_type), ''), 'General plantation task')
WHERE task_name IS NULL OR TRIM(task_name) = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'horticulture_tasks'
      AND column_name = 'frequency'
  ) THEN
    EXECUTE $sql$
      UPDATE public.horticulture_tasks
      SET task_type = COALESCE(NULLIF(TRIM(task_type), ''), NULLIF(TRIM(frequency), ''), 'general')
      WHERE task_type IS NULL OR TRIM(task_type) = ''
    $sql$;
  ELSE
    UPDATE public.horticulture_tasks
    SET task_type = 'general'
    WHERE task_type IS NULL OR TRIM(task_type) = '';
  END IF;
END $$;

UPDATE public.horticulture_tasks
SET photo_evidence = '{}'::TEXT[]
WHERE photo_evidence IS NULL;

UPDATE public.horticulture_tasks
SET status = CASE
  WHEN LOWER(COALESCE(status, 'pending')) IN ('pending', 'in_progress', 'completed') THEN LOWER(status)
  WHEN LOWER(COALESCE(status, 'pending')) IN ('scheduled', 'overdue', 'open') THEN 'pending'
  WHEN LOWER(COALESCE(status, 'pending')) IN ('in progress', 'active') THEN 'in_progress'
  WHEN LOWER(COALESCE(status, 'pending')) IN ('done', 'closed') THEN 'completed'
  ELSE 'pending'
END;

ALTER TABLE public.horticulture_tasks
  DROP COLUMN IF EXISTS frequency,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS updated_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'horticulture_seasonal_plans_status_check'
      AND conrelid = 'public.horticulture_seasonal_plans'::regclass
  ) THEN
    ALTER TABLE public.horticulture_seasonal_plans
      ADD CONSTRAINT horticulture_seasonal_plans_status_check
      CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'horticulture_tasks_status_check'
      AND conrelid = 'public.horticulture_tasks'::regclass
  ) THEN
    ALTER TABLE public.horticulture_tasks
      ADD CONSTRAINT horticulture_tasks_status_check
      CHECK (status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_horticulture_zones_location_id
  ON public.horticulture_zones (location_id);

CREATE INDEX IF NOT EXISTS idx_horticulture_seasonal_plans_zone_id
  ON public.horticulture_seasonal_plans (zone_id);

CREATE INDEX IF NOT EXISTS idx_horticulture_seasonal_plans_status
  ON public.horticulture_seasonal_plans (status);

CREATE INDEX IF NOT EXISTS idx_horticulture_tasks_plan_id
  ON public.horticulture_tasks (plan_id);

CREATE INDEX IF NOT EXISTS idx_horticulture_tasks_status
  ON public.horticulture_tasks (status);

CREATE INDEX IF NOT EXISTS idx_horticulture_tasks_scheduled_date
  ON public.horticulture_tasks (scheduled_date);

-- The shared operational evidence flows persist public URLs in multiple service modules today.
-- Keep service-evidence explicitly public-read, but require authenticated users for object writes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-evidence',
  'service-evidence',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload service evidence'
  ) THEN
    CREATE POLICY "Authenticated users can upload service evidence"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'service-evidence');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read service evidence'
  ) THEN
    CREATE POLICY "Authenticated users can read service evidence"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'service-evidence');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete service evidence'
  ) THEN
    CREATE POLICY "Authenticated users can delete service evidence"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'service-evidence');
  END IF;
END $$;

ALTER TABLE public.horticulture_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horticulture_seasonal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horticulture_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for horticulture_zones" ON public.horticulture_zones;
DROP POLICY IF EXISTS "Allow admin manage for horticulture_zones" ON public.horticulture_zones;
DROP POLICY IF EXISTS "Allow authenticated read for horticulture_tasks" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "Allow admin manage for horticulture_tasks" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "Allow read access to all users for seasonal_plans" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_zones_select_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_zones_manage_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_select_plantation" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_manage_plantation" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_tasks_select_plantation" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_tasks_insert_plantation" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_tasks_update_plantation" ON public.horticulture_tasks;

CREATE POLICY "horticulture_zones_select_plantation"
ON public.horticulture_zones
FOR SELECT TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor', 'pest_control_technician')
);

CREATE POLICY "horticulture_zones_manage_plantation"
ON public.horticulture_zones
FOR ALL TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
)
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
);

CREATE POLICY "horticulture_seasonal_plans_select_plantation"
ON public.horticulture_seasonal_plans
FOR SELECT TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor', 'pest_control_technician')
);

CREATE POLICY "horticulture_seasonal_plans_manage_plantation"
ON public.horticulture_seasonal_plans
FOR ALL TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
)
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
);

CREATE POLICY "horticulture_tasks_select_plantation"
ON public.horticulture_tasks
FOR SELECT TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
  OR (
    public.get_my_app_role() = 'pest_control_technician'
    AND assigned_to = public.get_employee_id()
  )
);

CREATE POLICY "horticulture_tasks_insert_plantation"
ON public.horticulture_tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
);

CREATE POLICY "horticulture_tasks_update_plantation"
ON public.horticulture_tasks
FOR UPDATE TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
  OR (
    public.get_my_app_role() = 'pest_control_technician'
    AND assigned_to = public.get_employee_id()
  )
)
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
  OR (
    public.get_my_app_role() = 'pest_control_technician'
    AND assigned_to = public.get_employee_id()
  )
);
