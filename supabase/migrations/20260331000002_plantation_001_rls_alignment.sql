-- ============================================
-- Migration: plantation_001_rls_alignment
-- Description: Align Plantation Services schema guards and RLS with PLANTATION-001
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

ALTER TABLE public.horticulture_zones
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_sqft NUMERIC,
  ADD COLUMN IF NOT EXISTS plant_types TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.horticulture_seasonal_plans
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.horticulture_zones(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season TEXT,
  ADD COLUMN IF NOT EXISTS plan_description TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.horticulture_tasks
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.horticulture_seasonal_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.horticulture_zones(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_name TEXT,
  ADD COLUMN IF NOT EXISTS task_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_evidence TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.horticulture_zones
SET plant_types = '{}'::TEXT[]
WHERE plant_types IS NULL;

UPDATE public.horticulture_tasks
SET photo_evidence = '{}'::TEXT[]
WHERE photo_evidence IS NULL;

ALTER TABLE public.horticulture_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horticulture_seasonal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horticulture_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horticulture_zones_select_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_zones_manage_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_select_plantation" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_manage_plantation" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_tasks_select_plantation" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_tasks_insert_plantation" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_tasks_update_plantation" ON public.horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_zones_insert_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_zones_update_plantation" ON public.horticulture_zones;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_insert_plantation" ON public.horticulture_seasonal_plans;
DROP POLICY IF EXISTS "horticulture_seasonal_plans_update_plantation" ON public.horticulture_seasonal_plans;

CREATE POLICY "horticulture_zones_select_plantation"
ON public.horticulture_zones
FOR SELECT TO authenticated
USING (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor', 'pest_control_technician')
);

CREATE POLICY "horticulture_zones_insert_plantation"
ON public.horticulture_zones
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
);

CREATE POLICY "horticulture_zones_update_plantation"
ON public.horticulture_zones
FOR UPDATE TO authenticated
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

CREATE POLICY "horticulture_seasonal_plans_insert_plantation"
ON public.horticulture_seasonal_plans
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor')
);

CREATE POLICY "horticulture_seasonal_plans_update_plantation"
ON public.horticulture_seasonal_plans
FOR UPDATE TO authenticated
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
